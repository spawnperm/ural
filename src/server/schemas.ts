/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Zod schemas: the single source of truth for API request shapes.
 *
 * Why Zod instead of hand-written guards: the previous `validate.ts` maintained
 * validation logic, issue formatting and the matching TypeScript interface by
 * hand. Three artefacts that must agree, and nothing enforced agreement — a
 * field added to the guard could be forgotten in the type.
 *
 * Now the schema produces both. `z.infer` gives the TypeScript type, and the
 * runtime check is the same object, so they cannot drift.
 *
 * This also matches the architecture the portal documents itself:
 * `src/data/projectDocs.ts` names Zod as the contract layer for the quest
 * system (`@perm-krai/shared-types`). Using it here keeps the portal's own code
 * consistent with the stack it describes.
 */

import { z } from 'zod';

/** Shared limits, mirrored into the docs and the UI (`maxLength` on the input). */
export const MESSAGE_MAX_LENGTH = 200;

/**
 * Request body for `POST /api/git/commit-push`.
 *
 * `strictObject` rather than `object`: unknown keys are rejected, because a typo
 * such as `mesage` would otherwise commit with the default message while the
 * user believes their text was applied.
 */
export const commitPushBodySchema = z.strictObject(
  {
    message: z
      .string({ error: 'Сообщение коммита должно быть строкой.' })
      .max(MESSAGE_MAX_LENGTH, {
        error: `Сообщение коммита длиннее ${MESSAGE_MAX_LENGTH} символов.`,
      })
      .optional(),
  },
  { error: 'Тело запроса должно быть JSON-объектом.' }
);

export type CommitPushBody = z.infer<typeof commitPushBodySchema>;
