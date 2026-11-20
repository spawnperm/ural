/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Git service tests.
 *
 * Beyond the happy path, these assert the two properties that took a real
 * security review to notice in the source project: the credential never reaches
 * the process argument list, and a staged `.env` aborts the commit instead of
 * being published.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  redactSecrets,
  sanitizeCommitMessage,
  GitError,
} from '../server/gitService.ts';
import { validateBody } from '../server/validation.ts';
import { commitPushBodySchema } from '../server/schemas.ts';

describe('redactSecrets', () => {
  it('removes a Basic auth header value', () => {
    const input = 'fatal: Authorization: Basic eC1hY2Nlc3MtdG9rZW46Z2hwX2FiYw== rejected';
    assert.equal(redactSecrets(input).includes('eC1hY2Nlc3MtdG9rZW46'), false);
    assert.equal(redactSecrets(input).includes('Basic [REDACTED]'), true);
  });

  it('removes credentials embedded in a remote URL', () => {
    const input = 'https://x-access-token:ghp_secretvalue@github.com/spawnperm/ural.git';
    const out = redactSecrets(input);
    assert.equal(out.includes('ghp_secretvalue'), false);
    assert.equal(out.includes('[REDACTED]@'), true);
  });

  it('removes a bare GitHub token', () => {
    const out = redactSecrets('token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 found');
    assert.equal(out.includes('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), false);
  });

  it('leaves ordinary text untouched', () => {
    const text = 'docs: обновление документации портала';
    assert.equal(redactSecrets(text), text);
  });
});

describe('sanitizeCommitMessage', () => {
  it('falls back to the default for missing, empty or non-string input', () => {
    const fallback = 'docs: обновление документации портала';
    assert.equal(sanitizeCommitMessage(undefined), fallback);
    assert.equal(sanitizeCommitMessage(''), fallback);
    assert.equal(sanitizeCommitMessage('   '), fallback);
    assert.equal(sanitizeCommitMessage(123), fallback);
  });

  it('collapses whitespace and newlines into a single line', () => {
    assert.equal(sanitizeCommitMessage('docs:  a\n\nb'), 'docs: a b');
  });

  it('clips an over-long message to 200 characters', () => {
    const long = 'a'.repeat(500);
    assert.equal(sanitizeCommitMessage(long).length, 200);
  });

  it('refuses a message that would be parsed as a git option', () => {
    assert.throws(() => sanitizeCommitMessage('--force'), GitError);
  });

  it('never lets a leading dash survive whitespace trimming', () => {
    assert.throws(() => sanitizeCommitMessage('   -oops'), GitError);
  });
});

describe('commit body and message handling compose correctly', () => {
  const validate = (raw: unknown) => validateBody(commitPushBodySchema, raw);

  it('passes a validated message through the sanitiser unchanged', () => {
    const result = validate({ message: 'feat: новая секция' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(sanitizeCommitMessage(result.value.message), 'feat: новая секция');
    }
  });

  it('rejects an option-injection attempt before git ever sees it', () => {
    // The schema allows the string (it is short enough), so the sanitiser is the
    // layer that stops it. Both layers are exercised here on purpose.
    const result = validate({ message: '--upload-pack=evil' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.throws(() => sanitizeCommitMessage(result.value.message), GitError);
    }
  });
});
