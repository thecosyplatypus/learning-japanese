# Play Store listing — Learning Japanese

Everything below is paste-ready for the Play Console. Content is accurate for
v0.7.4 (versionCode 11), which ships with no ads, no accounts, and no network.

## App details

**App name** (30 char limit)
```
Learning Japanese
```

**Short description** (80 char limit)
```
Offline kana and kanji trainer: 2500 kanji, quizzes, stroke order, progress.
```

**Full description** (4000 char limit)
```
Learning Japanese is an offline study app for memorizing hiragana, katakana and
kanji - the three writing systems used in Japanese.

Everything is bundled in the app, so it works with no internet connection at
all. No account, no ads, no tracking.

WHAT YOU CAN PRACTISE
- Hiragana: all 104 characters, in order or by group
- Katakana: all 125 characters, in order or by group
- Kanji: 2500 characters with on-yomi, kun-yomi, meanings and stroke counts
- 229 pronunciation clips for every kana and kana reading

LEARN AND REVISE
- Study charts for every script, with a reference grid and per-character detail
- Stroke order diagrams for kanji
- Readings, meanings and stroke counts for every kanji

QUIZ YOURSELF
- Build a quiz from the stages you want: single kana groups, kanji ranges, or
  your own custom groups
- Automatic mode picks the characters you know least and drifts toward
  unfamiliar ones as you improve
- Manual mode lets you choose exactly what to be tested on
- Answer by recognition or by typing the romaji
- Wrong answers are collected into a weak list to drill later

FOLLOW YOUR PROGRESS
- Per-character correct and incorrect counts
- Accuracy overview per script
- Mastery levels from new to learned
- Session history, so you can see how much you have improved

DESIGNED TO BE READABLE
- Light and dark themes
- Several accent colours and Japanese typefaces
- Works on phones, tablets and foldables
- Respects your system's dark mode setting

PRIVACY
The app collects nothing. It requests no Android permissions, has no analytics
and no advertising SDK, and makes no network requests. Your progress is stored
only on your device and is deleted when you uninstall the app.

The bundled kanji data is derived from KANJIDIC2, published by the Electronic
Dictionary Research and Development Group (EDRDG), licensed under CC BY-SA 4.0.
```

**Privacy policy URL**
```
https://thecosyplatypus.github.io/learning-japanese/
```

## Category and contact

| Field | Value |
|---|---|
| App or game | App |
| Category | Education |
| Tags | Japanese, Kanji, Kana, Flashcards, Offline |
| Content rating | Everyone |
| Contains ads | **No** |
| In-app purchases | **No** |
| App access | All functionality is available without special access. No login required. |
| Government app | No |
| Financial features | None |

## Data safety (all questions answered "No data collected")

| Question | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **No** | No analytics, ads, crash reporting or accounts |
| Is all of the user data collected by your app encrypted in transit? | N/A | Nothing is transmitted |
| Do you provide a way for users to request that their data is deleted? | N/A | No data is collected; uninstalling removes everything |

Nothing is collected or shared, so the form requires no data types, no
purposes, no retention periods and no third-party SDK declarations. There is no
`AD_ID` (advertising ID) permission, and no `INTERNET` permission at all.

## Target audience and content

- Target age group: **13+** (also suitable for younger learners; no ads or purchases)
- Appeals to children: **No** ads, no purchases, no external links
- No mature content, no user interaction, no location sharing, no digital purchases
- Contains user-generated content: No
- Shares location: No
- Available in other languages: No (English UI)

## Release notes — v0.7.4 (400 char limit)

```
Back button now behaves properly throughout the app: it closes dialogs first,
then moves between screens, and only exits from the home screen.
Kanji and their readings are now centred in their chart tiles.
Tablet and foldable layouts scale properly, including rotation and split-screen.
Removed the unused internet permission. Smaller download, fully offline.
```

## Upload checklist

- [x] AAB signed with the release key (v2 scheme; DN `CN=thecosyplatypus, OU=Learning Japanese`)
- [x] `versionCode 11` / `versionName 0.7.4`
- [x] `compileSdk 36` / `targetSdk 36` / `minSdk 24`
- [x] No permissions declared (verified in the merged AAB manifest)
- [x] `webContentsDebuggingEnabled` off in the release build
- [ ] 512x512 24-bit PNG icon — `play-assets/play-icon-512.png`
- [ ] 1024x500 feature graphic — `play-assets/feature-graphic-1024x500.png`
- [ ] Phone screenshots (min 2, 9:16, 24-bit RGB) — `play-assets/01..06`
- [ ] 7-inch tablet screenshots (optional) — `play-assets/07..08`
- [ ] 10-inch tablet screenshots (optional) — `play-assets/09..10`
- [ ] Privacy policy live at the URL above
- [ ] Upload the AAB to a closed test track first
