# Learning Japanese

A fully offline app for learning Japanese Hiragana & Katakana, available as a
Windows/macOS/Linux desktop app and an Android `.apk`.
No account, no internet after the first run,
and all your progress stays on this device.

## Run it

Double-click `Learning Japanese.vbs` (recommended, no console window) or
`start.bat`. **The first launch installs everything it needs** — Node.js and
the Electron runtime — automatically, then opens the app. No Japanese voice,
language pack, or anything else needs installing.

That's it. After the one-time setup the app runs fully offline.

## Requirements

- **Windows, macOS, or Linux**
- **Internet connection** — needed once, for the automatic first-run setup.
  The app itself runs fully offline afterwards.

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

## Build an Android .apk

The same `src/` web app also runs on Android, wrapped in a native shell by
Capacitor. The Electron desktop build is completely unaffected.

```powershell
npm run android:apk
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.
Copy it to a phone and open it (you'll need to allow installs from your file
manager once). A copy is also left at the repo root as
`LearningJapanese-0.5.0-debug.apk`.

Other useful scripts:

| Script | What it does |
| --- | --- |
| `npm run android:apk` | Sync `src/` and build the debug APK |
| `npm run android:release` | Sync `src/` and build the **signed release APK** (see below) |
| `npm run android:aab` | Build a signed `.aab` bundle (for Google Play) |
| `npm run android:install` | Build and install onto a connected device/emulator |
| `npm run android:run` | Build, install and launch with live reload |
| `npm run android:open` | Open the native project in Android Studio |
| `npm run android:icons` | Regenerate the launcher icons from `icon.png` |
| `npm run android:sync` | Copy `src/` into the native project without building |

**Rebuilding from scratch** needs the Android SDK (platform 36 + build-tools 35
or newer) and a JDK 21, with the SDK path in `android/local.properties` or
`ANDROID_HOME`. Editing anything in `src/` means running `npm run android:apk`
again to copy your changes into the app — the native project does not watch the
`src/` folder. `icon.png` is the source for the launcher icon; after replacing
it, run `npm run android:icons` and rebuild.

### Release builds (signed APK)

The debug APK is signed with Android's public debug key, so Play Protect flags
it as untrusted. For people to install without that warning, build a release
APK signed with your own private key:

```powershell
npm run android:release
```

Output: `android/app/build/outputs/apk/release/app-release.apk`.

The signing key was created once with `keytool` and lives at
`android/keystores/learningjapanese-release.jks`, with the passwords in
`android/keystore.properties`. Both files are git-ignored on purpose — **back
them up and never lose them**: every future update must be signed with the
same key, or existing installs cannot be updated. (To recreate: run
`keytool -genkeypair -v -keystore android/keystores/learningjapanese-release.jks -storetype JKS -alias learningjapanese -keyalg RSA -keysize 2048 -validity 10000`.)

A release-signed APK stops the Play Protect / debug-signed install warning.
Two warnings signing does **not** remove (both are normal for any sideloaded
APK): the browser's "this file can harm your device" banner when downloading,
and the OS "install from unknown apps" permission prompt. Only publishing via
Google Play removes those.

For Google Play, use `npm run android:aab` (needs the `google-services.json`
setup and a Play Console account).

### Test on an emulator

```powershell
# once: create a virtual device (e.g. "android-36;google_apis;x86_64")
emulator -avd LearningJapaneseTest -no-snapshot -no-accel   # start it
npm run android:install                                     # build + install + launch
```

The debug APK opens Chrome's remote-debugging port (WebView). From there,
`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` (the pid is
found via `adb shell "cat /proc/net/unix | grep webview_devtools_remote"`) and
open `http://127.0.0.1:9222` in a desktop Chrome.

**Known limitation (WebView < 140):** Android devices whose WebView is older
than Chromium 140 get the system bars drawn as native padding rather than
letting the web page own the corners (Capacitor's built-in fallback). The app
still clears the status/navigation bars correctly, but in **dark mode** a light
sliver may show above the top bar on those older WebViews. Devices with an
up-to-date WebView (≥ 140) render edge-to-edge and are unaffected.

## Features

- **Quiz** — Automatic (chooses characters based on your progress, adds more as
  you advance) and Manual (pick scripts/groups yourself). Hiragana, Katakana
  and the 2000 most common kanji.
- **Kana chart** — complete Hiragana, Katakana, yōon and extended katakana
  tables; tap a character for the reading + pronunciation (bundled offline
  audio clips, no install steps).
- **Kanji chart** — the 2000 most common kanji by frequency, in 20 buckets of
  100. Tap a kanji for on/kun readings, English meaning and stroke count, and
  drill readings both directions in quizzes.
- **Statistics** — per-character accuracy history kept on this device.
- **Settings** — theme (light/dark), accent color, Japanese font, session
  length, quiz direction. All data lives locally; nothing is uploaded anywhere.

## Data & attribution

The kanji list, readings, meanings and metadata come from **KANJIDIC2**
(© Electronic Dictionary Research and Development Group, EDRDG)
<https://www.edrdg.org/kanjidic/kanjidic2.html>, licensed under
Creative Commons Attribution-ShareAlike 4.0
(<https://creativecommons.org/licenses/by-sa/4.0/>). The 2000 entries were
selected by the KANJIDIC2 frequency value (most frequent first); the quiz
"reading" for each kanji is its first on'yomi, or first kun'yomi if it has no
on'yomi.

## Layout

```
src/index.html     app shell (boot splash)
src/splash.html    launcher splash screen
src/styles.css     styling
src/kana-data.js   kana data
src/kanji-data.js  2000 most common kanji (KANJIDIC2, CC BY-SA 4.0)
src/stroke-paths.js  stroke order data
src/audio/         bundled pronunciation clips (one WAV per kana)
src/audio-map.js   kana → clip filename map
src/app.js         quiz engine, chart, statistics, settings
main.js            Electron main process (splash + main window)
setup.ps1          first-run installer (Node.js + Electron)
start.bat          Windows launcher — auto-installs Node.js + Electron on first run
Learning Japanese.vbs  Windows double-click launcher (no console window), same auto-setup
capacitor.config.json  Android build settings (wraps the same src/ folder)
android/           native Android project (Capacitor/Gradle)
make-android-icons.ps1  regenerates Android launcher icons from icon.png
```

Offline educational tool for personal kana practice.