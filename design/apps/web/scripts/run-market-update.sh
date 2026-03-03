#!/bin/zsh
set -euo pipefail

WEB_DIR="/Users/arifpras/Library/CloudStorage/Dropbox/perisai/dashboard/design/apps/web"
LOG_DIR="$WEB_DIR/data/market-update/logs"
mkdir -p "$LOG_DIR"

cd "$WEB_DIR"

NOW=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$NOW] Starting market update generation" >> "$LOG_DIR/scheduler.log"

npm run generate:market-update >> "$LOG_DIR/scheduler.log" 2>&1

NOW_DONE=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$NOW_DONE] Completed market update generation" >> "$LOG_DIR/scheduler.log"
