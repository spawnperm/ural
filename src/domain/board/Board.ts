/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Kanban board as a domain model.
 *
 * ## Why this is a domain and not `useState<string[]>`
 *
 * A board looks like three arrays of cards, which invites `moveCard(from, to)`
 * with raw indexes. That version has no opinion about whether the move is legal,
 * so every illegal transition — a card into a column that does not exist, the
 * same card appearing twice after a botched re-render, "Выполнено" without the
 * work having happened — is representable.
 *
 * Here the transitions are named and their preconditions checked:
 *
 * - `Ideas → InProgress` — accepting work;
 * - `InProgress → Done` — only with a completion note, because a card marked done
 *   without evidence is the failure mode this board exists to prevent;
 * - `InProgress → Ideas` — abandoning work (allowed, with no note);
 * - `Done → InProgress` — reopening.
 *
 * `Ideas → Done` is deliberately absent: skipping the work stage would let the
 * board claim a result that was never produced.
 */

import { DomainError } from '../invitations/valueObjects.ts';

export const COLUMN_IDS = ['ideas', 'inProgress', 'done'] as const;
export type ColumnId = (typeof COLUMN_IDS)[number];

export const COLUMN_TITLES: Record<ColumnId, string> = {
  ideas: 'Идеи',
  inProgress: 'В работе',
  done: 'Выполнено',
};

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Card {
  id: string;
  area: string;
  priority: Priority;
  title: string;
  detail: string;
  /** Filled in when the card enters «Выполнено». */
  completionNote?: string;
  /** ISO timestamp of the last transition, for the audit line on the card. */
  movedAt?: string;
}

export interface BoardSnapshot {
  columns: Record<ColumnId, Card[]>;
}

export type BoardEvent =
  | {
      type: 'CardMoved';
      cardId: string;
      from: ColumnId;
      to: ColumnId;
      occurredAt: string;
    }
  | {
      type: 'CardMoveRejected';
      cardId: string;
      from: ColumnId;
      to: ColumnId;
      reason: string;
      occurredAt: string;
    };

/**
 * Legal transitions.
 *
 * A table rather than a chain of `if`s: the diagram in the documentation renders
 * from this map, and an added edge appears in both places at once.
 */
export const TRANSITIONS: Record<ColumnId, readonly ColumnId[]> = {
  ideas: ['inProgress'],
  inProgress: ['done', 'ideas'],
  done: ['inProgress'],
};

export function canMove(from: ColumnId, to: ColumnId): boolean {
  return TRANSITIONS[from].includes(to);
}

export class Board {
  private readonly _columns: Record<ColumnId, Card[]>;
  private _events: BoardEvent[] = [];

  private constructor(columns: Record<ColumnId, Card[]>) {
    this._columns = columns;
  }

  /**
   * Builds a board, rejecting duplicate ids.
   *
   * A duplicated card is the failure that survives a re-render: it appears in two
   * columns and both copies respond to clicks, so moving one leaves a ghost.
   */
  public static create(columns: Record<ColumnId, Card[]>): Board {
    const seen = new Set<string>();
    const copy = {} as Record<ColumnId, Card[]>;

    for (const column of COLUMN_IDS) {
      const cards = columns[column] ?? [];
      copy[column] = [...cards];
      for (const card of cards) {
        if (seen.has(card.id)) {
          throw new DomainError(
            `Карточка «${card.id}» встречается на доске дважды.`,
            'BOARD_DUPLICATE_CARD'
          );
        }
        seen.add(card.id);
      }
    }

    for (const card of copy.ideas) {
      if (card.completionNote) {
        throw new DomainError(
          `Карточка «${card.id}» в идеях, но имеет отметку о выполнении.`,
          'BOARD_PREMATURE_COMPLETION'
        );
      }
    }

    return new Board(copy);
  }

  public column(id: ColumnId): readonly Card[] {
    return this._columns[id];
  }

  public get snapshot(): BoardSnapshot {
    return {
      columns: {
        ideas: [...this._columns.ideas],
        inProgress: [...this._columns.inProgress],
        done: [...this._columns.done],
      },
    };
  }

  public findCard(cardId: string): { card: Card; column: ColumnId } | null {
    for (const column of COLUMN_IDS) {
      const card = this._columns[column].find((c) => c.id === cardId);
      if (card) return { card, column };
    }
    return null;
  }

  public get counts(): Record<ColumnId, number> {
    return {
      ideas: this._columns.ideas.length,
      inProgress: this._columns.inProgress.length,
      done: this._columns.done.length,
    };
  }

  /**
   * Moves a card.
   *
   * `toIndex` places the card at a specific position within the target column —
   * what a drag-and-drop drop between two cards means. Omitted, the card is
   * appended.
   *
   * Returns the moved card, or throws for an illegal transition. Refusals that
   * are a *user* mistake (moving to a column that cannot accept the card) are
   * reported both as a `DomainError` and as a `CardMoveRejected` event, so the UI
   * can explain the rule instead of silently doing nothing.
   */
  public move(
    cardId: string,
    to: ColumnId,
    occurredAt: string,
    options: { toIndex?: number; completionNote?: string } = {}
  ): Card {
    const found = this.findCard(cardId);
    if (!found) {
      throw new DomainError(`Карточки «${cardId}» нет на доске.`, 'BOARD_CARD_NOT_FOUND');
    }
    const { card, column: from } = found;

    if (from === to && options.toIndex === undefined) {
      return card;
    }

    if (!canMove(from, to)) {
      const reason =
        from === 'ideas' && to === 'done'
          ? 'Нельзя перевести идею сразу в «Выполнено»: сначала возьмите её в работу.'
          : `Переход «${COLUMN_TITLES[from]}» → «${COLUMN_TITLES[to]}» не разрешён.`;

      this._events.push({
        type: 'CardMoveRejected',
        cardId,
        from,
        to,
        reason,
        occurredAt,
      });
      throw new DomainError(reason, 'BOARD_ILLEGAL_TRANSITION');
    }

    // Drag-and-drop within the same column reorders; across columns it moves.
    const source = this._columns[from];
    source.splice(
      source.findIndex((c) => c.id === cardId),
      1
    );

    const moved: Card = { ...card, movedAt: occurredAt };

    if (to === 'done') {
      const note = options.completionNote?.trim();
      if (!note) {
        /*
         * The board's whole point is that «Выполнено» means verified.
         * A card dragged there without evidence would be exactly the claim this
         * feature exists to prevent, so the move is refused rather than accepted
         * with an empty note.
         */
        source.splice(
          Math.min(options.toIndex ?? source.length, source.length),
          0,
          card
        );
        const reason =
          'Для перевода в «Выполнено» нужна отметка о том, что именно проверено.';
        this._events.push({ type: 'CardMoveRejected', cardId, from, to, reason, occurredAt });
        throw new DomainError(reason, 'BOARD_COMPLETION_NOTE_REQUIRED');
      }
      moved.completionNote = note;
    } else {
      // Leaving «Выполнено» clears the evidence: it described a state that no
      // longer holds.
      delete moved.completionNote;
    }

    const target = this._columns[to];
    const index =
      options.toIndex === undefined
        ? target.length
        : Math.max(0, Math.min(options.toIndex, target.length));
    target.splice(index, 0, moved);

    this._events.push({ type: 'CardMoved', cardId, from, to, occurredAt });
    return moved;
  }

  public pullEvents(): BoardEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}

/**
 * Renders the transition table as a Mermaid state diagram.
 *
 * Same principle as the redemption flow: the picture is generated from the rules,
 * so it cannot describe a move the domain refuses.
 */
export function toMermaid(): string {
  const lines = ['stateDiagram-v2'];
  lines.push('    [*] --> ideas');
  for (const from of COLUMN_IDS) {
    for (const to of TRANSITIONS[from]) {
      lines.push(`    ${from} --> ${to}`);
    }
  }
  lines.push('    done --> [*]');
  return lines.join('\n');
}
