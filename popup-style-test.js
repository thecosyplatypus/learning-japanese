const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false, width: 960, height: 760, webPreferences: { contextIsolation: false } });
  const errs = [];
  win.webContents.on('console-message', (e) => {});
  win.loadFile(path.join(__dirname, 'src', 'index.html')).then(async () => {
    try {
      const info = await win.webContents.executeJavaScript(`
        (async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          const goto = async (r) => { const b = document.querySelector('[data-route="'+r+'"]'); if (b) b.click(); await wait(280); };
          await goto('chart'); await wait(260);
          const cell = document.querySelector('.kana-cell') || document.querySelector('.char-cell');
          let inFlowBefore = null;
          if (cell) {
            const b = cell.getBoundingClientRect();
            inFlowBefore = { top: Math.round(b.top), height: Math.round(b.height) };
            cell.click();
          }
          await wait(900);
          const ov = document.querySelector('.modal-overlay');
          const pop = document.querySelector('.detail-popup');
          const os = ov ? getComputedStyle(ov) : null;
          const ps = pop ? getComputedStyle(pop) : null;
          const pr = pop ? pop.getBoundingClientRect() : null;
          const p2 = document.body.getBoundingClientRect();
          const centered = pr && p2 ? Math.abs((pr.left + pr.width/2) - (p2.left + p2.width/2)) : -1;
          return {
            cells: document.querySelectorAll('.kana-cell').length,
            overlay: !!ov, popup: !!pop, canvas: !!document.querySelector('.write-canvas'),
            speakBtn: !!document.querySelector('.detail-actions .speak-btn') || !!document.querySelector('.speak-btn'),
            overlay: os ? { pos: os.position, z: os.zIndex, disp: os.display, bg: os.backgroundColor } : null,
            popup: ps ? { pos: ps.position, z: ps.zIndex, disp: ps.display, bg: ps.backgroundColor, radius: ps.borderRadius, border: ps.borderStyle } : null,
            popupW: pr ? Math.round(pr.width) : 0,
            centeredGap: centered,
            inFlowBefore: inFlowBefore
          };
        })()`);
      console.log('POPUP-STYLE-INFO:', JSON.stringify(info));
      // no screenshot needed
      win.destroy();
      app.quit();
    } catch (e) { console.log('TEST-ERR', String(e && e.message || e)); app.exit(1); }
  });
});
