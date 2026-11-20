/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sliding-window rate limiter for the write API.
 *
 * Scope and honesty: state lives in this process's memory, so the limit holds
 * for a single instance. Running more than one replica needs a shared store
 * (Redis or the platform's KV) — this module says so rather than pretending to
 * be distributed. The portal's only mutating endpoint is `git/commit-push`,
 * which shells out to `git push`; an unthrottled caller could exhaust GitHub
 * rate limits and burn CI minutes, so it gets a much tighter budget than reads.
 *
 * Ported in spirit from the PSTU server's `rateLimiterEngine`, minus its
 * token-service coupling that this project has no use for.
 */

import type { NextFunction, Request, Response } from 'express';
import { sendProblem } from './problemDetails.ts';

export interface RateLimitPolicy {
  id: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetEpochSec: number;
  retryAfterSec: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, number[]>();

  public check(policy: RateLimitPolicy, key: string, nowMs = Date.now()): RateLimitDecision {
    const windowStart = nowMs - policy.windowMs;
    // Drop the bucket wholesale when it ages out; otherwise prune in place.
    const hits = (this.buckets.get(key) ?? []).filter((t) => t > windowStart);
    const allowed = hits.length < policy.limit;
    if (allowed) {
      hits.push(nowMs);
    }
    this.buckets.set(key, hits);

    const oldest = hits[0] ?? nowMs;
    const resetMs = oldest + policy.windowMs;
    return {
      allowed,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - hits.length),
      resetEpochSec: Math.ceil(resetMs / 1000),
      retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((resetMs - nowMs) / 1000)),
    };
  }

  public prune(nowMs = Date.now(), windowMs = 60_000): void {
    for (const [key, hits] of this.buckets) {
      if (hits.length === 0 || hits[hits.length - 1] < nowMs - windowMs) {
        this.buckets.delete(key);
      }
    }
  }

  public reset(): void {
    this.buckets.clear();
  }

  public get activeBuckets(): number {
    return this.buckets.size;
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Client identity for throttling. `trust proxy` is enabled on the app, so
 * `req.ip` is the left-most forwarded address; falling back to the socket
 * address keeps the limiter working when no proxy is present.
 */
export function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function createRateLimitMiddleware(policy: RateLimitPolicy) {
  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const decision = rateLimiter.check(policy, clientKey(req));

    res.setHeader('X-RateLimit-Limit', String(decision.limit));
    res.setHeader('X-RateLimit-Remaining', String(decision.remaining));
    res.setHeader('X-RateLimit-Reset', String(decision.resetEpochSec));

    if (!decision.allowed) {
      res.setHeader('Retry-After', String(decision.retryAfterSec));
      sendProblem(
        res,
        429,
        `Слишком много запросов. Повторите через ${decision.retryAfterSec} с.`,
        { policy: policy.id, limit: policy.limit, windowMs: policy.windowMs }
      );
      return;
    }

    next();
  };
}
