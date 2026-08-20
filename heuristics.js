function windCat(dir, spd) {
  if (spd < 1) return 'calm';
  if (spd <= 4) return (dir == 'S' || dir == 'SW' || dir == 'W') ? 'light_breeze' : 'cold_dir';
  if (spd <= 6) return 'moderate_warm';
  if (spd <= 10) return 'strong';
  return 'storm';
}

function precipCat(mm, wc) {
  if ([95, 96, 99].includes(wc)) return 'heavy_rain';
  if ([71, 73, 75, 77, 85, 86].includes(wc)) return 'sleet';
  if ([66, 67].includes(wc)) return 'sleet';
  if ([56, 57].includes(wc)) return 'light_rain';
  if ([51, 53, 55].includes(wc)) return 'light_rain';
  if ([61, 80].includes(wc)) return 'light_rain';
  if ([63, 65, 81, 82].includes(wc)) return 'heavy_rain';
  if (mm > 5) return 'heavy_rain';
  if (mm > 0.5) return 'light_rain';
  if ([45, 48].includes(wc)) return 'fog';
  if ([0, 1].includes(wc)) return 'clear_calm';
  if ([2, 3].includes(wc)) return 'partly_cloudy';
  return 'overcast';
}

function cloudCat(pct, pc) {
  if (['light_rain', 'heavy_rain', 'sleet'].includes(pc)) return pc;
  if (pct < 20) return 'clear_calm';
  if (pct < 60) return 'partly_cloudy';
  return 'overcast';
}

function todCat(h, cc) {
  if (h >= 4 && h < 7) return 'dawn';
  if (h >= 7 && h < 11) return (cc == 'overcast' || cc == 'light_rain') ? 'overcast_day' : 'sunny_noon_cool';
  if (h >= 11 && h < 16) return (cc == 'overcast' || cc == 'light_rain') ? 'overcast_day' : 'sunny_noon_hot';
  if (h >= 16 && h < 19) return (cc == 'overcast' || cc == 'light_rain') ? 'overcast_day' : 'sunny_noon_cool';
  if (h >= 19 && h < 21) return 'dusk';
  if (h >= 21 && h < 23) return 'night';
  return 'deep_night';
}

function seasonCat(m) {
  if ([3, 4, 5].includes(m)) return 'pre_spawn';
  if ([6, 7, 8].includes(m)) return 'summer_stable';
  if ([9, 10, 11].includes(m)) return 'autumn_feed';
  return 'winter_ice';
}

function moonCat(d) {
  const k = Date.UTC(2026, 0, 1);
  const days = (d.getTime() - k) / 86400000;
  const age = ((days % 29.53059) + 29.53059) % 29.53059;
  if (age < 1) return 'new';
  if (age < 7) return 'waxing';
  if (age < 8) return 'first_quarter';
  if (age < 14) return 'waxing';
  if (age < 16) return 'full';
  if (age < 22) return 'waning';
  if (age < 23) return 'last_quarter';
  return 'waning';
}

function heur(c) {
  let t = 0;
  for (let f in W) t += (S[f][c[f]] || 50) * W[f];
  return t;
}

function calcHourly(data) {
  const h = data.hourly, n = h.time.length, out = [];
  for (let i = 0; i < n; i++) {
    const t = new Date(h.time[i] + ':00');
    const p = h.pressure_msl[i], temp = h.temperature_2m[i];
    const ws = h.wind_speed_10m[i], wd = h.wind_direction_10m[i];
    const cc = h.cloud_cover[i], pr = h.precipitation[i], wc = h.weather_code[i];
    const i6 = Math.max(0, i - 6), i12 = Math.max(0, i - 12);
    const dp6 = (p - h.pressure_msl[i6]) / 1.333, dp12 = (p - h.pressure_msl[i12]) / 1.333;
    const dt6 = temp - h.temperature_2m[i6], dt12 = temp - h.temperature_2m[i12];
    let pt = 'stable';
    if (dp12 > 5) pt = 'sharp_rise'; else if (dp12 < -5) pt = 'sharp_fall';
    else if (dp6 > 2) pt = 'slow_rise'; else if (dp6 < -2) pt = 'slow_fall';
    let tt = 'stable';
    if (Math.abs(dt12) > 5) tt = dt12 > 0 ? 'rise_5plus' : 'fall_5plus';
    else if (Math.abs(dt12) > 3) tt = dt12 > 0 ? 'rise_3_5' : 'fall_3_5';
    else if (Math.abs(dt6) > 1) tt = dt6 > 0 ? 'rise_1_3' : 'fall_1_3';
    const wdir = degToDir(wd), wind = windCat(wdir, ws);
    const pc = precipCat(pr, wc), cl = cloudCat(cc, pc);
    const tod = todCat(t.getHours(), cl);
    const season = seasonCat(t.getMonth() + 1), moon = moonCat(t);
    const cond = { pressure_trend: pt, temp_trend: tt, time_of_day: tod, moon_phase: moon, wind, precipitation: cl, season, water: 'clear' };
    const score = heur(cond);
    out.push({
      t, day: t.getDate() + '/' + String(t.getMonth() + 1).padStart(2, '0'),
      hour: t.getHours(), score, cond,
      meta: { p: Math.round(p / 1.333 * 10) / 10, temp, ws, wind: wdir, cc, pr }
    });
  }
  return out;
}
