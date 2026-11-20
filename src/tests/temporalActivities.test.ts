/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity tests.
 *
 * Activities are where retries actually land, so idempotency is not a nice-to-
 * have here — it is the property that makes Temporal's retry policy safe. Each
 * test below calls an activity twice on purpose and asserts the second call
 * changes nothing.
 *
 * These run without a Temporal server: activities are plain async functions once
 * their dependencies are injected, which is why `createActivities` takes them as
 * arguments.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createActivities,
  createDigestRenderer,
  createInMemoryStore,
  ValidationError,
} from '../temporal/activities.ts';
import { createCapturingPublisher } from '../temporal/publisher.ts';

function buildHarness() {
  const store = createInMemoryStore();
  const publish = createCapturingPublisher();
  const activities = createActivities({
    store,
    publish,
    render: createDigestRenderer(store),
  });
  return { store, publish, activities };
}

describe('recordSeal', () => {
  it('records a seal and reports it as created', async () => {
    const { activities } = buildHarness();
    const result = await activities.recordSeal({
      attemptId: 'attempt-1',
      stageId: 'stage-1',
      sealedAt: '2026-11-20T12:00:00Z',
    });

    assert.equal(result.created, true);
    assert.deepEqual(result.sealedStages, ['stage-1']);
  });

  it('is idempotent: a retried seal is not duplicated', async () => {
    // This is the property that makes Temporal's at-least-once delivery safe.
    const { activities } = buildHarness();
    const input = {
      attemptId: 'attempt-1',
      stageId: 'stage-1',
      sealedAt: '2026-11-20T12:00:00Z',
    };

    const first = await activities.recordSeal(input);
    const second = await activities.recordSeal(input);

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.deepEqual(second.sealedStages, ['stage-1']);
  });

  it('accumulates stages in order', async () => {
    const { activities } = buildHarness();
    await activities.recordSeal({
      attemptId: 'attempt-1',
      stageId: 'stage-1',
      sealedAt: '2026-11-20T12:00:00Z',
    });
    const result = await activities.recordSeal({
      attemptId: 'attempt-1',
      stageId: 'stage-2',
      sealedAt: '2026-11-20T13:00:00Z',
    });

    assert.deepEqual(result.sealedStages, ['stage-1', 'stage-2']);
  });

  it('keeps attempts isolated', async () => {
    const { activities } = buildHarness();
    await activities.recordSeal({
      attemptId: 'a',
      stageId: 'stage-1',
      sealedAt: '2026-11-20T12:00:00Z',
    });
    const other = await activities.recordSeal({
      attemptId: 'b',
      stageId: 'stage-1',
      sealedAt: '2026-11-20T12:00:00Z',
    });

    assert.equal(other.created, true);
    assert.deepEqual(other.sealedStages, ['stage-1']);
  });

  it('rejects missing identifiers as non-retryable', async () => {
    const { activities } = buildHarness();
    await assert.rejects(
      () => activities.recordSeal({ attemptId: '', stageId: 's', sealedAt: '2026-11-20T12:00:00Z' }),
      ValidationError
    );
    await assert.rejects(
      () => activities.recordSeal({ attemptId: 'a', stageId: '', sealedAt: '2026-11-20T12:00:00Z' }),
      ValidationError
    );
  });

  it('rejects an unparsable timestamp', async () => {
    const { activities } = buildHarness();
    await assert.rejects(
      () => activities.recordSeal({ attemptId: 'a', stageId: 's', sealedAt: 'not-a-date' }),
      ValidationError
    );
  });
});

describe('expireInvitation', () => {
  it('is idempotent: expiring twice is not an error', async () => {
    const { activities } = buildHarness();
    const input = { invitationToken: 'inv-1', expiresAt: '2026-11-20T12:00:00Z' };
    await activities.expireInvitation(input);
    await activities.expireInvitation(input); // must not throw
  });

  it('rejects a missing token', async () => {
    const { activities } = buildHarness();
    await assert.rejects(
      () => activities.expireInvitation({ invitationToken: '', expiresAt: '2026-11-20T12:00:00Z' }),
      ValidationError
    );
  });
});

describe('renderCredentials', () => {
  it('produces a QR and a PDF artifact', async () => {
    const { activities } = buildHarness();
    const result = await activities.renderCredentials({
      attemptId: 'attempt-1',
      participantName: 'Тест',
      outputKey: 'attempts/attempt-1',
      achievements: ['a'],
    });

    assert.equal(result.artifacts.length, 2);
    assert.deepEqual(
      result.artifacts.map((a) => a.kind).sort(),
      ['pdf', 'qr']
    );
  });

  it('is deterministic: the same input yields the same digest', async () => {
    const harness = buildHarness();
    const input = {
      attemptId: 'attempt-1',
      participantName: 'Тест',
      outputKey: 'attempts/attempt-1',
      achievements: ['a', 'b'],
    };

    const first = await harness.activities.renderCredentials(input);
    const second = await harness.activities.renderCredentials(input);

    assert.deepEqual(
      first.artifacts.map((a) => a.sha256),
      second.artifacts.map((a) => a.sha256),
      'a retry must overwrite the same artifact, not produce a different one'
    );
  });

  it('different achievements yield a different digest', async () => {
    const harness = buildHarness();
    const base = {
      attemptId: 'attempt-1',
      participantName: 'Тест',
      outputKey: 'attempts/attempt-1',
    };

    const a = await harness.activities.renderCredentials({ ...base, achievements: ['a'] });
    const b = await harness.activities.renderCredentials({ ...base, achievements: ['b'] });

    assert.notEqual(a.artifacts[0]?.sha256, b.artifacts[0]?.sha256);
  });

  it('rejects missing attemptId or outputKey', async () => {
    const { activities } = buildHarness();
    await assert.rejects(
      () =>
        activities.renderCredentials({
          attemptId: '',
          participantName: 'x',
          outputKey: 'k',
          achievements: [],
        }),
      ValidationError
    );
    await assert.rejects(
      () =>
        activities.renderCredentials({
          attemptId: 'a',
          participantName: 'x',
          outputKey: '',
          achievements: [],
        }),
      ValidationError
    );
  });
});

describe('publishEvent', () => {
  it('publishes the event through the injected publisher', async () => {
    const { activities, publish } = buildHarness();
    await activities.publishEvent({
      subject: 'pstu.events.QuestContext.Test',
      type: 'Test',
      attemptId: 'a',
      participantId: 'p',
      payload: { ok: true },
      occurredAt: '2026-11-20T12:00:00Z',
    });

    assert.equal(publish.events.length, 1);
    assert.equal(publish.events[0]?.subject, 'pstu.events.QuestContext.Test');
  });

  it('rejects an event without subject or type', async () => {
    const { activities } = buildHarness();
    await assert.rejects(
      () =>
        activities.publishEvent({
          subject: '',
          type: 'Test',
          attemptId: '',
          participantId: '',
          payload: {},
          occurredAt: '2026-11-20T12:00:00Z',
        }),
      ValidationError
    );
  });
});

describe('completeSeries', () => {
  it('rejects a missing attemptId', async () => {
    const { activities } = buildHarness();
    await assert.rejects(
      () => activities.completeSeries({ attemptId: '', sealedStages: [], completedAt: '' }),
      ValidationError
    );
  });
});

describe('capturing publisher', () => {
  it('collects events in order', async () => {
    const publish = createCapturingPublisher();
    await publish({
      subject: 's1',
      type: 't',
      attemptId: '',
      participantId: '',
      payload: {},
      occurredAt: '',
    });
    await publish({
      subject: 's2',
      type: 't',
      attemptId: '',
      participantId: '',
      payload: {},
      occurredAt: '',
    });

    assert.deepEqual(
      publish.events.map((e) => e.subject),
      ['s1', 's2']
    );
  });
});
