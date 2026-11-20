import { AlertTriangle } from 'lucide-react';
import {
  BACKUP_POLICY,
  CI_PIPELINE_STEPS,
  DEV_ENDPOINTS,
  DOCKER_BOOTSTRAP_SNIPPET,
  ENV_EXAMPLE_SNIPPET,
  FORGEJO_REPOS,
  INCIDENT_ESCALATION,
  MONITORING_TARGETS,
  ONBOARDING_SNIPPET,
  ROLE_CONTACTS,
  SLO_TARGETS,
  WSL_CONFIG_SNIPPET,
} from '../data/projectDocs';
import { CopyCodeBlock } from './CopyCodeBlock';
import { GitCommitPushPanel } from './GitCommitPushPanel';

export function DeploymentAndOpsSection() {
  return (
    <div className="space-y-14">
      {/* Section 07: Deployment */}
      <section id="deployment" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="max-w-3xl">
          <div className="text-xs text-[#57534E] tabular-nums">
            Раздел 07 · Инфраструктура стенда
          </div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
            7. Развёртывание (WSL2 + Docker)
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#44403C] leading-relaxed">
            Локальный и тестовый стек разворачивается на WSL2 + Docker Desktop (минимум 8 ГБ RAM, 4
            vCPU) одной командой <code className="font-mono text-xs">docker compose up -d</code>.
          </p>
        </div>

        <div id="deploy-bootstrap" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-24">
          <div className="lg:col-span-7 space-y-4">
            <CopyCodeBlock
              code={DOCKER_BOOTSTRAP_SNIPPET}
              label="7.2. Порядок запуска и проверка health-эндпоинтов"
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            <CopyCodeBlock code={WSL_CONFIG_SNIPPET} label="7.1. Конфигурация .wslconfig" />

            <div className="bg-white border border-[#E2DDD4] rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-[#1C1917]">7.4. Миграции БД</h3>
              <ul className="space-y-1.5 text-sm text-[#44403C]">
                <li>• Схема Directus хранится в snapshot-файле репозитория.</li>
                <li>
                  • Изменения применяются через{' '}
                  <code className="font-mono text-xs text-[#1E3A8A]">
                    npx directus schema apply
                  </code>
                  .
                </li>
              </ul>
              <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2 text-xs text-[#78350F]">
                <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                <span>Миграции применяются только после ревью в Forgejo.</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7.3 Публичные endpoint'ы (dev) */}
        <div id="deploy-endpoints" className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden scroll-mt-24">
          <div className="px-6 py-4 border-b border-[#E2DDD4]">
            <h3 className="text-base font-semibold text-[#1C1917]">
              7.3. Публичные endpoint&apos;ы локального стенда (dev)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-2.5 px-4 font-medium">Сервис</th>
                  <th className="py-2.5 px-4 font-medium">URL / Порт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {DEV_ENDPOINTS.map((ep) => (
                  <tr key={ep.service} className="hover:bg-[#FAF8F5]">
                    <td className="py-2.5 px-4 font-medium text-[#1C1917]">{ep.service}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-[#1E3A8A] tabular-nums">
                      {ep.url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 08: Developer Onboarding */}
      <section id="onboarding" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="max-w-3xl">
          <div className="text-xs text-[#57534E] tabular-nums">
            Раздел 08 · Forgejo, Verdaccio и CI
          </div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
            8. Онбординг разработчика
          </h2>
        </div>

        <div id="onboarding-git" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-24">
          <div className="lg:col-span-6">
            <CopyCodeBlock
              code={ONBOARDING_SNIPPET}
              label="8.1. Первый день: клонирование и Verdaccio"
            />
          </div>

          <div className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[#1C1917] mb-2">8.2. Соглашения</h3>
              <dl className="divide-y divide-[#EBE6DF] text-sm">
                <div className="py-2 grid grid-cols-1 sm:grid-cols-12 gap-1">
                  <dt className="sm:col-span-4 font-medium text-[#1C1917]">Ветки</dt>
                  <dd className="sm:col-span-8 font-mono text-xs text-[#1E3A8A]">
                    main, feature/*, fix/*
                  </dd>
                </div>
                <div className="py-2 grid grid-cols-1 sm:grid-cols-12 gap-1">
                  <dt className="sm:col-span-4 font-medium text-[#1C1917]">Коммиты и ревью</dt>
                  <dd className="sm:col-span-8 text-[#44403C]">
                    Conventional Commits · минимум 1 approve перед merge в main
                  </dd>
                </div>
                <div className="py-2 grid grid-cols-1 sm:grid-cols-12 gap-1">
                  <dt className="sm:col-span-4 font-medium text-[#1C1917]">Общие типы</dt>
                  <dd className="sm:col-span-8 text-[#44403C]">
                    <code className="font-mono text-xs">@perm-krai/shared-types</code> в Verdaccio (не
                    копировать типы между репозиториями)
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-[#E2DDD4] pt-4">
              <h3 className="text-base font-semibold text-[#1C1917] mb-2">
                8.3. Пайплайн CI (Forgejo Actions при PR в main)
              </h3>
              <ol className="space-y-1.5 text-sm text-[#44403C] tabular-nums">
                {CI_PIPELINE_STEPS.map((step, i) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="font-mono text-xs text-[#1E3A8A] pt-0.5">0{i + 1}.</span>
                    <span className="font-mono text-xs">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <GitCommitPushPanel />
      </section>

      {/* Section 11: Operations & Monitoring */}
      <section id="operations" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="max-w-3xl">
          <div className="text-xs text-[#57534E] tabular-nums">
            Раздел 11 · Надёжность, бэкапы и инциденты
          </div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] [text-wrap:balance]">
            11. Эксплуатация и мониторинг
          </h2>
        </div>

        <div id="ops-slo" className="grid grid-cols-1 lg:grid-cols-12 gap-6 scroll-mt-24">
          {/* 11.1 SLO */}
          <div className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2DDD4]">
              <h3 className="text-base font-semibold text-[#1C1917]">11.1. Целевые показатели SLO</h3>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-2.5 px-4 font-medium">Метрика</th>
                  <th className="py-2.5 px-4 font-medium text-right">Цель</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {SLO_TARGETS.map((item) => (
                  <tr key={item.metric} className="hover:bg-[#FAF8F5]">
                    <td className="py-2.5 px-4 text-[#1C1917]">{item.metric}</td>
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#1E3A8A] text-right tabular-nums whitespace-nowrap">
                      {item.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 11.4 Escalation */}
          <div className="lg:col-span-6 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2DDD4]">
              <h3 className="text-base font-semibold text-[#1C1917]">11.4. Инциденты и эскалация</h3>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2DDD4] bg-[#F7F5F0] text-xs text-[#57534E]">
                  <th className="py-2.5 px-4 font-medium">Уровень</th>
                  <th className="py-2.5 px-4 font-medium">Пример</th>
                  <th className="py-2.5 px-4 font-medium">Реакция</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE6DF]">
                {INCIDENT_ESCALATION.map((row) => (
                  <tr key={row.level} className="hover:bg-[#FAF8F5]">
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-[#9A3412] tabular-nums">
                      {row.level}
                    </td>
                    <td className="py-2.5 px-4 text-[#1C1917]">{row.example}</td>
                    <td className="py-2.5 px-4 text-[#44403C] tabular-nums">{row.reaction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 11.2 Monitoring & 11.3 Backups */}
        <div id="ops-monitoring" className="grid grid-cols-1 lg:grid-cols-12 gap-6 scroll-mt-24">
          <div className="lg:col-span-7 bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-3">
            <h3 className="text-base font-semibold text-[#1C1917]">11.2. Объекты мониторинга</h3>
            <dl className="divide-y divide-[#EBE6DF] text-sm">
              {MONITORING_TARGETS.map((m) => (
                <div key={m.component} className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <dt className="sm:col-span-4 font-semibold text-[#1C1917]">{m.component}</dt>
                  <dd className="sm:col-span-8 font-mono text-xs text-[#44403C]">{m.check}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#1C1917]">11.3. Резервное копирование</h3>
            <dl className="divide-y divide-[#EBE6DF] text-sm">
              {BACKUP_POLICY.map((b) => (
                <div key={b.target} className="py-2.5 space-y-0.5">
                  <dt className="font-semibold text-[#1C1917]">{b.target}</dt>
                  <dd className="text-xs text-[#44403C]">{b.rule}</dd>
                </div>
              ))}
            </dl>
            <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-2 text-xs text-[#78350F]">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <span>Восстановление из резервных копий обязано быть протестировано до начала сезона.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Appendices A–C */}
      <section id="appendices" className="space-y-6 scroll-mt-24 pt-6 border-t border-[#E2DDD4]">
        <div className="max-w-3xl">
          <div className="text-xs text-[#57534E]">Приложения A, B, C</div>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
            Приложения: окружение, репозитории и контакты
          </h2>
        </div>

        <div id="appendices-env" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-24">
          <div className="lg:col-span-5">
            <CopyCodeBlock
              code={ENV_EXAMPLE_SNIPPET}
              label="Приложение A. Переменные окружения (.env.example)"
            />
          </div>

          <div className="lg:col-span-4 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2DDD4]">
              <h3 className="text-sm font-semibold text-[#1C1917]">
                Приложение B. Репозитории в Forgejo
              </h3>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-[#EBE6DF]">
                {FORGEJO_REPOS.map((r) => (
                  <tr key={r.repo}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#1E3A8A] whitespace-nowrap">
                      {r.repo}
                    </td>
                    <td className="py-2.5 px-4 text-[#44403C]">{r.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-3 bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2DDD4]">
              <h3 className="text-sm font-semibold text-[#1C1917]">
                Приложение C. Контакты ролей
              </h3>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <tbody className="divide-y divide-[#EBE6DF]">
                {ROLE_CONTACTS.map((c) => (
                  <tr key={c.role}>
                    <td className="py-2.5 px-4 font-semibold text-[#1C1917]">{c.role}</td>
                    <td className="py-2.5 px-4 text-[#44403C]">{c.responsibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
