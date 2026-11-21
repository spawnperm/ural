/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Value objects of the Invitations bounded context.
 *
 * ## Why value objects at all
 *
 * DDD's value objects exist to make invalid states unrepresentable. The point is
 * narrow and concrete: `string` accepts `''`, `'  '`, a random word, an expired
 * date, a negative seal count. A type that can only be constructed one way
 * removes a whole class of bugs *before* any runtime check runs.
 *
 * Each object here is immutable and compares by value, which is what separates it
 * from an entity: `InvitationToken('abc')` and another `InvitationToken('abc')`
 * are the same thing, while two invitations with the same token would be a
 * data-integrity violation.
 *
 * ## Relationship to the documentation
 *
 * `src/data/projectDocs.ts` names this context explicitly under
 * `BOUNDED_CONTEXTS` — "Приглашения / Генерация и валидация QR" with aggregates
 * `Invitation`, `Visit` and events `InvitationIssued`, `InvitationRedeemed`.
 * This directory is the code that claim describes; before it, the same concepts
 * existed only as loose fields inside a React component.
 */

/**
 * Raised when a value object is asked to hold something it cannot represent.
 *
 * Distinct from a validation error: this signals a programming error (the caller
 * built a value without checking), not a user mistake. The HTTP layer turns user
 * input problems into 400s before any of this is constructed.
 */
export class DomainError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

const TOKEN_PATTERN = /^inv-\d{4}-\d{2}-[a-z0-9-]+$/i;

/**
 * Invitation token.
 *
 * Format matters because the token travels in a QR code and appears in operator
 * logs. The pattern `inv-YYYY-MM-<slug>` makes a mistyped or truncated token
 * obvious at a glance and keeps tokens greppable by month, which is what an
 * operator does when investigating an event.
 */
export class InvitationToken {
  private constructor(public readonly value: string) {}

  public static parse(raw: string): InvitationToken {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new DomainError('Токен приглашения не может быть пустым.', 'TOKEN_EMPTY');
    }
    if (!TOKEN_PATTERN.test(trimmed)) {
      throw new DomainError(
        `Токен «${trimmed}» не соответствует формату inv-YYYY-MM-<slug>.`,
        'TOKEN_FORMAT'
      );
    }
    return new InvitationToken(trimmed.toLowerCase());
  }

  /** Case-insensitive comparison, matching how operators paste tokens. */
  public equals(other: InvitationToken): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}

/**
 * Number of seals collected in a series.
 *
 * Non-negative by construction: a series cannot have "minus two stamps", and the
 * previous code did `Math.max(1, correctCount)` at the call site — a guard that
 * every future caller would have had to remember.
 */
export class SealCount {
  private constructor(public readonly value: number) {}

  public static of(raw: number): SealCount {
    if (!Number.isInteger(raw)) {
      throw new DomainError(`Количество печатей должно быть целым, получено ${raw}.`, 'SEAL_NOT_INTEGER');
    }
    if (raw < 0) {
      throw new DomainError(`Количество печатей не может быть отрицательным: ${raw}.`, 'SEAL_NEGATIVE');
    }
    return new SealCount(raw);
  }

  public get isZero(): boolean {
    return this.value === 0;
  }

  public equals(other: SealCount): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return String(this.value);
  }
}

/**
 * An instant in time, normalised to ISO-8601 UTC.
 *
 * Parsing once at the boundary means every later comparison compares numbers,
 * not strings: `'2026-09-25T18:00:00Z' < '2026-11-20'` is a lexicographic
 * accident that happens to work for ISO dates and silently breaks for anything
 * with an offset such as `+05:00`.
 */
export class Instant {
  private constructor(
    public readonly iso: string,
    public readonly epochMs: number
  ) {}

  public static parse(raw: string): Instant {
    const trimmed = raw.trim();
    const ms = Date.parse(trimmed);
    if (Number.isNaN(ms)) {
      throw new DomainError(`Некорректная дата: «${raw}».`, 'INSTANT_INVALID');
    }
    // Re-serialise so the stored form is canonical regardless of input offset.
    return new Instant(new Date(ms).toISOString(), ms);
  }

  public static fromDate(date: Date): Instant {
    return new Instant(date.toISOString(), date.getTime());
  }

  public isBefore(other: Instant): boolean {
    return this.epochMs < other.epochMs;
  }

  public isAfter(other: Instant): boolean {
    return this.epochMs > other.epochMs;
  }

  public equals(other: Instant): boolean {
    return this.epochMs === other.epochMs;
  }

  public toString(): string {
    return this.iso;
  }
}
