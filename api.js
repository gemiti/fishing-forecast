async function geo(city, preferredCountry = 'RU') {
  let url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=ru`;
  let r = await fetch(url);
  let d = await r.json();
  if (!d.results || !d.results.length) {
    url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city + ', ' + preferredCountry)}&count=10&language=ru`;
    r = await fetch(url);
    d = await r.json();
    if (!d.results || !d.results.length) return null;
  }
  const inCountry = d.results.filter(x => x.country_code === preferredCountry).sort((a, b) => (b.population || 0) - (a.population || 0));
  if (inCountry.length) return inCountry[0];
  return d.results[0];
}

async function weather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,weather_code&hourly=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,weather_code&timezone=auto&past_days=1&forecast_days=5`;
  const r = await fetch(url);
  return r.json();
}


async function reverseGeo(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ru`;
    const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'FishingForecastPWA/1.0' } });
    const d = await r.json();
    if (d && d.address) {
      const a = d.address;
      const name = a.city || a.town || a.village || a.hamlet || a.county || 'Текущее местоположение';
      const region = a.state || a.region || '';
      const country = a.country || '';
      return {
        name: name,
        admin1: region,
        country: country,
        country_code: a.country_code ? a.country_code.toUpperCase() : '',
        latitude: lat,
        longitude: lon
      };
    }
  } catch (e) { console.error('Reverse geo failed', e); }
  return {
    name: 'Моё местоположение',
    admin1: '',
    country: '',
    country_code: '',
    latitude: lat,
    longitude: lon
  };
}
