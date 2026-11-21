/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Domain events of the Invitations context.
 *
 * ## Why events and not just return values
 *
 * The documentation (`BOUNDED_CONTEXTS`, `CONTEXT_RELATIONS`) describes this
 * context as publishing `InvitationIssued` and `InvitationRedeemed`, and the
 * Achievements context reacting to `StreakReached` — an event-driven relationship
 * across a boundary. If the code only returns values, that architecture exists
 * solely on a slide.
 *
 * Events make the boundary explicit in code: the aggregate records what happened,
 * and whoever cares (the Temporal saga, the NATS publisher, a test) reads the
 * same list. A caller that only needs the outcome can ignore them; nothing forces
 * a broker into a UI component.
 *
 * Events are plain data with a discriminant — serialisable, comparable,
 * straightforward to put on a wire.
 */

import type { Instant, InvitationToken, SealCount } from './valueObjects.ts';

/** Discriminated union, keyed by `type` so exhaustiveness is checked. */
export type InvitationEvent =
  | {
      type: 'InvitationIssued';
      token: InvitationToken;
      participantEmail: string;
      sealsAtIssue: SealCount;
      expiresAt: Instant;
      occurredAt: Instant;
    }
  | {
      type: 'InvitationRedeemed';
      token: InvitationToken;
      participantEmail: string;
      redeemedAt: Instant;
      occurredAt: Instant;
    }
  | {
      type: 'InvitationRedeemRejected';
      token: InvitationToken;
      reason: 'EXPIRED' | 'ALREADY_REDEEMED';
      attemptedAt: Instant;
    };

/**
 * Transport shape of an event.
 *
 * The domain keeps value objects; the wire needs primitives. This conversion
 * lives next to the event definitions so the two cannot drift, and so no caller
 * has to guess whether `token` is an object or a string when it is published.
 */
export interface InvitationEventDto {
  type: InvitationEvent['type'];
  occurredAt: string;
  payload: Record<string, string | number>;
}

export function toEventDto(event: InvitationEvent): InvitationEventDto {
  switch (event.type) {
    case 'InvitationIssued':
      return {
        type: event.type,
        occurredAt: event.occurredAt.iso,
        payload: {
          token: event.token.value,
          participantEmail: event.participantEmail,
          sealsAtIssue: event.sealsAtIssue.value,
          expiresAt: event.expiresAt.iso,
        },
      };
    case 'InvitationRedeemed':
      return {
        type: event.type,
        occurredAt: event.occurredAt.iso,
        payload: {
          token: event.token.value,
          participantEmail: event.participantEmail,
          redeemedAt: event.redeemedAt.iso,
        },
      };    case 'InvitationRedeemRejected':
      return {
        type: event.type,
        occurredAt: event.attemptedAt.iso,
        payload: {
          token: event.token.value,
          reason: event.reason,
        },
      };
  }
}
