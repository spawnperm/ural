/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Git service integration tests against a real, throwaway repository.
 *
 * These are deliberately not mocked. The whole point of `gitService` is how it
 * drives the real git binary — argument quoting, askpass plumbing, refspecs,
 * staging rules — and a stub would assert that the code calls itself. Each test
 * builds a fresh repo in the OS temp directory and removes it afterwards.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { createGitService, GitError } from '../server/gitService.ts';

interface TempRepo {
  dir: string;
  remoteDir: string;
  git: ReturnType<typeof createGitService>;
  cleanup: () => void;
}

function makeRepo(): TempRepo {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ural-git-test-'));
  const run = (args: string[]): string =>
    execFileSync('git', ['-c', `safe.directory=${dir}`, ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
      },
    });

  run(['init', '-q', '-b', 'main']);
  // A bare "remote" in the same temp dir: pushes are real, just local. The
  // branch name is pinned so the remote's HEAD matches the clone's, which is
  // what `git log` on the bare repo needs to resolve.
  const remoteDir = path.join(dir, '..', `${path.basename(dir)}-remote.git`);
  fs.mkdirSync(remoteDir, { recursive: true });
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoteDir]);
  run(['remote', 'add', 'origin', remoteDir]);

  // Mirror the real repository's ignore rules: `.env` is ignored, the example is
  // not. Without this, every test would be exercising the force-add path.
  fs.writeFileSync(path.join(dir, '.gitignore'), '.env*\n!.env.example\n');
  fs.writeFileSync(path.join(dir, '.env.example'), 'PORT=3000\n');
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'initial']);
  run(['push', '-q', '-u', 'origin', 'main']);

  return {
    dir,
    remoteDir,
    git: createGitService(dir),
    cleanup: () => {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(remoteDir, { recursive: true, force: true });
    },
  };
}

describe('gitService.readStatus (real repository)', () => {
  let repo: TempRepo;
  beforeEach(() => {
    repo = makeRepo();
  });
  afterEach(() => {
    repo.cleanup();
  });

  it('reports the branch, remote and last commit', async () => {
    const status = await repo.git.readStatus();
    assert.equal(status.branch, 'main');
    assert.ok(status.remoteUrl.length > 0);
    assert.equal(status.commits.length, 1);
    assert.equal(status.commits[0]?.message, 'initial');
    assert.equal(status.changes.length, 0);
  });

  it('reports a modified file', async () => {
    fs.writeFileSync(path.join(repo.dir, 'README.md'), '# changed\n');
    const status = await repo.git.readStatus();
    assert.equal(status.changes.length, 1);
    assert.equal(status.changes[0]?.file, 'README.md');
  });

  it('reports an untracked file', async () => {
    fs.writeFileSync(path.join(repo.dir, 'new.txt'), 'new\n');
    const status = await repo.git.readStatus();
    const entry = status.changes.find((c) => c.file === 'new.txt');
    assert.ok(entry);
    assert.equal(entry?.status, '??');
  });
});

describe('gitService.commitAndPush (real repository)', () => {
  let repo: TempRepo;
  beforeEach(() => {
    repo = makeRepo();
  });
  afterEach(() => {
    repo.cleanup();
  });

  it('commits a change and pushes it to the remote', async () => {
    fs.writeFileSync(path.join(repo.dir, 'doc.md'), 'content\n');

    const result = await repo.git.commitAndPush('docs: add doc');
    assert.equal(result.committed, true);
    assert.equal(result.pushed, true);
    assert.equal(result.branch, 'main');
    assert.equal(result.commit?.message, 'docs: add doc');

    // The commit must actually exist in the remote, not just locally.
    const remoteLog = execFileSync(
      'git',
      ['--git-dir', repo.remoteDir, 'log', '--format=%s', '-1', 'main'],
      { encoding: 'utf8' }
    ).trim();
    assert.equal(remoteLog, 'docs: add doc');
  });

  it('applies the default message when none is given', async () => {
    fs.writeFileSync(path.join(repo.dir, 'a.txt'), 'a\n');
    const result = await repo.git.commitAndPush(undefined);
    assert.equal(result.commit?.message, 'docs: обновление документации портала');
  });

  it('collapses a multi-line message into one subject line', async () => {
    fs.writeFileSync(path.join(repo.dir, 'b.txt'), 'b\n');
    const result = await repo.git.commitAndPush('docs: subject\n\nbody text');
    assert.equal(result.commit?.message, 'docs: subject body text');
  });

  it('does not create a commit when the tree is clean', async () => {
    const result = await repo.git.commitAndPush('docs: nothing to do');
    assert.equal(result.committed, false);
    assert.equal(result.pushed, true);
  });

  it('refuses a message that git would parse as an option', async () => {
    fs.writeFileSync(path.join(repo.dir, 'c.txt'), 'c\n');
    await assert.rejects(() => repo.git.commitAndPush('--upload-pack=evil'), GitError);
    // Nothing was committed as a side effect.
    const status = await repo.git.readStatus();
    assert.ok(status.changes.length > 0);
  });

  it('refuses to commit a force-added .env file', async () => {
    fs.writeFileSync(path.join(repo.dir, '.env'), 'SECRET=leak\n');
    fs.writeFileSync(path.join(repo.dir, 'note.md'), 'note\n');

    // `.gitignore` keeps `.env` out of `git add -A`; force-add bypasses that so
    // the guard itself is exercised rather than Git's ignore rules.
    execFileSync(
      'git',
      ['-c', `safe.directory=${repo.dir}`, 'add', '-f', '.env'],
      { cwd: repo.dir }
    );

    await assert.rejects(
      () => repo.git.commitAndPush('docs: should not happen'),
      (err: unknown) => {
        assert.ok(err instanceof GitError);
        assert.equal(err.status, 409);
        assert.match(err.message, /\.env/);
        return true;
      }
    );

    // The guard unstages everything, so the secret cannot be picked up by a
    // later commit either.
    const staged = execFileSync(
      'git',
      ['-c', `safe.directory=${repo.dir}`, 'diff', '--cached', '--name-only'],
      { cwd: repo.dir, encoding: 'utf8' }
    ).trim();
    assert.equal(staged, '');

    // And the remote never received it. Compare exact entry names: a substring
    // check would match the legitimate `.env.example`.
    const remoteFiles = execFileSync(
      'git',
      ['--git-dir', repo.remoteDir, 'ls-tree', '-r', '--name-only', 'main'],
      { encoding: 'utf8' }
    )
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
    assert.equal(remoteFiles.includes('.env'), false);
    assert.equal(remoteFiles.includes('.env.example'), true);
  });

  it('keeps .env out of the index when both files change together', async () => {
    fs.writeFileSync(path.join(repo.dir, '.env'), 'SECRET=leak\n');
    fs.writeFileSync(path.join(repo.dir, 'safe.md'), 'safe\n');

    await repo.git.commitAndPush('docs: safe only');

    const tracked = execFileSync(
      'git',
      ['-c', `safe.directory=${repo.dir}`, 'ls-files'],
      { cwd: repo.dir, encoding: 'utf8' }
    )
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
    assert.equal(tracked.includes('.env'), false);
    assert.equal(tracked.includes('safe.md'), true);
  });

  it('reports 401-shaped failure when the remote is unreachable and no token exists', async () => {
    const savedToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      fs.writeFileSync(path.join(repo.dir, 'd.txt'), 'd\n');
      // Point origin at a path that cannot be pushed to.
      execFileSync(
        'git',
        [
          '-c',
          `safe.directory=${repo.dir}`,
          'remote',
          'set-url',
          'origin',
          'https://127.0.0.1:1/does-not-exist.git',
        ],
        { cwd: repo.dir }
      );

      await assert.rejects(
        () => repo.git.commitAndPush('docs: will fail'),
        (err: unknown) => {
          assert.ok(err instanceof GitError);
          assert.equal(err.status, 401);
          return true;
        }
      );
    } finally {
      if (savedToken !== undefined) process.env.GITHUB_TOKEN = savedToken;
    }
  });

  it('never exposes the token in an error message', async () => {
    const savedToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'ghp_TESTSECRETVALUE0123456789ABCDEFGHIJ';
    try {
      fs.writeFileSync(path.join(repo.dir, 'e.txt'), 'e\n');
      execFileSync(
        'git',
        [
          '-c',
          `safe.directory=${repo.dir}`,
          'remote',
          'set-url',
          'origin',
          'https://127.0.0.1:1/does-not-exist.git',
        ],
        { cwd: repo.dir }
      );

      try {
        await repo.git.commitAndPush('docs: push fails');
        assert.fail('expected the push to fail');
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        assert.equal(text.includes('ghp_TESTSECRETVALUE0123456789ABCDEFGHIJ'), false);
      }
    } finally {
      if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = savedToken;
    }
  });

  it('leaves no askpass helper behind after a refused push', async () => {
    const before = fs
      .readdirSync(os.tmpdir())
      .filter((name) => name.startsWith('ural-askpass-')).length;

    const savedToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'ghp_TESTSECRETVALUE0123456789ABCDEFGHIJ';
    try {
      fs.writeFileSync(path.join(repo.dir, 'f.txt'), 'f\n');
      execFileSync(
        'git',
        [
          '-c',
          `safe.directory=${repo.dir}`,
          'remote',
          'set-url',
          'origin',
          'https://127.0.0.1:1/does-not-exist.git',
        ],
        { cwd: repo.dir }
      );
      await assert.rejects(() => repo.git.commitAndPush('docs: fail'));
    } finally {
      if (savedToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = savedToken;
    }

    const after = fs
      .readdirSync(os.tmpdir())
      .filter((name) => name.startsWith('ural-askpass-')).length;
    assert.equal(after, before, 'the temporary askpass directory must be removed');
  });

  it('rejects a repository without an origin', async () => {
    execFileSync(
      'git',
      ['-c', `safe.directory=${repo.dir}`, 'remote', 'remove', 'origin'],
      { cwd: repo.dir }
    );
    fs.writeFileSync(path.join(repo.dir, 'g.txt'), 'g\n');

    await assert.rejects(
      () => repo.git.commitAndPush('docs: no remote'),
      (err: unknown) => {
        assert.ok(err instanceof GitError);
        assert.equal(err.status, 400);
        assert.match(err.message, /origin/);
        return true;
      }
    );
  });
});
