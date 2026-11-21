/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Invitation aggregate tests.
 *
 * These assert the invariants the aggregate exists to protect. The most
 * important one is the defect this design removed: expiry is *derived*, so an
 * inconsistent record cannot be constructed at all. There is no test here that
 * "sets expired to true" — because there is no such field to set.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Invitation } from '../domain/invitations/Invitation.ts';
import { DomainError, Instant, InvitationToken, SealCount } from '../domain/invitations/valueObjects.ts';
import { toEventDto } from '../domain/invitations/events.ts';

const ISSUED = '2026-11-20T11:00:00Z';
const EXPIRES = '2026-11-28T14:00:00Z';
const NOW = Instant.parse('2026-11-20T11:45:00Z');

function newInvitation(overrides: Partial<Parameters<typeof Invitation.issue>[0]> = {}) {
  return Invitation.issue({
    token: 'inv-2026-11-bering-84a9',
    participantEmail: 'ivanov.perm@example.com',
    participantName: 'Алексей Иванов',
    eventTitle: 'Встреча первооткрывателей · Оса, музей',
    seals: 3,
    issuedAt: ISSUED,
    expiresAt: EXPIRES,
    ...overrides,
  });
}

describe('value objects make invalid values unrepresentable', () => {
  it('rejects an empty token', () => {
    assert.throws(() => InvitationToken.parse('   '), DomainError);
  });

  it('rejects a token in the wrong format', () => {
    assert.throws(() => InvitationToken.parse('hello'), DomainError);
    assert.throws(() => InvitationToken.parse('inv-26-11-x'), DomainError);
  });

  it('normalises token case', () => {
    // Operators paste tokens in any case; comparison must not depend on it.
    assert.equal(InvitationToken.parse('INV-2026-11-BERING-84A9').value, 'inv-2026-11-bering-84a9');
  });

  it('compares tokens by value', () => {
    const a = InvitationToken.parse('inv-2026-11-bering-84a9');
    const b = InvitationToken.parse('INV-2026-11-BERING-84A9');
    assert.equal(a.equals(b), true);
  });

  it('rejects a negative or fractional seal count', () => {
    assert.throws(() => SealCount.of(-1), DomainError);
    assert.throws(() => SealCount.of(1.5), DomainError);
  });

  it('accepts a zero seal count', () => {
    // Zero seals is legitimate: an invitation can exist before any stamp.
    assert.equal(SealCount.of(0).isZero, true);
  });

  it('rejects an unparsable instant', () => {
    assert.throws(() => Instant.parse('not-a-date'), DomainError);
  });

  it('normalises an instant to UTC', () => {
    // A `+05:00` input must become `Z`, or later string comparisons break.
    const withOffset = Instant.parse('2026-11-20T16:45:00+05:00');
    assert.equal(withOffset.iso, '2026-11-20T11:45:00.000Z');
    assert.equal(withOffset.equals(NOW), true);
  });

  it('compares instants by time, not by string', () => {
    const earlier = Instant.parse('2026-11-20T10:00:00Z');
    assert.equal(earlier.isBefore(NOW), true);
    assert.equal(NOW.isAfter(earlier), true);
  });
});

describe('Invitation.issue enforces factory invariants', () => {
  it('issues a valid invitation', () => {
    const invitation = newInvitation();
    assert.equal(invitation.isRedeemed(), false);
    assert.equal(invitation.seals.value, 3);
  });

  it('rejects an expiry before issuance', () => {
    assert.throws(
      () => newInvitation({ issuedAt: EXPIRES, expiresAt: ISSUED }),
      (err: unknown) => err instanceof DomainError && err.code === 'EXPIRY_BEFORE_ISSUE'
    );
  });

  it('rejects an invalid participant email', () => {
    assert.throws(() => newInvitation({ participantEmail: 'no-at-sign' }), DomainError);
  });

  it('raises InvitationIssued on creation', () => {
    const events = newInvitation().pullEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, 'InvitationIssued');
  });

  it('normalises the email to lower case', () => {
    const invitation = newInvitation({ participantEmail: 'Ivanov.PERM@Example.COM' });
    assert.equal(invitation.participantEmail, 'ivanov.perm@example.com');
  });
});

describe('expiry is derived, never stored', () => {
  it('is not expired before expiresAt', () => {
    assert.equal(newInvitation().isExpiredAt(NOW), false);
  });

  it('is expired after expiresAt', () => {
    const after = Instant.parse('2026-12-01T00:00:00Z');
    assert.equal(newInvitation().isExpiredAt(after), true);
  });

  it('is expired exactly at expiresAt', () => {
    // Boundary: an invitation is void from the instant it expires, not after.
    assert.equal(newInvitation().isExpiredAt(Instant.parse(EXPIRES)), true);
  });

  it('cannot be constructed with a contradicting expiry flag', () => {
    // The old model had `expiresAt` *and* `expired`; a record could claim
    // `expired: false` while `expiresAt` was in the past. There is no field to
    // set now, which is stronger than a runtime check.
    //
    // The invitation is issued earlier and expires before "now" — a coherent
    // history, but expired at the moment of the check.
    const invitation = newInvitation({
      issuedAt: '2026-09-01T10:00:00Z',
      expiresAt: '2026-09-25T18:00:00Z',
    });
    assert.equal(
      Object.keys(invitation.toSnapshot()).includes('expired'),
      false,
      'snapshot must not carry a denormalised expiry flag'
    );
    assert.equal(invitation.isExpiredAt(NOW), true, 'derived from expiresAt alone');
  });
});

describe('Invitation.redeem', () => {
  it('redeems a valid invitation', () => {
    const invitation = newInvitation();
    const result = invitation.redeem(NOW);
    assert.equal(result.ok, true);
    assert.equal(invitation.isRedeemed(), true);
  });

  it('refuses an expired invitation', () => {
    const invitation = newInvitation({
      issuedAt: '2026-09-01T10:00:00Z',
      expiresAt: '2026-09-25T18:00:00Z',
    });
    const result = invitation.redeem(NOW);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.refusal, 'EXPIRED');
      assert.match(result.message, /истёк/);
    }
    assert.equal(invitation.isRedeemed(), false, 'a refusal must not mutate state');
  });

  it('refuses a second redemption', () => {
    const invitation = newInvitation();
    invitation.redeem(NOW);
    const second = invitation.redeem(NOW);
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.equal(second.refusal, 'ALREADY_REDEEMED');
    }
  });

  it('reports expired before already-redeemed', () => {
    // An invitation that lapsed after being redeemed is, for the operator, an
    // expiry problem: the escalation path differs.
    const invitation = newInvitation({ expiresAt: '2026-11-20T11:30:00Z' });
    invitation.redeem(Instant.parse('2026-11-20T11:15:00Z'));
    const later = invitation.redeem(NOW);
    assert.equal(later.ok, false);
    if (!later.ok) {
      assert.equal(later.refusal, 'EXPIRED');
    }
  });

  it('raises InvitationRedeemed on success', () => {
    const invitation = newInvitation();
    invitation.pullEvents();
    invitation.redeem(NOW);
    const events = invitation.pullEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, 'InvitationRedeemed');
  });

  it('raises a rejection event on refusal', () => {
    const invitation = newInvitation();
    invitation.pullEvents();
    invitation.redeem(NOW); // succeeds -> InvitationRedeemed
    invitation.pullEvents(); // drain it
    invitation.redeem(NOW); // refused -> InvitationRedeemRejected
    const events = invitation.pullEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, 'InvitationRedeemRejected');
  });

  it('drains events when read', () => {
    const invitation = newInvitation();
    assert.equal(invitation.pullEvents().length, 1);
    assert.equal(invitation.pullEvents().length, 0, 'reading must clear the buffer');
  });
});

describe('restore does not replay history', () => {
  it('rebuilds a redeemed invitation without raising InvitationIssued', () => {
    const original = newInvitation();
    original.redeem(NOW);
    const restored = Invitation.restore(original.toSnapshot());
    assert.equal(restored.pullEvents().length, 0);
    assert.equal(restored.isRedeemed(), true);
  });

  it('round-trips through a snapshot', () => {
    const original = newInvitation();
    original.redeem(NOW);
    const restored = Invitation.restore(original.toSnapshot());
    assert.deepEqual(restored.toSnapshot(), original.toSnapshot());
  });
});

describe('event serialisation', () => {
  it('flattens value objects into primitives', () => {
    const events = newInvitation().pullEvents();
    const dto = toEventDto(events[0]!);
    assert.equal(dto.type, 'InvitationIssued');
    assert.equal(typeof dto.payload.token, 'string');
    assert.equal(typeof dto.payload.sealsAtIssue, 'number');
    assert.match(dto.occurredAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  it('produces JSON-safe payloads', () => {
    const events = newInvitation().pullEvents();
    const dto = toEventDto(events[0]!);
    assert.deepEqual(JSON.parse(JSON.stringify(dto)), dto);
  });
});
