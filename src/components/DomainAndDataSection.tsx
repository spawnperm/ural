import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  BOUNDED_CONTEXTS,
  CONTEXT_RELATIONS,
  DATA_COLLECTIONS,
  DATA_CONSTRAINTS,
  EVENT_CONTRACT_EXAMPLE,
} from '../data/projectDocs';
import { CopyCodeBlock } from './CopyCodeBlock';

interface DomainAndDataSectionProps {
  includedSectionIds?: string[];
}

export function DomainAndDataSection({
  includedSectionIds,
}: DomainAndDataSectionProps) {
  const [selectedCollectionName, setSelectedCollectionName] = useState<string>(
    DATA_COLLECTIONS[0].name
  );

  const activeCollection =
    DATA_COLLECTIONS.find((c) => c.name === selectedCollectionName) ??
    DATA_COLLECTIONS[0];

  const showDdd = !includedSectionIds || includedSectionIds.includes('ddd');
  const showDataModel =
    !includedSectionIds || includedSectionIds.includes('data-model');

  if (!showDdd && !showDataModel) {
    return null;
  }

  return (
    <div className="space-y-14">
      {/* Section 03: DDD Context Map */}
      {showDdd && (
      <section id="ddd" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="max-w-3xl">
          <div className="text-xs text-[#57534E] tabular-nums">Раздел 03 · Предметно-ориентированное проектирование</div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
            3. DDD: контекстная карта и событийные контракты
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#44403C] leading-relaxed">
            Границы ответственности разделены на пять ограниченных контекстов, взаимодействующих
            через опубликованные контракты событий в NATS и общее ядро авторизации Directus.
          </p>
        </div>

        {/* 3.1 Bounded Contexts */}
        <div id="ddd-contexts" className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-[#E2DDD4]">
            <h3 className="text-base font-semibold text-[#1C1917]">
              3.1. Ограниченные контексты (Bounded Contexts)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-2.5 px-4 font-medium">Контекст</th>
                  <th className="py-2.5 px-4 font-medium">Ядро домена</th>
                  <th className="py-2.5 px-4 font-medium">Агрегаты</th>
                  <th className="py-2.5 px-4 font-medium">События</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {BOUNDED_CONTEXTS.map((ctx) => (
                  <tr key={ctx.name} className="hover:bg-[#FAF8F5]">
                    <td className="py-3 px-4 font-semibold text-[#1C1917] whitespace-nowrap">
                      {ctx.name}
                    </td>
                    <td className="py-3 px-4 text-[#44403C]">{ctx.core}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#44403C]">
                      {ctx.aggregates.join(', ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#1E3A8A]">
                      {ctx.events.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3.2 Relations + 3.3 Contract */}
        <div id="ddd-relations" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-24">
          <div className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#1C1917]">
              3.2. Отношения между контекстами (Context Map)
            </h3>
            <div className="divide-y divide-[#EBE6DF]">
              {CONTEXT_RELATIONS.map((rel) => (
                <div key={rel.pair} className="py-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#1C1917]">{rel.pair}</span>
                    <span className="font-mono text-xs text-[#1E3A8A]">{rel.pattern}</span>
                  </div>
                  <p className="text-sm text-[#44403C]">{rel.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <CopyCodeBlock
              code={EVENT_CONTRACT_EXAMPLE}
              label="3.3. Формат событийного контракта (QuestCompleted)"
            />
            <div className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <p className="text-sm text-[#78350F]">
                Все события версионируются (<code className="font-mono">version</code>). Обратная
                несовместимость — только через новый <code className="font-mono">eventType</code> с
                суффиксом <code className="font-mono">.v2</code>.
              </p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Section 04: Data Model */}
      {showDataModel && (
      <section id="data-model" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="max-w-3xl">
          <div className="text-xs text-[#57534E] tabular-nums">Раздел 04 · PostgreSQL + PostGIS</div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
            4. Модель данных (коллекции Directus)
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#44403C] leading-relaxed">
            Выберите коллекцию Directus для просмотра структуры полей, связей (M2O), геометрии
            PostGIS, ссылок на бакеты Garage S3 и ограничений целостности.
          </p>
        </div>

        {/* Collection Switcher */}
        <div id="data-collections" className="flex flex-wrap gap-1.5 scroll-mt-24">
          {DATA_COLLECTIONS.map((col) => {
            const isActive = col.name === activeCollection.name;
            return (
              <button
                key={col.name}
                type="button"
                onClick={() => setSelectedCollectionName(col.name)}
                className={`px-3.5 py-2 text-xs font-mono font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-white border border-[#E2DDD4] text-[#44403C] hover:bg-[#EFECE6]'
                }`}
              >
                {col.name}
              </button>
            );
          })}
        </div>

        {/* Active Collection Table */}
        <div className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2DDD4] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#1C1917]">
                Коллекция <code className="font-mono text-[#1E3A8A]">{activeCollection.name}</code>
              </h3>
              <p className="text-xs text-[#57534E] mt-0.5">{activeCollection.title}</p>
            </div>
            <span className="text-xs text-[#78716C] tabular-nums">
              Полей: {activeCollection.fields.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-2.5 px-4 font-medium">Поле</th>
                  <th className="py-2.5 px-4 font-medium">Тип</th>
                  <th className="py-2.5 px-4 font-medium">Описание / Пример</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {activeCollection.fields.map((field) => (
                  <tr key={field.name} className="hover:bg-[#FAF8F5]">
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#1C1917] whitespace-nowrap">
                      {field.name}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-[#1E3A8A] whitespace-nowrap">
                      {field.type}
                    </td>
                    <td className="py-2.5 px-4 text-[#44403C]">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activeCollection.extraNote && (
            <div className="p-4 border-t border-[#E2DDD4] bg-[#FAF8F5]">
              <div className="text-xs font-medium text-[#57534E] mb-2">
                Схема элемента массива <code className="font-mono">questions</code>:
              </div>
              <pre className="p-3 rounded-lg bg-[#1C1917] text-[#F5F3EE] font-mono text-xs overflow-x-auto">
                <code>{activeCollection.extraNote}</code>
              </pre>
            </div>
          )}
        </div>

        {/* 4.2 Индексы и ограничения */}
        <div id="data-constraints" className="bg-white border border-[#E2DDD4] rounded-xl p-6 scroll-mt-24">
          <h3 className="text-base font-semibold text-[#1C1917] mb-3">
            4.2. Индексы и ограничения целостности
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[#44403C]">
            {DATA_CONSTRAINTS.map((rule) => (
              <li
                key={rule}
                className="p-3 rounded-lg bg-[#F7F5F0] border border-[#E2DDD4] font-mono text-xs leading-relaxed"
              >
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}
    </div>
  );
}
