import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { EMDASH_ADR_CRITERIA, EXTENDED_STACK_ITEMS } from '../data/projectDocs';

const DEFAULT_QUESTION_JSON = `{
  "id": "q1",
  "text": "Через какой город Прикамья проходила Вторая Камчатская экспедиция?",
  "options": ["Оса", "Кунгур", "Соликамск"],
  "correct": 0,
  "explanation": "Оса на реке Каме была опорным пунктом маршрута Витуса Беринга в 1733 году."
}`;

const INVALID_QUESTION_JSON = `{
  "id": "",
  "text": "Вопрос без трёх вариантов",
  "options": ["Оса"],
  "correct": 4,
  "explanation": ""
}`;

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateQuestionContract(rawJson: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { valid: false, errors: ['Синтаксическая ошибка JSON: проверьте кавычки и запятые.'] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, errors: ['Ожидается JSON-объект вопроса.'] };
  }

  const obj = parsed as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof obj.id !== 'string' || obj.id.trim().length === 0) {
    errors.push('id: обязательная непустая строка (z.string().min(1)).');
  }
  if (typeof obj.text !== 'string' || obj.text.trim().length < 5) {
    errors.push('text: текст вопроса должен содержать минимум 5 символов.');
  }
  if (
    !Array.isArray(obj.options) ||
    obj.options.length !== 3 ||
    obj.options.some((opt) => typeof opt !== 'string' || opt.trim().length === 0)
  ) {
    errors.push('options: массив ровно из 3 непустых строк (z.array(z.string()).length(3)).');
  }
  if (
    typeof obj.correct !== 'number' ||
    !Number.isInteger(obj.correct) ||
    obj.correct < 0 ||
    obj.correct > 2
  ) {
    errors.push('correct: целое число от 0 до 2 (z.number().int().min(0).max(2)).');
  }
  if (typeof obj.explanation !== 'string' || obj.explanation.trim().length < 5) {
    errors.push('explanation: обязательное пояснение (минимум 5 символов).');
  }

  return { valid: errors.length === 0, errors };
}

export function StackExtensionAndAdrSection() {
  const [selectedTool, setSelectedTool] = useState<string>(EXTENDED_STACK_ITEMS[0].tool);
  const [jsonDraft, setJsonDraft] = useState<string>(DEFAULT_QUESTION_JSON);

  const activeTool =
    EXTENDED_STACK_ITEMS.find((item) => item.tool === selectedTool) ??
    EXTENDED_STACK_ITEMS[0];

  const validation = validateQuestionContract(jsonDraft);

  return (
    <section id="extended-stack" className="space-y-8 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
      <div className="max-w-3xl">
        <div className="text-xs text-[#57534E] tabular-nums">
          Раздел 12 · Расширение архитектуры и ADR-01
        </div>
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
          12. Расширенный стек (Traefik, Temporal, Dify, AtomicCMS, Docusaurus, Storybook, Zod) и оценка EmDash
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[#44403C] leading-relaxed">
          Распределение дополнительных инженерных инструментов по контурам системы и
          архитектурное решение (ADR-01) о применимости CMS EmDash.
        </p>
      </div>

      {/* Tool Explorer */}
      <div id="stack-tools" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-24">
        <div className="lg:col-span-5 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden divide-y divide-[#EBE6DF]">
          {EXTENDED_STACK_ITEMS.map((item) => {
            const isActive = item.tool === activeTool.tool;
            return (
              <button
                key={item.tool}
                type="button"
                onClick={() => setSelectedTool(item.tool)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-white hover:bg-[#FAF8F5] text-[#1C1917]'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{item.tool}</div>
                  <div
                    className={`text-xs truncate ${
                      isActive ? 'text-[#DBEAFE]' : 'text-[#57534E]'
                    }`}
                  >
                    {item.contour}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-5">
          <div className="border-b border-[#E2DDD4] pb-3">
            <div className="text-xs text-[#57534E]">{activeTool.contour}</div>
            <h3 className="mt-1 font-display text-2xl font-semibold text-[#1C1917]">
              {activeTool.tool}
            </h3>
          </div>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-[#1C1917]">Роль в системе</dt>
              <dd className="mt-1 text-[#44403C] leading-relaxed">{activeTool.roleInSystem}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#1C1917]">Интеграция с контурами</dt>
              <dd className="mt-1 text-[#44403C] leading-relaxed">
                {activeTool.integrationDetail}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Live Zod Contract Sandbox */}
      <div id="stack-zod" className="bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-4 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DDD4] pb-4">
          <div>
            <h3 className="text-base font-semibold text-[#1C1917]">
              Проверка контракта Zod (@perm-krai/shared-types)
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Отредактируйте JSON вопроса квеста или загрузите пример с ошибкой для проверки
              runtime-валидации перед публикацией из Refine / Dify.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setJsonDraft(DEFAULT_QUESTION_JSON)}
              className="px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] hover:bg-[#EBE6DF] border border-[#D6D0C4] rounded-lg text-[#1C1917] transition-colors whitespace-nowrap cursor-pointer"
            >
              Валидный пример
            </button>
            <button
              type="button"
              onClick={() => setJsonDraft(INVALID_QUESTION_JSON)}
              className="px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] hover:bg-[#EBE6DF] border border-[#D6D0C4] rounded-lg text-[#1C1917] transition-colors whitespace-nowrap cursor-pointer"
            >
              Пример с ошибками
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            <label htmlFor="zod-json-input" className="sr-only">
              JSON вопроса квеста
            </label>
            <textarea
              id="zod-json-input"
              rows={8}
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              spellCheck={false}
              className="w-full p-4 font-mono text-xs leading-relaxed bg-[#1C1917] text-[#F5F3EE] border border-[#2E2A27] rounded-lg focus:outline-none focus:border-[#1E3A8A]"
            />
          </div>

          <div className="lg:col-span-5 p-4 rounded-lg border border-[#E2DDD4] bg-[#F7F5F0] space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {validation.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span className="text-[#14532D]">QuestionSchema.safeParse(): успешно</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-[#DC2626]" />
                  <span className="text-[#7F1D1D]">Ошибка валидации Zod</span>
                </>
              )}
            </div>

            {validation.valid ? (
              <p className="text-xs text-[#44403C] leading-relaxed">
                Контракт соответствует схеме <code className="font-mono">QuestionSchema</code>:
                ровно 3 варианта ответа, валидный индекс <code className="font-mono">correct</code>{' '}
                (0–2) и заполненное пояснение.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs text-[#7F1D1D] font-mono">
                {validation.errors.map((err) => (
                  <li key={err}>• {err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ADR-01: EmDash Evaluation */}
      <div id="stack-adr-emdash" className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden scroll-mt-24">
        <div className="p-6 border-b border-[#E2DDD4] space-y-2">
          <div className="text-xs text-[#57534E]">
            ADR-01 · Архитектурное решение по выбору CMS
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-semibold text-[#1C1917]">
            Подойдёт ли EmDash для «Первооткрывателей Прикамья»?
          </h3>
          <p className="text-sm text-[#44403C] leading-relaxed max-w-3xl">
            <strong>Вердикт: не подходит для ядра платформы.</strong> EmDash — full-stack TypeScript
            CMS для фреймворка <strong>Astro</strong> (с ориентацией на Cloudflare Workers/D1/R2 и
            редакционную модель наподобие WordPress). Наша система требует API-first BFF для Unity
            AR-клиента и портала Refine, геоданных PostGIS, гранулярного RBAC со скрытием поля{' '}
            <code className="font-mono text-xs">correct</code> и уже включает{' '}
            <code className="font-mono text-xs">Directus + AtomicCMS + Docusaurus</code>.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                <th className="py-2.5 px-4 font-medium">Критерий</th>
                <th className="py-2.5 px-4 font-medium">Требование проекта</th>
                <th className="py-2.5 px-4 font-medium">Особенности EmDash</th>
                <th className="py-2.5 px-4 font-medium">Оценка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE6DF]">
              {EMDASH_ADR_CRITERIA.map((row) => (
                <tr key={row.criterion} className="hover:bg-[#FAF8F5]">
                  <td className="py-3 px-4 font-semibold text-[#1C1917]">{row.criterion}</td>
                  <td className="py-3 px-4 text-[#44403C]">{row.projectRequirement}</td>
                  <td className="py-3 px-4 text-[#44403C]">{row.emdashFit}</td>
                  <td
                    className={`py-3 px-4 font-medium whitespace-nowrap ${
                      row.verdict === 'Подходит' ? 'text-[#16A34A]' : 'text-[#9A3412]'
                    }`}
                  >
                    {row.verdict}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
