/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Input validation for the write API.
 *
 * Hand-rolled rather than a schema library because the surface is one field
 * wide: pulling Joi or Zod in for a single optional string would add a
 * dependency and a bundle decision for no benefit. The shape of the result
 * mirrors what a schema validator returns, so swapping one in later is a local
 * change inside this file.
 *
 * Ported from the PSTU server's `validateRequest` middleware, keeping its two
 * useful properties: the caller gets every issue at once (`abortEarly: false`),
 * and the returned value is the sanitised one, never the raw input.
 */

export interface ValidationIssue {
  field: string;
  message: string;
  type: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; details: ValidationIssue[] };

export interface CommitPushBody {
  message?: string;
}

const MAX_MESSAGE_LENGTH = 200;
const MAX_BODY_BYTES = 4 * 1024;

export function validateCommitPushBody(raw: unknown): ValidationResult<CommitPushBody> {
  const issues: ValidationIssue[] = [];

  if (raw !== undefined && raw !== null && typeof raw !== 'object') {
    return {
      ok: false,
      error: 'Тело запроса должно быть JSON-объектом.',
      details: [
        { field: 'body', message: 'Ожидался объект.', type: 'object.base' },
      ],
    };
  }

  const body = (raw ?? {}) as Record<string, unknown>;
  const value: CommitPushBody = {};

  const message = body.message;
  if (message !== undefined && message !== null) {
    if (typeof message !== 'string') {
      issues.push({
        field: 'body.message',
        message: 'Сообщение коммита должно быть строкой.',
        type: 'string.base',
      });
    } else if (message.length > MAX_MESSAGE_LENGTH) {
      issues.push({
        field: 'body.message',
        message: `Сообщение коммита длиннее ${MAX_MESSAGE_LENGTH} символов.`,
        type: 'string.max',
      });
    } else {
      value.message = message;
    }
  }

  // Unknown keys are rejected rather than ignored: a typo such as `mesage`
  // would otherwise silently commit with the default text.
  for (const key of Object.keys(body)) {
    if (key !== 'message') {
      issues.push({
        field: `body.${key}`,
        message: `Неизвестное поле «${key}».`,
        type: 'object.unknown',
      });
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      error: issues.map((i) => i.message).join('; '),
      details: issues,
    };
  }

  return { ok: true, value };
}

/** Guard for the JSON body parser: refuse oversized payloads before parsing. */
export function isBodyWithinLimit(rawLength: number | undefined): boolean {
  return rawLength === undefined || rawLength <= MAX_BODY_BYTES;
}

export const VALIDATION_LIMITS = {
  maxMessageLength: MAX_MESSAGE_LENGTH,
  maxBodyBytes: MAX_BODY_BYTES,
} as const;
