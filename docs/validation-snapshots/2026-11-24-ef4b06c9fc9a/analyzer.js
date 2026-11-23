'use strict';

// The frequency vector describes dictionary matches, not model confidence.
window.PoetryAnalyzer = (() => {
  const emotions = window.POETRY_EMOTIONS;
  const patterns = new Map();
  emotions.forEach((emotion, index) => emotion.entries.forEach(entry => {
    new Set([...(entry.matchTerm === false ? [] : [entry.term]), ...(entry.patterns || [])]).forEach(pattern => {
      if (patterns.has(pattern) && patterns.get(pattern).term !== entry.term) {
        throw new Error('시어 패턴 중복: ' + pattern);
      }
      patterns.set(pattern, { emotion: index, term: entry.term, rationale: entry.rationale || '',
        excludeBefore: entry.excludeBefore ? new RegExp(entry.excludeBefore) : null,
        excludeAfter: entry.excludeAfter ? new RegExp(entry.excludeAfter) : null });
    });
  }));
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const source = [...patterns.keys()].sort((a, b) => b.length - a.length).map(escape).join('|');

  function analyze(text) {
    const totals = emotions.map(() => 0);
    const lexemes = new Set();
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(line => line.trim()).map((text, index) => {
      const counts = emotions.map(() => 0);
      const hits = [...text.matchAll(new RegExp(source, 'g'))].filter(match => {
        const entry = patterns.get(match[0]);
        return !(entry.excludeBefore && entry.excludeBefore.test(text.slice(0, match.index))) &&
          !(entry.excludeAfter && entry.excludeAfter.test(text.slice(match.index + match[0].length)));
      }).map(match => {
        const entry = patterns.get(match[0]);
        totals[entry.emotion]++;
        counts[entry.emotion]++;
        lexemes.add(entry.term);
        return { word: match[0], term: entry.term, emotion: entry.emotion, rationale: entry.rationale, start: match.index, end: match.index + match[0].length };
      });
      return { no: index + 1, text, counts, hits };
    });
    const totalHits = totals.reduce((sum, value) => sum + value, 0);
    const maximum = Math.max(...totals);
    return {
      lines, totalHits, uniqueLexemes: lexemes.size,
      matchedLineCount: lines.filter(line => line.hits.length).length,
      vec: totals.map(value => totalHits ? value / totalHits : 0),
      dominantKeys: maximum ? totals.flatMap((value, index) => value === maximum ? [index] : []) : [],
      method: 'lexicon', lexiconVersion: window.POETRY_LEXICON_VERSION
    };
  }

  function similarity(a, b) {
    const norm = vector => Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    const denominator = norm(a) * norm(b);
    return denominator ? Math.max(0, Math.min(1, a.reduce((sum, value, index) => sum + value * b[index], 0) / denominator)) : 0;
  }
  return { analyze, similarity };
})();
