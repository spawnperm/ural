import { useState } from 'react';
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  ERROR_CODES,
  NATS_STREAMS,
  RBAC_MATRIX,
  RBAC_ROLES,
  RBAC_SECURITY_RULES,
  REST_ENDPOINTS,
  RbacRoleKey,
} from '../data/projectDocs';

type SimRole = 'Guest' | 'User' | 'Content Manager' | 'Event Manager' | 'Admin';

const SIM_ROLES: SimRole[] = [
  'Guest',
  'User',
  'Content Manager',
  'Event Manager',
  'Admin',
];

export function ApiAndRbacSection() {
  const [simRole, setSimRole] = useState<SimRole>('User');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(
    REST_ENDPOINTS[4].id
  );
  const [envTarget, setEnvTarget] = useState<'dev' | 'prod'>('dev');
  const [highlightedRbacRole, setHighlightedRbacRole] = useState<RbacRoleKey | 'all'>('all');

  const selectedEndpoint =
    REST_ENDPOINTS.find((e) => e.id === selectedEndpointId) ?? REST_ENDPOINTS[0];

  const isAllowed = selectedEndpoint.allowedRoles.includes(simRole);
  const baseUrl =
    envTarget === 'dev' ? 'http://localhost:8055' : 'https://portal.example.com';

  const simulatedPayload = isAllowed
    ? selectedEndpoint.id === 'get-questions' && simRole === 'Content Manager'
      ? {
          data: [
            {
              id: 'qs-bering-11',
              title: 'Поход Витуса Беринга через Прикамье',
              questions: [
                {
                  id: 'q1',
                  text: 'Через какой уральский город проходили отряды Второй Камчатской экспедиции?',
                  options: ['Оса', 'Соликамск', 'Кунгур'],
                  correct: 0,
                  explanation: 'Оса служила опорной точкой на пути через Прикамье.',
                },
              ],
            },
          ],
        }
      : selectedEndpoint.sampleResponse
    : {
        error: {
          code: simRole === 'Guest' ? 'INVALID_TOKEN' : 'FORBIDDEN',
          message:
            simRole === 'Guest'
              ? 'Требуется Bearer JWT токен авторизованного пользователя.'
              : `Роль "${simRole}" не имеет прав на ${selectedEndpoint.method} ${selectedEndpoint.path}.`,
          details: { role: simRole, required: selectedEndpoint.rolesLabel },
        },
      };

  return (
    <div className="space-y-14">
      {/* Section 05: API Contracts */}
      <section id="api" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="max-w-3xl">
          <div className="text-xs text-[#57534E] tabular-nums">
            Раздел 05 · REST Directus и шина NATS
          </div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
            5. API-контракты и симулятор прав доступа
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#44403C] leading-relaxed">
            Базовый URL: <code className="font-mono text-xs">https://portal.example.com</code>{' '}
            (prod) и <code className="font-mono text-xs">http://localhost:8055</code> (dev).
            Аутентификация: <code className="font-mono text-xs">Authorization: Bearer &lt;jwt&gt;</code>.
          </p>
        </div>

        {/* Interactive API Request/Permission Simulator */}
        <div id="api-simulator" className="bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-5 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2DDD4] pb-4">
            <div>
              <h3 className="text-base font-semibold text-[#1C1917]">
                Интерактивная проверка REST-эндпоинта
              </h3>
              <p className="text-xs text-[#57534E] mt-0.5">
                Выберите роль и метод API, чтобы проверить ответ Directus BFF и маскирование полей.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] border border-[#E2DDD4] rounded-lg self-start">
              <button
                type="button"
                onClick={() => setEnvTarget('dev')}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  envTarget === 'dev'
                    ? 'bg-white text-[#1C1917] shadow-xs font-medium'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                dev (:8055)
              </button>
              <button
                type="button"
                onClick={() => setEnvTarget('prod')}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  envTarget === 'prod'
                    ? 'bg-white text-[#1C1917] shadow-xs font-medium'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                prod
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="block text-xs font-medium text-[#57534E] mb-2">
                  Роль вызывающего клиента
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SIM_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSimRole(role)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        simRole === role
                          ? 'bg-[#1E3A8A] text-white'
                          : 'bg-[#F7F5F0] border border-[#E2DDD4] text-[#44403C] hover:bg-[#EFECE6]'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="endpoint-select"
                  className="block text-xs font-medium text-[#57534E] mb-1.5"
                >
                  Эндпоинт (§5.1)
                </label>
                <select
                  id="endpoint-select"
                  value={selectedEndpoint.id}
                  onChange={(e) => setSelectedEndpointId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#F7F5F0] border border-[#D6D0C4] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
                >
                  {REST_ENDPOINTS.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.method} {ep.path}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#E2DDD4] space-y-1.5 text-xs">
                <div className="text-[#57534E]">
                  Назначение: <span className="text-[#1C1917] font-medium">{selectedEndpoint.purpose}</span>
                </div>
                <div className="text-[#57534E]">
                  Допустимые роли:{' '}
                  <span className="font-mono text-[#1E3A8A]">{selectedEndpoint.rolesLabel}</span>
                </div>
                {selectedEndpoint.id === 'get-questions' && simRole === 'User' && (
                  <div className="text-[#92400E] pt-1 font-medium">
                    Примечание: поле <code className="font-mono">correct</code> автоматически скрыто для роли User.
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 border border-[#E2DDD4] rounded-lg overflow-hidden bg-[#1C1917] text-[#F5F3EE]">
              <div className="px-4 py-2.5 bg-[#25221F] border-b border-[#2E2A27] flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-xs text-[#E7E5E4] truncate">
                  {selectedEndpoint.method} {baseUrl}
                  {selectedEndpoint.path}
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 font-mono text-xs font-medium ${
                    isAllowed ? 'text-[#4ADE80]' : 'text-[#F87171]'
                  }`}
                >
                  {isAllowed ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>HTTP 200 OK</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{simRole === 'Guest' ? 'HTTP 401' : 'HTTP 403 FORBIDDEN'}</span>
                    </>
                  )}
                </div>
              </div>
              <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto tabular-nums">
                <code>{JSON.stringify(simulatedPayload, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* 5.1 REST Table */}
        <div id="api-rest" className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-[#E2DDD4]">
            <h3 className="text-base font-semibold text-[#1C1917]">5.1. Сводка REST API (Directus)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-2.5 px-4 font-medium">Метод</th>
                  <th className="py-2.5 px-4 font-medium">Путь</th>
                  <th className="py-2.5 px-4 font-medium">Назначение</th>
                  <th className="py-2.5 px-4 font-medium">Роли</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {REST_ENDPOINTS.map((ep) => (
                  <tr key={ep.id} className="hover:bg-[#FAF8F5]">
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#1E3A8A] whitespace-nowrap">
                      {ep.method}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-[#1C1917]">{ep.path}</td>
                    <td className="py-2.5 px-4 text-[#44403C]">{ep.purpose}</td>
                    <td className="py-2.5 px-4 text-xs text-[#57534E] whitespace-nowrap">
                      {ep.rolesLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5.2 NATS + 5.3 Errors */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div id="api-nats" className="lg:col-span-7 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden scroll-mt-24">
            <div className="px-6 py-4 border-b border-[#E2DDD4]">
              <h3 className="text-base font-semibold text-[#1C1917]">
                5.2. События NATS JetStream (стримы)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                    <th className="py-2.5 px-4 font-medium">Стрим</th>
                    <th className="py-2.5 px-4 font-medium">Subject</th>
                    <th className="py-2.5 px-4 font-medium">Publisher</th>
                    <th className="py-2.5 px-4 font-medium">Subscriber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBE6DF]">
                  {NATS_STREAMS.map((row) => (
                    <tr key={row.subject} className="hover:bg-[#FAF8F5]">
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#1C1917] whitespace-nowrap">
                        {row.stream}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-[#1E3A8A] whitespace-nowrap">
                        {row.subject}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#44403C]">{row.publisher}</td>
                      <td className="py-2.5 px-4 text-xs text-[#44403C]">{row.subscriber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div id="api-errors" className="lg:col-span-5 bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-4 scroll-mt-24">
            <h3 className="text-base font-semibold text-[#1C1917]">5.3. Формат и коды ошибок</h3>
            <pre className="p-3 rounded-lg bg-[#1C1917] text-[#F5F3EE] font-mono text-xs overflow-x-auto">
              <code>{`{ "error": { "code": "INVALID_TOKEN", "message": "...", "details": {} } }`}</code>
            </pre>
            <dl className="divide-y divide-[#EBE6DF] text-xs">
              {ERROR_CODES.map((err) => (
                <div key={err.code} className="py-2 flex flex-col gap-0.5">
                  <dt className="font-mono font-semibold text-[#9A3412]">{err.code}</dt>
                  <dd className="text-[#44403C]">{err.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Section 06: RBAC Matrix */}
      <section id="rbac" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-xs text-[#57534E] tabular-nums">
              Раздел 06 · Политики и права доступа
            </div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
              6. RBAC-матрица
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#44403C] leading-relaxed">
              Нажмите на любую роль, чтобы выделить её столбец разрешений по коллекциям Directus.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setHighlightedRbacRole('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                highlightedRbacRole === 'all'
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-white border border-[#E2DDD4] text-[#44403C] hover:bg-[#EFECE6]'
              }`}
            >
              Все роли
            </button>
            {RBAC_ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setHighlightedRbacRole(r.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  highlightedRbacRole === r.key
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-white border border-[#E2DDD4] text-[#44403C] hover:bg-[#EFECE6]'
                }`}
              >
                {r.key}
              </button>
            ))}
          </div>
        </div>

        <div id="rbac-matrix" className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden scroll-mt-24">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-3 px-4 font-medium">Коллекция</th>
                  {RBAC_ROLES.map((role) => {
                    const isFocused = highlightedRbacRole === role.key;
                    return (
                      <th
                        key={role.key}
                        className={`py-3 px-4 font-medium whitespace-nowrap ${
                          isFocused ? 'bg-[#EEF2FF] text-[#1E3A8A] font-semibold' : ''
                        }`}
                      >
                        <div>{role.key}</div>
                        <div className="font-normal text-[11px] text-[#78716C]">
                          {role.description}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {RBAC_MATRIX.map((row) => (
                  <tr key={row.collection} className="hover:bg-[#FAF8F5]">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#1C1917] whitespace-nowrap">
                      {row.collection}
                    </td>
                    {RBAC_ROLES.map((role) => {
                      const val = row.permissions[role.key];
                      const isFocused = highlightedRbacRole === role.key;
                      const isNone = val === '—';
                      return (
                        <td
                          key={role.key}
                          className={`py-3 px-4 font-mono text-xs whitespace-nowrap ${
                            isFocused ? 'bg-[#EEF2FF]/60 font-semibold' : ''
                          } ${isNone ? 'text-[#A8A29E]' : 'text-[#1C1917]'}`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6.3 Правила безопасности */}
        <div id="rbac-rules" className="p-5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2.5 scroll-mt-24">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#78350F]">
            <AlertTriangle className="w-4 h-4 text-[#B45309]" />
            <span>6.3. Критичные правила безопасности RBAC</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-sm text-[#78350F]">
            {RBAC_SECURITY_RULES.map((rule) => (
              <li key={rule} className="leading-relaxed">
                • {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
