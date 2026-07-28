#!/usr/bin/env bash
set -euo pipefail

openclaw_home="/Volume3/OpenClaw/home/.openclaw"
target="${openclaw_home}/agents/life/users/Vivi/备忘录/Vivi.md"
baseline="${openclaw_home}/backups/life-memo-permission-20260728T132528Z/life-session-files-before.txt"
sessions="${openclaw_home}/agents/life/sessions"

stat -c 'FILE mode=%a bytes=%s type=%F path=%n' "${target}"
stat -c 'DIR mode=%a type=%F path=%n' \
  "$(dirname "${target}")" \
  "${openclaw_home}/agents/life/users/Vivi"
sha256sum "${target}"
printf '%s\n' 'CONTENT_BEGIN'
cat "${target}"
printf '\n%s\n' 'CONTENT_END'

missing=0
while IFS= read -r item; do
  [[ -z "${item}" ]] && continue
  if [[ ! -e "${sessions}/${item}" ]]; then
    printf 'MISSING_SESSION %s\n' "${item}"
    missing=$((missing + 1))
  fi
done < "${baseline}"

current="$(find "${sessions}" -maxdepth 1 -type f | wc -l)"
before="$(grep -c . "${baseline}")"
printf 'SESSION_AUDIT before=%s current=%s missing=%s\n' \
  "${before}" "${current}" "${missing}"

[[ "${missing}" -eq 0 ]]
