#!/usr/bin/env bash
#
# Store a GitHub token in .env without exposing it.
#
# Why a script instead of "edit .env and paste it":
#
#   * `read -s` keeps the token out of the terminal scrollback and out of
#     ~/.bash_history, which is where a pasted secret usually ends up first.
#   * The file is created with mode 600 in the same step, so there is no window
#     during which a world-readable .env contains a live credential.
#   * Existing keys are replaced in place rather than appended, so running it
#     twice does not leave two GITHUB_TOKEN lines where the second silently wins.
#   * `git check-ignore` is asserted before writing: refusing to write is better
#     than writing a secret into a file that is about to be committed.
#
# Usage:
#   ./scripts/setup-github-token.sh              # prompt, hidden input
#   printf '%s' "$TOKEN" | ./scripts/setup-github-token.sh   # for automation
#
# The token is never echoed. Do not pass it as an argument: argv is visible to
# every process on the host via `ps`.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

cd "$REPO_ROOT"

# --- Guard: the file must be ignored, or a secret lands in git ---------------
if ! git check-ignore -q .env 2>/dev/null; then
  echo "ОТКАЗ: .env не игнорируется git. Запись секрета остановлена." >&2
  echo "Проверьте .gitignore (должна быть строка '.env*')." >&2
  exit 1
fi

# --- Read the token ---------------------------------------------------------
if [ -t 0 ]; then
  # Interactive: hidden prompt.
  printf 'GitHub token (ввод не отображается): ' >&2
  IFS= read -rs TOKEN
  printf '\n' >&2
else
  # Piped: read the whole stream, strip whitespace.
  TOKEN="$(cat)"
fi

TOKEN="$(printf '%s' "$TOKEN" | tr -d '[:space:]')"

if [ -z "$TOKEN" ]; then
  echo "ОТКАЗ: пустой токен." >&2
  exit 1
fi

# Cheap sanity check, not a validity check — the API call is the real test.
case "$TOKEN" in
  ghp_*|github_pat_*) ;;
  *)
    echo "ПРЕДУПРЕЖДЕНИЕ: токен не похож на GitHub PAT (ghp_… или github_pat_…)." >&2
    ;;
esac

# --- Write atomically, with restrictive permissions -------------------------
TMP="$(mktemp "${ENV_FILE}.XXXXXX")"
chmod 600 "$TMP"

if [ -f "$ENV_FILE" ]; then
  # Drop any existing GITHUB_TOKEN line, keep everything else verbatim.
  grep -v '^GITHUB_TOKEN=' "$ENV_FILE" > "$TMP" || true
fi

# Ensure the file ends with a newline before appending.
if [ -s "$TMP" ] && [ "$(tail -c1 "$TMP" | wc -l)" -eq 0 ]; then
  printf '\n' >> "$TMP"
fi

printf 'GITHUB_TOKEN=%s\n' "$TOKEN" >> "$TMP"

mv "$TMP" "$ENV_FILE"
chmod 600 "$ENV_FILE" 2>/dev/null || true

# --- Report without the secret ---------------------------------------------
LEN=${#TOKEN}
PREFIX="${TOKEN:0:4}"
echo "Готово: GITHUB_TOKEN записан в .env (${PREFIX}…, ${LEN} символов)."

# --- Permissions: POSIX modes do not exist on a Windows-mounted workspace ---
#
# On /mnt/c (WSL 9p without the `metadata` option) `chmod` is silently ignored:
# the file keeps mode 777 because Windows owns the real permissions. Reporting
# "права 600" there would be a lie, and a dangerous one — the reader would think
# the token is protected when it is not. The check below reports what actually
# happened and gives the command that fixes it on that filesystem.
if [ -f /mnt/c/Projects/.wsl-marker ] || mount | grep -q "on /mnt/c type 9p"; then
  if [ "$(stat -c %a "$ENV_FILE" 2>/dev/null)" = "600" ]; then
    echo "Права файла: 600 (POSIX)."
  else
    cat >&2 <<'NOTICE'
ВНИМАНИЕ: .env лежит на Windows-диске (/mnt/c), где POSIX-права не действуют —
chmod игнорируется, файл остаётся 777. Реальные права задаются в Windows.
Ограничьте доступ к файлу (PowerShell, от вашего имени):

  icacls C:\Projects\ural\.env /inheritance:r /grant:r "$($env:USERNAME):(F)"

Проверка:

  icacls C:\Projects\ural\.env

Либо положите токен в переменную окружения вне рабочего каталога — тогда
он не окажется рядом с репозиторием вовсе.
NOTICE
  fi
fi

echo "Проверить, что git не видит файл: git check-ignore -v .env"
echo "Перезапустите сервер, чтобы он прочитал новую переменную."
