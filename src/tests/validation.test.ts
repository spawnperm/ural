/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validation tests.
 *
 * These cover the branches that matter for a security-adjacent endpoint: what is
 * accepted, what is rejected, and that the sanitised value is what callers
 * receive. The rules now come from Zod schemas, so the tests assert the adapter
 * contract (`ValidationResult` + RFC 7807-compatible `details`), not Zod
 * internals — swapping the validator again should not require rewriting them.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isBodyWithinLimit, MAX_BODY_BYTES, validateBody } from '../server/validation.ts';
import { commitPushBodySchema, MESSAGE_MAX_LENGTH } from '../server/schemas.ts';

const validate = (raw: unknown) => validateBody(commitPushBodySchema, raw);

describe('commitPush body validation', () => {
  it('accepts an empty body and returns no message', () => {
    const result = validate({});
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.message, undefined);
    }
  });

  it('accepts undefined and null bodies', () => {
    assert.equal(validate(undefined).ok, true);
    assert.equal(validate(null).ok, true);
  });

  it('keeps a valid message', () => {
    const result = validate({ message: 'docs: обновление' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.message, 'docs: обновление');
    }
  });

  it('rejects a non-string message', () => {
    const result = validate({ message: 42 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details[0]?.field, 'body.message');
      assert.match(result.details[0]?.message ?? '', /строкой/);
    }
  });

  it('rejects a message longer than the limit', () => {
    const result = validate({ message: 'x'.repeat(MESSAGE_MAX_LENGTH + 1) });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details[0]?.field, 'body.message');
      assert.match(result.details[0]?.message ?? '', new RegExp(String(MESSAGE_MAX_LENGTH)));
    }
  });

  it('accepts a message exactly at the limit', () => {
    assert.equal(validate({ message: 'x'.repeat(MESSAGE_MAX_LENGTH) }).ok, true);
  });

  it('rejects unknown fields instead of ignoring them', () => {
    // A typo like `mesage` must fail loudly, otherwise the commit silently uses
    // the default message and the user believes their text was applied.
    const result = validate({ mesage: 'typo' });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details[0]?.field, 'body.mesage');
      assert.equal(result.details[0]?.type, 'unrecognized_keys');
      assert.match(result.details[0]?.message ?? '', /mesage/);
    }
  });

  it('emits one detail per unknown key', () => {
    // Zod reports all unrecognised keys in a single issue; the adapter expands it
    // so a client can highlight each input separately.
    const result = validate({ mesage: 'a', extra: true });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details.length, 2);
      const fields = result.details.map((d) => d.field).sort();
      assert.deepEqual(fields, ['body.extra', 'body.mesage']);
    }
  });

  it('reports every issue at once', () => {
    const result = validate({ message: 1, extra: true });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details.length, 2);
      assert.match(result.error, /строкой/);
      assert.match(result.error, /extra/);
    }
  });

  it('rejects a non-object body', () => {
    const result = validate('just a string');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.details[0]?.field, 'body');
      assert.match(result.details[0]?.message ?? '', /JSON-объектом/);
    }
  });

  it('returns the parsed value, not the raw input', () => {
    // The handler must act on what was validated; passing the original object
    // would let a value the schema silently dropped reach the code.
    const raw = { message: 'docs: ok' };
    const result = validate(raw);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.notEqual(result.value, raw);
      assert.deepEqual(result.value, { message: 'docs: ok' });
    }
  });
});

describe('isBodyWithinLimit', () => {
  it('accepts an unknown length', () => {
    assert.equal(isBodyWithinLimit(undefined), true);
  });

  it('accepts a body at the limit and rejects one above it', () => {
    assert.equal(isBodyWithinLimit(MAX_BODY_BYTES), true);
    assert.equal(isBodyWithinLimit(MAX_BODY_BYTES + 1), false);
  });
});

describe('schema-derived types', () => {
  it('derives the commit body type from the schema', () => {
    // Compile-time assertion: if `commitPushBodySchema` stops declaring
    // `message`, this object literal fails to typecheck rather than silently
    // becoming `unknown`.
    const body: import('../server/schemas.ts').CommitPushBody = { message: 'docs: типы' };
    assert.equal(body.message, 'docs: типы');
  });
});
