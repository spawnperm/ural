/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Invitation redemption as data.
 *
 * ## Where this comes from
 *
 * The idea is taken from [cc-wf-studio](https://github.com/breaking-brake/cc-wf-studio),
 * whose central insight is that a workflow should be **a JSON document**, not code
 * with the flow buried in conditionals. From one file it renders a diagram,
 * validates itself, and drives execution — so the picture in the documentation
 * cannot drift from the behaviour.
 *
 * Only the *idea* is borrowed. cc-wf-studio's extension is AGPL-3.0, so no code
 * was copied; its MIT-licensed libraries are also not vendored, because their
 * domain (exporting agent skills to `.claude/`) has nothing to do with this
 * portal.
 *
 * ## What it replaces
 *
 * The simulator used to decide the outcome of a redemption with nested `if`s
 * inside a 672-line component:
 *
 *     if (invitation.expired) { ... } else if (invitation.redeemedAt) { ... }
 *
 * Four outcomes, three of them unreachable-by-inspection, and no way to render a
 * diagram of them for the reader. Now the flow is this file, and the component
 * reads the result.
 */

export const REDEMPTION_STATES = ['valid', 'expired', 'redeemed', 'notFound', 'success'] as const;
export type RedemptionState = (typeof REDEMPTION_STATES)[number];

export type RedemptionAction = 'redeem';

export interface RedemptionRule {
  /** State this rule applies to. */
  from: RedemptionState;
  /** Action that triggers the rule. */
  action: RedemptionAction;
  /** Where execution goes. */
  to: RedemptionState;
  /** Stable machine code returned to the caller. */
  code: string;
  /** Message shown to the operator; no formatting, the UI styles it. */
  message: string;
  /** `true` when the visit should be recorded as a side effect. */
  mutation?: boolean;
}

export interface RedemptionWorkflow {
  id: string;
  version: string;
  title: string;
  description: string;
  /** Initial state, which is also the terminal state after a success. */
  initialState: RedemptionState;
  /** States from which no action is possible. */
  terminalStates: RedemptionState[];
  rules: RedemptionRule[];
}

/**
 * The workflow document.
 *
 * Deliberately data only: no functions, no imports. It can be serialised,
 * diffed in review, and rendered to a diagram — the three properties that made
 * cc-wf-studio's approach worth adopting.
 */
export const REDEMPTION_WORKFLOW: RedemptionWorkflow = {
  id: 'invitation-redemption',
  version: '1.0.0',
  title: 'Погашение приглашения на мероприятие',
  description:
    'Участник предъявляет QR-приглашение на входе. Система проверяет срок действия и признак повторного погашения, затем фиксирует визит в коллекции visits.',
  initialState: 'valid',
  /*
   * Only `success` is terminal.
   *
   * `notFound` looks like an end, but it is a *decision* outcome produced by a
   * lookup: the operator corrects the typo and tries again, so the flow continues
   * from there. Treating it as terminal made the document contradictory — a state
   * that both has a rule and is declared unreachable.
   */
  terminalStates: ['success'],
  rules: [
    {
      from: 'notFound',
      action: 'redeem',
      to: 'notFound',
      code: 'NOT_FOUND',
      message: 'Приглашение с таким токеном или email не найдено.',
    },
    {
      from: 'expired',
      action: 'redeem',
      to: 'expired',
      code: 'INVITATION_EXPIRED',
      message:
        'INVITATION_EXPIRED: Срок действия приглашения истёк. Погашение недоступно, эскалируйте к Admin.',
    },
    {
      from: 'redeemed',
      action: 'redeem',
      to: 'redeemed',
      code: 'INVITATION_REDEEMED',
      message:
        'INVITATION_REDEEMED: Приглашение уже было погашено ранее. Повторная выдача — только через Admin.',
    },
    {
      from: 'valid',
      action: 'redeem',
      to: 'success',
      code: 'SUCCESS',
      message: 'Визит зафиксирован в коллекции visits. Статус приглашения обновлён.',
      // The only rule with a side effect; the caller applies it.
      mutation: true,
    },
  ],
};

export interface RedemptionOutcome {
  state: RedemptionState;
  code: string;
  message: string;
  /** True when the caller must record the visit. */
  mutated: boolean;
}

/** Raised when the document and the request disagree — a bug, not user input. */
export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

/**
 * Runs the workflow.
 *
 * A pure function over the document: no React, no dates, no side effects. The
 * caller passes the state it derived from the invitation and gets back what to
 * show and whether to write. That is what makes the four outcomes testable
 * without a browser.
 */
export function runRedemption(
  workflow: RedemptionWorkflow,
  from: RedemptionState,
  action: RedemptionAction = 'redeem'
): RedemptionOutcome {
  const rule = workflow.rules.find((r) => r.from === from && r.action === action);
  if (!rule) {
    // Fail loudly: a missing rule means the document was edited incompletely,
    // and silently returning "success" would record visits that should not exist.
    throw new WorkflowError(
      `Нет правила для состояния «${from}» и действия «${action}».`
    );
  }
  return {
    state: rule.to,
    code: rule.code,
    message: rule.message,
    mutated: rule.mutation === true,
  };
}

/** Derives the current state from an invitation record. */
export function stateForInvitation(invitation: {
  expired: boolean;
  redeemedAt: string | null;
} | null): RedemptionState {
  if (!invitation) return 'notFound';
  if (invitation.expired) return 'expired';
  if (invitation.redeemedAt) return 'redeemed';
  return 'valid';
}

/**
 * Renders the workflow as a Mermaid state diagram.
 *
 * Generated, never hand-drawn: the documentation diagram is then guaranteed to
 * match the rules above. This is the property cc-wf-studio's `render` subcommand
 * provides for its own format.
 */
export function toMermaid(workflow: RedemptionWorkflow): string {
  const lines: string[] = ['stateDiagram-v2'];
  lines.push(`    [*] --> ${workflow.initialState}`);

  // Group edges by source so a state with several outgoing actions reads cleanly.
  const bySource = new Map<RedemptionState, RedemptionRule[]>();
  for (const rule of workflow.rules) {
    const existing = bySource.get(rule.from) ?? [];
    existing.push(rule);
    bySource.set(rule.from, existing);
  }

  for (const [from, rules] of bySource) {
    for (const rule of rules) {
      const label = `${rule.action} / ${rule.code}`;
      if (rule.to === from) {
        // Self-transition: Mermaid needs this spelling, and it correctly conveys
        // "the action is refused and the state does not advance".
        lines.push(`    ${from} --> ${from} : ${label}`);
      } else {
        lines.push(`    ${from} --> ${rule.to} : ${label}`);
      }
    }
  }

  for (const terminal of workflow.terminalStates) {
    lines.push(`    ${terminal} --> [*]`);
  }

  return lines.join('\n');
}
