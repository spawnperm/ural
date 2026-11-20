import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_DIR = __dirname;

interface GitFileChange {
  status: string;
  file: string;
}

interface GitCommitEntry {
  hash: string;
  message: string;
  date: string;
}

async function runGit(args: string[]) {
  return execFileAsync('git', ['-c', `safe.directory=${WORKSPACE_DIR}`, ...args], {
    cwd: WORKSPACE_DIR,
    maxBuffer: 1024 * 1024,
  });
}

async function readGitStatus() {
  const [statusRes, branchRes, remoteRes, logRes] = await Promise.all([
    runGit(['status', '--porcelain']),
    runGit(['branch', '--show-current']).catch(() => ({ stdout: 'main' })),
    runGit(['remote', 'get-url', 'origin']).catch(() => ({ stdout: '' })),
    runGit(['log', '-n', '5', '--format=%h%x09%s%x09%cI']).catch(() => ({ stdout: '' })),
  ]);

  const changes: GitFileChange[] = statusRes.stdout
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      status: line.slice(0, 2).trim() || 'M',
      file: line.slice(3).trim(),
    }));

  const commits: GitCommitEntry[] = logRes.stdout
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [hash = '', message = '', date = ''] = line.split('\t');
      return { hash, message, date };
    });

  return {
    branch: branchRes.stdout.trim() || 'main',
    remoteUrl: remoteRes.stdout.trim(),
    changes,
    commits,
    hasToken: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0),
  };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get('/api/git/status', async (_req, res) => {
    try {
      const status = await readGitStatus();
      res.json(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось получить статус Git.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/git/commit-push', async (req, res) => {
    try {
      const rawMessage =
        typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      const commitMessage = rawMessage || 'docs: обновление документации портала';

      const currentStatus = await readGitStatus();
      const branch = currentStatus.branch || 'main';

      if (!currentStatus.remoteUrl) {
        res.status(400).json({
          error: 'Не настроен удалённый репозиторий origin.',
        });
        return;
      }

      let committed = false;
      if (currentStatus.changes.length > 0) {
        await runGit(['add', '-A']);
        await runGit(['reset', '-q', '--', '.env', '.env.local']).catch(() => undefined);
        const stagedCheck = await runGit(['diff', '--cached', '--name-only']);
        if (stagedCheck.stdout.trim().length > 0) {
          await runGit([
            '-c',
            `user.name=${process.env.GIT_USER_NAME || 'spawnperm'}`,
            '-c',
            `user.email=${process.env.GIT_USER_EMAIL || 'spawnperm@gmail.com'}`,
            'commit',
            '-m',
            commitMessage,
          ]);
          committed = true;
        }
      }

      const token = process.env.GITHUB_TOKEN?.trim();
      if (token) {
        const authB64 = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64');
        await runGit([
          '-c',
          `http.extraheader=Authorization: Basic ${authB64}`,
          'push',
          '-u',
          'origin',
          branch,
        ]);
      } else {
        try {
          await runGit(['push', '-u', 'origin', branch]);
        } catch {
          res.status(401).json({
            error:
              committed
                ? 'Коммит создан локально, но для отправки (push) требуется переменная окружения GITHUB_TOKEN в секретах сервера.'
                : 'Для отправки (push) в GitHub требуется переменная окружения GITHUB_TOKEN в секретах сервера.',
            committed,
          });
          return;
        }
      }

      const updatedStatus = await readGitStatus();
      const headCommit = updatedStatus.commits[0] ?? null;

      res.json({
        ok: true,
        committed,
        pushed: true,
        branch,
        commit: headCommit,
        status: updatedStatus,
      });
    } catch (error) {
      const safeMsg =
        error instanceof Error
          ? error.message.replace(/Basic\s+[A-Za-z0-9+/=]+/g, 'Basic [REDACTED]')
          : 'Ошибка при выполнении коммита и отправки.';
      res.status(500).json({ error: safeMsg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(WORKSPACE_DIR, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
