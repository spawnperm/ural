/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ApiAndRbacSection } from './components/ApiAndRbacSection';
import { ContoursExplorer } from './components/ContoursExplorer';
import { DeploymentAndOpsSection } from './components/DeploymentAndOpsSection';
import { DomainAndDataSection } from './components/DomainAndDataSection';
import { GitCommitPushPanel } from './components/GitCommitPushPanel';
import { GuidesAndSimulatorSection } from './components/GuidesAndSimulatorSection';
import { HeroOverview } from './components/HeroOverview';
import { SidebarNav } from './components/SidebarNav';
import { StackExtensionAndAdrSection } from './components/StackExtensionAndAdrSection';
import { ImprovementBoard } from './components/ImprovementBoard';
import { TableOfContents } from './components/TableOfContents';
import { TopBar } from './components/TopBar';
import { VersionSelectorBar } from './components/VersionSelectorBar';
import { AudienceKey, DOC_META, DOC_SECTIONS } from './data/projectDocs';
import { DOC_VERSIONS } from './data/versions';

export default function App() {
  const [selectedVersionId, setSelectedVersionId] = useState<string>('v1.0');
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [activeSubSection, setActiveSubSection] = useState<string>('overview-mechanics');
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [audienceFilter, setAudienceFilter] = useState<AudienceKey>('all');
  const [selectedContourNum, setSelectedContourNum] = useState<number>(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [gitModalOpen, setGitModalOpen] = useState<boolean>(false);

  const selectedVersion =
    DOC_VERSIONS.find((v) => v.id === selectedVersionId) ?? DOC_VERSIONS[0];

  useEffect(() => {
    const allowedIds = new Set(selectedVersion.includedSectionIds);
    const activeDocSections = DOC_SECTIONS.filter((s) => allowedIds.has(s.id));
    const sectionIds = activeDocSections.map((s) => s.id);
    const sectionEls = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const subIds = activeDocSections.flatMap((s) =>
      s.subsections.map((sub) => sub.id)
    );
    const subEls = subIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: 0 }
    );

    const subObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSubSection(visible[0].target.id);
        }
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );

    sectionEls.forEach((el) => sectionObserver.observe(el));
    subEls.forEach((el) => subObserver.observe(el));

    const handleScroll = () => {
      const docEl = document.documentElement;
      const total = docEl.scrollHeight - docEl.clientHeight;
      if (total <= 0) {
        setScrollProgress(0);
        return;
      }
      const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / total) * 100)));
      setScrollProgress(pct);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      sectionObserver.disconnect();
      subObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [selectedVersion]);

  const handleSelectVersion = (versionId: string) => {
    const nextVersion =
      DOC_VERSIONS.find((v) => v.id === versionId) ?? DOC_VERSIONS[0];
    setSelectedVersionId(nextVersion.id);
    if (!nextVersion.includedSectionIds.includes(activeSection)) {
      setActiveSection('overview');
      setActiveSubSection('overview-mechanics');
    }
  };

  const handleJumpToSimulator = () => {
    const el = document.getElementById('quest-simulator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleSelectContour = (num: number) => {
    setSelectedContourNum(num);
    setActiveSection('contours');
  };

  const handleSelectNavigation = (sectionId: string, subId?: string) => {
    setActiveSection(sectionId);
    if (subId) {
      setActiveSubSection(subId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#1C1917]">
      <TopBar
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onJumpToSimulator={handleJumpToSimulator}
      />

      <VersionSelectorBar
        selectedVersion={selectedVersion}
        onSelectVersion={handleSelectVersion}
      />

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-20 bg-[#F7F5F0] border-t border-[#E2DDD4] overflow-y-auto p-6">
          <SidebarNav
            activeSection={activeSection}
            activeSubSection={activeSubSection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            audienceFilter={audienceFilter}
            onAudienceChange={setAudienceFilter}
            includedSectionIds={selectedVersion.includedSectionIds}
            onSelectSection={(secId, subId) => {
              handleSelectNavigation(secId, subId);
              setMobileMenuOpen(false);
            }}
          />
        </div>
      )}

      {/* Main 1440px Desktop Workspace: Left Sidebar + Main Content + Right TOC */}
      <div className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 flex flex-col lg:flex-row gap-8 items-start">
        <aside className="hidden lg:block w-[260px] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <SidebarNav
            activeSection={activeSection}
            activeSubSection={activeSubSection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            audienceFilter={audienceFilter}
            onAudienceChange={setAudienceFilter}
            includedSectionIds={selectedVersion.includedSectionIds}
            onSelectSection={handleSelectNavigation}
          />
        </aside>

        <main className="flex-1 min-w-0 space-y-14">
          <TableOfContents
            variant="mobile"
            activeSection={activeSection}
            activeSubSection={activeSubSection}
            scrollProgress={scrollProgress}
            includedSectionIds={selectedVersion.includedSectionIds}
            onSelectAnchor={handleSelectNavigation}
          />
          <HeroOverview
            searchQuery={searchQuery}
            versionSnapshot={selectedVersion}
            onSelectContour={handleSelectContour}
            onOpenGitModal={() => setGitModalOpen(true)}
          />
          {selectedVersion.includedSectionIds.includes('contours') && (
            <ContoursExplorer
              selectedContourNum={selectedContourNum}
              onSelectContour={setSelectedContourNum}
            />
          )}
          <DomainAndDataSection
            includedSectionIds={selectedVersion.includedSectionIds}
          />
          <ApiAndRbacSection
            includedSectionIds={selectedVersion.includedSectionIds}
          />
          {selectedVersion.includedSectionIds.includes('user-guide') && (
            <GuidesAndSimulatorSection />
          )}
          <DeploymentAndOpsSection
            includedSectionIds={selectedVersion.includedSectionIds}
          />
          {selectedVersion.includedSectionIds.includes('extended-stack') && (
            <StackExtensionAndAdrSection />
          )}
          <ImprovementBoard />
        </main>

        <TableOfContents
          variant="desktop"
          activeSection={activeSection}
          activeSubSection={activeSubSection}
          scrollProgress={scrollProgress}
          includedSectionIds={selectedVersion.includedSectionIds}
          onSelectAnchor={handleSelectNavigation}
        />
      </div>

      {/* Git Commit & Push Modal */}
      {gitModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Применение изменений: коммит и пуш"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl">
            <button
              type="button"
              onClick={() => setGitModalOpen(false)}
              aria-label="Закрыть окно"
              className="absolute right-4 top-4 z-10 p-1.5 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-[#F7F5F0] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="[&>div]:pr-12">
              <GitCommitPushPanel />
            </div>
          </div>
        </div>
      )}

      {/* Institutional Footer */}
      <footer className="border-t border-[#E2DDD4] bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#57534E]">
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="font-semibold text-[#1C1917]">{DOC_META.title}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedVersion.subtitle}</span>
            <span aria-hidden="true">·</span>
            <span>Версия {selectedVersion.version}</span>
            <span aria-hidden="true">·</span>
            <span>{selectedVersion.date}</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#overview" className="hover:text-[#1C1917] transition-colors">
              К началу
            </a>
            <a href="#contours" className="hover:text-[#1C1917] transition-colors">
              11 контуров
            </a>
            <a href="#quest-simulator" className="hover:text-[#1C1917] transition-colors">
              Симулятор квеста
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
