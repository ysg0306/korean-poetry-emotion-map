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
      svgNode('desc', { id: id + '-desc' }, '방사형 막대. 안쪽 원 0%, 바깥 원 100%, 눈금 간격 25%. 막대 길이가 감정 비율입니다. ' +
        emotions.map((emotion, i) => emotion.name + ' ' + (result.vec[i] * 100).toFixed(1) + '%').join(', ')));
    const cx = 180, cy = 166, radius = 96, innerRadius = 24;
    const distance = value => innerRadius + (radius - innerRadius) * value;
    const point = (i, distance) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / emotions.length;
      return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
    };
    [0, 0.25, 0.5, 0.75, 1].forEach(scale => {
      chart.append(svgNode('circle', { cx, cy, r: distance(scale), class: 'radar-grid' }));
    });
    emotions.forEach((_, i) => {
      const [x, y] = point(i, radius);
      const [sx, sy] = point(i, innerRadius);
      chart.append(svgNode('line', { x1: sx, y1: sy, x2: x, y2: y, class: 'radial-track' }));
    });
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      chart.append(svgNode('text', { x: cx + distance(scale) * 0.383 + 3,
        y: cy - distance(scale) * 0.924 - 2, class: 'radar-tick' }, scale * 100 + '%'));
    });
    chart.append(svgNode('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'radial-zero' }, '0%'));
    emotions.forEach((emotion, i) => {
      const [x, y] = point(i, distance(result.vec[i]));
      if (result.vec[i] > 0) {
        const [sx, sy] = point(i, innerRadius);
        const bar = svgNode('line', { x1: sx, y1: sy, x2: x, y2: y,
          stroke: emotion.color, class: 'radial-bar', 'data-value': result.vec[i] });
        bar.append(svgNode('title', {}, emotion.name + ' ' + (result.vec[i] * 100).toFixed(1) + '%'));
        chart.append(bar);
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
