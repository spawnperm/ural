/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Git API router.
 *
 * Three routes: a read, a health probe and the mutating commit-push. The write
 * route is the only one behind a rate limiter, because it is the only one that
 * spawns processes and talks to GitHub.
 */

import { Router } from 'express';
import { sendProblem } from './problemDetails.ts';
import { createRateLimitMiddleware } from './rateLimiter.ts';
import { GitError, type GitService } from './gitService.ts';
import { validateCommitPushBody } from './validation.ts';
import { type CommitPushResponse } from '../shared/apiContract.ts';

const COMMIT_PUSH_POLICY = {
  id: 'git-commit-push',
  // One push per 30 s is generous for a human clicking a button, and far below
  // what an attacker needs to annoy GitHub.
  limit: 5,
  windowMs: 30_000,
};

export function createGitRouter(git: GitService): Router {
  const router = Router();

  router.get('/status', async (_req, res) => {
    try {
      const status = await git.readStatus();
      res.json(status);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось получить статус Git.';
      sendProblem(res, 500, message);
    }
  });

  router.post(
    '/commit-push',
    createRateLimitMiddleware(COMMIT_PUSH_POLICY),
    async (req, res) => {
      const validation = validateCommitPushBody(req.body);
      if (!validation.ok) {
        sendProblem(res, 400, validation.error, validation.details);
        return;
      }

      try {
        const result = await git.commitAndPush(validation.value.message);
        const body: CommitPushResponse = {
          ok: true,
          committed: result.committed,
          pushed: result.pushed,
          branch: result.branch,
          commit: result.commit,
        };
        res.json(body);
      } catch (error) {
        if (error instanceof GitError) {
          const committed =
            (error as GitError & { committed?: boolean }).committed ?? false;
          sendProblem(res, error.status, error.message, { committed });
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : 'Ошибка при выполнении коммита и отправки.';
        sendProblem(res, 500, message);
      }
    }
  );

  return router;
}
