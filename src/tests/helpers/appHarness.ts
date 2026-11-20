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
import { createApp } from '../../server/app.ts';
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
  close: () => Promise<void>;
}

/** Starts the app on an ephemeral port and returns its base URL. */
export async function startTestServer(options: StubGitOptions = {}): Promise<TestServer> {
  const app = createApp({
    git: createStubGit(options),
    version: 'test',
    isProduction: false,
    requestLogger: false,
  });

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
