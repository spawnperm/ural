/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Write authentication tests.
 *
 * The endpoint this guards runs `git push`, so the failure that matters is not
 * "the happy path works" but "an unauthenticated caller is refused, and an
 * unconfigured server refuses everyone". Both are asserted below, including the
 * constant-time comparison.
 */

import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { constantTimeEquals, extractBearer, resolveWriteSecret } from '../server/writeAuth.ts';
import { startTestServer, TEST_WRITE_TOKEN, writeHeaders } from './helpers/appHarness.ts';
import { API_ROUTES } from '../shared/apiContract.ts';

describe('resolveWriteSecret', () => {
  it('returns null when unset or blank', () => {
    assert.equal(resolveWriteSecret({}), null);
    assert.equal(resolveWriteSecret({ WRITE_API_TOKEN: '   ' }), null);
  });

  it('returns the trimmed value', () => {
    assert.equal(resolveWriteSecret({ WRITE_API_TOKEN: '  abc  ' }), 'abc');
  });
});

describe('constantTimeEquals', () => {
  it('accepts identical strings', () => {
    assert.equal(constantTimeEquals('secret', 'secret'), true);
  });

  it('rejects different strings of equal length', () => {
    assert.equal(constantTimeEquals('secret', 'secreT'), false);
  });

  it('rejects different lengths without throwing', () => {
    // `timingSafeEqual` throws on a length mismatch, so the length check must
    // happen first — otherwise a short token would crash the request.
    assert.equal(constantTimeEquals('short', 'much-longer-secret'), false);
  });

  it('handles multi-byte input', () => {
    assert.equal(constantTimeEquals('токен', 'токен'), true);
    assert.equal(constantTimeEquals('токен', 'токен2'), false);
  });
});

describe('extractBearer', () => {
  const fakeReq = (header?: string) =>
    ({ header: (name: string) => (name.toLowerCase() === 'authorization' ? header : undefined) }) as never;

  it('reads a bearer token', () => {
    assert.equal(extractBearer(fakeReq('Bearer abc123')), 'abc123');
  });

  it('is case-insensitive on the scheme', () => {
    assert.equal(extractBearer(fakeReq('bearer abc123')), 'abc123');
  });

  it('returns null for a missing or malformed header', () => {
    assert.equal(extractBearer(fakeReq(undefined)), null);
    assert.equal(extractBearer(fakeReq('Basic abc')), null);
    assert.equal(extractBearer(fakeReq('Bearer')), null);
  });
});

describe('write endpoint requires the token', () => {
  let server: Awaited<ReturnType<typeof startTestServer>> | null = null;
  afterEach(async () => {
    await server?.close();
    server = null;
  });

  it('refuses a write without Authorization', async () => {
    server = await startTestServer();
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitCommitPush}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'docs: should not happen' }),
    });
    assert.equal(res.status, 401);
    assert.match(res.headers.get('www-authenticate') ?? '', /Bearer/);
    assert.match(res.headers.get('content-type') ?? '', /application\/problem\+json/);
  });

  it('refuses a wrong token with 403', async () => {
    server = await startTestServer();
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitCommitPush}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: 'Bearer wrong-token' },
      body: JSON.stringify({ message: 'docs: nope' }),
    });
    assert.equal(res.status, 403);
  });

  it('accepts the configured token', async () => {
    server = await startTestServer();
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitCommitPush}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...writeHeaders(server.writeToken) },
      body: JSON.stringify({ message: 'docs: allowed' }),
    });
    assert.equal(res.status, 200);
  });

  it('leaves reads open', async () => {
    server = await startTestServer();
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitStatus}`);
    assert.equal(res.status, 200, 'reading the status must not require a token');
  });

  it('fails closed when no token is configured', async () => {
    // A deployment that forgot WRITE_API_TOKEN must not silently become writable
    // by anyone who can reach the port.
    server = await startTestServer({ writeToken: null });
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitCommitPush}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${TEST_WRITE_TOKEN}` },
      body: JSON.stringify({ message: 'docs: blocked' }),
    });
    assert.equal(res.status, 503);
    const body = (await res.json()) as { details?: { requiredEnv?: string[] } };
    assert.deepEqual(body.details?.requiredEnv, ['WRITE_API_TOKEN']);
  });
});
