/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generates `docs/API.md` from the OpenAPI document.
 *
 * ## Why generated
 *
 * The specification is already derived from the Zod schemas, but `docs/API.md` was
 * hand-written prose beside it — the same drift the schemas were meant to remove,
 * one layer up. A hand-written table of routes is correct until the first route
 * change and stale forever after.
 *
 * The script writes the whole file, banner first, so nobody edits it by accident:
 * a change made here is overwritten on the next run, which is the correct
 * outcome for generated content.
 *
 * Run:  pnpm run docs:api
 * Check: `--check` exits non-zero when the file on disk disagrees (used in CI).
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildOpenApiDocument } from '../src/server/openapi.ts';

interface Operation {
  tags?: readonly string[];
  summary?: string;
  description?: string;
  operationId?: string;
  requestBody?: {
    content?: Record<string, { schema?: unknown; example?: unknown }>;
  };
  responses?: Record<string, { description?: string }>;
}

const doc = buildOpenApiDocument();

const METHOD_ORDER = ['get', 'post', 'put', 'patch', 'delete'];

const lines: string[] = [];

lines.push('<!-- СГЕНЕРИРОВАНО: не редактируйте вручную. -->');
lines.push('<!-- Источник: src/server/openapi.ts → buildOpenApiDocument(). -->');
lines.push('<!-- Пересоздать: pnpm run docs:api -->');
lines.push('');
lines.push('# API');
lines.push('');
lines.push(doc.info.description);
lines.push('');
lines.push(`**Версия:** ${doc.info.version} · **OpenAPI:** ${doc.openapi}`);
lines.push('');
lines.push('Интерактивная версия: `/api/docs` (Scalar). Машиночитаемая: `/api/openapi.json`.');
lines.push('');

// --- Route index -------------------------------------------------------------
lines.push('## Маршруты');
lines.push('');
lines.push('| Метод | Путь | Назначение |');
lines.push('|---|---|---|');

const rows: Array<{ method: string; pathName: string; op: Operation }> = [];
for (const [pathName, item] of Object.entries(doc.paths)) {
  // `as const` in the builder makes every field readonly; widen through unknown
  // rather than scattering `any` over the generator.
  const pathItem = item as unknown as Record<string, Operation>;
  for (const method of METHOD_ORDER) {
    const op = pathItem[method];
    if (op) rows.push({ method, pathName, op });
  }
}
for (const row of rows) {
  lines.push(`| \`${row.method.toUpperCase()}\` | \`${row.pathName}\` | ${row.op.summary ?? ''} |`);
}
lines.push('');

// --- Per-route detail --------------------------------------------------------
lines.push('## Подробности');
lines.push('');

for (const { method, pathName, op } of rows) {
  lines.push(`### \`${method.toUpperCase()} ${pathName}\``);
  lines.push('');
  if (op.summary) {
    lines.push(`**${op.summary}**`);
    lines.push('');
  }
  if (op.description) {
    lines.push(op.description);
    lines.push('');
  }

  const body = op.requestBody?.content?.['application/json'];
  if (body?.schema) {
    lines.push('**Тело запроса** (`application/json`):');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(body.schema, null, 2));
    lines.push('```');
    lines.push('');
    if (body.example !== undefined) {
      lines.push('Пример:');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(body.example, null, 2));
      lines.push('```');
      lines.push('');
    }
  }

  lines.push('**Ответы:**');
  lines.push('');
  lines.push('| Код | Описание |');
  lines.push('|---|---|');
  for (const [status, response] of Object.entries(op.responses ?? {})) {
    lines.push(`| \`${status}\` | ${response.description ?? ''} |`);
  }
  lines.push('');
}

// --- Shared error shape ------------------------------------------------------
lines.push('## Формат ошибок');
lines.push('');
lines.push('Все ошибки — `application/problem+json` (RFC 7807):');
lines.push('');
lines.push('```json');
lines.push(JSON.stringify((doc.components.schemas as Record<string, unknown>).Problem, null, 2));
lines.push('```');
lines.push('');

const content = `${lines.join('\n')}\n`;

const target = path.resolve(process.cwd(), 'docs/API.md');

if (process.argv.includes('--check')) {
  const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (existing !== content) {
    console.error('docs/API.md устарел. Запустите: pnpm run docs:api');
    process.exit(1);
  }
  console.log('docs/API.md актуален.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, content, 'utf8');
console.log(`docs/API.md обновлён: ${rows.length} маршрутов.`);
