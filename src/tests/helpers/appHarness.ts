/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test harness: builds the Express app against a stub git service.
 *
 * The app factory takes the git service as an argument precisely so a test can
 * substitute one — the portal's tests must never run `git push` against the real
 * repository.
 */

import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import path from 'node:path';
import { createApp } from '../../server/app.ts';
import { mountFrontend } from '../../server/frontend.ts';
import type { GitService, GitStatus } from '../../server/gitService.ts';
import type { CommitPushResult } from '../../server/gitService.ts';

export interface StubGitOptions {
  status?: Partial<GitStatus>;
  commitResult?: Partial<CommitPushResult>;
  statusError?: Error;
  commitError?: Error;
}

export const DEFAULT_STATUS: GitStatus = {
  branch: 'main',
  remoteUrl: 'https://github.com/spawnperm/ural.git',
  changes: [],
  commits: [{ hash: 'd15a58a', message: 'docs: test', date: '2026-11-20T11:52:39Z' }],
  hasToken: false,
};

export function createStubGit(options: StubGitOptions = {}): GitService {
  const status: GitStatus = { ...DEFAULT_STATUS, ...options.status };
  return {
    runGit: async () => ({ stdout: '', stderr: '' }),
    readStatus: async () => {
      if (options.statusError) throw options.statusError;
      return status;
    },
    commitAndPush: async () => {
      if (options.commitError) throw options.commitError;
      return {
        committed: true,
        pushed: true,
        branch: status.branch,
        commit: status.commits[0] ?? null,
        ...options.commitResult,
      };
    },
  } as GitService;
}

export interface TestServer {
  baseUrl: string;
  /** Bearer token the write endpoints expect; `null` when auth is unconfigured. */
  writeToken: string | null;
  close: () => Promise<void>;
}

/** Default secret used by tests that exercise the write path. */
export const TEST_WRITE_TOKEN = 'test-write-token-0123456789';

/**
 * Starts the app on an ephemeral port and returns its base URL.
 *
 * The write secret is set by default: almost every contract test exercises a
 * mutating endpoint, and a suite where each test has to remember to pass a token
 * would either be noisy or silently skip the auth branch. Pass
 * `writeToken: null` to test the unconfigured (503) path.
 *
 * `serveFrontend` mounts the built bundle so the E2E suite exercises the real
 * page. It is off by default: contract tests only need the API, and loading the
 * SPA for each of them would slow the suite for no benefit.
 */
export async function startTestServer(
  options: StubGitOptions & { writeToken?: string | null; serveFrontend?: boolean } = {}
): Promise<TestServer> {
  const writeToken = options.writeToken === undefined ? TEST_WRITE_TOKEN : options.writeToken;

  // Set for the duration of the request: the middleware reads the environment per
  // call, so this exercises the same path production uses.
  const savedToken = process.env.WRITE_API_TOKEN;
  if (writeToken) {
    process.env.WRITE_API_TOKEN = writeToken;
  } else {
    delete process.env.WRITE_API_TOKEN;
  }

  const app = createApp({
    git: createStubGit(options),
    version: 'test',
    isProduction: false,
    requestLogger: false,
  });

  if (options.serveFrontend) {
    const distDir = path.resolve(process.cwd(), 'dist');
    const mounted = await mountFrontend(app, { distDir });
    if (!mounted) {
      throw new Error(
        `E2E требует собранный фронтенд в ${distDir}. Запустите "pnpm run build" перед тестами.`
      );
    }
  }

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    writeToken,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (savedToken === undefined) delete process.env.WRITE_API_TOKEN;
          else process.env.WRITE_API_TOKEN = savedToken;
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

/** Headers a write request needs. */
export function writeHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
