/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Baseline HTTP security headers.
 *
 * The portal is a documentation site that also exposes a small Git API, so the
 * policy is deliberately narrow: no framing restrictions (the docs are meant to
 * be embeddable in AI Studio preview frames and intranet portals), but strict
 * MIME sniffing, referrer and permissions policies.
 *
 * Ported from the PSTU server. The lesson worth carrying over: `X-Powered-By`
 * is removed, because advertising the server stack only helps an attacker.
 */

import type { NextFunction, Request, Response } from 'express';

export interface SecurityHeadersOptions {
  allowedOrigins?: string[];
  allowCredentials?: boolean;
  frameAncestors?: string;
}

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-Id',
  'X-Correlation-Id',
  'Idempotency-Key',
].join(', ');

export function createSecurityHeadersMiddleware(options: SecurityHeadersOptions = {}) {
  const configuredOrigins =
    options.allowedOrigins ??
    (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const allowCredentials = options.allowCredentials ?? false;

  return function securityHeadersMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Docs are static and self-contained; denying inline scripts would break the
    // Vite dev client, so the CSP is limited to what is unambiguous.
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' https:; object-src 'none'; base-uri 'self'"
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    const origin = req.headers.origin;
    const isAllowed =
      origin !== undefined &&
      (configuredOrigins.length === 0 || configuredOrigins.includes(origin));

    if (origin && isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      if (allowCredentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', DEFAULT_ALLOWED_HEADERS);
    }

    if (req.method === 'OPTIONS') {
      // Only preflight what we would actually allow; otherwise answer 403 so a
      // browser does not silently proceed to a blocked request.
      res.status(origin && isAllowed ? 204 : 403).end();
      return;
    }

    next();
  };
}
