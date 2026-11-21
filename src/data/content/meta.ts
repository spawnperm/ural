export type AudienceKey = 'all' | 'developers' | 'devops' | 'admins' | 'users';

export interface DocSubsectionMeta {
  id: string;
  label: string;
}

export interface DocCategoryMeta {
  id: string;
  title: string;
}

export interface DocSectionMeta {
  id: string;
  number: string;
  title: string;
  categoryId: string;
  audience: string;
  audienceKeys: AudienceKey[];
  purpose: string;
  subsections: DocSubsectionMeta[];
}

export const DOC_META = {
  title: 'Первооткрыватели Прикамья',
  subtitle: 'AR-квест по историческим дорогам Пермского края',
  version: '1.1 (расширенный стек)',
  status: 'Готов к внутреннему ревью',
  date: '2026-11-20',
};

export const DOC_CATEGORIES: DocCategoryMeta[] = [
  { id: 'foundation', title: 'Основы и архитектура' },
  { id: 'domain-api', title: 'Домен, данные и API' },
  { id: 'guides', title: 'Руководства и стенд' },
  { id: 'ops-stack', title: 'Развёртывание, эксплуатация и ADR' },
];

