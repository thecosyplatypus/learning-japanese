import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import gifenc from 'gifenc';
import { svgPathProperties } from 'svg-path-properties';
const { GIFEncoder, applyPalette } = gifenc;

const ROOT = process.cwd();
const CACHE = join(ROOT, 'tmp', 'svg');
const FPS = 12;
const DELAY = Math.round(1000 / FPS);
const DRAW = 0.5;
const GAP = 0.08;
const HOLD = 0.9;
const SIZE = 150;
const TEST = process.env.TEST === '1';

const PALETTE = [];
for (let v = 255; v >= 0; v -= 16) PALETTE.push([v, v, v]);

/* ---------- chart definitions ---------- */
const ctx = { window: {}, module: { exports: {} } };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'src/kana-data.js'), 'utf8'), ctx);
const KANA = (ctx.window.KanaData || ctx.module.exports).KANA;

function chartChars(script) {
  const all = new Set();
  for (const g of KANA[script].groups) for (const row of g.rows) for (const c of row) all.add(c.k);
  return [...all];
}

const kanjiText = readFileSync(join(ROOT, 'src/kanji-data.js'), 'utf8');
const kanjiChars = [...new Set([...kanjiText.matchAll(/"k":"([^"]+)"/g)].map(m => m[1]))];

function fileKeys(dir, prefix) {
  const re = new RegExp('^' + prefix + '_(.+)_stroke_order_animation\\.gif$');
  const out = [];
  for (const f of readdirSync(dir)) {
    const m = f.match(re);
    if (m) out.push(m[1]);
  }
  return out;
}

function uniq(list) {
  return [...new Set(list)];
}

/* ---------- source fetching ---------- */
async function fetchSvg(kind, ch) {
  const cp = ch.codePointAt(0);
  const dir = kind === 'kanji' ? 'svgsJa' : 'svgsJaKana';
  const cacheFile = join(CACHE, kind, cp + '.svg');
  if (existsSync(cacheFile)) return readFileSync(cacheFile, 'utf8');
  const url = `https://raw.githubusercontent.com/parsimonhi/animCJK/master/${dir}/${cp}.svg`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      if (!text.includes('<svg')) throw new Error('not svg');
      await mkdir(dirname(cacheFile), { recursive: true });
      await writeFile(cacheFile, text);
      return text;
    } catch (e) {
      if (attempt === 3) throw new Error('fetch ' + ch + ': ' + e.message);
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

/* ---------- SVG frame building ---------- */
function stripSvg(text) {
  const m = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!m) throw new Error('bad svg');
  return m[1];
}

function strokePaths(inner) {
  return (inner.match(/<path[^>]*clip-path="url\(#[^)]+\)"[^>]*>/g) || []);
}

function pathLength(tag) {
  const m = tag.match(/\sd="([^"]+)"/);
  if (!m) return 0;
  try {
    return new svgPathProperties(m[1]).getTotalLength();
  } catch {
    return 0;
  }
}

/**
 * Build a static-state SVG at time t (seconds).
 * The document may contain several nested character SVGs; strokes are
 * numbered in document order so combos animate one character after another.
 */
function frameSvg(fullSvg, lengths, t, width, height) {
  let strokeIndex = 0;
  let out = fullSvg.replace(/<path([^>]*?)\/?>/g, (tag, attrs) => {
    if (!/clip-path="url\(#/.test(attrs)) {
      // Guide (fill) shape — bake the gray fill in as an attribute because
      // librsvg (used for rasterising) does not apply the embedded CSS rules.
      const cleaned = attrs.replace(/\sfill="[^"]*"/, '');
      return `<path${cleaned} fill="#ccc" />`;
    }
    const i = strokeIndex++;
    const len = lengths[i] || 1;
    const start = i * (DRAW + GAP);
    const p = Math.max(0, Math.min(1, (t - start) / DRAW));
    // Mirror animCJK's dash maths: a dash array slightly longer than the path
    // keeps the whole stroke inside the gap at p=0, so no stray round-cap dot
    // is left at the end of a stroke that has not started yet.
    const dash = len + 4;
    const offset = ((len + 6) * (1 - p)).toFixed(2);
    const cleaned = attrs.replace(/\sstyle="[^"]*"/, '');
    return `<path${cleaned} style="animation:none;fill:none;stroke:#000;stroke-width:128;stroke-linecap:round;stroke-dasharray:${dash.toFixed(2)};stroke-dashoffset:${offset}" />`;
  });
  out = out.replace(/<svg([^>]*)>/, (m, attrs) => {
    const a = attrs.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '');
    return `<svg${a} width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fff" />`;
  });
  return out;
}

function wrapCombo(innerA, innerB) {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="acjk" viewBox="0 0 2048 1024" width="320" height="160">` +
    `<rect width="2048" height="1024" fill="#fff"/>` +
    `<svg x="0" y="0" width="1024" height="1024" viewBox="0 0 1024 1024" class="acjk">${innerA}</svg>` +
    `<svg x="1024" y="0" width="1024" height="1024" viewBox="0 0 1024 1024" class="acjk">${innerB}</svg>` +
    `</svg>`;
}

/* ---------- render + encode ---------- */
async function renderGif({ chars, kind, outFile }) {
  const innerA = stripSvg(await fetchSvg(kind, chars[0]));
  const innerB = chars.length > 1 ? stripSvg(await fetchSvg(kind, chars[1])) : null;

  const tagsA = strokePaths(innerA);
  const tagsB = innerB === null ? [] : strokePaths(innerB);
  const lengths = [...tagsA, ...tagsB].map(pathLength);
  const n = lengths.length;
  if (!n) throw new Error('no strokes for ' + chars.join(''));

  let fullSvg, width, height;
  if (innerB === null) {
    fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="acjk" viewBox="0 0 1024 1024">${innerA}</svg>`;
    width = height = SIZE;
  } else {
    fullSvg = wrapCombo(innerA, innerB);
    width = SIZE * 2;
    height = SIZE;
  }

  const total = (n - 1) * (DRAW + GAP) + DRAW + HOLD;
  const frameCount = Math.max(2, Math.round(total * FPS));
  const gif = GIFEncoder();
  let prev = null;

  for (let f = 0; f < frameCount; f++) {
    const t = f / FPS;
    const svg = frameSvg(fullSvg, lengths, t, width, height);
    const { data } = await sharp(Buffer.from(svg), { density: 72 })
      .resize(width, height, { fit: 'fill' })
      .flatten({ background: '#ffffff' })
      .ensureAlpha() // applyPalette() indexes RGBA data, not RGB
      .raw()
      .toBuffer({ resolveWithObject: true });
    const full = applyPalette(new Uint8Array(data), PALETTE, 'rgb565');
    let index = full;
    if (prev) {
      // Only encode pixels that changed since the previous frame; the rest
      // are transparent and simply show the already-composited canvas.
      index = Uint8Array.from(full);
      for (let i = 0; i < index.length; i++) if (index[i] === prev[i]) index[i] = 0;
    }
    gif.writeFrame(index, width, height, {
      palette: f === 0 ? PALETTE : undefined,
      delay: DELAY,
      transparent: f > 0,
      transparentIndex: 0,
      dispose: 1, // keep previous pixels so delta frames build the glyph
    });
    prev = full;
  }
  gif.finish();
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, gif.bytes());
  return { frames: frameCount, strokes: n };
}

/* ---------- job building (regenerate every existing file) ---------- */
const jobs = [];
for (const ch of uniq([...kanjiChars, ...fileKeys(join(ROOT, 'src/assets/kanji-gifs'), 'Kanji')])) {
  jobs.push({ chars: [ch], kind: 'kanji', out: `src/assets/kanji-gifs/Kanji_${ch}_stroke_order_animation.gif` });
}
for (const script of ['hiragana', 'katakana']) {
  const prefix = script === 'hiragana' ? 'Hiragana' : 'Katakana';
  const dir = join(ROOT, `src/assets/${script}-gifs`);
  const keys = uniq([...chartChars(script), ...fileKeys(dir, prefix)]);
  for (const key of keys) {
    const arr = [...key];
    const chars = arr.length > 1 ? arr.slice(0, 2) : arr;
    jobs.push({
      chars,
      kind: script,
      out: `src/assets/${script}-gifs/${prefix}_${key}_stroke_order_animation.gif`,
    });
  }
}

if (TEST) {
  jobs.length = 0;
  jobs.push(
    { chars: ['日'], kind: 'kanji', out: 'src/assets/kanji-gifs/Kanji_日_stroke_order_animation.gif' },
    { chars: ['一'], kind: 'kanji', out: 'src/assets/kanji-gifs/Kanji_一_stroke_order_animation.gif' },
    { chars: ['き'], kind: 'hiragana', out: 'src/assets/hiragana-gifs/Hiragana_き_stroke_order_animation.gif' },
    { chars: [...'きゃ'], kind: 'hiragana', out: 'src/assets/hiragana-gifs/Hiragana_きゃ_stroke_order_animation.gif' },
    { chars: ['ア'], kind: 'katakana', out: 'src/assets/katakana-gifs/Katakana_ア_stroke_order_animation.gif' },
    { chars: [...'キャ'], kind: 'katakana', out: 'src/assets/katakana-gifs/Katakana_キャ_stroke_order_animation.gif' },
  );
}

console.log('jobs', jobs.length);
const started = Date.now();
let done = 0;
let failed = 0;

async function pool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

await pool(jobs, 4, async (job) => {
  try {
    const r = await renderGif({ chars: job.chars, kind: job.kind, outFile: join(ROOT, job.out) });
    done++;
    if (done % 25 === 0 || TEST) {
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`[${done}/${jobs.length}] ${job.chars.join('')} frames=${r.frames} strokes=${r.strokes} ${secs}s`);
    }
  } catch (e) {
    failed++;
    console.log('FAIL', job.chars.join(''), e.message);
  }
});
console.log('finished', done, 'failed', failed, 'in', ((Date.now() - started) / 1000).toFixed(0) + 's');
