/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Logger tests.
 *
 * The point of structured logging is that a log store can query the fields, so
 * these tests parse the output back into objects instead of matching substrings:
 * a record that is not valid JSON is not structured logging at all.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLogger, createRequestLogger, type LogRecord } from '../server/logger.ts';
import { startTestServer } from './helpers/appHarness.ts';
import { API_ROUTES } from '../shared/apiContract.ts';

function capture() {
  const lines: string[] = [];
  const logger = createLogger({ sink: (line) => lines.push(line) });
  const records = (): LogRecord[] => lines.map((l) => JSON.parse(l) as LogRecord);
  return { logger, lines, records };
}

describe('createLogger', () => {
  it('emits one JSON object per call', () => {
    const { logger, records } = capture();
    logger.info('hello');
    const parsed = records();
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.msg, 'hello');
    assert.equal(parsed[0]?.level, 'info');
  });

  it('includes an ISO timestamp', () => {
    const { logger, records } = capture();
    logger.info('x');
    assert.match(records()[0]?.time as string, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  });

  it('is valid JSON even with quotes and newlines in the message', () => {
    const { logger, records } = capture();
    logger.info('странный "текст"\nс переводом строки');
    // Parsing succeeding is the assertion: an unescaped quote or raw newline would
    // split the record and break every downstream parser.
    assert.equal(records()[0]?.msg, 'странный "текст"\nс переводом строки');
  });

  it('merges fields and base context', () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), base: { service: 'ural' } });
    logger.info('x', { route: '/a', status: 200 });
    const record = JSON.parse(lines[0]!) as LogRecord;
    assert.equal(record.service, 'ural');
    assert.equal(record.route, '/a');
    assert.equal(record.status, 200);
  });

  it('respects the minimum level', () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l), level: 'warn' });
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    const levels = lines.map((l) => (JSON.parse(l) as LogRecord).level);
    assert.deepEqual(levels, ['warn', 'error']);
  });

  it('never throws on a circular field', () => {
    // A circular object in a log field would otherwise crash the request that
    // logged it — losing the line and the response.
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l) });
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assert.doesNotThrow(() => logger.info('circular', { circular }));
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]!) as LogRecord;
    assert.equal(record.msg, 'circular');
    assert.equal(record.circular, undefined, 'the bad field is dropped, the line is kept');
  });
});

describe('request logging', () => {
  it('logs one record per request with status and duration', async () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (l) => lines.push(l) });
    const app = createRequestLogger(logger);

    // Minimal fakes: the middleware only touches these members.
    const handlers: Array<() => void> = [];
    const req = {
      method: 'GET',
      path: '/api/health',
      baseUrl: '/api',
      route: { path: '/health' },
      ip: '127.0.0.1',
      requestId: 'req-1',
    } as never;
    const res = {
      statusCode: 200,
      on: (event: string, cb: () => void) => {
        if (event === 'finish') handlers.push(cb);
      },
    } as never;

    app(req, res, () => undefined);
    handlers.forEach((h) => h());

    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]!) as LogRecord;
    assert.equal(record.level, 'info');
    assert.equal(record.status, 200);
    assert.equal(record.requestId, 'req-1');
    assert.equal(typeof record.durationMs, 'number');
    // Route pattern, not the raw URL: distinct paths must not explode cardinality.
    assert.equal(record.route, '/api/health');
  });

  it('collapses unmatched paths instead of logging every filename', () => {
    // In development Vite serves every source file individually. Logging each
    // path verbatim produced `/src/data/content/stack.ts` and a thousand like it,
    // which makes a query over `route` meaningless.
    const lines: string[] = [];
    const app = createRequestLogger(createLogger({ sink: (l) => lines.push(l) }));

    const run = (path: string): void => {
      const handlers: Array<() => void> = [];
      app(
        { method: 'GET', path, baseUrl: '', ip: '127.0.0.1' } as never,
        {
          statusCode: 200,
          on: (event: string, cb: () => void) => {
            if (event === 'finish') handlers.push(cb);
          },
        } as never,
        () => undefined
      );
      handlers.forEach((h) => h());
    };

    run('/src/data/content/stack.ts');
    run('/src/assets/images/hero.jpg');
    run('/api/does-not-exist');

    const routes = lines.map((l) => (JSON.parse(l) as LogRecord).route);
    assert.deepEqual(routes, ['<static:ts>', '<static:jpg>', '<unmatched>']);
  });
});

describe('the running app logs requests', () => {
  it('produces parseable records for a real request', async () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (line: string) => lines.push(line);
    const server = await startTestServer({ requestLogger: true });
    try {
      await fetch(`${server.baseUrl}${API_ROUTES.health}`);
      // Let the finish handler run.
      await new Promise((r) => setTimeout(r, 100));

      const records = lines
        .filter((l) => l.startsWith('{'))
        .map((l) => JSON.parse(l) as LogRecord)
        .filter((r) => r.msg === 'request');

      assert.ok(records.length > 0, 'no request record was logged');
      const record = records[records.length - 1]!;
      assert.equal(record.level, 'info');
      assert.ok(typeof record.route === 'string' && record.route.includes('/api/health'));
    } finally {
      console.log = originalLog;
      await server.close();
    }
  });
});
