import { AlertTriangle, ChevronRight } from 'lucide-react';
import { CONTOURS } from '../data/projectDocs';

interface ContoursExplorerProps {
  selectedContourNum: number;
  onSelectContour: (num: number) => void;
}

export function ContoursExplorer({
  selectedContourNum,
  onSelectContour,
}: ContoursExplorerProps) {
  const activeContour =
    CONTOURS.find((c) => c.num === selectedContourNum) ?? CONTOURS[0];

  return (
    <section id="contours" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
      <div className="max-w-3xl">
        <div className="text-xs text-[#57534E] tabular-nums">Раздел 02 · Архитектурные слои</div>
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
          2. 11 архитектурных контуров
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[#44403C] leading-relaxed">
          Система декомпозирована на 11 контуров. Каждый контур — самостоятельный архитектурный
          слой с чётко определённой зоной ответственности и внешними интерфейсами.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of 11 Contours */}
        <div className="lg:col-span-5 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden divide-y divide-[#EBE6DF]">
          {CONTOURS.map((contour) => {
            const isActive = contour.num === activeContour.num;
            return (
              <button
                key={contour.num}
                type="button"
                onClick={() => onSelectContour(contour.num)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-white hover:bg-[#FAF8F5] text-[#1C1917]'
                }`}
              >
                <div className="flex items-baseline gap-3 min-w-0">
                  <span
                    className={`font-mono text-xs tabular-nums shrink-0 ${
                      isActive ? 'text-[#BFDBFE]' : 'text-[#78716C]'
                    }`}
                  >
                    {String(contour.num).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{contour.title}</div>
                    <div
                      className={`text-xs truncate ${
                        isActive ? 'text-[#DBEAFE]' : 'text-[#78716C]'
                      }`}
                    >
                      {contour.englishName}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-[#A8A29E]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-7 bg-white border border-[#E2DDD4] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E2DDD4] pb-4">
            <div className="text-xs text-[#57534E] tabular-nums">
              Контур {activeContour.num} из 11 · {activeContour.englishName}
            </div>
            <h3 className="mt-1 font-display text-2xl font-semibold text-[#1C1917]">
              {activeContour.title}
            </h3>
          </div>

          <dl className="divide-y divide-[#EBE6DF] text-sm">
            <div className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <dt className="sm:col-span-4 font-semibold text-[#1C1917]">Назначение</dt>
              <dd className="sm:col-span-8 text-[#44403C] leading-relaxed">
                {activeContour.purpose}
              </dd>
            </div>
            <div className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <dt className="sm:col-span-4 font-semibold text-[#1C1917]">Компоненты</dt>
              <dd className="sm:col-span-8 text-[#44403C]">{activeContour.components}</dd>
            </div>
            <div className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <dt className="sm:col-span-4 font-semibold text-[#1C1917]">Ответственность</dt>
              <dd className="sm:col-span-8 text-[#44403C] leading-relaxed">
                {activeContour.responsibility}
              </dd>
            </div>
            <div className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <dt className="sm:col-span-4 font-semibold text-[#1C1917]">Интерфейсы</dt>
              <dd className="sm:col-span-8 font-mono text-xs text-[#1E3A8A] leading-relaxed">
                {activeContour.interfaces}
              </dd>
            </div>
            {activeContour.details.map((item) => (
              <div key={item.label} className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
                <dt className="sm:col-span-4 font-semibold text-[#1C1917]">{item.label}</dt>
                <dd className="sm:col-span-8 text-[#44403C] tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>

          {activeContour.warning && (
            <div className="p-4 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <div className="text-sm text-[#78350F]">
                <span className="font-semibold">Критичное ограничение: </span>
                {activeContour.warning}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
