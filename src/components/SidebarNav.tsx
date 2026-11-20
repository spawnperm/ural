import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import {
  AudienceKey,
  DOC_CATEGORIES,
  DOC_SECTIONS,
} from '../data/projectDocs';

interface SidebarNavProps {
  activeSection: string;
  activeSubSection: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  audienceFilter: AudienceKey;
  onAudienceChange: (audience: AudienceKey) => void;
  onSelectSection: (sectionId: string, subId?: string) => void;
}

const AUDIENCE_OPTIONS: { key: AudienceKey; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'developers', label: 'Разработчики' },
  { key: 'devops', label: 'DevOps' },
  { key: 'admins', label: 'Админы' },
  { key: 'users', label: 'Участники' },
];

export function SidebarNav({
  activeSection,
  activeSubSection,
  searchQuery,
  onSearchChange,
  audienceFilter,
  onAudienceChange,
  onSelectSection,
}: SidebarNavProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    foundation: true,
    'domain-api': true,
    guides: true,
    'ops-stack': true,
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    api: true,
    'extended-stack': true,
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isFiltering = Boolean(normalizedQuery) || audienceFilter !== 'all';

  const filteredSections = DOC_SECTIONS.filter((sec) => {
    const matchesAudience =
      audienceFilter === 'all' || sec.audienceKeys.includes(audienceFilter);
    const matchesSearch =
      !normalizedQuery ||
      sec.title.toLowerCase().includes(normalizedQuery) ||
      sec.purpose.toLowerCase().includes(normalizedQuery) ||
      sec.audience.toLowerCase().includes(normalizedQuery) ||
      sec.subsections.some((sub) =>
        sub.label.toLowerCase().includes(normalizedQuery)
      );
    return matchesAudience && matchesSearch;
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const allExpanded =
    DOC_CATEGORIES.every((c) => expandedCategories[c.id]) &&
    DOC_SECTIONS.every((s) => expandedSections[s.id]);

  const handleToggleAll = () => {
    const nextState = !allExpanded;
    const nextCats: Record<string, boolean> = {};
    DOC_CATEGORIES.forEach((c) => {
      nextCats[c.id] = nextState;
    });
    const nextSecs: Record<string, boolean> = {};
    DOC_SECTIONS.forEach((s) => {
      nextSecs[s.id] = nextState;
    });
    setExpandedCategories(nextCats);
    setExpandedSections(nextSecs);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="doc-search" className="block text-xs font-medium text-[#57534E] mb-1.5">
          Поиск по разделам и терминам
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="doc-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Например: NATS, RBAC, Zod..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-[#E2DDD4] rounded-lg text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#1E3A8A]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Очистить поиск"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div>
        <span className="block text-xs font-medium text-[#57534E] mb-2">
          Фильтр по аудитории (§0.2)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {AUDIENCE_OPTIONS.map((opt) => {
            const isActive = audienceFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onAudienceChange(opt.key)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-white border border-[#E2DDD4] text-[#44403C] hover:bg-[#EFECE6]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <nav aria-label="Иерархическое оглавление документации" className="border-t border-[#E2DDD4] pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#57534E] tabular-nums">
            Структура ({filteredSections.length})
          </span>
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-xs text-[#1E3A8A] hover:underline cursor-pointer whitespace-nowrap"
          >
            {allExpanded ? 'Свернуть всё' : 'Развернуть всё'}
          </button>
        </div>

        {filteredSections.length === 0 ? (
          <div className="p-3 text-xs text-[#57534E] bg-white border border-[#E2DDD4] rounded-lg">
            Нет разделов по вашему фильтру.{' '}
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onAudienceChange('all');
              }}
              className="text-[#1E3A8A] underline cursor-pointer"
            >
              Сбросить
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {DOC_CATEGORIES.map((category) => {
              const catSections = filteredSections.filter(
                (s) => s.categoryId === category.id
              );
              if (catSections.length === 0) return null;

              const isCatExpanded = isFiltering || expandedCategories[category.id];

              return (
                <div key={category.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={isCatExpanded}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] rounded-md hover:bg-[#EFECE6]/70 transition-colors cursor-pointer text-left"
                  >
                    <span className="truncate">{category.title}</span>
                    {isCatExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>

                  {isCatExpanded && (
                    <ul className="space-y-0.5 pl-1">
                      {catSections.map((sec) => {
                        const isSectionActive = activeSection === sec.id;
                        const hasSubsections = sec.subsections.length > 0;
                        const isSecExpanded =
                          isFiltering ||
                          expandedSections[sec.id] ||
                          isSectionActive;

                        return (
                          <li key={sec.id}>
                            <div
                              className={`flex items-center justify-between gap-1 rounded-md transition-colors ${
                                isSectionActive
                                  ? 'bg-white border border-[#D6D0C4] text-[#1C1917] font-semibold'
                                  : 'text-[#44403C] hover:bg-[#EFECE6]/70 hover:text-[#1C1917]'
                              }`}
                            >
                              <a
                                href={`#${sec.id}`}
                                onClick={() => onSelectSection(sec.id)}
                                className="flex-1 min-w-0 flex items-baseline gap-2 px-2.5 py-1.5 text-[13px]"
                              >
                                <span className="font-mono text-[11px] text-[#78716C] tabular-nums shrink-0">
                                  {sec.number}.
                                </span>
                                <span className="truncate">{sec.title}</span>
                              </a>
                              {hasSubsections && (
                                <button
                                  type="button"
                                  onClick={() => toggleSection(sec.id)}
                                  aria-label={`Подразделы: ${sec.title}`}
                                  aria-expanded={isSecExpanded}
                                  className="p-1.5 mr-1 text-[#78716C] hover:text-[#1C1917] rounded cursor-pointer shrink-0"
                                >
                                  {isSecExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {hasSubsections && isSecExpanded && (
                              <ul className="mt-0.5 ml-3.5 pl-2.5 border-l border-[#D6D0C4] space-y-0.5">
                                {sec.subsections.map((sub) => {
                                  const isSubActive = activeSubSection === sub.id;
                                  return (
                                    <li key={sub.id}>
                                      <a
                                        href={`#${sub.id}`}
                                        onClick={() => onSelectSection(sec.id, sub.id)}
                                        className={`block px-2 py-1 text-xs rounded transition-colors truncate ${
                                          isSubActive
                                            ? 'text-[#1E3A8A] font-semibold bg-[#EEF2FF]'
                                            : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFECE6]/60'
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}
