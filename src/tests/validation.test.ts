/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validation tests.
 *
 * These cover the branches that matter for a security-adjacent endpoint: what is
 * accepted, what is rejected, and that the *sanitised* value is what callers
 * receive.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isBodyWithinLimit,
  validateCommitPushBody,
  VALIDATION_LIMITS,
} from '../server/validation.ts';

describe('validateCommitPushBody', () => {
  it('accepts an empty body and returns no message', () => {
    const result = validateCommitPushBody({});
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.message, undefined);
    }
  });

  it('accepts undefined and null bodies', () => {
    assert.equal(validateCommitPushBody(undefined).ok, true);
    assert.equal(validateCommitPushBody(null).ok, true);
  });

  it('keeps a valid message', () => {
    const result = validateCommitPushBody({ message: 'docs: обновление' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.message, 'docs: обновление');
    }
  });

  it('rejects a non-string message', () => {
    const result = validateCommitPushBody({ message: 42 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details[0]?.field, 'body.message');
      assert.equal(result.details[0]?.type, 'string.base');
    }
  });

  it('rejects a message longer than the limit', () => {
    const result = validateCommitPushBody({
      message: 'x'.repeat(VALIDATION_LIMITS.maxMessageLength + 1),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details[0]?.type, 'string.max');
    }
  });

  it('accepts a message exactly at the limit', () => {
    const result = validateCommitPushBody({
      message: 'x'.repeat(VALIDATION_LIMITS.maxMessageLength),
    });
    assert.equal(result.ok, true);
  });

  it('rejects unknown fields instead of ignoring them', () => {
    // A typo like `mesage` must fail loudly, otherwise the commit silently uses
    // the default message and the user believes their text was applied.
    const result = validateCommitPushBody({ mesage: 'typo' });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details[0]?.field, 'body.mesage');
      assert.equal(result.details[0]?.type, 'object.unknown');
    }
  });

  it('reports every issue at once', () => {
    const result = validateCommitPushBody({ message: 1, extra: true });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details.length, 2);
    }
  });

  it('rejects a non-object body', () => {
    const result = validateCommitPushBody('just a string');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details[0]?.type, 'object.base');
    }
  });
});

describe('isBodyWithinLimit', () => {
  it('accepts an unknown length', () => {
    assert.equal(isBodyWithinLimit(undefined), true);
  });

  it('accepts a body at the limit and rejects one above it', () => {
    assert.equal(isBodyWithinLimit(VALIDATION_LIMITS.maxBodyBytes), true);
    assert.equal(isBodyWithinLimit(VALIDATION_LIMITS.maxBodyBytes + 1), false);
  });
});
