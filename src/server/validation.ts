/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Request validation adapter.
 *
 * Thin layer between Zod and the HTTP handler. It exists so that route handlers
 * never touch Zod's own error objects: the rest of the app speaks one shape,
 * `ValidationResult`, which maps 1:1 onto RFC 7807 `details` entries.
 *
 * Deliberately small. When this project had hand-written guards, this file was
 * ~100 lines of field-by-field checks; with Zod the rules live in `schemas.ts`
 * and only the translation remains here.
 */

import type { z } from 'zod';

export interface ValidationIssue {
  field: string;
  message: string;
  type: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; details: ValidationIssue[] };

/**
 * Maximum accepted request body, enforced before parsing.
 *
 * The portal has no upload surface; 4 KB is already generous for a commit
 * message and keeps a malicious client from making the server allocate a large
 * JSON buffer.
 */
export const MAX_BODY_BYTES = 4 * 1024;

/**
 * Maps a Zod issue path to the field name clients see.
 *
 * Zod puts unrecognised keys in `issue.keys` and leaves `path` empty, so the
 * offending field names have to be recovered explicitly — otherwise a typo in
 * `message` would report only "body" and the user would not know which key was
 * wrong.
 */
function fieldForIssue(issue: z.core.$ZodIssue): string {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((key) => `body.${key}`).join(', ');
  }
  // An empty path means the failure is the payload itself (a bare string, an
  // array), not one of its fields — reporting `body.body` would be nonsense.
  if (issue.path.length === 0) {
    return 'body';
  }
  return `body.${issue.path.join('.')}`;
}

/**
 * Validates a payload against a schema, returning the parsed value rather than
 * the raw input — coerced and stripped values must be what the handler uses.
 */
export function validateBody<T>(schema: z.ZodType<T>, raw: unknown): ValidationResult<T> {
  /*
   * An absent body is an empty body, not a type error.
   *
   * Express leaves `req.body` as `undefined` when no JSON content-type was sent,
   * so a client that POSTs without a body (a legitimate "use the defaults" call)
   * would otherwise be rejected by an object schema. Normalising here keeps that
   * distinction out of every route.
   */
  const payload = raw === undefined || raw === null ? {} : raw;
  const parsed = schema.safeParse(payload);

  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }

  const details: ValidationIssue[] = [];
  for (const issue of parsed.error.issues) {
    const field = fieldForIssue(issue);

    // An unrecognised-keys issue can name several keys; emit one detail per key
    // so a client can highlight each input independently.
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        details.push({
          field: `body.${key}`,
          message: `Неизвестное поле «${key}».`,
          type: 'unrecognized_keys',
        });
      }
      continue;
    }

    details.push({ field, message: issue.message, type: issue.code });
  }

  return {
    ok: false,
    error: details.map((detail) => detail.message).join('; '),
    details,
  };
}

/** Guard for the JSON body parser: refuse oversized payloads before parsing. */
export function isBodyWithinLimit(rawLength: number | undefined): boolean {
  return rawLength === undefined || rawLength <= MAX_BODY_BYTES;
}
