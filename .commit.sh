#!/usr/bin/env bash
set -eu
cd /mnt/c/Projects/ural

git add -A

# Guard: no credential may enter the repository.
if git diff --cached | grep -qE 'ghp_[A-Za-z0-9]{20}'; then
  echo "ОТКАЗ: в индексе оказался GitHub-токен." >&2
  exit 1
fi

MSG='feat(dev): разработка в Docker внутри WSL

Отдельный dev-стек вместо профилей в production-compose: продакшн-образ
собирает dist и работает непривилегированным пользователем без монтирования
исходников, dev-контейнеру нужно обратное. Один файл на два режима сделал бы
настройки каждого похожими на остатки от другого.

Dockerfile.dev
- тот же базовый образ и версия pnpm, что в CI
- git, bash, curl и tini внутри: панель коммита вызывает git, а graceful
  shutdown требует проброса SIGTERM
- git safe.directory для bind-mount с Windows-диска

docker-compose.dev.yml
- исходники монтируются, node_modules из образа: дерево на /mnt/c содержит
  Windows-бинарники, на которых падают esbuild и rolldown
- CHOKIDAR_USEPOLLING: события inotify не пересекают 9p, без опроса Vite не
  замечал бы правки с хоста
- порт 3200 на хосте: 3000 занят контейнером pstu-app другого проекта
- restart: no, чтобы упавший dev-контейнер не перезапускался в тот же сбой

Проверено в контейнере
- страница, /api/health, /metrics, /api/openapi.json отвечают 200
- POST /api/git/commit-push без токена отвечает 401
- hot-reload: правка TopBar.tsx с хоста появляется в браузере за ~1.5 с
- git внутри контейнера видит историю и рабочее дерево
- lint, 333 теста, check:env-docs, docs:api:check проходят внутри контейнера
- 10 браузерных тестов проходят против сборки

docs/DEVELOPMENT.md описывает запуск, решения и отличия от production.'

git -c user.name=spawnperm -c user.email=spawnperm@gmail.com commit -q -m "$MSG"
git log --oneline -1
