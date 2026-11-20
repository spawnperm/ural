import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  QrCode,
  RotateCcw,
  ScanLine,
  XCircle,
} from 'lucide-react';
import { SIMULATOR_QUEST, TROUBLESHOOTING_ROWS } from '../data/projectDocs';
import {
  REDEMPTION_WORKFLOW,
  runRedemption,
  stateForInvitation,
  toMermaid,
} from '../data/redemptionWorkflow';
import { ResilientImage } from './ResilientImage';

type GuideRoleTab = 'user' | 'content' | 'event' | 'admin';

interface InvitationRecord {
  token: string;
  userEmail: string;
  userName: string;
  sealsCount: number;
  eventTitle: string;
  expiresAt: string;
  redeemedAt: string | null;
  expired: boolean;
}

const PRESET_INVITATIONS: Record<string, InvitationRecord> = {
  valid: {
    token: 'inv-2026-11-bering-84a9',
    userEmail: 'ivanov.perm@example.com',
    userName: 'Алексей Иванов',
    sealsCount: 3,
    eventTitle: 'Встреча первооткрывателей · Оса, музей',
    expiresAt: '2026-11-28T14:00:00Z',
    redeemedAt: null,
    expired: false,
  },
  expired: {
    token: 'inv-2026-09-dezhnev-11c2',
    userEmail: 'petrova.k@example.com',
    userName: 'Мария Петрова',
    sealsCount: 3,
    eventTitle: 'Сентябрьское собрание · Оса, музей',
    expiresAt: '2026-09-25T18:00:00Z',
    redeemedAt: null,
    expired: true,
  },
  redeemed: {
    token: 'inv-2026-10-ermak-55f0',
    userEmail: 'smirnov.a@example.com',
    userName: 'Дмитрий Смирнов',
    sealsCount: 3,
    eventTitle: 'Октябрьский лекторий · Пермь',
    expiresAt: '2026-10-30T16:00:00Z',
    redeemedAt: '2026-10-30T15:42:10Z',
    expired: false,
  },
};

export function GuidesAndSimulatorSection() {
  const [guideTab, setGuideTab] = useState<GuideRoleTab>('user');

  // AR Quest Simulator State
  const [arDetected, setArDetected] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [revealedExplanation, setRevealedExplanation] = useState(false);

  // Event Manager QR Validator State
  const [invitations, setInvitations] =
    useState<Record<string, InvitationRecord>>(PRESET_INVITATIONS);
  const [activeTokenKey, setActiveTokenKey] = useState<string>('valid');
  const [lookupInput, setLookupInput] = useState<string>(
    PRESET_INVITATIONS.valid.token
  );
  const [redeemFeedback, setRedeemFeedback] = useState<{
    code: string;
    message: string;
  } | null>(null);

  const currentQuestion = SIMULATOR_QUEST.questions[questionIndex];
  const isQuestFinished =
    selectedAnswers.length === SIMULATOR_QUEST.questions.length &&
    revealedExplanation &&
    questionIndex === SIMULATOR_QUEST.questions.length - 1;

  const correctCount = selectedAnswers.reduce((acc, ans, idx) => {
    return acc + (ans === SIMULATOR_QUEST.questions[idx].correct ? 1 : 0);
  }, 0);

  const handleSelectOption = (optIdx: number) => {
    if (revealedExplanation) return;
    const nextAnswers = [...selectedAnswers];
    nextAnswers[questionIndex] = optIdx;
    setSelectedAnswers(nextAnswers);
    setRevealedExplanation(true);
  };

  const handleNextQuestion = () => {
    if (questionIndex < SIMULATOR_QUEST.questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      setRevealedExplanation(false);
    }
  };

  const handleResetQuest = () => {
    setArDetected(false);
    setQuestionIndex(0);
    setSelectedAnswers([]);
    setRevealedExplanation(false);
  };

  const handleIssueRewardToken = () => {
    const newToken = 'inv-2026-11-quest-' + String(1000 + correctCount * 111);
    setInvitations((prev) => ({
      ...prev,
      custom: {
        token: newToken,
        userEmail: 'participant@perm-quest.ru',
        userName: 'Участник (3 месяца подряд)',
        sealsCount: Math.max(1, correctCount),
        eventTitle: `${SIMULATOR_QUEST.monthLabel} · ${SIMULATOR_QUEST.location}`,
        expiresAt: '2026-11-28T14:00:00Z',
        redeemedAt: null,
        expired: false,
      },
    }));
    setActiveTokenKey('custom');
    setLookupInput(newToken);
    setRedeemFeedback(null);
  };

  const currentInvitation = invitations[activeTokenKey];

  const handleLookupByInput = () => {
    const query = lookupInput.trim().toLowerCase();
    const matchedEntry = Object.entries(invitations).find(
      ([, rec]) =>
        rec.token.toLowerCase() === query ||
        rec.userEmail.toLowerCase() === query
    );
    if (!matchedEntry) {
      // The not-found path is a state in the workflow document, not a branch
      // here: the message and code come from the same rules the diagram shows.
      const outcome = runRedemption(REDEMPTION_WORKFLOW, 'notFound');
      setRedeemFeedback({ code: outcome.code, message: outcome.message });
      return;
    }
    setActiveTokenKey(matchedEntry[0]);
    setRedeemFeedback(null);
  };

  const handleRedeemInvitation = () => {
    // State derivation and outcome both come from `redemptionWorkflow.ts`, so the
    // diagram in the documentation and the behaviour cannot drift apart.
    const outcome = runRedemption(
      REDEMPTION_WORKFLOW,
      stateForInvitation(currentInvitation ?? null)
    );

    if (outcome.mutated) {
      const nowIso = '2026-11-20T11:45:00Z';
      setInvitations((prev) => ({
        ...prev,
        [activeTokenKey]: {
          ...prev[activeTokenKey],
          redeemedAt: nowIso,
        },
      }));
      setRedeemFeedback({
        code: outcome.code,
        message: `${outcome.message.replace(/\.$/, '')} (${nowIso}).`,
      });
      return;
    }

    setRedeemFeedback({ code: outcome.code, message: outcome.message });
  };

  return (
    <div className="space-y-14">
      {/* Section 09 & 10: User & Admin Guides */}
      <section id="user-guide" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-xs text-[#57534E] tabular-nums">
              Разделы 09–10 · Эксплуатация пользователями и операторами
            </div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
              9–10. Руководства пользователя и администратора
            </h2>
          </div>

          <div className="flex flex-wrap gap-1 p-1 bg-white border border-[#E2DDD4] rounded-lg self-start">
            {[
              { key: 'user' as const, label: 'Участник (AR)' },
              { key: 'content' as const, label: 'Content Manager' },
              { key: 'event' as const, label: 'Event Manager' },
              { key: 'admin' as const, label: 'Admin (Directus)' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setGuideTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  guideTab === tab.key
                    ? 'bg-[#1E3A8A] text-white'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guide Content Panel */}
        <div id="guides-roles" className="scroll-mt-24">
        {guideTab === 'user' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[#1C1917]">
                  9.1–9.3. Установка, прохождение квеста и получение QR-приглашения
                </h3>
                <ol className="mt-3 space-y-2.5 text-sm text-[#44403C]">
                  <li>
                    <span className="font-semibold text-[#1C1917]">1. Первый запуск:</span>{' '}
                    установите приложение (App Store / RuStore), разрешите доступ к камере для AR
                    и при желании зарегистрируйтесь (email + пароль) для накопления достижений.
                  </li>
                  <li>
                    <span className="font-semibold text-[#1C1917]">2. Выбор месяца:</span> на
                    главном экране отображается активный персонаж (например, «Ноябрь — Витус Беринг»).
                  </li>
                  <li>
                    <span className="font-semibold text-[#1C1917]">3. Запуск AR-сцены:</span>{' '}
                    наведите камеру на настенный календарь или AR-маркер в музее — персонаж «оживёт».
                  </li>
                  <li>
                    <span className="font-semibold text-[#1C1917]">4. Вопросы и печати:</span>{' '}
                    ответьте на 3 вопроса с вариантами и пояснениями. Правильные ответы приносят
                    1–3 печати.
                  </li>
                  <li>
                    <span className="font-semibold text-[#1C1917]">5. Приглашение:</span> соберите
                    3 печати за три месяца подряд, чтобы получить QR-код с датой и местом
                    мероприятия.
                  </li>
                </ol>
              </div>
              <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2.5 text-xs text-[#78350F]">
                <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <span>QR-приглашение действует только до даты мероприятия и только один раз.</span>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2DDD4]">
                <h3 className="text-base font-semibold text-[#1C1917]">
                  9.4. Частые проблемы и решения
                </h3>
              </div>
              <div className="divide-y divide-[#EBE6DF]">
                {TROUBLESHOOTING_ROWS.map((row) => (
                  <div key={row.symptom} className="p-4 space-y-1">
                    <div className="text-sm font-semibold text-[#1C1917]">{row.symptom}</div>
                    <div className="text-xs text-[#44403C] leading-relaxed">{row.solution}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {guideTab === 'content' && (
          <div
            id="admin-guide"
            className="bg-white border border-[#E2DDD4] rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1C1917]">Добавить персонажа</h3>
              <ol className="text-sm text-[#44403C] space-y-1.5 list-decimal list-inside">
                <li>Раздел «Персонажи» → «Создать».</li>
                <li>Заполните имя, эпоху, мифологический образ, описание.</li>
                <li>Загрузите 3D-модель (GLB ≤ 20 МБ) и аудио-приветствие.</li>
                <li>Укажите координаты точки на карте (PostGIS).</li>
                <li>Начните со статуса <code className="font-mono text-xs">draft</code>, после проверки — <code className="font-mono text-xs">published</code>.</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1C1917]">Создать набор вопросов</h3>
              <ol className="text-sm text-[#44403C] space-y-1.5 list-decimal list-inside">
                <li>Раздел «Наборы вопросов» → «Создать».</li>
                <li>Привяжите набор к созданному персонажу.</li>
                <li>Добавьте вопросы: текст, 3 варианта, индекс правильного и пояснение.</li>
              </ol>
              <div className="mt-3 p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#78350F]">
                Индекс правильного ответа никогда не попадает в публичный API.
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1C1917]">Опубликовать месяц</h3>
              <ol className="text-sm text-[#44403C] space-y-1.5 list-decimal list-inside">
                <li>Раздел «Календарные планы» → «Создать».</li>
                <li>Выберите месяц, персонажа и набор вопросов.</li>
                <li>Укажите дату и место офлайн-мероприятия.</li>
                <li>Загрузите изображение маркера для печатного календаря.</li>
                <li>Проверьте превью и сохраните запись.</li>
              </ol>
            </div>
          </div>
        )}

        {guideTab === 'event' && (
          <div className="bg-white border border-[#E2DDD4] rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1C1917]">
                10.3. Проверка и погашение приглашения
              </h3>
              <ol className="text-sm text-[#44403C] space-y-2 list-decimal list-inside">
                <li>Откройте раздел «Приглашения» в портале Refine.</li>
                <li>Отсканируйте QR-код через камеру в портале.</li>
                <li>Проверьте имя участника, полученные достижения и статус приглашения.</li>
                <li>Нажмите «Погасить» — система создаст запись в коллекции <code className="font-mono text-xs">visits</code>.</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1C1917]">Исключительные ситуации</h3>
              <dl className="divide-y divide-[#EBE6DF] text-sm">
                <div className="py-2">
                  <dt className="font-semibold text-[#1C1917]">Просроченное приглашение</dt>
                  <dd className="text-[#44403C]">Погашение недоступно, эскалируйте к Admin.</dd>
                </div>
                <div className="py-2">
                  <dt className="font-semibold text-[#1C1917]">Уже погашено</dt>
                  <dd className="text-[#44403C]">Предупредите пользователя; повторная выдача — только через Admin.</dd>
                </div>
                <div className="py-2">
                  <dt className="font-semibold text-[#1C1917]">QR не читается</dt>
                  <dd className="text-[#44403C]">Найдите приглашение вручную по email пользователя.</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {guideTab === 'admin' && (
          <div className="bg-white border border-[#E2DDD4] rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1C1917]">Управление пользователями</h3>
              <p className="text-sm text-[#44403C] leading-relaxed">
                Раздел «Пользователи» → «Создать»: назначить роль (Content Manager, Event
                Manager, Admin) и отправить приглашение. Правка политик доступа — только через
                Directus Admin UI.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1C1917]">Аудит действий</h3>
              <p className="text-sm text-[#44403C] leading-relaxed">
                Все операции фиксируются в NATS-стриме <code className="font-mono text-xs">AUDIT</code>.
                Выгрузка отчётов доступна через раздел «Аудит» → «Экспорт CSV».
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-[#1C1917]">Регламентное обслуживание</h3>
              <p className="text-sm text-[#44403C] leading-relaxed">
                Ежемесячно проверяйте активный календарный план. Перед мероприятием убедитесь в
                доступе Event Manager.
              </p>
              <div className="mt-2 p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#78350F]">
                При смене пароля Admin обновите секрет в <code className="font-mono">.env</code> и перезапустите Directus.
              </div>
            </div>
          </div>
        )}
        </div>
      </section>

      {/* Interactive Workbench: AR Quest + Event Manager QR Redemption */}
      <section
        id="quest-simulator"
        className="bg-white border border-[#E2DDD4] rounded-xl p-6 sm:p-8 space-y-6 scroll-mt-24"
      >
        <div className="border-b border-[#E2DDD4] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#57534E]">
              Интерактивный стенд · Связка Контуров 1, 3 и 11
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#1C1917]">
              Симулятор AR-квеста и погашения QR-приглашения
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetQuest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] hover:bg-[#EBE6DF] border border-[#D6D0C4] rounded-lg text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить квест</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: AR Mobile Quest Simulator */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-[#57534E]">
              <span className="font-semibold text-[#1C1917]">
                Шаг 1. Клиент участника ({SIMULATOR_QUEST.monthLabel})
              </span>
              <span className="tabular-nums">
                {SIMULATOR_QUEST.era} · {SIMULATOR_QUEST.location}
              </span>
            </div>

            {!arDetected ? (
              <div className="space-y-4">
                <ResilientImage
                  src="/src/assets/images/calendar_ar_marker_preview_1795173334511.jpg"
                  alt="Настенный исторический календарь Прикамья с гравюрой первопроходца — AR-маркер ноября"
                  caption="Рис. 2 — Печатный календарный маркер ноября для распознавания камерой Vuforia"
                />
                <button
                  type="button"
                  onClick={() => setArDetected(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-lg transition-colors cursor-pointer"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Навести камеру на маркер и запустить AR-квест</span>
                </button>
              </div>
            ) : (
              <div className="border border-[#E2DDD4] rounded-xl p-5 bg-[#F7F5F0] space-y-4">
                <div className="flex items-center justify-between text-xs text-[#57534E] tabular-nums">
                  <span>
                    Персонаж: <strong className="text-[#1C1917]">{SIMULATOR_QUEST.characterName}</strong>
                  </span>
                  <span>
                    Вопрос {questionIndex + 1} из {SIMULATOR_QUEST.questions.length}
                  </span>
                </div>

                <h4 className="text-base font-semibold text-[#1C1917] leading-snug">
                  {currentQuestion.text}
                </h4>

                <div className="space-y-2">
                  {currentQuestion.options.map((opt, idx) => {
                    const chosen = selectedAnswers[questionIndex] === idx;
                    const isRight = idx === currentQuestion.correct;
                    let btnStyle =
                      'bg-white border-[#D6D0C4] text-[#1C1917] hover:bg-[#FAF8F5]';
                    if (revealedExplanation) {
                      if (isRight) {
                        btnStyle = 'bg-[#ECFDF5] border-[#16A34A] text-[#14532D] font-medium';
                      } else if (chosen) {
                        btnStyle = 'bg-[#FEF2F2] border-[#DC2626] text-[#7F1D1D]';
                      } else {
                        btnStyle = 'bg-white/60 border-[#E2DDD4] text-[#78716C]';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(idx)}
                        disabled={revealedExplanation}
                        className={`w-full text-left px-4 py-2.5 text-sm rounded-lg border transition-colors cursor-pointer disabled:cursor-default ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {revealedExplanation && (
                  <div className="p-3.5 rounded-lg bg-white border border-[#E2DDD4] text-xs text-[#44403C] leading-relaxed space-y-2">
                    <div className="font-semibold text-[#1C1917]">
                      Пояснение (проверено воркером):
                    </div>
                    <p>{currentQuestion.explanation}</p>
                  </div>
                )}

                {revealedExplanation && !isQuestFinished && (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-lg transition-colors cursor-pointer"
                  >
                    Следующий вопрос
                  </button>
                )}

                {isQuestFinished && (
                  <div className="p-4 rounded-lg bg-white border border-[#D6D0C4] space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#14532D]">
                      <Award className="w-4 h-4 text-[#16A34A]" />
                      <span className="tabular-nums">
                        Квест завершён · Правильных ответов: {correctCount} из 3 · Начислено печатей:{' '}
                        {Math.max(1, correctCount)}
                      </span>
                    </div>
                    <p className="text-xs text-[#57534E]">
                      Directus Webhook отправил событие <code className="font-mono">quests.completed</code> в
                      NATS. Серия за 3 месяца сформировала QR-приглашение.
                    </p>
                    <button
                      type="button"
                      onClick={handleIssueRewardToken}
                      className="px-4 py-2 text-xs font-medium text-white bg-[#14532D] hover:bg-[#166534] rounded-lg transition-colors cursor-pointer"
                    >
                      Передать выпущенный QR-токен в сканер организатора
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Event Manager QR Scanner & Redemption */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-[#57534E]">
              <span className="font-semibold text-[#1C1917]">
                Шаг 2. Портал Event Manager (§10.3)
              </span>
              <span>POST /items/invitations/&#123;id&#125;/redeem</span>
            </div>

            {/*
              Rendered from the same document that drives the behaviour, so a
              reader can compare the picture with what the buttons do. Generating
              it instead of hand-drawing a diagram is the point.
            */}
            <details className="group border border-[#E2DDD4] rounded-xl bg-white overflow-hidden">
              <summary className="px-4 py-2.5 text-xs font-medium text-[#1C1917] cursor-pointer select-none hover:bg-[#F7F5F0] transition-colors">
                Схема переходов состояний
                <span className="ml-1.5 text-[#57534E] font-normal">
                  — генерируется из {REDEMPTION_WORKFLOW.id} v{REDEMPTION_WORKFLOW.version}
                </span>
              </summary>
              <div className="px-4 pb-4 pt-1">
                <pre className="text-[11px] leading-relaxed text-[#44403C] bg-[#F7F5F0] border border-[#E2DDD4] rounded-lg p-3 overflow-x-auto">
                  <code>{toMermaid(REDEMPTION_WORKFLOW)}</code>
                </pre>
                <ul className="mt-3 space-y-1 text-[11px] text-[#57534E]">
                  {REDEMPTION_WORKFLOW.rules.map((rule) => (
                    <li key={`${rule.from}-${rule.action}`} className="flex gap-2">
                      <code className="font-mono text-[#1E3A8A] shrink-0">
                        {rule.from}
                      </code>
                      <span aria-hidden="true">→</span>
                      <code className="font-mono text-[#1C1917] shrink-0">
                        {rule.to}
                      </code>
                      <span className="text-[#57534E]">{rule.code}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>

            <div className="border border-[#E2DDD4] rounded-xl p-5 bg-[#F7F5F0] space-y-4">
              <div>
                <span className="block text-xs font-medium text-[#57534E] mb-1.5">
                  Сценарии тестирования QR (§10.3)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'valid', label: 'Действительное' },
                    { key: 'expired', label: 'Просрочено' },
                    { key: 'redeemed', label: 'Уже погашено' },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        setActiveTokenKey(preset.key);
                        setLookupInput(invitations[preset.key].token);
                        setRedeemFeedback(null);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTokenKey === preset.key
                          ? 'bg-[#1E3A8A] text-white'
                          : 'bg-white border border-[#E2DDD4] text-[#44403C] hover:bg-[#EFECE6]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="qr-lookup"
                  className="block text-xs font-medium text-[#57534E] mb-1.5"
                >
                  Поиск по токену QR или email пользователя
                </label>
                <div className="flex gap-2">
                  <input
                    id="qr-lookup"
                    type="text"
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-white border border-[#D6D0C4] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
                  />
                  <button
                    type="button"
                    onClick={handleLookupByInput}
                    className="px-3.5 py-2 text-xs font-medium bg-white border border-[#D6D0C4] hover:bg-[#EFECE6] text-[#1C1917] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Найти
                  </button>
                </div>
              </div>

              {currentInvitation && (
                <div className="p-4 rounded-lg bg-white border border-[#E2DDD4] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-[#1C1917]">
                        {currentInvitation.userName}
                      </div>
                      <div className="font-mono text-xs text-[#57534E]">
                        {currentInvitation.userEmail} · Токен: {currentInvitation.token}
                      </div>
                    </div>
                    <QrCode className="w-8 h-8 text-[#1E3A8A] shrink-0" strokeWidth={1.5} />
                  </div>

                  <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EBE6DF] text-xs tabular-nums">
                    <div>
                      <dt className="text-[#78716C]">Мероприятие</dt>
                      <dd className="font-medium text-[#1C1917] mt-0.5">
                        {currentInvitation.eventTitle}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#78716C]">Печатей в серии</dt>
                      <dd className="font-medium text-[#1C1917] mt-0.5">
                        {currentInvitation.sealsCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#78716C]">Действует до</dt>
                      <dd className="font-mono text-[#1C1917] mt-0.5">
                        {currentInvitation.expiresAt.slice(0, 10)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#78716C]">Текущий статус</dt>
                      <dd className="font-medium mt-0.5">
                        {currentInvitation.redeemedAt ? (
                          <span className="text-[#9A3412]">Погашено</span>
                        ) : currentInvitation.expired ? (
                          <span className="text-[#DC2626]">Просрочено</span>
                        ) : (
                          <span className="text-[#16A34A]">Действительно</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={handleRedeemInvitation}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-lg transition-colors cursor-pointer"
                  >
                    Погасить приглашение
                  </button>
                </div>
              )}

              {redeemFeedback && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    redeemFeedback.code === 'SUCCESS'
                      ? 'bg-[#ECFDF5] border-[#86EFAC] text-[#14532D]'
                      : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#7F1D1D]'
                  }`}
                >
                  {redeemFeedback.code === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{redeemFeedback.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
