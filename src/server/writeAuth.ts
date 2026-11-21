/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authentication for the write endpoint.
 *
 * ## The threat this addresses
 *
 * `POST /api/git/commit-push` shells out to `git push`. Before this module the
 * only protection was `HOST=127.0.0.1` and a rate limiter: any process on the
 * machine — a browser tab on a malicious page that can reach loopback, a
 * compromised dependency, a curious colleague on a shared box — could push
 * arbitrary commits to the repository using the server's token.
 *
 * ## Why a shared secret and not a session
 *
 * The server has no users. A login flow would mean storing credentials, sessions
 * and reset paths for a single operator. A bearer token in the environment is the
 * smallest mechanism that closes the hole, and it composes with the token the
 * deployment already has.
 *
 * ## Design choices worth stating
 *
 * - **Comparison is constant-time.** A naive `===` leaks the secret one byte at a
 *   time through timing; `timingSafeEqual` does not. The lengths are compared
 *   first because `timingSafeEqual` throws on different lengths.
 * - **Absent secret means the endpoint is disabled**, not open. Failing closed is
 *   the whole point: a deployment that forgot the variable must not silently
 *   become pushable by anyone.
 * - **The token never travels in a URL.** Only the `Authorization` header is read,
 *   so it cannot end up in access logs or `Referer`.
 */

import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { sendProblem } from './problemDetails.ts';

export interface WriteAuthOptions {
  /** Expected secret. Read from the environment by default. */
  secret?: string;
  /** Route paths exempt from the check (health, metrics). */
  exempt?: readonly string[];
}

/** Reads the write secret from the environment. */
export function resolveWriteSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = (env.WRITE_API_TOKEN || '').trim();
  return raw.length > 0 ? raw : null;
}

/**
 * Constant-time comparison of two strings.
 *
 * Lengths are compared with `timingSafeEqual` avoided on mismatch: the function
 * throws when buffers differ in size, so the length must be checked first. Leaking
 * length through timing is acceptable; leaking content is not.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Still do the comparison work to avoid an early-exit signal that is easy to
    // measure over many requests.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Extracts a bearer token, ignoring malformed headers. */
export function extractBearer(req: Request): string | null {
  const header = req.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

/**
 * Guards mutating routes with the shared secret.
 *
 * Applied to `/api/git` only: reads stay open so the documentation and the health
 * probe keep working without credentials.
 */
export function createWriteAuthMiddleware(options: WriteAuthOptions = {}) {
  const exempt = new Set(options.exempt ?? []);

  return function writeAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }
    if (exempt.has(req.path)) {
      next();
      return;
    }

    const expected = options.secret ?? resolveWriteSecret();
    if (!expected) {
      // Fail closed: an unconfigured deployment must not be writable by anyone.
      sendProblem(
        res,
        503,
        'Запись отключена: задайте WRITE_API_TOKEN в переменных окружения сервера.',
        { requiredEnv: ['WRITE_API_TOKEN'] }
      );
      return;
    }

    const provided = extractBearer(req);
    if (!provided) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="ural-write"');
      sendProblem(res, 401, 'Требуется заголовок Authorization: Bearer <WRITE_API_TOKEN>.');
      return;
    }

    if (!constantTimeEquals(provided, expected)) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="ural-write"');
      sendProblem(res, 403, 'Неверный токен записи.');
      return;
    }

    next();
  };
}
