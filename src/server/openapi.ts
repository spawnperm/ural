/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenAPI document generated from the Zod schemas.
 *
 * ## Why generate instead of write
 *
 * A hand-written `openapi.yaml` is a second description of the API that drifts
 * from the code the first time someone changes a field and forgets the spec. The
 * portal already had that problem with `docs/API.md`: prose that no test could
 * contradict.
 *
 * Here the document is *derived*: request bodies come from `schemas.ts` via Zod's
 * native `z.toJSONSchema()`, so a rule added to a schema appears in the spec
 * automatically. Response shapes come from `apiContract.ts` types, which are
 * written by hand because the server produces them (a runtime parse per response
 * would cost more than it catches).
 *
 * A test (`src/tests/openapi.test.ts`) asserts the document matches the schemas,
 * so drift fails the build rather than surfacing to a reader.
 */

import { z } from 'zod';
import { assistantAskSchema, commitPushBodySchema } from './schemas.ts';
import { API_ROUTES } from '../shared/apiContract.ts';
import { MESSAGE_MAX_LENGTH } from './schemas.ts';

const APP_VERSION = process.env.APP_VERSION || '1.0.0';

/** Problem Details (RFC 7807), shared by every error response. */
const problemSchema = {
  type: 'object',
  required: ['type', 'title', 'status', 'detail', 'error'],
  properties: {
    type: { type: 'string', description: 'URI, идентифицирующий тип проблемы' },
    title: { type: 'string', description: 'Краткое описание проблемы' },
    status: { type: 'integer', description: 'HTTP-код ответа' },
    detail: { type: 'string', description: 'Человекочитаемое объяснение' },
    instance: { type: 'string', description: 'URL запроса, на котором произошла ошибка' },
    error: { type: 'string', description: 'Сообщение об ошибке (совместимо с прежним API)' },
    details: {
      description: 'Машинночитаемые детали, например список проблем валидации',
    },
    requestId: {
      type: 'string',
      description: 'Идентификатор запроса; повторяется в заголовке X-Request-Id',
    },
  },
} as const;

/** Validation issue emitted inside `details`. */
const validationIssueSchema = {
  type: 'object',
  required: ['field', 'message', 'type'],
  properties: {
    field: { type: 'string', description: 'Путь к полю, например body.message' },
    message: { type: 'string', description: 'Сообщение для пользователя' },
    type: { type: 'string', description: 'Машинный код, например string.base' },
  },
} as const;

const errorResponse = (description: string) => ({
  description,
  content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } },
});

const validationErrorResponse = {
  description: 'Тело запроса не прошло валидацию',
  content: {
    'application/problem+json': {
      schema: {
        allOf: [
          { $ref: '#/components/schemas/Problem' },
          {
            type: 'object',
            properties: {
              details: { type: 'array', items: { $ref: '#/components/schemas/ValidationIssue' } },
            },
          },
        ],
      },
    },
  },
};

/**
 * Request body schema produced by Zod.
 *
 * `io: 'input'` matters: the schema describes what a client *sends*, not what the
 * server returns after parsing. For a schema with defaults or transforms those
 * differ, and using the output form would document fields clients need not send.
 */
const commitPushBodyJsonSchema = z.toJSONSchema(commitPushBodySchema, {
  target: 'draft-2020-12',
  io: 'input',
});

/** Request body for the assistant, likewise derived from its Zod schema. */
const assistantAskJsonSchema = z.toJSONSchema(assistantAskSchema, {
  target: 'draft-2020-12',
  io: 'input',
});

export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'ural — API портала документации',
      version: APP_VERSION,
      description: [
        'Портал документации AR-квеста «Первооткрыватели Прикамья».',
        '',
        'Документ генерируется из Zod-схем (`src/server/schemas.ts`) и типов контракта',
        '(`src/shared/apiContract.ts`). Ручная правка спецификации невозможна по замыслу:',
        'источник правды — код, и расхождение ломает сборку.',
        '',
        'Все ошибки возвращаются в формате `application/problem+json` (RFC 7807).',
        'Каждый ответ несёт заголовок `X-Request-Id`, который повторяется в теле ошибки.',
      ].join('\n'),
    },
    servers: [
      { url: '/', description: 'Текущий хост' },
      { url: 'http://127.0.0.1:3000', description: 'Локальная разработка' },
    ],
    tags: [
      { name: 'System', description: 'Состояние сервиса' },
      { name: 'Git', description: 'Работа с репозиторием портала' },
      { name: 'Assistant', description: 'Ассистент по документации (требует LLM_API_KEY)' },
    ],
    paths: {
      [API_ROUTES.health]: {
        get: {
          tags: ['System'],
          summary: 'Проверка живости',
          description:
            'Используется HEALTHCHECK контейнера и внешним мониторингом. Не требует авторизации.',
          operationId: 'getHealth',
          responses: {
            '200': {
              description: 'Сервис работает',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Health' },
                },
              },
            },
          },
        },
      },

      [API_ROUTES.gitStatus]: {
        get: {
          tags: ['Git'],
          summary: 'Состояние рабочего дерева',
          description:
            'Ветка, remote, список изменённых файлов и последние коммиты. URL remote проходит через редактор секретов, поэтому встроенные учётные данные не возвращаются.',
          operationId: 'getGitStatus',
          responses: {
            '200': {
              description: 'Текущее состояние репозитория',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GitStatus' },
                },
              },
            },
            '500': errorResponse('Не удалось прочитать состояние репозитория'),
          },
        },
      },

      [API_ROUTES.gitCommitPush]: {
        post: {
          tags: ['Git'],
          summary: 'Коммит и пуш изменений',
          description: [
            'Стейджит все изменения, создаёт коммит и отправляет в origin.',
            '',
            'Ограничение частоты: **5 запросов в 30 секунд на IP**. При превышении',
            'возвращается 429 с заголовком `Retry-After`.',
            '',
            'Если в индекс попал файл `.env*`, коммит отменяется целиком (код 409):',
            'выборочное снятие с индекса оставляло бы варианты, о которых забыли.',
          ].join('\n'),
          operationId: 'commitAndPush',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: commitPushBodyJsonSchema,
                example: { message: 'docs: обновление документации портала' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Коммит создан (или не требовался) и отправлен',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CommitPushResult' },
                },
              },
            },
            '400': validationErrorResponse,
            '409': errorResponse('В индекс попал файл окружения — коммит отменён'),
            '401': errorResponse('Для отправки нужен GITHUB_TOKEN'),
            '429': errorResponse('Превышено ограничение частоты'),
            '500': errorResponse('Ошибка git или файловой системы'),
          },
        },
      },

      [API_ROUTES.assistantAsk]: {
        post: {
          tags: ['Assistant'],
          summary: 'Вопрос по документации',
          description: [
            'Отвечает на вопросы о проекте, опираясь на содержимое самого портала',
            '(разделы, API-эндпоинты, роли RBAC, технический стек).',
            '',
            '**Требует настройки.** Если `LLM_API_KEY` не задан, эндпоинт отвечает 503',
            'с перечнем нужных переменных — а не молчаливым пустым ответом.',
            '',
            'Ограничение частоты: **10 запросов в минуту на IP**, потому что каждый',
            'запрос стоит денег у провайдера модели.',
          ].join('\n'),
          operationId: 'askAssistant',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: assistantAskJsonSchema,
                example: { question: 'Какие роли могут погасить приглашение?' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ответ, основанный на документации',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AssistantAnswer' },
                },
              },
            },
            '400': validationErrorResponse,
            '429': errorResponse('Превышено ограничение частоты'),
            '502': errorResponse('Провайдер модели недоступен'),
            '503': errorResponse('Ассистент не настроен (нет LLM_API_KEY)'),
          },
        },
      },
    },

    components: {
      schemas: {
        Problem: problemSchema,
        ValidationIssue: validationIssueSchema,

        Health: {
          type: 'object',
          required: ['status', 'service', 'version', 'uptimeSeconds', 'timestamp'],
          properties: {
            status: { type: 'string', enum: ['ok'] },
            service: { type: 'string', example: 'ural-docs-portal' },
            version: { type: 'string', example: APP_VERSION },
            uptimeSeconds: { type: 'integer', description: 'Время работы процесса' },
            branch: { type: 'string', description: 'Ветка из GIT_BRANCH' },
            commitSha: { type: 'string', description: 'SHA из GIT_COMMIT_SHA' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },

        GitStatus: {
          type: 'object',
          required: ['branch', 'remoteUrl', 'changes', 'commits', 'hasToken'],
          properties: {
            branch: { type: 'string', example: 'main' },
            remoteUrl: {
              type: 'string',
              description: 'URL origin; встроенные учётные данные заменены на [REDACTED]',
            },
            changes: {
              type: 'array',
              items: {
                type: 'object',
                required: ['status', 'file'],
                properties: {
                  status: { type: 'string', description: 'Код из git status --porcelain' },
                  file: { type: 'string' },
                },
              },
            },
            commits: {
              type: 'array',
              maxItems: 5,
              items: {
                type: 'object',
                required: ['hash', 'message', 'date'],
                properties: {
                  hash: { type: 'string' },
                  message: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                },
              },
            },
            hasToken: {
              type: 'boolean',
              description: 'Задан ли GITHUB_TOKEN. Сам токен не возвращается никогда',
            },
          },
        },

        CommitPushResult: {
          type: 'object',
          required: ['ok', 'committed', 'pushed', 'branch'],
          properties: {
            ok: { type: 'boolean', enum: [true] },
            committed: {
              type: 'boolean',
              description: 'false, если изменений не было и коммит не потребовался',
            },
            pushed: { type: 'boolean' },
            branch: { type: 'string' },
            commit: {
              oneOf: [
                {
                  type: 'object',
                  required: ['hash', 'message', 'date'],
                  properties: {
                    hash: { type: 'string' },
                    message: { type: 'string' },
                    date: { type: 'string', format: 'date-time' },
                  },
                },
                { type: 'null' },
              ],
            },
          },
        },

        AssistantAnswer: {
          type: 'object',
          required: ['ok', 'answer'],
          properties: {
            ok: { type: 'boolean', enum: [true] },
            answer: {
              type: 'string',
              description: 'Ответ, основанный на содержимом документации портала',
            },
          },
        },
      },
    },
  } as const;
}

/** Exported for tests that assert the schema/spec agreement. */
export const MAX_MESSAGE_LENGTH = MESSAGE_MAX_LENGTH;

export type OpenApiDocument = ReturnType<typeof buildOpenApiDocument>;
