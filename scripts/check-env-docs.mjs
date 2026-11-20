/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CI gate: keeps `.env.example`, `README.md` and the code in agreement.
 *
 * Ported from the PSTU repository, where the check caught a variable that was
 * still documented long after the code stopped reading it — a deployer following
 * the docs would have set a value that did nothing.
 *
 * Three questions, each of which has cost real debugging time somewhere:
 *   1. Is every variable the code reads documented in `.env.example`?
 *   2. Is every documented variable actually read?
 *   3. Are the documented defaults the ones the code uses?
 *
 * Run:  node scripts/check-env-docs.mjs
 * Exit: 0 when consistent, 1 otherwise (so CI fails).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'scripts'];
const SCAN_FILES = ['server.ts', 'vite.config.ts'];

// Variables read only by tooling at build/dev time. They are legitimately absent
// from `.env.example`, which describes a deployment, not a developer's shell.
const TOOLING_ONLY = new Set(['DISABLE_HMR', 'NODE_ENV', 'CI']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'coverage', 'tests'].includes(entry.name)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))).concat(
  SCAN_FILES.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f))
);

/**
 * Strips comments before scanning. Without this, a doc comment that mentions
 * `process.env.X` as prose (there is one in `config.ts`) is reported as an
 * undocumented variable — a false positive that would train people to ignore the
 * gate.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const readPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

/**
 * Reads through a parameter rather than `process.env`.
 *
 * `providerConfigFromEnv(env = process.env)` does exactly that: the function
 * receives an environment bag so tests can pass one. Scanning only for
 * `process.env.X` would report every such variable as "documented but never
 * read" — a false positive that would push someone to delete correct docs, or to
 * stop trusting the gate.
 *
 * The pattern handles the two idioms in this codebase: `env.KEY` and
 * `env['KEY']`, where `env` is any identifier ending in `env`/`Env`.
 */
const paramEnvPattern = /\b\w*[eE]nv\b(?:\.([A-Z_][A-Z0-9_]*)|\['([A-Z_][A-Z0-9_]*)'\])/g;

const used = new Set();
for (const file of files) {
  const source = stripComments(fs.readFileSync(file, 'utf8'));
  for (const match of source.matchAll(readPattern)) {
    if (!TOOLING_ONLY.has(match[1])) used.add(match[1]);
  }
  for (const match of source.matchAll(paramEnvPattern)) {
    const name = match[1] ?? match[2];
    if (name && !TOOLING_ONLY.has(name)) used.add(name);
  }
}

const envExamplePath = path.join(ROOT, '.env.example');
if (!fs.existsSync(envExamplePath)) {
  console.error('FAIL: .env.example is missing.');
  process.exit(1);
}
const envExample = fs.readFileSync(envExamplePath, 'utf8');
const documented = new Set(
  [...envExample.matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)].map((m) => m[1])
);

const undocumented = [...used].filter((v) => !documented.has(v)).sort();
// `TOOLING_ONLY` variables are still legitimate entries in `.env.example` when
// they are documented (NODE_ENV is), so they are not stale just because the
// scanner skips them.
const stale = [...documented]
  .filter((v) => !used.has(v) && !TOOLING_ONLY.has(v))
  .sort();

// A documented value that disagrees with the code default is a silent trap: the
// deployer believes they are changing something.
const codeDefaults = new Map();
for (const file of files) {
  const source = stripComments(fs.readFileSync(file, 'utf8'));
  for (const match of source.matchAll(
    /process\.env\.([A-Z_][A-Z0-9_]*)\s*(?:\|\||\?\?)\s*'([^']*)'/g
  )) {
    if (!codeDefaults.has(match[1])) codeDefaults.set(match[1], match[2]);
  }
}
const mismatched = [];
for (const [key, defaultValue] of codeDefaults) {
  if (!documented.has(key)) continue;
  const line = envExample.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!line) continue;
  const documentedValue = line[1].trim().replace(/^["']|["']$/g, '');
  const normalizedDoc = documentedValue === '' ? '(empty)' : documentedValue;
  const normalizedCode = defaultValue === '' ? '(empty)' : defaultValue;
  if (normalizedDoc !== normalizedCode) {
    mismatched.push({ key, documented: normalizedDoc, code: normalizedCode });
  }
}

console.log(`read by code: ${used.size}, documented: ${documented.size}`);

console.log(`\nUNDOCUMENTED (read but absent from .env.example): ${undocumented.length}`);
for (const v of undocumented) console.log(`  ${v}`);

console.log(`\nSTALE (documented but never read): ${stale.length}`);
for (const v of stale) console.log(`  ${v}`);

console.log(`\nDEFAULT MISMATCH (.env.example vs code fallback): ${mismatched.length}`);
for (const m of mismatched) {
  console.log(`  ${m.key}: documented "${m.documented}" vs code "${m.code}"`);
}

const failed = undocumented.length > 0 || stale.length > 0 || mismatched.length > 0;
console.log(failed ? '\nFAIL: environment documentation is out of sync.' : '\nOK: environment documentation matches the code.');
process.exit(failed ? 1 : 0);
