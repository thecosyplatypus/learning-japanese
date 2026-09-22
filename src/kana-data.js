'use strict';

(function () {
const KANA = {
  hiragana: {
    name: 'Hiragana',
    jp: 'ひらがな',
    groups: [
      { key: 'gojuon', name: 'Gojūon', rows: [
        [{ k:'あ',r:'a' },{ k:'い',r:'i' },{ k:'う',r:'u' },{ k:'え',r:'e' },{ k:'お',r:'o' }],
        [{ k:'か',r:'ka' },{ k:'き',r:'ki' },{ k:'く',r:'ku' },{ k:'け',r:'ke' },{ k:'こ',r:'ko' }],
        [{ k:'さ',r:'sa' },{ k:'し',r:'shi' },{ k:'す',r:'su' },{ k:'せ',r:'se' },{ k:'そ',r:'so' }],
        [{ k:'た',r:'ta' },{ k:'ち',r:'chi' },{ k:'つ',r:'tsu' },{ k:'て',r:'te' },{ k:'と',r:'to' }],
        [{ k:'な',r:'na' },{ k:'に',r:'ni' },{ k:'ぬ',r:'nu' },{ k:'ね',r:'ne' },{ k:'の',r:'no' }],
        [{ k:'は',r:'ha' },{ k:'ひ',r:'hi' },{ k:'ふ',r:'fu' },{ k:'へ',r:'he' },{ k:'ほ',r:'ho' }],
        [{ k:'ま',r:'ma' },{ k:'み',r:'mi' },{ k:'む',r:'mu' },{ k:'め',r:'me' },{ k:'も',r:'mo' }],
        [{ k:'や',r:'ya' },{ k:'ゆ',r:'yu' },{ k:'よ',r:'yo' }],
        [{ k:'ら',r:'ra' },{ k:'り',r:'ri' },{ k:'る',r:'ru' },{ k:'れ',r:'re' },{ k:'ろ',r:'ro' }],
        [{ k:'わ',r:'wa' },{ k:'を',r:'wo' },{ k:'ん',r:'n' }]
      ] },
      { key: 'dakuten', name: 'Dakuten', rows: [
        [{ k:'が',r:'ga' },{ k:'ぎ',r:'gi' },{ k:'ぐ',r:'gu' },{ k:'げ',r:'ge' },{ k:'ご',r:'go' }],
        [{ k:'ざ',r:'za' },{ k:'じ',r:'ji' },{ k:'ず',r:'zu' },{ k:'ぜ',r:'ze' },{ k:'ぞ',r:'zo' }],
        [{ k:'だ',r:'da' },{ k:'ぢ',r:'ji' },{ k:'づ',r:'zu' },{ k:'で',r:'de' },{ k:'ど',r:'do' }],
        [{ k:'ば',r:'ba' },{ k:'び',r:'bi' },{ k:'ぶ',r:'bu' },{ k:'べ',r:'be' },{ k:'ぼ',r:'bo' }],
        [{ k:'ぱ',r:'pa' },{ k:'ぴ',r:'pi' },{ k:'ぷ',r:'pu' },{ k:'ぺ',r:'pe' },{ k:'ぽ',r:'po' }]
      ] },
      { key: 'yoon', name: 'Yōon', rows: [
        [{ k:'きゃ',r:'kya' },{ k:'きゅ',r:'kyu' },{ k:'きょ',r:'kyo' }],
        [{ k:'しゃ',r:'sha' },{ k:'しゅ',r:'shu' },{ k:'しょ',r:'sho' }],
        [{ k:'ちゃ',r:'cha' },{ k:'ちゅ',r:'chu' },{ k:'ちょ',r:'cho' }],
        [{ k:'にゃ',r:'nya' },{ k:'にゅ',r:'nyu' },{ k:'にょ',r:'nyo' }],
        [{ k:'ひゃ',r:'hya' },{ k:'ひゅ',r:'hyu' },{ k:'ひょ',r:'hyo' }],
        [{ k:'みゃ',r:'mya' },{ k:'みゅ',r:'myu' },{ k:'みょ',r:'myo' }],
        [{ k:'りゃ',r:'rya' },{ k:'りゅ',r:'ryu' },{ k:'りょ',r:'ryo' }],
        [{ k:'ぎゃ',r:'gya' },{ k:'ぎゅ',r:'gyu' },{ k:'ぎょ',r:'gyo' }],
        [{ k:'じゃ',r:'ja' },{ k:'じゅ',r:'ju' },{ k:'じょ',r:'jo' }],
        [{ k:'びゃ',r:'bya' },{ k:'びゅ',r:'byu' },{ k:'びょ',r:'byo' }],
        [{ k:'ぴゃ',r:'pya' },{ k:'ぴゅ',r:'pyu' },{ k:'ぴょ',r:'pyo' }]
      ] }
    ]
  },
  katakana: {
    name: 'Katakana',
    jp: 'カタカナ',
    groups: [
      { key: 'gojuon', name: 'Gojūon', rows: [
        [{ k:'ア',r:'a' },{ k:'イ',r:'i' },{ k:'ウ',r:'u' },{ k:'エ',r:'e' },{ k:'オ',r:'o' }],
        [{ k:'カ',r:'ka' },{ k:'キ',r:'ki' },{ k:'ク',r:'ku' },{ k:'ケ',r:'ke' },{ k:'コ',r:'ko' }],
        [{ k:'サ',r:'sa' },{ k:'シ',r:'shi' },{ k:'ス',r:'su' },{ k:'セ',r:'se' },{ k:'ソ',r:'so' }],
        [{ k:'タ',r:'ta' },{ k:'チ',r:'chi' },{ k:'ツ',r:'tsu' },{ k:'テ',r:'te' },{ k:'ト',r:'to' }],
        [{ k:'ナ',r:'na' },{ k:'ニ',r:'ni' },{ k:'ヌ',r:'nu' },{ k:'ネ',r:'ne' },{ k:'ノ',r:'no' }],
        [{ k:'ハ',r:'ha' },{ k:'ヒ',r:'hi' },{ k:'フ',r:'fu' },{ k:'ヘ',r:'he' },{ k:'ホ',r:'ho' }],
        [{ k:'マ',r:'ma' },{ k:'ミ',r:'mi' },{ k:'ム',r:'mu' },{ k:'メ',r:'me' },{ k:'モ',r:'mo' }],
        [{ k:'ヤ',r:'ya' },{ k:'ユ',r:'yu' },{ k:'ヨ',r:'yo' }],
        [{ k:'ラ',r:'ra' },{ k:'リ',r:'ri' },{ k:'ル',r:'ru' },{ k:'レ',r:'re' },{ k:'ロ',r:'ro' }],
        [{ k:'ワ',r:'wa' },{ k:'ヲ',r:'wo' },{ k:'ン',r:'n' }]
      ] },
      { key: 'dakuten', name: 'Dakuten', rows: [
        [{ k:'ガ',r:'ga' },{ k:'ギ',r:'gi' },{ k:'グ',r:'gu' },{ k:'ゲ',r:'ge' },{ k:'ゴ',r:'go' }],
        [{ k:'ザ',r:'za' },{ k:'ジ',r:'ji' },{ k:'ズ',r:'zu' },{ k:'ゼ',r:'ze' },{ k:'ゾ',r:'zo' }],
        [{ k:'ダ',r:'da' },{ k:'ヂ',r:'ji' },{ k:'ヅ',r:'zu' },{ k:'デ',r:'de' },{ k:'ド',r:'do' }],
        [{ k:'バ',r:'ba' },{ k:'ビ',r:'bi' },{ k:'ブ',r:'bu' },{ k:'ベ',r:'be' },{ k:'ボ',r:'bo' }],
        [{ k:'パ',r:'pa' },{ k:'ピ',r:'pi' },{ k:'プ',r:'pu' },{ k:'ペ',r:'pe' },{ k:'ポ',r:'po' }]
      ] },
      { key: 'yoon', name: 'Yōon', rows: [
        [{ k:'キャ',r:'kya' },{ k:'キュ',r:'kyu' },{ k:'キョ',r:'kyo' }],
        [{ k:'シャ',r:'sha' },{ k:'シュ',r:'shu' },{ k:'ショ',r:'sho' }],
        [{ k:'チャ',r:'cha' },{ k:'チュ',r:'chu' },{ k:'チョ',r:'cho' }],
        [{ k:'ニャ',r:'nya' },{ k:'ニュ',r:'nyu' },{ k:'ニョ',r:'nyo' }],
        [{ k:'ヒャ',r:'hya' },{ k:'ヒュ',r:'hyu' },{ k:'ヒョ',r:'hyo' }],
        [{ k:'ミャ',r:'mya' },{ k:'ミュ',r:'myu' },{ k:'ミョ',r:'myo' }],
        [{ k:'リャ',r:'rya' },{ k:'リュ',r:'ryu' },{ k:'リョ',r:'ryo' }],
        [{ k:'ギャ',r:'gya' },{ k:'ギュ',r:'gyu' },{ k:'ギョ',r:'gyo' }],
        [{ k:'ジャ',r:'ja' },{ k:'ジュ',r:'ju' },{ k:'ジョ',r:'jo' }],
        [{ k:'ビャ',r:'bya' },{ k:'ビュ',r:'byu' },{ k:'ビョ',r:'byo' }],
        [{ k:'ピャ',r:'pya' },{ k:'ピュ',r:'pyu' },{ k:'ピョ',r:'pyo' }]
      ] },
      { key: 'extended', name: 'Extended', rows: [
        [{ k:'ファ',r:'fa' },{ k:'フィ',r:'fi' },{ k:'フェ',r:'fe' },{ k:'フォ',r:'fo' },{ k:'フュ',r:'fyu' }],
        [{ k:'ウィ',r:'wi' },{ k:'ウェ',r:'we' },{ k:'ウォ',r:'wo' },{ k:'ヴァ',r:'va' },{ k:'ヴィ',r:'vi' }],
        [{ k:'ツァ',r:'tsa' },{ k:'ツィ',r:'tsi' },{ k:'ツェ',r:'tse' },{ k:'ツォ',r:'tso' }],
        [{ k:'チェ',r:'che' },{ k:'シェ',r:'she' },{ k:'ジェ',r:'je' }],
        [{ k:'ティ',r:'ti' },{ k:'ディ',r:'di' },{ k:'デュ',r:'du' },{ k:'トゥ',r:'tu' }]
      ] }
    ]
  }
};

function flattenSet(kanaGroupKey, scriptKey) {
  const script = KANA[scriptKey];
  const out = [];
  const groups = Array.isArray(kanaGroupKey) ? kanaGroupKey : [kanaGroupKey];
  for (const g of script.groups) {
    if (groups.includes(g.key)) {
      for (const row of g.rows) for (const c of row) out.push({ script: scriptKey, char: c.k, romaji: c.r, group: g.name });
    }
  }
  return out;
}

function allCharacters(selectedScripts, selectedGroups) {
  const chars = [];
  for (const script of (selectedScripts || ['hiragana', 'katakana'])) {
    for (const g of KANA[script].groups) {
      if (selectedGroups && !selectedGroups.includes(g.key)) continue;
      for (const row of g.rows) for (const c of row) chars.push({ script, char: c.k, romaji: c.r, group: g.name });
    }
  }
  return chars;
}

function totalCount(script) {
  return KANA[script].groups.reduce((n, g) => n + g.rows.reduce((m, r) => m + r.length, 0), 0);
}

const KanaData = { KANA, flattenSet, allCharacters, totalCount };
if (typeof module !== 'undefined' && module.exports) module.exports = KanaData;
if (typeof window !== 'undefined') window.KanaData = KanaData;
})();