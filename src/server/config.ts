/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Configuration resolution.
 *
 * Every value the server reads is resolved here, once, into a typed object. The
 * pattern is ported from the PSTU server, where `process.env.X` scattered across
 * handlers made it impossible to answer "what does this deployment need?" — and
 * `scripts/check-env-docs.mjs` exists precisely to keep this list and
 * `.env.example` in sync.
 */

import path from 'node:path';

export interface ServerConfig {
  port: number;
  host: string;
  isProduction: boolean;
  workspaceDir: string;
  distDir: string;
  version: string;
  hasGitToken: boolean;
  requestLogger: boolean;
}

function readPort(raw: string | undefined, fallback = 3000): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

export function loadConfig(workspaceDir: string): ServerConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    port: readPort(process.env.PORT),
    // Loopback by default: binding 0.0.0.0 by default exposes the docs portal
    // (and its git-write endpoint) to every host on the LAN. Containers set
    // HOST=0.0.0.0 explicitly.
    host: process.env.HOST || '127.0.0.1',
    isProduction,
    workspaceDir,
    distDir: path.resolve(workspaceDir, 'dist'),
    version: process.env.APP_VERSION || '1.0.0',
    hasGitToken: Boolean(process.env.GITHUB_TOKEN?.trim()),
    // Logging each request is useful locally and noisy in production, where the
    // platform already collects access logs.
    requestLogger: process.env.REQUEST_LOG === 'true' || !isProduction,
  };
}
