import { useState } from 'react';
import { ArrowUp, ChevronDown, ListTree } from 'lucide-react';
import { DOC_SECTIONS } from '../data/projectDocs';

interface TableOfContentsProps {
  variant: 'mobile' | 'desktop';
  activeSection: string;
  activeSubSection: string;
  scrollProgress: number;
  onSelectAnchor: (sectionId: string, subId?: string) => void;
}

export function TableOfContents({
  variant,
  activeSection,
  activeSubSection,
  scrollProgress,
  onSelectAnchor,
}: TableOfContentsProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const currentSection =
    DOC_SECTIONS.find((s) => s.id === activeSection) ?? DOC_SECTIONS[0];

  if (variant === 'mobile') {
    return (
      <div className="xl:hidden mb-6 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setMobileExpanded((prev) => !prev)}
          aria-expanded={mobileExpanded}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#FAF8F5] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ListTree className="w-4 h-4 text-[#1E3A8A] shrink-0" />
            <div className="min-w-0 text-xs">
              <span className="text-[#57534E]">На этой странице: </span>
              <span className="font-semibold text-[#1C1917] truncate">
                {currentSection.number}. {currentSection.title}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs text-[#78716C] tabular-nums">
              {scrollProgress}%
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#57534E] transition-transform duration-150 ${
                mobileExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {mobileExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-[#E2DDD4] space-y-3 bg-[#FAF8F5]">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-[#78716C]">
                Подразделы текущего блока
              </div>
              <ul className="space-y-1 pl-2 border-l border-[#D6D0C4]">
                {currentSection.subsections.map((sub) => {
                  const isActive = activeSubSection === sub.id;
                  return (
                    <li key={sub.id}>
                      <a
                        href={`#${sub.id}`}
                        onClick={() => {
                          onSelectAnchor(currentSection.id, sub.id);
                          setMobileExpanded(false);
                        }}
                        className={`block py-1 px-2 text-xs rounded ${
                          isActive
                            ? 'text-[#1E3A8A] font-semibold bg-[#EEF2FF]'
                            : 'text-[#44403C] hover:text-[#1C1917]'
                        }`}
                      >
                        {sub.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      aria-label="Содержание страницы"
      className="hidden xl:block w-[220px] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto"
    >
        <div className="border-l border-[#E2DDD4] pl-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#1C1917]">
              <span>На этой странице</span>
              <span className="font-mono text-[11px] font-normal text-[#78716C] tabular-nums">
                {scrollProgress}%
              </span>
            </div>
            <div className="h-0.5 w-full bg-[#E2DDD4] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1E3A8A] transition-[width] duration-150"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
          </div>

          <ul className="space-y-2.5 text-xs">
            {DOC_SECTIONS.map((sec) => {
              const isCurrentSec = activeSection === sec.id;
              return (
                <li key={sec.id} className="space-y-1">
                  <a
                    href={`#${sec.id}`}
                    onClick={() => onSelectAnchor(sec.id)}
                    className={`block leading-snug transition-colors ${
                      isCurrentSec
                        ? 'text-[#1E3A8A] font-semibold'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    <span className="font-mono text-[11px] tabular-nums mr-1.5 text-[#78716C]">
                      {sec.number}.
                    </span>
                    <span>{sec.title}</span>
                  </a>

                  {sec.subsections.length > 0 && isCurrentSec && (
                    <ul className="space-y-1 pl-3 border-l border-[#D6D0C4]">
                      {sec.subsections.map((sub) => {
                        const isSubActive = activeSubSection === sub.id;
                        return (
                          <li key={sub.id}>
                            <a
                              href={`#${sub.id}`}
                              onClick={() => onSelectAnchor(sec.id, sub.id)}
                              className={`block py-0.5 leading-snug transition-colors ${
                                isSubActive
                                  ? 'text-[#1E3A8A] font-medium'
                                  : 'text-[#78716C] hover:text-[#1C1917]'
                              }`}
                            >
                              {sub.label}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="pt-3 border-t border-[#E2DDD4]">
            <a
              href="#overview"
              onClick={() => onSelectAnchor('overview')}
              className="inline-flex items-center gap-1.5 text-xs text-[#57534E] hover:text-[#1C1917] transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>К началу документа</span>
            </a>
          </div>
        </div>
      </aside>
  );
}
