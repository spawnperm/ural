/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Graceful shutdown.
 *
 * Ported from the PSTU server, where a container restart during a request was
 * the single most common source of truncated JSON in the UI. The handler is
 * idempotent (SIGTERM followed by SIGINT must not run shutdown twice), gives
 * in-flight requests a bounded grace period, and always exits — a process that
 * hangs on shutdown is worse than one that dies, because the orchestrator
 * eventually SIGKILLs it anyway and loses the chance to finish cleanly.
 */

import type { Server } from 'node:http';

export interface ShutdownOptions {
  timeoutMs?: number;
  exit?: (code: number) => void;
  onShutdown?: () => void | Promise<void>;
  label?: string;
}

export function createShutdownHandler(
  server: Pick<Server, 'close' | 'closeAllConnections'>,
  options: ShutdownOptions = {}
): (signal: string) => void {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const label = options.label ?? 'ural';
  let started = false;

  return (signal: string): void => {
    if (started) return;
    started = true;
    console.log(`[${label}] Received ${signal}, shutting down gracefully...`);

    try {
      const result = options.onShutdown?.();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => undefined);
      }
    } catch {
      // Shutdown must proceed even if cleanup throws.
    }

    server.close(() => exit(0));

    // Keep-alive connections would otherwise hold `close()` open until they
    // idle out; drop them so the grace period bounds actual work, not sockets.
    const forceClose = setTimeout(() => {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
    }, Math.max(1000, timeoutMs - 2000));
    forceClose.unref();

    const giveUp = setTimeout(() => exit(1), timeoutMs);
    giveUp.unref();
  };
}
