'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
for (const file of ['poems.js', 'lexicon.js', 'analyzer.js', 'validation.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'preview', file), 'utf8'), context);
}
const poems = context.window.POETRY_POEMS;
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/selected-poems.json'), 'utf8').replace(/^\uFEFF/, ''));
assert.equal(poems.length, 15);
assert.equal(new Set(poems.map(p => p.id)).size, 15);
assert.ok(catalog.poems.filter(p => p.newRelativeToExample).length >= 5);
assert.ok(context.window.POETRY_EMOTIONS.length >= 6 && context.window.POETRY_EMOTIONS.length <= 10);
for (const emotion of context.window.POETRY_EMOTIONS) {
  assert.equal(emotion.k, emotion.key);
  assert.ok(emotion.def && emotion.color && emotion.entries.length >= 10);
}
assert.equal(JSON.stringify(poems.map(p => p.id)), JSON.stringify(catalog.poems.map(p => p.id)));
let hits = 0;
for (const poem of poems) {
  assert.ok(poem.textReady && poem.text && poem.sourceUrl, poem.id);
  assert.ok(poem.poetDeath < 1962 && poem.poet && poem.year && poem.source, poem.id);
  assert.ok(/^https:\/\//.test(poem.sourceUrl), poem.id);
  assert.doesNotMatch(poem.text, /[ㄱ-ㅎㅏ-ㅣ]/u, poem.id);
  assert.doesNotMatch(poem.text, /[\u1100-\u11ff\ua960-\ua97f\ud7b0-\ud7ff\ufffd]/u, poem.id);
  assert.equal(poem.text, poem.text.normalize('NFC'), poem.id);
  assert.ok(poem.theme && poem.interp, poem.id);
  assert.ok((poem.interp.match(/[.!?](?:\s|$)/g) || []).length >= 3, poem.id);
  assert.ok(poem.interpretationEmotionKeys.length > 0, poem.id);
  for (const evidence of poem.interpretationEvidence) {
    assert.equal(poem.text.split('\n').filter(line => line.trim())[evidence.no - 1], evidence.text, poem.id);
  }
  const initials = { '\u112d': '\u1101', '\u112f': '\u1104', '\u1132': '\u1108', '\u1136': '\u110d' };
  const expected = poem.sourceText.replace(/[\u112d\u112f\u1132\u1136]/g, c => initials[c]).normalize('NFC');
  assert.equal(poem.text, expected, `Unexpected word or line-break change: ${poem.id}`);
  const result = context.window.PoetryAnalyzer.analyze(poem.text);
  assert.equal(result.dominant, context.window.POETRY_EMOTIONS[result.dominantKeys[0]].key);
  assert.ok(result.totalHits > 0, poem.id);
  assert.ok(Math.abs(result.vec.reduce((a, b) => a + b, 0) - 1) < 1e-12, poem.id);
  for (const line of result.lines) {
    for (const hit of line.hits) {
      assert.equal(line.text.slice(hit.start, hit.end), hit.word, poem.id);
      hits++;
    }
  }
}
assert.ok(poems.find(p => p.id === 'stolen-fields').text.includes('꿈속'));
assert.ok(poems.find(p => p.id === 'mirror').text.includes('또꽤'));
assert.ok(poems.find(p => p.id === 'lamentation').text.includes('땅'));
const bedroom = poems.find(p => p.id === 'to-my-bedroom');
assert.doesNotMatch(bedroom.text, /다니로라|돌아겨려는도다/);
assert.ok(bedroom.text.includes('다니노라'));
assert.ok(bedroom.sourceUrl.includes('/poem/1082'));
const modern = JSON.parse(fs.readFileSync(path.join(root, 'data/modern-poems.json'), 'utf8'));
assert.equal(modern.length, 15);
for (const entry of modern) {
  const poem = poems.find(p => p.id === entry.id);
  assert.equal(poem.text, entry.text, entry.id);
  assert.equal(poem.edition, 'modern-reading', entry.id);
  assert.equal(poem.text.split('\n').filter(line => line.trim()).length, entry.lineCount, entry.id);
  assert.equal(poem.text.split('\n\n').length, entry.stanzaCount, entry.id);
}
const boat = poems.find(p => p.id === 'departing-boat');
assert.ok(boat.text.includes('아늑한 이 항구인들'));
assert.ok(boat.text.includes('골짜기마다'));
assert.doesNotMatch(boat.text, /안윽|비최|골잭|뫼ㅅ|주름ㅅ|어덕/);
for (const id of ['mirror', 'ogamdo-1']) {
  assert.doesNotMatch(poems.find(p => p.id === id).text, /[ \t]/, id);
}
const night = poems.find(p => p.id === 'night-train');
assert.equal(night.sectionHeadings.length, 4);
assert.equal(context.window.PoetryAnalyzer.analyze(night.text).lines.length, 36);
const analyze = context.window.PoetryAnalyzer.analyze;
const emotionName = index => context.window.POETRY_EMOTIONS[index].key;
function expectHit(text, word, key) {
  const matches = analyze(text).lines.flatMap(line => line.hits);
  assert.ok(matches.some(hit => hit.word === word && emotionName(hit.emotion) === key), text);
}
expectHit('한포기 산꽃이라도 있으면 얼마나한 위로이랴', '위로이랴', 'peace');
expectHit('모도 빼앗기는듯 한 외로움', '외로움', 'sadness');
expectHit('싸늘한 이마 맑게 트이여', '싸늘한 이마', 'peace');
expectHit('싸늘한 먼지', '싸늘한 먼지', 'sadness');
expectHit('고맙게 잘자란 보리밧아', '고맙게', 'joy');
expectHit('거륵한분로는', '분로', 'anger');
expectHit('압흐다 압흐다고 발버둥치는', '압흐다고', 'sadness');
expectHit('해야 웃지 마라', '웃지 마라', 'anger');
expectHit('죽엄이 무서우랴 힘있게 사는길을', '죽엄이 무서우랴', 'hope');
assert.equal(analyze('위로 올라간다').totalHits, 0);
assert.equal(analyze('첫닭이 울고').totalHits, 0);
assert.equal(analyze('비웃지').totalHits, 0);
assert.equal(analyze('차가운 물과 먼지').totalHits, 0);
assert.equal(analyze('그림자라고요').totalHits, 0);
expectHit('고요히', '고요', 'peace');
assert.ok(analyze('하늘이 그리워').vec[2] > 0);
assert.equal(analyze('하늘이 그리워 울음이 아니다').vec[2], 0);
assert.equal(analyze('하늘이 그리워 울음이 아니라').vec[2], 0);
for (const addition of JSON.parse(fs.readFileSync(path.join(root, 'data/emotion-lexicon-additions.json'), 'utf8')).entries) {
  assert.ok(addition.poemIds.some(id => analyze(poems.find(p => p.id === id).text).lines
    .some(line => line.hits.some(hit => hit.term === addition.term && emotionName(hit.emotion) === addition.emotion))),
  `Added expression is not detected in cited poems: ${addition.term}`);
}
const literary = context.window.POETRY_VALIDATION;
assert.equal(literary.cases.length, 3);
assert.equal(literary.currentVersion, context.window.POETRY_LEXICON_VERSION);
for (const record of literary.cases) {
  const poem = poems.find(p => p.id === record.poemId);
  assert.equal(JSON.stringify(analyze(poem.text)), JSON.stringify(record.currentResult), record.id);
  for (const line of record.evidence) assert.equal(analyze(poem.text).lines[line.no - 1].text, line.text);
  for (const field of ['reading', 'cause', 'improvement', 'status', 'remaining']) assert.ok(record[field]);
}
for (const snapshotFile of [literary.baselineSnapshot, literary.currentSnapshot]) {
  const snapshot = JSON.parse(fs.readFileSync(path.join(root, snapshotFile), 'utf8'));
  const replay = vm.createContext({ window: {} });
  for (const name of ['lexicon.js', 'analyzer.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, path.dirname(snapshotFile), name), 'utf8'), replay);
  }
  for (const sample of snapshot.cases) {
    assert.equal(JSON.stringify(replay.window.PoetryAnalyzer.analyze(sample.text)), JSON.stringify(sample.result), snapshotFile);
  }
}
const negation = literary.cases.find(record => record.id === 'negated-longing');
assert.equal(negation.beforeResult.totalHits, 7);
assert.equal(negation.currentResult.totalHits, 6);
assert.ok(negation.beforeResult.vec[2] > 0);
assert.equal(negation.currentResult.vec[2], 0);
for (const entryFile of ['index.html', 'preview/index.html']) {
  const html = fs.readFileSync(path.join(root, entryFile), 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))(?:\?v=([^\"]+))?"/g)];
  assert.equal(assets.length, 7, entryFile);
  for (const [, relative, version] of assets) {
    const bytes = fs.readFileSync(path.resolve(root, path.dirname(entryFile), relative));
    assert.equal(version, require('node:crypto').createHash('sha256').update(bytes).digest('hex').slice(0, 12), relative);
  }
}
console.log(`PASS: ${poems.length} poems; no loose Hangul Jamo; ${hits} highlight offsets; normalized emotion ratios.`);
console.log('PASS: 15 interpretations, 3 literary validation cases, both analysis snapshots replayed.');
console.log('PASS: submission metadata, category definitions and minimum terms, published assets and cache versions.');
