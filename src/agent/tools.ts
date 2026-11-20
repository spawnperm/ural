/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Documentation search tools for the assistant.
 *
 * ## What these are for
 *
 * The portal holds its content in `src/data/projectDocs.ts` — sections,
 * subsections, code blocks, API examples, the RBAC matrix. A reader asking
 * "какие роли могут вызвать redeem?" would otherwise have to grep the page
 * themselves.
 *
 * These tools give the agent structured access to that same content, so answers
 * are grounded in what the documentation actually says rather than in a model's
 * recollection of the project.
 *
 * ## Why the tools are pure functions
 *
 * Each one takes data as a parameter instead of importing `projectDocs.ts`
 * directly. That keeps them testable without booting an agent, and means the
 * same tools could later search a database without changing their signatures.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/** Minimal shape the tools need; the real content satisfies it structurally. */
export interface DocSectionLike {
  id: string;
  number: string;
  title: string;
  purpose?: string;
  audience?: string;
  subsections?: Array<{ id: string; label: string }>;
}

export interface ApiEndpointLike {
  id: string;
  method: string;
  path: string;
  purpose: string;
  allowedRoles?: string[];
}

export interface RoleMatrixLike {
  role: string;
  description: string;
  capabilities?: string[];
}

export interface DocsCorpus {
  sections: DocSectionLike[];
  endpoints: ApiEndpointLike[];
  roles: RoleMatrixLike[];
  /** Extra free-text chunks: tech stack rows, service URLs, ADR notes. */
  notes: Array<{ id: string; title: string; text: string }>;
}

export interface SearchHit {
  id: string;
  title: string;
  /** Surrounding text, already trimmed to a readable excerpt. */
  excerpt: string;
  kind: 'section' | 'endpoint' | 'role' | 'note';
  score: number;
}

/**
 * Scores a text against a query.
 *
 * Deliberately simple term overlap rather than embeddings: the corpus is a few
 * hundred entries, so this is instantaneous, deterministic and needs no API key.
 * If the corpus grows past a few thousand chunks, swapping in a vector store is a
 * change inside these tools alone.
 */
export function scoreText(text: string, terms: string[]): number {
  const haystack = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    let index = haystack.indexOf(term);
    while (index !== -1) {
      score += 1;
      index = haystack.indexOf(term, index + term.length);
    }
  }
  return score;
}

/** Splits a query into lowercase terms, dropping one-character noise. */
export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function excerpt(text: string, maxLength = 280): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength - 1)}…`;
}

/** Core search, exposed separately so tests can call it without a tool wrapper. */
export function searchDocs(corpus: DocsCorpus, query: string, limit = 5): SearchHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [];
  }

  const hits: SearchHit[] = [];

  for (const section of corpus.sections) {
    const subLabels = (section.subsections ?? []).map((s) => s.label).join(' ');
    const text = [section.title, section.purpose, section.audience, subLabels]
      .filter(Boolean)
      .join(' ');
    const score = scoreText(text, terms);
    if (score > 0) {
      hits.push({
        id: section.id,
        title: `${section.number}. ${section.title}`,
        excerpt: excerpt(text),
        kind: 'section',
        score,
      });
    }
  }

  for (const endpoint of corpus.endpoints) {
    const text = [endpoint.method, endpoint.path, endpoint.purpose, (endpoint.allowedRoles ?? []).join(' ')]
      .filter(Boolean)
      .join(' ');
    const score = scoreText(text, terms);
    if (score > 0) {
      hits.push({
        id: endpoint.id,
        title: `${endpoint.method} ${endpoint.path}`,
        excerpt: excerpt(`${endpoint.purpose}${endpoint.allowedRoles ? ` · роли: ${endpoint.allowedRoles.join(', ')}` : ''}`),
        kind: 'endpoint',
        score,
      });
    }
  }

  for (const role of corpus.roles) {
    const text = [role.role, role.description, (role.capabilities ?? []).join(' ')]
      .filter(Boolean)
      .join(' ');
    const score = scoreText(text, terms);
    if (score > 0) {
      hits.push({
        id: role.role,
        title: role.role,
        excerpt: excerpt(`${role.description}${role.capabilities ? ` · ${role.capabilities.join(', ')}` : ''}`),
        kind: 'role',
        score,
      });
    }
  }

  for (const note of corpus.notes) {
    const text = `${note.title} ${note.text}`;
    const score = scoreText(text, terms);
    if (score > 0) {
      hits.push({
        id: note.id,
        title: note.title,
        excerpt: excerpt(note.text),
        kind: 'note',
        score,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Builds the tool set bound to one corpus.
 *
 * The corpus is captured in a closure, so the agent's tools are exactly the data
 * the portal displays — no second copy to drift.
 */
export function createDocsTools(corpus: DocsCorpus) {
  const searchDocumentation = createTool({
    id: 'searchDocumentation',
    description:
      'Ищет по документации портала: разделы, API-эндпоинты, роли RBAC и технические заметки. ' +
      'Возвращает наиболее релевантные фрагменты с оценкой совпадения.',
    inputSchema: z.object({
      query: z.string().min(2).describe('Поисковый запрос на русском или английском'),
      limit: z.number().int().min(1).max(10).optional().describe('Сколько результатов вернуть'),
    }),
    execute: async ({ query, limit }) => {
      const hits = searchDocs(corpus, query, limit ?? 5);
      return {
        found: hits.length,
        hits,
        // An explicit empty result is more useful to a model than a silent []:
        // it tells the agent to say "не нашёл" instead of inventing an answer.
        hint:
          hits.length === 0
            ? 'Ничего не найдено. Скажите пользователю, что в документации этого нет, и не придумывайте ответ.'
            : undefined,
      };
    },
  });

  const listApiEndpoints = createTool({
    id: 'listApiEndpoints',
    description: 'Перечисляет API-эндпоинты и роли, которым они разрешены.',
    inputSchema: z.object({
      role: z.string().optional().describe('Фильтр по роли, например Admin'),
    }),
    execute: async ({ role }) => {
      const filtered = role
        ? corpus.endpoints.filter((e) =>
            (e.allowedRoles ?? []).some((r) => r.toLowerCase() === role.toLowerCase())
          )
        : corpus.endpoints;
      return { count: filtered.length, endpoints: filtered };
    },
  });

  const getRolePermissions = createTool({
    id: 'getRolePermissions',
    description: 'Возвращает описание роли и перечень её возможностей.',
    inputSchema: z.object({
      role: z.string().describe('Имя роли, например Content Manager'),
    }),
    execute: async ({ role }) => {
      const found = corpus.roles.find((r) => r.role.toLowerCase() === role.toLowerCase());
      if (!found) {
        return {
          found: false,
          availableRoles: corpus.roles.map((r) => r.role),
        };
      }
      return { found: true, role: found };
    },
  });

  return { searchDocumentation, listApiEndpoints, getRolePermissions };
}
