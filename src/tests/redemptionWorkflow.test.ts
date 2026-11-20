/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Invitation redemption workflow tests.
 *
 * The value of expressing the flow as data is that it can be checked
 * exhaustively: before this refactor the four outcomes lived in nested `if`s
 * inside a 672-line component and could only be verified by clicking in a
 * browser. Now every state and every rule is assertable in milliseconds.
 *
 * These tests also guard the diagram: if a rule is removed from the document, the
 * Mermaid output loses an edge and the documentation picture silently becomes
 * wrong — so the diagram is asserted against the rules, not against a snapshot.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  REDEMPTION_STATES,
  REDEMPTION_WORKFLOW,
  WorkflowError,
  runRedemption,
  stateForInvitation,
  toMermaid,
  type RedemptionState,
} from '../data/redemptionWorkflow.ts';

describe('workflow document integrity', () => {
  it('declares a version and a title', () => {
    assert.match(REDEMPTION_WORKFLOW.version, /^\d+\.\d+\.\d+$/);
    assert.ok(REDEMPTION_WORKFLOW.title.length > 0);
  });

  it('uses only declared states', () => {
    const declared = new Set<string>(REDEMPTION_STATES);
    for (const rule of REDEMPTION_WORKFLOW.rules) {
      assert.ok(declared.has(rule.from), `undeclared from: ${rule.from}`);
      assert.ok(declared.has(rule.to), `undeclared to: ${rule.to}`);
    }
  });

  it('declares an initial state that has an outgoing rule', () => {
    const initial = REDEMPTION_WORKFLOW.initialState;
    assert.ok(
      REDEMPTION_WORKFLOW.rules.some((r) => r.from === initial),
      `initial state ${initial} has no rule, so it cannot progress`
    );
  });

  it('has exactly one rule per (from, action) pair', () => {
    // Duplicates would make `runRedemption` order-dependent — a silent behaviour
    // change from an innocent-looking edit.
    const seen = new Set<string>();
    for (const rule of REDEMPTION_WORKFLOW.rules) {
      const key = `${rule.from}:${rule.action}`;
      assert.equal(seen.has(key), false, `duplicate rule for ${key}`);
      seen.add(key);
    }
  });

  it('marks exactly one rule as mutating', () => {
    const mutating = REDEMPTION_WORKFLOW.rules.filter((r) => r.mutation === true);
    assert.equal(mutating.length, 1);
    assert.equal(mutating[0]?.code, 'SUCCESS');
  });

  it('gives every rule a stable machine code', () => {
    for (const rule of REDEMPTION_WORKFLOW.rules) {
      assert.match(rule.code, /^[A-Z][A-Z_]*$/, `bad code: ${rule.code}`);
    }
  });

  it('references only terminal states as ends', () => {
    for (const terminal of REDEMPTION_WORKFLOW.terminalStates) {
      assert.ok(
        (REDEMPTION_STATES as readonly string[]).includes(terminal),
        `undeclared terminal state: ${terminal}`
      );
    }
  });
});

describe('stateForInvitation', () => {
  it('maps a missing invitation to notFound', () => {
    assert.equal(stateForInvitation(null), 'notFound');
  });

  it('maps an expired invitation', () => {
    assert.equal(stateForInvitation({ expired: true, redeemedAt: null }), 'expired');
  });

  it('maps an already redeemed invitation', () => {
    assert.equal(stateForInvitation({ expired: false, redeemedAt: '2026-10-30T15:42:10Z' }), 'redeemed');
  });

  it('maps a redeemable invitation to valid', () => {
    assert.equal(stateForInvitation({ expired: false, redeemedAt: null }), 'valid');
  });

  it('prefers expired over redeemed', () => {
    // An invitation that both expired and was redeemed is still "expired" for the
    // operator: the escalation path is the same, and reporting "already redeemed"
    // would hide the fact that it lapsed.
    assert.equal(
      stateForInvitation({ expired: true, redeemedAt: '2026-10-30T15:42:10Z' }),
      'expired'
    );
  });
});

describe('runRedemption covers every state', () => {
  /*
   * Exhaustive rather than example-based, but it has to distinguish two kinds of
   * state. A *decision* state (one the operator can act in) must have an outcome;
   * a *terminal* state is the result of a decision and re-running the flow from
   * there is not a scenario the UI offers.
   *
   * `success` is terminal: the visit is already recorded, and the second press is
   * prevented by the invitation gaining `redeemedAt`. Treating it as actionable
   * would mean inventing a rule for a screen that never shows a button.
   */
  const decisionStates = REDEMPTION_STATES.filter(
    (state) => !REDEMPTION_WORKFLOW.terminalStates.includes(state)
  );

  for (const state of decisionStates) {
    it(`produces an outcome for decision state ${state}`, () => {
      const outcome = runRedemption(REDEMPTION_WORKFLOW, state);
      assert.ok(outcome.code.length > 0);
      assert.ok(outcome.message.length > 0);
      assert.equal(typeof outcome.mutated, 'boolean');
    });
  }

  it('refuses to run from a terminal state instead of pretending to succeed', () => {
    // A terminal state has no rule by design. The function must throw rather than
    // fall back to a success that would record a second visit.
    for (const terminal of REDEMPTION_WORKFLOW.terminalStates) {
      assert.throws(
        () => runRedemption(REDEMPTION_WORKFLOW, terminal),
        WorkflowError,
        `terminal state ${terminal} must not be actionable`
      );
    }
  });

  it('covers every non-terminal state with a rule', () => {
    const withRule = new Set(REDEMPTION_WORKFLOW.rules.map((r) => r.from));
    for (const state of decisionStates) {
      assert.ok(withRule.has(state), `decision state ${state} has no rule`);
    }
  });

  it('succeeds from valid and requests a mutation', () => {
    const outcome = runRedemption(REDEMPTION_WORKFLOW, 'valid');
    assert.equal(outcome.state, 'success');
    assert.equal(outcome.code, 'SUCCESS');
    assert.equal(outcome.mutated, true);
  });

  it('refuses from expired without mutating', () => {
    const outcome = runRedemption(REDEMPTION_WORKFLOW, 'expired');
    assert.equal(outcome.code, 'INVITATION_EXPIRED');
    assert.equal(outcome.mutated, false);
    assert.equal(outcome.state, 'expired', 'a refused action must not advance the state');
  });

  it('refuses from redeemed without mutating', () => {
    const outcome = runRedemption(REDEMPTION_WORKFLOW, 'redeemed');
    assert.equal(outcome.code, 'INVITATION_REDEEMED');
    assert.equal(outcome.mutated, false);
  });

  it('reports not found without mutating', () => {
    const outcome = runRedemption(REDEMPTION_WORKFLOW, 'notFound');
    assert.equal(outcome.code, 'NOT_FOUND');
    assert.equal(outcome.mutated, false);
  });

  it('never mutates in a terminal refusal state', () => {
    for (const state of ['expired', 'redeemed', 'notFound'] as RedemptionState[]) {
      assert.equal(runRedemption(REDEMPTION_WORKFLOW, state).mutated, false, state);
    }
  });

  it('throws when the document has no rule for a state', () => {
    // Fail loudly: silently returning success would record visits that must not
    // exist. Simulate a half-edited document.
    const broken = {
      ...REDEMPTION_WORKFLOW,
      rules: REDEMPTION_WORKFLOW.rules.filter((r) => r.from !== 'expired'),
    };
    assert.throws(() => runRedemption(broken, 'expired'), WorkflowError);
  });
});

describe('toMermaid', () => {
  const diagram = toMermaid(REDEMPTION_WORKFLOW);

  it('starts a state diagram', () => {
    assert.ok(diagram.startsWith('stateDiagram-v2'));
  });

  it('enters through the initial state', () => {
    assert.ok(diagram.includes(`[*] --> ${REDEMPTION_WORKFLOW.initialState}`));
  });

  it('contains one edge per rule', () => {
    // The key drift check: a rule removed from the document must remove its edge.
    for (const rule of REDEMPTION_WORKFLOW.rules) {
      const edge = `${rule.from} --> ${rule.to} : ${rule.action} / ${rule.code}`;
      assert.ok(diagram.includes(edge), `missing edge: ${edge}`);
    }
  });

  it('marks terminal states with an end arrow', () => {
    for (const terminal of REDEMPTION_WORKFLOW.terminalStates) {
      assert.ok(
        diagram.includes(`${terminal} --> [*]`),
        `missing terminal arrow for ${terminal}`
      );
    }
  });

  it('uses no state that is absent from the document', () => {
    // Guards against a hand-edited rule pointing at a state nobody declared.
    const declared = new Set<string>(REDEMPTION_STATES);
    for (const line of diagram.split('\n')) {
      const match = /^\s{4}([a-zA-Z]+) --> \[?\*?\]?/.exec(line);
      if (match?.[1]) {
        assert.ok(declared.has(match[1]), `diagram mentions undeclared state ${match[1]}`);
      }
    }
  });

  it('is deterministic', () => {
    // Same document in, same text out — the diagram is committed to docs.
    assert.equal(toMermaid(REDEMPTION_WORKFLOW), toMermaid(REDEMPTION_WORKFLOW));
  });
});
