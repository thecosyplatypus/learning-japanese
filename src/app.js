'use strict';

/* ============================================================
   Learning Japanese – renderer app
   All state lives in localStorage; works fully offline.
   ============================================================ */

const { KANA, allCharacters, totalCount } = window.KanaData;
if (window.KanjiData) KANA.kanji = window.KanjiData.KANA_SCRIPT;   // 'kanji' script, KANA-compatible

/* Romanize any kana string for plain-English pronunciation (nichi, hi, -bi, -ka).
   Used for kanji readings so learners can say them without knowing kana. */
const ROMA = (() => {
  const map = new Map();
  for (const script of ['hiragana', 'katakana']) {
    for (const g of KANA[script].groups) for (const row of g.rows) for (const c of row) {
      if (!map.has(c.k)) map.set(c.k, c.r);
    }
  }
  const keys = [...map.keys()].sort((a, b) => b.length - a.length);
  const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);
  return (s) => {
    if (!s) return '';
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '.' || ch === '-' || ch === '/') { out += ch; continue; }
      if (ch === 'っ' || ch === 'ッ') {
        const nxt = s[i + 1];
        const rn = nxt ? map.get(nxt) : null;
        out += rn ? (rn[0] === 'c' && rn.startsWith('ch') ? 't' + rn : rn[0] + rn) : 't';
        i += rn ? 1 : 0;   // doubled form already includes the next kana's sound
        continue;
      }
      if (ch === 'ー') {
        let v = '';
        for (let j = out.length - 1; j >= 0; j--) { if (VOWELS.has(out[j])) { v = out[j]; break; } }
        out += v || '';
        continue;
      }
      const hit = keys.find(k => s.startsWith(k, i));
      if (hit) { out += map.get(hit); i += hit.length - 1; continue; }
      out += ch;
    }
    return out;
  };
})();
const romanize = (s) => ROMA(s);
const dispReading = (ch) => (ch.script === 'kanji' ? ROMA(ch.romaji) : ch.romaji);
const charToSpeech = (ch) => (ch.script === 'kanji' ? (ch.romaji || ch.char) : ch.char);   // say the reading for kanji, not the glyph
window.romanizeJp = ROMA;   // console/debug + tests

const LS_KEYS = {
  settings: 'kana_settings_v1',
  stats: 'kana_stats_v1',
  custom: 'kana_custom_v1',
  quiz: 'kana_quiz_v1'
};

const DEFAULT_SETTINGS = {
  theme: 'light',
  accent: 'red',
  font: 'noto-sans-jp',
  questionCount: 10,   // (kept for compatibility; the length is set by quizChars)
  direction: 'romaji-to-kana',
  quizChars: 10,       // characters per round — 10, 20 or 30
  quizThrough: 3,      // times each character is quizzed — 1, 2 or 3
  autoNext: false,
  speakOnQuestion: true,
  penSize: 8           // drawing pen width in px — remembered between sessions
};

function orderedScriptChars(script) {
  const out = [];
  for (const g of KANA[script].groups) {
    for (const row of g.rows) {
      for (const c of row) out.push({ script, char: c.k, romaji: c.r, group: g.name });
    }
  }
  return out;
}

function buildStages() {
  const stages = [];
  let id = 1;
  // Hiragana first, then Katakana: 1–10, 11–20, 21–30, … on and on;
  // kanji come last in common-frequency buckets of 100 (1–100, 101–200, …).
  const sizeOf = { hiragana: 10, katakana: 10, kanji: 100 };
  const baseOf = { hiragana: 'Hiragana', katakana: 'Katakana', kanji: 'Kanji' };
  for (const script of ['hiragana', 'katakana', 'kanji']) {
    const chars = orderedScriptChars(script);
    const step = sizeOf[script] || 10;
    for (let i = 0; i < chars.length; i += step) {
      const start = i + 1;
      const end = Math.min(chars.length, i + step);
      stages.push({ id: id++, label: `${baseOf[script]} ${start}–${end}`, name: `${baseOf[script]} · characters ${start}–${end}`, script, chars: chars.slice(i, i + step) });
    }
  }
  return stages;
}

const STAGES = buildStages();   // e.g. Hiragana 1–10, Hiragana 11–20, …, Katakana …

const ROUND_SIZE = 10;        // characters per quiz (in selection order)
const REPEATS = 3;            // times each character is quizzed per test

const state = {
  settings: loadOrDefault(LS_KEYS.settings, DEFAULT_SETTINGS),
  stats: loadOrDefault(LS_KEYS.stats, { byChar: {}, sessions: [] }),
  custom: loadOrDefault(LS_KEYS.custom, []),
  quiz: loadOrDefault(LS_KEYS.quiz, {
    mode: 'auto',
    scripts: { hiragana: true, katakana: true, kanji: true },
    groups: [],            // manual selection, group keys (legacy whole-script)
    rows: [],              // manual selection, fine-grained rows "script|group|rowIdx"
    customGroups: [],      // indices into state.custom
    stages: [1, 2],        // enabled stages for auto mode
    chunkStart: 0,         // where the next ordered 10-quiz starts in the pool
    customMode: false
  }),
  route: 'home',
  quizSession: null
};

if (state.settings.direction === 'both') { state.settings.direction = 'romaji-to-kana'; saveSettings(); }

/* ---------------- persistence helpers ---------------- */
function loadOrDefault(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return JSON.parse(JSON.stringify(fallback));
    return { ...JSON.parse(JSON.stringify(fallback)), ...JSON.parse(raw) };
  } catch { return JSON.parse(JSON.stringify(fallback)); }
}
function save(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch {} }
function saveSettings() { save(LS_KEYS.settings, state.settings); }
function saveStats() { save(LS_KEYS.stats, state.stats); }
function saveQuiz() { save(LS_KEYS.quiz, state.quiz); }
function saveCustom() { save(LS_KEYS.custom, state.custom); }

/* ---------------- DOM helpers ---------------- */
const content = document.getElementById('content');
const toastEl = document.getElementById('toast');
let toastTimer;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function h() { return document.getElementById('content'); }
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
}

/* ---------------- router ---------------- */
const routes = {
  home: renderHome,
  stats: renderStats,
  chart: renderChart,
  settings: renderSettings
};

/* ---------- session history (the Android back gesture) ----------
   The router used to ignore the session history entirely, so the WebView had
   nothing to go back to: pressing back on Stats, Settings, the chart or the
   detail popup quit the app outright. Every navigation now pushes an entry and
   popstate unwinds it.

   The detail popup deliberately does NOT get its own entry. Pushing a sentinel
   on open and popping it on close races history.back() against pushState() and
   loses steps. Instead, back with the popup open consumes one entry and puts an
   equivalent one straight back, so the depth is unchanged and the route holds.

   Depth is tracked in a counter rather than read from history.length, which is a
   high-water mark: it counts every entry ever pushed and never shrinks, so on
   the home screen it would still read 2 and Android would keep intercepting back
   instead of letting the app close. Each entry also carries its own depth so a
   pop can restore the count from the entry it landed on. */

let backDepth = 0;

function pushHistory(entry) {
  const next = Object.assign({}, entry, { ljDepth: backDepth + 1 });
  try { history.pushState(next, ''); } catch (e) { /* history unavailable */ return; }
  backDepth = next.ljDepth;
  syncBackDepth();
}
function goBack() {
  try { history.back(); } catch (e) { /* nothing to go back to */ }
}

/* MainActivity can't use WebView.canGoBack() to decide whether the back gesture
   belongs to the page: that only reports *document* navigations, so it stays
   false for the entries the router pushes here. The page therefore publishes its
   own depth, and Android enables the back callback only while it is non-zero. */
function syncBackDepth() {
  const host = window.LJBack;
  if (!host) return;
  try { host.setDepth(backDepth); } catch (e) { /* bridge gone */ }
}

function navigate(route, extra, fromPop) {
  state.route = route;
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  routes[route](extra);
  content.scrollTop = 0;
  if (fromPop) return;
  pushHistory({ ljRoute: route });
}

window.addEventListener('popstate', (e) => {
  const st = e.state || {};

  /* restore the depth from the entry we landed on before anything else */
  backDepth = typeof st.ljDepth === 'number' ? st.ljDepth : 0;
  syncBackDepth();

  /* the detail popup is modal: back closes it and must not change route. The
     entry just consumed is replaced with an equivalent one so the net depth and
     the route are unchanged. */
  if (document.querySelector('.modal-overlay')) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    backDepth = Math.max(0, backDepth);
    pushHistory({ ljRoute: state.route });
    return;
  }

  /* back fell off the quiz entry: end the round and show the home screen */
  if (state.quizSession && !st.ljQuiz) state.quizSession = null;

  const r = st.ljRoute;
  if (r && routes[r]) navigate(r, undefined, true);
  else if (state.route !== 'home') navigate('home', undefined, true);
});

/* ---------------- theme/font boot ---------------- */
function syncSystemBars() {
  const cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;   // Electron build has no status bar
  const bar = cap.Plugins && cap.Plugins.StatusBar;
  if (!bar) return;
  bar.setStyle({ style: state.settings.theme === 'dark' ? 'DARK' : 'LIGHT' });
}

function applyStylePrefs() {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.dataset.accent = state.settings.accent;
  const f = {
    'noto-sans-jp': "'Noto Sans JP', 'Yu Gothic UI', Meiryo, sans-serif",
    'noto-serif-jp': "'Yu Mincho', 'Hiragino Mincho ProN', serif",
    'zen-maru-gothic': "'Yu Gothic UI', 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif"
  };
  document.documentElement.style.setProperty('--font-jp', f[state.settings.font] || f['noto-sans-jp']);
  syncSystemBars();
}
document.body.classList.add('booting');
applyStylePrefs();

/* ---------------- nav wiring ---------------- */
const sidebar = document.getElementById('sidebar');
const NARROW = 720;

document.querySelectorAll('[data-route]').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(a.dataset.route);
  });
});
document.getElementById('menu-toggle').addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});
document.querySelectorAll('.sidebar .nav-item').forEach(a => {
  a.addEventListener('click', () => {
    if (window.innerWidth <= NARROW) sidebar.classList.add('collapsed');
  });
});

/* The sidebar is a permanent 216px column on wide screens and an overlay on
   narrow ones. Collapse state is only ever set here, so without this a session
   that used a phone-sized window (or a rotation, a fold, or a move to
   split-screen) would leave the tablet/foldable layout stuck with a hidden
   sidebar. Re-apply the mode whenever the width crosses the breakpoint. */
let wasNarrow = window.innerWidth <= NARROW;
if (wasNarrow) sidebar.classList.add('collapsed');
window.addEventListener('resize', () => {
  const isNarrow = window.innerWidth <= NARROW;
  if (isNarrow === wasNarrow) return;
  wasNarrow = isNarrow;
  sidebar.classList.toggle('collapsed', isNarrow);
});

/* ============================================================
   HOME / QUIZ SETUP
   ============================================================ */
function masteryFor(script) {
  let learned = 0, total = 0;
  for (const g of KANA[script].groups) {
    for (const row of g.rows) {
      for (const c of row) {
        total++;
        const s = state.stats.byChar[`${script}|${c.k}`];
        if (s && s.wrong === 0 && s.answers >= 4) learned++;
      }
    }
  }
  return { learned, total, pct: total ? Math.round(learned / total * 100) : 0 };
}

function renderHome() {
  const root = h();
  root.innerHTML = '';

  const h1 = el('h1', '', 'Learning Japanese');
  const sub = el('p', 'sub', 'Learning Japanese is a quiz-style learning tool for memorizing kana characters — the two syllabic writing systems used in Japanese: Hiragana and Katakana.');
  root.append(h1, sub);

  /* --- select characters --- */
  const card = el('div', 'card');
  const title = el('h2', '', 'Select characters');
  const desc = el('p', 'muted tiny', 'Automatic chooses characters to study based on your progress. Manual lets you pick specific rows of characters — for example just か き く け こ.');
  const tabs = el('div', 'tabs');
  const tAuto = el('button', 'tab' + (state.quiz.mode === 'auto' ? ' active' : ''), 'Automatic');
  const tManual = el('button', 'tab' + (state.quiz.mode === 'manual' ? ' active' : ''), 'Manual');
  tAuto.addEventListener('click', () => { state.quiz.mode = 'auto'; saveQuiz(); renderHome(); });
  tManual.addEventListener('click', () => { state.quiz.mode = 'manual'; saveQuiz(); renderHome(); });
  tabs.append(tAuto, tManual);
  card.append(title, desc, tabs);
  root.append(card);

  /* script panels */
  const selCard = el('div', 'card');
  selCard.append(el('h2', '', 'Select characters'));

  for (const [script, label] of [['hiragana', 'Hiragana'], ['katakana', 'Katakana'], ['kanji', 'Kanji']]) {
    const m = masteryFor(script);
    const panel = el('div', 'script-panel');
    const jp = el('span', 'jp-name', label === 'Hiragana' ? 'ひらがな' : label === 'Katakana' ? 'カタカナ' : '漢字');
    const pct = el('span', 'pct', m.pct + '%');
    const bar = el('div', 'progress');
    const fill = el('div');
    fill.style.width = m.pct + '%';
    bar.append(fill);
    const disableLabel = el('span', 'muted tiny');
    panel.append(jp, bar, pct, disableLabel);

    if (state.quiz.mode === 'auto') {
      // auto mode: just a disable toggle
      const tog = makeToggle(state.quiz.scripts[script], (on) => { state.quiz.scripts[script] = on; saveQuiz(); updatePanel(disableLabel, tog, m); });
      disableLabel.append(tog);
    } else {
      panel.addEventListener('click', (e) => {
        if (e.target.closest('.toggle')) return;
        toggleScriptManual(script);
      });
      const scriptOn = state.quiz.groups.includes(script) || state.quiz.rows.some(k => k.startsWith(script + '|'));
      panel.style.opacity = scriptOn ? '1' : '.5';
    }
    selCard.append(panel);
    function updatePanel(disableLabel, tog, m) {
      disableLabel.innerHTML = '';
      disableLabel.append(tog);
    }

    if (state.quiz.mode === 'manual') {
      const picker = el('div', 'row-picker');
      KANA[script].groups.forEach(g => {
        if (script === 'kanji') {
          const keys = g.rows.map((_, ri) => script + '|' + g.key + '|' + ri);
          const on = keys.some(k => state.quiz.rows.includes(k));
          const chip = el('span', 'stage-chip' + (on ? ' selected' : ''), g.name.replace(/^Common\s*/, ''));
          chip.title = g.name + ' · ' + g.rows.flat()[0].k + ' … ' + g.rows.flat()[g.rows.flat().length - 1].k;
          chip.addEventListener('click', () => {
            const allOn = keys.every(k => state.quiz.rows.includes(k));
            state.quiz.rows = state.quiz.rows.filter(k => !k.startsWith(script + '|' + g.key + '|'));
            if (!allOn) state.quiz.rows.push(...keys);
            saveQuiz(); renderHome();
          });
          picker.append(chip);
          return;
        }
        picker.append(el('span', 'group-label', g.name));
        g.rows.forEach((row, ri) => {
          const key = script + '|' + g.key + '|' + ri;
          const chip = el('span', 'stage-chip' + (state.quiz.rows.includes(key) ? ' selected' : ''), rowLabel(row));
          chip.title = 'Click to ' + (state.quiz.rows.includes(key) ? 'remove' : 'add') + ' · readings: ' + row.map(c => c.r).join(' ');
          chip.addEventListener('click', () => toggleRow(key));
          picker.append(chip);
        });
      });
      selCard.append(picker);
    }
  }

  /* custom groups */
  const addCustom = el('button', 'btn ghost small', '+ Add Custom Group');
  addCustom.addEventListener('click', openCustomGroupModal);
  selCard.append(addCustom);
  if (state.custom.length) {
    state.custom.forEach((grp, i) => {
      const p = el('div', 'script-panel');
      const name = el('span', 'jp-name', grp.name);
      const cnt = el('span', 'muted tiny', grp.chars.length + ' characters');
      const mana = el('span', 'spacer');
      const del = el('button', 'btn danger small', 'Remove');
      del.addEventListener('click', (e) => { e.stopPropagation(); state.custom.splice(i, 1); saveCustom(); saveQuiz(); renderHome(); });
      p.append(name, cnt, mana, del);
      if (state.quiz.mode === 'manual') {
        p.addEventListener('click', () => {
          const idx = state.quiz.customGroups.indexOf(i);
          if (idx >= 0) state.quiz.customGroups.splice(idx, 1);
          else state.quiz.customGroups.push(i);
          saveQuiz(); renderHome();
        });
        p.style.opacity = state.quiz.customGroups.includes(i) ? '1' : '.5';
      }
      selCard.append(p);
    });
  }
  root.append(selCard);

  /* --- stages --- */
  const stageCard = el('div', 'card');
  stageCard.append(el('h2', '', 'Select stage'));
  stageCard.append(el('p', 'muted tiny', 'Choose which stages are enabled.'));
  const countLine = el('div', 'row', );
  const selCount = el('span', 'muted', state.quiz.stages.length + ' selected');
  const all = el('button', 'btn small', 'All');
  const none = el('button', 'btn small', 'None');
  const spacer = el('span', 'spacer');
  countLine.append(selCount, spacer, all, none);
  all.addEventListener('click', () => { state.quiz.stages = STAGES.map(s => s.id); state.quiz.chunkStart = 0; saveQuiz(); renderHome(); });
  none.addEventListener('click', () => { state.quiz.stages = []; state.quiz.chunkStart = 0; saveQuiz(); renderHome(); });
  stageCard.append(countLine);

  const chips = el('div', 'row', '');
  chips.style.marginTop = '12px';
  STAGES.forEach(s => {
    const chip = el('span', 'stage-chip' + (state.quiz.stages.includes(s.id) ? ' selected' : ''), s.label);
    chip.addEventListener('click', () => {
      const i = state.quiz.stages.indexOf(s.id);
      if (i >= 0) state.quiz.stages.splice(i, 1);
      else state.quiz.stages.push(s.id);
      state.quiz.stages.sort((a, b) => a - b);
      state.quiz.chunkStart = 0;   // changing stages restarts from the beginning
      saveQuiz(); renderHome();
    });
    chips.append(chip);
  });
  stageCard.append(chips);
  root.append(stageCard);

  /* --- start --- */
  const start = el('button', 'btn primary', 'Start');
  start.style.width = '100%';
  start.addEventListener('click', startQuiz);
  root.append(start);

  const pick = activeCharacterPool();
  if (!pick.length) {
    start.disabled = true;
    start.textContent = 'Choose at least one stage or group to continue';
  }
}

function makeToggle(on, change) {
  const lab = document.createElement('label');
  lab.className = 'toggle';
  const inp = document.createElement('input');
  inp.type = 'checkbox';
  inp.checked = on;
  const track = el('span', 'track');
  const thumb = el('span', 'thumb');
  lab.append(inp, track, thumb);
  inp.addEventListener('change', () => change(inp.checked, lab));
  return lab;
}

function toggleScriptManual(script) {
  const allKeys = allRowKeys(script);
  const on = allKeys.filter(k => state.quiz.rows.includes(k)).length;
  const turnOn = on === 0;
  state.quiz.rows = state.quiz.rows.filter(k => !k.startsWith(script + '|'));
  if (turnOn) state.quiz.rows.push(...allKeys);
  saveQuiz(); renderHome();
}

function toggleRow(key) {
  const i = state.quiz.rows.indexOf(key);
  if (i >= 0) state.quiz.rows.splice(i, 1);
  else state.quiz.rows.push(key);
  saveQuiz(); renderHome();
}

function allRowKeys(script) {
  const keys = [];
  const s = KANA[script];
  if (!s) return keys;
  s.groups.forEach(g => g.rows.forEach((_, ri) => keys.push(script + '|' + g.key + '|' + ri)));
  return keys;
}

function rowLabel(row) {
  return row.map(c => c.k).join(' ');
}

/* --- custom group modal --- */
function openCustomGroupModal() {
  const overlay = el('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,.35);display:grid;place-items:center;';
  const box = el('div', 'card');
  box.style.cssText = 'width:min(520px,92vw);margin:0;';
  box.append(el('h2', '', 'Add custom group'));
  box.append(el('p', 'muted tiny', 'Each line: kana=romaji, for example あ=a'));

  const name = document.createElement('input');
  name.placeholder = 'Group name (e.g. My words)';
  box.append(name);
  const ta = document.createElement('textarea');
  ta.placeholder = 'あ=a\nい=i\nか=ka';
  ta.style.cssText = 'width:100%;min-height:140px;margin-top:10px;font-family:monospace;font-size:14px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--panel);color:var(--text);';
  box.append(ta);

  const row = el('div', 'row');
  const cancel = el('button', 'btn', 'Cancel');
  const ok = el('button', 'btn primary', 'Add');
  const spacer = el('span', 'spacer');
  row.append(spacer, cancel, ok);
  box.append(row);

  cancel.addEventListener('click', () => overlay.remove());
  ok.addEventListener('click', () => {
    const lines = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
    const chars = [];
    for (const line of lines) {
      const m = line.match(/^(\S+)=(\S+)$/);
      if (!m) { toast('Skip line: ' + line); continue; }
      chars.push({ k: m[1], r: m[2].toLowerCase() });
    }
    if (!chars.length) { toast('Nothing valid to add'); return; }
    state.custom.push({ name: name.value.trim() || 'Custom group', chars });
    saveCustom();
    state.quiz.customGroups.push(state.custom.length - 1);
    saveQuiz();
    overlay.remove();
    renderHome();
    toast('Custom group added');
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
  name.focus();
}

/* ============================================================
   CHARACTER POOL & QUIZ ENGINE
   ============================================================ */
function activeCharacterPool() {
  const out = [];
  if (state.quiz.mode === 'auto') {
    for (const id of state.quiz.stages) {
      const s = STAGES.find(x => x.id === id);
      if (!s) continue;
      out.push(...s.chars);
    }
  } else {
    const rows = state.quiz.rows || [];
    if (rows.length) {
      for (const key of rows) {
        const parts = key.split('|');
        const g = KANA[parts[0]] && KANA[parts[0]].groups.find(x => x.key === parts[1]);
        if (!g) continue;
        const row = g.rows[parseInt(parts[2], 10)];
        if (!row) continue;
        for (const c of row) out.push({ script: parts[0], char: c.k, romaji: c.r, group: g.name });
      }
    } else {
      for (const sc of state.quiz.groups) {
        if (KANA[sc]) for (const g of KANA[sc].groups) out.push(...allCharacters([sc], [g]));
      }
    }
    for (const gi of state.quiz.customGroups) {
      const grp = state.custom[gi];
      if (grp) for (const c of grp.chars) out.push({ script: 'custom', char: c.k, romaji: c.r, group: grp.name });
    }
  }
  // dedupe
  const seen = new Set(), uniq = [];
  for (const c of out) {
    const key = c.script + '|' + c.char;
    if (!seen.has(key)) { seen.add(key); uniq.push(c); }
  }
  return uniq;
}

function masteryScore(char) {
  const s = state.stats.byChar[char.script + '|' + char.char];
  if (!s || !s.answers) return 0;
  const acc = s.correct / s.answers;
  return s.wrong === 0 ? 1 : 0.6; // have-answered vs perfect
}

function buildDistractors(pool, correct) {
  const others = shuffle(pool.filter(c => !(c.script === correct.script && c.char === correct.char)));
  return others.slice(0, Math.min(3, others.length));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startQuiz() {
  const pool = activeCharacterPool();
  if (!pool.length) { toast('No characters selected'); return; }
  const size = Math.min(state.settings.quizChars || ROUND_SIZE, pool.length);

  // work through the pool IN ORDER, 10 at a time: first quiz = chars 1-10,
  // next = 11-20, and so on. The pointer persists so you continue where you
  // left off; when the whole pool is done it wraps back to the start.
  let start = state.quiz.chunkStart || 0;
  if (start >= pool.length) start = 0;
  const chunk = shuffle(pool.slice(start, start + size));   // randomise the order within this 10
  const end = start + chunk.length;

  // each character in the chunk is quizzed REPEATS times (spaced out, not
  // back-to-back): e.g. 10 chars x 3 = 30 questions per test
  const repeated = [];
  for (let r = 0; r < (state.settings.quizThrough || REPEATS); r++) {
    for (const c of chunk) {
      const showRomaji = state.settings.direction === 'romaji-to-kana' || (state.settings.direction === 'both' && Math.random() < 0.5);
      repeated.push({ char: c, showRomaji });
    }
  }
  let questions = shuffle(repeated);
  for (let i = 1; i < questions.length; i++) {
    if (questions[i].char.char === questions[i - 1].char.char) {
      for (let j = i + 1; j < questions.length; j++) {
        if (questions[j].char.char !== questions[i - 1].char.char && questions[j].char.char !== questions[i].char.char) {
          [questions[i], questions[j]] = [questions[j], questions[i]];
          break;
        }
      }
    }
  }

  state.quizSession = { questions, index: 0, correct: 0, wrong: 0, total: questions.length, poolLength: pool.length, chunkStart: start, chunkEnd: end, chunkFinished: end >= pool.length };
  pushHistory({ ljQuiz: true });   /* so back leaves the quiz instead of the app */
  renderQuiz();
}

function renderQuiz() {
  const s = state.quizSession;
  const root = h();
  root.innerHTML = '';
  if (!s) return navigate('home');

  const top = el('div', 'quiz-top');
  const quit = el('button', 'btn small', '← Quit');
  quit.addEventListener('click', () => { const s2 = state.quizSession; if (s2 && s2.index > 0 && s2.answersEntered) finishQuiz(); else { state.quizSession = null; goBack(); } });
  const rangeLabel = s.poolLength
    ? ` · chars ${s.chunkStart + 1}–${s.chunkEnd} of ${s.poolLength}`
    : '';
  const title = el('span', '', `Quiz · ${s.index + 1}/${s.total}${rangeLabel}`);
  top.append(quit, title);
  root.append(top);

  const q = s.questions[s.index];
  const card = el('div', 'quiz-card');
  const isKanji = q.char.script === 'kanji';
  const qn = el('div', 'prompt-label', q.showRomaji
    ? (isKanji ? 'Choose the kanji for' : 'Choose the kana for')
    : (isKanji ? 'What reading is this?' : 'What is this kana?'));
  /* speech follows the QUIZ DIRECTION, so it only ever talks when the kana is
     shown as part of the reading→kana quiz (kana = answer → pronouncing it is
     the point of that question). On the kana→reading quiz the kana is the
     QUESTION, so no 🔊 button and no auto-speak — talking would reveal it. */
  const speak = q.showRomaji ? el('button', 'speak-btn', '🔊 Hear') : null;
  if (speak) {
    speak.setAttribute('aria-label', 'Pronounce this character');
    speak.addEventListener('click', () => speakChar(charToSpeech(q.char)));
  }
  const promptHead = el('div', 'quiz-prompt');
  promptHead.append(qn);
  if (speak) promptHead.append(speak);
  card.append(promptHead);
  if (q.showRomaji && state.settings.speakOnQuestion) setTimeout(() => speakChar(charToSpeech(q.char)), 260);


  const pool = activeCharacterPool();
  let correctOpt, allOpts;
  if (q.showRomaji) {
    card.append(el('div', 'prompt-romaji', dispReading(q.char)));
    const dist = buildDistractors(pool, q.char).map(d => d.char);
    correctOpt = q.char.char;
    allOpts = shuffle([correctOpt, ...dist]);
  } else {
    card.append(el('div', 'prompt-char' + (q.char.char.length > 1 ? ' small' : ''), q.char.char));
    const dist = buildDistractors(pool, q.char).map(d => dispReading(d));
    correctOpt = dispReading(q.char);
    allOpts = shuffle([correctOpt, ...dist]);
  }

  const options = el('div', 'options');
  let answered = false;
  for (const opt of allOpts) {
    const b = el('button', 'option' + (q.showRomaji ? '' : ' romaji'), opt);
    b.addEventListener('click', () => answer(b, opt === correctOpt));
    options.append(b);
  }
  card.append(options);
  root.append(card);

  const meta = el('div', 'quiz-meta');
  meta.innerHTML = `<span>Correct <b class="m">0</b></span><span>Wrong <b class="w">0</b></span><span><b class="acc">0%</b> accuracy</span>`;
  card.append(meta);

  function answer(btn, isCorrect) {
    if (answered) return;
    answered = true;
    recordAnswer(q.char, isCorrect);
    if (isCorrect) s.correct++; else s.wrong++;
    s.answersEntered = (s.answersEntered || 0) + 1;
    updateMeta();
    s.lastWasCorrect = isCorrect;

    s.questions.forEach(x => options.querySelectorAll('button').forEach(b => b.disabled = true));
    options.querySelectorAll('button').forEach(b => {
      const val = b.textContent;
      if (val === correctOpt) b.classList.add('correct');
      else b.classList.add('wrong');
    });
    if (btn.textContent !== correctOpt) btn.classList.add('wrong');

    const note = el('div', 'reveal-note');
    if (isCorrect) note.textContent = 'Correct! ' + q.char.char + ' is "' + dispReading(q.char) + '".';
    else note.textContent = `Oops! ${q.showRomaji ? q.char.char : '"' + dispReading(q.char) + '"'} is "${q.showRomaji ? dispReading(q.char) : q.char.char}".`;
    note.append(' ');
    const replay = el('button', 'speak-btn', '🔊 Hear it');
    replay.style.padding = '4px 12px';
    replay.addEventListener('click', () => speakChar(charToSpeech(q.char)));
    note.append(replay);
    card.append(note);
    setTimeout(() => speakChar(charToSpeech(q.char)), 380);

    if (state.settings.autoNext) {
      setTimeout(next, 750);
    } else {
      const nextBtn = el('button', 'btn primary next-pill', s.index + 1 >= s.total ? 'See results' : 'Next');
      nextBtn.addEventListener('click', next);
      root.append(nextBtn);
    }
  }

  function updateMeta() {
    meta.innerHTML = `<span>Correct <b class="m">${s.correct}</b></span><span>Wrong <b class="w">${s.wrong}</b></span><span><b class="acc">${Math.round(indexedAccuracy())}%</b> accuracy</span>`;
  }
  function indexedAccuracy() {
    const done = Math.max(1, s.correct + s.wrong);
    return s.correct / done * 100;
  }

  function recordAnswer(char, correct) {
    const key = char.script + '|' + char.char;
    const st = state.stats.byChar[key] || { answers: 0, correct: 0, wrong: 0, last: null, history: [] };
    st.answers++;
    if (correct) st.correct++; else st.wrong++;
    st.last = correct;
    st.history = (st.history || []).concat(correct ? 1 : 0).slice(-50);
    state.stats.byChar[key] = st;
    saveStats();
  }

  function next() {
    s.index++;
    if (s.index >= s.total) { finishQuiz(); }
    else renderQuiz();
  }
}

function finishQuiz() {
  const s = state.quizSession;
  const root = h();
  root.innerHTML = '';
  const acc = s.total ? Math.round(s.correct / s.total * 100) : 0;
  const done = (s.index + 1) >= s.total;   // answered every question in the chunk
  const card = el('div', 'quiz-card');
  const stars = acc >= 90 ? '★★★★★' : acc >= 75 ? '★★★★' : acc >= 60 ? '★★★' : acc >= 40 ? '★★' : '★';
  card.append(el('div', 'stars', stars));
  card.append(el('div', 'result-num', acc + '%'));
  card.append(el('p', 'sub', `You answered ${s.correct} of ${s.total} questions correctly.`));
  if (!done) {
    card.append(el('p', 'muted tiny', `Not finished — next quiz covers characters ${s.chunkStart + 1}–${s.chunkEnd} again.`));
  } else if (s.chunkFinished) {
    card.append(el('p', 'muted tiny', `That was the last chunk — you covered all ${s.poolLength} characters. Next quiz starts over at 1.`));
  } else {
    card.append(el('p', 'muted tiny', `Next quiz continues at character ${s.chunkEnd + 1}.`));
  }
  const row = el('div', 'row');
  row.style.justifyContent = 'center';
  const again = el('button', 'btn primary', !done ? 'Practice this 10 again' : (s.chunkFinished ? 'Start again from 1' : 'Next 10 characters'));
  const home = el('button', 'btn', 'Back to home');
  row.append(again, home);
  card.append(row);
  root.append(card);

  again.addEventListener('click', () => startQuiz());
  home.addEventListener('click', () => { state.quizSession = null; goBack(); });

  // advance the persistent pointer only when the whole chunk was answered:
  // next quiz takes the following 10 in order
  if (done) {
    if (s.chunkFinished) state.quiz.chunkStart = 0;
    else state.quiz.chunkStart = s.chunkEnd;
    saveQuiz();
  }

  state.stats.sessions.push({ date: Date.now(), correct: s.correct, total: s.total });
  saveStats();
}

/* ============================================================
   KANA CHART
   ============================================================ */
function renderChart(initialScript) {
  const root = h();
  root.innerHTML = '';
  const isKanji = initialScript === 'kanji';
  root.append(el('h1', '', isKanji ? 'Kanji chart' : 'Kana chart'));
  root.append(el('p', 'sub', isKanji
    ? 'The 2500 most common kanji, top to bottom by frequency. Tap a character to see readings, meaning and stroke order.'
    : 'Select a character from the kana table to hear its pronunciation and view stroke order.'));

  const tabs = el('div', 'tabs chart-tabs');
  const scripts = ['hiragana', 'katakana', 'kanji'];
  scripts.forEach((sc, i) => {
    const t = el('button', 'tab' + (sc === (initialScript || 'hiragana') ? ' active' : ''), KANA[sc].name);
    t.addEventListener('click', () => renderChart(sc));
    tabs.append(t);
  });
  root.append(tabs);

  const active = ['hiragana', 'katakana', 'kanji'].includes(initialScript) ? initialScript : 'hiragana';
  state.chartScript = active;
  for (const g of KANA[active].groups) {
    const group = el('div', 'chart-group');
    group.append(el('h3', '', g.name));
    for (const row of g.rows) {
      const r = el('div', 'chart-grid-row');
      for (const c of row) {
        const cell = el('div', 'kana-cell');
        cell.append(el('div', 'k', c.k));
        if (isKanji) cell.classList.add('kanji');
        cell.append(el('div', 'r', isKanji ? romanize(c.r) : c.r));
        cell.addEventListener('click', () => showDetail(c, active));
        r.append(cell);
      }
      group.append(r);
    }
    root.append(group);
  }

  if (!isKanji) {
    const special = el('div', 'card');
    special.append(el('h2', '', 'Special characters'));
    const list = el('div', 'special-list');
    [
      ['ー', '「ー」 stretches the vowel before it. Type the vowel twice, for example コーヒー is typed "koohii".'],
      ['っ/ッ', '「っ / ッ」 doubles the next consonant. Type that consonant twice, for example がっこう is typed "gakkou", カップ is "kappu".']
    ].forEach(([k, txt]) => {
      const item = el('div', 'special-item');
      item.append(el('span', 'k', k));
      item.append(el('span', 'muted tiny', txt));
      list.append(item);
    });
    special.append(list);
    root.append(special);
  }
}

function showDetail(c, script) {
  const root = h();
  state._detailScroll = root.scrollTop; /* remember where we were before the wipe */
  root.innerHTML = '';

  /* dim backdrop + centred popup */
  const overlay = el('div', 'modal-overlay');
  const pop = el('div', 'modal detail-popup');
  const head = el('div', 'detail-head');
  head.append(el('span', 'muted tiny', (KANA[script]?.name || 'Custom') + ' · look at it, then write it below.'));
  const closeB = el('button', 'icon-btn', '✕');
  closeB.setAttribute('aria-label', 'Close');
  closeB.addEventListener('click', closeDetail);

  /* “Next → ” — hop to the following kana in the same chart order (wraps around) */
  const kanaFlat = (s) => (KANA[s]?.groups || []).flatMap((gr) => gr.rows.flat());
  const nextList = kanaFlat(script);
  const nextId = nextList.indexOf(c);
  if (nextList.length > 1) {
    const nextBtn = el('button', 'icon-btn', '→');
    nextBtn.setAttribute('aria-label', 'Next character');
    nextBtn.addEventListener('click', () => {
      closeDetail();
      showDetail(nextList[(nextId + 1) % nextList.length], script);
    });
    head.append(nextBtn);
  }
  head.append(closeB);
  pop.append(head);

  /* reference box — the character, shown like on the chart */
  const refStage = el('div', 'detail-stage');
  const refCap = el('div', 'detail-caption', 'Copy this');
  const ref = el('canvas');
  ref.width = 260; ref.height = 260;
  ref.className = 'write-canvas';
  refStage.append(refCap, ref);
  pop.append(refStage);

  /* drawing box — character drawn here */
  const drawStage = el('div', 'detail-stage side-anchored');
  const drawCap = el('div', 'detail-caption', 'Draw it here');
  const drawWrap = el('div', 'draw-wrap');
  const guide = el('canvas');
  guide.width = 260; guide.height = 260;
  guide.className = 'draw-guide';
  const draw = el('canvas');
  draw.width = 260; draw.height = 260;
  draw.className = 'draw-canvas';
  drawWrap.append(guide, draw);

  /* flanking chevrons on the draw box — previous/next character (same chart order, wraps) */
  const chev = (dir) => {
    const b = el('button', 'side-arrow ' + dir);
    b.setAttribute('aria-label', dir === 'prev' ? 'Previous character' : 'Next character');
    const d = dir === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7';
    b.innerHTML = '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.addEventListener('click', () => {
      closeDetail();
      showDetail(nextList[(nextId + (dir === 'prev' ? nextList.length - 1 : 1)) % nextList.length], script);
    });
    return b;
  };

  drawStage.append(drawCap, chev('prev'), drawWrap, chev('next'));
  pop.append(drawStage);

  /* render the static reference glyph once */
  (() => {
    const ctx = ref.getContext('2d');
    const color = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#222';
    ctx.font = '700 ' + fitGlyphFont(ref.width, c.k, 0.8) + 'px ' + jpFontStackCss();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(c.k, ref.width / 2, ref.height / 2 + ref.height * 0.02);
  })();

  /* faint traceable outline on the drawing box — toggle it with the Trace button */
  (() => {
    const ctx = guide.getContext('2d');
    ctx.font = '700 ' + fitGlyphFont(guide.width, c.k, 0.8) + 'px ' + jpFontStackCss();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#222';
    ctx.lineWidth = guide.width * 0.028;
    ctx.strokeText(c.k, guide.width / 2, guide.height / 2 + guide.height * 0.02);
  })();

  let traceOn = true;
  const traceBtn = el('button', 'btn', 'Trace: on');
  traceBtn.addEventListener('click', () => {
    guide.style.display = guide.style.display === 'none' ? '' : 'none';
    traceBtn.textContent = guide.style.display === 'none' ? 'Trace: off' : 'Trace: on';
  });

  /* freehand drawing: ink follows the pointer */
  let clearDraw = null;
  let penSize = typeof state.settings.penSize === 'number' ? state.settings.penSize : Math.max(3, draw.width * 0.035);
  let setPenSize = null;
  (() => {
    const ctx = draw.getContext('2d', { willReadFrequently: true });
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = penSize;
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#d9534f';
    let ink = false;
    const pos = (e) => {
      const r = draw.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (draw.width / r.width), y: (e.clientY - r.top) * (draw.height / r.height) };
    };
    draw.addEventListener('pointerdown', (e) => {
      ink = true;
      try { draw.setPointerCapture(e.pointerId); } catch (_) {}
      const p = pos(e);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    draw.addEventListener('pointermove', (e) => {
      if (!ink) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    const lift = () => { ink = false; };
    draw.addEventListener('pointerup', lift);
    draw.addEventListener('pointercancel', lift);
    clearDraw = () => ctx.clearRect(0, 0, draw.width, draw.height);
    setPenSize = (w) => { penSize = w; ctx.lineWidth = w; };
  })();

  const meta = el('div', 'detail-meta');
  const kanji = (script === 'kanji' && window.KanjiData) ? window.KanjiData.BY_CHAR[c.k] : null;
  if (kanji) {
    meta.append(el('h1', '', romanize(kanji.r || c.r)));
    const chips = el('div', 'detail-readings');
    const add = (label, arr, cls) => {
      if (!arr || !arr.length) return;
      chips.append(el('span', 'muted tiny', label + ' '));
      arr.forEach(x => {
        const ch = el('span', 'detail-chip ' + cls, romanize(x));
        ch.title = x;
        chips.append(ch);
      });
    };
    add('On', kanji.on, 'on');
    add('Kun', kanji.kun, 'kun');
    if (chips.children.length) meta.append(chips);
    if (kanji.m) meta.append(el('p', 'muted tiny', kanji.m));
    if (kanji.st) meta.append(el('p', 'muted tiny', Math.round(kanji.st) + ' strokes'));
  } else {
    meta.append(el('h1', '', c.r));
  }
  meta.append(el('p', 'muted tiny', 'Study the character, then write it in the box below.'));
  pop.append(meta);

  const bar = el('div', 'row center detail-actions');
  /* pen width stepper — make ink bigger or smaller */
  const penControl = () => {
    const wrap = el('div', 'pen-size-wrap');
    const group = el('div', 'pen-size');
    const shrink = el('button', 'btn pen-btn', '−');
    const val = el('span', 'pen-val', String(Math.round(penSize)));
    const grow = el('button', 'btn pen-btn', '+');
    const apply = (w) => { const n = Math.max(2, Math.min(40, w)); setPenSize(n); val.textContent = String(Math.round(n)); state.settings.penSize = n; saveSettings(); };
    shrink.addEventListener('click', () => apply(penSize - 2));
    grow.addEventListener('click', () => apply(penSize + 2));
    group.append(shrink, val, grow);
    wrap.append(group, el('p', 'muted tiny', 'Pen size'));
    return wrap;
  };
  const clearBtn = el('button', 'btn', 'Clear drawing');
  clearBtn.addEventListener('click', () => { if (clearDraw) clearDraw(); });
  const speak = el('button', 'speak-btn');
  speak.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 10v4h3l4 4V6l-4 4H4zm11 1a3 3 0 0 0 0-6m0 12a5.5 5.5 0 0 0 0-11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Speak';
  speak.addEventListener('click', () => speakChar(script === 'kanji' ? c.r : c.k));
  bar.append(penControl(), clearBtn, traceBtn, speak);
  pop.append(bar);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDetail(); });
  document.addEventListener('keydown', onEsc, { once: true });
  function onEsc(e) { if (e.key === 'Escape') closeDetail(); }
  overlay.append(pop);
  root.append(overlay);

  setTimeout(() => speakChar(script === 'kanji' ? c.r : c.k), 160);   // announce the reading once

function closeDetail() {
  overlay.remove();
  document.removeEventListener('keydown', onEsc);
  document.body.classList.remove('modal-open');
  /* opening the detail wiped #content, so bring the chart back — and keep our place */
  const keep = state._detailScroll || 0;
  renderChart(state.chartScript);
  h().scrollTop = keep;
  state._detailScroll = 0;
}
}

let _write = { raf: 0, off: null };

/* ---------- stroke-order vector engine ----------
   Each hiragana/katakana glyph maps to an ordered list of strokes.
   A stroke is a polyline of [x, y] points in a NORMALISED 0..100 space
   (100x100 grid, y grows downward). Strokes are drawn one at a time, in
   筆順 order, as a moving pen-head sweeping each polyline — the honest,
   offline equivalent of the site's stroke animation (real path data we
   authored ourselves, licensed data not copied). */
const STROKES = loadStrokeData();

function loadStrokeData() {
  const map = {};
  if (typeof STROKE_PATHS !== 'undefined' && STROKE_PATHS && typeof STROKE_PATHS === 'object') {
    for (const [k, strokes] of Object.entries(STROKE_PATHS)) {
      if (strokes && Array.isArray(strokes)) {
        map[k] = strokes.filter(s => s && Array.isArray(s) && s.length >= 2)
                        .map(s => s.map(p => [Math.max(0, Math.min(100, +p[0])), Math.max(0, Math.min(100, +p[1]))]));
      }
    }
  }
  return map;
}

function strokeVectorsFor(charText) {
  if (!charText) return null;
  const s = STROKES[charText];
  return (s && s.length) ? s : null;
}

function drawStrokeVectors(charText, done) {
  const cv = document.querySelector('.write-canvas');
  if (!cv) { if (done) done(); return; }
  cancelWrite();
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;

  /* stem + stroke reveal colour-scheme-aware */
  const color = getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#d9534f';
  const stem  = getComputedStyle(document.body).getPropertyValue('--border').trim() || 'rgba(0,0,0,.15)';

  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, W * 0.045);

  const strokes = strokeVectorsFor(charText) || [];
  if (!strokes.length) { if (done) done(); return; }

  /* render each glyph through a small delay chain so strokes *add*, in order */
  let si = 0, seg = 0, t = 0, prevX = null, prevY = null;
  const dur = 1400 / Math.min(4, strokes.length);   /* total ~1.4s regardless of count */
  let start = performance.now();

  function frame(now) {
    if (!document.querySelector('.write-canvas')) return;
    if (si >= strokes.length) { if (done) done(); return; }
    const st = strokes[si];
    const total = st.length;
    const prog = Math.min(1, Math.max(0, (now - start) / dur)) + seg / (total + 2);
    const pos = Math.min(1, prog * (total + 1));
    const idx = Math.min(total - 1, Math.floor(pos));
    const fx = st[idx][0] / 100 * W, fy = st[idx][1] / 100 * H;

    if (idx !== seg) { seg = idx; }
    /* draw from previous point to current along the polyline */
    if (prevX != null) {
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(fx, fy); ctx.stroke();
    }
    prevX = fx; prevY = fy;

    /* pen head */
    ctx.save();
    ctx.strokeStyle = stem; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(fx, fy, Math.max(4, W * 0.03), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    if (prog >= 1) { si += 1; seg = 0; t = 0; prevX = prevY = null; start = now; }
    _write.raf = requestAnimationFrame(frame);
  }
  _write.raf = requestAnimationFrame(frame);
}
function cancelWrite() { if (_write.raf) { cancelAnimationFrame(_write.raf); _write.raf = 0; } }
function animateWrite(charText, done) {
  const cv = _write && document.querySelector('.write-canvas');
  if (!cv) { if (done) done(); return; }
  cancelWrite();
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;

  /* draw from the REAL stroke vectors (STROKE_PATHS), stroke by stroke in
     筆順 order — each stroke is its own pen-down stroke in the canonical
     order, not a camera sweep. Full glyphs consume `strokeVectorsFor`; a
     glyph with no authored vectors yet falls back to the glyph-reveal so
     the popup is never silently blank. */
  const vectors = strokeVectorsFor(charText) || [];
  if (!vectors.length) {
    /* fallback: classic glyph reveal (fonts can render the glyph offline) */
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.font = '700 ' + fitGlyphFont(W, charText, 0.82) + 'px ' + jpFontStackCss();
    octx.textAlign = 'center'; octx.textBaseline = 'middle';
    octx.fillStyle = '#4a7c59';
    octx.fillText(charText, W / 2, H / 2);
    _write.off = off;
    /* simple reveal */
    let t = 0;
    function frame() {
      if (!document.querySelector('.write-canvas')) return;
      t = Math.min(1, t + 0.03);
      ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H * t); ctx.clip();
      ctx.drawImage(_write.off, 0, 0); ctx.restore();
      if (t < 1) requestAnimationFrame(frame); else if (done) done();
    }
    requestAnimationFrame(frame);
    return;
  }
  /* vector path rendering (筆順, stroke by stroke, via REAL STROKE_PATHS) */
  const color = getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#d9534f';
  let si = 0, seg = 0, vt = 0, prevX = null, prevY = null;
  let start = performance.now();
  const totalSteps = vectors.reduce((n, s) => n + s.length, 0);
  const stepDur = 900 / Math.max(1, totalSteps);
  function vecFrame(now) {
    if (!document.querySelector('.write-canvas')) return;
    vt = Math.min(1, Math.max(0, (now - start) / stepDur));
    const stroke = vectors[si];
    const total = stroke.length;
    const prog = Math.min(1, vt + seg / (total + 2));
    const idx = Math.min(total - 1, Math.floor(prog * (total + 1)));
    const fx = stroke[idx][0] / 100 * W, fy = stroke[idx][1] / 100 * H;
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(3, W * 0.045);
    if (prevX != null) { ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(fx, fy); ctx.stroke(); }
    prevX = fx; prevY = fy;
    if (idx !== seg) { seg = idx; }
    if (prog >= 1) {
      if (si < vectors.length - 1) { si++; seg = 0; vt = 0; prevX = prevY = null; start = now; }
      else { if (done) done(); return; }
    }
    requestAnimationFrame(vecFrame);
  }
  requestAnimationFrame(vecFrame);
}

function jpFontStackCss() { return getComputedStyle(document.body).getPropertyValue('--font-jp') || 'sans-serif'; }

function fitGlyphFont(canvasWidth, text, ratio) {
  const n = [...text].length;   // character count (Yōon/Extended compounds are 2+ kana)
  const base = (ratio || 0.8) * canvasWidth;
  if (n <= 1) return Math.round(base);          // single kana: keep the large size
  return Math.floor((canvasWidth * 0.92) / n);  // multi-kana: shrink so the whole word fits
}

let _audio = null;

/* Play a multi-kana string (e.g. a kanji reading "ニチ") by chaining the
   bundled per-kana clips, longest match first so digraphs (キョ) stay intact.
   Returns false when no clips matched (silent marks like ー/っ are skipped). */
function speakChain(text) {
  if (typeof AudioMap === 'undefined' || !text) return false;
  const keys = Object.keys(AudioMap).sort((a, b) => b.length - a.length);
  const files = [];
  for (let i = 0; i < text.length;) {
    const hit = keys.find(k => text.startsWith(k, i));
    if (hit) { files.push(AudioMap[hit]); i += hit.length; } else i++;
  }
  if (!files.length) return false;
  if (_audio) { _audio.pause(); _audio.onended = null; _audio = null; }
  let idx = 0;
  const next = () => {
    if (idx >= files.length) { _audio = null; return; }
    _audio = new Audio('audio/' + files[idx++]);
    _audio.volume = 1;
    _audio.onended = () => next();
    const p = _audio.play();
    if (p && p.catch) p.catch(() => { next(); });
  };
  next();
  return true;
}

function speakChar(text) {
  // 1) prefer the bundled pronunciation clips (fully offline, no OS voice needed)
  const file = (typeof AudioMap !== 'undefined') ? AudioMap[text] : null;
  if (file || (typeof AudioMap !== 'undefined' && speakChain(text))) {
    if (file) {
      try {
        if (_audio) { _audio.pause(); _audio = null; }
        _audio = new Audio('audio/' + file);
        _audio.volume = 1;
        const p = _audio.play();
        if (p && p.catch) p.catch(() => {});
        return;
      } catch { /* fall through to OS speech */ }
    }
    return;
  }
  // 2) fallback: OS text-to-speech (only used when a clip isn't bundled)
  try {
    if (!('speechSynthesis' in window)) { toast('Speech not available on this device'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.9;
    // Prefer a Japanese voice, but don't give up when the voice list isn't
    // populated yet — the engine picks a suitable voice for the lang tag.
    const all = speechSynthesis.getVoices();
    const v = all.find(vv => vv.lang && vv.lang.replace('_', '-').toLowerCase().startsWith('ja')) ||
              all.find(vv => vv.lang && /ja|jpn/i.test(vv.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch { toast('Speech not available'); }
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};

/* ============================================================
   STATISTICS
   ============================================================ */
function renderStats() {
  const root = h();
  root.innerHTML = '';
  root.append(el('h1', '', 'Statistics'));

  const { byChar, sessions } = state.stats;
  const entries = Object.entries(byChar);
  const tally = entries.reduce((a, [k, s]) => ({ a: a.a + s.answers, c: a.c + s.correct, w: a.w + s.wrong }), { a: 0, c: 0, w: 0 });

  const grid = el('div', 'stat-grid');
  const mk = (num, label) => {
    const c = el('div', 'stat-card');
    c.append(el('div', 'stat-num', String(num)));
    c.append(el('div', 'stat-label', label));
    return c;
  };
  grid.append(
    mk(tally.a || '—', 'Total answers'),
    mk(tally.a ? Math.round(tally.c / tally.a * 100) + '%' : '—', 'Accuracy'),
    mk(sessions.length, 'Sessions'),
    mk(sessions.length ? Math.round(sessions.reduce((n, s) => n + s.correct, 0) / Math.max(1, sessions.reduce((n, s) => n + s.total, 0)) * 100) + '%' : '—', 'Correct / asked')
  );
  root.append(grid);

  const failCard = el('div', 'card');
  failCard.append(el('h2', '', 'Most failed characters'));
  const failed = entries
    .map(([key, s]) => { const [sc, ch] = key.split('|'); return { key, char: ch, script: sc, wrong: s.wrong, correct: s.correct }; })
    .filter(x => x.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 10);

  if (!failed.length) {
    failCard.append(el('p', 'muted', 'No failures on my records, you\u2019re doing great!'));
  } else {
    const max = failed[0].wrong;
    for (const f of failed) {
      const row = el('div', 'fail-row');
      row.append(el('span', 'fail-char', f.char));
      row.append(el('span', 'fail-romaji', rFor(f.key) || ''));
      const wrap = el('div', 'fail-bar-wrap');
      const bar = el('div', 'fail-bar');
      bar.style.width = Math.max(4, Math.round(f.wrong / max * 100)) + '%';
      wrap.append(bar);
      row.append(wrap);
      row.append(el('span', 'fail-count', String(f.wrong)));
      failCard.append(row);
    }
  }
  root.append(failCard);

  const focusCard = el('div', 'card');
  focusCard.append(el('h2', '', 'Stage focus'));
  focusCard.append(el('p', 'muted tiny', 'Breakdown by quiz stage (10 characters each) — the characters in red are what needs practice.'));
  for (const st of STAGES) {
    const block = el('div', 'stage-block');
    const head = el('div', 'stage-head');
    head.append(el('span', 'stage-label', st.label));

    let answers = 0, correct = 0;
    const picked = new Map();
    for (const ch of st.chars) {
      const k = st.script + '|' + ch.char;
      const d = byChar[k];
      picked.set(ch.char, d || null);
      if (d) { answers += d.answers; correct += d.correct; }
    }

    if (!answers) {
      head.append(el('span', 'stage-meta muted', 'no data yet'));
      block.append(head);
      focusCard.append(block);
      continue;
    }

    const acc = Math.round(correct / answers * 100);
    const accWrap = el('div', 'stage-acc');
    const accBar = el('div', 'stage-acc-bar');
    accBar.style.width = acc + '%';
    accBar.style.background = acc >= 80 ? 'var(--good)' : 'var(--bad)';
    accWrap.append(accBar);
    head.append(accWrap);
    head.append(el('span', 'stage-meta', `${acc}% · ${answers} ${answers === 1 ? 'answer' : 'answers'}`));
    block.append(head);

    const weak = st.chars
      .map(ch => ({ ch, d: picked.get(ch.char) }))
      .filter(x => x.d && x.d.wrong > 0)
      .sort((a, b) => b.d.wrong - a.d.wrong || a.d.correct / Math.max(1, a.d.answers) - b.d.correct / Math.max(1, b.d.answers));

    if (weak.length) {
      const wrap = el('div', 'weak-row');
      for (const w of weak) {
        const chip = el('span', 'weak-chip');
        chip.append(el('span', 'weak-char', w.ch.char));
        chip.append(el('span', 'weak-romaji', w.ch.romaji));
        chip.append(el('span', 'weak-x', '×' + w.d.wrong));
        wrap.append(chip);
      }
      block.append(wrap);
    } else {
      block.append(el('p', 'muted tiny', 'All correct — nice!'));
    }
    focusCard.append(block);
  }
  root.append(focusCard);

  const reset = el('button', 'btn danger', 'Reset all statistics');
  reset.addEventListener('click', () => {
    if (confirm('Reset all statistics? This cannot be undone.')) {
      state.stats = { byChar: {}, sessions: [] };
      saveStats(); renderStats(); toast('Statistics cleared');
    }
  });
  const resetWrap = el('div', 'row');
  resetWrap.append(reset);
  root.append(resetWrap);

  function rFor(key) {
    const [sc, ch] = key.split('|');
    if (sc === 'custom') { for (const g of state.custom) { const f = g.chars.find(x => x.k === ch); if (f) return f.r; } return ''; }
    for (const g of KANA[sc].groups) for (const row of g.rows) { const f = row.find(x => x.k === ch); if (f) return f.r; }
    return '';
  }
}

/* ============================================================
   SETTINGS
   ============================================================ */
function renderSettings() {
  const root = h();
  root.innerHTML = '';
  root.append(el('h1', '', 'Settings'));

  const card = el('div', 'card');
  const rows = [];

  rows.push(settingRow('Theme', 'Dark mode', makeToggle(state.settings.theme === 'dark', (on) => {
    state.settings.theme = on ? 'dark' : 'light';
    saveSettings(); applyStylePrefs();
  })));

  const accentWrap = el('div', 'accent-list');
  const accents = { red: '#d9534f', green: '#2b8a5a', amber: '#d68b1f', blue: '#5b6ad9' };
  for (const [key, color] of Object.entries(accents)) {
    const d = el('span', 'accent-dot' + (state.settings.accent === key ? ' active' : ''));
    d.style.background = color;
    d.title = key;
    d.addEventListener('click', () => {
      state.settings.accent = key;
      saveSettings(); applyStylePrefs(); renderSettings();
    });
    accentWrap.append(d);
  }
  const accentRow = el('div', 'setting-row');
  accentRow.append(el('span', '', 'Accent color'));
  accentRow.append(accentWrap);
  rows.push(accentRow);

  const fontSel = document.createElement('select');
  [['noto-sans-jp', 'Sans-serif (default)'], ['noto-serif-jp', 'Serif'], ['zen-maru-gothic', 'Rounded']].forEach(([v, l]) => {
    const o = document.createElement('option'); o.value = v; o.textContent = l;
    if (state.settings.font === v) o.selected = true;
    fontSel.append(o);
  });
  fontSel.addEventListener('change', () => { state.settings.font = fontSel.value; saveSettings(); applyStylePrefs(); });
  const fontRow = el('div', 'setting-row'); fontRow.append(el('span', '', 'Japanese font'), fontSel); rows.push(fontRow);

  const quizCharsSel = document.createElement('select');
  [10, 20, 30].forEach((n) => { const o = document.createElement('option'); o.value = String(n); o.textContent = n + ' characters'; if (state.settings.quizChars === n) o.selected = true; quizCharsSel.append(o); });
  quizCharsSel.addEventListener('change', () => { state.settings.quizChars = Number(quizCharsSel.value); saveSettings(); });
  rows.push(settingRow('Quiz length', '10, 20 or 30 characters at a time, in order — each quiz continues where the last one left off.', quizCharsSel));

  const quizThroughSel = document.createElement('select');
  [1, 2, 3].forEach((n) => { const o = document.createElement('option'); o.value = String(n); o.textContent = n === 1 ? 'Once' : n + ' times'; if (state.settings.quizThrough === n) o.selected = true; quizThroughSel.append(o); });
  quizThroughSel.addEventListener('change', () => { state.settings.quizThrough = Number(quizThroughSel.value); saveSettings(); });
  rows.push(settingRow('Times through', 'How many times each character is quizzed — 1, 2 or 3.', quizThroughSel));

  const dsel = document.createElement('select');
  [['both', 'Both directions'], ['kana-to-romaji', 'Kana → reading'], ['romaji-to-kana', 'Reading → kana']].forEach(([v, l]) => {
    const o = document.createElement('option'); o.value = v; o.textContent = l;
    if (state.settings.direction === v) o.selected = true;
    dsel.append(o);
  });
  dsel.addEventListener('change', () => { state.settings.direction = dsel.value; saveSettings(); });
  const dRow = el('div', 'setting-row'); dRow.append(el('span', '', 'Quiz direction'), dsel); rows.push(dRow);

  rows.push(settingRow('Auto-advance', 'Automatically go to the next question', makeToggle(state.settings.autoNext, (on) => {
    state.settings.autoNext = on; saveSettings();
  })));

  rows.push(settingRow('Auto-pronounce', 'Speak each character when a question is shown', makeToggle(state.settings.speakOnQuestion, (on) => {
    state.settings.speakOnQuestion = on; saveSettings();
  })));

  // font preview
  const preview = el('div', 'setting-row');
  const p = el('span', '');
  p.append(el('b', '', 'あア (') , el('span', 'muted', 'font preview'), el('b', '', ')'));
  preview.append(el('span', '', 'Preview'));
  preview.append(p);
  rows.push(preview);

  rows.forEach(r => card.append(r));
  root.append(card);

  /* data */
  const dataCard = el('div', 'card');
  dataCard.append(el('h2', '', 'Data'));
  const exportBtn = el('button', 'btn', 'Export data (JSON)');
  exportBtn.addEventListener('click', () => {
    const dump = {
      settings: state.settings,
      stats: state.stats, custom: state.custom, quiz: state.quiz
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'learning-japanese-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json,application/json';
  importInput.style.display = 'none';
  importInput.addEventListener('change', async () => {
    try {
      const txt = await importInput.files[0].text();
      const d = JSON.parse(txt);
      if (d.settings) { state.settings = { ...DEFAULT_SETTINGS, ...d.settings }; saveSettings(); applyStylePrefs(); }
      if (d.stats) { state.stats = d.stats; saveStats(); }
      if (d.custom) { state.custom = d.custom; saveCustom(); }
      if (d.quiz) { state.quiz = { ...state.quiz, ...d.quiz }; saveQuiz(); }
      toast('Data imported'); renderSettings();
    } catch { toast('Invalid backup file'); }
  });
  const importBtn = el('button', 'btn', 'Import data');
  importBtn.addEventListener('click', () => importInput.click());
  const wipeBtn = el('button', 'btn danger', 'Erase everything');
  wipeBtn.addEventListener('click', () => {
    if (confirm('Erase ALL local data and restore defaults?')) {
      Object.values(LS_KEYS).forEach(k => localStorage.removeItem(k));
      location.reload();
    }
  });
  const row = el('div', 'row');
  row.append(exportBtn, importBtn, importInput, el('span', 'spacer'), wipeBtn);
  dataCard.append(row);
  root.append(dataCard);
}

function settingRow(label, desc, control) {
  const row = el('div', 'setting-row');
  const l = el('div', '');
  l.append(el('div', 'label', label));
  l.append(el('div', 'desc', desc));
  row.append(l, control);
  return row;
}

/* ---------------- boot ---------------- */
function boot() {
  /* seed the root entry in place rather than pushing, so that pressing back
     on the home screen exits the app (WebView history is then length 1) */
  navigate('home', undefined, true);
  try { history.replaceState({ ljRoute: 'home', ljDepth: 0 }, ''); } catch (e) {}
  backDepth = 0;
  syncBackDepth();
  document.body.classList.remove('booting');
  setTimeout(() => document.getElementById('boot').remove(), 150);
}
boot();