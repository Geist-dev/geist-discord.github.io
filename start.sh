#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
command -v node >/dev/null || { echo 'Установите Node.js 22 или 24: https://nodejs.org'; exit 1; }
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (!((major === 22 && minor >= 9) || major === 24)) { console.error("Нужен Node.js 22.9+ (ветка 22) или 24"); process.exit(1); }'
command -v npm >/dev/null || { echo 'npm не найден. Установите Node.js вместе с npm.'; exit 1; }
npm ci --no-audit --no-fund
exec node --env-file-if-exists=.env server.js
