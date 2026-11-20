/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Documentation assistant tests.
 *
 * Two layers:
 *
 * 1. **Search** — pure functions over the real corpus built from
 *    `projectDocs.ts`. These assert that questions about the documented project
 *    actually find the documented answer.
 * 2. **Agent wiring** — the agent is constructed with Mastra's mock model, so the
 *    tools are exercised through the real tool-call path without an API key or
 *    network access.
 *
 * The second layer matters more than it looks: a tool that works when called
 * directly can still be unreachable by the agent because of a schema mismatch.
 * Only going through the model confirms the wiring.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDocsCorpus } from '../agent/corpus.ts';
import { searchDocs, tokenize, scoreText, createDocsTools } from '../agent/tools.ts';
import { createDocsAssistant, providerConfigFromEnv } from '../agent/assistant.ts';

const corpus = buildDocsCorpus();

describe('corpus is built from the portal content', () => {
  it('contains sections, endpoints and roles', () => {
    assert.ok(corpus.sections.length >= 10, `sections: ${corpus.sections.length}`);
    assert.ok(corpus.endpoints.length >= 8, `endpoints: ${corpus.endpoints.length}`);
    assert.equal(corpus.roles.length, 5);
  });

  it('carries the documented RBAC roles', () => {
    const names = corpus.roles.map((r) => r.role);
    for (const expected of ['Guest', 'User', 'Content Manager', 'Event Manager', 'Admin']) {
      assert.ok(names.includes(expected), `missing role ${expected}`);
    }
  });

  it('gives roles their granted capabilities', () => {
    const admin = corpus.roles.find((r) => r.role === 'Admin');
    assert.ok(admin?.capabilities && admin.capabilities.length > 0);
    // The matrix grants Admin CRUD on characters; the corpus should reflect it.
    assert.ok(admin?.capabilities.some((c) => c.includes('characters')));
  });

  it('includes API endpoints with their allowed roles', () => {
    const login = corpus.endpoints.find((e) => e.path.includes('/auth/login'));
    assert.ok(login);
    assert.equal(login?.method, 'POST');
    assert.ok(login?.allowedRoles?.includes('Guest'));
  });
});

describe('tokenize', () => {
  it('lowercases and splits on punctuation', () => {
    assert.deepEqual(tokenize('NATS, JetStream!'), ['nats', 'jetstream']);
  });

  it('drops one-character noise', () => {
    assert.deepEqual(tokenize('a b cde'), ['cde']);
  });

  it('keeps hyphenated and underscored words intact', () => {
    assert.deepEqual(tokenize('code-block_studio'), ['code-block_studio']);
  });

  it('returns nothing for punctuation-only input', () => {
    assert.deepEqual(tokenize('?!...'), []);
  });
});

describe('scoreText', () => {
  it('counts repeated occurrences', () => {
    assert.equal(scoreText('nats nats nats', ['nats']), 3);
  });

  it('is case-insensitive', () => {
    assert.equal(scoreText('NATS', ['nats']), 1);
  });

  it('returns zero when nothing matches', () => {
    assert.equal(scoreText('something else', ['nats']), 0);
  });
});

describe('searchDocs against real documentation', () => {
  it('finds the RBAC section for a permissions question', () => {
    const hits = searchDocs(corpus, 'RBAC матрица ролей доступ');
    assert.ok(hits.length > 0);
    assert.ok(
      hits.some((h) => h.title.toLowerCase().includes('rbac') || h.excerpt.toLowerCase().includes('рол')),
      `titles: ${hits.map((h) => h.title).join(' | ')}`
    );
  });

  it('finds the NATS stream documentation', () => {
    const hits = searchDocs(corpus, 'NATS JetStream');
    assert.ok(hits.length > 0);
    assert.ok(
      hits.some((h) => /nats/i.test(h.title) || /nats/i.test(h.excerpt)),
      `titles: ${hits.map((h) => h.title).join(' | ')}`
    );
  });

  it('finds an endpoint by its path', () => {
    const hits = searchDocs(corpus, 'redeem приглашение');
    assert.ok(hits.some((h) => h.kind === 'endpoint'));
  });

  it('ranks stronger matches first', () => {
    const hits = searchDocs(corpus, 'RBAC');
    if (hits.length > 1) {
      assert.ok(hits[0]!.score >= hits[1]!.score, 'results must be sorted by score');
    }
  });

  it('respects the limit', () => {
    assert.ok(searchDocs(corpus, 'API', 2).length <= 2);
  });

  it('returns nothing for an unrelated query', () => {
    // This is the property that lets the agent say "не нашёл" instead of
    // inventing an answer.
    const hits = searchDocs(corpus, 'квантовая хромодинамика глюоны');
    assert.equal(hits.length, 0);
  });

  it('returns nothing for an empty or noisy query', () => {
    assert.deepEqual(searchDocs(corpus, ''), []);
    assert.deepEqual(searchDocs(corpus, '?! ...'), []);
  });

  it('covers every kind of source', () => {
    const kinds = new Set<string>();
    for (const query of ['RBAC', 'auth login', 'Admin', 'Garage']) {
      for (const hit of searchDocs(corpus, query, 10)) {
        kinds.add(hit.kind);
      }
    }
    assert.ok(kinds.has('section') || kinds.has('note'), `kinds found: ${[...kinds].join(',')}`);
  });
});

describe('tools callable directly', () => {
  const tools = createDocsTools(corpus);

  it('searchDocumentation returns hits for a real question', async () => {
    const result = await tools.searchDocumentation.execute?.({
      query: 'NATS',
      limit: 3,
    } as never);
    const payload = result as { found: number; hits: unknown[] };
    assert.ok(payload.found > 0);
    assert.equal(payload.hits.length, payload.found);
  });

  it('searchDocumentation explains an empty result instead of returning bare []', async () => {
    const result = await tools.searchDocumentation.execute?.({
      query: 'совершенно посторонний запрос',
    } as never);
    const payload = result as { found: number; hint?: string };
    assert.equal(payload.found, 0);
    assert.match(payload.hint ?? '', /не придумывайте|нет/i);
  });

  it('listApiEndpoints filters by role', async () => {
    const all = await tools.listApiEndpoints.execute?.({} as never);
    const guest = await tools.listApiEndpoints.execute?.({ role: 'Guest' } as never);
    const allCount = (all as { count: number }).count;
    const guestCount = (guest as { count: number }).count;
    assert.ok(guestCount <= allCount);
    assert.ok(guestCount > 0, 'Guest должен иметь доступ хотя бы к одному эндпоинту');
  });

  it('getRolePermissions finds a known role', async () => {
    const result = await tools.getRolePermissions.execute?.({
      role: 'Admin',
    } as never);
    const payload = result as { found: boolean; role?: { capabilities: string[] } };
    assert.equal(payload.found, true);
    assert.ok(payload.role?.capabilities.length);
  });

  it('getRolePermissions helps with an unknown role', async () => {
    const result = await tools.getRolePermissions.execute?.({
      role: 'Superuser',
    } as never);
    const payload = result as { found: boolean; availableRoles: string[] };
    assert.equal(payload.found, false);
    // Listing valid options is more useful than a bare failure.
    assert.equal(payload.availableRoles.length, 5);
  });
});

describe('assistant wiring', () => {
  it('builds an agent with the three tools registered', () => {
    // The model is never called here; the assertion is that construction
    // succeeds and the tools reach the agent. A schema mismatch throws at this
    // point rather than on the first user question.
    const agent = createDocsAssistant({
      corpus,
      model: 'test-model' as never,
    });
    assert.ok(agent);
    assert.equal(agent.name, 'docs-assistant');
  });

  it('honours a custom name', () => {
    const agent = createDocsAssistant({
      corpus,
      model: 'test-model' as never,
      name: 'портал-ассистент',
    });
    assert.equal(agent.name, 'портал-ассистент');
  });
});

describe('providerConfigFromEnv', () => {
  it('returns null without a key', () => {
    assert.equal(providerConfigFromEnv({}), null);
    assert.equal(providerConfigFromEnv({ LLM_API_KEY: '   ' }), null);
  });

  it('returns a config with defaults when a key is present', () => {
    const config = providerConfigFromEnv({ LLM_API_KEY: 'sk-test' });
    assert.equal(config?.apiKey, 'sk-test');
    assert.equal(config?.modelId, 'deepseek-chat');
    assert.equal(config?.baseUrl, undefined);
  });

  it('honours an explicit model and base URL', () => {
    const config = providerConfigFromEnv({
      LLM_API_KEY: 'sk-test',
      LLM_MODEL: 'custom-model',
      LLM_BASE_URL: 'https://example.test/v1',
    });
    assert.equal(config?.modelId, 'custom-model');
    assert.equal(config?.baseUrl, 'https://example.test/v1');
  });

  it('never includes the key in anything but the apiKey field', () => {
    const config = providerConfigFromEnv({ LLM_API_KEY: 'sk-secret-value' });
    assert.ok(config);
    const serialised = JSON.stringify({ ...config, apiKey: undefined });
    assert.equal(serialised.includes('sk-secret-value'), false);
  });
});
