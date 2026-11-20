import { Menu, X } from 'lucide-react';

interface TopBarProps {
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onJumpToSimulator: () => void;
}

export function TopBar({
  mobileMenuOpen,
  onToggleMobileMenu,
  onJumpToSimulator,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#F7F5F0]/95 backdrop-blur-sm border-b border-[#E2DDD4]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#overview"
          className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1E3A8A] rounded"
        >
          Первооткрыватели Прикамья
        </a>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav
          aria-label="Основная навигация"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#57534E]"
        >
          <a
            href="#overview"
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Обзор
          </a>
          <a
            href="#contours"
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            11 контуров
          </a>
          <a
            href="#data-model"
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Модель и API
          </a>
          <a
            href="#deployment"
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Развёртывание
          </a>
          <a
            href="#user-guide"
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Руководства
          </a>
        </nav>

        {/* Zone 3: 1 primary action (with mobile drawer trigger on narrow screens) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onJumpToSimulator}
            className="px-4 py-2 text-xs font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            Симулятор квеста
          </button>
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Закрыть оглавление' : 'Открыть оглавление'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E2DDD4] bg-white text-[#1C1917] hover:bg-[#F1EEE8] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
