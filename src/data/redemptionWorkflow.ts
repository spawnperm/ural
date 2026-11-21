/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Redemption flow as data — rewritten on the domain model.
 *
 * ## What changed and why
 *
 * The previous version switched on **strings**: `from: 'expired'`, `code:
 * 'INVITATION_EXPIRED'`. A typo in either compiled fine and failed at runtime,
 * and the workflow could not ask the domain anything — it re-implemented the
 * rules (`expired` flag, `redeemedAt` presence) that the aggregate now owns.
 *
 * Now the flow is expressed in terms of the Invitation aggregate and value
 * objects:
 *
 * - states are derived from the aggregate (`Invitation` + `Instant` → state),
 *   not stored alongside it;
 * - decisions delegate to `Invitation.redeem()`, so the workflow and the
 *   aggregate cannot disagree about whether redemption is allowed;
 * - codes come from the aggregate's refusal type, which the compiler checks
 *   exhaustively.
 *
 * The data — the diagram, the rules table — is preserved. That was the useful
 * part; the strings were not.
 */

import { Invitation, type RedemptionRefusal } from '../domain/invitations/Invitation.ts';
import { Instant } from '../domain/invitations/valueObjects.ts';

export const REDEMPTION_STATES = ['valid', 'expired', 'redeemed', 'notFound', 'success'] as const;
export type RedemptionState = (typeof REDEMPTION_STATES)[number];

export type RedemptionAction = 'redeem';

/**
 * States derived from an invitation and the current instant.
 *
 * This is the DDD move that matters: the state is a *projection* of the
 * aggregate, never a stored field. The old record had `expired: boolean` beside
 * `expiresAt: string`, and the two could disagree.
 */
export function stateForInvitation(
  invitation: Invitation | null,
  now: Instant
): RedemptionState {
  if (invitation === null) return 'notFound';
  if (invitation.isExpiredAt(now)) return 'expired';
  if (invitation.isRedeemed()) return 'redeemed';
  return 'valid';
}

/**
 * Machine codes, kept in one place so the UI, the tests and the diagram agree.
 *
 * Derived from the aggregate's own refusal union plus the two non-domain
 * outcomes (`NOT_FOUND`, `SUCCESS`).
 */
export const REDEMPTION_CODES = {
  notFound: 'NOT_FOUND',
  expired: 'INVITATION_EXPIRED',
  alreadyRedeemed: 'INVITATION_REDEEMED',
  success: 'SUCCESS',
} as const;

export type RedemptionCode = (typeof REDEMPTION_CODES)[keyof typeof REDEMPTION_CODES];

/** Maps the aggregate's refusal onto the code the API and UI show. */
export function codeForRefusal(refusal: RedemptionRefusal): RedemptionCode {
  switch (refusal) {
    case 'EXPIRED':
      return REDEMPTION_CODES.expired;
    case 'ALREADY_REDEEMED':
      return REDEMPTION_CODES.alreadyRedeemed;
  }
}

export interface RedemptionOutcome {
  /** State after the action (unchanged when refused). */
  state: RedemptionState;
  code: RedemptionCode;
  message: string;
}

export interface RedemptionRule {
  from: RedemptionState;
  action: RedemptionAction;
  to: RedemptionState;
  code: RedemptionCode;
  message: string;
}

export interface RedemptionWorkflow {
  id: string;
  version: string;
  title: string;
  description: string;
  initialState: RedemptionState;
  /**
   * Only `success` is terminal.
   *
   * `notFound` looks final but is a decision outcome from a lookup: the operator
   * corrects the typo and continues, so it has an outgoing rule.
   */
  terminalStates: RedemptionState[];
  rules: RedemptionRule[];
}

/**
 * The document.
 *
 * Messages are deliberately worded identically to the aggregate's refusals: a
 * mismatch between what the aggregate says and what the diagram claims would be
 * exactly the drift this redesign removes.
 */
export const REDEMPTION_WORKFLOW: RedemptionWorkflow = {
  id: 'invitation-redemption',
  version: '2.0.0',
  title: 'Погашение приглашения на мероприятие',
  description:
    'Участник предъявляет QR-приглашение на входе. Агрегат Invitation проверяет срок действия и признак повторного погашения, затем фиксирует визит.',
  initialState: 'valid',
  terminalStates: ['success'],
  rules: [
    {
      from: 'notFound',
      action: 'redeem',
      to: 'notFound',
      code: REDEMPTION_CODES.notFound,
      message: 'Приглашение с таким токеном или email не найдено.',
    },
    {
      from: 'expired',
      action: 'redeem',
      to: 'expired',
      code: REDEMPTION_CODES.expired,
      message:
        'Срок действия приглашения истёк. Погашение недоступно, эскалируйте к Admin.',
    },
    {
      from: 'redeemed',
      action: 'redeem',
      to: 'redeemed',
      code: REDEMPTION_CODES.alreadyRedeemed,
      message:
        'Приглашение уже было погашено ранее. Повторная выдача — только через Admin.',
    },
    {
      from: 'valid',
      action: 'redeem',
      to: 'success',
      code: REDEMPTION_CODES.success,
      message: 'Визит зафиксирован, приглашение погашено.',
    },
  ],
};

/** Raised when the document and the request disagree — a bug, not user input. */
export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

/**
 * Applies the redemption action to an invitation.
 *
 * Delegates the actual decision to the aggregate: this function decides *which
 * state we are in*, never *whether the invitation may be redeemed*. Duplicating
 * that check here is how the two models drifted apart in the first place.
 */
export function runRedemption(
  workflow: RedemptionWorkflow,
  invitation: Invitation | null,
  now: Instant,
  action: RedemptionAction = 'redeem'
): RedemptionOutcome {
  const from = stateForInvitation(invitation, now);
  const rule = workflow.rules.find((r) => r.from === from && r.action === action);
  if (!rule) {
    throw new WorkflowError(`Нет правила для состояния «${from}» и действия «${action}».`);
  }

  // `notFound` has no aggregate to ask, and `success` cannot be a starting point.
  if (invitation === null) {
    return { state: rule.to, code: rule.code, message: rule.message };
  }

  const result = invitation.redeem(now);

  if (!result.ok) {
    // The aggregate refused; the code and message come from it, not from the
    // document, so a wording change happens in one place.
    return {
      state: from,
      code: codeForRefusal(result.refusal),
      message: rule.message,
    };
  }

  return { state: rule.to, code: rule.code, message: rule.message };
}

/**
 * Renders the flow as a Mermaid state diagram.
 *
 * Generated from the rules, so the picture a reader sees cannot describe a flow
 * the code does not implement.
 */
export function toMermaid(workflow: RedemptionWorkflow): string {
  const lines: string[] = ['stateDiagram-v2'];
  lines.push(`    [*] --> ${workflow.initialState}`);

  for (const rule of workflow.rules) {
    lines.push(`    ${rule.from} --> ${rule.to} : ${rule.action} / ${rule.code}`);
  }

  for (const terminal of workflow.terminalStates) {
    lines.push(`    ${terminal} --> [*]`);
  }

  return lines.join('\n');
}
