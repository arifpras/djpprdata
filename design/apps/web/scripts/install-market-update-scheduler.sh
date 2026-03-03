#!/bin/zsh
set -euo pipefail

LABEL="com.perisai.dashboard.market-update"
WEB_DIR="/Users/arifpras/Library/CloudStorage/Dropbox/perisai/dashboard/design/apps/web"
RUN_SCRIPT="$WEB_DIR/scripts/run-market-update.sh"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/$LABEL.plist"

mkdir -p "$PLIST_DIR"
chmod +x "$RUN_SCRIPT"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>$RUN_SCRIPT</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$WEB_DIR</string>

  <key>StartCalendarInterval</key>
  <array>
    <dict>
      <key>Hour</key>
      <integer>5</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
    <dict>
      <key>Hour</key>
      <integer>12</integer>
      <key>Minute</key>
      <integer>30</integer>
    </dict>
  </array>

  <key>StandardOutPath</key>
  <string>$WEB_DIR/data/market-update/logs/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$WEB_DIR/data/market-update/logs/launchd.err.log</string>
</dict>
</plist>
PLIST

mkdir -p "$WEB_DIR/data/market-update/logs"

launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "Installed and loaded $LABEL"
echo "Plist: $PLIST_PATH"
