import { readFileSync } from 'node:fs';
import gifuct from 'gifuct-js';
const { parseGIF, decompressFrames } = gifuct;

for (const file of process.argv.slice(2)) {
  const gif = parseGIF(new Uint8Array(readFileSync(file)));
  const frames = decompressFrames(gif, true);
  const W = gif.lsd.width, H = gif.lsd.height;
  const canvas = new Uint8ClampedArray(W * H * 4);
  const snaps = [];
  frames.forEach((f, fi) => {
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
    if (fi === 0 || fi === frames.length - 1) {
      const hist = new Map();
      let dark = 0;
      for (let i = 0; i < canvas.length; i += 4) {
        const v = canvas[i];
        hist.set(v, (hist.get(v) || 0) + 1);
        if (v < 60) dark++;
      }
      const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      snaps.push({ frame: fi, dark, top });
    }
  });
  console.log(file, `${W}x${H} frames=${frames.length}`);
  for (const s of snaps) console.log('  frame', s.frame, 'dark', s.dark, 'top', s.top.map(([k, v]) => k + ':' + v).join(' '));
}
