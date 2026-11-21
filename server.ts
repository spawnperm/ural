/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Boot script.
 *
 * Everything below is deliberately thin: resolve configuration, build the app,
 * mount the frontend, listen, wire shutdown. All logic lives in `src/server/*`
 * so it can be tested without spawning a process — the original `server.ts`
 * mixed git plumbing, HTTP handling and static serving in one function and
 * could only be exercised by hitting a real port.
 *
 * The frontend mount lives in `src/server/frontend.ts` for the same reason: the
 * E2E suite uses the same function, so it tests the path production runs.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './src/server/app.ts';
import { createGitService } from './src/server/gitService.ts';
import { loadConfig } from './src/server/config.ts';
import { createShutdownHandler } from './src/server/shutdown.ts';
import { mountFrontend } from './src/server/frontend.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = __dirname;

async function startServer(): Promise<void> {
  const config = loadConfig(WORKSPACE_DIR);
  const git = createGitService(WORKSPACE_DIR);

  const app = createApp({
    git,
    version: config.version,
    isProduction: config.isProduction,
    requestLogger: config.requestLogger,
  });

  const mounted = await mountFrontend(app, {
    distDir: config.distDir,
    // Only in development: a production image has no Vite installed.
    useViteDevServer: !config.isProduction,
  });

  if (!mounted) {
    console.warn(
      `[ural] No frontend mounted: build is missing at ${config.distDir} and the dev server is unavailable. ` +
        'Run "pnpm run build" or start with NODE_ENV unset.'
    );
  }

  const server = app.listen(config.port, config.host, () => {
    console.log(
      `[ural] listening on http://${config.host}:${config.port} ` +
        `(mode=${config.isProduction ? 'production' : 'development'}, gitToken=${config.hasGitToken ? 'set' : 'absent'})`
    );
  });

  const shutdown = createShutdownHandler(server, { label: 'ural' });
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error('[ural] Failed to start server:', error);
  process.exit(1);
});
