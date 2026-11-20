import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  GitBranch,
  GitCommitHorizontal,
  Loader2,
  RefreshCw,
  UploadCloud,
  XCircle,
} from 'lucide-react';

interface GitFileChange {
  status: string;
  file: string;
}

interface GitCommitEntry {
  hash: string;
  message: string;
  date: string;
}

interface GitStatusPayload {
  branch: string;
  remoteUrl: string;
  changes: GitFileChange[];
  commits: GitCommitEntry[];
  hasToken: boolean;
}

export function GitCommitPushPanel() {
  const [status, setStatus] = useState<GitStatusPayload | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [commitMessage, setCommitMessage] = useState<string>(
    'docs: обновление документации портала'
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/git/status');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось загрузить статус Git.');
      }
      setStatus(data);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка подключения к Git API.',
      });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCommitAndPush = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/git/commit-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось выполнить коммит и пуш.');
      }
      if (data.status) {
        setStatus(data.status);
      } else {
        await fetchStatus();
      }
      const shortHash = data.commit?.hash ? ` (${data.commit.hash})` : '';
      setFeedback({
        type: 'success',
        text: data.committed
          ? `Изменения зафиксированы${shortHash} и отправлены в ветку ${data.branch}.`
          : `Новых незафиксированных изменений нет — ветка ${data.branch} синхронизирована с удалённым репозиторием.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Ошибка при отправке изменений.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[#E2DDD4] rounded-xl p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD4] pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-base font-semibold text-[#1C1917]">
            <GitBranch className="w-4 h-4 text-[#1E3A8A]" />
            <span>Применение изменений: коммит и пуш</span>
          </div>
          <p className="text-xs text-[#57534E]">
            Фиксация рабочего дерева в Git и отправка в удалённый репозиторий{' '}
            <span className="font-mono">{status?.remoteUrl || 'origin'}</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStatus}
          disabled={loadingStatus || submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F7F5F0] hover:bg-[#EBE6DF] border border-[#D6D0C4] rounded-lg text-[#1C1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
          <span>Обновить статус</span>
        </button>
      </div>

      {loadingStatus && !status ? (
        <div className="space-y-3 py-2">
          <div className="h-4 w-48 bg-[#EFECE6] rounded animate-pulse" />
          <div className="h-16 w-full bg-[#F7F5F0] rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Working Tree & History */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-3.5 rounded-lg bg-[#F7F5F0] border border-[#E2DDD4] space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#57534E]">Текущая ветка</span>
                <span className="font-mono font-semibold text-[#1E3A8A]">
                  {status?.branch ?? 'main'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 tabular-nums">
                <span className="text-[#57534E]">Изменённых файлов</span>
                <span className="font-mono font-semibold text-[#1C1917]">
                  {status?.changes.length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#57534E]">Серверный GITHUB_TOKEN</span>
                <span
                  className={`font-medium ${
                    status?.hasToken ? 'text-[#16A34A]' : 'text-[#9A3412]'
                  }`}
                >
                  {status?.hasToken ? 'Настроен в окружении' : 'Не задан в окружении'}
                </span>
              </div>
            </div>

            {status && status.changes.length > 0 ? (
              <div className="border border-[#E2DDD4] rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-[#F7F5F0] border-b border-[#E2DDD4] text-xs font-medium text-[#57534E]">
                  Изменения в рабочем дереве
                </div>
                <ul className="max-h-36 overflow-y-auto divide-y divide-[#EBE6DF] text-xs font-mono">
                  {status.changes.map((item) => (
                    <li
                      key={`${item.status}-${item.file}`}
                      className="px-3 py-1.5 flex items-center gap-2.5"
                    >
                      <span className="text-[#1E3A8A] font-semibold w-5 shrink-0">
                        {item.status}
                      </span>
                      <span className="text-[#1C1917] truncate">{item.file}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 rounded-lg border border-[#E2DDD4] text-xs text-[#57534E]">
                Рабочее дерево чисто: все файлы зафиксированы в локальном коммите.
              </div>
            )}

            {status && status.commits.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-[#57534E]">Последние коммиты</div>
                <ul className="divide-y divide-[#EBE6DF] border border-[#E2DDD4] rounded-lg text-xs">
                  {status.commits.slice(0, 3).map((c) => (
                    <li key={c.hash} className="px-3 py-2 flex items-baseline gap-2.5">
                      <span className="font-mono text-[#1E3A8A] shrink-0">{c.hash}</span>
                      <span className="text-[#1C1917] truncate flex-1">{c.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: Commit Message & Apply Action */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label
                htmlFor="git-commit-message"
                className="block text-xs font-medium text-[#57534E] mb-1.5"
              >
                Сообщение коммита (Conventional Commits)
              </label>
              <div className="relative">
                <GitCommitHorizontal className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="git-commit-message"
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="docs: обновление документации портала"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-[#F7F5F0] border border-[#D6D0C4] rounded-lg text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCommitAndPush}
              disabled={submitting || !commitMessage.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Выполняется коммит и пуш...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Применить: коммит и пуш</span>
                </>
              )}
            </button>

            {feedback && (
              <div
                className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                  feedback.type === 'success'
                    ? 'bg-[#ECFDF5] border-[#86EFAC] text-[#14532D]'
                    : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#7F1D1D]'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{feedback.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
