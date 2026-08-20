let activeDayIndex = 0;
let chartDays = [];

function renderDayTabs(days) {
  chartDays = days;
  const container = document.getElementById('day-tabs');
  const dow = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  container.innerHTML = days.map((day, i) => {
    const t = day[0].t;
    const isActive = i === activeDayIndex;
    return `<div class="day-tab ${isActive ? 'active' : ''}" data-index="${i}">
      <div class="dow">${dow[t.getDay()]}</div>
      <div class="date">${t.getDate()}</div>
    </div>`;
  }).join('');
  container.querySelectorAll('.day-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeDayIndex = parseInt(tab.dataset.index);
      renderDayTabs(chartDays);
      document.getElementById('hourly').innerHTML = renderDayChart(chartDays[activeDayIndex]);
    });
  });
}

function renderDayChart(dayData) {
  if (!dayData || !dayData.length) return '';
  const pts = dayData.filter((_, i) => i % 3 === 0);
  if (!pts.length) return '';
  const W = 800, H = 320;
  const pad = { l: 56, r: 24, t: 32, b: 82 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const x = i => pad.l + (i / (pts.length - 1)) * cw;
  const y = v => pad.t + ch - (v / 100) * ch;
  const points = pts.map((d, i) => ({ x: x(i), y: y(d.score) }));

  let lineD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    lineD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  const areaD = lineD + ` L ${points[points.length - 1].x.toFixed(1)} ${pad.t + ch} L ${points[0].x.toFixed(1)} ${pad.t + ch} Z`;

  let grid = '', yLabels = '';
  [0, 25, 50, 75, 100].forEach(t => {
    const yy = y(t);
    grid += `M ${pad.l} ${yy} L ${pad.l + cw} ${yy} `;
    yLabels += `<text x="${pad.l - 12}" y="${yy + 7}" text-anchor="end" fill="#94a3b8" font-size="22" font-weight="500">${t}</text>`;
  });

  let circles = '', xLabels = '';
  pts.forEach((d, i) => {
    const px = points[i].x, py = points[i].y;
    const col = scoreCol(d.score);
    circles += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8" fill="${col}" stroke="#0f172a" stroke-width="3"/>`;
    xLabels += `<text x="${px.toFixed(1)}" y="${H - 28}" text-anchor="middle" fill="#94a3b8" font-size="22" font-weight="500">${String(d.hour).padStart(2, '0')}:00</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;">
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#ef4444" stop-opacity="0.35"/>
        <stop offset="25%" stop-color="#f97316" stop-opacity="0.30"/>
        <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.25"/>
        <stop offset="75%" stop-color="#84cc16" stop-opacity="0.20"/>
        <stop offset="100%" stop-color="#22c55e" stop-opacity="0.15"/>
      </linearGradient>
    </defs>
    <path d="${grid}" stroke="rgba(255,255,255,0.08)" stroke-width="1" fill="none"/>
    ${yLabels}
    <path d="${areaD}" fill="url(#areaGrad)"/>
    <path d="${lineD}" stroke="#e2e8f0" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${circles}
    ${xLabels}
  </svg>`;
}
