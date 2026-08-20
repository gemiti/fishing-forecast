const W = {
  pressure_trend: 0.25, temp_trend: 0.20, time_of_day: 0.15,
  moon_phase: 0.10, wind: 0.10, precipitation: 0.10, season: 0.05, water: 0.05
};

const S = {
  pressure_trend: { stable: 100, slow_rise: 50, slow_fall: 40, sharp_rise: 20, sharp_fall: 10, before_front: 60 },
  temp_trend: { stable: 100, rise_1_3: 80, fall_1_3: 80, rise_3_5: 50, fall_3_5: 50, rise_5plus: 20, fall_5plus: 20, extreme_low: 40, extreme_high: 35 },
  time_of_day: { dawn: 100, dusk: 95, night: 70, overcast_day: 55, sunny_noon_hot: 40, sunny_noon_cool: 35, deep_night: 30 },
  moon_phase: { waxing: 100, waning: 90, first_quarter: 75, last_quarter: 75, new: 60, full: 35, super: 50 },
  wind: { light_breeze: 100, moderate_warm: 85, calm: 70, cold_dir: 55, strong: 40, storm: 20, gusty_front: 60 },
  precipitation: { light_rain: 100, overcast: 85, partly_cloudy: 70, clear_calm: 55, heavy_rain: 40, sleet: 30, cold_snap: 25, fog: 50 },
  season: { pre_spawn: 100, autumn_feed: 90, summer_stable: 80, winter_ice: 70, spawn: 50, post_spawn: 40, summer_stagnation: 35, winter_oxygen: 30 },
  water: { clear: 100, slightly_murky: 85, murky_stable: 70, very_murky: 55, low_level: 45, flood: 40, bloom: 30, ice: 50 }
};
