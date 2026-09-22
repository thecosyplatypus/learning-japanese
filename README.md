# Learning Japanese

A fully offline desktop rebuild of Kana Pro (https://kana.pro) for learning
Japanese Hiragana & Katakana. Runs on Electron, needs no internet, no account,
and stores everything (profile, statistics, settings) locally.

## Required

- **Windows, macOS, or Linux**
- **Node.js** (version 16 or newer, includes `npm`) — download from
  https://nodejs.org if you don't have it. Check with:
  ```powershell
  node -v
  npm -v
  ```
- Internet is only needed once, to download Electron during `npm install`.
  After that the app runs fully offline.

## Setup & Run

### 1. Install dependencies (first time only)

Open a terminal in this folder and run:

```powershell
npm install
```

This downloads Electron into `node_modules/`. It may take a minute or two.

### 2. Start the app

```powershell
npm start
```

The app window should open. If it doesn't, make sure step 1 succeeded (you
should see a `node_modules` folder here).

### Alternative: start.bat / Learning Japanese.vbs (Windows)

Double-click `Learning Japanese.vbs` in this folder — it opens the app with a
splash loading screen and **no command-prompt window**. (Double-clicking
`start.bat` also works, with a tiny console flash at startup.)

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
start.bat          Windows launch helper (runs Electron directly)
Learning Japanese.vbs  Windows double-click launcher, no console window
```

Offline educational tool for personal kana practice. Not affiliated with Kana Pro.