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
      q('home').click();
      const startBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Start');
      let quizOk = false;
      if (startBtn && !startBtn.disabled) { startBtn.click(); quizOk = !!document.querySelector('.option'); }
      q('stats').click();
      const statsOk = !!document.querySelector('.stat-grid');
      q('settings').click();
      const settingsOk = !!document.querySelector('.accent-dot');
      return { homeH1, chartOk, quizOk, statsOk, settingsOk, bootRemoved: !document.getElementById('boot') };
    })()`);
    console.log('SMOKE RESULT:', JSON.stringify(result));
  } catch (err) {
    console.log('SMOKE EXEC ERROR:', err && err.message ? err.message : String(err));
  }
  console.log('PAGE ERRORS:', JSON.stringify(errors));
  app.exit(0);
});