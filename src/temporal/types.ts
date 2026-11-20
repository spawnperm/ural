/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflow input/output contracts.
 *
 * Plain TypeScript types, validated by the caller with Zod before they reach the
 * workflow. Workflow arguments cross a process boundary and are serialised to
 * JSON by Temporal, so the shapes here must stay JSON-compatible: no Dates, no
 * classes, no `undefined` holes that a round-trip would flatten.
 *
 * Dates travel as ISO-8601 strings for exactly that reason — a Date would come
 * back as a string anyway, and code written against it would be wrong in a way
 * that only shows up in production.
 */

/** One stage of the seal series: a QR marker the participant scans. */
export interface SealStage {
  /** Stable identifier, e.g. `perm-1684-velikaya-01`. */
  stageId: string;
  title: string;
  /** When this stage becomes redeemable (ISO-8601). */
  opensAt: string;
}

export interface SealSeriesInput {
  /** Quest attempt this series belongs to. */
  attemptId: string;
  participantId: string;
  /** Ordered stages; the series is complete when every one is sealed. */
  stages: SealStage[];
  /** How long after a stage opens it may still be sealed (days). */
  stageWindowDays: number;
}

export type SealSeriesResult =
  | { status: 'completed'; sealedStages: string[]; completedAt: string }
  | { status: 'expired'; sealedStages: string[]; missedStages: string[] };

export interface RecordSealResult {
  /** True when this call created the seal; false when it already existed. */
  created: boolean;
  sealedStages: string[];
  /** Stage ids still open for sealing. */
  remainingStages: string[];
}

/** Arguments for the `recordSeal` activity. */
export interface RecordSealInput {
  attemptId: string;
  stageId: string;
  /** Workflow time, not the activity's own clock. */
  sealedAt: string;
}

export interface InvitationExpiryInput {
  invitationToken: string;
  /** ISO-8601 instant after which the invitation is void. */
  expiresAt: string;
}

export interface CredentialsInput {
  attemptId: string;
  participantName: string;
  /** Absolute path or object key the rendered artifact is written to. */
  outputKey: string;
  /** Free-form payload baked into the certificate. */
  achievements: string[];
}

export interface CredentialsResult {
  /** Identifiers of the produced artifacts, in render order. */
  artifacts: Array<{ kind: 'qr' | 'pdf'; key: string; sha256: string }>;
}

/** Payload published to the event bus at the end of a saga. */
export interface QuestEvent {
  subject: string;
  type: string;
  attemptId: string;
  participantId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}
