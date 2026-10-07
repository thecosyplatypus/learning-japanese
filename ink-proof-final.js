/* ink-proof-final.js -- the LAST ink probe, and the only rule it obeys:
   the bash wrapper will NOT run it unless `node --check` says OK first.
   So a corrupted probe can never again produce a false claim.
   Loads the REAL app (src/index.html -> kana-data.js + stroke-paths.js + app.js),
   opens the kana chart, clicks the hiragana A cell (text == あ) for real, waits
   while the real animateWrite draws on the real write-canvas (polling until the
   ink count stabilises), then counts opaque pixels and prints INK-REPORT.
   The window is shown OFFSCREEN (skipped from taskbar) so the compositor keeps
   producing real frames — a hidden window throttles the app's rAF to zero.
   Hard 30s shell timeout. */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const ROOT = 'C:/Users/phoeb/learning-japanese';

let win = null;
let pageErrs = [];
let fired = false;
function finish(code, msg) {
  if (fired) return; fired = true;
  console.log('INK-REPORT ' + msg);
  try { app.exit(code); } catch (_) {}
}
const bail = (m) => { try { finish(9, 'BAIL ' + String(m).slice(0, 130)); } catch (_) { try { app.exit(9); } catch (_) {} } };
const msig = (e) => { const s = String((e && e.message) || e); return s.length > 130 ? s.slice(0, 130) : s; };

setTimeout(() => bail('TIMEOUT-30s'), 30000);

const pollInk = () => win.webContents.executeJavaScript(`(() => {
  try {
    const pop = document.querySelector('.detail-popup');
    if (!pop || getComputedStyle(pop).display === 'none') return { ok: false, popup: false };
    const cv = document.querySelector('.write-canvas');
    if (!cv) return { ok: false, popup: true, canvas: false };
    const w = cv.width, h = cv.height;
    if (!w || !h) return { ok: false, popup: true, canvas: true, dim: [w, h] };
    const img = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    let inked = 0;
    for (let i = 3; i < img.length; i += 4) if (img[i] > 25) inked++;
    return { ok: true, popup: true, canvas: true, w: w, h: h, inked: inked, errs: (window.__e || []).slice(0, 2) };
  } catch (e) { return { ok: false, err: msig(e) }; }
})()`);

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1050, height: 840, show: true, frame: false, skipTaskbar: true,
    x: -9000, y: -9000,
    webPreferences: { backgroundThrottling: false }
  });
  win.webContents.setBackgroundThrottling(false);
  win.webContents.on('console-message', (_e, lvl, msg) => {
    const m = String(msg || '').slice(0, 160);
    if (lvl >= 2 && !/GPU|gpu|CSP|Content Security|Deprecat|willReadFrequently|readback/i.test(m)) pageErrs.push(m);
  });
  win.loadFile(path.join(ROOT, 'src', 'index.html'))
    .then(() => win.webContents.executeJavaScript(`
      (() => {
        window.__e = [];
        window.addEventListener('error', (ev) => {
          const e = ev.error || {};
          window.__e.push(String((e && e.stack) || ev.message || ev));
        });
        window.addEventListener('unhandledrejection', (ev) => {
          const r = ev.reason || {};
          window.__e.push('UP ' + String((r && r.stack) || r));
        });
        return 'collectors-installed';
      })()
    `))
    .then(() => new Promise((r) => setTimeout(r, 1800)))
    .then(() => win.webContents.executeJavaScript(`
      (async () => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        try {
          const nav = document.querySelector('[data-route="chart"]');
          if (!nav) return 'STEP1 chart-nav=absent';
          nav.click();
          await wait(450);
          const wanted = '\u3042'; /* hiragana A */
          let t = null;
          for (const el of Array.from(document.querySelectorAll('.kana-cell .k'))) {
            if ((el.textContent || '').trim() === wanted) { t = el; break; }
          }
          if (!t) return 'STEP1 cells=' + document.querySelectorAll('.kana-cell').length + ' LEAF-FOUND=false';
          t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return 'STEP1 cell-found=true clicked';
        } catch (e) { return 'STEP1 err ' + msig(e); }
      })()
    `))
    .then((r) => { console.log('RK-S1 ' + r); return r; })
    .then(async () => {
      const delay = (ms) => new Promise((r) => setTimeout(r, ms));
      let current = { ok: false, popup: false };
      let last = null, stable = 0;
      const t0 = Date.now();
      for (let i = 0; i < 40; i++) {
        current = await pollInk();
        console.log('RK-POLL ' + JSON.stringify(current));
        if (current.ok) {
          if (last !== null && last === current.inked) { stable++; if (stable >= 2) break; }
          else { stable = 0; }
          last = current.inked;
        }
        if (Date.now() - t0 > 9000) break;
        await delay(250);
      }
      return current;
    })
    .then((r) => {
      const line = r.ok
        ? 'STEP2 popup=true canvas=' + r.w + 'x' + r.h + ' INK=' + r.inked + ' pct=' + (r.inked / (r.w * r.h) * 100).toFixed(2) + ' stable'
        : 'STEP2 ' + JSON.stringify(r);
      console.log('RK-S2 ' + line);
      finish(0, 'F=' + line + ' ERRS=' + (pageErrs.length ? JSON.stringify(pageErrs.slice(0, 3)) : 'none'));
    })
    .catch((e) => bail('ERR ' + msig(e)));
});