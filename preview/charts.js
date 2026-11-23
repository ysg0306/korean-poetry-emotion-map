'use strict';

window.PoetryCharts = (() => {
  const ns = 'http://www.w3.org/2000/svg';
  let chartId = 0;
  function svgNode(tag, attributes, text) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes || {}).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderRadar(target, result, label) {
    target.replaceChildren();
    if (!result || !result.totalHits) {
      const message = document.createElement('p');
      message.className = 'caption';
      message.textContent = '감지된 감정 시어가 없어 프로필을 그릴 수 없습니다.';
      target.append(message);
      return;
    }
    const emotions = window.POETRY_EMOTIONS;
    const id = 'emotion-radar-' + ++chartId;
    const chart = svgNode('svg', { viewBox: '0 0 360 340', role: 'img',
      'aria-labelledby': id + '-title ' + id + '-desc', class: 'radar-chart' });
    chart.append(svgNode('title', { id: id + '-title' }, label + ' 감정 프로필'),
      svgNode('desc', { id: id + '-desc' }, '중심 0%, 바깥선 100%, 눈금 간격 25%. ' +
        emotions.map((emotion, i) => emotion.name + ' ' + (result.vec[i] * 100).toFixed(1) + '%').join(', ')));
    const cx = 180, cy = 166, radius = 96;
    const point = (i, distance) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / emotions.length;
      return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
    };
    const points = scale => emotions.map((_, i) => point(i, radius * scale).join(',')).join(' ');
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      chart.append(svgNode('polygon', { points: points(scale), class: 'radar-grid' }));
    });
    emotions.forEach((_, i) => {
      const [x, y] = point(i, radius);
      chart.append(svgNode('line', { x1: cx, y1: cy, x2: x, y2: y, class: 'radar-spoke' }));
    });
    chart.append(svgNode('polygon', { points: emotions.map((_, i) => point(i, radius * result.vec[i]).join(',')).join(' '),
      class: 'radar-profile' }));
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      chart.append(svgNode('text', { x: cx + radius * scale * 0.383 + 4,
        y: cy - radius * scale * 0.924 - 2, class: 'radar-tick' }, scale * 100 + '%'));
    });
    emotions.forEach((emotion, i) => {
      const [x, y] = point(i, radius * result.vec[i]);
      if (result.vec[i] > 0) {
        const dot = svgNode('circle', { cx: x, cy: y, r: 3.5, fill: emotion.color, class: 'radar-point' });
        dot.append(svgNode('title', {}, emotion.name + ' ' + (result.vec[i] * 100).toFixed(1) + '%'));
        chart.append(dot);
      }
      const [lx, ly] = point(i, 132);
      const axis = svgNode('text', { x: lx, y: ly - 5, 'text-anchor': 'middle', class: 'radar-axis' });
      axis.append(svgNode('tspan', { x: lx }, emotion.name),
        svgNode('tspan', { x: lx, dy: 20, class: 'radar-value' }, (result.vec[i] * 100).toFixed(1) + '%'));
      chart.append(axis);
    });
    target.append(chart);
  }
  return { renderRadar };
})();
