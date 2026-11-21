/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structured request logging.
 *
 * ## What the previous version produced
 *
 *     [ural] GET /api/health 200 6.1ms id=4f976c64-…
 *
 * Readable, and useless to a log aggregator: no level field to filter on, no
 * parseable duration, no separator between the message and its metadata. Loki or
 * Elasticsearch would store it as one opaque string, and every query would need a
 * regex.
 *
 * One JSON object per line changes that: `level`, `msg`, `requestId` and
 * `durationMs` are addressable, so "show me 5xx over 500 ms from the last hour"
 * is a query rather than a grep.
 *
 * ## Why not pino or winston
 *
 * The requirement is `JSON.stringify` plus a level. `pino` brings transports,
 * serialisers and a worker thread — worth it in a service with many log sites,
 * not in one that logs requests and a handful of warnings. The shape below is
 * deliberately pino-compatible (`level` as a string, `time` as ISO), so swapping
 * the implementation later does not break dashboards.
 */

import type { NextFunction, Request, Response } from 'express';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** One log record. Extra fields are spread in, so callers add context freely. */
export interface LogRecord {
  level: LogLevel;
  time: string;
  msg: string;
  [key: string]: unknown;
}

export interface LoggerOptions {
  /** Where records go. Replaced in tests to capture instead of print. */
  sink?: (line: string) => void;
  /** Minimum level to emit. */
  level?: LogLevel;
  /** Base fields added to every record, e.g. service name. */
  base?: Record<string, unknown>;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const sink = options.sink ?? ((line: string) => console.log(line));
  const minimum = LEVEL_ORDER[options.level ?? 'info'];
  const base = options.base ?? {};

  const emit = (level: LogLevel, msg: string, fields?: Record<string, unknown>): void => {
    if (LEVEL_ORDER[level] < minimum) return;
    const record: LogRecord = {
      level,
      time: new Date().toISOString(),
      msg,
      ...base,
      ...fields,
    };
    try {
      sink(JSON.stringify(record));
    } catch {
      // A circular field must not crash a request: fall back to a minimal record
      // rather than lose the line entirely.
      sink(JSON.stringify({ level, time: record.time, msg }));
    }
  };

  return {
    debug: (msg, fields) => emit('debug', msg, fields),
    info: (msg, fields) => emit('info', msg, fields),
    warn: (msg, fields) => emit('warn', msg, fields),
    error: (msg, fields) => emit('error', msg, fields),
  };
}

/**
 * Request logging middleware.
 *
 * Logs once on `finish`, so the record carries the real status rather than the
 * handler's intent. The route pattern is logged instead of the raw URL — the same
 * reason metrics use it: `/api/tokens/abc` would make every request a distinct
 * value in a query.
 */
export function createRequestLogger(logger: Logger) {
  return function requestLogger(req: Request, res: Response, next: NextFunction): void {
    // The scrape endpoint would otherwise log once per scrape interval forever.
    if (req.path === '/metrics') {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number((process.hrtime.bigint() - startedAt) / 1000n) / 1000;
      const level: LogLevel =
        res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      /*
       * The route label prefers the matched Express route over the raw path.
       *
       * `req.route.path` is only set when a route actually matched. Everything
       * else — static assets served by Vite in development, a 404 — has no route,
       * so using `req.path` there put `/src/data/content/stack.ts` and every other
       * asset filename into the logs. That is one distinct value per file per
       * request, which makes a log query over `route` useless and inflates the
       * same way a metric label would.
       *
       * Unmatched paths collapse to a coarse bucket instead: the extension for a
       * file, or `<unmatched>` for anything else.
       */
      let route = `${req.baseUrl ?? ''}${req.route?.path ?? ''}`;
      if (!req.route?.path) {
        const path = req.path;
        const match = /\.[a-z0-9]+$/i.exec(path);
        route = match ? `<static:${match[0].slice(1)}>` : '<unmatched>';
      }

      logger[level]('request', {
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        requestId: (req as Request & { requestId?: string }).requestId,
        // `ip` is the left-most forwarded address because the app trusts one proxy.
        ip: req.ip,
      });
    });

    next();
  };
}
