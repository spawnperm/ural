/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Express application factory.
 *
 * `server.ts` is reduced to a boot script: it reads configuration, calls this
 * factory and starts listening. Everything testable lives here, so a test can
 * build the app on an ephemeral port without spawning a child process.
 *
 * Ported from the PSTU server, whose middleware order is the part worth
 * keeping: security headers and request IDs come first (so even a rejected
 * request carries them), then body parsing, then routes, then a catch-all
 * 404 and one terminal error handler that speaks RFC 7807.
 */

import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { type GitService } from './gitService.ts';
import { createGitRouter } from './gitRouter.ts';
import { createRequestIdMiddleware } from './requestId.ts';
import { createSecurityHeadersMiddleware } from './securityHeaders.ts';
import { sendProblem } from './problemDetails.ts';
import { type HealthResponse } from '../shared/apiContract.ts';

export interface AppOptions {
  git: GitService;
  version: string;
  isProduction: boolean;
  requestLogger?: boolean;
}

export function createApp(options: AppOptions): Express {
  const { git, version, isProduction, requestLogger = !isProduction } = options;
  const app = express();

  // Behind a reverse proxy the left-most X-Forwarded-For entry is the client.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(createSecurityHeadersMiddleware());
  app.use(createRequestIdMiddleware());

  if (requestLogger) {
    app.use((req, res, next) => {
      const startedAt = process.hrtime.bigint();
      res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const requestId = (req as Request & { requestId?: string }).requestId ?? '-';
        console.log(
          `[ural] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms id=${requestId}`
        );
      });
      next();
    });
  }

  // A documentation portal has no upload surface, so 100 KB is already generous.
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    const health: HealthResponse = {
      status: 'ok',
      service: 'ural-docs-portal',
      version,
      uptimeSeconds: Math.round(process.uptime()),
      branch: process.env.GIT_BRANCH || 'main',
      commitSha: process.env.GIT_COMMIT_SHA || 'unknown',
      timestamp: new Date().toISOString(),
    };
    res.json(health);
  });

  app.use('/api/git', createGitRouter(git));

  // Any other /api path is a 404 in problem+json, not the SPA shell. Serving
  // index.html for an unknown API route is the classic way to turn a typo in a
  // fetch URL into a confusing JSON parse error in the browser.
  //
  // `app.use('/api', …)` rather than `app.all('/api/*', …)`: the string form
  // differs between Express 4 (`*`) and Express 5 (`{*splat}`), and this project
  // declares Express 4. A mounted handler is identical on both and also covers
  // the bare `/api` path.
  app.use('/api', (_req, res) => {
    sendProblem(res, 404, 'API endpoint not found');
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const errObj = err as { type?: string; status?: number; message?: string };

    if (err instanceof SyntaxError || errObj?.type === 'entity.parse.failed') {
      sendProblem(res, 400, 'Некорректный JSON в теле запроса.');
      return;
    }
    if (errObj?.type === 'entity.too.large') {
      sendProblem(res, 413, 'Тело запроса слишком велико.');
      return;
    }

    const status =
      typeof errObj?.status === 'number' && errObj.status >= 400 ? errObj.status : 500;
    const message = err instanceof Error ? err.message : 'Непредвиденная ошибка сервера.';

    if (status >= 500) {
      console.error(`[ural] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
    }

    // Never leak internals of a 500 in production.
    sendProblem(res, status, status >= 500 && isProduction ? 'Internal server error' : message);
  });

  return app;
}
