/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth bounded context: roles, permissions and the field-masking rule.
 *
 * ## Scope
 *
 * `BOUNDED_CONTEXTS` names this context "Пользователи и роли" with aggregates
 * `User` and `Role`, and `CONTEXT_RELATIONS` calls it a **Shared Kernel** —
 * every other context depends on it. This module implements the part the portal
 * actually documents and can enforce: the role catalogue and the collection
 * permission matrix.
 *
 * ## The rule that makes this worth modelling
 *
 * `RBAC_SECURITY_RULES` in `projectDocs.ts` states:
 *
 * > "User не может читать поле `correct` в question_sets.questions. Поле маскируется
 * > для роли User; проверка ответов выполняется воркером."
 *
 * That is a field-level restriction, and it is exactly the kind of rule that gets
 * lost when permissions are a UI table: nothing stops a serializer from returning
 * the whole row. Here the matrix is data, and `mayReadField` answers it, so a
 * handler can be tested against the same source the documentation shows.
 */

import { DomainError } from '../invitations/valueObjects.ts';

/** Roles, as named in `RBAC_ROLES`. Keys are the UI's compact form. */
export const ROLE_KEYS = ['Guest', 'User', 'Content Mgr', 'Event Mgr', 'Admin'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** Human labels, matching `RBAC_ROLES[].label`. */
export const ROLE_LABELS: Record<RoleKey, string> = {
  Guest: 'Guest',
  User: 'User',
  'Content Mgr': 'Content Manager',
  'Event Mgr': 'Event Manager',
  Admin: 'Admin',
};

/**
 * Permission cell.
 *
 * The matrix encodes capabilities as strings (`'R (published)'`, `'CRUD'`, `'—'`).
 * Parsing them into flags makes the values comparable and typo-proof: a cell
 * spelled `'RUD'` or `'CRUd'` throws at construction instead of silently granting
 * nothing.
 */
export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  /**
   * Scope qualifier from the matrix, e.g. `published` or `active`. `null` means
   * unrestricted reading of every row.
   */
  readScope: string | null;
  /**
   * Named non-CRUD operations granted by the cell.
   *
   * The documentation's matrix is not purely CRUD: `invitations` carries
   * `R + redeem`, because redeeming is a domain action rather than an update.
   * Keeping such grants explicit (instead of folding them into `update`) means
   * the API can require exactly `redeem` and not accidentally allow a general
   * update of the row.
   */
  operations: readonly string[];
}

/**
 * Parses a matrix cell into permission flags.
 *
 * Accepted forms, all present in the documentation's matrix:
 *   `'CRUD'`, `'R'`, `'—'`, `'R (published)'`, `'CRUD (own)'`, `'R + redeem'`
 *
 * The parenthesised part is a scope, kept verbatim for display and compared
 * case-insensitively by callers that need it. A `+ name` suffix is a named
 * operation, collected in `operations`.
 */
export function parsePermission(cell: string): Permission {
  const trimmed = cell.trim();
  if (trimmed === '' || trimmed === '—' || trimmed === '-') {
    return {
      create: false,
      read: false,
      update: false,
      delete: false,
      readScope: null,
      operations: [],
    };
  }

  /*
   * Shape: `<CRUD ops>[ (<scope>)][ + <operation>]`
   *
   * Written as one regex deliberately — the previous version accepted only the
   * first two parts and threw on `R + redeem`, which is real data. Discovering
   * that from a failing test is better than discovering it from a runtime error
   * in the UI, but the parser should have covered the documented set at once.
   */
  const match = /^([CRUD]+)\s*(?:\(([^)]*)\))?\s*(?:\+\s*([a-z][a-z0-9_-]*))?$/i.exec(trimmed);
  if (!match) {
    throw new DomainError(
      `Некорректная ячейка матрицы прав: «${cell}». Ожидается CRUD-набор, «—», «R (область)» или «R + операция».`,
      'PERMISSION_INVALID'
    );
  }

  const ops = (match[1] ?? '').toUpperCase();
  // Reject duplicates like 'RR' — harmless, but almost always a typo.
  if (new Set(ops).size !== ops.length) {
    throw new DomainError(`Повторяющиеся операции в ячейке «${cell}».`, 'PERMISSION_DUPLICATE_OPS');
  }

  const operation = match[3]?.trim().toLowerCase();

  return {
    create: ops.includes('C'),
    read: ops.includes('R'),
    update: ops.includes('U'),
    delete: ops.includes('D'),
    readScope: match[2]?.trim() || null,
    operations: operation ? [operation] : [],
  };
}

export interface CollectionPermissions {
  collection: string;
  byRole: Record<RoleKey, Permission>;
}

/**
 * Builds the matrix from the documentation's shape.
 *
 * Fails if a collection's cell is missing a role: an omitted role used to read as
 * `undefined` and would have been treated as "no permission" silently, which is
 * correct by accident rather than by design.
 */
export function buildPermissionMatrix(
  rows: Array<{ collection: string; permissions: Record<RoleKey, string> }>
): Map<string, CollectionPermissions> {
  const matrix = new Map<string, CollectionPermissions>();

  for (const row of rows) {
    if (matrix.has(row.collection)) {
      throw new DomainError(`Коллекция «${row.collection}» описана дважды.`, 'MATRIX_DUPLICATE');
    }
    const byRole = {} as Record<RoleKey, Permission>;
    for (const role of ROLE_KEYS) {
      const cell = row.permissions[role];
      if (cell === undefined) {
        throw new DomainError(
          `Коллекция «${row.collection}»: для роли «${role}» не заданы права.`,
          'MATRIX_MISSING_ROLE'
        );
      }
      byRole[role] = parsePermission(cell);
    }
    matrix.set(row.collection, { collection: row.collection, byRole });
  }

  return matrix;
}

/**
 * Field-level restrictions that the collection matrix cannot express.
 *
 * A single entry today — `question_sets.correct` hidden from `User` — but the
 * shape is general: a later rule (masking another field, or for another role)
 * needs only a new row.
 */
export interface FieldRestriction {
  collection: string;
  field: string;
  /** Roles allowed to see the field. Everyone else gets it masked away. */
  visibleTo: readonly RoleKey[];
  /** Why the restriction exists, quoted from the documentation. */
  rationale: string;
}

export const FIELD_RESTRICTIONS: readonly FieldRestriction[] = [
  {
    collection: 'question_sets',
    field: 'correct',
    visibleTo: ['Content Mgr', 'Admin'],
    rationale:
      'User не может читать поле correct в question_sets.questions. Поле маскируется для роли User; проверка ответов выполняется воркером. (§6, RBAC_SECURITY_RULES)',
  },
];

export interface FieldVisibility {
  visible: boolean;
  reason: string;
}

/**
 * Answers whether a role may read a field.
 *
 * Returns the reason as well as the boolean: a surprising 403 in the field is far
 * cheaper to debug when the rule that caused it can be quoted.
 */
export function mayReadField(
  role: RoleKey,
  collection: string,
  field: string,
  restrictions: readonly FieldRestriction[] = FIELD_RESTRICTIONS
): FieldVisibility {
  const restriction = restrictions.find(
    (r) => r.collection === collection && r.field === field
  );
  if (!restriction) {
    return { visible: true, reason: `Поле ${collection}.${field} не ограничено.` };
  }
  if (restriction.visibleTo.includes(role)) {
    return {
      visible: true,
      reason: `Роль «${ROLE_LABELS[role]}» входит в список видимых для ${collection}.${field}.`,
    };
  }
  return { visible: false, reason: restriction.rationale };
}

/**
 * Strips restricted fields from a record for a given role.
 *
 * The function a serializer calls. Kept pure and generic over the record shape so
 * it can be used before the row leaves the server — masking in the UI would be
 * too late, since the payload already contains the answer.
 */
export function maskFields<T extends Record<string, unknown>>(
  record: T,
  role: RoleKey,
  collection: string,
  restrictions: readonly FieldRestriction[] = FIELD_RESTRICTIONS
): Partial<T> {
  const result: Record<string, unknown> = { ...record };
  for (const restriction of restrictions) {
    if (restriction.collection !== collection) continue;
    if (mayReadField(role, collection, restriction.field, restrictions).visible) continue;
    // The key is removed rather than nulled: `undefined` serialises out of JSON,
    // while an explicit `null` advertises that a field exists.
    delete result[restriction.field];
  }
  return result as Partial<T>;
}
