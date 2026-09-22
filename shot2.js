const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const path = require('path');
app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false, width: 900, height: 720, webPreferences: { contextIsolation: false } });
  const errs = [];
  win.webContents.on('console-message', (e, l, m) => { if (m && /error|uncaught|is not defined|undefined is not/i.test(m)) errs.push(m); });
  win.loadFile(path.join('src', 'index.html')).then(async () => {
    const info = await win.webContents.executeJavaScript(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const clickRoute = async r => { const b = document.querySelector('[data-route="'+r+'"]'); if (b) b.click(); await wait(260); };
      await clickRoute('chart'); await wait(240);
      const cell = document.querySelector('.kana-cell') || document.querySelector('.char-cell');
      let beforePos = null;
      if (cell) {
        const r0 = cell.getBoundingClientRect();
        beforePos = { top: Math.round(r0.top), bottom: Math.round(r0.bottom), width: Math.round(r0.width) };
        cell.click();
      }
      await wait(1500);
      const ov = document.querySelector('.modal-overlay');
      const pop = document.querySelector('.detail-popup');
      const style = (sel) => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return { pos: s.position, z: s.zIndex, disp: s.display, bg: s.backgroundColor, radius: s.borderRadius, anim: s.animationName }; };
      const r = pop ? pop.getBoundingClientRect() : null;
      const ovr = ov ? ov.getBoundingClientRect() : null;
      return {
        cells: document.querySelectorAll('.kana-cell').length,
        overlay: !!ov, popup: !!pop, canvas: !!document.querySelector('.write-canvas'),
        overlayStyle: style('.modal-overlay'),
        popupStyle: style('.detail-popup'),
        popupRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
        overlayRect: ovr ? { w: ovr.width, h: ovr.height } : {},
        centered: r && ovr ? Math.abs((r.left + r.width/2) - (ovr.left + ovr.width/2)) < 6 : false,
        beforeWasInFlow: beforePos ? (beforePos.top < window.innerHeight && Math.round(beforePos.bottom-site.bottom... ) : null,
        errlog: window.__errs || []
      };
    })()`);
    console.log('POPUP-STYLE INFO:', JSON.stringify(info));
    if (info && info.popup && info.overlay) {
      const img = await win.webContents.capturePage();
      require('fs').writeFileSync(path.join(__dirname, 'popup-real.png'), img.toPNG());
      console.log('SAVED popup-real.png bytes=', require('fs').statSync(path.join(__dirname, 'popup-real.png')).size);
    } else { console.log('NO-POPUP-SAVED'); }
    console.log('RUNTIME ERRORS:', JSON.stringify(errs));
    win.destroy(); app.exit(0);
  }).catch(e => { console.log('LOAD-ERR', String(e && e.message || e)); app.exit(1); });
});
