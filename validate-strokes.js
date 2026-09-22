const sp = require("C:\\Users\\phoeb\\learning-japanese\\src\\stroke-paths.js");
const keys = Object.keys(sp);
let bad = [];
for (const k of keys) {
  const g = sp[k];
  if (!Array.isArray(g) || !g.length) { bad.push(k + ':no-strokes'); continue; }
  g.forEach((st, si) => {
    if (!Array.isArray(st) || st.length < 2) { bad.push(k + ':stroke' + si + ':too-short'); return; }
    st.forEach(p => { if (!Array.isArray(p) || p.length < 2 || isNaN(+p[0]) || isNaN(+p[1]) || +p[0] < 0 || +p[0] > 100 || +p[1] < 0 || +p[1] > 100) bad.push(k + ':stroke' + si + ':badpt:' + JSON.stringify(p)); });
  });
}
Write-Output ('glyphs=' + keys.length + ' keys=' + keys.join(','));
Write-Output ('strokeCounts=' + keys.map(k => k + ':' + sp[k].length).join(' '));
Write-Output ('invalid=' + ((bad.length ? bad.join(' | ') : 'none')));
