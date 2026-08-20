async function handleGeolocation() {
  if (!navigator.geolocation) {
    alert('Геолокация не поддерживается браузером');
    return;
  }
  document.getElementById('btn').disabled = true;
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('loading').textContent = 'Определяем местоположение…';
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const geo = await reverseGeo(lat, lon);
      selectedGeo = geo;
      document.getElementById('city').value = geo.name;
      document.getElementById('loading').textContent = 'Получаем погоду…';
      run();
    },
    (err) => {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('btn').disabled = false;
      document.getElementById('error').textContent = 'Не удалось определить местоположение: ' + (err.message || 'доступ запрещён');
      document.getElementById('error').classList.remove('hidden');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
}

async function run() {
  const city = document.getElementById('city').value.trim();
  if (!city && !selectedGeo) return;
  document.getElementById('btn').disabled = true;
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  try {
    let g = selectedGeo;
    if (!g) g = await geo(city);
    if (!g) throw new Error('Город не найден');
    const w = await weather(g.latitude, g.longitude);
    const allHourly = calcHourly(w);
    if (!allHourly.length) throw new Error('Нет данных');

    const now = new Date(); now.setMinutes(0, 0, 0);
    const nowSlot = allHourly.find(h => h.hour === now.getHours() && h.day === `${now.getDate()}/${String(now.getMonth() + 1).padStart(2, '0')}`) || allHourly[0];
    const score = nowSlot.score;
    const col = scoreCol(score);
    const locName = [g.name, g.admin1, g.country].filter(Boolean).join(', ');
    document.getElementById('location-name').textContent = locName;
    document.getElementById('score-pct').textContent = score.toFixed(1) + '%';
    document.getElementById('score-pct').style.color = col;
    document.getElementById('score-label').textContent = scoreLbl(score);
    document.getElementById('score-bar').style.width = score + '%';
    document.getElementById('score-bar').style.background = col;
    const updateTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('weather-grid').innerHTML = `<div>Давление: <span>${nowSlot.meta.p} мм</span></div><div>Температура: <span>${nowSlot.meta.temp}°C</span></div><div>Ветер: <span>${nowSlot.meta.wind} ${nowSlot.meta.ws} м/с</span></div><div>Облачность: <span>${nowSlot.meta.cc}%</span></div><div>Осадки: <span>${nowSlot.meta.pr} мм/ч</span></div><div>Обновлено: <span>${updateTime}</span></div>`;

    const futureHourly = allHourly.filter(h => h.t >= now);
    const slots = findSlots(futureHourly);
    renderSlots(slots);

    const days = groupByDay(allHourly).slice(1, 6);
    activeDayIndex = 0;
    renderDayTabs(days);
    document.getElementById('hourly').innerHTML = renderDayChart(days[0]);

    document.getElementById('result').classList.remove('hidden');
  } catch (e) {
    document.getElementById('error').textContent = e.message;
    document.getElementById('error').classList.remove('hidden');
  }
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('btn').disabled = false;
  selectedGeo = null;
}

document.addEventListener('DOMContentLoaded', () => {
  initAutocomplete();
});
