/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Content barrel.
 *
 * `projectDocs.ts` used to hold all 1367 lines: page metadata, the twelve
 * sections, the technology stack, the data model, the API surface, the RBAC
 * matrix, deployment instructions and the ADR. Editing one section meant
 * scrolling past everything else, and a merge conflict in one area touched the
 * whole file.
 *
 * The content is now split along the boundaries a reader would use:
 *
 *   meta.ts        page metadata, categories, the section type
 *   sections.ts    the twelve sections, glossary, users and conventions
 *   stack.ts       technology stack, architecture nodes, contours, DDD contexts
 *   dataModel.ts   Directus collections, REST endpoints, NATS, errors, RBAC
 *   operations.ts  deployment, monitoring, SLO, extended stack, ADR
 *
 * This file re-exports everything under the old names, so no import anywhere had
 * to change. That was deliberate: a split that also rewrites forty import sites
 * is a split that hides its own mistakes in the diff.
 */

export * from './meta.ts';
export * from './sections.ts';
export * from './stack.ts';
export * from './dataModel.ts';
export * from './operations.ts';
