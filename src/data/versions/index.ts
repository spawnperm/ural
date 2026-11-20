import v08 from './v0.8.json';
import v09 from './v0.9.json';
import v10 from './v1.0.json';

export interface DocVersionTechItem {
  component: string;
  technology: string;
  purpose: string;
}

export interface DocVersionSnapshot {
  id: string;
  label: string;
  version: string;
  status: string;
  date: string;
  isCurrent: boolean;
  subtitle: string;
  summary: string;
  stats: {
    contours: string;
    collections: string;
    roles: string;
    slo: string;
  };
  includedSectionIds: string[];
  changelog: string[];
  techStack: DocVersionTechItem[];
}

export const DOC_VERSIONS: DocVersionSnapshot[] = [
  v10 as DocVersionSnapshot,
  v09 as DocVersionSnapshot,
  v08 as DocVersionSnapshot,
];
