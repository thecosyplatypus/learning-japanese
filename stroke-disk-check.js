/* read-only: load the REAL on-disk stroke data through the exact loader the app
   serves, and print how many glyphs + strokes truly exist. ASCII only. */
const path = require('path');
const sp = require('C:/Users/phoeb/learning-japanese/src/stroke-paths.js');
const ks = Object.keys(sp);
console.log('STROKE-FILES-VERIFIED glyphs=' + ks.length + ' keys=' + ks.join(''));
for (const k of ks) console.log(k + '=' + ((sp[k] || []).length || 0));
