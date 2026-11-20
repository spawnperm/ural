/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * End-to-end smoke test against a real Temporal server.
 *
 * This is not a unit test: it starts actual workflows, waits for them, and reads
 * the results back through the client. Unit tests with a mocked SDK prove the
 * code compiles; only this proves the deterministic sandbox accepts the workflow
 * and that the activity contracts line up.
 *
 * Run:  pnpm run temporal:smoke
 * Requires a Temporal server on TEMPORAL_ADDRESS (default 127.0.0.1:7233) and a
 * running worker on the same task queue.
 */

import { createOrchestrator, credentialsWorkflowId } from '../src/temporal/client.ts';
import type { SealSeriesInput } from '../src/temporal/types.ts';

function check(name: string, condition: boolean, detail = ''): void {
  const mark = condition ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
  if (!condition) {
    process.exitCode = 1;
  }
}

function uniqueAttempt(prefix: string): string {
  // The suffix makes repeated smoke runs independent; it is *not* used inside
  // workflow code, where a random value would break determinism.
  return `${prefix}-${Date.now().toString(36)}`;
}

async function main(): Promise<void> {
  const orchestrator = await createOrchestrator();
  console.log('Temporal smoke test\n');

  try {
    // --- 1. Credentials: short workflow, completes immediately ---------------
    console.log('1. generateCredentialsWorkflow');
    const attemptId = uniqueAttempt('smoke-creds');
    const started = await orchestrator.startCredentials({
      attemptId,
      participantName: 'Тест Тестович',
      outputKey: `attempts/${attemptId}`,
      achievements: ['perm-1684-velikaya-01', 'perm-1684-velikaya-02'],
    });
    check('workflow started', started.created, started.workflowId);

    const creds = await orchestrator.waitForCredentials(credentialsWorkflowId(attemptId));
    check('produced both artifacts', creds.artifacts.length === 2, creds.artifacts.map((a) => a.kind).join('+'));
    check(
      'artifact keys are deterministic',
      creds.artifacts.every((a) => a.key.startsWith(`attempts/${attemptId}/`)),
      creds.artifacts[0]?.key ?? ''
    );
    check(
      'digest is sha256 hex',
      creds.artifacts.every((a) => /^[0-9a-f]{64}$/.test(a.sha256))
    );

    // --- 2. Idempotency: same attempt id must not create a second run --------
    console.log('\n2. Idempotency of workflow start');
    let secondRejected = false;
    try {
      await orchestrator.startCredentials({
        attemptId,
        participantName: 'Тест Тестович',
        outputKey: `attempts/${attemptId}`,
        achievements: [],
      });
    } catch {
      secondRejected = true;
    }
    check(
      'duplicate start is refused or attached, never duplicated',
      secondRejected,
      secondRejected ? 'rejected by workflow id policy' : 'attached to existing run'
    );

    // --- 3. Invitation expiry: already-past timestamp completes at once ------
    console.log('\n3. invitationExpiryWorkflow');
    const token = `inv-smoke-${Date.now().toString(36)}`;
    const pastExpiry = new Date(Date.now() - 60_000).toISOString();
    await orchestrator.startInvitationExpiry({
      invitationToken: token,
      expiresAt: pastExpiry,
    });
    check('workflow accepted a past expiry', true, token);

    // --- 4. Seal series: past stages so the saga runs without real waiting ---
    console.log('\n4. sealSeriesWorkflow');
    const seriesAttempt = uniqueAttempt('smoke-series');
    const openedMinutesAgo = (minutes: number): string =>
      new Date(Date.now() - minutes * 60_000).toISOString();

    const seriesInput: SealSeriesInput = {
      attemptId: seriesAttempt,
      participantId: 'participant-smoke',
      stages: [
        { stageId: 'perm-1684-velikaya-01', title: 'Пермь Великая', opensAt: openedMinutesAgo(30) },
        { stageId: 'perm-1684-velikaya-02', title: 'Чердынь', opensAt: openedMinutesAgo(20) },
      ],
      // 10 days: the stages opened minutes ago, so their windows are still open
      // and each seal is recorded before the next.
      stageWindowDays: 10,
    };

    const seriesStarted = await orchestrator.startSealSeries(seriesInput);
    console.log(`     started ${seriesStarted.workflowId}`);

    const series = await orchestrator.waitForSealSeries(seriesStarted.workflowId);
    check('series completed', series.status === 'completed', series.status);
    check(
      'both stages sealed',
      series.status === 'completed' && series.sealedStages.length === 2,
      series.status === 'completed' ? series.sealedStages.join(', ') : ''
    );
  } finally {
    await orchestrator.close();
  }

  console.log(process.exitCode === 1 ? '\nFAILED' : '\nALL CHECKS PASSED');
}

main().catch((error: unknown) => {
  console.error('smoke test crashed:', error);
  process.exit(1);
});
