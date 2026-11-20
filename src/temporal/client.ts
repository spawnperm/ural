/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Temporal client.
 *
 * Starts workflows and reads their state. This is the only module the portal's
 * HTTP layer would import: the server never runs workflow code, it only asks the
 * Temporal server to do so.
 *
 * Every start path takes an **idempotency key**. That is the single most
 * important property of the client: a user clicking "seal" twice, or a retrying
 * frontend, must not open a second saga. Temporal's `workflowId` gives exactly
 * that — starting an existing id is rejected (or, with
 * `WORKFLOW_ID_REUSE_POLICY.USE_EXISTING`, attached to the running one).
 */

import { Client, Connection, WorkflowIdReusePolicy } from '@temporalio/client';
import { TASK_QUEUE } from './shared.ts';
import type {
  CredentialsInput,
  CredentialsResult,
  InvitationExpiryInput,
  SealSeriesInput,
  SealSeriesResult,
} from './types.ts';

export interface TemporalClientOptions {
  address: string;
  namespace: string;
  taskQueue: string;
}

export function resolveClientOptions(): TemporalClientOptions {
  return {
    address: process.env.TEMPORAL_ADDRESS || '127.0.0.1:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || TASK_QUEUE,
  };
}

/**
 * Deterministic workflow id for a seal series.
 *
 * Derived from the attempt, not from the clock or a random value: that is what
 * makes a duplicate start idempotent.
 */
export function sealSeriesWorkflowId(attemptId: string): string {
  return `seal-series/${attemptId}`;
}

export function invitationExpiryWorkflowId(token: string): string {
  return `invitation-expiry/${token}`;
}

export function credentialsWorkflowId(attemptId: string): string {
  return `credentials/${attemptId}`;
}

export interface QuestOrchestrator {
  startSealSeries(input: SealSeriesInput): Promise<{ workflowId: string; created: boolean }>;
  startInvitationExpiry(
    input: InvitationExpiryInput
  ): Promise<{ workflowId: string; created: boolean }>;
  startCredentials(
    input: CredentialsInput
  ): Promise<{ workflowId: string; created: boolean }>;
  waitForCredentials(workflowId: string): Promise<CredentialsResult>;
  waitForSealSeries(workflowId: string): Promise<SealSeriesResult>;
  close(): Promise<void>;
}

export async function createOrchestrator(
  options = resolveClientOptions()
): Promise<QuestOrchestrator> {
  const connection = await Connection.connect({ address: options.address });
  const client = new Client({ connection, namespace: options.namespace });

  return {
    async startSealSeries(input) {
      const workflowId = sealSeriesWorkflowId(input.attemptId);
      const handle = await client.workflow.start('sealSeriesWorkflow', {
        workflowId,
        taskQueue: options.taskQueue,
        args: [input],
        // Reusing an id attaches to the existing run instead of failing, so the
        // HTTP handler can be retried safely.
        workflowIdReusePolicy: WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
      });
      return { workflowId: handle.workflowId, created: true };
    },

    async startInvitationExpiry(input) {
      const workflowId = invitationExpiryWorkflowId(input.invitationToken);
      const handle = await client.workflow.start('invitationExpiryWorkflow', {
        workflowId,
        taskQueue: options.taskQueue,
        args: [input],
        workflowIdReusePolicy:
          WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
      });
      return { workflowId: handle.workflowId, created: true };
    },

    async startCredentials(input) {
      const workflowId = credentialsWorkflowId(input.attemptId);
      const handle = await client.workflow.start('generateCredentialsWorkflow', {
        workflowId,
        taskQueue: options.taskQueue,
        args: [input],
        workflowIdReusePolicy:
          WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY,
      });
      return { workflowId: handle.workflowId, created: true };
    },

    async waitForCredentials(workflowId) {
      // `result()` is typed from the handle's declared return type, so no type
      // argument is passed; the generic would be ignored anyway.
      const value = await client.workflow
        .getHandle(workflowId)
        .result();
      return value as CredentialsResult;
    },

    async waitForSealSeries(workflowId) {
      const value = await client.workflow
        .getHandle(workflowId)
        .result();
      return value as SealSeriesResult;
    },

    async close() {
      await connection.close();
    },
  };
}
