/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Board domain tests.
 *
 * The board exists to make a claim — «Выполнено» means verified — so the tests
 * are written around that claim rather than around array manipulation. The
 * illegal transitions matter more than the legal ones: a board that silently
 * accepts them is a board whose "done" column means nothing.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Board,
  COLUMN_IDS,
  COLUMN_TITLES,
  TRANSITIONS,
  canMove,
  toMermaid,
  type Card,
} from '../domain/board/Board.ts';
import { DomainError } from '../domain/invitations/valueObjects.ts';
import { BACKLOG } from '../data/backlog.ts';

const NOW = '2026-11-21T07:00:00Z';

function card(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    area: 'Тест',
    priority: 'P2',
    title: `Карточка ${id}`,
    detail: 'Описание',
    ...overrides,
  };
}

function boardWith(ideas: Card[] = [card('a'), card('b')]): Board {
  return Board.create({ ideas, inProgress: [], done: [] });
}

describe('transition table', () => {
  it('allows taking work and completing it', () => {
    assert.equal(canMove('ideas', 'inProgress'), true);
    assert.equal(canMove('inProgress', 'done'), true);
  });

  it('allows abandoning and reopening', () => {
    assert.equal(canMove('inProgress', 'ideas'), true);
    assert.equal(canMove('done', 'inProgress'), true);
  });

  it('forbids skipping the work stage', () => {
    // Ideas → Done directly would let the board claim a result nobody produced.
    assert.equal(canMove('ideas', 'done'), false);
  });

  it('forbids done → ideas, which would erase the record of work', () => {
    assert.equal(canMove('done', 'ideas'), false);
  });

  it('treats staying in the same column as a reorder, not a transition', () => {
    // The first version asserted the opposite, and that assumption was the bug:
    // a same-column move is a position change, not a state change, so it must be
    // allowed. The transition table below still holds no self-edges — `canMove`
    // special-cases equality before consulting it.
    for (const column of COLUMN_IDS) {
      assert.equal(canMove(column, column), true);
      assert.equal(TRANSITIONS[column].includes(column), false, 'no self-edge in the table');
    }
  });

  it('every column has a title', () => {
    for (const column of COLUMN_IDS) {
      assert.ok(COLUMN_TITLES[column].length > 0);
    }
  });
});

describe('Board.create', () => {
  it('accepts a well-formed board', () => {
    assert.equal(boardWith().counts.ideas, 2);
  });

  it('rejects a card appearing twice', () => {
    // The duplicate survives a re-render as a ghost: two copies both respond to
    // clicks, and moving one leaves the other behind.
    assert.throws(
      () => Board.create({ ideas: [card('a')], inProgress: [card('a')], done: [] }),
      (err: unknown) => err instanceof DomainError && err.code === 'BOARD_DUPLICATE_CARD'
    );
  });

  it('rejects a card in ideas carrying a completion note', () => {
    assert.throws(
      () => Board.create({ ideas: [card('a', { completionNote: 'готово' })], inProgress: [], done: [] }),
      (err: unknown) => err instanceof DomainError && err.code === 'BOARD_PREMATURE_COMPLETION'
    );
  });

  it('snapshots defensively', () => {
    const board = boardWith();
    const snapshot = board.snapshot;
    snapshot.columns.ideas.pop();
    assert.equal(board.counts.ideas, 2, 'snapshot must not alias internal arrays');
  });
});

describe('Board.move — legal transitions', () => {
  it('takes a card into work', () => {
    const board = boardWith();
    const moved = board.move('a', 'inProgress', NOW);
    assert.equal(moved.movedAt, NOW);
    assert.equal(board.counts.ideas, 1);
    assert.equal(board.counts.inProgress, 1);
  });

  it('completes a card with a note', () => {
    const board = boardWith();
    board.move('a', 'inProgress', NOW);
    const moved = board.move('a', 'done', NOW, { completionNote: '  проверено  ' });
    assert.equal(moved.completionNote, 'проверено', 'note is trimmed');
    assert.equal(board.counts.done, 1);
  });

  it('returns the card to ideas and clears the note', () => {
    const board = boardWith();
    board.move('a', 'inProgress', NOW);
    board.move('a', 'done', NOW, { completionNote: 'проверено' });
    board.move('a', 'inProgress', NOW);
    const found = board.findCard('a');
    assert.equal(found?.column, 'inProgress');
    assert.equal(found?.card.completionNote, undefined, 'leaving done clears the evidence');
  });

  it('places a card at a specific index, as a drop between two cards', () => {
    const board = boardWith([card('a'), card('b'), card('c')]);
    board.move('c', 'inProgress', NOW);
    board.move('a', 'inProgress', NOW);
    board.move('b', 'inProgress', NOW, { toIndex: 0 });
    assert.deepEqual(board.column('inProgress').map((c) => c.id), ['b', 'c', 'a']);
  });

  it('clamps an out-of-range index instead of creating a hole', () => {
    const board = boardWith([card('a'), card('b')]);
    board.move('a', 'inProgress', NOW, { toIndex: 99 });
    assert.equal(board.column('inProgress').length, 1);
  });
});

describe('reordering inside one column', () => {
  /*
   * Regression tests for two bugs found by probing the implementation:
   *
   * 1. `canMove(column, column)` was false, so dragging a card up or down in its
   *    own column failed with "переход не разрешён" — the most ordinary gesture.
   * 2. The drop index was applied after removing the card, so dragging downwards
   *    landed one slot past the target: `a→2` on `[a,b,c]` gave `[b,c,a]`.
   */

  it('allows a card to stay in its column', () => {
    assert.equal(canMove('ideas', 'ideas'), true);
    assert.equal(canMove('inProgress', 'inProgress'), true);
    assert.equal(canMove('done', 'done'), true);
  });

  it('moves a card down to the drop target, not past it', () => {
    const board = boardWith([card('a'), card('b'), card('c')]);
    board.move('a', 'ideas', NOW, { toIndex: 2 });
    assert.deepEqual(board.column('ideas').map((c) => c.id), ['b', 'a', 'c']);
  });

  it('moves a card to the very end when dropped last', () => {
    const board = boardWith([card('a'), card('b'), card('c')]);
    board.move('a', 'ideas', NOW, { toIndex: 3 });
    assert.deepEqual(board.column('ideas').map((c) => c.id), ['b', 'c', 'a']);
  });

  it('moves a card up to the start', () => {
    const board = boardWith([card('a'), card('b'), card('c')]);
    board.move('c', 'ideas', NOW, { toIndex: 0 });
    assert.deepEqual(board.column('ideas').map((c) => c.id), ['c', 'a', 'b']);
  });

  it('leaves the order unchanged when dropped onto its own position', () => {
    const board = boardWith([card('a'), card('b'), card('c')]);
    board.move('b', 'ideas', NOW, { toIndex: 2 });
    assert.deepEqual(board.column('ideas').map((c) => c.id), ['a', 'b', 'c']);
  });

  it('does not shift the index when the drop target is in another column', () => {
    // The correction applies only to same-column moves; applying it everywhere
    // would break cross-column drops at the same positions.
    const board = Board.create({
      ideas: [card('a'), card('b')],
      inProgress: [card('x'), card('y')],
      done: [],
    });
    board.move('a', 'inProgress', NOW, { toIndex: 1 });
    assert.deepEqual(board.column('inProgress').map((c) => c.id), ['x', 'a', 'y']);
  });

  it('keeps the card count stable while reordering', () => {
    const board = boardWith([card('a'), card('b'), card('c')]);
    board.move('a', 'ideas', NOW, { toIndex: 2 });
    board.move('c', 'ideas', NOW, { toIndex: 0 });
    assert.equal(board.counts.ideas, 3);
  });

  it('refuses completion by reordering into done', () => {
    // A reorder has no note, so dragging into «Выполнено» must still be refused.
    const board = boardWith([card('a')]);
    assert.throws(() => board.move('a', 'done', NOW, { toIndex: 0 }), DomainError);
    assert.equal(board.counts.done, 0);
  });
});

describe('Board.move — refusals', () => {
  it('refuses ideas → done', () => {
    const board = boardWith();
    assert.throws(() => board.move('a', 'done', NOW, { completionNote: 'x' }), DomainError);
    assert.equal(board.counts.done, 0);
  });

  it('refuses done → ideas', () => {
    const board = boardWith();
    board.move('a', 'inProgress', NOW);
    board.move('a', 'done', NOW, { completionNote: 'x' });
    assert.throws(() => board.move('a', 'ideas', NOW), DomainError);
  });

  it('refuses completion without a note', () => {
    const board = boardWith();
    board.move('a', 'inProgress', NOW);
    assert.throws(
      () => board.move('a', 'done', NOW),
      (err: unknown) => err instanceof DomainError && err.code === 'BOARD_COMPLETION_NOTE_REQUIRED'
    );
    assert.equal(board.counts.done, 0);
    assert.equal(board.counts.inProgress, 1, 'a refused move must leave the card in place');
  });

  it('refuses a blank note', () => {
    const board = boardWith();
    board.move('a', 'inProgress', NOW);
    assert.throws(() => board.move('a', 'done', NOW, { completionNote: '   ' }), DomainError);
  });

  it('refuses an unknown card', () => {
    assert.throws(() => boardWith().move('nope', 'inProgress', NOW), DomainError);
  });

  it('records a rejection event so the UI can explain the rule', () => {
    const board = boardWith();
    board.pullEvents();
    try {
      board.move('a', 'done', NOW);
    } catch {
      // expected
    }
    const events = board.pullEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, 'CardMoveRejected');
  });

  it('records a CardMoved event on success', () => {
    const board = boardWith();
    board.pullEvents();
    board.move('a', 'inProgress', NOW);
    const events = board.pullEvents();
    assert.equal(events[0]?.type, 'CardMoved');
  });
});

describe('the real backlog fits the board', () => {
  it('starts entirely in ideas without duplicates', () => {
    const board = Board.create({ ideas: BACKLOG, inProgress: [], done: [] });
    assert.equal(board.counts.ideas, BACKLOG.length);
    assert.equal(board.counts.done, 0);
  });

  it('gives every card an evidence line', () => {
    // A card without a way to check it is a wish, not a task.
    for (const item of BACKLOG) {
      assert.ok(item.evidence.trim().length > 0, `no evidence for ${item.id}`);
    }
  });

  it('uses unique ids', () => {
    const ids = new Set(BACKLOG.map((c) => c.id));
    assert.equal(ids.size, BACKLOG.length);
  });

  it('uses only declared priorities', () => {
    for (const item of BACKLOG) {
      assert.ok(['P0', 'P1', 'P2', 'P3'].includes(item.priority), item.id);
    }
  });

  it('has exactly one P0', () => {
    // The token revocation is the only thing that is both urgent and dangerous.
    assert.equal(BACKLOG.filter((c) => c.priority === 'P0').length, 1);
  });

  it('can walk every card through the legal path to done', () => {
    // Exhaustive over the real data: no card is trapped by a missing transition.
    const board = Board.create({ ideas: BACKLOG, inProgress: [], done: [] });
    for (const item of BACKLOG) {
      board.move(item.id, 'inProgress', NOW);
      board.move(item.id, 'done', NOW, { completionNote: 'проверено' });
    }
    assert.equal(board.counts.done, BACKLOG.length);
    assert.equal(board.counts.ideas, 0);
  });
});

describe('toMermaid', () => {
  const diagram = toMermaid();

  it('renders every allowed transition', () => {
    for (const from of COLUMN_IDS) {
      for (const to of TRANSITIONS[from]) {
        assert.ok(diagram.includes(`${from} --> ${to}`), `missing ${from} -> ${to}`);
      }
    }
  });

  it('does not render a forbidden transition', () => {
    assert.equal(diagram.includes('ideas --> done'), false);
  });
});
