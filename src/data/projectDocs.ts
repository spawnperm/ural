export type AudienceKey = 'all' | 'developers' | 'devops' | 'admins' | 'users';

export interface DocSubsectionMeta {
  id: string;
  label: string;
}

export interface DocCategoryMeta {
  id: string;
  title: string;
}

export interface DocSectionMeta {
  id: string;
  number: string;
  title: string;
  categoryId: string;
  audience: string;
  audienceKeys: AudienceKey[];
  purpose: string;
  subsections: DocSubsectionMeta[];
}

export const DOC_META = {
  title: 'Первооткрыватели Прикамья',
  subtitle: 'AR-квест по историческим дорогам Пермского края',
  version: '1.1 (расширенный стек)',
  status: 'Готов к внутреннему ревью',
  date: '2026-11-20',
};

export const DOC_CATEGORIES: DocCategoryMeta[] = [
  { id: 'foundation', title: 'Основы и архитектура' },
  { id: 'domain-api', title: 'Домен, данные и API' },
  { id: 'guides', title: 'Руководства и стенд' },
  { id: 'ops-stack', title: 'Развёртывание, эксплуатация и ADR' },
];

export const DOC_SECTIONS: DocSectionMeta[] = [
  {
    id: 'overview',
    number: '01',
    title: 'Обзор системы',
    categoryId: 'foundation',
    audience: 'все',
    audienceKeys: ['all', 'developers', 'devops', 'admins', 'users'],
    purpose: 'Цели, пользователи, контекст и высокоуровневая схема',
    subsections: [
      { id: 'overview-mechanics', label: '0. О документе и механике' },
      { id: 'overview-glossary', label: '0.3. Глоссарий' },
      { id: 'overview-architecture', label: '1.3. Схема системы' },
      { id: 'overview-users', label: '1.2. Пользователи' },
      { id: 'overview-stack', label: '1.4. Технологический стек' },
    ],
  },
  {
    id: 'contours',
    number: '02',
    title: '11 контуров',
    categoryId: 'foundation',
    audience: 'разработчики, DevOps',
    audienceKeys: ['developers', 'devops'],
    purpose: 'Архитектура по слоям, ответственности, интерфейсы и SLA',
    subsections: [
      { id: 'contours-list', label: '2.1. Обозреватель контуров' },
    ],
  },
  {
    id: 'ddd',
    number: '03',
    title: 'DDD карта',
    categoryId: 'domain-api',
    audience: 'разработчики',
    audienceKeys: ['developers'],
    purpose: 'Ограниченные контексты, связи и версионирование событий',
    subsections: [
      { id: 'ddd-contexts', label: '3.1. Ограниченные контексты' },
      { id: 'ddd-relations', label: '3.2–3.3. Связи и контракты' },
    ],
  },
  {
    id: 'data-model',
    number: '04',
    title: 'Модель данных',
    categoryId: 'domain-api',
    audience: 'разработчики, админы',
    audienceKeys: ['developers', 'admins'],
    purpose: 'Коллекции Directus, типы полей, связи и индексы',
    subsections: [
      { id: 'data-collections', label: '4.1. Коллекции Directus' },
      { id: 'data-constraints', label: '4.2. Индексы и ограничения' },
    ],
  },
  {
    id: 'api',
    number: '05',
    title: 'API-контракты',
    categoryId: 'domain-api',
    audience: 'разработчики',
    audienceKeys: ['developers'],
    purpose: 'REST-эндпоинты Directus, стримы NATS и коды ошибок',
    subsections: [
      { id: 'api-simulator', label: 'Проверка REST-эндпоинтов' },
      { id: 'api-rest', label: '5.1. Сводка REST API' },
      { id: 'api-nats', label: '5.2. Стримы NATS JetStream' },
      { id: 'api-errors', label: '5.3. Коды ошибок' },
    ],
  },
  {
    id: 'rbac',
    number: '06',
    title: 'RBAC-матрица',
    categoryId: 'domain-api',
    audience: 'админы, разработчики',
    audienceKeys: ['admins', 'developers'],
    purpose: 'Роли, права доступа, own-фильтры и правила безопасности',
    subsections: [
      { id: 'rbac-matrix', label: '6.2. Матрица прав' },
      { id: 'rbac-rules', label: '6.3. Правила безопасности' },
    ],
  },
  {
    id: 'user-guide',
    number: '09–10',
    title: 'Руководства и симулятор',
    categoryId: 'guides',
    audience: 'конечные пользователи, админы',
    audienceKeys: ['users', 'admins'],
    purpose: 'AR-приложение, портал Refine, погашение QR и интерактивный стенд',
    subsections: [
      { id: 'guides-roles', label: '9–10. Инструкции по ролям' },
      { id: 'quest-simulator', label: 'Симулятор AR-квеста и QR' },
    ],
  },
  {
    id: 'deployment',
    number: '07',
    title: 'Развёртывание',
    categoryId: 'ops-stack',
    audience: 'DevOps',
    audienceKeys: ['devops'],
    purpose: 'Docker Compose, WSL2, эндпоинты и миграции БД',
    subsections: [
      { id: 'deploy-bootstrap', label: '7.1–7.2. WSL2 и Docker' },
      { id: 'deploy-endpoints', label: '7.3. Локальные endpoint\'ы' },
    ],
  },
  {
    id: 'onboarding',
    number: '08',
    title: 'Онбординг разработчика',
    categoryId: 'ops-stack',
    audience: 'разработчики',
    audienceKeys: ['developers'],
    purpose: 'Рабочий поток, Git-соглашения и Forgejo Actions CI',
    subsections: [
      { id: 'onboarding-git', label: '8.1–8.3. Git и CI-пайплайн' },
    ],
  },
  {
    id: 'operations',
    number: '11',
    title: 'Эксплуатация',
    categoryId: 'ops-stack',
    audience: 'DevOps',
    audienceKeys: ['devops'],
    purpose: 'SLO, мониторинг, резервное копирование и эскалация P1–P3',
    subsections: [
      { id: 'ops-slo', label: '11.1. SLO и инциденты P1–P3' },
      { id: 'ops-monitoring', label: '11.2–11.3. Мониторинг и бэкапы' },
    ],
  },
  {
    id: 'appendices',
    number: 'Пр.',
    title: 'Приложения A–C',
    categoryId: 'ops-stack',
    audience: 'разработчики, DevOps, админы',
    audienceKeys: ['developers', 'devops', 'admins'],
    purpose: 'Переменные .env.example, репозитории Forgejo и контакты ролей',
    subsections: [
      { id: 'appendices-env', label: 'A–C. .env, репозитории, контакты' },
    ],
  },
  {
    id: 'extended-stack',
    number: '12',
    title: 'Расширенный стек и ADR EmDash',
    categoryId: 'ops-stack',
    audience: 'разработчики, DevOps, админы',
    audienceKeys: ['developers', 'devops', 'admins'],
    purpose: 'Traefik, Temporal, Dify, AtomicCMS, Docusaurus, Storybook, Zod и оценка EmDash',
    subsections: [
      { id: 'stack-tools', label: '12.1. Инструменты по контурам' },
      { id: 'stack-zod', label: '12.2. Валидатор контрактов Zod' },
      { id: 'stack-adr-emdash', label: '12.3. ADR-01: Оценка EmDash' },
    ],
  },
];

export const GLOSSARY_ITEMS = [
  {
    term: 'AR-маркер',
    definition: 'Изображение или объект, распознаваемый камерой для запуска AR-сцены.',
  },
  {
    term: 'Персонаж',
    definition: 'Исторический первопроходец, привязанный к точке на карте и календарному месяцу.',
  },
  {
    term: 'Квест',
    definition: 'Последовательность вопросов, привязанная к персонажу.',
  },
  {
    term: 'Печать',
    definition: 'Цифровая награда за пройденный квест.',
  },
  {
    term: 'Приглашение',
    definition: 'QR-код, выдаваемый после прохождения серии квестов.',
  },
  {
    term: 'Календарный план',
    definition: 'Годовая сетка «месяц → персонаж → вопросы → мероприятие».',
  },
  {
    term: 'Контур',
    definition: 'Логический архитектурный слой с собственной зоной ответственности.',
  },
];

export const CONVENTIONS = [
  { token: 'monospace', meaning: 'имена сервисов, эндпоинтов, полей.' },
  { token: 'Предупреждение', meaning: 'критичное ограничение или риск (в спецификации отмечено как ⚠️).' },
  { token: 'RFC 2119', meaning: 'MUST / SHOULD / MAY используются в значении «обязательно / рекомендуется / допустимо».' },
];

export const SYSTEM_USERS = [
  {
    role: 'Гость',
    channel: 'Мобильное приложение',
    description: 'Неавторизованный пользователь, ограниченный режим',
  },
  {
    role: 'Участник',
    channel: 'Мобильное приложение',
    description: 'Авторизованный пользователь, копит достижения',
  },
  {
    role: 'Контент-менеджер',
    channel: 'Портал (Refine)',
    description: 'Управляет персонажами, вопросами, календарём',
  },
  {
    role: 'Организатор мероприятий',
    channel: 'Портал (Refine)',
    description: 'Валидирует QR-коды, начисляет награды',
  },
  {
    role: 'Администратор',
    channel: 'Портал (Directus)',
    description: 'Управляет ролями, правами, пользователями',
  },
  {
    role: 'Разработчик',
    channel: 'Forgejo, Verdaccio',
    description: 'Работает с кодом, пакетами',
  },
];

export const TECH_STACK = [
  { component: 'AR-клиент', technology: 'Unity + Vuforia', purpose: 'Мобильное приложение' },
  { component: 'Портал и UI-кит', technology: 'Refine (React) + Storybook', purpose: 'CRUD-интерфейс и каталог компонентов' },
  { component: 'Edge / Ingress', technology: 'Traefik v3', purpose: 'Reverse proxy, TLS и маршрутизация сервисов' },
  { component: 'BFF / Контент', technology: 'Directus 11 + AtomicCMS', purpose: 'RBAC-шлюз БД и графовый слой контента' },
  { component: 'БД', technology: 'PostgreSQL 17 + PostGIS', purpose: 'Данные и геометрия точек карты' },
  { component: 'Шина и оркестрация', technology: 'NATS JetStream + Temporal', purpose: 'События и долгоживущие саги квестов' },
  { component: 'AI-пайплайны', technology: 'Dify (LLMOps / RAG)', purpose: 'Черновики биографий, вопросов и подсказок' },
  { component: 'Контракты типов', technology: 'Zod (@perm-krai/shared-types)', purpose: 'Runtime-валидация REST, NATS и форм' },
  { component: 'Хранилище', technology: 'Garage S3', purpose: 'Медиа (3D, аудио, маркеры, QR)' },
  { component: 'Документация', technology: 'Docusaurus 3', purpose: 'Версионируемый портал документации (docs)' },
  { component: 'Git / npm', technology: 'Forgejo 16 + Verdaccio 5', purpose: 'Исходный код, CI и приватные пакеты' },
  { component: 'Оркестрация среды', technology: 'Docker Compose', purpose: 'Локально, WSL2' },
];

export interface ArchitectureNode {
  id: string;
  label: string;
  sublabel: string;
  layer: 'clients' | 'bff' | 'core' | 'infra';
  contourNum: number;
  connections: string[];
  protocolNote: string;
}

export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: 'mobile',
    label: 'Мобильное приложение',
    sublabel: 'AR, iOS / Android (Unity + Vuforia)',
    layer: 'clients',
    contourNum: 1,
    connections: ['directus', 'garage'],
    protocolNote: 'HTTPS / REST к Directus, Presigned S3 к Garage',
  },
  {
    id: 'refine',
    label: 'Портал Refine',
    sublabel: 'React SPA (Контент и Мероприятия)',
    layer: 'clients',
    contourNum: 1,
    connections: ['directus'],
    protocolNote: 'HTTPS / REST к Directus BFF',
  },
  {
    id: 'directus-admin',
    label: 'Directus Admin',
    sublabel: 'Системная панель RBAC',
    layer: 'clients',
    contourNum: 7,
    connections: ['directus'],
    protocolNote: 'HTTPS к Directus Core',
  },
  {
    id: 'directus',
    label: 'Ingress (Traefik) → BFF: Directus 11 + AtomicCMS',
    sublabel: 'TLS-маршрутизация, REST + RBAC + Zod-контракты',
    layer: 'bff',
    contourNum: 2,
    connections: ['postgres', 'nats', 'garage', 'mobile', 'refine', 'directus-admin'],
    protocolNote: 'Traefik маршрутизирует HTTPS к Directus/AtomicCMS, далее SQL, NATS и S3',
  },
  {
    id: 'postgres',
    label: 'Контур данных: PostgreSQL 17',
    sublabel: 'Расширение PostGIS (геометрия)',
    layer: 'core',
    contourNum: 5,
    connections: ['directus', 'workers'],
    protocolNote: 'Источник истины. Доступ через Directus (и read-only для воркеров)',
  },
  {
    id: 'nats',
    label: 'Шина событий: NATS JetStream',
    sublabel: 'QUESTS, ACHIEVEMENTS, INVITATIONS, AUDIT',
    layer: 'core',
    contourNum: 4,
    connections: ['directus', 'workers', 'observability'],
    protocolNote: 'nats://nats:4222, мониторинг :8222, реплей событий',
  },
  {
    id: 'garage',
    label: 'Объектное хранилище: Garage S3',
    sublabel: 'ar-media, ar-audio, ar-markers, invitations',
    layer: 'core',
    contourNum: 6,
    connections: ['directus', 'workers', 'mobile'],
    protocolNote: 'S3 API http://garage:3900, presigned URL для клиентов',
  },
  {
    id: 'workers',
    label: 'Доменные сервисы: Workers',
    sublabel: 'Node.js / Go-воркеры (идемпотентные)',
    layer: 'core',
    contourNum: 3,
    connections: ['nats', 'garage', 'directus', 'postgres', 'observability'],
    protocolNote: 'Подписка на NATS-стримы, вызовы Directus с системным токеном',
  },
  {
    id: 'forgejo',
    label: 'Forgejo 16 + Verdaccio 5',
    sublabel: 'Git, CI/CD, приватные npm-пакеты',
    layer: 'infra',
    contourNum: 9,
    connections: ['workers', 'refine', 'mobile'],
    protocolNote: '@perm-krai/ar-sdk, @perm-krai/shared-types',
  },
  {
    id: 'observability',
    label: 'Наблюдаемость',
    sublabel: 'Prometheus, Grafana, Loki (sidecar)',
    layer: 'infra',
    contourNum: 10,
    connections: ['directus', 'nats', 'workers'],
    protocolNote: 'Scrape /metrics, /varz, /jsz, structured JSON logs',
  },
];

export interface ContourSpec {
  num: number;
  title: string;
  englishName: string;
  purpose: string;
  components: string;
  responsibility: string;
  interfaces: string;
  details: { label: string; value: string }[];
  warning?: string;
}

export const CONTOURS: ContourSpec[] = [
  {
    num: 1,
    title: 'Клиентское представление',
    englishName: 'Presentation',
    purpose: 'Отображение контента пользователю и сбор ввода.',
    components: 'Мобильное AR-приложение (Unity), SPA-портал (Refine).',
    responsibility: 'UX, AR-трекинг, рендер 3D, кэширование контента на устройстве.',
    interfaces: 'REST к Directus (/items/*, /auth/*), S3 к Garage (подписанные URL).',
    details: [
      { label: 'SLA', value: 'Время отклика UI ≤ 100 мс (без учёта сети), 60 fps на mid-tier устройстве.' },
    ],
    warning: 'Не содержит бизнес-логики — только вызовы BFF. Валидация на клиенте — вспомогательная.',
  },
  {
    num: 2,
    title: 'BFF / CRUD-слой',
    englishName: 'Directus',
    purpose: 'Единая точка CRUD-доступа к доменным данным, аутентификация, RBAC.',
    components: 'Directus 11.',
    responsibility: 'Валидация схемы, права доступа, публикация вебхуков-событий.',
    interfaces: 'REST API (/items, /auth, /users, /roles), SQL к PostgreSQL, S3 к Garage.',
    details: [
      { label: 'RBAC', value: 'Реализуется через role → policy → permissions (см. §6).' },
      { label: 'SLA', value: 'p95 ≤ 150 мс на типовой запрос.' },
    ],
  },
  {
    num: 3,
    title: 'Доменные сервисы',
    englishName: 'Workers',
    purpose: 'Доменная логика, не помещающаяся в CRUD: генерация QR-приглашений, проверка серий, начисление достижений.',
    components: 'Node.js / Go-воркеры, подписанные на NATS.',
    responsibility: 'Идемпотентная обработка событий, вызовы Directus через системный токен.',
    interfaces: 'Подписка на NATS-стримы, REST к Directus.',
    details: [
      { label: 'Гарантия доставки', value: 'At-least-once с обязательной идемпотентностью обработчиков.' },
    ],
    warning: 'Идемпотентность обязательна: события могут переотправляться (at-least-once).',
  },
  {
    num: 4,
    title: 'Событийная шина',
    englishName: 'NATS JetStream',
    purpose: 'Асинхронная интеграция контекстов, персистентный event log.',
    components: 'NATS Server (-js), стримы, консьюмеры.',
    responsibility: 'Гарантия доставки, реплей событий, развязка сервисов по времени.',
    interfaces: 'nats://nats:4222, monitoring http://nats:8222.',
    details: [
      { label: 'Стримы', value: 'QUESTS, ACHIEVEMENTS, INVITATIONS, AUDIT.' },
    ],
  },
  {
    num: 5,
    title: 'Данные',
    englishName: 'PostgreSQL',
    purpose: 'Источник истины для всех доменных сущностей.',
    components: 'PostgreSQL 17 + PostGIS.',
    responsibility: 'Целостность, транзакции, геометрия (координаты точек карты).',
    interfaces: 'Только через Directus (прямой доступ сервисам запрещён кроме воркеров с read-only).',
    details: [
      { label: 'Геоданные', value: 'PostGIS Geometry(Point) для привязки исторических точек на карте.' },
    ],
  },
  {
    num: 6,
    title: 'Объектное хранилище',
    englishName: 'Garage S3',
    purpose: 'Хранение и раздача медиа: 3D-модели, аудио, изображения маркеров.',
    components: 'Garage S3 (альтернатива — MinIO).',
    responsibility: 'Изолированное хранение бинарных ассетов и выдача presigned URL клиентам.',
    interfaces: 'S3 API (http://garage:3900), presigned URL для клиентов.',
    details: [
      { label: 'Бакет ar-media', value: '3D-модели (glTF/GLB), текстуры.' },
      { label: 'Бакет ar-audio', value: 'аудио-приветствия персонажей.' },
      { label: 'Бакет ar-markers', value: 'изображения AR-маркеров.' },
      { label: 'Бакет invitations', value: 'QR-коды, PDF-приглашения.' },
    ],
  },
  {
    num: 7,
    title: 'Аутентификация и авторизация',
    englishName: 'RBAC',
    purpose: 'Идентификация пользователей и контроль доступа к ресурсам.',
    components: 'Directus Auth (JWT), Policies, Permissions.',
    responsibility: 'Выдача токенов, refresh, проверка прав на уровне записи.',
    interfaces: 'POST /auth/login, POST /auth/refresh, Bearer JWT.',
    details: [
      { label: 'Модель', value: 'Role → Policy → Permission (collection / action / fields / filter).' },
    ],
    warning: 'Вся авторизация — только в этом контуре. Клиенты не доверяют собственным проверкам.',
  },
  {
    num: 8,
    title: 'AR / 3D-пайплайн',
    englishName: 'AR / 3D Pipeline',
    purpose: 'Подготовка и доставка AR-ассетов на клиент.',
    components: 'Внешние инструменты (Blender, glTF-оптимизаторы), Garage как CDN-хранилище.',
    responsibility: 'Оптимизация моделей (≤ 50k треугольников), LOD-генерация, версионирование ассетов.',
    interfaces: 'manifest.json на бакет с описанием { characterId, version, glbUrl, audioUrl }.',
    details: [
      { label: 'Полигональность', value: 'Не более 50 000 треугольников, генерация LOD.' },
    ],
    warning: 'Мобильные модели — не более 20 МБ на сцену.',
  },
  {
    num: 9,
    title: 'CI/CD и исходный код',
    englishName: 'Forgejo, Verdaccio',
    purpose: 'Хранение кода, ревью, сборка артефактов и пакетов.',
    components: 'Forgejo, Verdaccio, Actions (Forgejo Actions).',
    responsibility: 'Git-хостинг, ревью, публикация внутренних npm-пакетов (типы, SDK для мобильного клиента).',
    interfaces: 'Git HTTP/SSH (:3000), npm registry (:4873).',
    details: [
      { label: 'Пакеты', value: '@perm-krai/ar-sdk, @perm-krai/shared-types.' },
    ],
  },
  {
    num: 10,
    title: 'Наблюдаемость',
    englishName: 'Observability',
    purpose: 'Логи, метрики, трассировка, алерты.',
    components: 'Prometheus, Grafana, Loki (или эквиваленты) — внедряются как sidecar-сервисы.',
    responsibility: 'Сбор метрик работоспособности, лага консьюмеров NATS и бизнес-событий.',
    interfaces: '/metrics у Directus, NATS (/varz, /jsz); structured logs (JSON).',
    details: [
      { label: 'SLO', value: 'Доступность API 99.5%/мес, доставка событий 99.9% за ≤ 10 с (см. §11).' },
    ],
  },
  {
    num: 11,
    title: 'Интеграции и мероприятия',
    englishName: 'Events Integration',
    purpose: 'Связь приложения с офлайн-процессами: приглашения, проверка QR на входе, календарь мероприятий.',
    components: 'Портал «Event Manager», сканер QR (в портале), выгрузка списков участников.',
    responsibility: 'Валидация invitationToken, фиксация факта визита, начисление наград.',
    interfaces: 'REST /items/invitations, /items/visits.',
    details: [
      { label: 'Офлайн-валидация', value: 'Погашение одноразовых QR до даты мероприятия и запись визита.' },
    ],
  },
];

export const BOUNDED_CONTEXTS = [
  {
    name: 'Контент',
    core: 'Управление персонажами и квестами',
    aggregates: ['Character', 'QuestionSet', 'CalendarPlan'],
    events: ['CharacterPublished', 'QuestionSetUpdated'],
  },
  {
    name: 'Прохождение',
    core: 'Игровой прогресс пользователя',
    aggregates: ['QuestAttempt', 'Answer'],
    events: ['QuestCompleted', 'AnswerSubmitted'],
  },
  {
    name: 'Достижения',
    core: 'Печати, титулы, серии',
    aggregates: ['Achievement', 'UserProgress'],
    events: ['AchievementGranted', 'StreakReached'],
  },
  {
    name: 'Приглашения',
    core: 'Генерация и валидация QR',
    aggregates: ['Invitation', 'Visit'],
    events: ['InvitationIssued', 'InvitationRedeemed'],
  },
  {
    name: 'Аутентификация',
    core: 'Пользователи и роли',
    aggregates: ['User', 'Role'],
    events: ['UserRegistered', 'RoleAssigned'],
  },
];

export const CONTEXT_RELATIONS = [
  {
    pair: 'Контент → Прохождение',
    pattern: 'Customer / Supplier',
    description: 'Прохождение зависит от опубликованных QuestionSet.',
  },
  {
    pair: 'Прохождение → Достижения',
    pattern: 'Published Language (NATS)',
    description: 'Интеграция через событие QuestCompleted в шине NATS.',
  },
  {
    pair: 'Достижения → Приглашения',
    pattern: 'Event-driven',
    description: 'Событие StreakReached триггерит выдачу приглашения.',
  },
  {
    pair: 'Аутентификация ← все',
    pattern: 'Shared Kernel',
    description: 'Единое ядро авторизации через JWT и RBAC Directus.',
  },
];

export const EVENT_CONTRACT_EXAMPLE = `{
  "eventId": "uuid",
  "eventType": "QuestCompleted",
  "occurredAt": "2026-11-20T10:00:00Z",
  "aggregateId": "quest-attempt-uuid",
  "version": 1,
  "payload": {
    "userId": "uuid",
    "characterId": "dezhnev",
    "score": 3,
    "maxScore": 3,
    "durationSec": 180
  }
}`;

export interface CollectionField {
  name: string;
  type: string;
  description: string;
}

export interface CollectionSpec {
  name: string;
  title: string;
  fields: CollectionField[];
  extraNote?: string;
}

export const DATA_COLLECTIONS: CollectionSpec[] = [
  {
    name: 'characters',
    title: 'Исторические персонажи',
    fields: [
      { name: 'id', type: 'UUID (PK)', description: 'Идентификатор' },
      { name: 'name', type: 'String', description: '«Семён Дежнёв»' },
      { name: 'slug', type: 'String (unique)', description: 'dezhnev' },
      { name: 'era', type: 'String', description: '«XVII век»' },
      { name: 'myth_alias', type: 'String', description: '«Одиссей»' },
      { name: 'description', type: 'Text', description: 'Биография для карточки' },
      { name: 'model_glb', type: 'File (S3)', description: '3D-модель' },
      { name: 'audio_intro', type: 'File (S3)', description: 'Аудио-приветствие' },
      { name: 'map_point', type: 'Geometry(Point)', description: 'Координаты на карте' },
      { name: 'status', type: 'Enum', description: 'draft / published / archived' },
    ],
  },
  {
    name: 'question_sets',
    title: 'Наборы вопросов',
    fields: [
      { name: 'id', type: 'UUID (PK)', description: 'Идентификатор набора' },
      { name: 'character_id', type: 'M2O → characters', description: 'Привязка к персонажу' },
      { name: 'title', type: 'String', description: 'Название квеста' },
      { name: 'questions', type: 'JSON', description: 'Массив вопросов (индекс correct скрыт от User)' },
    ],
    extraNote: `{ "id": "q1", "text": "...", "options": ["A", "B", "C"], "correct": 0, "explanation": "..." }`,
  },
  {
    name: 'calendar_plans',
    title: 'Календарные планы',
    fields: [
      { name: 'id', type: 'UUID (PK)', description: 'Идентификатор плана' },
      { name: 'month', type: 'Date (первое число)', description: '2026-09-01 (unique)' },
      { name: 'character_id', type: 'M2O → characters', description: 'Персонаж месяца' },
      { name: 'question_set_id', type: 'M2O → question_sets', description: 'Вопросы месяца' },
      { name: 'event_date', type: 'DateTime', description: 'Дата офлайн-мероприятия' },
      { name: 'event_location', type: 'String', description: '«Оса, музей»' },
      { name: 'marker_image', type: 'File (S3)', description: 'Изображение для AR-маркера' },
    ],
  },
  {
    name: 'quest_attempts',
    title: 'Попытки прохождения',
    fields: [
      { name: 'id', type: 'UUID', description: 'Идентификатор попытки' },
      { name: 'user_id', type: 'M2O → directus_users', description: 'Участник квеста' },
      { name: 'question_set_id', type: 'M2O → question_sets', description: 'Пройденный набор вопросов' },
      { name: 'answers', type: 'JSON', description: 'Выбранные пользователем ответы' },
      { name: 'score', type: 'Int', description: 'Количество правильных ответов (0–3)' },
      { name: 'completed_at', type: 'DateTime', description: 'Время завершения попытки' },
      { name: 'status', type: 'Enum', description: 'started / completed / failed' },
    ],
  },
  {
    name: 'achievements',
    title: 'Достижения и печати',
    fields: [
      { name: 'id', type: 'UUID', description: 'Идентификатор достижения' },
      { name: 'user_id', type: 'M2O → directus_users', description: 'Владелец достижения' },
      { name: 'type', type: 'Enum', description: 'seal / title / invitation' },
      { name: 'name', type: 'String', description: 'Наименование печати или титула' },
      { name: 'granted_at', type: 'DateTime', description: 'Дата выдачи' },
    ],
  },
  {
    name: 'invitations',
    title: 'Приглашения (QR)',
    fields: [
      { name: 'id', type: 'UUID', description: 'Идентификатор приглашения' },
      { name: 'user_id', type: 'M2O → directus_users', description: 'Приглашённый участник' },
      { name: 'token', type: 'UUID (unique)', description: 'Уникальный токен для QR-кода' },
      { name: 'issued_at', type: 'DateTime', description: 'Дата выпуска приглашения' },
      { name: 'expires_at', type: 'DateTime', description: 'Срок действия (до даты мероприятия)' },
      { name: 'redeemed_at', type: 'DateTime, nullable', description: 'Время погашения на входе' },
      { name: 'event_id', type: 'M2O → calendar_plans', description: 'Целевое мероприятие' },
    ],
  },
  {
    name: 'visits',
    title: 'Визиты на мероприятия',
    fields: [
      { name: 'id', type: 'UUID', description: 'Идентификатор визита' },
      { name: 'invitation_id', type: 'M2O → invitations', description: 'Погашенное приглашение' },
      { name: 'verified_by', type: 'M2O → directus_users', description: 'Event Manager, подтвердивший вход' },
      { name: 'verified_at', type: 'DateTime', description: 'Фактическое время регистрации визита' },
    ],
  },
];

export const DATA_CONSTRAINTS = [
  'characters.slug — unique.',
  'calendar_plans.month — unique.',
  'invitations.token — unique; expires_at проверяется при валидации.',
  'quest_attempts(user_id, question_set_id) — composite индекс для быстрого поиска последней попытки.',
];

export interface RestEndpointSpec {
  id: string;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  purpose: string;
  allowedRoles: ('Guest' | 'User' | 'Content Manager' | 'Event Manager' | 'Admin')[];
  rolesLabel: string;
  sampleResponse: Record<string, unknown>;
}

export const REST_ENDPOINTS: RestEndpointSpec[] = [
  {
    id: 'auth-login',
    method: 'POST',
    path: '/auth/login',
    purpose: 'Логин',
    allowedRoles: ['Guest', 'User', 'Content Manager', 'Event Manager', 'Admin'],
    rolesLabel: 'все',
    sampleResponse: {
      data: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'rt_9f3c7e1a...',
        expires: 900000,
      },
    },
  },
  {
    id: 'auth-refresh',
    method: 'POST',
    path: '/auth/refresh',
    purpose: 'Обновление токена',
    allowedRoles: ['User', 'Content Manager', 'Event Manager', 'Admin'],
    rolesLabel: 'авторизованные',
    sampleResponse: {
      data: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_refreshed...',
        expires: 900000,
      },
    },
  },
  {
    id: 'get-characters',
    method: 'GET',
    path: '/items/characters?filter[status][_eq]=published',
    purpose: 'Публичные персонажи',
    allowedRoles: ['Guest', 'User', 'Content Manager', 'Event Manager', 'Admin'],
    rolesLabel: 'Guest, User',
    sampleResponse: {
      data: [
        {
          id: 'c8f1-dezhnev',
          name: 'Семён Дежнёв',
          slug: 'dezhnev',
          era: 'XVII век',
          myth_alias: 'Одиссей',
          status: 'published',
        },
      ],
    },
  },
  {
    id: 'get-calendar',
    method: 'GET',
    path: '/items/calendar_plans?filter[month][_eq]=2026-11-01',
    purpose: 'Активный месяц',
    allowedRoles: ['Guest', 'User', 'Content Manager', 'Event Manager', 'Admin'],
    rolesLabel: 'Guest, User',
    sampleResponse: {
      data: [
        {
          id: 'plan-2026-11',
          month: '2026-11-01',
          character_id: 'vitus-bering',
          event_date: '2026-11-28T14:00:00Z',
          event_location: 'Оса, музей',
        },
      ],
    },
  },
  {
    id: 'get-questions',
    method: 'GET',
    path: '/items/question_sets?filter[character_id][_eq]=bering',
    purpose: 'Вопросы квеста (поле correct маскируется для User)',
    allowedRoles: ['User', 'Content Manager', 'Event Manager', 'Admin'],
    rolesLabel: 'User (через квест), Content Manager',
    sampleResponse: {
      data: [
        {
          id: 'qs-bering-11',
          title: 'Поход Витуса Беринга через Прикамье',
          questions: [
            {
              id: 'q1',
              text: 'Через какой уральский город проходили отряды Второй Камчатской экспедиции?',
              options: ['Оса', 'Соликамск', 'Кунгур'],
              explanation: 'Оса служила опорной точкой на пути через Прикамье.',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'post-attempt',
    method: 'POST',
    path: '/items/quest_attempts',
    purpose: 'Старт попытки',
    allowedRoles: ['User', 'Admin'],
    rolesLabel: 'User',
    sampleResponse: {
      data: {
        id: 'attempt-492a',
        user_id: '$CURRENT_USER',
        question_set_id: 'qs-bering-11',
        status: 'started',
      },
    },
  },
  {
    id: 'patch-attempt',
    method: 'PATCH',
    path: '/items/quest_attempts/{id}',
    purpose: 'Завершение (только своя попытка)',
    allowedRoles: ['User', 'Admin'],
    rolesLabel: 'User (own)',
    sampleResponse: {
      data: {
        id: 'attempt-492a',
        status: 'completed',
        score: 3,
        completed_at: '2026-11-20T10:03:00Z',
      },
    },
  },
  {
    id: 'get-achievements',
    method: 'GET',
    path: '/items/achievements?filter[user_id][_eq]=$CURRENT_USER',
    purpose: 'Свои достижения',
    allowedRoles: ['User', 'Content Manager', 'Event Manager', 'Admin'],
    rolesLabel: 'User',
    sampleResponse: {
      data: [
        {
          id: 'ach-01',
          type: 'seal',
          name: 'Печать ноября — Витус Беринг',
          granted_at: '2026-11-20T10:03:02Z',
        },
      ],
    },
  },
  {
    id: 'redeem-invitation',
    method: 'POST',
    path: '/items/invitations/{id}/redeem',
    purpose: 'Погашение QR на входе мероприятия',
    allowedRoles: ['Event Manager', 'Admin'],
    rolesLabel: 'Event Manager',
    sampleResponse: {
      data: {
        invitation_id: 'inv-901',
        redeemed_at: '2026-11-28T13:45:12Z',
        visit_recorded: true,
      },
    },
  },
  {
    id: 'create-character',
    method: 'POST',
    path: '/items/characters',
    purpose: 'Создание персонажа',
    allowedRoles: ['Content Manager', 'Admin'],
    rolesLabel: 'Content Manager',
    sampleResponse: {
      data: {
        id: 'char-new-12',
        name: 'Ермак Тимофеевич',
        slug: 'ermak',
        status: 'draft',
      },
    },
  },
  {
    id: 'publish-calendar',
    method: 'POST',
    path: '/items/calendar_plans',
    purpose: 'Публикация месяца в календаре',
    allowedRoles: ['Content Manager', 'Admin'],
    rolesLabel: 'Content Manager',
    sampleResponse: {
      data: {
        id: 'plan-2026-12',
        month: '2026-12-01',
        event_location: 'Пермский краеведческий музей',
      },
    },
  },
];

export const NATS_STREAMS = [
  {
    stream: 'QUESTS',
    subject: 'quests.completed',
    publisher: 'Directus Webhook → Worker',
    subscriber: 'Achievements Worker',
  },
  {
    stream: 'ACHIEVEMENTS',
    subject: 'achievements.granted',
    publisher: 'Achievements Worker',
    subscriber: 'Notifications Worker',
  },
  {
    stream: 'ACHIEVEMENTS',
    subject: 'achievements.streak',
    publisher: 'Achievements Worker',
    subscriber: 'Invitations Worker',
  },
  {
    stream: 'INVITATIONS',
    subject: 'invitations.issued',
    publisher: 'Invitations Worker',
    subscriber: 'Notifications Worker',
  },
  {
    stream: 'AUDIT',
    subject: 'audit.*',
    publisher: 'все',
    subscriber: 'Audit Logger',
  },
];

export const ERROR_CODES = [
  { code: 'INVALID_TOKEN', meaning: 'Отсутствующий, повреждённый или истёкший JWT-токен' },
  { code: 'FORBIDDEN', meaning: 'Недостаточно прав RBAC для коллекции или операции' },
  { code: 'NOT_FOUND', meaning: 'Запрашиваемая сущность или маркер не найдены' },
  { code: 'VALIDATION_FAILED', meaning: 'Ошибка схемы или ограничения уникальности' },
  { code: 'INVITATION_EXPIRED', meaning: 'Срок действия QR-приглашения истёк до даты мероприятия' },
  { code: 'INVITATION_REDEEMED', meaning: 'Повторное погашение уже использованного приглашения' },
];

export type RbacRoleKey = 'Guest' | 'User' | 'Content Mgr' | 'Event Mgr' | 'Admin';

export const RBAC_ROLES: { key: RbacRoleKey; label: string; description: string }[] = [
  { key: 'Guest', label: 'Guest', description: 'Неавторизованный' },
  { key: 'User', label: 'User', description: 'Игрок' },
  { key: 'Content Mgr', label: 'Content Manager', description: 'Контент-менеджер' },
  { key: 'Event Mgr', label: 'Event Manager', description: 'Организатор мероприятий' },
  { key: 'Admin', label: 'Admin', description: 'Системный администратор' },
];

export const RBAC_MATRIX: {
  collection: string;
  permissions: Record<RbacRoleKey, string>;
}[] = [
  {
    collection: 'characters',
    permissions: {
      Guest: 'R (published)',
      User: 'R (published)',
      'Content Mgr': 'CRUD',
      'Event Mgr': 'R',
      Admin: 'CRUD',
    },
  },
  {
    collection: 'question_sets',
    permissions: {
      Guest: '—',
      User: 'R (через квест)',
      'Content Mgr': 'CRUD',
      'Event Mgr': 'R',
      Admin: 'CRUD',
    },
  },
  {
    collection: 'calendar_plans',
    permissions: {
      Guest: 'R (активный)',
      User: 'R (активный)',
      'Content Mgr': 'CRUD',
      'Event Mgr': 'R',
      Admin: 'CRUD',
    },
  },
  {
    collection: 'quest_attempts',
    permissions: {
      Guest: '—',
      User: 'CRUD (own)',
      'Content Mgr': 'R',
      'Event Mgr': 'R',
      Admin: 'CRUD',
    },
  },
  {
    collection: 'achievements',
    permissions: {
      Guest: '—',
      User: 'R (own)',
      'Content Mgr': 'R',
      'Event Mgr': 'R',
      Admin: 'CRUD',
    },
  },
  {
    collection: 'invitations',
    permissions: {
      Guest: '—',
      User: 'R (own)',
      'Content Mgr': '—',
      'Event Mgr': 'R + redeem',
      Admin: 'CRUD',
    },
  },
  {
    collection: 'visits',
    permissions: {
      Guest: '—',
      User: '—',
      'Content Mgr': '—',
      'Event Mgr': 'CRUD',
      Admin: 'CRUD',
    },
  },
  {
    collection: 'directus_users',
    permissions: {
      Guest: '—',
      User: '—',
      'Content Mgr': '—',
      'Event Mgr': '—',
      Admin: 'CRUD',
    },
  },
  {
    collection: 'roles/policies',
    permissions: {
      Guest: '—',
      User: '—',
      'Content Mgr': '—',
      'Event Mgr': '—',
      Admin: 'CRUD',
    },
  },
];

export const RBAC_SECURITY_RULES = [
  'Own-фильтры в Directus: для User на quest_attempts, achievements, invitations действует фильтр user_id = $CURRENT_USER.',
  'User не может читать поле correct в question_sets.questions. Поле маскируется для роли User; проверка ответов выполняется воркером.',
  'Event Manager не может редактировать контент — только просматривать справочники и погашать приглашения.',
  'Повторное погашение invitation возвращает ошибку INVITATION_REDEEMED.',
];

export const WSL_CONFIG_SNIPPET = `[wsl2]
memory=8GB
processors=4`;

export const DOCKER_BOOTSTRAP_SNIPPET = `# 1. Клонировать репозиторий
git clone http://localhost:3000/perm-krai/platform.git
cd platform

# 2. Скопировать и заполнить окружение
cp .env.example .env
# обязательные переменные: DIRECTUS_KEY, DIRECTUS_SECRET,
# DIRECTUS_ADMIN_EMAIL/PASSWORD, GARAGE_ACCESS_KEY/SECRET

# 3. Запустить
docker compose up -d

# 4. Проверить
docker compose ps
curl -sf http://localhost:8055/server/health
curl -sf http://localhost:3903/health`;

export const DEV_ENDPOINTS = [
  { service: 'Traefik Dashboard / Ingress', url: 'http://localhost:8080 (маршруты *.localhost)' },
  { service: 'Directus / BFF', url: 'http://localhost:8055 (https://api.localhost)' },
  { service: 'AtomicCMS', url: 'http://localhost:9883 (https://cms.localhost)' },
  { service: 'Refine Portal', url: 'http://localhost:5173 (https://portal.localhost)' },
  { service: 'Storybook (UI-кит)', url: 'http://localhost:6006' },
  { service: 'Docusaurus (docs)', url: 'http://localhost:3001' },
  { service: 'Temporal Web UI', url: 'http://localhost:8233' },
  { service: 'Dify Console', url: 'http://localhost:5001' },
  { service: 'Forgejo', url: 'http://localhost:3000' },
  { service: 'Verdaccio', url: 'http://localhost:4873' },
  { service: 'Garage S3', url: 'http://localhost:3900' },
  { service: 'NATS monitoring', url: 'http://localhost:8222' },
  { service: 'PostgreSQL', url: 'localhost:5432 (внутренний)' },
];

export const ONBOARDING_SNIPPET = `# Клонирование, установка зависимостей
git clone http://localhost:3000/perm-krai/<repo>.git
npm login --registry=http://localhost:4873
npm install

# Поднять локальный стек
docker compose up -d
npm run dev`;

export const CI_PIPELINE_STEPS = [
  'npm ci (с registry Verdaccio + fallback npm)',
  'tsc --noEmit и валидация контрактов Zod',
  'npm test и build-storybook (визуальный smoke-check)',
  'docusaurus build (проверка ссылок и MDX-документации)',
  'docker build (если затронут сервис)',
  'Публикация новых версий @perm-krai/shared-types и UI-кита (только для main)',
];

export const TROUBLESHOOTING_ROWS = [
  {
    symptom: 'Камера не распознаёт маркер',
    solution: 'Убедитесь в хорошем освещении; приблизьте календарь; протрите камеру',
  },
  {
    symptom: 'Персонаж не появляется',
    solution: 'Проверьте интернет; обновите приложение',
  },
  {
    symptom: 'Не начисляется печать',
    solution: 'Проверьте статус ответов; перезапустите квест',
  },
  {
    symptom: 'QR не сканируется',
    solution: 'Увеличьте яркость экрана; проверьте срок действия',
  },
];

export const SLO_TARGETS = [
  { metric: 'Доступность Directus API', target: '99.5% / месяц' },
  { metric: 'p95 latency GET /items/calendar_plans', target: '≤ 150 мс' },
  { metric: 'p95 latency AR-манифеста', target: '≤ 300 мс' },
  { metric: 'Доставка событий quests.completed', target: '99.9% в течение 10 с' },
];

export const MONITORING_TARGETS = [
  { component: 'Directus', check: '/server/health, /server/metrics (если включено)' },
  { component: 'NATS', check: '/varz, /jsz (стримы, лаг консьюмеров)' },
  { component: 'PostgreSQL', check: 'pg_isready, размер БД, медленные запросы' },
  { component: 'Garage', check: '/health, заполнение диска' },
  { component: 'Бизнес-метрики', check: 'число завершённых квестов в сутки, число выданных / погашенных приглашений' },
];

export const BACKUP_POLICY = [
  { target: 'PostgreSQL', rule: 'pg_dump ежедневно, хранение 30 дней' },
  { target: 'Garage', rule: 'репликация бакета ar-media (мин. 2 копии), бэкап invitations — раз в неделю' },
  { target: 'Forgejo', rule: 'бэкап тома /data еженедельно' },
];

export const INCIDENT_ESCALATION = [
  { level: 'P1', example: 'Directus недоступен', reaction: 'дежурный DevOps, ≤ 15 мин' },
  { level: 'P2', example: 'NATS-консьюмер отстаёт > 5 мин', reaction: 'разработчик контура 3, ≤ 1 ч' },
  { level: 'P3', example: 'Ошибка в контенте', reaction: 'Content Manager, ≤ 1 рабочий день' },
];

export const ENV_EXAMPLE_SNIPPET = `# Directus
DIRECTUS_KEY=change-me
DIRECTUS_SECRET=change-me
DIRECTUS_ADMIN_EMAIL=admin@example.com
DIRECTUS_ADMIN_PASSWORD=change-me

# PostgreSQL
DB_USER=directus
DB_PASSWORD=change-me
DB_NAME=directus

# Garage
GARAGE_ACCESS_KEY=change-me
GARAGE_SECRET_KEY=change-me

# NATS
NATS_URL=nats://nats:4222`;

export const FORGEJO_REPOS = [
  { repo: 'platform', purpose: 'Docker Compose, Traefik, инфраструктура' },
  { repo: 'portal-refine', purpose: 'Портал на Refine + Storybook UI-кит' },
  { repo: 'ar-client', purpose: 'Unity-приложение' },
  { repo: 'workers', purpose: 'NATS-воркеры, Temporal workflows и Dify-адаптер' },
  { repo: 'shared-types', purpose: 'Zod-схемы и TypeScript-типы (публикуется в Verdaccio)' },
  { repo: 'docs', purpose: 'Портал документации на Docusaurus' },
];

export const ROLE_CONTACTS = [
  { role: 'Product Owner', responsibility: 'Приоритеты, приёмка' },
  { role: 'Архитектор', responsibility: 'Контуры, контракты' },
  { role: 'DevOps', responsibility: 'Стенды, CI/CD, бэкапы' },
  { role: 'Content Manager Lead', responsibility: 'Контент, календарь' },
  { role: 'Event Manager Lead', responsibility: 'Мероприятия' },
];

export interface QuestScenario {
  id: string;
  monthLabel: string;
  monthDate: string;
  characterName: string;
  era: string;
  mythAlias: string;
  location: string;
  eventDate: string;
  questions: {
    id: string;
    text: string;
    options: string[];
    correct: number;
    explanation: string;
  }[];
}

export const SIMULATOR_QUEST: QuestScenario = {
  id: 'november-bering',
  monthLabel: 'Ноябрь — Витус Беринг',
  monthDate: '2026-11-01',
  characterName: 'Витус Беринг',
  era: 'XVIII век',
  mythAlias: 'Командор Камчатских дорог',
  location: 'Оса, краеведческий музей',
  eventDate: '2026-11-28 14:00',
  questions: [
    {
      id: 'q1',
      text: 'Какой прикамский город стал ключевым опорным пунктом Второй Камчатской экспедиции Витуса Беринга в 1733 году?',
      options: ['Оса', 'Чёрмоз', 'Кудымкар'],
      correct: 0,
      explanation: 'Осенью 1733 года отряды Второй Камчатской экспедиции останавливались в Осе на реке Каме, где хранится память о маршруте Беринга.',
    },
    {
      id: 'q2',
      text: 'По какой реке Прикамья следовала основная часть грузов и исследователей на пути к Уралу?',
      options: ['По реке Чусовой и Каме', 'Только по Печоре', 'Через озеро Ильмень'],
      correct: 0,
      explanation: 'Кама и её приток Чусовая связывали европейскую часть России с Сибирским трактом и Камчатским маршрутом.',
    },
    {
      id: 'q3',
      text: 'Сколько печатей нужно собрать за три месяца подряд в AR-квесте, чтобы получить QR-приглашение на мероприятие?',
      options: ['3 печати за три месяца подряд', '10 печатей за год', 'Достаточно гостевого просмотра без печатей'],
      correct: 0,
      explanation: 'Согласно механике достижений (§9.3), серия из 3 печатей за три месяца подряд запускает событие StreakReached и выпуск QR-приглашения.',
    },
  ],
};

export interface StackToolIntegration {
  tool: string;
  contour: string;
  roleInSystem: string;
  integrationDetail: string;
}

export const EXTENDED_STACK_ITEMS: StackToolIntegration[] = [
  {
    tool: 'Traefik',
    contour: 'Контур 2 / Edge Ingress',
    roleInSystem: 'Единая точка входа, TLS-терминация и Docker service discovery',
    integrationDetail:
      'Маршрутизирует HTTPS-трафик по доменам (api.*, portal.*, cms.*, docs.*, storybook.*, dify.*) к контейнерам через Docker labels без экспонирования внутренних портов.',
  },
  {
    tool: 'Zod',
    contour: 'Контуры 1, 2, 3, 9 (@perm-krai/shared-types)',
    roleInSystem: 'Единый источник правды для runtime-валидации и TypeScript-типов',
    integrationDetail:
      'Валидирует JSON-массив questions, payload событий NATS (QuestCompleted), аргументы Temporal-активностей, ответы Dify и формы в Refine.',
  },
  {
    tool: 'Temporal',
    contour: 'Контур 3 (Доменная оркестрация)',
    roleInSystem: 'Durable execution долгоживущих процессов и саг квеста',
    integrationDetail:
      'Дополняет NATS JetStream: ведёт 3-месячную серию печатей, ставит отложенные таймеры протухания приглашений (expires_at) и гарантирует идемпотентные ретраи генерации QR/PDF.',
  },
  {
    tool: 'Dify',
    contour: 'Контур 3 / Контур 1 (AI-ассистент контента)',
    roleInSystem: 'LLMOps и RAG по краеведческим архивам Прикамья',
    integrationDetail:
      'Помогает Content Manager генерировать черновики исторических справок, 3 варианта вопросов и пояснений с проверкой по базе знаний; публикация — только после ручного ревью (draft → published).',
  },
  {
    tool: 'AtomicCMS',
    contour: 'Контур 2 / Контентный слой',
    roleInSystem: 'Типизированное и графовое управление редакционным контентом',
    integrationDetail:
      'Управляет статьями о маршрутах, медиа-блоками и онтологическими связями экспозиций, синхронизируясь по API/вебхукам с игровым контуром Directus.',
  },
  {
    tool: 'Docusaurus',
    contour: 'Контур 9 (Репозиторий docs)',
    roleInSystem: 'Версионируемый портал инженерной и пользовательской документации',
    integrationDetail:
      'Публикует разделы 01–12, автогенерируемую OpenAPI/Zod-справку и ADR-журнал; собирается в пайплайне Forgejo Actions и раздаётся за Traefik.',
  },
  {
    tool: 'Storybook',
    contour: 'Контур 1 / Контур 9 (portal-refine)',
    roleInSystem: 'Изолированная витрина и визуальное тестирование UI-компонентов',
    integrationDetail:
      'Документирует карточки персонажей, конструктор вопросов, календарную сетку и компонент сканера QR для портала Refine; публикуется как артефакт в CI.',
  },
];

export interface AdrCriterionRow {
  criterion: string;
  projectRequirement: string;
  emdashFit: string;
  verdict: 'Не подходит' | 'Частично' | 'Подходит';
}

export const EMDASH_ADR_CRITERIA: AdrCriterionRow[] = [
  {
    criterion: 'Целевая платформа и клиент',
    projectRequirement: 'Headless BFF для Unity AR (iOS/Android) и React SPA (Refine)',
    emdashFit: 'EmDash — full-stack CMS, встроенная внутрь Astro-сайта (ориентация на Cloudflare Workers/D1)',
    verdict: 'Не подходит',
  },
  {
    criterion: 'Геоданные и схема БД',
    projectRequirement: 'PostgreSQL 17 + PostGIS Geometry(Point), составные индексы',
    emdashFit: 'Ориентирован на страницы/посты/таксономии и Portable Text без нативного PostGIS BFF',
    verdict: 'Не подходит',
  },
  {
    criterion: 'Гранулярный RBAC',
    projectRequirement: '5 ролей, own-фильтры $CURRENT_USER, скрытие поля correct от User',
    emdashFit: 'Редакционная модель ролей (админ-панель типа WordPress), нет field-level RBAC для API игры',
    verdict: 'Не подходит',
  },
  {
    criterion: 'Инфраструктура и стек',
    projectRequirement: 'Self-hosted Docker Compose / WSL2 + Directus + AtomicCMS + Traefik',
    emdashFit: 'Добавление EmDash дублирует AtomicCMS/Directus и вносит лишний Astro-рантайм',
    verdict: 'Не подходит',
  },
  {
    criterion: 'Внешний промо-блог / лендинг',
    projectRequirement: 'Редакционные новости и SEO-статьи об экспедициях (опционально)',
    emdashFit: 'Может использоваться изолированно только как отдельный публичный сайт на Astro',
    verdict: 'Подходит',
  },
];

