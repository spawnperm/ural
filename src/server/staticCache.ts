/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Static-asset cache policy.
 *
 * The rule lives here, not inline in `server.ts`, because it is the kind of
 * one-line regex that silently stops matching: Vite switches hash alphabets
 * between versions, and a policy that quietly degrades to `max-age=0` looks
 * identical in review. A test pins it.
 */

const HASHED_ASSET = /-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|jpe?g|svg|webp)$/;

/**
 * Returns the `Cache-Control` value for a built file.
 *
 * - `index.html` — `no-cache`: it is the entry point that names the hashed
 *   chunks, so a stale copy pins users to a deleted deploy.
 * - hashed chunk — `immutable`, because the name changes when the content does.
 * - anything else — `undefined`, letting `express.static` apply its default.
 */
export function cacheControlFor(filePath: string): string | undefined {
  if (filePath.endsWith('index.html')) {
    return 'no-cache';
  }
  if (HASHED_ASSET.test(filePath)) {
    return 'public, max-age=31536000, immutable';
  }
  return undefined;
}
