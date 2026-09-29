const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1100, height: 750, show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  const errors = [];
  win.webContents.on('console-message', (e, level, msg, line, src) => {
    if (level >= 2) errors.push(`${msg} (${src}:${line})`);
  });
  win.webContents.on('render-process-gone', (e, details) => {
    errors.push('RENDER PROCESS GONE: ' + JSON.stringify(details));
  });
  try {
    await win.loadFile(path.join(__dirname, 'src', 'index.html'));
    await new Promise(r => setTimeout(r, 2500));
    const result = await win.webContents.executeJavaScript(`(() => {
      const q = s => [...document.querySelectorAll('[data-route]')].find(a => a.dataset.route === s);
      const c = document.getElementById('content');
      const homeH1 = c.querySelector('h1') ? c.querySelector('h1').textContent : null;
      q('chart').click();
      const chartOk = !!document.querySelector('.kana-cell');
      const kanjiTab = [...document.querySelectorAll('.chart-tabs .tab')].find(t => t.textContent.trim() === 'Kanji');
      let kanji = null;
      if (kanjiTab) {
        kanjiTab.click();
        const cells = document.querySelectorAll('.kana-cell');
        const first = document.querySelector('.kana-cell');
        const firstEn = first ? first.querySelector('.en') : null;
        const firstR = first ? first.querySelector('.r') : null;
        let detail = null;
        if (first) {
          first.click();
          const pop = document.querySelector('.detail-popup');
          detail = pop ? {
            hasStage: !!pop.querySelector('.detail-stage'),
            onChips: [...pop.querySelectorAll('.detail-chip.on')].map(x => x.textContent),
            kunChips: [...pop.querySelectorAll('.detail-chip.kun')].map(x => x.textContent),
            meaning: pop.querySelector('.detail-meta p') ? pop.querySelector('.detail-meta p').textContent : null
          } : null;
          const closeBtn = [...pop.querySelectorAll('button')].find(b => b.textContent.trim() === 'Close');
          if (closeBtn) closeBtn.click();
        }
        kanji = { cells: cells.length, first: first ? first.querySelector('.k').textContent : null, firstR: firstR ? firstR.textContent : null, firstEn: firstEn ? firstEn.textContent : null, detail };
      }
      q('home').click();
      const startBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Start');
      let quizOk = false;
      if (startBtn && !startBtn.disabled) { startBtn.click(); quizOk = !!document.querySelector('.option'); }
      q('stats').click();
      const statsOk = !!document.querySelector('.stat-grid');
      q('settings').click();
      const settingsOk = !!document.querySelector('.accent-dot');
      return { homeH1, chartOk, kanji, quizOk, statsOk, settingsOk, bootRemoved: !document.getElementById('boot') };
    })()`);
    console.log('SMOKE RESULT:', JSON.stringify(result));
  } catch (err) {
    console.log('SMOKE EXEC ERROR:', err && err.message ? err.message : String(err));
  }
  console.log('PAGE ERRORS:', JSON.stringify(errors));
  app.exit(0);
});