#!/usr/bin/env bash
set -euo pipefail

ROOT='/Volume3/OpenClaw/home/.openclaw'
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="$ROOT/backups/life-memo-permission-$STAMP"

case "$BACKUP" in
  "$ROOT"/backups/life-memo-permission-*) ;;
  *) echo 'invalid backup path' >&2; exit 1 ;;
esac

mkdir -p "$BACKUP/config" "$BACKUP/life-role"
chmod 0700 "$BACKUP" "$BACKUP/config" "$BACKUP/life-role"
cp -p "$ROOT/openclaw.json" "$BACKUP/config/openclaw.json"
chmod 0600 "$BACKUP/config/openclaw.json"

for name in IDENTITY.md SOUL.md AGENTS.md USER.md TOOLS.md; do
  cp -p "$ROOT/agents/life/$name" "$BACKUP/life-role/$name"
  chmod 0600 "$BACKUP/life-role/$name"
done

find "$ROOT/extensions" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' |
  LC_ALL=C sort >"$BACKUP/extensions-before.txt"

find "$ROOT/agents/life/sessions" -maxdepth 1 -type f -printf '%f\n' |
  LC_ALL=C sort >"$BACKUP/life-session-files-before.txt"

(
  cd "$BACKUP"
  find config life-role -type f -print0 |
    LC_ALL=C sort -z |
    xargs -0 sha256sum
) >"$BACKUP/SHA256SUMS"

chmod 0600 "$BACKUP/extensions-before.txt" \
  "$BACKUP/life-session-files-before.txt" \
  "$BACKUP/SHA256SUMS"

printf 'BACKUP_PATH=%s\n' "$BACKUP"
printf 'CONFIG_SHA256=%s\n' "$(sha256sum "$BACKUP/config/openclaw.json" | cut -d' ' -f1)"
printf 'ROLE_FILE_COUNT=5\n'
printf 'SESSION_FILE_COUNT=%s\n' "$(wc -l <"$BACKUP/life-session-files-before.txt")"
