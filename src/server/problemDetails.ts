/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RFC 7807 Problem Details responses.
 *
 * Every error the API emits — validation, 404, unhandled — goes through
 * `sendProblem`, so a client can parse one shape and trust `status` to match
 * the HTTP status code. Ported from the PSTU server, which learnt the hard way
 * that half-JSON/half-plaintext errors break typed clients.
 */

import type { Response } from 'express';

export interface ErrorProblem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  error: string;
  details?: unknown;
  requestId?: string;
}

export function problemBody(
  status: number,
  error: string,
  details?: unknown,
  instance?: string
): ErrorProblem {
  const body: ErrorProblem = {
    type: 'about:blank',
    title: error,
    status,
    detail: error,
    error,
  };
  if (instance !== undefined) body.instance = instance;
  if (details !== undefined) body.details = details;
  return body;
}

export function sendProblem(
  res: Response,
  status: number,
  error: string,
  details?: unknown
): void {
  const instance = res.req?.originalUrl ?? undefined;
  const body = problemBody(status, error, details, instance);
  const requestId = (res.req as { requestId?: string } | undefined)?.requestId;
  if (requestId) body.requestId = requestId;
  // Errors are never cacheable — a retry must reach the origin.
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).type('application/problem+json').json(body);
}
