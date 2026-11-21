/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Kanban board with real drag-and-drop.
 *
 * ## Why HTML5 drag events and not a library
 *
 * `@dnd-kit` or `react-beautiful-dnd` would add ~30–50 KB to a bundle that is
 * budgeted at 600 KB and currently sits near 400. The native API covers what this
 * board needs — dragging a card between three columns and dropping it at a
 * specific position — so the dependency would buy polish (auto-scroll, ghost
 * previews) this screen does not use.
 *
 * ## Accessibility is not optional here
 *
 * Native drag-and-drop is mouse-only: `draggable` elements are not reachable by
 * keyboard, and a drop target is not a button. A board a keyboard user cannot
 * operate is a board they cannot use at all, so every card also offers:
 *
 * - `←` / `→` to move between columns (respecting the same legal transitions as
 *   the mouse, so the keyboard cannot skip the rules);
 * - `Enter` to take a card into work / complete it;
 * - a live region announcing the result, because a silent move leaves a screen
 *   reader user unsure whether anything happened.
 */

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, GripVertical, RotateCcw, Check, Lock } from 'lucide-react';
import {
  Board,
  COLUMN_IDS,
  COLUMN_TITLES,
  TRANSITIONS,
  type Card,
  type ColumnId,
} from '../domain/board/Board';
import { BACKLOG, type BacklogCard } from '../data/backlog';
import { DomainError } from '../domain/invitations/valueObjects';

/** Simulator clock, same convention as the rest of the portal. */
const NOW = '2026-11-21T07:00:00Z';

function initialBoard(): Board {
  return Board.create({
    ideas: BACKLOG,
    inProgress: [],
    done: [],
  });
}

const PRIORITY_STYLE: Record<string, string> = {
  P0: 'text-[#B91C1C]',
  P1: 'text-[#9A3412]',
  P2: 'text-[#57534E]',
  P3: 'text-[#78716C]',
};

export function ImprovementBoard() {
  /*
   * The board lives in state as a snapshot, not as a mutable aggregate: React may
   * discard component state, and an aggregate is a value, not a place to keep
   * data across renders. Same pattern as the invitation simulator.
   */
  const [snapshot, setSnapshot] = useState(() => initialBoard().snapshot);
  const [announcement, setAnnouncement] = useState('');
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ column: ColumnId; index: number } | null>(null);
  const [completionPrompt, setCompletionPrompt] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState('');

  const board = useMemo(
    () => Board.create(snapshot.columns),
    [snapshot]
  );

  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /** Applies a move through the domain and reports either outcome. */
  const applyMove = (
    cardId: string,
    to: ColumnId,
    options: { toIndex?: number; completionNote?: string } = {}
  ): boolean => {
    const next = Board.create(snapshot.columns);
    try {
      const card = next.move(cardId, to, NOW, options);
      next.pullEvents();
      setSnapshot(next.snapshot);
      setAnnouncement(`«${card.title}» перемещена в «${COLUMN_TITLES[to]}».`);
      return true;
    } catch (error) {
      const reason = error instanceof DomainError ? error.message : 'Переход невозможен.';
      setAnnouncement(reason);
      return false;
    }
  };

  // --- Drag and drop -------------------------------------------------------

  const handleDragStart = (event: React.DragEvent, cardId: string): void => {
    setDragCardId(cardId);
    // `text/plain` keeps the drag legal across browsers; some require data to be
    // set at all before `dragstart` completes.
    event.dataTransfer.setData('text/plain', cardId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (): void => {
    setDragCardId(null);
    setDropTarget(null);
  };

  const handleDragOver = (
    event: React.DragEvent,
    column: ColumnId,
    index: number
  ): void => {
    if (!dragCardId) return;
    const found = board.findCard(dragCardId);
    if (!found) return;
    // Only signal a legal drop: showing a target that will refuse teaches the
    // user nothing and costs a failed attempt.
    if (found.column !== column && !TRANSITIONS[found.column].includes(column)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget({ column, index });
  };

  const handleDrop = (event: React.DragEvent, column: ColumnId, index: number): void => {
    event.preventDefault();
    const cardId = event.dataTransfer.getData('text/plain') || dragCardId;
    setDropTarget(null);
    setDragCardId(null);
    if (!cardId) return;

    if (column === 'done') {
      // Completion needs evidence; ask instead of accepting silently.
      const found = board.findCard(cardId);
      if (found && found.column !== 'done') {
        setCompletionPrompt(cardId);
        setCompletionNote('');
        return;
      }
    }

    applyMove(cardId, column, { toIndex: index });
  };

  const confirmCompletion = (): void => {
    if (!completionPrompt) return;
    const ok = applyMove(completionPrompt, 'done', { completionNote });
    if (ok) {
      setCompletionPrompt(null);
      setCompletionNote('');
    }
  };

  // --- Keyboard ------------------------------------------------------------

  const moveWithKeyboard = (cardId: string, direction: -1 | 1): void => {
    const found = board.findCard(cardId);
    if (!found) return;
    const currentIndex = COLUMN_IDS.indexOf(found.column);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= COLUMN_IDS.length) {
      setAnnouncement('Дальше колонок нет.');
      return;
    }
    const target = COLUMN_IDS[targetIndex]!;

    if (target === 'done') {
      setCompletionPrompt(cardId);
      setCompletionNote('');
      return;
    }
    applyMove(cardId, target);
  };

  const handleKeyDown = (event: React.KeyboardEvent, cardId: string): void => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveWithKeyboard(cardId, 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveWithKeyboard(cardId, -1);
    }
  };

  // --- Render --------------------------------------------------------------

  const renderCard = (card: BacklogCard | Card, column: ColumnId, index: number) => {
    const backlog = card as BacklogCard;
    const isDragging = dragCardId === card.id;
    // Only «Идеи» offers a forward action: from «В работе» the path to done goes
    // through the completion prompt, so a generic arrow there would bypass it.
    const canRight = column === 'ideas';

    return (
      <div
        key={card.id}
        draggable
        onDragStart={(e) => handleDragStart(e, card.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, column, index)}
        onDrop={(e) => handleDrop(e, column, index)}
        className={`group relative rounded-lg border border-[#E2DDD4] bg-white p-3 mb-2 transition-opacity ${
          isDragging ? 'opacity-40' : 'opacity-100'
        }`}
      >
        <div className="flex items-start gap-2">
          <GripVertical
            className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#A8A29E] group-hover:text-[#57534E] cursor-grab"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#78716C]">
                {card.area}
              </span>
              <span className={`text-[10px] font-bold ${PRIORITY_STYLE[card.priority] ?? ''}`}>
                {card.priority}
              </span>
            </div>

            <div className="mt-1 text-[13px] font-semibold leading-snug text-[#1C1917]">
              {card.title}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#57534E]">{card.detail}</p>

            {backlog.evidence && (
              <p className="mt-2 rounded border-l-2 border-[#1E3A8A]/30 pl-2 text-[10px] leading-relaxed text-[#78716C]">
                <span className="font-semibold">Проверка: </span>
                {backlog.evidence}
              </p>
            )}

            {card.completionNote && (
              <p className="mt-2 rounded bg-[#ECFDF5] px-2 py-1 text-[10px] leading-relaxed text-[#14532D]">
                <Check className="inline w-3 h-3 mr-1" aria-hidden="true" />
                {card.completionNote}
              </p>
            )}

            {/*
              Keyboard equivalent of the drag. `aria-label` spells out the target
              so a screen reader user does not have to infer it from an arrow.
            */}
            <div className="mt-2 flex items-center gap-1">
              <button
                ref={(el) => {
                  cardRefs.current[card.id] = el;
                }}
                type="button"
                onKeyDown={(e) => handleKeyDown(e, card.id)}
                aria-label={`Карточка «${card.title}». Стрелки влево и вправо перемещают между колонками.`}
                className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus:rounded focus:bg-white focus:px-2 focus:py-1 focus:text-xs focus:border focus:border-[#1E3A8A]"
              >
                Переместить
              </button>
              {column !== 'ideas' && (
                <button
                  type="button"
                  onClick={() => moveWithKeyboard(card.id, -1)}
                  aria-label={`Вернуть «${card.title}» в предыдущую колонку`}
                  className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD4] px-1.5 py-0.5 text-[10px] text-[#57534E] hover:border-[#1E3A8A]/40 hover:text-[#1C1917] focus-visible:outline-2 focus-visible:outline-[#1E3A8A]"
                >
                  <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                  Назад
                </button>
              )}
              {column === 'inProgress' && (
                <button
                  type="button"
                  onClick={() => {
                    setCompletionPrompt(card.id);
                    setCompletionNote('');
                  }}
                  aria-label={`Отметить «${card.title}» выполненной`}
                  className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD4] px-1.5 py-0.5 text-[10px] text-[#57534E] hover:border-[#16A34A] hover:text-[#14532D] focus-visible:outline-2 focus-visible:outline-[#16A34A]"
                >
                  <Check className="w-3 h-3" aria-hidden="true" />
                  Готово
                </button>
              )}
              {column === 'done' && (
                <button
                  type="button"
                  onClick={() => moveWithKeyboard(card.id, -1)}
                  aria-label={`Переоткрыть «${card.title}»`}
                  className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD4] px-1.5 py-0.5 text-[10px] text-[#57534E] hover:border-[#1E3A8A]/40 hover:text-[#1C1917] focus-visible:outline-2 focus-visible:outline-[#1E3A8A]"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  Переоткрыть
                </button>
              )}
              {canRight && column === 'ideas' && (
                <button
                  type="button"
                  onClick={() => moveWithKeyboard(card.id, 1)}
                  className="ml-auto inline-flex items-center gap-0.5 rounded border border-[#1E3A8A] bg-[#1E3A8A] px-1.5 py-0.5 text-[10px] text-white hover:bg-[#172E6E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
                >
                  В работу
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#1C1917]">
            Улучшения портала
          </h2>
          <p className="mt-0.5 text-xs text-[#57534E]">
            {BACKLOG.length} карточек по итогам аудита. Перетащите карточку или используйте
            стрелки на клавиатуре.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-[#E2DDD4] bg-white px-2 py-1">
          <Lock className="w-3 h-3 text-[#78716C]" aria-hidden="true" />
          <span className="text-[10px] text-[#57534E]">
            «Выполнено» требует отметки о проверке
          </span>
        </div>
      </div>

      {/* Live region: every move is announced, including refusals. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {COLUMN_IDS.map((column) => {
          const cards = board.column(column);
          const isTarget = dropTarget?.column === column;

          return (
            <section
              key={column}
              aria-label={COLUMN_TITLES[column]}
              onDragOver={(e) => handleDragOver(e, column, cards.length)}
              onDrop={(e) => handleDrop(e, column, cards.length)}
              className={`rounded-xl border p-2.5 transition-colors ${
                isTarget
                  ? 'border-[#1E3A8A] bg-[#EFF3FB]'
                  : 'border-[#E2DDD4] bg-[#F7F5F0]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#1C1917]">
                  {COLUMN_TITLES[column]}
                </h3>
                <span className="tabular-nums rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#57534E] border border-[#E2DDD4]">
                  {cards.length}
                </span>
              </div>

              <div className="min-h-[120px]">
                {cards.length === 0 && (
                  <p className="rounded-lg border border-dashed border-[#D6D0C4] px-3 py-6 text-center text-[11px] text-[#A8A29E]">
                    {column === 'ideas'
                      ? 'Всё взято в работу.'
                      : column === 'inProgress'
                        ? 'Перетащите карточку из «Идей».'
                        : 'Здесь появятся закрытые пункты.'}
                  </p>
                )}
                {cards.map((card, index) => renderCard(card, column, index))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Completion prompt: the evidence the board requires. */}
      {completionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-title"
            className="w-full max-w-lg rounded-xl border border-[#E2DDD4] bg-white p-5 shadow-xl"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setCompletionPrompt(null);
            }}
          >
            <h3 id="completion-title" className="text-sm font-semibold text-[#1C1917]">
              Что именно проверено?
            </h3>
            <p className="mt-1 text-xs text-[#57534E]">
              Карточка попадёт в «Выполнено» только с отметкой — иначе доска
              утверждала бы результат, которого никто не видел.
            </p>
            <textarea
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Например: gitleaks запущен по истории, тестовый секрет найден."
              className="mt-3 w-full rounded-lg border border-[#E2DDD4] px-3 py-2 text-xs text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A]"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompletionPrompt(null)}
                className="rounded-lg border border-[#E2DDD4] px-3 py-1.5 text-xs text-[#57534E] hover:text-[#1C1917]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmCompletion}
                className="rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#172E6E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
