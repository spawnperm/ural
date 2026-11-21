/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Quest context tests.
 *
 * Three defects motivated this aggregate, and each has a test here:
 * an out-of-range `correct` index that used to score silently, a hardcoded total
 * in the UI, and an empty scenario that crashed the render.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Answer, Question, QuestAttempt } from '../domain/quest/QuestAttempt.ts';
import { DomainError } from '../domain/invitations/valueObjects.ts';
import { NOVEMBER_BERING_SCENARIO, buildScenario } from '../data/questScenario.ts';

const NOW = '2026-11-20T11:45:00Z';

function q(id: string, correct = 0, optionCount = 3): Question {
  return Question.create({
    id,
    text: `Вопрос ${id}`,
    options: Array.from({ length: optionCount }, (_, i) => `Вариант ${i + 1}`),
    correct,
    explanation: 'Потому что.',
  });
}

function attemptWith(questions: Question[]): QuestAttempt {
  return QuestAttempt.start('attempt-1', 'scenario-1', questions);
}

describe('Question validates its own shape', () => {
  it('accepts a well-formed question', () => {
    assert.equal(q('q1').optionCount, 3);
  });

  it('rejects a correct index outside the options', () => {
    // The defect: `correct: 7` against three options type-checked, loaded fine
    // and scored every answer as wrong.
    assert.throws(() => q('q1', 7), (err: unknown) => err instanceof DomainError && err.code === 'QUESTION_BAD_ANSWER_INDEX');
    assert.throws(() => q('q1', -1), DomainError);
  });

  it('rejects a non-integer correct index', () => {
    assert.throws(() => q('q1', 1.5), DomainError);
  });

  it('requires at least two options', () => {
    assert.throws(() => q('q1', 0, 1), (err: unknown) => err instanceof DomainError && err.code === 'QUESTION_TOO_FEW_OPTIONS');
  });

  it('rejects duplicate options', () => {
    assert.throws(
      () =>
        Question.create({
          id: 'q1',
          text: 'Текст',
          options: ['Оса', 'оса'],
          correct: 0,
          explanation: '',
        }),
      DomainError
    );
  });

  it('rejects an empty option', () => {
    assert.throws(
      () =>
        Question.create({
          id: 'q1',
          text: 'Текст',
          options: ['Оса', '  '],
          correct: 0,
          explanation: '',
        }),
      DomainError
    );
  });

  it('rejects a missing id or text', () => {
    assert.throws(() => Question.create({ id: '', text: 'T', options: ['a', 'b'], correct: 0, explanation: '' }), DomainError);
    assert.throws(() => Question.create({ id: 'q', text: '  ', options: ['a', 'b'], correct: 0, explanation: '' }), DomainError);
  });

  it('reports correctness by index', () => {
    const question = q('q1', 2);
    assert.equal(question.isCorrectOption(2), true);
    assert.equal(question.isCorrectOption(0), false);
  });
});

describe('Answer cannot point outside its question', () => {
  it('accepts a valid option', () => {
    const answer = Answer.given(q('q1'), 1, NOW);
    assert.equal(answer.optionIndex, 1);
  });

  it('rejects an out-of-range option', () => {
    assert.throws(() => Answer.given(q('q1'), 3, NOW), DomainError);
    assert.throws(() => Answer.given(q('q1'), -1, NOW), DomainError);
  });

  it('knows whether it is correct', () => {
    assert.equal(Answer.given(q('q1', 1), 1, NOW).isCorrect, true);
    assert.equal(Answer.given(q('q1', 1), 0, NOW).isCorrect, false);
  });
});

describe('QuestAttempt scoring', () => {
  const questions = [q('q1', 0), q('q2', 1), q('q3', 2)];

  it('starts empty and incomplete', () => {
    const attempt = attemptWith(questions);
    assert.equal(attempt.answeredCount, 0);
    assert.equal(attempt.isComplete, false);
    assert.equal(attempt.correctCount, 0);
  });

  it('counts correct answers', () => {
    const attempt = attemptWith(questions);
    attempt.answer('q1', 0, NOW); // correct
    attempt.answer('q2', 0, NOW); // wrong
    attempt.answer('q3', 2, NOW); // correct
    assert.equal(attempt.correctCount, 2);
    assert.equal(attempt.isComplete, true);
  });

  it('replaces an answer instead of appending', () => {
    // The UI allows changing your mind before moving on; appending would have
    // inflated the score and broken `isComplete`.
    const attempt = attemptWith(questions);
    attempt.answer('q1', 1, NOW); // wrong
    assert.equal(attempt.correctCount, 0);
    attempt.answer('q1', 0, NOW); // corrected
    assert.equal(attempt.correctCount, 1);
    assert.equal(attempt.answeredCount, 1);
  });

  it('raises AnswerSubmitted per answer', () => {
    const attempt = attemptWith(questions);
    attempt.pullEvents();
    attempt.answer('q1', 0, NOW);
    const events = attempt.pullEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, 'AnswerSubmitted');
  });

  it('rejects an unknown question', () => {
    assert.throws(() => attemptWith(questions).answer('nope', 0, NOW), DomainError);
  });

  it('rejects an out-of-range option at the aggregate boundary', () => {
    assert.throws(() => attemptWith(questions).answer('q1', 99, NOW), DomainError);
  });
});

describe('seal award rule', () => {
  const questions = [q('q1', 0), q('q2', 1)];

  it('awards at least one seal for participation', () => {
    // The old UI wrote `Math.max(1, correctCount)` inline; the rule now lives
    // here so no caller has to remember it.
    const attempt = attemptWith(questions);
    attempt.answer('q1', 2, NOW);
    attempt.answer('q2', 2, NOW);
    assert.equal(attempt.correctCount, 0);
    assert.equal(attempt.sealsAwarded, 1);
  });

  it('awards seals equal to correct answers when above one', () => {
    const attempt = attemptWith(questions);
    attempt.answer('q1', 0, NOW);
    attempt.answer('q2', 1, NOW);
    assert.equal(attempt.sealsAwarded, 2);
  });
});

describe('completion', () => {
  const questions = [q('q1', 0), q('q2', 1)];

  it('refuses to complete an unanswered attempt', () => {
    assert.throws(() => attemptWith(questions).complete(NOW), DomainError);
  });

  it('completes a fully answered attempt and raises QuestCompleted', () => {
    const attempt = attemptWith(questions);
    attempt.answer('q1', 0, NOW);
    attempt.answer('q2', 1, NOW);
    attempt.pullEvents();

    const result = attempt.complete(NOW);
    assert.equal(result.correctAnswers, 2);
    assert.equal(result.sealsAwarded, 2);

    const events = attempt.pullEvents();
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, 'QuestCompleted');
  });

  it('refuses answers after completion', () => {
    const attempt = attemptWith(questions);
    attempt.answer('q1', 0, NOW);
    attempt.answer('q2', 1, NOW);
    attempt.complete(NOW);
    assert.throws(() => attempt.answer('q1', 1, NOW), DomainError);
  });

  it('refuses to complete twice', () => {
    const attempt = attemptWith(questions);
    attempt.answer('q1', 0, NOW);
    attempt.answer('q2', 1, NOW);
    attempt.complete(NOW);
    assert.throws(() => attempt.complete(NOW), DomainError);
  });
});

describe('empty scenario', () => {
  it('cannot be started', () => {
    // Previously `questions[0]` was `undefined` and the render crashed.
    assert.throws(() => attemptWith([]), DomainError);
  });

  it('reports an out-of-range question index clearly', () => {
    const attempt = attemptWith([q('q1')]);
    assert.throws(() => attempt.questionAt(5), DomainError);
  });
});

describe('snapshot round-trip', () => {
  it('restores answers without replaying events', () => {
    const questions = [q('q1', 0), q('q2', 1)];
    const original = attemptWith(questions);
    original.answer('q1', 0, NOW);
    original.answer('q2', 1, NOW);

    const restored = QuestAttempt.restore('attempt-1', 'scenario-1', questions, original.toSnapshot());
    assert.equal(restored.pullEvents().length, 0, 'restore must not re-emit events');
    assert.equal(restored.correctCount, 2);
    assert.equal(restored.isComplete, true);
  });

  it('produces a JSON-safe snapshot', () => {
    const attempt = attemptWith([q('q1')]);
    attempt.answer('q1', 0, NOW);
    const snapshot = attempt.toSnapshot();
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
  });
});

describe('the real scenario builds and is internally consistent', () => {
  it('passes validation', () => {
    assert.ok(NOVEMBER_BERING_SCENARIO.questions.length > 0);
  });

  it('gives every question a valid answer index', () => {
    // The check that would have caught a bad `correct` in the shipped data.
    for (const question of NOVEMBER_BERING_SCENARIO.questions) {
      assert.ok(question.correctIndex >= 0, question.id);
      assert.ok(question.correctIndex < question.optionCount, question.id);
    }
  });

  it('reports the real total instead of a hardcoded one', () => {
    // The UI printed "из 3" literally; this is the number that replaced it.
    const attempt = QuestAttempt.start(
      'a',
      NOVEMBER_BERING_SCENARIO.id,
      NOVEMBER_BERING_SCENARIO.questions
    );
    assert.equal(attempt.totalQuestions, NOVEMBER_BERING_SCENARIO.questions.length);
  });

  it('scopes seals to participation at minimum', () => {
    const attempt = QuestAttempt.start(
      'a',
      NOVEMBER_BERING_SCENARIO.id,
      NOVEMBER_BERING_SCENARIO.questions
    );
    assert.equal(attempt.sealsAwarded, 1, 'no answers yet, but participation counts');
  });
});

describe('buildScenario rejects malformed data', () => {
  const base = {
    id: 's1',
    monthLabel: 'Ноябрь',
    monthDate: '2026-11-01',
    characterName: 'Беринг',
    era: 'XVIII',
    mythAlias: 'Командор',
    location: 'Оса',
    eventDate: '2026-11-28 14:00',
  };

  it('rejects an empty question list', () => {
    assert.throws(() => buildScenario({ ...base, questions: [] }), DomainError);
  });

  it('rejects duplicate question ids', () => {
    // Duplicates made `questionById` return the first match, silently scoring the
    // second question against the first's answer.
    assert.throws(
      () =>
        buildScenario({
          ...base,
          questions: [
            { id: 'q1', text: 'A', options: ['a', 'b'], correct: 0, explanation: '' },
            { id: 'q1', text: 'B', options: ['a', 'b'], correct: 1, explanation: '' },
          ],
        }),
      DomainError
    );
  });

  it('rejects a bad answer index inside a scenario', () => {
    assert.throws(
      () =>
        buildScenario({
          ...base,
          questions: [{ id: 'q1', text: 'A', options: ['a', 'b'], correct: 5, explanation: '' }],
        }),
      DomainError
    );
  });
});
