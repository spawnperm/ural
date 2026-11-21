import type { DocSectionMeta } from "./meta";

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

