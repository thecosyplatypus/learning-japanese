#!/usr/bin/env bash
# start.sh - Learning Japanese launcher (Linux).
# First run: installs Node.js and Electron automatically, then starts the app.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here"

electron="$here/node_modules/electron/dist/electron"

if [ ! -x "$electron" ]; then
  echo "First-run setup: installing Node.js and Electron (one-time download)..." >&2
  bash "$here/setup.sh" || {
    echo "Setup failed. Check your internet connection and try again." >&2
    exit 1
  }
fi

if [ ! -x "$electron" ]; then
  echo "Setup finished, but Electron is still missing. Run ./setup.sh manually for details." >&2
  read -r -p "Press Enter to close..." _ || true
  exit 1
fi

# Electron refuses to start as root (containers, some live images) unless the
# sandbox is disabled; everyone else keeps the sandbox on.
if [ "$(id -u)" -eq 0 ]; then
  exec "$electron" "$here" --no-sandbox
else
  exec "$electron" "$here"
fi