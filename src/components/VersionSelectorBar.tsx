import { useState } from 'react';
import { Archive, Code2, History } from 'lucide-react';
import { DOC_VERSIONS, DocVersionSnapshot } from '../data/versions';

interface VersionSelectorBarProps {
  selectedVersion: DocVersionSnapshot;
  onSelectVersion: (versionId: string) => void;
}

export function VersionSelectorBar({
  selectedVersion,
  onSelectVersion,
}: VersionSelectorBarProps) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="bg-white border-b border-[#E2DDD4]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Version selector + metadata */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#1E3A8A] shrink-0" />
              <label
                htmlFor="doc-version-select"
                className="text-xs font-semibold text-[#1C1917] whitespace-nowrap"
              >
                Версия документации:
              </label>
              <select
                id="doc-version-select"
                value={selectedVersion.id}
                onChange={(e) => onSelectVersion(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-medium bg-[#F7F5F0] border border-[#D6D0C4] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#1E3A8A] cursor-pointer"
              >
                {DOC_VERSIONS.map((ver) => (
                  <option key={ver.id} value={ver.id}>
                    {ver.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#57534E] tabular-nums">
              <span>Статус: {selectedVersion.status}</span>
              <span aria-hidden="true">·</span>
              <span>Снимок от {selectedVersion.date}</span>
              <span aria-hidden="true">·</span>
              <span>Разделов: {selectedVersion.includedSectionIds.length}</span>
            </div>
          </div>

          {/* Right: Quick switcher tabs & JSON snapshot toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-[#F7F5F0] border border-[#E2DDD4] rounded-lg">
              {DOC_VERSIONS.map((ver) => {
                const isActive = ver.id === selectedVersion.id;
                return (
                  <button
                    key={ver.id}
                    type="button"
                    onClick={() => onSelectVersion(ver.id)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#1E3A8A] font-semibold shadow-xs'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    {ver.id}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowJson((prev) => !prev)}
              aria-expanded={showJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] hover:bg-[#EBE6DF] border border-[#D6D0C4] rounded-lg text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>{showJson ? 'Скрыть JSON' : 'JSON версии'}</span>
            </button>
          </div>
        </div>

        {/* Docusaurus-style Archive Version Banner when viewing historical version */}
        {!selectedVersion.isCurrent && (
          <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#78350F]">
            <div className="flex items-start sm:items-center gap-2.5">
              <Archive className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold">
                  Архивная версия {selectedVersion.id} от {selectedVersion.date}.
                </span>{' '}
                Показаны разделы, стек и изменения из JSON-архива этой редакции.
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectVersion('v1.0')}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#F59E0B] hover:bg-[#FEF3C7] text-[#78350F] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Перейти к текущей v1.0
            </button>
          </div>
        )}

        {/* Collapsible Changelog + Raw Archived JSON Viewer */}
        {showJson && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
            <div className="lg:col-span-5 p-4 rounded-lg bg-[#F7F5F0] border border-[#E2DDD4] space-y-2">
              <div className="text-xs font-semibold text-[#1C1917]">
                Изменения в редакции {selectedVersion.id} ({selectedVersion.date})
              </div>
              <ul className="space-y-1.5 text-xs text-[#44403C]">
                {selectedVersion.changelog.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-7 border border-[#E2DDD4] rounded-lg overflow-hidden bg-[#1C1917] text-[#F5F3EE]">
              <div className="px-3.5 py-2 bg-[#25221F] border-b border-[#2E2A27] text-[11px] font-mono text-[#A8A29E]">
                src/data/versions/{selectedVersion.id}.json
              </div>
              <pre className="p-3.5 max-h-56 overflow-auto text-[11px] font-mono leading-relaxed tabular-nums">
                <code>{JSON.stringify(selectedVersion, null, 2)}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
