/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Improvement backlog for the portal, as board data.
 *
 * Every card is grounded in something observed while building this project — a
 * defect reproduced, a gate that would not have caught a regression, a rule
 * stated in the documentation but not enforced in code. The `detail` field
 * names the place, because "improve security" is not actionable and
 * "`commit-push` has no auth" is.
 *
 * `evidence` records how the item can be verified as done. A card without a way
 * to check it is a wish, not a task, so the field is required by the type below.
 */

import type { Card } from '../domain/board/Board.ts';

export interface BacklogCard extends Card {
  /** How completion is verified. Required — see the module comment. */
  evidence: string;
}

/**
 * The backlog.
 *
 * Ordered by priority then by area, which is the order a reader should act on.
 */
export const BACKLOG: BacklogCard[] = [
  {
    id: 'sec-token',
    area: 'Безопасность',
    priority: 'P0',
    title: 'Отозвать скомпрометированный PAT',
    detail:
      'Токен с правами admin:org и delete_repo передан в чат и лежит открытым текстом в .git/config проектов litdom и aster. Нужен fine-grained: Contents RW только на spawnperm/ural.',
    evidence: 'Старый токен удалён в github.com/settings/tokens; git remote в litdom и aster без встроенных учётных данных.',
  },
  {
    id: 'sec-auth',
    area: 'Безопасность',
    priority: 'P1',
    title: 'Закрыть /api/git/commit-push аутентификацией',
    detail:
      'Любой процесс с доступом к localhost может инициировать push в GitHub. Сейчас защита — только HOST=127.0.0.1 и rate-limit.',
    evidence: 'Запрос без заголовка авторизации получает 401; с верным токеном — 200. Тесты покрывают оба случая.',
  },
  {
    id: 'infra-acl',
    area: 'Инфраструктура',
    priority: 'P1',
    title: 'Автоматизировать права .env через Windows ACL',
    detail:
      'На /mnt/c chmod не действует: 9p без опции metadata, файл остаётся 777. Скрипт предупреждает, но icacls приходится запускать вручную.',
    evidence: 'setup-github-token.sh сам вызывает icacls и проверяет результат; повторный запуск идемпотентен.',
  },
  {
    id: 'arch-projectdocs',
    area: 'Архитектура',
    priority: 'P1',
    title: 'Разбить projectDocs.ts по разделам',
    detail: '1367 строк контента в одном файле: правка любого раздела рискует задеть остальные.',
    evidence: 'Файл разбит на модули; сумма строк совпадает; все 274 теста проходят без правок импортов.',
  },
  {
    id: 'docs-api',
    area: 'Документация',
    priority: 'P1',
    title: 'Генерировать docs/API.md из OpenAPI',
    detail:
      'Спецификация генерируется из Zod, а docs/API.md остаётся ручной прозой — тот самый дрейф, который устранили для схем.',
    evidence: 'docs/API.md содержит баннер «сгенерировано»; скрипт docs:api перезаписывает файл; тест сверяет маршруты.',
  },
  {
    id: 'test-e2e',
    area: 'Тестирование',
    priority: 'P1',
    title: 'E2E на симулятор в CI',
    detail:
      'Четыре пути погашения и прохождение квеста проверялись Playwright вручную, в репозитории этого нет.',
    evidence: 'e2e/ содержит спеки; отдельная джоба CI запускает их и падает при регрессии.',
  },
  {
    id: 'ops-metrics',
    area: 'DevOps',
    priority: 'P1',
    title: 'Эндпоинт /metrics для Prometheus',
    detail:
      '/api/health отдаёт JSON, непригодный для скрейпа: нет латентности, счётчиков ошибок и размеров очередей.',
    evidence: 'GET /metrics отдаёт формат exposition; тест проверяет имена метрик и Content-Type.',
  },
  {
    id: 'ci-history',
    area: 'CI/CD',
    priority: 'P1',
    title: 'gitleaks по истории, а не по дереву',
    detail:
      'Сканер запускается с --no-git: секрет, попавший в коммит и удалённый потом, не будет найден.',
    evidence: 'В CI два прогона: по дереву и по истории; тестовый секрет в старом коммите обнаруживается.',
  },
  {
    id: 'code-restore',
    area: 'Код',
    priority: 'P2',
    title: 'Валидировать историю в Invitation.restore',
    detail:
      'restore не проверяет, что погашение произошло до истечения срока. Данные корректны, но инвариант не защищён.',
    evidence: 'Снапшот с redeemedAt позже expiresAt отвергается; тест это фиксирует.',
  },
  {
    id: 'perf-scalar',
    area: 'Производительность',
    priority: 'P2',
    title: 'Отдавать Scalar локально, а не с CDN',
    detail:
      '/api/docs грузит @scalar/api-reference с jsdelivr. В закрытом контуре страница документации не откроется.',
    evidence: 'Страница документации открывается без внешних запросов; проверено с отключённой сетью.',
  },
  {
    id: 'ux-modal',
    area: 'UI/UX',
    priority: 'P2',
    title: 'Focus trap и Escape в модалке коммита',
    detail:
      'role=dialog и aria-modal есть, но фокус уходит за пределы окна, а Escape не закрывает.',
    evidence: 'Escape закрывает; Tab не выходит за пределы; фокус возвращается на кнопку открытия.',
  },
  {
    id: 'arch-component',
    area: 'Архитектура',
    priority: 'P2',
    title: 'Вынести вкладки руководств из компонента',
    detail:
      'GuidesAndSimulatorSection.tsx около 730 строк. Логика ушла в домен, разметка четырёх вкладок осталась.',
    evidence: 'Компонент сократился; вкладки вынесены в отдельные модули; E2E проходит.',
  },
  {
    id: 'code-search',
    area: 'Код',
    priority: 'P2',
    title: 'Морфология в поиске ассистента',
    detail:
      'Поиск по точному совпадению слов: «приглашения» не найдёт «приглашение».',
    evidence: 'Запрос в другой словоформе находит тот же раздел; тест фиксирует словоформы.',
  },
  {
    id: 'docs-adr',
    area: 'Документация',
    priority: 'P2',
    title: 'ADR на ключевые решения',
    detail:
      'Границы DDD, Temporal вместо cron, Mastra вместо Dify — решения приняты и обоснованы в переписке, но не в репозитории.',
    evidence: 'docs/adr/ содержит записи с контекстом, решением и последствиями.',
  },
  {
    id: 'ops-log',
    area: 'DevOps',
    priority: 'P2',
    title: 'Структурные логи вместо console.log',
    detail: 'Запросы логируются текстом с ручным request id. Парсить в Loki неудобно, уровней нет.',
    evidence: 'Строки лога — JSON с level, requestId, durationMs; тест проверяет форму.',
  },
  {
    id: 'infra-proxy',
    area: 'Инфраструктура',
    priority: 'P2',
    title: 'Reverse proxy с TLS для compose',
    detail: 'Порт опубликован только на 127.0.0.1, публичного входа нет вовсе.',
    evidence: 'compose поднимает прокси; HTTPS-эндпоинт отвечает 200; порт приложения не публикуется.',
  },
  {
    id: 'arch-shared',
    area: 'Архитектура',
    priority: 'P3',
    title: 'DomainError и Instant в domain/shared',
    detail: 'Лежат в invitations, хотя нужны content, auth и quest.',
    evidence: 'Импорты не указывают на invitations из других контекстов.',
  },
  {
    id: 'test-thresholds',
    area: 'Тестирование',
    priority: 'P3',
    title: 'Поднять пороги покрытия',
    detail: 'Фактическое покрытие 97 процентов, порог 70. Порог вдвое ниже факта не защищает.',
    evidence: 'Пороги в package.json соответствуют фактическому покрытию с небольшим запасом.',
  },
  {
    id: 'api-versioning',
    area: 'API',
    priority: 'P3',
    title: 'Версионирование API',
    detail: 'Четыре эндпоинта живут на /api без версии. При breaking change не поддержать старых клиентов.',
    evidence: '/api/v1 отвечает наряду с /api; тест проверяет паритет маршрутов.',
  },
  {
    id: 'ci-cache',
    area: 'CI/CD',
    priority: 'P3',
    title: 'Кэш слоёв Docker в CI',
    detail: 'Образ Temporal тянется каждый прогон.',
    evidence: 'Джоба использует gha-cache; повторный прогон не тянет образ заново.',
  },
  {
    id: 'ux-skip',
    area: 'UI/UX',
    priority: 'P3',
    title: 'Skip-link к содержимому',
    detail: 'В левой навигации 47 ссылок. С клавиатуры до контента добираться долго.',
    evidence: 'Первая Tab-остановка — видимая ссылка «К содержимому»; тест клавиатурной навигации.',
  },
];
