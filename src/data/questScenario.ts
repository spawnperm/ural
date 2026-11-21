/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Quest scenarios as data, validated on construction.
 *
 * Moved out of `projectDocs.ts` for two reasons that are not cosmetic:
 *
 * 1. **`projectDocs.ts` is 1367 lines** and every edit risked touching unrelated
 *    content. The scenario is domain data, not page copy.
 * 2. **The questions were untyped literals.** `QuestScenario` declared
 *    `questions: { … }[]`, so `correct: 7` against three options type-checked.
 *    Building through `Question.create` rejects it.
 *
 * The scenario metadata (month, character, location) stays alongside the
 * questions because they are one unit: an event without its questions is not a
 * valid scenario.
 */

import { Question } from '../domain/quest/QuestAttempt.ts';
import { DomainError } from '../domain/invitations/valueObjects.ts';

export interface QuestScenarioSource {
  id: string;
  monthLabel: string;
  monthDate: string;
  characterName: string;
  era: string;
  mythAlias: string;
  location: string;
  eventDate: string;
  questions: Array<{
    id: string;
    text: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
}

export interface QuestScenario {
  id: string;
  monthLabel: string;
  monthDate: string;
  characterName: string;
  era: string;
  mythAlias: string;
  location: string;
  eventDate: string;
  questions: readonly Question[];
}

/**
 * Builds a scenario, validating every question.
 *
 * Failing at module load is deliberate: a scenario with an out-of-range answer
 * index should stop the app from starting, not surface as a wrong score during a
 * live event.
 */
export function buildScenario(source: QuestScenarioSource): QuestScenario {
  if (source.id.trim().length === 0) {
    throw new DomainError('Сценарий квеста без идентификатора.', 'SCENARIO_NO_ID');
  }
  if (source.questions.length === 0) {
    throw new DomainError(
      `Сценарий «${source.id}» не содержит вопросов.`,
      'SCENARIO_NO_QUESTIONS'
    );
  }

  const seen = new Set<string>();
  const questions = source.questions.map((q) => {
    if (seen.has(q.id)) {
      // Duplicate ids would make `questionById` return the first match and
      // silently score the second question against the first's answer.
      throw new DomainError(`Сценарий «${source.id}»: повторяется id вопроса «${q.id}».`, 'SCENARIO_DUPLICATE_QUESTION');
    }
    seen.add(q.id);
    return Question.create(q);
  });

  return { ...source, questions };
}

/** November — Vitus Bering. The simulator's only scenario. */
export const NOVEMBER_BERING_SOURCE: QuestScenarioSource = {
  id: 'november-bering',
  monthLabel: 'Ноябрь — Витус Беринг',
  monthDate: '2026-11-01',
  characterName: 'Витус Беринг',
  era: 'XVIII век',
  mythAlias: 'Командор Камчатских дорог',
  location: 'Оса, краеведческий музей',
  eventDate: '2026-11-28 14:00',
  questions: [
    {
      id: 'q1',
      text: 'Какой прикамский город стал ключевым опорным пунктом Второй Камчатской экспедиции Витуса Беринга в 1733 году?',
      options: ['Оса', 'Чёрмоз', 'Кудымкар'],
      correct: 0,
      explanation:
        'Осенью 1733 года отряды Второй Камчатской экспедиции останавливались в Осе на реке Каме, где хранится память о маршруте Беринга.',
    },
    {
      id: 'q2',
      text: 'По какой реке Прикамья следовала основная часть грузов и исследователей на пути к Уралу?',
      options: ['По реке Чусовой и Каме', 'Только по Печоре', 'Через озеро Ильмень'],
      correct: 0,
      explanation:
        'Кама и её приток Чусовая связывали европейскую часть России с Сибирским трактом и Камчатским маршрутом.',
    },
    {
      id: 'q3',
      text: 'Сколько печатей нужно собрать за три месяца подряд в AR-квесте, чтобы получить QR-приглашение на мероприятие?',
      options: [
        '3 печати за три месяца подряд',
        '10 печатей за год',
        'Достаточно гостевого просмотра без печатей',
      ],
      correct: 0,
      explanation:
        'Согласно механике достижений (§9.3), серия из 3 печатей за три месяца подряд запускает событие StreakReached и выпуск QR-приглашения.',
    },
  ],
};

export const NOVEMBER_BERING_SCENARIO: QuestScenario = buildScenario(NOVEMBER_BERING_SOURCE);
