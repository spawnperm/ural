/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflow implementations.
 *
 * ## Why these three live here and not in the portal
 *
 * The documentation describes Temporal as the durable-execution layer for the
 * quest system (`src/data/projectDocs.ts`): a three-month seal series, delayed
 * invitation expiry, and idempotent QR/PDF retries. Those are the three
 * workflows below. They are kept here as the reference implementation of that
 * design; a `workers` service would run them.
 *
 * ## The rule that makes workflow code trustworthy
 *
 * Workflow code must be **deterministic**: on replay after a worker crash,
 * Temporal re-runs it from the event history and compares results. Therefore:
 *
 * - no I/O, no `fetch`, no filesystem, no direct `crypto` — those are activities;
 * - `Date.now()` and `new Date()` are allowed: Temporal pins them to *Workflow
 *   Task time*, so they return the same value during replay;
 * - `Math.random()` is **not** allowed — use `uuid4()` from the workflow API,
 *   which is seeded deterministically;
 * - waiting is `sleep()`, never a real timer.
 *
 * The `@temporalio/workflow` import is the only one allowed in this file. A stray
 * `node:crypto` import here compiles fine and fails at replay time in
 * production, which is the worst possible moment.
 */

import {
  ActivityFailure,
  ApplicationFailure,
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
  sleep,
} from '@temporalio/workflow';
import { SEAL_RECORDED_SIGNAL } from './shared.ts';
import type {
  CredentialsInput,
  CredentialsResult,
  InvitationExpiryInput,
  QuestEvent,
  RecordSealInput,
  RecordSealResult,
  SealSeriesInput,
  SealSeriesResult,
} from './types.ts';

/**
 * Activity proxies with a bounded retry policy.
 *
 * Temporal's default retries forever, which for a saga is a bug: an invitation
 * that never expires because its activity keeps failing is worse than one that
 * expires late. Bounded retries plus an explicit failure force a decision.
 */
const activities = proxyActivities<{
  recordSeal(input: RecordSealInput): Promise<RecordSealResult>;
  completeSeries(input: {
    attemptId: string;
    sealedStages: string[];
    completedAt: string;
  }): Promise<void>;
  expireInvitation(input: InvitationExpiryInput): Promise<void>;
  renderCredentials(input: CredentialsInput): Promise<CredentialsResult>;
  publishEvent(event: QuestEvent): Promise<void>;
}>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    // ~1 minute of retrying: enough for a transient blip, short enough that a
    // real outage surfaces instead of spinning all night.
    maximumAttempts: 6,
    nonRetryableErrorTypes: ['ValidationError'],
  },
});

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Signal payload: a seal happened outside the workflow's own polling.
 *
 * The saga cannot simply sleep until a stage window closes — that would keep the
 * workflow idle for weeks even when the participant sealed a marker seconds
 * after it opened. Instead it waits for *either* the signal or the deadline, and
 * reacts to whichever arrives first.
 */
export const sealRecordedSignal = defineSignal<[string]>(SEAL_RECORDED_SIGNAL);

/**
 * Runs a multi-month seal series.
 *
 * Durable execution earns its keep here: the workflow may live for three months,
 * spanning worker deploys and restarts. Its progress *is* the event history, so a
 * redeploy mid-series resumes rather than losing the participant's stamps.
 *
 * Semantics: each stage opens at `opensAt` and may be sealed for
 * `stageWindowDays` after that. A stage that closes unsealed ends the series —
 * letting a participant stamp a marker long after its event would make the
 * series meaningless.
 */
export async function sealSeriesWorkflow(input: SealSeriesInput): Promise<SealSeriesResult> {
  const sealedStages: string[] = [];

  // Signals can arrive before the workflow reaches the stage they refer to
  // (a participant scans fast, or the scanner's retry lands early), so they are
  // buffered here and drained per stage rather than dropped.
  const pendingSignals: string[] = [];
  setHandler(sealRecordedSignal, (stageId: string) => {
    if (!pendingSignals.includes(stageId) && !sealedStages.includes(stageId)) {
      pendingSignals.push(stageId);
    }
  });

  for (const stage of input.stages) {
    const opensAtMs = Date.parse(stage.opensAt);
    const nowMs = Date.now();

    // Wait until the stage opens. A timer of weeks is normal for this workflow.
    if (opensAtMs > nowMs) {
      // Opening night is exactly when a signal is most likely to arrive, so the
      // wait is interruptible rather than a blind sleep.
      await condition(() => pendingSignals.includes(stage.stageId), opensAtMs - nowMs);
    }

    // The seal may already have arrived by signal; otherwise the first scan
    // records it. Either way the activity is idempotent, so calling it with a
    // signal in hand is safe.
    if (pendingSignals.includes(stage.stageId)) {
      pendingSignals.splice(pendingSignals.indexOf(stage.stageId), 1);
    }

    const sealed = await activities.recordSeal({
      attemptId: input.attemptId,
      stageId: stage.stageId,
      // Activity time must be workflow time, never the activity's own clock.
      sealedAt: new Date(Math.max(opensAtMs, Date.now())).toISOString(),
    });

    if (sealed.created) {
      sealedStages.push(stage.stageId);
    }

    if (!sealedStages.includes(stage.stageId)) {
      /*
       * Not sealed yet. Wait for either a signal or the end of this stage's
       * window — whichever comes first.
       *
       * This is the branch that makes the saga durable and cheap: a participant
       * who scans within seconds advances the workflow immediately, while one
       * who never scans leaves it parked on a timer that survives restarts
       * instead of polling.
       */
      const windowEndsMs = opensAtMs + input.stageWindowDays * DAY_MS;
      const remainingMs = windowEndsMs - Date.now();
      if (remainingMs > 0) {
        await condition(() => pendingSignals.includes(stage.stageId), remainingMs);
      }

      if (pendingSignals.includes(stage.stageId)) {
        pendingSignals.splice(pendingSignals.indexOf(stage.stageId), 1);
        await activities.recordSeal({
          attemptId: input.attemptId,
          stageId: stage.stageId,
          sealedAt: new Date().toISOString(),
        });
        sealedStages.push(stage.stageId);
      } else {
        // The window closed without a seal: the series cannot be completed.
        const missedStages = input.stages
          .map((s) => s.stageId)
          .filter((id) => !sealedStages.includes(id));

        await activities.completeSeries({
          attemptId: input.attemptId,
          sealedStages,
          completedAt: new Date().toISOString(),
        });

        return { status: 'expired', sealedStages, missedStages };
      }
    }
  }

  const completedAt = new Date().toISOString();
  await activities.completeSeries({
    attemptId: input.attemptId,
    sealedStages,
    completedAt,
  });

  return { status: 'completed', sealedStages, completedAt };
}

/**
 * Expires an unused invitation at a fixed instant.
 *
 * This is a timer, not a cron sweep: the workflow starts when the invitation is
 * issued and sleeps until `expiresAt`. A periodic scan would mostly look at rows
 * that are not due yet, and would drift whenever a deploy pauses the scheduler.
 */
export async function invitationExpiryWorkflow(
  input: InvitationExpiryInput
): Promise<{ expired: boolean; expiredAt: string }> {
  const expiresAtMs = Date.parse(input.expiresAt);
  const nowMs = Date.now();

  if (expiresAtMs > nowMs) {
    await sleep(expiresAtMs - nowMs);
  }

  await activities.expireInvitation(input);

  const expiredAt = new Date(expiresAtMs).toISOString();
  await activities.publishEvent({
    subject: 'pstu.events.QuestContext.InvitationExpired',
    type: 'InvitationExpired',
    attemptId: '',
    participantId: '',
    payload: { invitationToken: input.invitationToken },
    occurredAt: expiredAt,
  });

  return { expired: true, expiredAt };
}

/**
 * Renders the QR code and PDF certificate.
 *
 * The property that matters is idempotency: `outputKey` is deterministic for an
 * attempt, so a retry overwrites the same artifact instead of producing a second
 * one. That is what makes bounded retries safe here.
 */
export async function generateCredentialsWorkflow(
  input: CredentialsInput
): Promise<CredentialsResult> {
  try {
    const result = await activities.renderCredentials(input);

    await activities.publishEvent({
      subject: 'pstu.events.QuestContext.CredentialsIssued',
      type: 'CredentialsIssued',
      attemptId: input.attemptId,
      participantId: input.outputKey,
      payload: { artifacts: result.artifacts.map((a) => a.key) },
      occurredAt: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    // Unwrap the activity failure so the caller sees a stable, typed reason
    // instead of a serialised Temporal envelope.
    if (error instanceof ActivityFailure && error.cause instanceof ApplicationFailure) {
      const cause = error.cause;
      throw new ApplicationFailure(
        `Не удалось подготовить материалы: ${cause.message}`,
        'CredentialsFailed',
        true,
        [cause.details]
      );
    }
    throw error;
  }
}
