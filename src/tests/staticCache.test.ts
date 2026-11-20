/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Static cache policy tests.
 *
 * Written after a real bug: the first implementation matched `[0-9a-f]{8,}` for
 * the content hash, but Vite emits base64url names (`index-PpVEzAiV.js`). Every
 * asset was served with `max-age=0` and nothing in review caught it — the
 * regex looked plausible. These cases encode the actual filenames.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cacheControlFor } from '../server/staticCache.ts';

describe('cacheControlFor', () => {
  it('never caches index.html', () => {
    assert.equal(cacheControlFor('/app/dist/index.html'), 'no-cache');
  });

  it('marks a Vite-hashed JS chunk immutable', () => {
    // Real name from `pnpm run build`.
    assert.equal(
      cacheControlFor('/app/dist/assets/index-PpVEzAiV.js'),
      'public, max-age=31536000, immutable'
    );
  });

  it('marks a Vite-hashed CSS chunk immutable', () => {
    assert.equal(
      cacheControlFor('/app/dist/assets/index-DbqVtc39.css'),
      'public, max-age=31536000, immutable'
    );
  });

  it('handles vendor-style names with underscores and dashes', () => {
    assert.equal(
      cacheControlFor('/app/dist/assets/vendor_react-dom-aB_cD12E.js'),
      'public, max-age=31536000, immutable'
    );
  });

  it('marks hashed fonts and images immutable', () => {
    for (const name of ['font-AbCdEf12.woff2', 'hero-ZyXwVu98.webp', 'logo-QwErTy12.svg']) {
      assert.equal(
        cacheControlFor(`/app/dist/assets/${name}`),
        'public, max-age=31536000, immutable',
        name
      );
    }
  });

  it('leaves an unhashed file to express.static defaults', () => {
    assert.equal(cacheControlFor('/app/dist/robots.txt'), undefined);
    assert.equal(cacheControlFor('/app/dist/assets/logo.svg'), undefined);
  });

  it('does not treat a short suffix as a hash', () => {
    // `-v1.js` is a version tag a human wrote, not a content hash; caching it
    // forever would serve a stale file after the next edit.
    assert.equal(cacheControlFor('/app/dist/assets/app-v1.js'), undefined);
  });
});
