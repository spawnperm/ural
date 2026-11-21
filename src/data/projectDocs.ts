/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Backwards-compatible entry point for the portal's content.
 *
 * The content lives in `./content/`, split by topic. This file exists so the
 * dozens of existing imports (`from '../data/projectDocs'`) keep working
 * unchanged — the split should be invisible to everything that only reads data.
 *
 * New code should import from a specific module (`./content/sections`) rather
 * than from here: barrel imports pull the whole corpus into whatever graph
 * touches them, which matters for the bundle.
 */

export * from './content/index.ts';
