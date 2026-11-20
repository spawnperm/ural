import { useState } from 'react';
import { ArrowRight, ArrowUpRight, UploadCloud } from 'lucide-react';
import {
  ARCHITECTURE_NODES,
  CONVENTIONS,
  DOC_META,
  GLOSSARY_ITEMS,
  SYSTEM_USERS,
  TECH_STACK,
} from '../data/projectDocs';
import { ResilientImage } from './ResilientImage';

interface HeroOverviewProps {
  searchQuery: string;
  onSelectContour: (contourNum: number) => void;
  onOpenGitModal: () => void;
}

export function HeroOverview({
  searchQuery,
  onSelectContour,
  onOpenGitModal,
}: HeroOverviewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('directus');

  const selectedNode =
    ARCHITECTURE_NODES.find((n) => n.id === selectedNodeId) ?? ARCHITECTURE_NODES[3];

  const q = searchQuery.trim().toLowerCase();
  const filteredGlossary = q
    ? GLOSSARY_ITEMS.filter(
        (g) =>
          g.term.toLowerCase().includes(q) ||
          g.definition.toLowerCase().includes(q)
      )
    : GLOSSARY_ITEMS;

  const clientNodes = ARCHITECTURE_NODES.filter((n) => n.layer === 'clients');
  const bffNodes = ARCHITECTURE_NODES.filter((n) => n.layer === 'bff');
  const coreNodes = ARCHITECTURE_NODES.filter((n) => n.layer === 'core');
  const infraNodes = ARCHITECTURE_NODES.filter((n) => n.layer === 'infra');

  return (
    <section id="overview" className="space-y-12 scroll-mt-24">
      {/* Institutional Hero Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-[#E2DDD4] rounded-xl p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] tabular-nums">
              <span>Документация проекта</span>
              <span aria-hidden="true">·</span>
              <span>Версия {DOC_META.version}</span>
              <span aria-hidden="true">·</span>
              <span>{DOC_META.status}</span>
              <span aria-hidden="true">·</span>
              <span>{DOC_META.date}</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] leading-[1.15] font-semibold text-[#1C1917] [text-wrap:balance]">
              Первооткрыватели Прикамья
            </h1>

            <p className="text-base sm:text-lg text-[#44403C] max-w-2xl leading-relaxed">
              {DOC_META.subtitle}. Система совмещает мобильную AR-игру по историческим маршрутам с
              единым административным порталом организаторов мероприятий на базе Directus, NATS
              JetStream, PostgreSQL + PostGIS и Garage S3.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E2DDD4] flex flex-wrap items-center gap-3">
            <a
              href="#contours"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Изучить 11 контуров</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#api"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1C1917] bg-[#F7F5F0] hover:bg-[#EBE6DF] border border-[#D6D0C4] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>API-контракты и RBAC</span>
            </a>
            <button
              type="button"
              onClick={onOpenGitModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#1E3A8A] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#BFDBFE] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Коммит и пуш</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 flex">
          <ResilientImage
            src="/src/assets/images/perm_krai_expedition_hero_1795173334400.jpg"
            alt="Историческая карта Прикамья, латунная астролябия и фигура пермского звериного стиля на деревянном столе"
            caption="Рис. 1 — Экспедиционный контекст: картография Камы, астролябия и образы Перми Великой"
            className="lg:h-full"
          />
        </div>
      </div>

      {/* 4-column Architectural KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#E2DDD4] rounded-xl bg-white divide-y lg:divide-y-0 lg:divide-x divide-[#E2DDD4]">
        <div className="p-5">
          <div className="text-xs text-[#57534E]">Архитектурная модель</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[#1C1917] tabular-nums">
            11 контуров
          </div>
          <div className="mt-1 text-xs text-[#78716C]">От AR-клиента до наблюдаемости</div>
        </div>
        <div className="p-5">
          <div className="text-xs text-[#57534E]">Доменная схема (PostgreSQL)</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[#1C1917] tabular-nums">
            7 коллекций
          </div>
          <div className="mt-1 text-xs text-[#78716C]">PostGIS, JSON-вопросы и S3-ассеты</div>
        </div>
        <div className="p-5">
          <div className="text-xs text-[#57534E]">Контроль доступа</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[#1C1917] tabular-nums">
            5 ролей RBAC
          </div>
          <div className="mt-1 text-xs text-[#78716C]">Policy, own-фильтры, маскирование</div>
        </div>
        <div className="p-5">
          <div className="text-xs text-[#57534E]">Целевой SLO Directus API</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[#1C1917] tabular-nums">
            99.5% / мес
          </div>
          <div className="mt-1 text-xs text-[#78716C]">p95 ≤ 150 мс · события ≤ 10 с</div>
        </div>
      </div>

      {/* 0.1 Назначение, 0.3 Глоссарий, 0.4 Соглашения */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div id="overview-mechanics" className="lg:col-span-5 bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-6 scroll-mt-24">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#1C1917]">
              0. О документе и механике квеста
            </h2>
            <p className="mt-2 text-sm text-[#44403C] leading-relaxed">
              Документ описывает архитектуру, контракты, порядок развёртывания и эксплуатации
              системы. Предназначен для внутренних и подрядных разработчиков, DevOps-инженеров,
              контент-менеджеров, организаторов мероприятий и пользователей мобильного приложения.
            </p>
          </div>

          <div className="border-t border-[#E2DDD4] pt-5">
            <h3 className="text-sm font-semibold text-[#1C1917] mb-3">
              Как работает цикл игры (§1.1)
            </h3>
            <ol className="space-y-2.5 text-sm text-[#44403C]">
              <li className="flex gap-3">
                <span className="font-mono text-xs text-[#1E3A8A] tabular-nums pt-0.5">01.</span>
                <span>Пользователь наводит камеру телефона на настенный календарь или AR-маркер.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-[#1E3A8A] tabular-nums pt-0.5">02.</span>
                <span>Появляется 3D-персонаж-первооткрыватель и задаёт исторические вопросы.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-[#1E3A8A] tabular-nums pt-0.5">03.</span>
                <span>Правильные ответы дают «печати»; серия из N печатей — приглашение на офлайн-мероприятие.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-xs text-[#1E3A8A] tabular-nums pt-0.5">04.</span>
                <span>Календарь обновляется ежемесячно: меняются картинка, персонаж и вопросы.</span>
              </li>
            </ol>
          </div>

          <div className="border-t border-[#E2DDD4] pt-5">
            <h3 className="text-sm font-semibold text-[#1C1917] mb-2.5">Соглашения (§0.4)</h3>
            <dl className="space-y-2 text-xs text-[#44403C]">
              {CONVENTIONS.map((item) => (
                <div key={item.token} className="flex gap-2">
                  <dt className="font-mono font-medium text-[#1C1917] shrink-0">{item.token}:</dt>
                  <dd>{item.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Глоссарий §0.3 */}
        <div id="overview-glossary" className="lg:col-span-7 bg-white border border-[#E2DDD4] rounded-xl p-6 scroll-mt-24">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-display text-xl font-semibold text-[#1C1917]">
              0.3. Глоссарий предметной области
            </h2>
            <span className="text-xs text-[#78716C] tabular-nums">
              Терминов: {filteredGlossary.length}
            </span>
          </div>
          <div className="divide-y divide-[#EBE6DF]">
            {filteredGlossary.map((item) => (
              <div key={item.term} className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
                <dt className="sm:col-span-4 text-sm font-semibold text-[#1C1917]">
                  {item.term}
                </dt>
                <dd className="sm:col-span-8 text-sm text-[#44403C] leading-relaxed">
                  {item.definition}
                </dd>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 1.3 Высокоуровневая интерактивная схема */}
      <div id="overview-architecture" className="bg-white border border-[#E2DDD4] rounded-xl p-6 sm:p-8 space-y-6 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DDD4] pb-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
              1.3. Интерактивная схема системы
            </h2>
            <p className="mt-1 text-sm text-[#57534E]">
              Выберите любой узел архитектуры, чтобы подсветить его связи, протоколы обмена и перейти к контуру.
            </p>
          </div>
          <div className="text-xs text-[#57534E] tabular-nums">
            Активный узел: <span className="font-semibold text-[#1C1917]">{selectedNode.label}</span>
          </div>
        </div>

        {/* Layer 1: Clients */}
        <div className="space-y-4">
          <div className="text-xs font-medium text-[#78716C]">Уровень 1 · Клиенты (HTTPS / REST / S3)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {clientNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isConnected = selectedNode.connections.includes(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                      : isConnected
                        ? 'bg-[#EEF2FF] border-[#93C5FD] text-[#1C1917]'
                        : 'bg-[#F7F5F0] border-[#E2DDD4] text-[#1C1917] hover:bg-[#EFECE6]'
                  }`}
                >
                  <div className="text-sm font-semibold">{node.label}</div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-[#DBEAFE]' : 'text-[#57534E]'}`}>
                    {node.sublabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Layer 2: BFF */}
          <div className="text-xs font-medium text-[#78716C] pt-2">
            Уровень 2 · Единый BFF / CRUD-шлюз
          </div>
          <div>
            {bffNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isConnected = selectedNode.connections.includes(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                      : isConnected
                        ? 'bg-[#EEF2FF] border-[#93C5FD] text-[#1C1917]'
                        : 'bg-[#F7F5F0] border-[#E2DDD4] text-[#1C1917] hover:bg-[#EFECE6]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{node.label}</span>
                    <span className={`font-mono text-xs ${isSelected ? 'text-[#DBEAFE]' : 'text-[#57534E]'}`}>
                      REST + SQL + S3 + Webhooks
                    </span>
                  </div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-[#DBEAFE]' : 'text-[#57534E]'}`}>
                    {node.sublabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Layer 3: Core Data, Bus, Storage, Workers */}
          <div className="text-xs font-medium text-[#78716C] pt-2">
            Уровень 3 · Данные, шина событий, хранилище и доменные воркеры
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {coreNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isConnected = selectedNode.connections.includes(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                      : isConnected
                        ? 'bg-[#EEF2FF] border-[#93C5FD] text-[#1C1917]'
                        : 'bg-[#F7F5F0] border-[#E2DDD4] text-[#1C1917] hover:bg-[#EFECE6]'
                  }`}
                >
                  <div className="text-sm font-semibold">{node.label}</div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-[#DBEAFE]' : 'text-[#57534E]'}`}>
                    {node.sublabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Layer 4: DevOps & Observability */}
          <div className="text-xs font-medium text-[#78716C] pt-2">
            Уровень 4 · Инфраструктура сборки и наблюдаемости
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {infraNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isConnected = selectedNode.connections.includes(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white'
                      : isConnected
                        ? 'bg-[#EEF2FF] border-[#93C5FD] text-[#1C1917]'
                        : 'bg-[#F7F5F0] border-[#E2DDD4] text-[#1C1917] hover:bg-[#EFECE6]'
                  }`}
                >
                  <div className="text-sm font-semibold">{node.label}</div>
                  <div className={`text-xs mt-1 ${isSelected ? 'text-[#DBEAFE]' : 'text-[#57534E]'}`}>
                    {node.sublabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Node Inspector */}
        <div className="p-4 sm:p-5 rounded-lg bg-[#F7F5F0] border border-[#E2DDD4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-[#57534E] tabular-nums">
              Контур {selectedNode.contourNum} · Протоколы и интерфейсы
            </div>
            <div className="text-sm font-semibold text-[#1C1917]">{selectedNode.label}</div>
            <div className="text-sm text-[#44403C]">{selectedNode.protocolNote}</div>
          </div>
          <a
            href="#contours"
            onClick={() => onSelectContour(selectedNode.contourNum)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#D6D0C4] hover:border-[#1E3A8A] text-[#1C1917] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <span>Открыть контур {selectedNode.contourNum}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 1.2 Пользователи & 1.4 Технологический стек */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div id="overview-users" className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-[#E2DDD4]">
            <h2 className="font-display text-xl font-semibold text-[#1C1917]">
              1.2. Пользователи и каналы доступа
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-2.5 px-4 font-medium">Роль</th>
                  <th className="py-2.5 px-4 font-medium">Канал</th>
                  <th className="py-2.5 px-4 font-medium">Описание</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {SYSTEM_USERS.map((u) => (
                  <tr key={u.role} className="hover:bg-[#FAF8F5]">
                    <td className="py-2.5 px-4 font-medium text-[#1C1917] whitespace-nowrap">
                      {u.role}
                    </td>
                    <td className="py-2.5 px-4 text-[#44403C] whitespace-nowrap">{u.channel}</td>
                    <td className="py-2.5 px-4 text-[#44403C]">{u.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div id="overview-stack" className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-[#E2DDD4]">
            <h2 className="font-display text-xl font-semibold text-[#1C1917]">
              1.4. Технологический стек
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-2.5 px-4 font-medium">Компонент</th>
                  <th className="py-2.5 px-4 font-medium">Технология</th>
                  <th className="py-2.5 px-4 font-medium">Назначение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {TECH_STACK.map((row) => (
                  <tr key={row.component} className="hover:bg-[#FAF8F5]">
                    <td className="py-2.5 px-4 font-medium text-[#1C1917] whitespace-nowrap">
                      {row.component}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-[#1E3A8A] whitespace-nowrap">
                      {row.technology}
                    </td>
                    <td className="py-2.5 px-4 text-[#44403C]">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
