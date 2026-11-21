/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Serves the built frontend.
 *
 * ## Why this is a module and not a block inside `server.ts`
 *
 * The end-to-end tests need a server that serves the real page. They were failing
 * with `locator('h1') not found` because `createApp()` builds the API only — the
 * frontend was mounted by `server.ts`, which tests do not run. The E2E suite was
 * therefore testing an empty shell and its assertions could not have passed.
 *
 * Extracting the mount makes it reusable by both the boot script and the test
 * harness, so what the tests exercise is the same code path as production.
 */

import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import { cacheControlFor } from './staticCache.ts';

export interface FrontendOptions {
  /** Directory holding the built bundle. */
  distDir: string;
  /** When true, mount Vite in middleware mode instead of serving files. */
  useViteDevServer?: boolean;
}

/**
 * Mounts the frontend on an existing Express app.
 *
 * Returns `true` when something was mounted. `false` means neither the dev server
 * nor a build was available, which the caller should surface — an app that
 * silently serves only API routes looks "up" and answers 404 to every page.
 */
export async function mountFrontend(app: Express, options: FrontendOptions): Promise<boolean> {
  if (options.useViteDevServer) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      return true;
    } catch (error) {
      // Vite is a dev dependency; a production install does not have it. Fall
      // through to the static bundle rather than failing with a module error.
      console.warn(
        `[ural] Vite dev middleware unavailable (${
          error instanceof Error ? error.message : String(error)
        }); serving the prebuilt bundle instead.`
      );
    }
  }

  const indexPath = path.join(options.distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return false;
  }

  app.use(
    express.static(options.distDir, {
      setHeaders: (res, filePath) => {
        const cacheControl = cacheControlFor(filePath);
        if (cacheControl) {
          res.setHeader('Cache-Control', cacheControl);
        }
      },
    })
  );

  // SPA fallback: every non-API path is a client route.
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(indexPath);
  });

  return true;
}
