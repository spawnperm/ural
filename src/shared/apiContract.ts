/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared API contract.
 *
 * Both the Express handlers and the React panel import these types, so a change
 * to a response shape breaks the build instead of silently rendering
 * `undefined` in the UI. This is the one piece of the PSTU codebase worth
 * copying wholesale: an API contract that exists only in documentation drifts
 * within a week.
 */

export interface GitFileChangeDto {
  status: string;
  file: string;
}

export interface GitCommitDto {
  hash: string;
  message: string;
  date: string;
}

export interface GitStatusResponse {
  branch: string;
  remoteUrl: string;
  changes: GitFileChangeDto[];
  commits: GitCommitDto[];
  hasToken: boolean;
}

export interface CommitPushResponse {
  ok: true;
  committed: boolean;
  pushed: boolean;
  branch: string;
  commit: GitCommitDto | null;
}

export interface ProblemResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  error: string;
  details?: unknown;
  requestId?: string;
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  uptimeSeconds: number;
  branch: string;
  commitSha: string;
  timestamp: string;
}

/** Route table, kept next to the types so the two cannot drift apart. */
export const API_ROUTES = {
  health: '/api/health',
  gitStatus: '/api/git/status',
  gitCommitPush: '/api/git/commit-push',
} as const;
