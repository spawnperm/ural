import { Search, X } from 'lucide-react';
import { AudienceKey, DOC_SECTIONS } from '../data/projectDocs';

interface SidebarNavProps {
  activeSection: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  audienceFilter: AudienceKey;
  onAudienceChange: (audience: AudienceKey) => void;
  onSelectSection: (id: string) => void;
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
  searchQuery,
  onSearchChange,
  audienceFilter,
  onAudienceChange,
  onSelectSection,
}: SidebarNavProps) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSections = DOC_SECTIONS.filter((sec) => {
    const matchesAudience =
      audienceFilter === 'all' || sec.audienceKeys.includes(audienceFilter);
    const matchesSearch =
      !normalizedQuery ||
      sec.title.toLowerCase().includes(normalizedQuery) ||
      sec.purpose.toLowerCase().includes(normalizedQuery) ||
      sec.audience.toLowerCase().includes(normalizedQuery);
    return matchesAudience && matchesSearch;
  });

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
            placeholder="Например: NATS, RBAC, Directus..."
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

      <nav aria-label="Оглавление документации" className="border-t border-[#E2DDD4] pt-4">
        <div className="text-xs font-medium text-[#57534E] mb-2">
          Оглавление ({filteredSections.length})
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
          <ul className="space-y-1">
            {filteredSections.map((sec) => {
              const isCurrent = activeSection === sec.id;
              return (
                <li key={sec.id}>
                  <a
                    href={`#${sec.id}`}
                    onClick={() => onSelectSection(sec.id)}
                    className={`group flex items-baseline gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isCurrent
                        ? 'bg-white border border-[#D6D0C4] text-[#1C1917] font-semibold'
                        : 'text-[#44403C] hover:bg-[#EFECE6]/70 hover:text-[#1C1917]'
                    }`}
                  >
                    <span className="font-mono text-xs text-[#78716C] tabular-nums shrink-0 w-6">
                      {sec.number}.
                    </span>
                    <span className="truncate">{sec.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}
