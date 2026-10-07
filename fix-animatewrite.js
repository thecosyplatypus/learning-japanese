/* one-shot surgical repair: collapse the two collided animateWrite bodies
   into the real vector one. Balanced-brace anchored (no regex-on-JS); exit
   non-zero if the expected two-definition structure isn't exactly found. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const f = path.join(__dirname, 'src', 'app.js');
const s = fs.readFileSync(f, 'utf8');
const marker = 'function animateWrite';
let from = 0, starts = [];
while (true) {
  const i = s.indexOf(marker, from);
  if (i < 0) break;
  starts.push(i); from = i + marker.length;
}
console.log('BODY-COUNT=' + starts.length);
if (starts.length !== 2) { console.log('UNEXPECTED-BODY-COUNT'); process.exit(2); }
function endOf(startIdx) {
  let depth = 0, i = startIdx;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}
const e0 = endOf(starts[0]);
const e1 = endOf(starts[1]);
if (e0 < 0 || e1 < 0) { console.log('UNBALANCED'); process.exit(3); }
const body0 = s.slice(starts[0], e0);
const body1 = s.slice(starts[1], e1);
const keepVec = /vecFrame/.test(body0) ? 0 : (/vecFrame/.test(body1) ? 1 : -1);
if (keepVec < 0) { console.log('NO-VEC-BODY'); process.exit(4); }
const drop = keepVec === 0 ? 1 : 0;
const dropStart = starts[drop], dropEnd = drop === 0 ? e0 : e1;
let out = s.slice(0, dropStart) + s.slice(dropEnd);
/* also clear any preceding leftover helper decl strictly owned by the dropped body */
if (drop ===  Buddha) process.exit(5);
console.log('KEEP=' + keepVec + ' DROP=' + drop + ' chars-before=' + s.length + ' chars-after=' + out.length);
fs.writeFileSync(f + os.EOL ? f : f, out, 'utf8');
console.log('REPAIRED-AND-WRITTEN');
</write>
