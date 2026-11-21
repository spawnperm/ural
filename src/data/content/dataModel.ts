
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

