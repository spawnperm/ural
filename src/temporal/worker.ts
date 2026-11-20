/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Temporal worker.
 *
 * The worker is the process that actually executes workflows and activities. It
 * polls a task queue and must be told, explicitly:
 *
 * - `workflowsPath` — where the workflow bundle is built from. Temporal
 *   *compiles* this file separately from the rest of the app, because workflow
 *   code runs in a deterministic sandbox.
 * - `activities` — the side-effecting implementations.
 *
 * The distinction is enforced by the SDK: anything imported by the workflows file
 * must be replay-safe, so activities cannot leak into it. That is why the two
 * live in different modules here rather than one convenient file.
 *
 * Run:  pnpm run temporal:worker
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Worker, NativeConnection } from '@temporalio/worker';
import {
  createActivities,
  createDigestRenderer,
  createInMemoryStore,
} from './activities.ts';
import { createConsolePublisher } from './publisher.ts';
import { TASK_QUEUE } from './shared.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface WorkerOptions {
  address: string;
  namespace: string;
  taskQueue: string;
}

export function resolveWorkerOptions(): WorkerOptions {
  return {
    // `localhost:7233` is Temporal's default gRPC port.
    address: process.env.TEMPORAL_ADDRESS || '127.0.0.1:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || TASK_QUEUE,
  };
}

export async function runWorker(options = resolveWorkerOptions()): Promise<void> {
  const connection = await NativeConnection.connect({ address: options.address });

  const store = createInMemoryStore();
  const publish = createConsolePublisher();
  const activities = createActivities({
    store,
    publish,
    render: createDigestRenderer(store),
  });

  const worker = await Worker.create({
    connection,
    namespace: options.namespace,
    taskQueue: options.taskQueue,
    // Temporal compiles this entry point itself; it must import only
    // `@temporalio/workflow` and the type modules.
    workflowsPath: path.join(__dirname, 'workflows.ts'),
    activities,
  });

  console.log(
    `[temporal] worker started (address=${options.address}, namespace=${options.namespace}, queue=${options.taskQueue})`
  );

  const shutdown = (signal: string): void => {
    console.log(`[temporal] ${signal} received, stopping worker...`);
    worker.shutdown();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // `run` resolves once the worker has stopped, so awaiting it keeps the process
  // alive for exactly as long as the worker should be.
  await worker.run();
  await connection.close();
}

// Only start when executed directly, so tests can import this module safely.
const invokedDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  runWorker().catch((error: unknown) => {
    console.error('[temporal] worker failed:', error);
    process.exit(1);
  });
}
