/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Configuration tests.
 *
 * `loadConfig` is the single place that decides how an environment maps to
 * behaviour, so its fallbacks are worth pinning: a wrong default here silently
 * changes whether the server is reachable or logs every request.
 */

import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { loadConfig } from '../server/config.ts';

const WORKSPACE = '/srv/ural';
const TOUCHED = ['PORT', 'HOST', 'NODE_ENV', 'APP_VERSION', 'GITHUB_TOKEN', 'REQUEST_LOG'];

describe('loadConfig', () => {
  const saved = new Map<string, string | undefined>();

  afterEach(() => {
    for (const key of TOUCHED) {
      if (saved.has(key)) {
        const value = saved.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
        saved.delete(key);
      }
    }
  });

  function setEnv(key: string, value: string | undefined): void {
    if (!saved.has(key)) saved.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  it('defaults to port 3000 on loopback outside production', () => {
    setEnv('PORT', undefined);
    setEnv('HOST', undefined);
    setEnv('NODE_ENV', undefined);
    const config = loadConfig(WORKSPACE);
    assert.equal(config.port, 3000);
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.isProduction, false);
    assert.equal(config.requestLogger, true);
  });

  it('honours an explicit port and host', () => {
    setEnv('PORT', '8080');
    setEnv('HOST', '0.0.0.0');
    const config = loadConfig(WORKSPACE);
    assert.equal(config.port, 8080);
    assert.equal(config.host, '0.0.0.0');
  });

  it('falls back to 3000 for an invalid port', () => {
    for (const bad of ['0', '-1', '70000', 'abc', '']) {
      setEnv('PORT', bad);
      assert.equal(loadConfig(WORKSPACE).port, 3000, `port input ${JSON.stringify(bad)}`);
    }
  });

  it('disables the request logger in production unless asked', () => {
    setEnv('NODE_ENV', 'production');
    setEnv('REQUEST_LOG', undefined);
    assert.equal(loadConfig(WORKSPACE).requestLogger, false);

    setEnv('REQUEST_LOG', 'true');
    assert.equal(loadConfig(WORKSPACE).requestLogger, true);
  });

  it('detects a git token without exposing it', () => {
    setEnv('GITHUB_TOKEN', '  ');
    const withoutToken = loadConfig(WORKSPACE);
    assert.equal(withoutToken.hasGitToken, false);
    assert.equal(JSON.stringify(withoutToken).includes('GITHUB_TOKEN'), false);

    setEnv('GITHUB_TOKEN', 'ghp_example');
    assert.equal(loadConfig(WORKSPACE).hasGitToken, true);
  });

  it('resolves the dist directory relative to the workspace', () => {
    assert.equal(loadConfig(WORKSPACE).distDir, '/srv/ural/dist');
  });
});
