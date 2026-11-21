# Разработка в Docker (WSL)

Портал разрабатывается в контейнере внутри WSL: инструменты в CI и на машине
разработчика совпадают, и ничего не зависит от того, что установлено в Windows.

## Быстрый старт

```bash
# из WSL, не из PowerShell
cd /mnt/c/Projects/ural
docker compose -f docker-compose.dev.yml up -d
```

Откройте <http://localhost:3200>. Первый запуск собирает образ (~1 минута),
дальше перезапуск — секунды.

```bash
docker compose -f docker-compose.dev.yml logs -f     # логи
docker compose -f docker-compose.dev.yml down        # остановить
docker compose -f docker-compose.dev.yml up -d --build  # пересобрать после правки зависимостей
```

## Почему порт 3200, а не 3000

Порт 3000 в этом окружении занят контейнером `pstu-app` из другого проекта.
Внутри контейнера приложение слушает 3000, наружу проброшено 3200 — так оба
стека работают одновременно и не конфликтуют.

## Что работает и как это проверено

| Возможность | Проверка |
|---|---|
| Страница и API | `curl localhost:3200/`, `/api/health`, `/metrics` |
| Hot-reload | правка `TopBar.tsx` на диске видна в браузере за ~1.5 с |
| git внутри контейнера | `docker compose exec app git log` — панель коммита работает |
| Авторизация записи | `POST /api/git/commit-push` без токена → 401 |
| E2E | `npx playwright test` — 10 тестов |

## Решения, которые стоит знать

**Source не копируется в образ.** `docker-compose.dev.yml` монтирует рабочее
дерево, поэтому правка на диске видна сразу, а пересобирать нужно только после
изменения зависимостей.

**`node_modules` из образа, не с хоста.** Строка `- /app/node_modules` в volumes
перекрывает bind-mount: дерево на `/mnt/c` содержит Windows-бинарники, и
`esbuild`/`rolldown` падают при импорте.

**`CHOKIDAR_USEPOLLING=true`.** События inotify не пересекают границу 9p, поэтому
без опроса Vite не замечал бы правки, сделанные из Windows.

**Контейнер работает от root.** Bind-mount с Windows-диска отдаёт файлы с
uid хоста, и фиксированный непривилегированный пользователь не смог бы писать в
кеш Vite. В production-образе пользователь отдельный — там нет bind-mount.

**`restart: "no"`.** Упавший dev-контейнер должен остаться упавшим, чтобы ошибка
была видна, а не перезапускаться в тот же сбой по кругу.

## Отличия от production-стека

| | `docker-compose.dev.yml` | `docker-compose.yml` |
|---|---|---|
| Образ | `Dockerfile.dev` | `Dockerfile` (multi-stage) |
| Исходники | bind-mount | копируются в образ |
| Запуск | `pnpm run dev` (Vite) | `node server.ts` (собранный `dist/`) |
| Пользователь | root (нужно для bind-mount) | `ural` (непривилегированный) |
| Порт | 3200 → 3000 | 3000 → 3000 |

## Проверки перед коммитом

Можно запускать с хоста (WSL) или внутри контейнера — результат одинаковый,
потому что версии Node и pnpm совпадают:

```bash
docker compose -f docker-compose.dev.yml exec app pnpm run lint
docker compose -f docker-compose.dev.yml exec app pnpm test
docker compose -f docker-compose.dev.yml exec app pnpm run check:env-docs
docker compose -f docker-compose.dev.yml exec app pnpm run docs:api:check
```

Браузерные тесты запускаются с хоста: им нужен установленный Chromium и
собранный `dist/`.

```bash
pnpm run build && npx playwright test
```
