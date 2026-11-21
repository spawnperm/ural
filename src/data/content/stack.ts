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
