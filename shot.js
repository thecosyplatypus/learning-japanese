const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const path = require('path');
const fs = require('fs');
app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false, width: 900, height: 760,
    webPreferences: { contextIsolation: false, nodeIntegration: false }
  });
  win.webContents.on('render-process-gone', (e, d) => console.log('GONE', d && d.reason));
  const errs = [];
  win.webContents.on('console-message', (e, l, m) => { if (m && /error|is not defined|undefined is not|exception|uncaught/i.test(m)) errs.push(m); });
  win.loadFile(path.join('src', 'index.html')).then(async () => {
    await new Promise(r => setTimeout(r, 400));
    const info = await win.webContents.executeJavaScript(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const go = async r => { const b = document.querySelector('[data-route="'+r+'"]'); if (b) b.click(); await wait(320); };
      await go('chart'); await wait(320);
      const cell = document.querySelector('.kana-cell') || document.querySelector('.char-cell') || document.querySelector('.glyph');
      const before = document.querySelectorAll('.kana-cell').length;
      let clicked = false;
      if (cell) { cell.click(); clicked = true; }
      await wait(1700);
      const ja = speechSynthesis.getVoices().filter(v => v.lang && v.lang.replace('_','-').toLowerCase().startsWith('ja'));
      return { cells: before, clicked,
        overlay: !!document.querySelector('.modal-overlay'),
        popup: !!document.querySelector('.detail-popup'),
        canvas: !!document.querySelector('.write-canvas'),
        speakBtn: !!document.querySelector('.speak-btn'),
        replayBtn: !!document.querySelector('.detail-actions .speak-btn'),
        voices: speechSynthesis.getVoices().length,
        jaVoices: ja.length, jaSample: ja[0] && ja[0].name,
        listenVoices: window.speechSynthesis ? speechSynthesis.getVoices().length : -1 };
    })()`);
    console.log('VOICE/OPEN INFO:', JSON.stringify(info));
    if (info && info.overlay) {
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(__dirname, 'popup-proof.png'), img.toPNG());
      console.log('SAVED popup-proof.png bytes=', fs.statSync(path.join(__dirname, 'popup-proof.png')).size);
    } else {
      console.log('NO-POPUP-TO-SAVE');
    }
    console.log('ERRLOG:', JSON.stringify(errs));
    win.destroy(); app.exit(0);
  }).catch(e => { console.log('LOAD-ERR', String((e && e.message) || e)); app.exit(1); });
});
