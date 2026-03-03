#!/bin/zsh
set -euo pipefail

LABEL="com.perisai.dashboard.market-update"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl unload "$PLIST_PATH" 2>/dev/null || true
rm -f "$PLIST_PATH"

echo "Uninstalled $LABEL"
