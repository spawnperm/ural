/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Questions and the quiz, as domain objects.
 *
 * ## Why this context now
 *
 * `BOUNDED_CONTEXTS` in the documentation names "Прохождение" with aggregates
 * `QuestAttempt` and `Answer`, and events `QuestCompleted` / `AnswerSubmitted`.
 * The code had none of that: questions were a literal array inside
 * `projectDocs.ts`, and the scoring loop lived in the component.
 *
 * ## Defects this removes
 *
 * Reading the old scoring code turned up three:
 *
 * 1. **`correct` was never validated.** A question whose `correct` pointed past
 *    the end of `options` compiled fine and silently scored as wrong — the answer
 *    index was compared, never checked.
 * 2. **The total was hardcoded.** The UI printed "Правильных ответов: N из 3",
 *    literally. Adding a fourth question would have made it lie.
 * 3. **`questions[questionIndex]` could be `undefined`** for an empty scenario,
 *    and the render below it assumed an object.
 *
 * ## Why a class and not plain types
 *
 * The invariants are structural: an `Answer` cannot exist without a chosen
 * option that exists in that question. A plain interface with `optionIndex:
 * number` permits `-1`, `99`, and an index into a different question's options.
 */

import { DomainError } from '../invitations/valueObjects.ts';

/**
 * One option of a question.
 *
 * Wrapping the text is not ceremony: it makes `optionCount` explicit and lets
 * `Answer` validate against it without reaching into a bare array.
 */
export class Question {
  private constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly options: readonly string[],
    private readonly _correctIndex: number,
    public readonly explanation: string
  ) {}

  public static create(params: {
    id: string;
    text: string;
    options: readonly string[];
    correct: number;
    explanation: string;
  }): Question {
    if (params.id.trim().length === 0) {
      throw new DomainError('Вопрос должен иметь идентификатор.', 'QUESTION_NO_ID');
    }
    if (params.text.trim().length === 0) {
      throw new DomainError(`Вопрос ${params.id} без текста.`, 'QUESTION_NO_TEXT');
    }
    if (params.options.length < 2) {
      // A single option is not a question, it is a statement.
      throw new DomainError(
        `Вопрос ${params.id}: нужно минимум два варианта, получено ${params.options.length}.`,
        'QUESTION_TOO_FEW_OPTIONS'
      );
    }
    if (params.options.some((o) => o.trim().length === 0)) {
      throw new DomainError(`Вопрос ${params.id}: пустой вариант ответа.`, 'QUESTION_EMPTY_OPTION');
    }
    // The defect that motivated this class: an out-of-range index used to be
    // accepted and silently scored as incorrect.
    if (
      !Number.isInteger(params.correct) ||
      params.correct < 0 ||
      params.correct >= params.options.length
    ) {
      throw new DomainError(
        `Вопрос ${params.id}: правильный ответ ${params.correct} вне диапазона 0..${params.options.length - 1}.`,
        'QUESTION_BAD_ANSWER_INDEX'
      );
    }
    const uniqueOptions = new Set(params.options.map((o) => o.trim().toLowerCase()));
    if (uniqueOptions.size !== params.options.length) {
      throw new DomainError(`Вопрос ${params.id}: варианты повторяются.`, 'QUESTION_DUPLICATE_OPTIONS');
    }

    return new Question(
      params.id,
      params.text,
      [...params.options],
      params.correct,
      params.explanation
    );
  }

  public get optionCount(): number {
    return this.options.length;
  }

  /** Correct option index. Public so `Answer.isCorrect` can compare, read-only by shadowing. */
  public get correctIndex(): number {
    return this._correctIndex;
  }

  public isCorrectOption(index: number): boolean {
    return index === this._correctIndex;
  }
}

/**
 * A participant's answer to one question.
 *
 * Constructed only through `Answer.given`, which validates the index against the
 * question it belongs to — an answer cannot point at an option that does not exist.
 */
export class Answer {
  private constructor(
    public readonly question: Question,
    public readonly optionIndex: number,
    public readonly submittedAt: string
  ) {}

  public static given(question: Question, optionIndex: number, submittedAt: string): Answer {
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.optionCount) {
      throw new DomainError(
        `Ответ ${optionIndex} вне диапазона для вопроса ${question.id} (0..${question.optionCount - 1}).`,
        'ANSWER_BAD_OPTION'
      );
    }
    return new Answer(question, optionIndex, submittedAt);
  }

  public get isCorrect(): boolean {
    return this.question.isCorrectOption(this.optionIndex);
  }
}

export type AttemptId = string;

export interface AttemptSnapshot {
  scenarioId: string;
  /** Question ids in the order they were answered. */
  answers: Array<{ questionId: string; optionIndex: number; submittedAt: string }>;
}

export type AttemptEvent =
  | {
      type: 'AnswerSubmitted';
      attemptId: AttemptId;
      questionId: string;
      optionIndex: number;
      correct: boolean;
      occurredAt: string;
    }
  | {
      type: 'QuestCompleted';
      attemptId: AttemptId;
      totalQuestions: number;
      correctAnswers: number;
      sealsAwarded: number;
      occurredAt: string;
    };

/**
 * The QuestAttempt aggregate.
 *
 * Owns the two things the component used to compute inline: the score and the
 * seal award. Both are rules, so both belong here.
 */
export class QuestAttempt {
  private readonly _questions: readonly Question[];
  private readonly _answers: Answer[] = [];
  private _events: AttemptEvent[] = [];
  private _completed = false;

  private constructor(
    public readonly id: AttemptId,
    public readonly scenarioId: string,
    questions: readonly Question[]
  ) {
    if (questions.length === 0) {
      // The empty scenario used to produce `questions[0] === undefined` and an
      // unhandled index access in the render.
      throw new DomainError('Сценарий квеста не содержит вопросов.', 'ATTEMPT_NO_QUESTIONS');
    }
    this._questions = questions;
  }

  public static start(id: AttemptId, scenarioId: string, questions: readonly Question[]): QuestAttempt {
    return new QuestAttempt(id, scenarioId, questions);
  }

  public get questions(): readonly Question[] {
    return this._questions;
  }

  public get answers(): readonly Answer[] {
    return this._answers;
  }

  public get totalQuestions(): number {
    return this._questions.length;
  }

  public get answeredCount(): number {
    return this._answers.length;
  }

  public get isComplete(): boolean {
    return this._answers.length === this._questions.length;
  }

  public get isCompleted(): boolean {
    return this._completed;
  }

  public questionAt(index: number): Question {
    const question = this._questions[index];
    if (!question) {
      throw new DomainError(
        `Вопроса с индексом ${index} нет: всего ${this._questions.length}.`,
        'ATTEMPT_QUESTION_OUT_OF_RANGE'
      );
    }
    return question;
  }

  /** Question by id — the stable lookup, unlike the positional one. */
  public questionById(id: string): Question | undefined {
    return this._questions.find((q) => q.id === id);
  }

  public hasAnswered(questionId: string): boolean {
    return this._answers.some((a) => a.question.id === questionId);
  }

  /**
   * Records an answer.
   *
   * Idempotent per question: re-answering replaces the previous answer rather
   * than appending, because the UI allows changing your mind before submitting
   * the next question. Appending would have inflated the score.
   */
  public answer(questionId: string, optionIndex: number, submittedAt: string): Answer {
    if (this._completed) {
      throw new DomainError('Попытка уже завершена, ответы не принимаются.', 'ATTEMPT_COMPLETED');
    }
    const question = this.questionById(questionId);
    if (!question) {
      throw new DomainError(`Неизвестный вопрос «${questionId}».`, 'ATTEMPT_UNKNOWN_QUESTION');
    }

    const answer = Answer.given(question, optionIndex, submittedAt);
    const existingIndex = this._answers.findIndex((a) => a.question.id === questionId);
    if (existingIndex >= 0) {
      this._answers[existingIndex] = answer;
    } else {
      this._answers.push(answer);
    }

    this._events.push({
      type: 'AnswerSubmitted',
      attemptId: this.id,
      questionId,
      optionIndex,
      correct: answer.isCorrect,
      occurredAt: submittedAt,
    });

    return answer;
  }

  /** Number of correct answers. Derived — never a stored counter to drift. */
  public get correctCount(): number {
    return this._answers.filter((a) => a.isCorrect).length;
  }

  /**
   * Seals awarded for this attempt.
   *
   * The rule from the documentation (§9.3): a series of three seals over three
   * consecutive months triggers `StreakReached`. The simulator awards at least
   * one seal for participation, which the old UI wrote as `Math.max(1, correct)`.
   * Encoded here so no caller has to remember it.
   */
  public get sealsAwarded(): number {
    return Math.max(1, this.correctCount);
  }

  /**
   * Completes the attempt and raises `QuestCompleted`.
   *
   * Refuses to complete an unanswered attempt: the old flow could not even reach
   * this state, but nothing enforced it.
   */
  public complete(occurredAt: string): { correctAnswers: number; sealsAwarded: number } {
    if (!this.isComplete) {
      throw new DomainError(
        `Нельзя завершить попытку: отвечено ${this._answers.length} из ${this._questions.length}.`,
        'ATTEMPT_INCOMPLETE'
      );
    }
    if (this._completed) {
      throw new DomainError('Попытка уже завершена.', 'ATTEMPT_ALREADY_COMPLETED');
    }

    this._completed = true;
    const result = { correctAnswers: this.correctCount, sealsAwarded: this.sealsAwarded };

    this._events.push({
      type: 'QuestCompleted',
      attemptId: this.id,
      totalQuestions: this.totalQuestions,
      correctAnswers: result.correctAnswers,
      sealsAwarded: result.sealsAwarded,
      occurredAt,
    });

    return result;
  }

  public pullEvents(): AttemptEvent[] {
    const events = this._events;
    this._events = [];
    return events;
  }

  public toSnapshot(): AttemptSnapshot {
    return {
      scenarioId: this.scenarioId,
      answers: this._answers.map((a) => ({
        questionId: a.question.id,
        optionIndex: a.optionIndex,
        submittedAt: a.submittedAt,
      })),
    };
  }

  public static restore(
    id: AttemptId,
    scenarioId: string,
    questions: readonly Question[],
    snapshot: AttemptSnapshot
  ): QuestAttempt {
    const attempt = new QuestAttempt(id, scenarioId, questions);
    for (const entry of snapshot.answers) {
      attempt.answer(entry.questionId, entry.optionIndex, entry.submittedAt);
    }
    // Replaying the snapshot must not re-emit the events it already produced.
    attempt.pullEvents();
    return attempt;
  }
}
