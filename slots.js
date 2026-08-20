function findSlots(hourly) {
  const slots = []; let cur = null, scores = [], idx = -1;
  for (let h of hourly) { idx++;
    if (h.score >= 60) { if (!cur) cur = h; scores.push(h.score); }
    else {
      if (cur && scores.length >= 3) {
        slots.push({ s: cur, e: hourly[idx - 1], avg: scores.reduce((a, b) => a + b, 0) / scores.length, max: Math.max(...scores), dur: scores.length, date: cur.day });
      }
      cur = null; scores = [];
    }
  }
  if (cur && scores.length >= 3) {
    slots.push({ s: cur, e: hourly[hourly.length - 1], avg: scores.reduce((a, b) => a + b, 0) / scores.length, max: Math.max(...scores), dur: scores.length, date: cur.day });
  }
  return slots.sort((a, b) => a.s.t - b.s.t).slice(0, 5);
}

function renderSlots(slots) {
  const el = document.getElementById('slots-list');
  el.innerHTML = slots.map((sl, i) => {
    const c = scoreCol(sl.avg);
    const peakC = scoreCol(sl.max);
    return `<div class="slot-card">
      <div class="slot-info">
        <div class="slot-num" style="background:${c}">${i + 1}</div>
        <div>
          <div class="slot-date">${sl.date}</div>
          <div class="slot-time">${String(sl.s.hour).padStart(2, '0')}:00 – ${String(sl.e.hour).padStart(2, '0')}:00</div>
          <div class="slot-dur">${sl.dur} ч · пик <span class="slot-peak" style="color:${peakC}">${sl.max.toFixed(0)}%</span></div>
        </div>
      </div>
      <div class="slot-score">
        <div class="val" style="color:${c}">${sl.avg.toFixed(1)}%</div>
        <div class="txt">${scoreLbl(sl.avg)}</div>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--text-2);font-size:13px;padding:8px">Хороших слотов не найдено</div>';
}
