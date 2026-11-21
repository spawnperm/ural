/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Metrics tests.
 *
 * The value of this module is that a scraper can parse it, so the tests assert
 * the exposition format rather than just "the endpoint responds": a malformed or
 * missing `# TYPE` line makes Prometheus reject the whole scrape, silently.
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { MetricsRegistry } from '../server/metrics.ts';
import { startTestServer } from './helpers/appHarness.ts';
import { API_ROUTES } from '../shared/apiContract.ts';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;
  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  it('renders a counter with its TYPE line', () => {
    registry.increment('http_requests_total', { method: 'GET', status: '200' });
    const text = registry.render();
    assert.match(text, /# TYPE http_requests_total counter/);
    assert.match(text, /http_requests_total\{method="GET",status="200"\} 1/);
  });

  it('accumulates the same label tuple', () => {
    registry.increment('hits', { route: '/' });
    registry.increment('hits', { route: '/' });
    assert.match(registry.render(), /hits\{route="\/"\} 2/);
  });

  it('keeps different label tuples apart', () => {
    registry.increment('hits', { route: '/' });
    registry.increment('hits', { route: '/x' });
    const text = registry.render();
    assert.match(text, /route="\/"\} 1/);
    assert.match(text, /route="\/x"\} 1/);
  });

  it('orders labels deterministically regardless of insertion order', () => {
    // Two calls with the same labels must land in one series, or a counter
    // becomes two and every rate calculation is halved.
    registry.increment('x', { a: '1', b: '2' });
    registry.increment('x', { b: '2', a: '1' });
    assert.match(registry.render(), /x\{a="1",b="2"\} 2/);
  });

  it('escapes quotes in label values', () => {
    registry.increment('x', { note: 'a"b' });
    assert.match(registry.render(), /note="a\\"b"/);
  });

  it('renders a histogram with buckets, sum and count', () => {
    registry.observe('lat', 0.03);
    const text = registry.render();
    assert.match(text, /# TYPE lat histogram/);
    assert.match(text, /lat_bucket\{le="0.05"\} 1/);
    assert.match(text, /lat_bucket\{le="\+Inf"\} 1/);
    assert.match(text, /lat_count 1/);
    assert.match(text, /lat_sum 0\.03/);
  });

  it('counts a value in every bucket it falls under', () => {
    registry.observe('lat', 0.01);
    const text = registry.render();
    // 0.01 is <= 0.01, 0.025, 0.05 … — cumulative buckets, as Prometheus expects.
    assert.match(text, /lat_bucket\{le="0\.01"\} 1/);
    assert.match(text, /lat_bucket\{le="0\.025"\} 1/);
    assert.match(text, /lat_bucket\{le="2\.5"\} 1/);
  });

  it('tracks in-flight requests', () => {
    registry.enter();
    registry.enter();
    assert.equal(registry.activeRequests, 2);
    registry.leave();
    assert.equal(registry.activeRequests, 1);
  });

  it('never reports negative in-flight', () => {
    registry.leave();
    assert.equal(registry.activeRequests, 0);
  });

  it('renders an empty registry as a valid document', () => {
    assert.match(registry.render(), /http_requests_in_flight 0/);
  });

  it('resets all state', () => {
    registry.increment('x');
    registry.reset();
    assert.equal(registry.render().includes('x '), false);
  });
});

describe('GET /metrics', () => {
  it('serves the exposition format', async () => {
    const server = await startTestServer();
    try {
      await fetch(`${server.baseUrl}${API_ROUTES.health}`);
      const res = await fetch(`${server.baseUrl}/metrics`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
      assert.equal(res.headers.get('cache-control'), 'no-store');

      const text = await res.text();
      assert.match(text, /# TYPE http_requests_total counter/);
      assert.match(text, /http_requests_total\{[^}]*route="\/api\/health"/);
      assert.match(text, /# TYPE http_request_duration_seconds histogram/);
      assert.match(text, /http_requests_in_flight \d+/);
    } finally {
      await server.close();
    }
  });

  it('does not count the scrape itself', async () => {
    const server = await startTestServer();
    try {
      const first = await (await fetch(`${server.baseUrl}/metrics`)).text();
      const second = await (await fetch(`${server.baseUrl}/metrics`)).text();
      // Scraping twice must not change the counter it reports.
      const count = (body: string): number => {
        const m = /http_requests_total\{[^}]*route="\/metrics"[^}]*\} (\d+)/.exec(body);
        return m ? Number(m[1]) : 0;
      };
      assert.equal(count(first), count(second));
      assert.equal(count(second), 0, 'the scrape endpoint must not measure itself');
    } finally {
      await server.close();
    }
  });
});
