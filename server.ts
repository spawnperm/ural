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
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type Express } from 'express';
import { createApp } from './src/server/app.ts';
import { createGitService } from './src/server/gitService.ts';
import { loadConfig } from './src/server/config.ts';
import { createShutdownHandler } from './src/server/shutdown.ts';
import { cacheControlFor } from './src/server/staticCache.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = __dirname;

/**
 * Mounts the frontend: the Vite dev middleware outside production, the built
 * bundle inside it. Returns the app with the SPA fallback attached.
 */
async function mountFrontend(app: Express, isProduction: boolean, distDir: string): Promise<void> {
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      return;
    } catch (error) {
      // Vite is a dev dependency and is absent from a production install; if it
      // is also missing from a dev run, fall through to the static bundle rather
      // than crashing with an unrelated module error.
      console.warn(
        `[ural] Vite dev middleware unavailable (${
          error instanceof Error ? error.message : String(error)
        }); serving the prebuilt bundle instead.`
      );
    }
  }

  if (!fs.existsSync(distDir)) {
    console.warn(
      `[ural] No build found at ${distDir}. Run "pnpm run build" or start in development mode.`
    );
    return;
  }

  app.use(
    express.static(distDir, {
      // Hashed assets are immutable; index.html must always be revalidated so a
      // deploy is visible immediately. The rule lives in `staticCache.ts` with
      // its own tests: a hash pattern that stops matching degrades silently.
      setHeaders: (res, filePath) => {
        const cacheControl = cacheControlFor(filePath);
        if (cacheControl) {
          res.setHeader('Cache-Control', cacheControl);
        }
      },
    })
  );
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

async function startServer(): Promise<void> {
  const config = loadConfig(WORKSPACE_DIR);
  const git = createGitService(WORKSPACE_DIR);

  const app = createApp({
    git,
    version: config.version,
    isProduction: config.isProduction,
    requestLogger: config.requestLogger,
  });

  await mountFrontend(app, config.isProduction, config.distDir);

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
