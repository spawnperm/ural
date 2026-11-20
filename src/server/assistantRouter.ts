/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Assistant API route.
 *
 * The route is the boundary that keeps a paid, key-dependent capability out of
 * the public bundle and honest about its state:
 *
 * - **no key configured** → `503` with an explanation, not a 500 and not a
 *   silent empty answer. A reader deserves to know the feature is off, and an
 *   operator reading logs sees one clear line.
 * - **key configured** → the agent answers over the portal's own corpus.
 *
 * Rate limiting applies here too: unlike the read endpoints, an unauthorised
 * caller could otherwise run up a provider bill.
 */

import { Router } from 'express';
import { sendProblem } from './problemDetails.ts';
import { createRateLimitMiddleware } from './rateLimiter.ts';
import { validateBody } from './validation.ts';
import { assistantAskSchema } from './schemas.ts';
import { buildDocsCorpus } from '../agent/corpus.ts';
import { createDocsAssistant, providerConfigFromEnv, type AssistantOptions } from '../agent/assistant.ts';
import type { AssistantAnswerResponse } from '../shared/apiContract.ts';

const ASK_POLICY = {
  id: 'assistant-ask',
  // A person reading documentation asks a handful of questions per minute at
  // most; a script asks thousands.
  limit: 10,
  windowMs: 60_000,
};

export interface AssistantRouterDeps {
  /** Injected so tests can pass a mock model instead of a real provider. */
  createAgent?: (options: AssistantOptions) => ReturnType<typeof createDocsAssistant>;
  /** Model factory; only called when a key is configured. */
  resolveModel?: (config: { apiKey: string; modelId: string; baseUrl?: string }) => unknown;
  corpus?: ReturnType<typeof buildDocsCorpus>;
}

export function createAssistantRouter(deps: AssistantRouterDeps = {}): Router {
  const router = Router();
  const corpus = deps.corpus ?? buildDocsCorpus();
  const makeAgent = deps.createAgent ?? createDocsAssistant;

  router.post('/ask', createRateLimitMiddleware(ASK_POLICY), async (req, res) => {
    const validation = validateBody(assistantAskSchema, req.body);
    if (!validation.ok) {
      sendProblem(res, 400, validation.error, validation.details);
      return;
    }

    const provider = providerConfigFromEnv();
    if (!provider) {
      sendProblem(
        res,
        503,
        'Ассистент не настроен: задайте LLM_API_KEY в переменных окружения сервера.',
        { requiredEnv: ['LLM_API_KEY'], optionalEnv: ['LLM_MODEL', 'LLM_BASE_URL'] }
      );
      return;
    }

    if (!deps.resolveModel) {
      // No provider adapter wired: say so rather than failing deep inside the SDK.
      sendProblem(
        res,
        503,
        'Ассистент не настроен: не подключён провайдер модели.',
        { requiredEnv: ['LLM_MODEL'] }
      );
      return;
    }

    try {
      const agent = makeAgent({
        corpus,
        model: deps.resolveModel(provider) as AssistantOptions['model'],
      });

      const result = await agent.generate(validation.value.question);
      const answer: AssistantAnswerResponse = {
        ok: true,
        answer: result.text,
      };
      res.json(answer);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось получить ответ ассистента.';
      // A provider outage is not the caller's fault; 502 tells a proxy the
      // upstream failed, which is what happened.
      sendProblem(res, 502, `Провайдер модели недоступен: ${message}`);
    }
  });

  return router;
}
