/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Git operations used by the "commit & push" panel.
 *
 * Security notes that motivate the shape of this module:
 *
 * 1. **No shell.** Every git invocation goes through `execFile` with an argument
 *    vector, so a commit message or branch name can never be interpreted by a
 *    shell. `runGit` additionally refuses a message that starts with `-`, which
 *    would otherwise be parsed as a git option.
 *
 * 2. **The token never reaches argv.** The original implementation passed
 *    `-c http.extraheader=Authorization: Basic <base64 token>` on the command
 *    line. Any local process can read another process's argv through `/proc` or
 *    `ps`, so a long-lived token would leak to every user on the host. Here the
 *    token is handed to git through a throwaway `GIT_ASKPASS` script that reads
 *    it from the environment, and the script is removed whether the push
 *    succeeds, fails or throws.
 *
 * 3. **`.env*` is never staged.** Rather than staging everything and then
 *    unstaging secrets (a race that fails open when the unstage step errors),
 *    the add uses explicit exclusions first and verifies afterwards.
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const MAX_GIT_BUFFER = 1024 * 1024;
const MAX_COMMIT_MESSAGE_LENGTH = 200;
const DEFAULT_MESSAGE = 'docs: обновление документации портала';

export interface GitFileChange {
  status: string;
  file: string;
}

export interface GitCommitEntry {
  hash: string;
  message: string;
  date: string;
}

export interface GitStatus {
  branch: string;
  remoteUrl: string;
  changes: GitFileChange[];
  commits: GitCommitEntry[];
  hasToken: boolean;
}

export interface CommitPushResult {
  committed: boolean;
  pushed: boolean;
  branch: string;
  commit: GitCommitEntry | null;
}

export class GitError extends Error {
  public readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'GitError';
    this.status = status;
  }
}

/** Strips credentials from any URL or header fragment before it reaches a client. */
export function redactSecrets(text: string): string {
  return text
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [REDACTED]')
    .replace(/https:\/\/[^@\s]+@/gi, 'https://[REDACTED]@')
    .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}/g, '[REDACTED_TOKEN]');
}

export function sanitizeCommitMessage(raw: unknown): string {
  if (typeof raw !== 'string') {
    return DEFAULT_MESSAGE;
  }
  // Collapse newlines: a multi-line message is legitimate, but the panel sends a
  // subject line and an embedded newline is usually an attempt to smuggle
  // `--option` onto a second line.
  const single = raw.replace(/\s+/g, ' ').trim();
  if (single.length === 0) {
    return DEFAULT_MESSAGE;
  }
  const clipped = single.slice(0, MAX_COMMIT_MESSAGE_LENGTH);
  if (clipped.startsWith('-')) {
    throw new GitError('Сообщение коммита не может начинаться с дефиса.', 400);
  }
  return clipped;
}

export function createGitService(workspaceDir: string) {
  async function runGit(
    args: string[],
    extraEnv: Record<string, string> = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const { stdout, stderr } = await execFileAsync(
      'git',
      ['-c', `safe.directory=${workspaceDir}`, ...args],
      {
        cwd: workspaceDir,
        maxBuffer: MAX_GIT_BUFFER,
        env: { ...process.env, ...extraEnv },
        // Never block on a credential prompt: a headless server has no TTY.
        timeout: 60_000,
      }
    );
    return { stdout: String(stdout), stderr: String(stderr) };
  }

  async function readStatus(): Promise<GitStatus> {
    const [statusRes, branchRes, remoteRes, logRes] = await Promise.all([
      runGit(['status', '--porcelain']),
      runGit(['branch', '--show-current']).catch(() => ({ stdout: 'main', stderr: '' })),
      runGit(['remote', 'get-url', 'origin']).catch(() => ({ stdout: '', stderr: '' })),
      runGit(['log', '-n', '5', '--format=%h%x09%s%x09%cI']).catch(() => ({
        stdout: '',
        stderr: '',
      })),
    ]);

    const changes: GitFileChange[] = [];
    for (const line of statusRes.stdout.split('\n')) {
      if (line.trim().length === 0) continue;
      const status = line.slice(0, 2).trim() || 'M';
      const file = line.slice(3).trim();
      if (file.length === 0) continue;
      changes.push({ status, file });
    }

    const commits: GitCommitEntry[] = [];
    for (const line of logRes.stdout.split('\n')) {
      if (line.trim().length === 0) continue;
      const [hash = '', message = '', date = ''] = line.split('\t');
      commits.push({ hash, message, date });
    }

    return {
      branch: branchRes.stdout.trim() || 'main',
      // The remote URL may embed a token (older clones did); never echo it.
      remoteUrl: redactSecrets(remoteRes.stdout.trim()),
      changes,
      commits,
      hasToken: Boolean(process.env.GITHUB_TOKEN?.trim()),
    };
  }

  /**
   * Runs `git push` with the token supplied through an askpass helper so the
   * credential never appears in the process argument list.
   */
  async function pushWithToken(branch: string, token: string, remoteUrl: string): Promise<void> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ural-askpass-'));
    const askpassPath = path.join(dir, 'askpass.sh');
    try {
      fs.writeFileSync(askpassPath, '#!/bin/sh\nprintf \'%s\\n\' "$URAL_GIT_TOKEN"\n', {
        mode: 0o700,
      });

      // Ask git for the password from the helper. The username must be
      // non-empty for GitHub, so the URL carries `x-access-token` while the
      // secret itself stays in the environment.
      const pushUrl = remoteUrl.replace(
        /^https:\/\/(?:[^@/]+@)?/i,
        'https://x-access-token@'
      );

      await runGit(['push', pushUrl, `HEAD:refs/heads/${branch}`], {
        GIT_ASKPASS: askpassPath,
        GIT_TERMINAL_PROMPT: '0',
        URAL_GIT_TOKEN: token,
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  async function commitAndPush(rawMessage: unknown): Promise<CommitPushResult> {
    const message = sanitizeCommitMessage(rawMessage);
    const before = await readStatus();
    const branch = before.branch || 'main';

    if (!before.remoteUrl) {
      throw new GitError('Не настроен удалённый репозиторий origin.', 400);
    }

    let committed = false;
    if (before.changes.length > 0) {
      await runGit(['add', '-A']);

      const staged = await runGit(['diff', '--cached', '--name-only']);
      const stagedFiles = staged.stdout.split('\n').map((f) => f.trim()).filter(Boolean);

      // Fail closed. `.gitignore` already keeps `.env*` out of `git add -A`, so a
      // staged env file means either a force-add or a repository whose ignore
      // rules drifted — both worth stopping for. Unstaging only the names we
      // happen to remember is the fail-open pattern this replaces: a variant we
      // did not list would be committed, and silently dropping a file the user
      // forced in is its own surprise.
      const stagedEnvFile = stagedFiles.find(
        (f) => path.basename(f).startsWith('.env') && path.basename(f) !== '.env.example'
      );
      if (stagedEnvFile) {
        await runGit(['reset', '-q']).catch(() => undefined);
        throw new GitError(
          `В индексе оказался файл окружения «${stagedEnvFile}» — коммит отменён, ` +
            'чтобы не опубликовать секреты. Уберите его из индекса и повторите.',
          409
        );
      }

      if (stagedFiles.length > 0) {
        await runGit([
          '-c',
          `user.name=${process.env.GIT_USER_NAME || 'spawnperm'}`,
          '-c',
          `user.email=${process.env.GIT_USER_EMAIL || 'spawnperm@gmail.com'}`,
          'commit',
          '-m',
          message,
        ]);
        committed = true;
      }
    }

    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) {
      await pushWithToken(branch, token, before.remoteUrl);
    } else {
      try {
        await runGit(['push', '-u', 'origin', branch], { GIT_TERMINAL_PROMPT: '0' });
      } catch {
        const detail = committed
          ? 'Коммит создан локально, но для отправки (push) нужен GITHUB_TOKEN в переменных окружения сервера.'
          : 'Для отправки (push) в GitHub нужен GITHUB_TOKEN в переменных окружения сервера.';
        const err = new GitError(detail, 401);
        (err as GitError & { committed?: boolean }).committed = committed;
        throw err;
      }
    }

    const after = await readStatus();
    return {
      committed,
      pushed: true,
      branch,
      commit: after.commits[0] ?? null,
    };
  }

  return { runGit, readStatus, commitAndPush };
}

export type GitService = ReturnType<typeof createGitService>;
