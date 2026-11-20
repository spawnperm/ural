# API

Базовый путь — `/api`. Формат ошибок — `application/problem+json` (RFC 7807).
Типы запросов и ответов — `src/shared/apiContract.ts`.

## GET /api/health

Проверка живости. Не требует авторизации. Используется `HEALTHCHECK` в образе.

```bash
curl -s localhost:3000/api/health
```

```json
{
  "status": "ok",
  "service": "ural-docs-portal",
  "version": "1.0.0",
  "uptimeSeconds": 42,
  "branch": "main",
  "commitSha": "d15a58a",
  "timestamp": "2026-11-20T17:52:39.000Z"
}
```

`branch` и `commitSha` берутся из `GIT_BRANCH` / `GIT_COMMIT_SHA` — их
проставляет CI. Локально там `main` и `unknown`.

## GET /api/git/status

Состояние рабочего дерева.

```bash
curl -s localhost:3000/api/git/status
```

```json
{
  "branch": "main",
  "remoteUrl": "https://github.com/spawnperm/ural.git",
  "changes": [{ "status": "M", "file": "src/App.tsx" }],
  "commits": [
    { "hash": "d15a58a", "message": "docs: обновление", "date": "2026-11-20T11:52:39Z" }
  ],
  "hasToken": false
}
```

`remoteUrl` проходит через редактирование секретов: если в URL были встроены
учётные данные, клиент увидит `https://[REDACTED]@…`.

Поля:
- `changes[].status` — код из `git status --porcelain` (`M`, `A`, `??`, …).
- `commits` — до пяти последних коммитов.
- `hasToken` — задан ли `GITHUB_TOKEN`. Сам токен не отдаётся никогда.

## POST /api/git/commit-push

Стейджит всё, коммитит и пушит. Ограничение — **5 запросов в 30 секунд на IP**.

Тело (все поля опциональны):

```json
{ "message": "docs: обновление портала" }
```

```bash
curl -s -X POST localhost:3000/api/git/commit-push \
  -H 'content-type: application/json' \
  -d '{"message":"docs: обновление портала"}'
```

```json
{
  "ok": true,
  "committed": true,
  "pushed": true,
  "branch": "main",
  "commit": { "hash": "abc1234", "message": "docs: обновление портала", "date": "2026-11-20T17:55:00Z" }
}
```

`committed: false` означает, что изменений не было и создавать коммит не
потребовалось; `pushed: true` при этом подтверждает, что состояние отправлено.

### Ошибки

| Код | Когда | `details` |
|---|---|---|
| `400` | Тело не JSON-объект, неизвестное поле, сообщение длиннее 200 символов, некорректный JSON | Список проблем по полям |
| `401` | Нет `GITHUB_TOKEN`, а remote требует авторизации | `{ "committed": false }` |
| `409` | В индекс попал `.env*` — коммит отменён | — |
| `429` | Превышен лимит | `{ policy, limit, windowMs }` |
| `500` | Ошибка git или файловой системы | — |

Пример `400`:

```json
{
  "type": "about:blank",
  "title": "Неизвестное поле «mesage».",
  "status": 400,
  "detail": "Неизвестное поле «mesage».",
  "instance": "/api/git/commit-push",
  "error": "Неизвестное поле «mesage».",
  "details": [
    { "field": "body.mesage", "message": "Неизвестное поле «mesage».", "type": "object.unknown" }
  ],
  "requestId": "6f1c2a9e-…"
}
```

Неизвестные поля отклоняются, а не игнорируются: опечатка в `message` иначе
привела бы к коммиту с текстом по умолчанию, и пользователь был бы уверен, что
его формулировка применилась.

## Заголовки

Каждый ответ содержит:

- `X-Request-Id` — идентификатор запроса. Входящий `X-Request-Id` или
  `X-Correlation-Id` переиспользуется, если он безопасен (8–128 символов
  `[A-Za-z0-9._:-]`); иначе генерируется новый.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: frame-ancestors 'self' https:; object-src 'none'; base-uri 'self'`

Ответы с ограничением частоты дополнительно несут `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Reset` и, при отказе, `Retry-After`.

## Неизвестные маршруты

`GET /api/anything-else` возвращает `404` в формате problem+json, а не HTML
оболочку приложения. Иначе опечатка в URL превращается в ошибку разбора JSON в
браузере вместо понятного «эндпоинта нет».
