import { readdirSync, readFileSync } from 'node:fs';
import gifuct from 'gifuct-js';
const { parseGIF, decompressFrames } = gifuct;

const dirs = [
  ['hiragana-gifs', 'Hiragana'],
  ['katakana-gifs', 'Katakana'],
  ['kanji-gifs', 'Kanji'],
];

let total = 0, structural = 0, styleBad = 0, animBad = 0;
const problems = [];

function composite(gif, frames) {
  const W = gif.lsd.width, H = gif.lsd.height;
  const canvas = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < canvas.length; i += 4) {
    canvas[i] = canvas[i + 1] = canvas[i + 2] = canvas[i + 3] = 255;
  }
  return frames.map((f) => {
    const d = f.dims;
    if (f.disposalType === 2) {
      for (let y = d.top; y < d.top + d.height; y++)
        for (let x = d.left; x < d.left + d.width; x++) {
          const i = (y * W + x) * 4;
          canvas[i] = canvas[i + 1] = canvas[i + 2] = 255; canvas[i + 3] = 255;
        }
    }
    const pa = f.patch;
    for (let y = 0; y < d.height; y++)
      for (let x = 0; x < d.width; x++) {
        const pi = (y * d.width + x) * 4;
        const ci = ((d.top + y) * W + (d.left + x)) * 4;
        if (pa[pi + 3] === 0) continue;
        canvas[ci] = pa[pi]; canvas[ci + 1] = pa[pi + 1]; canvas[ci + 2] = pa[pi + 2]; canvas[ci + 3] = 255;
      }
    return new Uint8ClampedArray(canvas);
  });
}

for (const [dir, prefix] of dirs) {
  const root = 'src/assets/' + dir;
  for (const f of readdirSync(root)) {
    if (!f.endsWith('.gif')) continue;
    total++;
    const p = root + '/' + f;
    try {
      const gif = parseGIF(new Uint8Array(readFileSync(p)));
      const key = f.slice(prefix.length + 1, f.length - '_stroke_order_animation.gif'.length);
      const expectedWidth = [...key].length > 1 ? 300 : 150;
      const { width, height } = gif.lsd;
      const frames = decompressFrames(gif, true);
      if (width !== expectedWidth || height !== 150 || frames.length < 2) {
        structural++;
        problems.push(`${p} -> ${width}x${height} frames=${frames.length}`);
        continue;
      }
      const snaps = composite(gif, frames);
      const counts = (buf) => {
        let white = 0, gray = 0, dark = 0;
        for (let i = 0; i < buf.length; i += 4) {
          const v = buf[i];
          if (v === 255) white++; else if (v >= 195 && v <= 215) gray++; else if (v < 60) dark++;
        }
        return { white, gray, dark };
      };
      const first = counts(snaps[0]);
      const last = counts(snaps[snaps.length - 1]);
      // frame 0: clean white + gray guide, no ink; last: ink present.
      if (first.dark !== 0 || first.gray < 20 || first.white < 500 || last.dark < 10) {
        styleBad++;
        problems.push(`${p} -> first ${JSON.stringify(first)} last ${JSON.stringify(last)}`);
      }
    } catch (e) {
      structural++;
      problems.push(`${p} -> ERROR ${e.message}`);
    }
  }
}

console.log('checked', total, 'gifs; structural', structural, 'style', styleBad);
for (const p of problems.slice(0, 40)) console.log('  ' + p);
if (problems.length > 40) console.log('  ... and', problems.length - 40, 'more');
