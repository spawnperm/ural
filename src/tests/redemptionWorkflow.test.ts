/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Redemption workflow tests — against the domain model.
 *
 * The workflow no longer switches on strings: it derives the state from the
 * `Invitation` aggregate and delegates the decision to it. These tests check the
 * two properties that matter:
 *
 * 1. every state is reachable and has a rule (the diagram is exhaustive);
 * 2. the workflow and the aggregate cannot disagree about a refusal — because the
 *    workflow asks the aggregate rather than re-implementing its rules.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  REDEMPTION_CODES,
  REDEMPTION_STATES,
  REDEMPTION_WORKFLOW,
  WorkflowError,
  codeForRefusal,
  runRedemption,
  stateForInvitation,
  toMermaid,
  type RedemptionState,
} from '../data/redemptionWorkflow.ts';
import { Invitation } from '../domain/invitations/Invitation.ts';
import { Instant } from '../domain/invitations/valueObjects.ts';

const NOW = Instant.parse('2026-11-20T11:45:00Z');
const FUTURE = '2026-11-28T14:00:00Z';
const PAST = '2026-09-25T18:00:00Z';

function invitation(overrides: { expiresAt?: string; issuedAt?: string } = {}) {
  return Invitation.issue({
    token: 'inv-2026-11-bering-84a9',
    participantEmail: 'ivanov.perm@example.com',
    participantName: 'Алексей Иванов',
    eventTitle: 'Встреча · Оса',
    seals: 3,
    issuedAt: overrides.issuedAt ?? '2026-11-20T11:00:00Z',
    expiresAt: overrides.expiresAt ?? FUTURE,
  });
}

describe('workflow document integrity', () => {
  it('declares a semantic version', () => {
    assert.match(REDEMPTION_WORKFLOW.version, /^\d+\.\d+\.\d+$/);
  });

  it('uses only declared states', () => {
    const declared = new Set<string>(REDEMPTION_STATES);
    for (const rule of REDEMPTION_WORKFLOW.rules) {
      assert.ok(declared.has(rule.from), `undeclared from: ${rule.from}`);
      assert.ok(declared.has(rule.to), `undeclared to: ${rule.to}`);
    }
  });

  it('has exactly one rule per (from, action)', () => {
    const seen = new Set<string>();
    for (const rule of REDEMPTION_WORKFLOW.rules) {
      const key = `${rule.from}:${rule.action}`;
      assert.equal(seen.has(key), false, `duplicate rule for ${key}`);
      seen.add(key);
    }
  });

  it('covers every non-terminal state', () => {
    const withRule = new Set(REDEMPTION_WORKFLOW.rules.map((r) => r.from));
    for (const state of REDEMPTION_STATES) {
      if (REDEMPTION_WORKFLOW.terminalStates.includes(state)) continue;
      assert.ok(withRule.has(state), `decision state ${state} has no rule`);
    }
  });

  it('does not give a terminal state a rule', () => {
    // A terminal state is an outcome; making it actionable would mean inventing
    // a screen that never exists.
    for (const terminal of REDEMPTION_WORKFLOW.terminalStates) {
      assert.equal(
        REDEMPTION_WORKFLOW.rules.some((r) => r.from === terminal),
        false,
        `terminal state ${terminal} must not be a rule source`
      );
    }
  });

  it('uses codes from the single catalogue', () => {
    // The codes come from `REDEMPTION_CODES`, so a UI comparison against a
    // literal that no longer exists is impossible to write by accident.
    const known = new Set<string>(Object.values(REDEMPTION_CODES));
    for (const rule of REDEMPTION_WORKFLOW.rules) {
      assert.ok(known.has(rule.code), `unknown code ${rule.code}`);
    }
  });
});

describe('stateForInvitation derives state from the aggregate', () => {
  it('maps a missing invitation to notFound', () => {
    assert.equal(stateForInvitation(null, NOW), 'notFound');
  });

  it('maps a redeemable invitation to valid', () => {
    assert.equal(stateForInvitation(invitation(), NOW), 'valid');
  });

  it('maps an expired invitation', () => {
    const expired = invitation({ issuedAt: '2026-09-01T10:00:00Z', expiresAt: PAST });
    assert.equal(stateForInvitation(expired, NOW), 'expired');
  });

  it('maps a redeemed invitation', () => {
    const redeemed = invitation();
    redeemed.redeem(NOW);
    assert.equal(stateForInvitation(redeemed, NOW), 'redeemed');
  });

  it('prefers expired over redeemed', () => {
    // Lapsed after being redeemed: the operator needs the expiry explanation.
    const lapsed = invitation({ issuedAt: '2026-11-20T11:00:00Z', expiresAt: '2026-11-20T11:30:00Z' });
    lapsed.redeem(Instant.parse('2026-11-20T11:15:00Z'));
    assert.equal(stateForInvitation(lapsed, NOW), 'expired');
  });

  it('is a pure function of the aggregate and the instant', () => {
    // Same inputs, same answer — no hidden clock.
    const inv = invitation();
    assert.equal(stateForInvitation(inv, NOW), stateForInvitation(inv, NOW));
  });
});

describe('runRedemption delegates to the aggregate', () => {
  it('succeeds from a valid invitation and mutates it', () => {
    const inv = invitation();
    const outcome = runRedemption(REDEMPTION_WORKFLOW, inv, NOW);
    assert.equal(outcome.state, 'success');
    assert.equal(outcome.code, REDEMPTION_CODES.success);
    assert.equal(inv.isRedeemed(), true);
  });

  it('refuses an expired invitation without mutating', () => {
    const inv = invitation({ issuedAt: '2026-09-01T10:00:00Z', expiresAt: PAST });
    const outcome = runRedemption(REDEMPTION_WORKFLOW, inv, NOW);
    assert.equal(outcome.code, REDEMPTION_CODES.expired);
    assert.equal(outcome.state, 'expired');
    assert.equal(inv.isRedeemed(), false);
  });

  it('refuses a second redemption', () => {
    const inv = invitation();
    runRedemption(REDEMPTION_WORKFLOW, inv, NOW);
    const second = runRedemption(REDEMPTION_WORKFLOW, inv, NOW);
    assert.equal(second.code, REDEMPTION_CODES.alreadyRedeemed);
    assert.equal(second.state, 'redeemed');
  });

  it('reports notFound without an aggregate', () => {
    const outcome = runRedemption(REDEMPTION_WORKFLOW, null, NOW);
    assert.equal(outcome.code, REDEMPTION_CODES.notFound);
    assert.equal(outcome.state, 'notFound');
  });

  it('never reports success for a refused redemption', () => {
    // The single most important assertion here: the workflow must not disagree
    // with the aggregate about whether the visit was recorded.
    for (const makeInv of [
      () => invitation({ issuedAt: '2026-09-01T10:00:00Z', expiresAt: PAST }),
      () => {
        const inv = invitation();
        inv.redeem(NOW);
        return inv;
      },
    ]) {
      const inv = makeInv();
      const outcome = runRedemption(REDEMPTION_WORKFLOW, inv, NOW);
      assert.notEqual(outcome.code, REDEMPTION_CODES.success);
      assert.notEqual(outcome.state, 'success');
    }
  });

  it('throws when a state has no rule', () => {
    const broken = {
      ...REDEMPTION_WORKFLOW,
      rules: REDEMPTION_WORKFLOW.rules.filter((r) => r.from !== 'expired'),
    };
    const inv = invitation({ issuedAt: '2026-09-01T10:00:00Z', expiresAt: PAST });
    assert.throws(() => runRedemption(broken, inv, NOW), WorkflowError);
  });
});

describe('codeForRefusal is exhaustive', () => {
  it('maps EXPIRED', () => {
    assert.equal(codeForRefusal('EXPIRED'), REDEMPTION_CODES.expired);
  });

  it('maps ALREADY_REDEEMED', () => {
    assert.equal(codeForRefusal('ALREADY_REDEEMED'), REDEMPTION_CODES.alreadyRedeemed);
  });
});

describe('toMermaid', () => {
  const diagram = toMermaid(REDEMPTION_WORKFLOW);

  it('starts a state diagram from the initial state', () => {
    assert.ok(diagram.startsWith('stateDiagram-v2'));
    assert.ok(diagram.includes(`[*] --> ${REDEMPTION_WORKFLOW.initialState}`));
  });

  it('contains one edge per rule', () => {
    for (const rule of REDEMPTION_WORKFLOW.rules) {
      const edge = `${rule.from} --> ${rule.to} : ${rule.action} / ${rule.code}`;
      assert.ok(diagram.includes(edge), `missing edge: ${edge}`);
    }
  });

  it('marks terminal states', () => {
    for (const terminal of REDEMPTION_WORKFLOW.terminalStates) {
      assert.ok(diagram.includes(`${terminal} --> [*]`));
    }
  });

  it('is deterministic', () => {
    assert.equal(toMermaid(REDEMPTION_WORKFLOW), toMermaid(REDEMPTION_WORKFLOW));
  });
});

describe('every decision state is reachable in practice', () => {
  // Guards against a rule that exists in the document but cannot occur, which
  // would make the diagram describe a fictional flow.
  it('constructs a real aggregate for each decision state', () => {
    const reachable = new Map<RedemptionState, Invitation | null>();

    reachable.set('notFound', null);
    reachable.set('valid', invitation());
    reachable.set(
      'expired',
      invitation({ issuedAt: '2026-09-01T10:00:00Z', expiresAt: PAST })
    );
    const redeemed = invitation();
    redeemed.redeem(NOW);
    reachable.set('redeemed', redeemed);

    const decisionStates = REDEMPTION_STATES.filter(
      (s) => !REDEMPTION_WORKFLOW.terminalStates.includes(s)
    );
    for (const state of decisionStates) {
      assert.ok(reachable.has(state), `no fixture reaches state ${state}`);
      assert.equal(
        stateForInvitation(reachable.get(state)!, NOW),
        state,
        `fixture for ${state} derives a different state`
      );
    }
  });
});
