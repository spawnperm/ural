/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prometheus metrics.
 *
 * ## Why `/api/health` was not enough
 *
 * Health answers "is it up?" with a JSON document. A scraper cannot compute a
 * rate from it: there is no counter to difference, no histogram to aggregate, and
 * the shape changes whenever someone adds a field. Prometheus needs the
 * exposition format — one line per series, labelled.
 *
 * ## Why no `prom-client`
 *
 * The format is a dozen lines of text. A library would add a dependency (and its
 * transitive tree) to render `name{label="value"} 42`. The trade-off flips when
 * histograms with quantiles or a registry with collectors are needed; until then
 * the explicit form is easier to review and impossible to break silently.
 *
 * ## What is measured and why these four
 *
 * - request count and duration by route and status — the two signals that answer
 *   "is the service healthy" before a user files a report;
 * - in-flight requests — the difference between "slow" and "stuck";
 * - move rejections on the board — a domain counter, because a rule that refuses
 *   constantly is either misconfigured or being probed.
 */

import type { NextFunction, Request, Response } from 'express';

type Labels = Record<string, string>;

interface Series {
  labels: Labels;
  value: number;
}

/**
 * A counter set, keyed by label tuple.
 *
 * Kept deliberately small: no persistence, no background flushing. Metrics reset
 * with the process, which is the Prometheus model — the scraper handles resets.
 */
export class MetricsRegistry {
  private readonly counters = new Map<string, Map<string, Series>>();
  /**
   * Histograms are keyed by metric name; each holds its own label sets.
   *
   * The first version keyed by `name{labels}` and then wrote the key out as the
   * series name, producing `lat{}_bucket{…}` — invalid exposition that Prometheus
   * rejects wholesale. The name and the labels must stay separate.
   */
  private readonly histograms = new Map<
    string,
    Map<string, { labels: Labels; buckets: number[]; counts: number[]; sum: number; count: number }>
  >();
  private inFlight = 0;

  private static keyOf(labels: Labels): string {
    // Stable ordering so two calls with the same labels share a series.
    return Object.keys(labels)
      .sort()
      .map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`)
      .join(',');
  }

  public increment(name: string, labels: Labels = {}, by = 1): void {
    let family = this.counters.get(name);
    if (!family) {
      family = new Map();
      this.counters.set(name, family);
    }
    const key = MetricsRegistry.keyOf(labels);
    const existing = family.get(key);
    if (existing) {
      existing.value += by;
    } else {
      family.set(key, { labels, value: by });
    }
  }

  public observe(
    name: string,
    seconds: number,
    labels: Labels = {},
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5]
  ): void {
    let family = this.histograms.get(name);
    if (!family) {
      family = new Map();
      this.histograms.set(name, family);
    }
    const key = MetricsRegistry.keyOf(labels);
    let entry = family.get(key);
    if (!entry) {
      entry = { labels, buckets, counts: buckets.map(() => 0), sum: 0, count: 0 };
      family.set(key, entry);
    }
    for (let i = 0; i < entry.buckets.length; i++) {
      if (seconds <= entry.buckets[i]!) entry.counts[i]! += 1;
    }
    entry.sum += seconds;
    entry.count += 1;
  }

  public enter(): void {
    this.inFlight += 1;
  }

  public leave(): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
  }

  public get activeRequests(): number {
    return this.inFlight;
  }

  /** Renders the Prometheus text exposition format. */
  public render(): string {
    const lines: string[] = [];

    for (const [name, family] of this.counters) {
      lines.push(`# TYPE ${name} counter`);
      for (const series of family.values()) {
        const labels = MetricsRegistry.keyOf(series.labels);
        lines.push(`${name}${labels ? `{${labels}}` : ''} ${series.value}`);
      }
    }

    for (const [name, family] of this.histograms) {
      lines.push(`# TYPE ${name} histogram`);
      for (const entry of family.values()) {
        const labels = MetricsRegistry.keyOf(entry.labels);

        for (let i = 0; i < entry.buckets.length; i++) {
          const le = entry.buckets[i]!;
          // `le` joins the series' own labels, separated by a comma when they exist.
          const full = labels ? `${labels},le="${le}"` : `le="${le}"`;
          lines.push(`${name}_bucket{${full}} ${entry.counts[i]}`);
        }

        const inf = labels ? `${labels},le="+Inf"` : 'le="+Inf"';
        lines.push(`${name}_bucket{${inf}} ${entry.count}`);
        lines.push(`${name}_sum${labels ? `{${labels}}` : ''} ${entry.sum.toFixed(6)}`);
        lines.push(`${name}_count${labels ? `{${labels}}` : ''} ${entry.count}`);
      }
    }

    lines.push('# TYPE http_requests_in_flight gauge');
    lines.push(`http_requests_in_flight ${this.inFlight}`);

    return `${lines.join('\n')}\n`;
  }

  public reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.inFlight = 0;
  }
}

export const metrics = new MetricsRegistry();

/**
 * Express middleware recording request count and duration.
 *
 * Labels use the matched route pattern, not the raw URL: `/api/git/status` and
 * `/api/tokens/abc` must not become unbounded series — the classic way to kill a
 * Prometheus instance from inside the application.
 */
export function createMetricsMiddleware(registry: MetricsRegistry = metrics) {
  return function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip the scrape endpoint itself, or each scrape would inflate the counter
    // it is measuring.
    if (req.path === '/metrics') {
      next();
      return;
    }

    registry.enter();
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      registry.leave();
      const seconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const route = req.route?.path ?? (req.baseUrl || '/');
      const labels = {
        method: req.method,
        route: `${req.baseUrl ?? ''}${route}`.replace(/\/+/g, '/'),
        status: String(res.statusCode),
      };
      registry.increment('http_requests_total', labels);
      registry.observe('http_request_duration_seconds', seconds, {
        method: labels.method,
        route: labels.route,
      });
    });

    next();
  };
}

/** Handler serving the registry in the exposition format. */
export function metricsHandler(registry: MetricsRegistry = metrics) {
  return (_req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(registry.render());
  };
}
