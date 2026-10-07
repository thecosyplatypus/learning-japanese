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

  const result = await win.webContents.executeJavaScript(`(() => {
    const out = {};
    const CH = 'か';

    /* build a scratch canvas and paint into it */
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 260;
      return c;
    };
    const paint = (c, fn) => {
      const x = c.getContext('2d', { willReadFrequently: true });
      x.clearRect(0, 0, c.width, c.height);
      x.strokeStyle = '#000'; x.fillStyle = '#000';
      x.lineCap = 'round'; x.lineJoin = 'round';
      fn(x, c);
    };

    /* 1. perfect: fill the glyph exactly like the scoring reference does */
    let c = mk();
    paint(c, x => {
      x.font = '700 ' + fitGlyphFont(260, CH, 0.8) + 'px ' + jpFontStackCss();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(CH, 130, 130 + 260 * 0.02);
    });
    out.perfectGlyph = scoreDrawing(c, CH).score;

    /* 2. near miss: same glyph but nudged and slightly thinner */
    c = mk();
    paint(c, x => {
      x.font = '700 ' + fitGlyphFont(230, CH, 0.8) + 'px ' + jpFontStackCss();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.save(); x.translate(150, 140); x.rotate(0.14); x.fillText(CH, 0, 0); x.restore();
    });
    out.nearMiss = scoreDrawing(c, CH).score;

    /* 3. wrong character drawn (different kana) */
    c = mk();
    paint(c, x => {
      x.font = '700 ' + fitGlyphFont(260, 'き', 0.8) + 'px ' + jpFontStackCss();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('き', 130, 130 + 260 * 0.02);
    });
    out.wrongChar = scoreDrawing(c, CH).score;

    /* 4. random scribble */
    c = mk();
    paint(c, x => {
      for (let i = 0; i < 26; i++) {
        x.lineWidth = 7;
        x.beginPath();
        const sx = 20 + Math.random() * 220, sy = 20 + Math.random() * 220;
        x.moveTo(sx, sy);
        x.lineTo(20 + Math.random() * 220, 20 + Math.random() * 220);
        x.stroke();
      }
    });
    out.scribble = scoreDrawing(c, CH).score;

    /* 5. tracing the on-screen guide outline (what following the hint produces) */
    c = mk();
    paint(c, x => {
      x.lineWidth = 260 * 0.028;
      x.font = '700 ' + fitGlyphFont(260, CH, 0.8) + 'px ' + jpFontStackCss();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.strokeText(CH, 130, 130 + 260 * 0.02);
    });
    out.tracedGuide = scoreDrawing(c, CH).score;

    /* 6. a clearly unrelated character */
    c = mk();
    paint(c, x => {
      x.font = '700 ' + fitGlyphFont(260, 'そ', 0.8) + 'px ' + jpFontStackCss();
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('そ', 130, 130 + 260 * 0.02);
    });
    out.unrelatedChar = scoreDrawing(c, CH).score;

    /* 7. single straight line */
    c = mk();
    paint(c, x => {
      x.lineWidth = 9;
      x.beginPath(); x.moveTo(50, 210); x.lineTo(210, 50); x.stroke();
    });
    out.singleLine = scoreDrawing(c, CH).score;

    /* 8. empty canvas */
    c = mk();
    paint(c, () => {});
    out.blank = scoreDrawing(c, CH).score;

    return out;
  })()`);
  console.log('SCORE CALIBRATION:', JSON.stringify(result, null, 2));
  console.log('PAGE ERRORS:', JSON.stringify(errors));

  const ok =
    result.perfectGlyph >= 95 &&
    result.tracedGuide > result.unrelatedChar &&
    result.tracedGuide > result.scribble &&
    result.nearMiss > result.scribble &&
    result.wrongChar < result.perfectGlyph &&
    result.unrelatedChar < result.scribble + 20 &&
    result.singleLine < result.unrelatedChar &&
    result.blank === 0;
  console.log(ok ? 'CALIBRATION OK' : 'CALIBRATION FAILED');
  app.exit(ok ? 0 : 1);
});
