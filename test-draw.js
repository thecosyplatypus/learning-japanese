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

    /* go to chart and click Draw test tab */
    nav('chart').click(); await sleep(150);
    const drawTabBtn = [...document.querySelectorAll('.chart-tabs .tab')].find(t => t.textContent.trim() === 'Draw test');
    out.drawTestTabExists = !!drawTabBtn;
    if (drawTabBtn) { drawTabBtn.click(); await sleep(150); }

    /* Start the draw test */
    const start = btn('Start draw test');
    out.startVisible = !!start;
    if (start) { start.click(); await sleep(150); }

    /* verify drawing round UI: target character, canvas, check button */
    out.targetChar = document.querySelector('.draw-test-target .prompt-char')?.textContent || '';
    out.hasGuideCanvas = !!document.querySelector('.draw-guide');
    out.hasDrawCanvas = !!document.querySelector('.draw-canvas');
    out.checkButtonExists = !!btn('Check my drawing');

    /* GUARD 1: checking an empty canvas must not offer a way forward */
    const checkEmpty = btn('Check my drawing');
    if (checkEmpty) { checkEmpty.click(); await sleep(200); }
    const emptyText = (document.querySelector('.draw-score')?.textContent || '') + ' ' + (document.querySelector('.draw-feedback')?.textContent || '');
    out.emptyBlockedMsg = /nothing drawn/i.test(emptyText);
    out.emptyNoNextBtn = !btn('Next character') && !btn('See results');
    out.emptyCheckStillEnabled = !btn('Check my drawing')?.disabled;

    /* synthesize a simple drawing stroke on the user canvas */
    const drawCanvas = document.querySelector('.draw-canvas');
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d');
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--primary').trim() || 'currentColor';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(80, 180);
      ctx.lineTo(180, 80);
      ctx.stroke();
      /* also draw a second stroke */
      ctx.beginPath();
      ctx.moveTo(80, 80);
      ctx.lineTo(180, 180);
      ctx.stroke();
    }
    out.drewStroke = !!drawCanvas;

    /* click Check my drawing */
    const checkBtn = btn('Check my drawing');
    if (checkBtn) { checkBtn.click(); await sleep(200); }

    /* verify score appears */
    const scoreEl = document.querySelector('.draw-score');
    out.scoreText = scoreEl?.textContent || '';
    out.scoreIsNumeric = !!scoreEl?.textContent?.match(/\\d+%/);

    /* GUARD 2: auto-advance must be off in the draw test, even with the
       Auto-advance setting enabled. Wait past the old 1400ms timer. */
    const settings = JSON.parse(localStorage.getItem('kana_settings') || '{}');
    const prevAutoNext = settings.autoNext;
    settings.autoNext = true;
    localStorage.setItem('kana_settings', JSON.stringify(settings));
    const charBeforeWait = document.querySelector('.draw-test-target .prompt-char')?.textContent || '';
    await sleep(2600);
    out.noAutoAdvance = (document.querySelector('.draw-test-target .prompt-char')?.textContent || '') === charBeforeWait;
    settings.autoNext = prevAutoNext;
    localStorage.setItem('kana_settings', JSON.stringify(settings));

    /* click Next character (not See results since we only did 1 of 10) */
    const nextBtn = btn('Next character');
    out.nextButtonExists = !!nextBtn;
    if (nextBtn) { nextBtn.click(); await sleep(150); }

    /* verify next round loaded */
    out.nextRoundLoaded = document.querySelector('.draw-test-target .prompt-char')?.textContent !== out.targetChar;

    return out;
  })()`);
  console.log('DRAW TEST RESULT:', JSON.stringify(result));
  console.log('PAGE ERRORS:', JSON.stringify(errors));
  const ok = result.drawTestTabExists && result.startVisible && result.targetChar && result.drewStroke && result.checkButtonExists && result.scoreIsNumeric && result.nextButtonExists
    && result.emptyBlockedMsg && result.emptyNoNextBtn && result.emptyCheckStillEnabled && result.noAutoAdvance;
  app.exit(ok ? 0 : 1);
});