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
import type {
  CommitPushResponse,
  GitStatusResponse,
  ProblemResponse,
} from '../shared/apiContract';

/**
 * Reads an RFC 7807 error body. The server always sends `error`, but a proxy or
 * a crash can produce something else, so the fallback keeps the panel from
 * rendering `undefined` into the UI.
 */
async function readProblem(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as Partial<ProblemResponse>;
    if (typeof body.error === 'string' && body.error.length > 0) {
      const requestId = typeof body.requestId === 'string' ? body.requestId : undefined;
      return requestId ? `${body.error} (id: ${requestId})` : body.error;
    }
  } catch {
    // Not JSON — fall through to the generic message.
  }
  return `${fallback} (HTTP ${res.status})`;
}

export function GitCommitPushPanel() {
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [commitMessage, setCommitMessage] = useState<string>(
    'docs: обновление документации портала'
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    commitHash?: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/git/status');
      if (!res.ok) {
        throw new Error(await readProblem(res, 'Не удалось загрузить статус Git.'));
      }
      const data = (await res.json()) as GitStatusResponse;
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
      if (!res.ok) {
        throw new Error(await readProblem(res, 'Не удалось выполнить коммит и пуш.'));
      }
      const data = (await res.json()) as CommitPushResponse;
      // The response no longer carries the whole repository state; refetching
      // keeps one source of truth instead of two shapes that can disagree.
      await fetchStatus();

      const shortHash = data.commit?.hash ? ` (${data.commit.hash})` : '';
      setFeedback({
        type: 'success',
        text: data.committed
          ? `Изменения зафиксированы${shortHash} и отправлены на GitHub в ветку ${data.branch}.`
          : `Новых незафиксированных изменений нет — ветка ${data.branch} актуальна на GitHub.`,
        commitHash: data.commit?.hash,
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
            Проверьте список файлов перед публикацией. Токен доступа остаётся на
            сервере и не передаётся в браузер.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStatus}
          disabled={loadingStatus || submitting}
          aria-label="Обновить статус Git"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E2DDD4] text-[#57534E] hover:text-[#1C1917] hover:border-[#1E3A8A]/40 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#1E3A8A]"
        >
          {loadingStatus ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>Обновить</span>
        </button>
      </div>

      {status && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#57534E]">
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="font-medium text-[#1C1917]">{status.branch}</span>
            </span>
            <span className="truncate max-w-full" title={status.remoteUrl}>
              {status.remoteUrl || 'origin не настроен'}
            </span>
            <span
              className={
                status.hasToken
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }
            >
              {status.hasToken
                ? 'Токен GitHub настроен'
                : 'GITHUB_TOKEN не задан — push будет недоступен'}
            </span>
          </div>

          <div className="rounded-lg border border-[#E2DDD4] overflow-hidden">
            <div className="px-3 py-2 bg-[#F7F5F0] text-xs font-medium text-[#1C1917] border-b border-[#E2DDD4]">
              Изменения ({status.changes.length})
            </div>
            {status.changes.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[#57534E]">
                Рабочее дерево чистое — коммитить нечего.
              </p>
            ) : (
              <ul className="divide-y divide-[#E2DDD4] max-h-48 overflow-y-auto">
                {status.changes.map((change) => (
                  <li
                    key={`${change.status}-${change.file}`}
                    className="px-3 py-1.5 text-xs flex items-center gap-2"
                  >
                    <span className="w-6 shrink-0 font-mono text-[#1E3A8A]">
                      {change.status}
                    </span>
                    <span className="truncate font-mono text-[#44403C]">
                      {change.file}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {status.commits.length > 0 && (
            <div className="rounded-lg border border-[#E2DDD4] overflow-hidden">
              <div className="px-3 py-2 bg-[#F7F5F0] text-xs font-medium text-[#1C1917] border-b border-[#E2DDD4]">
                Последние коммиты
              </div>
              <ul className="divide-y divide-[#E2DDD4]">
                {status.commits.map((commit) => (
                  <li
                    key={commit.hash}
                    className="px-3 py-1.5 text-xs flex items-center gap-2"
                  >
                    <GitCommitHorizontal className="w-3.5 h-3.5 shrink-0 text-[#57534E]" />
                    <span className="font-mono text-[#1E3A8A] shrink-0">
                      {commit.hash}
                    </span>
                    <span className="truncate text-[#44403C]">{commit.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="commit-message"
          className="block text-xs font-medium text-[#1C1917]"
        >
          Сообщение коммита
        </label>
        <input
          id="commit-message"
          type="text"
          value={commitMessage}
          maxLength={200}
          onChange={(event) => setCommitMessage(event.target.value)}
          disabled={submitting}
          className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2DDD4] bg-white text-[#1C1917] focus:outline-2 focus:outline-[#1E3A8A] focus:outline-offset-1 disabled:opacity-60"
          placeholder="docs: обновление документации портала"
        />
        <p className="text-[11px] text-[#57534E]">
          До 200 символов. Многострочный текст будет свёрнут в одну строку.
        </p>
      </div>

      <button
        type="button"
        onClick={handleCommitAndPush}
        disabled={submitting || loadingStatus}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#1E3A8A] text-white hover:bg-[#1E3A8A]/90 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UploadCloud className="w-4 h-4" />
        )}
        <span>{submitting ? 'Отправка…' : 'Коммит и пуш'}</span>
      </button>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
}
