const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
const path = require('path');
const fam = require('path').join; // reserved
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1100, height: 850, webPreferences: { contextIsolation: false, nodeIntegration: false } });
  const errors = [];
  win.webContents.on('console-message', (e, l, m) => { if (m && /error|exception|is not defined|undefined is not/i.test(m)) errors.push(m); });
  win.webContents.on('render-process-gone', (e, d) => errors.push('RENDER GONE: ' + (d && d.reason)));
  await win.loadFile(fam(__dirname, 'src', 'index.html'));
  const res = await win.webContents.executeJavaScript(`(async () => {
    const out = {};
    const results = { errors: [] };
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    window.__errs = [];
    const oe = window.onerror; window.onerror = (msg) => { window.__errs.push(String(msg)); };
    const goto = async (r) => { const btn = document.querySelector('[data-route="' + r + '"]'); if (btn) btn.click(); await wait(300); };
    await goto('chart');
    out.chartCells = document.querySelectorAll('.kana-cell').length || (document.querySelectorAll('.char-cell,.glyph,.kana').length) || 0;
    const first = document.querySelector('.kana-cell, .char-cell, .glyph');
    if (first) { first.click(); }
    await wait(1400);
    out.overlay = !!document.querySelector('.modal-overlay, .modal-detail, .detail-popup, [class*="modal"]');
    out.canvas = !!document.querySelector('.write-canvas, canvas.write-canvas, .write-canvas');
    out.drawStage = !!document.querySelector('.detail-stage, .draw-stage, .write-visible');
    out.detailChar = !!document.querySelector('.detail-char, .detail-info h1, .detail-meta h1, .detail-h1');
    out.detailText = document.querySelector('.detail-info h1, .detail-meta h1, .detail-h1')?.textContent || document.querySelector('.detail-char')?.textContent || '';
    const sp = document.querySelector('.speak-btn, .detail-speak, .speakButton');
    out.speakBtn = !!sp;
    let spoke = false; try { if (typeof speakChar === 'function') { speakChar('あ'); spoke = true; } } catch (e) { window.__errs.push('speak:' + e); }
    out.speakFn = spoke;
    out.writeFn = typeof animateWrite === 'function';
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(esc);
    await wait(400);
    out.afterEscOverlay = !!document.querySelector('.modal-overlay');
    out.afterEscChart = !!document.querySelector('#content, .content').firstChild;
    out.windowErrors = window.__errs;
    window.onerror = oe;
    return out;
  })()`);
  console.log('POPUP RESULT:', JSON.stringify(res));
  console.log('RUNTIME ERRORS:', JSON.stringify(errors));
  win.destroy();
  app.quit();
  setTimeout(() => process.exit(0), 600);
});
