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

## Japanese voice for pronunciation

The app plays character readings using your operating system's Japanese
text-to-speech voice. That voice is **not** bundled with this app — if
Japanese isn't installed on the OS, pronunciation in the kana chart will be
silent.

### Windows

1. Open **Settings → Time & language → Language & region**.
2. Click **Add a language**, search for **Japanese**, and install it.
3. Confirm a Japanese speech voice is present under
   **Settings → Time & language → Speech → Manage voices**. If the voice pack
   didn't come with the language, click **Add voices** and pick a Japanese one
   (for example *Microsoft Haruka* or *Nanami*).

Alternatively, install Japanese via PowerShell (run as admin):

```powershell
$langs = Get-WinUserLanguageList
$langs.Add("ja-JP")
Set-WinUserLanguageList $langs -Force
```

Restart the app afterwards.

### macOS

Japanese voices ship with macOS. If the chart has no sound:
**System Settings → Accessibility → Spoken Content → System Voice → Manage Voices**
and download a Japanese voice (e.g. *Kyoko* or *Otoya*).

### Linux

Install a Japanese text-to-speech engine your desktop can see, e.g. `espeak-ng`
with the `ja` voice:

```bash
sudo apt install espeak-ng
espeak-ng --voices | grep ja
```

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
  tables; tap a character for the reading + pronunciation (uses the OS
  Japanese text-to-speech voice, so it works fully offline).
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
src/app.js         quiz engine, chart, statistics, settings
main.js            Electron main process (splash + main window)
start.bat          Windows launch helper (runs Electron directly)
Learning Japanese.vbs  Windows double-click launcher, no console window
```

Offline educational tool for personal kana practice. Not affiliated with Kana Pro.