/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Content bounded context: characters and question sets.
 *
 * ## Scope
 *
 * `BOUNDED_CONTEXTS` names this context "Управление персонажами и квестами" with
 * aggregates `Character`, `QuestionSet`, `CalendarPlan` and events
 * `CharacterPublished`, `QuestionSetUpdated`. This module implements the two that
 * carry real rules in the portal: the publication lifecycle and question-set
 * composition.
 *
 * `CalendarPlan` is deliberately absent: the documentation describes it as a
 * schedule row with no behaviour beyond a date, so an aggregate would add
 * ceremony without protecting anything.
 *
 * ## The invariant that matters
 *
 * The data model (`projectDocs.ts`) declares `status: draft | published |
 * archived` for characters. Reading the UI and API examples turned up the rule
 * that makes this a state machine rather than a free-form field:
 *
 * - a draft is **not** visible to Guests or Users;
 * - publishing is **irreversible** in the UI — the API example filters
 *   `status=published` and there is no "unpublish" endpoint for content managers;
 * - an archived character keeps its published data for existing attempts but
 *   must not be offered for new ones.
 *
 * Encoding that here means the API and the UI cannot disagree about what a status
 * value implies.
 */

import { DomainError } from '../invitations/valueObjects.ts';

/** Publication lifecycle. Order is meaningful: it is the only legal direction. */
export const CHARACTER_STATUSES = ['draft', 'published', 'archived'] as const;
export type CharacterStatus = (typeof CHARACTER_STATUSES)[number];

/**
 * Character aggregate.
 *
 * Small on purpose — it protects the publication rules, not the biography text.
 */
export class Character {
  private _status: CharacterStatus;
  private _events: ContentEvent[] = [];

  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly era: string,
    status: CharacterStatus
  ) {
    this._status = status;
  }

  public static create(params: {
    id: string;
    name: string;
    era: string;
    status?: CharacterStatus;
  }): Character {
    if (params.id.trim().length === 0) {
      throw new DomainError('Персонаж без идентификатора.', 'CHARACTER_NO_ID');
    }
    if (params.name.trim().length === 0) {
      throw new DomainError(`Персонаж «${params.id}» без имени.`, 'CHARACTER_NO_NAME');
    }
    return new Character(params.id, params.name.trim(), params.era.trim(), params.status ?? 'draft');
  }

  public get status(): CharacterStatus {
    return this._status;
  }

  /** Visible to players: only published content is exposed by the public API. */
  public isVisibleToPlayers(): boolean {
    return this._status === 'published';
  }

  /** Available for new quest attempts: archived characters are not. */
  public isAssignable(): boolean {
    return this._status === 'published';
  }

  public publish(occurredAt: string): void {
    if (this._status !== 'draft') {
      throw new DomainError(
        `Опубликовать можно только черновик; текущий статус — ${this._status}.`,
        'CHARACTER_NOT_DRAFT'
      );
    }
    this._status = 'published';
    this._events.push({
      type: 'CharacterPublished',
      characterId: this.id,
      occurredAt,
    });
  }

  public archive(occurredAt: string): void {
    if (this._status === 'archived') {
      throw new DomainError('Персонаж уже в архиве.', 'CHARACTER_ALREADY_ARCHIVED');
    }
    // A draft that was never published has nothing to preserve; archiving it is
    // equivalent to deleting it, which the documentation's data model does not
    // express. Refuse rather than invent a transition.
    if (this._status === 'draft') {
      throw new DomainError(
        'Нельзя архивировать черновик: у него нет опубликованных данных.',
        'CHARACTER_DRAFT_ARCHIVE'
      );
    }
    this._status = 'archived';
    this._events.push({
      type: 'CharacterArchived',
      characterId: this.id,
      occurredAt,
    });
  }

  public pullEvents(): ContentEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}

/** Question set: the month's questions, belonging to one character. */
export class QuestionSet {
  private _events: ContentEvent[] = [];

  private constructor(
    public readonly id: string,
    public readonly characterId: string,
    public readonly questionIds: readonly string[],
    public readonly monthDate: string
  ) {}

  public static create(params: {
    id: string;
    characterId: string;
    questionIds: readonly string[];
    monthDate: string;
  }): QuestionSet {
    if (params.id.trim().length === 0) {
      throw new DomainError('Набор вопросов без идентификатора.', 'SET_NO_ID');
    }
    if (params.characterId.trim().length === 0) {
      throw new DomainError(`Набор «${params.id}» не привязан к персонажу.`, 'SET_NO_CHARACTER');
    }
    if (params.questionIds.length === 0) {
      // The simulator's empty-set case crashed the render; refuse at construction.
      throw new DomainError(`Набор «${params.id}» не содержит вопросов.`, 'SET_EMPTY');
    }
    const unique = new Set(params.questionIds);
    if (unique.size !== params.questionIds.length) {
      throw new DomainError(`Набор «${params.id}»: вопросы повторяются.`, 'SET_DUPLICATE_QUESTIONS');
    }
    if (Number.isNaN(Date.parse(params.monthDate))) {
      throw new DomainError(`Набор «${params.id}»: некорректная дата месяца.`, 'SET_BAD_DATE');
    }

    return new QuestionSet(params.id, params.characterId, [...params.questionIds], params.monthDate);
  }

  public get size(): number {
    return this.questionIds.length;
  }

  public updateQuestionIds(next: readonly string[], occurredAt: string): void {
    if (next.length === 0) {
      throw new DomainError('Набор не может стать пустым.', 'SET_EMPTY_UPDATE');
    }
    const unique = new Set(next);
    if (unique.size !== next.length) {
      throw new DomainError('В наборе повторяются вопросы.', 'SET_DUPLICATE_UPDATE');
    }
    this._events.push({
      type: 'QuestionSetUpdated',
      questionSetId: this.id,
      size: next.length,
      occurredAt,
    });
  }

  public pullEvents(): ContentEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }
}

/**
 * Content events.
 *
 * Named exactly as `BOUNDED_CONTEXTS` lists them, so the documentation table and
 * the code refer to the same thing.
 */
export type ContentEvent =
  | { type: 'CharacterPublished'; characterId: string; occurredAt: string }
  | { type: 'CharacterArchived'; characterId: string; occurredAt: string }
  | { type: 'QuestionSetUpdated'; questionSetId: string; size: number; occurredAt: string };
