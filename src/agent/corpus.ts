/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds the assistant's corpus from the portal's own content.
 *
 * The whole point of the assistant is that it answers from **this** documentation
 * rather than from a model's memory of the project. So the corpus is assembled
 * from the exported data structures the UI renders — there is no second copy of
 * the content to fall out of date.
 *
 * Consequence: if a section is added to `DOC_SECTIONS`, the assistant can already
 * answer questions about it. No retraining, no re-indexing step to remember.
 */

import {
  DOC_SECTIONS,
  RBAC_MATRIX,
  RBAC_ROLES,
  REST_ENDPOINTS,
  TECH_STACK,
  DEV_ENDPOINTS,
} from '../data/projectDocs.ts';
import type { DocsCorpus, DocSectionLike, ApiEndpointLike, RoleMatrixLike } from './tools.ts';

/**
 * Maps the UI's data shapes onto the tool contract.
 *
 * Kept as an explicit translation rather than making the tools depend on the UI
 * types: if the content model changes, exactly one function needs updating and
 * the failure is a type error here, not a silently empty search result.
 */
export function buildDocsCorpus(): DocsCorpus {
  const sections: DocSectionLike[] = DOC_SECTIONS.map((section) => ({
    id: section.id,
    number: section.number,
    title: section.title,
    purpose: section.purpose,
    audience: section.audience,
    subsections: section.subsections.map((sub) => ({ id: sub.id, label: sub.label })),
  }));

  const endpoints: ApiEndpointLike[] = REST_ENDPOINTS.map((endpoint) => ({
    id: endpoint.id,
    method: endpoint.method,
    path: endpoint.path,
    purpose: endpoint.purpose,
    allowedRoles: endpoint.allowedRoles,
  }));

  const roles: RoleMatrixLike[] = RBAC_ROLES.map((role) => {
    // The matrix stores permissions per collection; for the assistant the useful
    // summary is "what this role may do, and where".
    const granted = RBAC_MATRIX.filter(
      (entry) => entry.permissions[role.key] && entry.permissions[role.key] !== '—'
    ).map((entry) => `${entry.collection}: ${entry.permissions[role.key]}`);

    return {
      role: role.label,
      description: role.description,
      capabilities: granted,
    };
  });

  const notes = [
    ...TECH_STACK.map((row, index) => ({
      id: `tech-${index}`,
      title: `${row.component}: ${row.technology}`,
      text: row.purpose,
    })),
    ...DEV_ENDPOINTS.map((entry, index) => ({
      id: `dev-${index}`,
      title: entry.service,
      text: `Локальный адрес: ${entry.url}`,
    })),
  ];

  return { sections, endpoints, roles, notes };
}
