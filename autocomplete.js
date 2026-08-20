let selectedGeo = null;
let activeSuggestionIndex = -1;

async function suggestCity(query) {
  const box = document.getElementById('suggestions');
  if (!query || query.length < 2) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = '<div class="suggestion-loading">Поиск…</div>';
  activeSuggestionIndex = -1;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=ru`;
    const r = await fetch(url);
    const d = await r.json();
    if (!d.results || !d.results.length) { box.innerHTML = '<div class="suggestion-empty">Ничего не найдено</div>'; return; }
    renderSuggestions(d.results);
  } catch (e) { box.classList.add('hidden'); }
}

function renderSuggestions(results) {
  const box = document.getElementById('suggestions');
  box.innerHTML = results.map((x, i) => {
    const meta = [x.admin1, x.country].filter(Boolean).join(', ');
    return `<div class="suggestion-item" data-index="${i}" data-json="${encodeURIComponent(JSON.stringify(x))}">
      <div><div class="suggestion-name">${x.name}</div><div class="suggestion-meta">${meta}</div></div>
      <div class="suggestion-meta">${x.latitude.toFixed(2)}, ${x.longitude.toFixed(2)}</div>
    </div>`;
  }).join('');
  box.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => { selectCity(JSON.parse(decodeURIComponent(el.dataset.json))); });
    el.addEventListener('mouseenter', () => { activeSuggestionIndex = parseInt(el.dataset.index); updateActiveSuggestion(); });
  });
}

function updateActiveSuggestion() {
  document.getElementById('suggestions').querySelectorAll('.suggestion-item').forEach((el, i) => {
    el.classList.toggle('active', i === activeSuggestionIndex);
  });
}

function selectCity(result) {
  selectedGeo = result;
  document.getElementById('city').value = result.name;
  document.getElementById('suggestions').classList.add('hidden');
  activeSuggestionIndex = -1;
  run();
}

function hideSuggestions() {
  document.getElementById('suggestions').classList.add('hidden');
  activeSuggestionIndex = -1;
}

function initAutocomplete() {
  const input = document.getElementById('city');
  const debouncedSuggest = debounce(suggestCity, 300);
  input.addEventListener('input', () => { selectedGeo = null; debouncedSuggest(input.value.trim()); });
  input.addEventListener('keydown', (e) => {
    const box = document.getElementById('suggestions');
    const items = box.querySelectorAll('.suggestion-item');
    if (box.classList.contains('hidden') || !items.length) { if (e.key === 'Enter') { e.preventDefault(); run(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length; updateActiveSuggestion(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length; updateActiveSuggestion(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) selectCity(JSON.parse(decodeURIComponent(items[activeSuggestionIndex].dataset.json)));
      else if (items.length) selectCity(JSON.parse(decodeURIComponent(items[0].dataset.json)));
    }
    else if (e.key === 'Escape') { hideSuggestions(); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrap')) hideSuggestions(); });
}
