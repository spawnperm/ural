/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rate limiter tests.
 *
 * The limiter is the only thing standing between a runaway script and repeated
 * `git push` calls, so its window arithmetic is tested directly rather than
 * through HTTP, where the passage of time would make the test slow and flaky.
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { RateLimiter, type RateLimitPolicy } from '../server/rateLimiter.ts';

const POLICY: RateLimitPolicy = { id: 'test', limit: 3, windowMs: 1000 };

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it('allows requests up to the limit', () => {
    assert.equal(limiter.check(POLICY, 'client', 1000).allowed, true);
    assert.equal(limiter.check(POLICY, 'client', 1001).allowed, true);
    const third = limiter.check(POLICY, 'client', 1002);
    assert.equal(third.allowed, true);
    assert.equal(third.remaining, 0);
  });

  it('blocks the request after the limit is reached', () => {
    limiter.check(POLICY, 'client', 1000);
    limiter.check(POLICY, 'client', 1001);
    limiter.check(POLICY, 'client', 1002);
    const blocked = limiter.check(POLICY, 'client', 1003);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterSec >= 1);
  });

  it('keeps separate buckets per client', () => {
    limiter.check(POLICY, 'a', 1000);
    limiter.check(POLICY, 'a', 1001);
    limiter.check(POLICY, 'a', 1002);
    assert.equal(limiter.check(POLICY, 'a', 1003).allowed, false);
    assert.equal(limiter.check(POLICY, 'b', 1003).allowed, true);
  });

  it('frees the window once old hits age out', () => {
    limiter.check(POLICY, 'client', 1000);
    limiter.check(POLICY, 'client', 1001);
    limiter.check(POLICY, 'client', 1002);
    assert.equal(limiter.check(POLICY, 'client', 1003).allowed, false);
    // 1000 + windowMs + 1 — the first three hits are all outside the window.
    assert.equal(limiter.check(POLICY, 'client', 2001).allowed, true);
  });

  it('reports the limit and a reset time in the future', () => {
    const decision = limiter.check(POLICY, 'client', 5_000);
    assert.equal(decision.limit, 3);
    assert.ok(decision.resetEpochSec * 1000 > 5_000);
  });

  it('prunes idle buckets', () => {
    limiter.check(POLICY, 'idle', 1000);
    assert.equal(limiter.activeBuckets, 1);
    limiter.prune(10_000, 1000);
    assert.equal(limiter.activeBuckets, 0);
  });

  it('resets all state', () => {
    limiter.check(POLICY, 'client', 1000);
    limiter.reset();
    assert.equal(limiter.activeBuckets, 0);
    assert.equal(limiter.check(POLICY, 'client', 1000).allowed, true);
  });
});
