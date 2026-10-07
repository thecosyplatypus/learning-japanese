'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1100, height: 750, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  const errors = [];
  win.webContents.on('console-message', (e, lvl, msg) => {
    const t = String(msg);
    if (/GPU|gpu|Security|CSP|Deprecat|UnhandledPromiseRejection|Content Security|render-process/i.test(t)) return;
    if (lvl >= 2) errors.push(t);
  });
  await win.loadFile(path.join(__dirname, 'src', 'index.html'));
  await new Promise(r => setTimeout(r, 1600));

  const result = await win.webContents.executeJavaScript(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const nav = s => [...document.querySelectorAll('[data-route]')].find(a => a.dataset.route === s);
    const btn = t => [...document.querySelectorAll('button')].find(b => b.textContent.replace(/\\s+/g, ' ').trim() === t);
    const root = document.getElementById('content');
    const out = {};

    /* start a quiz via auto mode default (hiragana+katakana, both, 10q) */
    nav('home').click(); await sleep(140);
    const start = btn('Start');
    out.startVisible = !!start;
    if (start) { start.click(); await sleep(200); }
    out.promptChar = !!(document.querySelector('.prompt-char') || document.querySelector('.prompt-romaji'));
    out.optionCount = document.querySelectorAll('.option').length;
    out.directionLabel = (document.querySelector('.quiz-meta') || {}).textContent || '';

    /* answer  photo first: click a wrong option, then next */
    const firstWrong = [...document.querySelectorAll('.option')].find(o => !o.classList.contains('correct') && !o.classList.contains('wrong'));
    if (firstWrong) { firstWrong.click(); await sleep(160); }
    out.feedbackShown = !!(document.querySelector('.option.correct, .option.wrong'));
    out.progressLabel = (document.querySelector('.quiz-progress') || {}).textContent || '';

    /* let it auto-advance (auto-next default off -> manual Next) */
    const next = btn('Next');
    out.nextVisible = !!next;
    if (next) { next.click(); await sleep(160); }
    out.correctNow = !!document.querySelector('.option.correct');

    /* quit mid-quiz: confirm via auto-next; use Quit button */
    const quit = btn('Quit');
    out.quitVisible = !!quit;

    /* stats persistence check - navigate to stats */
    document.querySelector('[data-route="stats"]').click(); await sleep(160);
    out.statGrid = !!document.querySelector('.stat-grid');
    out.hasSessionCount = /sessions/i.test(document.getElementById('content').textContent);

    return out;
  })()`);
  console.log('DEEP RESULT:', JSON.stringify(result));
  console.log('PAGE ERRORS:', JSON.stringify(errors));
  const ok = result.startVisible !== false && !(result.startVisible === true && !result.promptChar);
  app.exit(ok ? 0 : 1);
});