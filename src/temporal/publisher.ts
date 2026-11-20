/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Event publisher.
 *
 * The documentation places these events on NATS JetStream
 * (`pstu.events.QuestContext.*`). This implementation logs them instead of
 * connecting to a broker: wiring NATS is a deployment decision, and the saga
 * should not depend on a broker being reachable to be testable.
 *
 * `createConsolePublisher` and `createCapturingPublisher` share one signature, so
 * swapping in a real NATS publisher is a one-line change in the worker and the
 * tests keep working.
 */

import type { QuestEvent } from './types.ts';

export type EventPublisher = (event: QuestEvent) => Promise<void>;

export function createConsolePublisher(): EventPublisher {
  return async (event) => {
    console.log(`[temporal] event ${event.subject} (${event.type})`, {
      attemptId: event.attemptId,
      occurredAt: event.occurredAt,
    });
  };
}

/** Collects events in memory. Used by tests and by dry runs. */
export function createCapturingPublisher(): EventPublisher & { events: QuestEvent[] } {
  const events: QuestEvent[] = [];
  const publish = async (event: QuestEvent): Promise<void> => {
    events.push(event);
  };
  return Object.assign(publish, { events });
}
