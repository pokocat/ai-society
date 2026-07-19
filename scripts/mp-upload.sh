#!/usr/bin/env bash
# 小程序上传（体验版）：bash scripts/mp-upload.sh <version> "<desc>"
# 前置：export MP_PRIVATE_KEY_PATH=~/.mp-keys/private.wxe473d97a68e6683e.key（密钥在小程序后台生成，勿入仓库）
set -euo pipefail
cd "$(dirname "$0")/../apps/member-app/ci"
[ -d node_modules ] || npm i --no-audit --no-fund
node upload.js "${1:-0.0.1}" "${2:-dev upload}"
