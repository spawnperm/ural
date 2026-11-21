/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth context tests.
 *
 * The permission matrix and the field restriction are quoted from the project's
 * own documentation (`RBAC_MATRIX`, `RBAC_SECURITY_RULES`). These tests assert
 * the code agrees with that text — the whole point of putting the rules in one
 * place is that this agreement can be checked.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPermissionMatrix,
  mayReadField,
  maskFields,
  parsePermission,
  FIELD_RESTRICTIONS,
  ROLE_KEYS,
  ROLE_LABELS,
} from '../domain/auth/permissions.ts';
import { DomainError } from '../domain/invitations/valueObjects.ts';
import { RBAC_MATRIX, RBAC_ROLES } from '../data/projectDocs.ts';

describe('role catalogue matches the documentation', () => {
  it('has the same keys the portal documents', () => {
    assert.deepEqual([...ROLE_KEYS], RBAC_ROLES.map((r) => r.key));
  });

  it('has the same human labels', () => {
    for (const role of RBAC_ROLES) {
      assert.equal(ROLE_LABELS[role.key], role.label, `label for ${role.key}`);
    }
  });
});

describe('parsePermission', () => {
  it('parses full CRUD', () => {
    const p = parsePermission('CRUD');
    assert.equal(p.create, true);
    assert.equal(p.read, true);
    assert.equal(p.update, true);
    assert.equal(p.delete, true);
    assert.equal(p.readScope, null);
    assert.deepEqual(p.operations, []);
  });

  it('parses read-only', () => {
    const p = parsePermission('R');
    assert.equal(p.read, true);
    assert.equal(p.create, false);
    assert.equal(p.readScope, null);
  });

  it('parses the "—" denial cell', () => {
    const p = parsePermission('—');
    assert.equal(p.read, false);
    assert.equal(p.create, false);
  });

  it('parses a scoped read', () => {
    const p = parsePermission('R (published)');
    assert.equal(p.read, true);
    assert.equal(p.readScope, 'published');
  });

  it('parses a scoped CRUD (own)', () => {
    const p = parsePermission('CRUD (own)');
    assert.equal(p.create, true);
    assert.equal(p.readScope, 'own');
  });

  it('parses a Cyrillic scope', () => {
    // The real matrix contains 'R (через квест)' — the scope is display text, not
    // an enum, so it must survive verbatim.
    const p = parsePermission('R (через квест)');
    assert.equal(p.readScope, 'через квест');
  });

  it('parses a named operation, as in invitations', () => {
    // `R + redeem`: reading plus a domain action that is not an update. Folding
    // it into `update` would let a caller edit the row wholesale.
    const p = parsePermission('R + redeem');
    assert.equal(p.read, true);
    assert.equal(p.update, false, 'redeem must not imply general update');
    assert.deepEqual(p.operations, ['redeem']);
  });

  it('parses every cell that actually appears in the documentation', () => {
    // Regression guard: the first version of this parser threw on `R + redeem`,
    // which is real data. Enumerating the real cells means the next new format
    // fails here rather than in a component.
    const cells = new Set<string>();
    for (const row of RBAC_MATRIX) {
      for (const cell of Object.values(row.permissions)) cells.add(cell);
    }
    for (const cell of cells) {
      assert.doesNotThrow(() => parsePermission(cell), `failed on real cell: ${cell}`);
    }
  });

  it('rejects a nonsense cell', () => {
    // A typo used to grant nothing silently; now it fails at construction.
    assert.throws(() => parsePermission('READ'), DomainError);
    assert.throws(() => parsePermission('RUX'), DomainError);
  });

  it('rejects duplicate operations', () => {
    assert.throws(() => parsePermission('RR'), DomainError);
  });

  it('treats an empty cell as full denial', () => {
    assert.equal(parsePermission('   ').read, false);
  });
});

describe('matrix built from the real documentation data', () => {
  const matrix = buildPermissionMatrix(RBAC_MATRIX);

  it('contains every documented collection', () => {
    assert.equal(matrix.size, RBAC_MATRIX.length);
    for (const row of RBAC_MATRIX) {
      assert.ok(matrix.has(row.collection), `missing ${row.collection}`);
    }
  });

  it('gives Guest read-only access to published characters', () => {
    const characters = matrix.get('characters');
    assert.ok(characters);
    assert.equal(characters.byRole.Guest.read, true);
    assert.equal(characters.byRole.Guest.readScope, 'published');
    assert.equal(characters.byRole.Guest.create, false);
  });

  it('gives Content Manager full CRUD on characters', () => {
    const characters = matrix.get('characters');
    assert.equal(characters?.byRole['Content Mgr'].create, true);
    assert.equal(characters?.byRole['Content Mgr'].delete, true);
  });

  it('denies Guest any access to question_sets', () => {
    const sets = matrix.get('question_sets');
    assert.equal(sets?.byRole.Guest.read, false);
  });

  it('gives Admin CRUD everywhere that documents it', () => {
    for (const [collection, entry] of matrix) {
      const adminCell = RBAC_MATRIX.find((r) => r.collection === collection)?.permissions.Admin;
      if (adminCell === 'CRUD') {
        assert.equal(entry.byRole.Admin.create, true, `${collection} create`);
        assert.equal(entry.byRole.Admin.delete, true, `${collection} delete`);
      }
    }
  });

  it('rejects a matrix row missing a role', () => {
    assert.throws(
      () =>
        buildPermissionMatrix([
          {
            collection: 'x',
            // Deliberately incomplete: this used to read as `undefined` and
            // silently mean "no permission".
            permissions: { Guest: 'R' } as never,
          },
        ]),
      DomainError
    );
  });

  it('rejects a duplicated collection', () => {
    const row = { collection: 'characters', permissions: RBAC_MATRIX[0]!.permissions };
    assert.throws(() => buildPermissionMatrix([row, row]), DomainError);
  });
});

describe('field restriction: User must not see correct', () => {
  it('documents the restriction', () => {
    const rule = FIELD_RESTRICTIONS.find(
      (r) => r.collection === 'question_sets' && r.field === 'correct'
    );
    assert.ok(rule, 'the documented restriction is missing');
    assert.match(rule.rationale, /маскируется/i);
  });

  it('hides correct from User', () => {
    const result = mayReadField('User', 'question_sets', 'correct');
    assert.equal(result.visible, false);
    assert.match(result.reason, /воркером|маскируется/i);
  });

  it('hides correct from Guest too', () => {
    // Guest has no access to question_sets at all, so it must not see the answer
    // either — a stricter reading than the text states, and the safe one.
    assert.equal(mayReadField('Guest', 'question_sets', 'correct').visible, false);
  });

  it('allows Content Manager and Admin', () => {
    assert.equal(mayReadField('Content Mgr', 'question_sets', 'correct').visible, true);
    assert.equal(mayReadField('Admin', 'question_sets', 'correct').visible, true);
  });

  it('does not restrict an unrelated field', () => {
    assert.equal(mayReadField('User', 'question_sets', 'text').visible, true);
  });
});

describe('maskFields strips the answer before it leaves the server', () => {
  const row = { id: 'qs-1', question_set_id: 'bering', correct: 0, text: 'Вопрос' };

  it('removes correct for User', () => {
    const masked = maskFields(row, 'User', 'question_sets');
    assert.equal('correct' in masked, false);
    assert.equal(masked.id, 'qs-1');
    assert.equal(masked.text, 'Вопрос');
  });

  it('keeps correct for Admin', () => {
    const masked = maskFields(row, 'Admin', 'question_sets');
    assert.equal(masked.correct, 0);
  });

  it('removes the key rather than nulling it', () => {
    // `null` would advertise that the field exists; JSON.stringify drops undefined
    // but keeps null, so a client could see the shape of the hidden data.
    const masked = maskFields(row, 'User', 'question_sets');
    assert.equal(Object.prototype.hasOwnProperty.call(masked, 'correct'), false);
    assert.equal(JSON.stringify(masked).includes('correct'), false);
  });

  it('does not mutate the input', () => {
    maskFields(row, 'User', 'question_sets');
    assert.equal(row.correct, 0);
  });

  it('leaves records of other collections alone', () => {
    const masked = maskFields({ id: 'c-1', correct: 1 }, 'User', 'characters');
    assert.equal(masked.correct, 1);
  });
});
