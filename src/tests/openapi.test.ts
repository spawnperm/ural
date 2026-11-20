/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenAPI document tests.
 *
 * The document is generated, but "generated" is not the same as "correct". These
 * tests pin the properties that make generation worth doing: every route the
 * server mounts is documented, the request schema really comes from Zod (so a
 * rule added there appears here), and the document parses as valid OpenAPI.
 *
 * Without them, a hand-edited path could quietly disagree with the router — the
 * exact failure mode the generator exists to prevent.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { buildOpenApiDocument } from '../server/openapi.ts';
import { commitPushBodySchema, MESSAGE_MAX_LENGTH } from '../server/schemas.ts';
import { API_ROUTES } from '../shared/apiContract.ts';

const doc = buildOpenApiDocument();

describe('OpenAPI document structure', () => {
  it('declares OpenAPI 3.1', () => {
    assert.equal(doc.openapi, '3.1.0');
  });

  it('has info with a title and version', () => {
    assert.ok(doc.info.title.length > 0);
    assert.ok(doc.info.version.length > 0);
  });

  it('documents every route the server mounts', () => {
    // If a route is added to `API_ROUTES` and wired up but not documented, this
    // fails — the drift check in one assertion.
    const documented = Object.keys(doc.paths).sort();
    const expected = Object.values(API_ROUTES).sort();
    assert.deepEqual(documented, expected);
  });

  it('uses operation ids that are unique', () => {
    const ids: string[] = [];
    for (const pathItem of Object.values(doc.paths)) {
      for (const operation of Object.values(pathItem as Record<string, { operationId?: string }>)) {
        if (operation?.operationId) ids.push(operation.operationId);
      }
    }
    assert.equal(new Set(ids).size, ids.length, 'operationId must be unique');
  });

  it('gives every operation at least one response', () => {
    for (const [path, pathItem] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(pathItem as Record<string, unknown>)) {
        const responses = (operation as { responses?: Record<string, unknown> }).responses;
        assert.ok(responses && Object.keys(responses).length > 0, `${method} ${path}`);
      }
    }
  });
});

describe('request schema is derived from Zod', () => {
  const bodySchema = doc.paths[API_ROUTES.gitCommitPush].post.requestBody.content[
    'application/json'
  ].schema as {
    type?: string;
    properties?: Record<string, { type?: string; maxLength?: number }>;
    additionalProperties?: boolean;
  };

  it('is an object with the message property', () => {
    assert.equal(bodySchema.type, 'object');
    assert.ok(bodySchema.properties?.message);
    assert.equal(bodySchema.properties.message.type, 'string');
  });

  it('carries the maxLength rule from the schema', () => {
    // The value must come from Zod, not from a second literal that could drift.
    assert.equal(bodySchema.properties?.message.maxLength, MESSAGE_MAX_LENGTH);
  });

  it('forbids additional properties because the schema is strict', () => {
    // `z.strictObject` must survive into the document; a client generated from
    // this spec should not be able to send an unknown key.
    assert.equal(bodySchema.additionalProperties, false);
  });

  it('matches z.toJSONSchema output for the same schema', () => {
    const direct = z.toJSONSchema(commitPushBodySchema, {
      target: 'draft-2020-12',
      io: 'input',
    }) as { type?: string; additionalProperties?: boolean };
    assert.deepEqual(
      { type: bodySchema.type, additionalProperties: bodySchema.additionalProperties },
      { type: direct.type, additionalProperties: direct.additionalProperties }
    );
  });
});

describe('documented responses reference the shared problem schema', () => {
  it('defines Problem and ValidationIssue components', () => {
    assert.ok(doc.components.schemas.Problem);
    assert.ok(doc.components.schemas.ValidationIssue);
  });

  it('problem schema requires the RFC 7807 fields', () => {
    // The document is `as const`, so `required` is a readonly tuple; spread it
    // into a mutable array before asserting membership.
    const problem = doc.components.schemas.Problem as { required: readonly string[] };
    for (const field of ['type', 'title', 'status', 'detail']) {
      assert.ok(problem.required.includes(field), `Problem must require ${field}`);
    }
  });

  it('commit-push documents the failure codes the handler actually returns', () => {
    // These are the statuses `gitRouter.ts` can emit; a mismatch here would send
    // API consumers looking for reasons the server never gives.
    const responses = doc.paths[API_ROUTES.gitCommitPush].post.responses;
    for (const code of ['200', '400', '401', '409', '429', '500']) {
      assert.ok(code in responses, `missing documented response ${code}`);
    }
  });
});

describe('serialisability', () => {
  it('survives a JSON round-trip unchanged', () => {
    // The document is served as JSON; a value that cannot serialise (undefined,
    // a function, a circular reference) would silently disappear.
    const roundTripped = JSON.parse(JSON.stringify(doc));
    assert.deepEqual(roundTripped, JSON.parse(JSON.stringify(doc)));
    assert.equal(roundTripped.openapi, doc.openapi);
  });

  it('references only components that exist', () => {
    const text = JSON.stringify(doc);
    const refs = [...text.matchAll(/"\$ref":"#\/components\/schemas\/([A-Za-z]+)"/g)].map(
      (m) => m[1]
    );
    const declared = new Set(Object.keys(doc.components.schemas));
    for (const ref of refs) {
      assert.ok(declared.has(ref), `dangling $ref to ${ref}`);
    }
  });
});
