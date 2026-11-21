/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Invitation aggregate.
 *
 * ## The defect this replaces
 *
 * The simulator stored an invitation as a plain interface with **two sources of
 * truth for one fact**:
 *
 *     interface InvitationRecord {
 *       expiresAt: string;   // when it lapses
 *       expired: boolean;    // ...and a flag saying whether it lapsed
 *     }
 *
 * They could disagree — and did: a record with `expiresAt` in the past and
 * `expired: false` is representable, so the UI would offer a "Погасить" button
 * for an invitation that had already lapsed. Nothing in the type or the tests
 * prevented it.
 *
 * Here `isExpired` is **derived from `expiresAt` and the current instant**. There
 * is no field to keep in sync, so the contradiction cannot be written down.
 * That is what an aggregate is for: it owns its invariants instead of trusting
 * callers to maintain them.
 *
 * ## Invariants
 *
 * 1. A redeemed invitation cannot be redeemed again.
 * 2. An expired invitation cannot be redeemed.
 * 3. Redemption never moves time backwards (`redeemedAt >= issuedAt`).
 * 4. Expiry is a function of `expiresAt` — never stored separately.
 */

import {
  DomainError,
  Instant,
  InvitationToken,
  SealCount,
} from './valueObjects.ts';
import type { InvitationEvent } from './events.ts';

export interface InvitationSnapshot {
  token: string;
  participantEmail: string;
  participantName: string;
  eventTitle: string;
  seals: number;
  expiresAt: string;
  redeemedAt: string | null;
}

/**
 * Why a redemption was refused.
 *
 * A closed union rather than free text: the UI maps each member to a message and
 * a colour, and the compiler flags a new member that nobody handled.
 */
export type RedemptionRefusal = 'EXPIRED' | 'ALREADY_REDEEMED';

export type RedemptionResult =
  | { ok: true; redeemedAt: Instant }
  | { ok: false; refusal: RedemptionRefusal; message: string };

export class Invitation {
  private readonly _token: InvitationToken;
  private readonly _participantEmail: string;
  private readonly _participantName: string;
  private readonly _eventTitle: string;
  private readonly _seals: SealCount;
  private readonly _expiresAt: Instant;
  private _redeemedAt: Instant | null;

  /**
   * Events raised since the aggregate was loaded.
   *
   * Kept on the instance rather than published directly: the aggregate must not
   * know about NATS, Temporal or a React component. The application layer decides
   * what to do with them.
   */
  private _events: InvitationEvent[] = [];

  private constructor(params: {
    token: InvitationToken;
    participantEmail: string;
    participantName: string;
    eventTitle: string;
    seals: SealCount;
    expiresAt: Instant;
    redeemedAt: Instant | null;
  }) {
    this._token = params.token;
    this._participantEmail = params.participantEmail;
    this._participantName = params.participantName;
    this._eventTitle = params.eventTitle;
    this._seals = params.seals;
    this._expiresAt = params.expiresAt;
    this._redeemedAt = params.redeemedAt;
  }

  /**
   * Issues a new invitation.
   *
   * Factories such as this are where DDD pays for itself: every rule about a
   * *valid* invitation is enforced in one place, and no other code path can
   * construct one that violates them.
   */
  public static issue(params: {
    token: string;
    participantEmail: string;
    participantName: string;
    eventTitle: string;
    seals: number;
    issuedAt: string;
    expiresAt: string;
  }): Invitation {
    if (!params.participantEmail.includes('@')) {
      throw new DomainError(
        `Email участника некорректен: «${params.participantEmail}».`,
        'EMAIL_INVALID'
      );
    }

    const issuedAt = Instant.parse(params.issuedAt);
    const expiresAt = Instant.parse(params.expiresAt);

    if (!expiresAt.isAfter(issuedAt)) {
      throw new DomainError(
        'Срок действия приглашения должен быть позже момента выдачи.',
        'EXPIRY_BEFORE_ISSUE'
      );
    }

    const invitation = new Invitation({
      token: InvitationToken.parse(params.token),
      participantEmail: params.participantEmail.trim().toLowerCase(),
      participantName: params.participantName.trim(),
      eventTitle: params.eventTitle.trim(),
      seals: SealCount.of(params.seals),
      expiresAt,
      redeemedAt: null,
    });

    invitation._events.push({
      type: 'InvitationIssued',
      token: invitation._token,
      participantEmail: invitation._participantEmail,
      sealsAtIssue: invitation._seals,
      expiresAt: invitation._expiresAt,
      occurredAt: issuedAt,
    });

    return invitation;
  }

  /**
   * Rehydrates an aggregate from storage.
   *
   * Separate from `issue` on purpose: loading an already-redeemed invitation must
   * not raise `InvitationIssued` again, or a page refresh would replay history.
   *
   * Rejects a snapshot whose history is impossible — a redemption recorded after
   * the expiry. The stored data is correct today, but a serializer bug or a manual
   * edit could produce it, and the aggregate is the last place able to notice.
   */
  public static restore(snapshot: InvitationSnapshot): Invitation {
    const expiresAt = Instant.parse(snapshot.expiresAt);
    const redeemedAt =
      snapshot.redeemedAt === null ? null : Instant.parse(snapshot.redeemedAt);

    if (redeemedAt && redeemedAt.isAfter(expiresAt)) {
      throw new DomainError(
        `Невозможная история: приглашение погашено (${redeemedAt.iso}) позже истечения (${expiresAt.iso}).`,
        'INVITATION_REDEEMED_AFTER_EXPIRY'
      );
    }

    const invitation = new Invitation({
      token: InvitationToken.parse(snapshot.token),
      participantEmail: snapshot.participantEmail.trim().toLowerCase(),
      participantName: snapshot.participantName.trim(),
      eventTitle: snapshot.eventTitle.trim(),
      seals: SealCount.of(snapshot.seals),
      expiresAt,
      redeemedAt,
    });
    return invitation;
  }

  public get token(): InvitationToken {
    return this._token;
  }
  public get participantEmail(): string {
    return this._participantEmail;
  }
  public get participantName(): string {
    return this._participantName;
  }
  public get eventTitle(): string {
    return this._eventTitle;
  }
  public get seals(): SealCount {
    return this._seals;
  }
  public get expiresAt(): Instant {
    return this._expiresAt;
  }
  public get redeemedAt(): Instant | null {
    return this._redeemedAt;
  }

  /**
   * Derived, never stored — the invariant that removes the original defect.
   */
  public isExpiredAt(now: Instant): boolean {
    return !this._expiresAt.isAfter(now);
  }

  public isRedeemed(): boolean {
    return this._redeemedAt !== null;
  }

  /**
   * Redeems the invitation, or explains why it cannot be redeemed.
   *
   * Returns a result instead of throwing: refusal is an expected business
   * outcome, not an exception. Only programming errors (a malformed aggregate)
   * throw `DomainError`.
   */
  public redeem(now: Instant): RedemptionResult {
    if (!this._expiresAt.isAfter(now)) {
      this._events.push({
        type: 'InvitationRedeemRejected',
        token: this._token,
        reason: 'EXPIRED',
        attemptedAt: now,
      });
      return {
        ok: false,
        refusal: 'EXPIRED',
        message:
          'Срок действия приглашения истёк. Погашение недоступно, эскалируйте к Admin.',
      };
    }

    if (this._redeemedAt !== null) {
      this._events.push({
        type: 'InvitationRedeemRejected',
        token: this._token,
        reason: 'ALREADY_REDEEMED',
        attemptedAt: now,
      });
      return {
        ok: false,
        refusal: 'ALREADY_REDEEMED',
        message:
          'Приглашение уже было погашено ранее. Повторная выдача — только через Admin.',
      };
    }

    this._redeemedAt = now;
    this._events.push({
      type: 'InvitationRedeemed',
      token: this._token,
      participantEmail: this._participantEmail,
      redeemedAt: now,
      occurredAt: now,
    });

    return { ok: true, redeemedAt: now };
  }

  /** Events raised since the last drain. Reading clears the buffer. */
  public pullEvents(): InvitationEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }

  public toSnapshot(): InvitationSnapshot {
    return {
      token: this._token.value,
      participantEmail: this._participantEmail,
      participantName: this._participantName,
      eventTitle: this._eventTitle,
      seals: this._seals.value,
      expiresAt: this._expiresAt.iso,
      redeemedAt: this._redeemedAt?.iso ?? null,
    };
  }
}
