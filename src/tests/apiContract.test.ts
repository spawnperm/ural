/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HTTP contract tests.
 *
 * These assert what a client actually observes: status codes, content types,
 * headers and the shape of error bodies. They run the real Express app against a
 * stub git service, so no repository is touched and no port is fixed.
 */

import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { startTestServer, type TestServer } from './helpers/appHarness.ts';
import { GitError } from '../server/gitService.ts';
import { API_ROUTES } from '../shared/apiContract.ts';

describe('GET /api/health', () => {
  let server: TestServer;
  before(async () => {
    server = await startTestServer();
  });
  after(async () => {
    await server.close();
  });

  it('reports ok with the service identity', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.health}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'ural-docs-portal');
    assert.equal(typeof body.uptimeSeconds, 'number');
    assert.equal(typeof body.timestamp, 'string');
  });

  it('emits security headers', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.health}`);
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(res.headers.get('content-security-policy') ?? '', /frame-ancestors/);
  });

  it('issues a request id and echoes an inbound one', async () => {
    const first = await fetch(`${server.baseUrl}${API_ROUTES.health}`);
    assert.match(first.headers.get('x-request-id') ?? '', /^[A-Za-z0-9._:-]{8,128}$/);

    const echoed = await fetch(`${server.baseUrl}${API_ROUTES.health}`, {
      headers: { 'x-request-id': 'client-supplied-id-123456' },
    });
    assert.equal(echoed.headers.get('x-request-id'), 'client-supplied-id-123456');
  });

  it('rejects an unsafe inbound request id rather than echoing it', async () => {
    const poisoned = 'bad id<script>';
    const res = await fetch(`${server.baseUrl}${API_ROUTES.health}`, {
      headers: { 'x-request-id': poisoned },
    });
    assert.notEqual(res.headers.get('x-request-id'), poisoned);
  });
});

describe('GET /api/git/status', () => {
  let server: TestServer;
  before(async () => {
    server = await startTestServer({
      status: {
        branch: 'main',
        remoteUrl: 'https://github.com/spawnperm/ural.git',
        changes: [{ status: 'M', file: 'src/App.tsx' }],
        commits: [{ hash: 'abc1234', message: 'docs: test', date: '2026-11-20T11:52:39Z' }],
        hasToken: false,
      },
    });
  });
  after(async () => {
    await server.close();
  });

  it('returns the repository state', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitStatus}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      branch: string;
      changes: unknown[];
      commits: unknown[];
    };
    assert.equal(body.branch, 'main');
    assert.equal(body.changes.length, 1);
    assert.equal(body.commits.length, 1);
  });

  it('returns a problem+json body when git fails', async () => {
    const failing = await startTestServer({
      statusError: new Error('not a git repository'),
    });
    try {
      const res = await fetch(`${failing.baseUrl}${API_ROUTES.gitStatus}`);
      assert.equal(res.status, 500);
      assert.match(res.headers.get('content-type') ?? '', /application\/problem\+json/);
      const body = (await res.json()) as Record<string, unknown>;
      assert.equal(body.status, 500);
      assert.equal(typeof body.detail, 'string');
      assert.equal(typeof body.requestId, 'string');
    } finally {
      await failing.close();
    }
  });
});

describe('POST /api/git/commit-push', () => {
  let server: TestServer;
  before(async () => {
    server = await startTestServer();
  });
  after(async () => {
    await server.close();
  });

  it('commits and pushes with a valid message', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitCommitPush}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'docs: обновление' }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(body.pushed, true);
    assert.equal(body.branch, 'main');
  });

  it('accepts an empty body', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitCommitPush}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(res.status, 200);
  });

  it('rejects a malformed payload with 400 and a problem body', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitCommitPush}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mesage: 'typo' }),
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') ?? '', /application\/problem\+json/);
    const body = (await res.json()) as { details: unknown[] };
    assert.equal(body.details.length, 1);
  });

  it('rejects invalid JSON with 400', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.gitCommitPush}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') ?? '', /application\/problem\+json/);
  });

  it('maps a git failure carrying a status to that status', async () => {
    const failing = await startTestServer({
      commitError: new GitError('Не настроен удалённый репозиторий origin.', 400),
    });
    try {
      const res = await fetch(`${failing.baseUrl}${API_ROUTES.gitCommitPush}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      assert.equal(res.status, 400);
      const body = (await res.json()) as { error: string };
      assert.match(body.error, /origin/);
    } finally {
      await failing.close();
    }
  });

  it('reports 401 when a push needs a token', async () => {
    const failing = await startTestServer({
      commitError: new GitError('Для отправки (push) нужен GITHUB_TOKEN.', 401),
    });
    try {
      const res = await fetch(`${failing.baseUrl}${API_ROUTES.gitCommitPush}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      assert.equal(res.status, 401);
    } finally {
      await failing.close();
    }
  });
});

describe('unknown API routes', () => {
  let server: TestServer;
  before(async () => {
    server = await startTestServer();
  });
  after(async () => {
    await server.close();
  });

  it('answers 404 in problem+json instead of the SPA shell', async () => {
    const res = await fetch(`${server.baseUrl}/api/does-not-exist`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') ?? '', /application\/problem\+json/);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.status, 404);
  });
});

describe('GET /api/openapi.json', () => {
  let server: TestServer;
  before(async () => {
    server = await startTestServer();
  });
  after(async () => {
    await server.close();
  });

  it('serves an OpenAPI 3.1 document', async () => {
    const res = await fetch(`${server.baseUrl}/api/openapi.json`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    assert.equal(body.openapi, '3.1.0');
    assert.ok(Object.keys(body.paths).length >= 4);
  });
});

describe('GET /api/docs', () => {
  let server: TestServer;
  before(async () => {
    server = await startTestServer();
  });
  after(async () => {
    await server.close();
  });

  it('serves the Scalar reference page', async () => {
    const res = await fetch(`${server.baseUrl}/api/docs`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    const html = await res.text();
    // The page must point the viewer at this server's own spec.
    assert.match(html, /\/api\/openapi\.json/);
  });
});

describe('POST /api/assistant/ask', () => {
  let server: TestServer;
  before(async () => {
    server = await startTestServer();
  });
  after(async () => {
    await server.close();
  });

  it('rejects a body without a question', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.assistantAsk}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') ?? '', /application\/problem\+json/);
    const body = (await res.json()) as { details: Array<{ field: string }> };
    assert.equal(body.details[0]?.field, 'body.question');
  });

  it('rejects a question that is too short', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.assistantAsk}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'a' }),
    });
    assert.equal(res.status, 400);
  });

  it('rejects an over-long question', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.assistantAsk}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'x'.repeat(1001) }),
    });
    assert.equal(res.status, 400);
  });

  it('rejects unknown fields', async () => {
    const res = await fetch(`${server.baseUrl}${API_ROUTES.assistantAsk}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'что такое RBAC', model: 'gpt' }),
    });
    assert.equal(res.status, 400);
  });

  it('explains that it is unconfigured instead of failing obscurely', async () => {
    // Without LLM_API_KEY the endpoint must say so. The test runs in an
    // environment without the key, which is exactly the deployed default.
    const saved = process.env.LLM_API_KEY;
    delete process.env.LLM_API_KEY;
    try {
      const res = await fetch(`${server.baseUrl}${API_ROUTES.assistantAsk}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: 'что такое RBAC' }),
      });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { details?: { requiredEnv?: string[] } };
      assert.deepEqual(body.details?.requiredEnv, ['LLM_API_KEY']);
    } finally {
      if (saved !== undefined) process.env.LLM_API_KEY = saved;
    }
  });
});
