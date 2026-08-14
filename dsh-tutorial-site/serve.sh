#!/usr/bin/env bash
# 启动本地教程站。用法：./serve.sh [端口]
set -euo pipefail
PORT="${1:-8899}"
cd "$(dirname "$0")"
echo "教程站: http://127.0.0.1:${PORT}"
echo "停止: Ctrl-C"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
