/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Request correlation IDs.
 *
 * Every response carries an `X-Request-Id` header and every RFC 7807 error body
 * repeats it in `requestId`, so a user reporting a failure can hand over one
 * string that appears in the server log line. An inbound `X-Request-Id` / RFC
 * 7239 `X-Correlation-Id` is honoured when it looks safe (a bounded, printable
 * token), otherwise a fresh UUID is minted — client-supplied IDs must never be
 * echoed blindly, or they become a log-injection vector.
 */

import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_ID = /^[A-Za-z0-9._:-]{8,128}$/;

export function resolveRequestId(req: Request): string {
  const inbound = req.header('x-request-id') || req.header('x-correlation-id');
  if (inbound && SAFE_ID.test(inbound)) {
    return inbound;
  }
  return randomUUID();
}

export function createRequestIdMiddleware() {
  return function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = resolveRequestId(req);
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  };
}
