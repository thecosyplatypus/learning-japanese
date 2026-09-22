# Learning Japanese

A fully offline desktop app for learning Japanese Hiragana & Katakana.
No account, no internet after the first run,
and all your progress stays on this device.

## Run it

1. **Install Node.js** (once) — free from https://nodejs.org. Check it works:
   ```powershell
   node -v
   ```
2. **Run the programme** — double-click `Learning Japanese.vbs` (recommended,
   no console window) or `start.bat`. **The first launch installs everything
   it needs** (the Electron runtime) automatically and then opens the app. No
   Japanese voice, language pack, or anything else needs installing.

That's it. After the one-time setup the app runs fully offline.

## Requirements

- **Windows, macOS, or Linux**
- **Node.js** (version 16 or newer) — only used to fetch the runtime on first
  launch. Everything else is installed automatically when you run the programme.

## Terminal use (optional)

```powershell
npm start
```

(If you launch from a terminal for the very first time, run `npm install` once
in this folder first — the double-click launchers do this automatically.)

## Japanese pronunciation (bundled, offline)

Pronunciations are **bundled with the app** as small audio clips, so sound works
with **no setup** — no language pack, no voice download, no OS settings. Each
kana is spoken on chart taps, in the detail pop-up, and throughout the quiz.

If a clip is ever missing, the app quietly falls back to whatever Japanese
text-to-speech voice the operating system provides.

## Build a distributable .exe (Windows, optional)

If you want to hand someone a standalone installer instead of making them run
the steps above:

```powershell
npm install --save-dev electron-builder
npx electron-builder --win
```

Output lands in the `dist/` folder.

## Features

- **Quiz** — Automatic (chooses characters based on your progress, adds more as
  you advance) and Manual (pick scripts/groups yourself).
- **Kana chart** — complete Hiragana, Katakana, yōon and extended katakana
  tables; tap a character for the reading + pronunciation (bundled offline
  audio clips, no install steps).
- **Statistics** — per-character accuracy history kept on this device.
- **Settings** — theme (light/dark), accent color, Japanese font, session
  length, quiz direction. All data lives locally; nothing is uploaded anywhere.

## Layout

```
src/index.html     app shell (boot splash)
src/splash.html    launcher splash screen
src/styles.css     styling
src/kana-data.js   kana data
src/stroke-paths.js  stroke order data
src/audio/         bundled pronunciation clips (one WAV per kana)
src/audio-map.js   kana → clip filename map
src/app.js         quiz engine, chart, statistics, settings
main.js            Electron main process (splash + main window)
start.bat          Windows launcher — auto-installs Electron on first run
Learning Japanese.vbs  Windows double-click launcher (no console window), auto-installs Electron on first run
```

Offline educational tool for personal kana practice.