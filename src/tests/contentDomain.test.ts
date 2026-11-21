/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Content context tests.
 *
 * The publication lifecycle is a state machine, so the tests are written the way
 * the machine is defined: legal transitions succeed, illegal ones throw, and the
 * events match what `BOUNDED_CONTEXTS` says this context publishes.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Character, QuestionSet } from '../domain/content/Character.ts';
import { DomainError } from '../domain/invitations/valueObjects.ts';

const NOW = '2026-11-20T11:45:00Z';

function character() {
  return Character.create({ id: 'bering', name: 'Витус Беринг', era: 'XVIII век' });
}

describe('Character lifecycle', () => {
  it('starts as a draft and is hidden from players', () => {
    const c = character();
    assert.equal(c.status, 'draft');
    assert.equal(c.isVisibleToPlayers(), false);
    assert.equal(c.isAssignable(), false);
  });

  it('becomes visible and assignable when published', () => {
    const c = character();
    c.publish(NOW);
    assert.equal(c.status, 'published');
    assert.equal(c.isVisibleToPlayers(), true);
    assert.equal(c.isAssignable(), true);
  });

  it('raises CharacterPublished', () => {
    const c = character();
    c.pullEvents();
    c.publish(NOW);
    const events = c.pullEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, 'CharacterPublished');
  });

  it('refuses to publish twice', () => {
    const c = character();
    c.publish(NOW);
    assert.throws(() => c.publish(NOW), DomainError);
  });

  it('refuses to publish an archived character', () => {
    const c = character();
    c.publish(NOW);
    c.archive(NOW);
    assert.throws(() => c.publish(NOW), DomainError);
  });

  it('archives a published character but keeps it non-assignable', () => {
    const c = character();
    c.publish(NOW);
    c.archive(NOW);
    assert.equal(c.status, 'archived');
    // Existing attempts keep working; new ones must not be offered this character.
    assert.equal(c.isAssignable(), false);
    assert.equal(c.isVisibleToPlayers(), false);
  });

  it('refuses to archive a draft', () => {
    // A draft has no published data to preserve, so archiving it is deletion in
    // disguise — a transition the documentation's model does not express.
    assert.throws(() => character().archive(NOW), DomainError);
  });

  it('refuses to archive twice', () => {
    const c = character();
    c.publish(NOW);
    c.archive(NOW);
    assert.throws(() => c.archive(NOW), DomainError);
  });

  it('rejects an empty id or name', () => {
    assert.throws(() => Character.create({ id: '', name: 'X', era: '' }), DomainError);
    assert.throws(() => Character.create({ id: 'x', name: '   ', era: '' }), DomainError);
  });

  it('trims the name', () => {
    const c = Character.create({ id: 'x', name: '  Витус  ', era: ' XVIII ' });
    assert.equal(c.name, 'Витус');
    assert.equal(c.era, 'XVIII');
  });
});

describe('QuestionSet', () => {
  it('accepts a non-empty set', () => {
    const set = QuestionSet.create({
      id: 'qs-bering',
      characterId: 'bering',
      questionIds: ['q1', 'q2', 'q3'],
      monthDate: '2026-11-01',
    });
    assert.equal(set.size, 3);
  });

  it('rejects an empty set', () => {
    // The simulator's empty-set case produced `questions[0] === undefined` and a
    // crash in the render; refusing at construction removes that path.
    assert.throws(
      () =>
        QuestionSet.create({
          id: 'qs',
          characterId: 'bering',
          questionIds: [],
          monthDate: '2026-11-01',
        }),
      DomainError
    );
  });

  it('rejects duplicate question ids', () => {
    assert.throws(
      () =>
        QuestionSet.create({
          id: 'qs',
          characterId: 'bering',
          questionIds: ['q1', 'q1'],
          monthDate: '2026-11-01',
        }),
      DomainError
    );
  });

  it('requires a character', () => {
    assert.throws(
      () =>
        QuestionSet.create({
          id: 'qs',
          characterId: '',
          questionIds: ['q1'],
          monthDate: '2026-11-01',
        }),
      DomainError
    );
  });

  it('rejects a malformed month date', () => {
    assert.throws(
      () =>
        QuestionSet.create({
          id: 'qs',
          characterId: 'bering',
          questionIds: ['q1'],
          monthDate: 'not-a-date',
        }),
      DomainError
    );
  });

  it('raises QuestionSetUpdated on change', () => {
    const set = QuestionSet.create({
      id: 'qs',
      characterId: 'bering',
      questionIds: ['q1'],
      monthDate: '2026-11-01',
    });
    set.pullEvents();
    set.updateQuestionIds(['q1', 'q2'], NOW);
    const events = set.pullEvents();
    assert.equal(events[0]?.type, 'QuestionSetUpdated');
  });

  it('refuses to shrink a set to nothing', () => {
    const set = QuestionSet.create({
      id: 'qs',
      characterId: 'bering',
      questionIds: ['q1'],
      monthDate: '2026-11-01',
    });
    assert.throws(() => set.updateQuestionIds([], NOW), DomainError);
  });
});
