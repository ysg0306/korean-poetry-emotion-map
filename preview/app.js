'use strict';

const poems = window.POETRY_POEMS;
const emotions = window.POETRY_EMOTIONS;
const { analyze, similarity } = window.PoetryAnalyzer;
const { renderRadar } = window.PoetryCharts;
const $ = id => document.getElementById(id);
const results = poems.map(poem => poem.textReady ? analyze(poem.text) : null);
let selected = 0;

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
function link(label, url) {
  const node = el('a', '', label);
  node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer';
  return node;
}
function notice(target, message) { target.replaceChildren(el('p', 'caption', message)); }
function page(id) {
  document.querySelectorAll('main > section').forEach(s => s.classList.toggle('hidden', s.id !== id));
  document.querySelectorAll('nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.page === id);
    b.setAttribute('aria-current', b.dataset.page === id ? 'page' : 'false');
  });
}
document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => page(b.dataset.page)));

function renderBars(target, result) {
  target.replaceChildren();
  emotions.forEach((emotion, i) => {
    const item = el('div'), label = el('div', 'bar-label');
    label.append(el('span', '', emotion.name), el('span', '', result ? (result.vec[i] * 100).toFixed(1) + '%' : '—'));
    const track = el('div', 'track'), fill = el('div', 'fill');
    fill.style.width = (result ? result.vec[i] * 100 : 0) + '%';
    fill.style.background = emotion.color;
    track.append(fill); item.append(label, track); target.append(item);
  });
}
function stats(r) {
  return '감지 ' + r.totalHits + '회 · 대표 시어 ' + r.uniqueLexemes + '개 · ' + r.matchedLineCount + '/' + r.lines.length + '행';
}
function chooseLine(i) {
  document.querySelectorAll('.verse').forEach((v, no) => v.classList.toggle('selected', no === i));
  const line = results[selected].lines[i];
  $('evidence').textContent = line.no + '행 · ' + (line.hits.length
    ? line.hits.map(h => h.word + ' → ' + emotions[h.emotion].name + (h.rationale ? ' (' + h.rationale + ')' : '')).join(' / ')
    : '감지된 감정 시어가 없습니다.');
}
function keyboardButton(node, action) {
  node.tabIndex = 0; node.setAttribute('role', 'button');
  node.addEventListener('click', action);
  node.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); action(); }
  });
}
function renderPoem(poem, r) {
  $('lines').replaceChildren();
  if (!r) return notice($('lines'), '이 작품의 원문을 확인하고 있습니다. 확인하지 않은 본문을 임의로 넣지 않습니다.');
  let index = 0;
  poem.text.replace(/\r\n?/g, '\n').split('\n').forEach(text => {
    if (!text.trim()) { $('lines').append(el('div', 'stanza-break')); return; }
    const lineIndex = index++, line = r.lines[lineIndex], verse = el('div', 'verse');
    const heading = (poem.sectionHeadings || []).find(item => item.line === line.no);
    if (heading) $('lines').append(el('div', 'poem-section-heading', heading.label));
    verse.setAttribute('aria-label', line.no + '행 감지 근거 보기');
    verse.append(el('span', 'no', String(line.no).padStart(2, '0')));
    const content = el('span'); let offset = 0;
    line.hits.forEach(hit => {
      content.append(document.createTextNode(text.slice(offset, hit.start)));
      const mark = el('mark', '', text.slice(hit.start, hit.end));
      mark.style.setProperty('--accent', emotions[hit.emotion].color);
      mark.title = emotions[hit.emotion].name + ' · 대표 시어: ' + hit.term + (hit.rationale ? '\n' + hit.rationale : '');
      content.append(mark); offset = hit.end;
    });
    content.append(document.createTextNode(text.slice(offset))); verse.append(content);
    keyboardButton(verse, () => chooseLine(lineIndex)); $('lines').append(verse);
  });
  if (poem.postscript) $('lines').append(el('p', 'poem-postscript', poem.postscript));
}
function renderFlow(r, target = $('flow'), legendTarget = $('legend'), onSelect = chooseLine) {
  target.replaceChildren(); legendTarget.replaceChildren();
  if (!r) return notice(target, '원문 확인 후 행별 분석을 표시합니다.');
  const maximum = Math.max(1, ...r.lines.map(l => l.hits.length));
  const tickStep = Math.max(1, Math.ceil(maximum / 4));
  const axisMaximum = Math.ceil(maximum / tickStep) * tickStep;
  const plotHeight = 160;
  const axis = el('div', 'flow-axis');
  const viewport = el('div', 'flow-scroll');
  const plot = el('div', 'flow-plot');
  axis.setAttribute('aria-hidden', 'true');
  for (let value = 0; value <= axisMaximum; value += tickStep) {
    const position = (1 - value / axisMaximum) * 100 + '%';
    const tick = el('span', 'flow-tick', value);
    tick.style.top = position;
    axis.append(tick);
    const gridline = el('div', 'flow-gridline');
    gridline.style.top = position;
    gridline.setAttribute('aria-hidden', 'true');
    plot.append(gridline);
  }
  viewport.append(plot);
  target.append(el('div', 'flow-axis-title', '감지 수 (회)'), axis, viewport,
    el('div', 'flow-x-title', '행 번호'));
  r.lines.forEach((line, index) => {
    const col = el('div', 'column');
    col.setAttribute('aria-label', line.no + '행: ' + line.hits.length + '회 감지');
    col.title = line.no + '행 · ' + line.hits.length + '회 감지';
    line.counts.forEach((count, key) => {
      const bar = el('i'); bar.style.height = count / axisMaximum * plotHeight + 'px';
      bar.style.background = emotions[key].color; col.append(bar);
    });
    col.append(el('span', '', line.no)); keyboardButton(col, () => onSelect(index)); plot.append(col);
  });
  emotions.forEach((emotion, i) => {
    if (!r.vec[i]) return;
    const legend = el('span'), color = el('b'); color.style.background = emotion.color;
    legend.append(color, document.createTextNode(emotion.name)); legendTarget.append(legend);
  });
}
function renderRecommendations(target, r, excluded) {
  target.replaceChildren();
  const ranked = r && r.totalHits ? poems.map((poem, i) => ({ poem, i, r: results[i] }))
    .filter(x => !excluded.includes(x.poem.id) && x.r && x.r.totalHits)
    .map(x => ({ ...x, score: similarity(r.vec, x.r.vec) }))
    .sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 3) : [];
  if (!ranked.length) return notice(target, '감정 시어가 감지되지 않거나 비교할 원문이 없어 추천을 계산할 수 없습니다.');
  ranked.forEach(item => {
    const button = el('button', 'rec');
    button.append(el('span', 'score', Math.round(item.score * 100) + '%'),
      el('strong', '', item.poem.title), el('small', '', item.poem.poet));
    button.addEventListener('click', () => select(item.i)); target.append(button);
  });
  if (ranked.every(x => !x.score)) target.append(el('p', 'caption', '공통으로 감지된 감정 범주가 없어 유사 추천의 근거가 없습니다.'));
}

function select(index) {
  selected = index; page('read');
  const poem = poems[index], r = results[index];
  $('title').textContent = poem.title;
  $('page-number').textContent = String(index + 1).padStart(2, '0') + ' / ' + poems.length;
  $('byline').textContent = poem.poet + ' · ' + poem.year + '년 · 시인 사망 ' + poem.poetDeath + '년';
  document.querySelectorAll('.book').forEach((b, no) => {
    b.classList.toggle('active', no === index); b.setAttribute('aria-pressed', no === index ? 'true' : 'false');
  });
  $('source').replaceChildren();
  if (poem.source && poem.sourceUrl) {
    $('source').append(document.createTextNode('본문 출처: '), link(poem.source, poem.sourceUrl));
    if (poem.displayNote) $('source').append(el('p', '', poem.displayNote));
    if (poem.textNotes) $('source').append(el('p', '', poem.textNotes));
    if (poem.verificationSourceUrls && poem.verificationSourceUrls.length) {
      const refs = el('p', '', '대조 자료: ');
      poem.verificationSourceUrls.forEach((url, i) => {
        if (i) refs.append(document.createTextNode(' · '));
        refs.append(link(String(i + 1), url));
      });
      $('source').append(refs);
    }
  } else $('source').append(document.createTextNode('본문 출처 확인 중'));
  $('source').append(el('p', '', '발표·수록 기록: ' + poem.bibliographicReference));
  if (poem.metadataSourceUrls[0]) $('source').append(link('작품 서지 정보', poem.metadataSourceUrls[0]));
  $('theme').textContent = poem.theme || '작품별 해석 준비 중';
  $('interp').textContent = poem.interp || '선정 작품의 실제 본문을 기준으로 주제와 해석을 별도로 작성할 예정입니다.';
  $('interpretation-emotions').textContent = '해석에서 읽은 정서 · ' + (poem.interpretationEmotionKeys || [])
    .map(key => emotions.find(emotion => emotion.key === key).name).join(' · ');
  $('interpretation-evidence').replaceChildren();
  (poem.interpretationEvidence || []).forEach(line => $('interpretation-evidence')
    .append(el('p', '', line.no + '행 · ' + line.text)));
  const references = poem.interpretationReferences || [];
  references.forEach(ref => $('interpretation-evidence').append(link(ref.title, ref.url)));
  if (!references.length) $('interpretation-evidence').append(el('p', 'caption', '별도 해설을 인용하지 않고 수록 본문을 바탕으로 구성한 해석입니다.'));
  $('dominant').replaceChildren();
  if (r && r.totalHits) $('dominant').append(document.createTextNode(r.dominantKeys.map(k => emotions[k].name).join(' · ')),
    el('span', '', (Math.max(...r.vec) * 100).toFixed(1) + '%'));
  else $('dominant').textContent = r ? '감지 시어 없음' : '원문 확인 중';
  renderBars($('bars'), r);
  renderRadar($('radar'), r, poem.title);
  $('stats').textContent = r ? stats(r) : '원문이 없는 상태에서 분석 수치를 만들지 않습니다.';
  renderPoem(poem, r); renderFlow(r);
  $('evidence').textContent = '본문이나 차트의 한 행을 선택해 감지 근거를 확인하세요.';
  renderRecommendations($('recs'), r, [poem.id]); $('lines').scrollTop = 0;
}
$('library-count').textContent = poems.length;
poems.forEach((poem, i) => {
  const button = el('button', 'book');
  button.append(el('strong', '', poem.title), el('small', '', poem.poet + ' · ' + poem.year));
  button.addEventListener('click', () => select(i)); $('shelf').append(button);
});
const header = $('heatmap').createTHead().insertRow();
['작품', ...emotions.map(e => e.name)].forEach(text => header.append(el('th', '', text)));
const body = $('heatmap').createTBody();
poems.forEach((poem, i) => {
  const row = body.insertRow(), button = el('button', 'poem-link', poem.title + ' · ' + poem.poet);
  button.addEventListener('click', () => select(i)); row.insertCell().append(button);
  const r = results[i];
  emotions.forEach((emotion, key) => {
    const cell = row.insertCell(); cell.textContent = r ? (r.vec[key] * 100).toFixed(1) + '%' : '확인 중';
    if (r) cell.style.background = emotion.color + Math.round(20 + r.vec[key] * 180).toString(16).padStart(2, '0');
  });
});
function renderValidation() {
  const data = window.POETRY_VALIDATION;
  $('validation-cases').replaceChildren();
  data.cases.forEach(item => {
    const card = el('article', 'panel validation-case');
    card.dataset.case = item.id;
    card.append(el('p', 'validation-poem', item.titleOfPoem + ' · ' + item.poet), el('h3', '', item.title));
    const summary = el('div', 'validation-summary');
    summary.append(el('p', '', '현재 계산 정서 · ' + item.currentResult.dominantKeys.map(k => emotions[k].name).join(' · ')),
      el('p', '', '해석에서 읽은 정서 · ' + item.interpretationEmotionKeys.map(k => emotions.find(e => e.key === k).name).join(' · ')));
    card.append(summary);
    const table = el('table', 'validation-ratios'), head = table.createTHead().insertRow();
    ['감정', '보완 전', '현재'].forEach(label => head.append(el('th', '', label)));
    const tbody = table.createTBody();
    emotions.forEach((emotion, i) => {
      const row = tbody.insertRow();
      row.append(el('th', '', emotion.name));
      row.insertCell().textContent = (item.beforeResult.vec[i] * 100).toFixed(1) + '%';
      row.insertCell().textContent = (item.currentResult.vec[i] * 100).toFixed(1) + '%';
    });
    card.append(table, el('p', 'caption', '감지 횟수 ' + item.beforeResult.totalHits + '회 → ' + item.currentResult.totalHits + '회 · 감지 표현의 빈도 비율입니다.'));
    const evidence = el('details', 'validation-evidence');
    evidence.append(el('summary', '', '실제 시구와 감지 근거'));
    item.evidence.forEach(line => {
      evidence.append(el('blockquote', '', line.no + '행 · ' + line.text));
      const describe = hits => hits.length ? hits.map(h => h.word + ' (' + emotions[h.emotion].name + ')').join(', ') : '감지 없음';
      evidence.append(el('p', 'caption', '보완 전: ' + describe(line.beforeHits)), el('p', 'caption', '현재: ' + describe(line.currentHits)));
    });
    card.append(evidence);
    [['문학적 해석', item.reading], ['차이가 생긴 이유', item.cause], ['개선 방법', item.improvement],
      ['적용 상태', item.status], ['남은 한계', item.remaining]].forEach(([label, text]) => card.append(el('h4', '', label), el('p', '', text)));
    const version = el('details', 'validation-evidence');
    version.append(el('summary', '', '분석 버전과 재현 기록'), el('p', '', '보완 전: ' + data.beforeVersion),
      el('p', '', '현재: ' + data.currentVersion), el('p', '', '동일한 시 본문으로 비교했습니다. 정확한 입력·결과·사전·분석 코드는 프로젝트의 docs/validation-snapshots에 보관했습니다.'));
    card.append(version, link('본문 출처', item.sourceUrl));
    item.interpretationReferences.forEach(ref => card.append(link('해석 참고 · ' + ref.title, ref.url)));
    const button = el('button', 'primary', '작품과 비교하기');
    button.addEventListener('click', () => select(poems.findIndex(poem => poem.id === item.poemId)));
    card.append(button); $('validation-cases').append(card);
  });
}
renderValidation();
$('analyze').addEventListener('click', () => {
  const text = $('own').value.trim(), target = $('own-result'); target.replaceChildren();
  if (!text) return notice(target, '먼저 분석할 시 본문을 입력해 주세요.');
  const r = analyze(text);
  if (!r.totalHits) return notice(target, '감지된 감정 시어가 없습니다. 사전에 없는 표현은 분석되지 않을 수 있습니다.');
  const radarContainer = el('div', 'input-radar'); renderRadar(radarContainer, r, '입력한 시');
  const barContainer = el('div', 'bars'); renderBars(barContainer, r);
  target.append(radarContainer, el('p', 'caption radar-caption', '중심 0% · 바깥선 100% · 눈금 간격 25%'),
    barContainer, el('p', '', stats(r)), el('p', '', r.lines.flatMap(l => l.hits.map(h => h.word + '(' + emotions[h.emotion].name + ')')).join(', ')));
  const ownFlow = el('div', 'flow'), ownLegend = el('div', 'legend');
  ownFlow.id = 'own-flow';
  ownFlow.setAttribute('aria-label', '입력한 시의 행별 감정 감지 수');
  const ownEvidence = el('div', 'evidence', '막대를 누르면 해당 행의 감지 근거가 보입니다.');
  ownEvidence.id = 'own-evidence';
  ownEvidence.setAttribute('aria-live', 'polite');
  renderFlow(r, ownFlow, ownLegend, index => {
    const line = r.lines[index];
    ownEvidence.textContent = line.no + '행 · ' + line.text + ' — ' + (line.hits.length
      ? line.hits.map(h => h.word + ' → ' + emotions[h.emotion].name).join(' / ')
      : '감지된 감정 시어가 없습니다.');
  });
  target.append(el('h4', '', '행을 따라 흐르는 감정'),
    el('p', 'caption', '높이는 감지 횟수입니다. 막대를 누르면 해당 행의 근거가 보입니다.'),
    ownFlow, ownLegend, ownEvidence);
  const ownRows = el('div', 'input-lines');
  r.lines.forEach(l => ownRows.append(el('p', '', l.no + '행: ' + l.text + ' — ' + (l.hits.map(h => h.word + '(' + emotions[h.emotion].name + ')').join(', ') || '감지 없음'))));
  target.append(ownRows);
  const norm = value => value.replace(/\r\n?/g, '\n').trim();
  const same = poems.filter(p => p.text && norm(p.text) === norm(text));
  if (same.length) target.append(el('p', '', '본문 일치 작품: ' + same.map(p => p.title).join(', ')));
  const recs = el('div', 'recommendations'); renderRecommendations(recs, r, same.map(p => p.id));
  target.append(el('h4', '', '비슷한 감성의 수록 시'), recs);
});
select(0);
