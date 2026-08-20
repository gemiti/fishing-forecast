function degToDir(d) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return d == null ? 'calm' : dirs[Math.round(d / 45) % 8];
}

function scoreCol(s) {
  if (s >= 80) return '#22c55e';
  if (s >= 60) return '#84cc16';
  if (s >= 40) return '#f59e0b';
  if (s >= 20) return '#f97316';
  return '#ef4444';
}

function scoreLbl(s) {
  if (s >= 80) return 'Отличный';
  if (s >= 60) return 'Хороший';
  if (s >= 40) return 'Средний';
  if (s >= 20) return 'Слабый';
  return 'Почти нет';
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function groupByDay(hourly) {
  const m = {};
  hourly.forEach(h => { if (!m[h.day]) m[h.day] = []; m[h.day].push(h); });
  return Object.values(m);
}
