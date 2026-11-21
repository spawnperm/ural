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

