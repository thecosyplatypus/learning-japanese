#!/usr/bin/env bash
# setup.sh - one-time installer for Learning Japanese (Linux).
# Ensures Node.js is available (installs a local copy if needed) and runs npm install.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$here"

local_node="$here/node-js"
min_major=20   # Node 20 is the oldest release line the current Electron tooling supports
fallback_node_version="v22.14.0"

say() { echo "$@" >&2; }

fetch() {
  # fetch <url> <destination>
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$2" "$1"
  else
    say "Neither curl nor wget was found."
    say "Install one of them (e.g. 'sudo apt install curl' or 'sudo dnf install curl')"
    say "and run setup.sh again."
    exit 1
  fi
}

node_arch() {
  case "$(uname -m)" in
    x86_64 | amd64)  echo x64 ;;
    aarch64 | arm64) echo arm64 ;;
    *) return 1 ;;
  esac
}

latest_lts_version() {
  # Parse nodejs.org/dist/index.json without needing jq: the first entry whose
  # "lts" field is a version string rather than false is the newest LTS.
  # (index.json has no spaces after the colons.)
  local index ver
  index="$(mktemp)"
  fetch "https://nodejs.org/dist/index.json" "$index" || { rm -f "$index"; return 1; }
  ver="$(awk '
    /"version":/ { v = $0 }
    /"lts":[[:space:]]*(true|")/ { print v; exit }
  ' "$index")"
  rm -f "$index"
  [ -n "$ver" ] || return 1
  printf '%s' "$ver" | sed -n 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/p'
}

install_local_node() {
  local arch name url tmp ver
  if ! arch="$(node_arch)"; then
    say "Unsupported CPU architecture: $(uname -m)."
    say "Install Node.js $min_major or newer manually, then run setup.sh again."
    exit 1
  fi
  if [ ! -x "$local_node/bin/node" ]; then
    ver="$(latest_lts_version || true)"
    [ -n "${ver:-}" ] || ver="$fallback_node_version"
    name="node-$ver-linux-$arch"
    url="https://nodejs.org/dist/$ver/$name.tar.gz"
    tmp="$(mktemp -d)"
    say "Node.js was not found - downloading a local copy (one-time)..."
    say "Downloading Node.js $ver for linux-$arch ..."
    fetch "$url" "$tmp/node.tar.gz" || { say "Download failed. Check your internet connection."; exit 1; }
    say "Extracting..."
    tar -xzf "$tmp/node.tar.gz" -C "$tmp"
    rm -rf "$local_node"
    mv "$tmp/$name" "$local_node"
    rm -rf "$tmp"
    [ -x "$local_node/bin/node" ] || { say "Node.js download or extraction failed."; exit 1; }
  fi
  export PATH="$local_node/bin:$PATH"
}

node_major() {
  node -v 2>/dev/null | sed -n 's/^v\?\([0-9]\+\).*/\1/p'
}

main() {
  local major need_local=0
  if command -v node >/dev/null 2>&1; then
    major="$(node_major || true)"
    if [ -z "$major" ] || [ "$major" -lt "$min_major" ]; then
      need_local=1
    fi
  else
    need_local=1
  fi

  if [ "$need_local" -eq 1 ]; then
    install_local_node
    command -v node >/dev/null 2>&1 || { say "Node.js is not available after setup."; exit 1; }
  fi

  say "Using Node.js $(node -v)"
  say "Installing Electron (one-time download)..."
  npm install --no-audit --no-fund
  if [ ! -x "$here/node_modules/electron/dist/electron" ]; then
    # Newer npm versions block install scripts (allowScripts) unless approved, which
    # stops Electron's postinstall from downloading the binary. Fetch it directly.
    say "npm did not download the Electron runtime (its install script is blocked by this npm version) - fetching it directly..."
    node "$here/node_modules/electron/install.js"
  fi
  [ -x "$here/node_modules/electron/dist/electron" ] || { say "Electron is still missing after setup. Check your internet connection and try again."; exit 1; }
  say "Setup complete."
}

main "$@"