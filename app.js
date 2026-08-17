const W={pressure_trend:0.25,temp_trend:0.20,time_of_day:0.15,moon_phase:0.10,wind:0.10,precipitation:0.10,season:0.05,water:0.05};
const S={pressure_trend:{stable:100,slow_rise:50,slow_fall:40,sharp_rise:20,sharp_fall:10,before_front:60},temp_trend:{stable:100,rise_1_3:80,fall_1_3:80,rise_3_5:50,fall_3_5:50,rise_5plus:20,fall_5plus:20,extreme_low:40,extreme_high:35},time_of_day:{dawn:100,dusk:95,night:70,overcast_day:55,sunny_noon_hot:40,sunny_noon_cool:35,deep_night:30},moon_phase:{waxing:100,waning:90,first_quarter:75,last_quarter:75,new:60,full:35,super:50},wind:{light_breeze:100,moderate_warm:85,calm:70,cold_dir:55,strong:40,storm:20,gusty_front:60},precipitation:{light_rain:100,overcast:85,partly_cloudy:70,clear_calm:55,heavy_rain:40,sleet:30,cold_snap:25,fog:50},season:{pre_spawn:100,autumn_feed:90,summer_stable:80,winter_ice:70,spawn:50,post_spawn:40,summer_stagnation:35,winter_oxygen:30},water:{clear:100,slightly_murky:85,murky_stable:70,very_murky:55,low_level:45,flood:40,bloom:30,ice:50}};

const SYNODIC_MONTH=29.530588853;
const KNOWN_NEW_MOON=Date.UTC(2000,0,6,18,14,0);

function degToDir(d){const dirs=['N','NE','E','SE','S','SW','W','NW'];return Number.isFinite(d)?dirs[Math.round(d/45)%8]:'calm'}
function windCat(dir,spd){if(!Number.isFinite(spd)||spd<1)return'calm';if(spd<=4)return(dir==='S'||dir==='SW'||dir==='W')?'light_breeze':'cold_dir';if(spd<=6)return'moderate_warm';if(spd<=10)return'strong';return'storm'}
function precipCat(mm,wc,temp){
  if([95,96,99].includes(wc))return'heavy_rain';
  if([71,73,75,77,85,86].includes(wc))return temp<=1?'sleet':'light_rain';
  if(mm>5)return'heavy_rain';
  if(mm>0.5)return'light_rain';
  if([45,48].includes(wc))return'fog';
  if([0,1].includes(wc))return'clear_calm';
  if([2,3].includes(wc))return'partly_cloudy';
  return'overcast'
}
function cloudCat(pct,pc){if(['light_rain','heavy_rain','sleet','fog'].includes(pc))return pc;if(pct<20)return'clear_calm';if(pct<60)return'partly_cloudy';return'overcast'}
function todCat(h,cc){if(h>=4&&h<7)return'dawn';if(h>=7&&h<11)return(cc==='overcast'||cc==='light_rain'||cc==='fog')?'overcast_day':'sunny_noon_cool';if(h>=11&&h<16)return(cc==='overcast'||cc==='light_rain'||cc==='fog')?'overcast_day':'sunny_noon_hot';if(h>=16&&h<19)return(cc==='overcast'||cc==='light_rain'||cc==='fog')?'overcast_day':'sunny_noon_cool';if(h>=19&&h<21)return'dusk';if(h>=21&&h<23)return'night';return'deep_night'}
function seasonCat(m){if([3,4,5].includes(m))return'pre_spawn';if([6,7,8].includes(m))return'summer_stable';if([9,10,11].includes(m))return'autumn_feed';return'winter_ice'}

function parseApiLocalTime(localIso,offsetSeconds=0){
  const m=String(localIso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(!m)return new Date(NaN);
  const [,y,mo,d,h,mi,se='0']=m;
  return new Date(Date.UTC(+y,+mo-1,+d,+h,+mi,+se)-offsetSeconds*1000);
}
function localParts(localIso){
  const m=String(localIso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if(!m)return {year:NaN,month:NaN,day:NaN,hour:NaN,minute:NaN};
  return {year:+m[1],month:+m[2],day:+m[3],hour:+m[4],minute:+m[5]};
}
function pressureMmHg(hpa){return Number.isFinite(hpa)?Math.round(hpa*0.750061683*10)/10:null}

function moonPhase(date){
  const age=((date.getTime()-KNOWN_NEW_MOON)/86400000)%SYNODIC_MONTH;
  const normalized=(age+SYNODIC_MONTH)%SYNODIC_MONTH;
  if(normalized<1.0)return'new';
  if(normalized<6.5)return'waxing';
  if(normalized<8.8)return'first_quarter';
  if(normalized<13.8)return'waxing';
  if(normalized<15.8)return'full';
  if(normalized<21.0)return'waning';
  if(normalized<23.5)return'last_quarter';
  return'waning'
}

function heur(c){let t=0;for(const f in W)t+=(S[f]?.[c[f]]??50)*W[f];return Math.max(0,Math.min(100,t))}
function scoreCol(s){if(s>=80)return'#22c55e';if(s>=60)return'#84cc16';if(s>=40)return'#f59e0b';if(s>=20)return'#f97316';return'#ef4444'}
function scoreLbl(s){if(s>=80)return'Отличный';if(s>=60)return'Хороший';if(s>=40)return'Средний';if(s>=20)return'Слабый';return'Почти нет'}

async function geo(city){
  const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`);
  if(!r.ok)throw new Error(`Ошибка геокодирования: HTTP ${r.status}`);
  const d=await r.json();
  return d.results?.[0]||null;
}

async function weather(lat,lon){
  const params=new URLSearchParams({
    latitude:lat,
    longitude:lon,
    current:'temperature_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,weather_code',
    hourly:'temperature_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,rain,snowfall,cloud_cover,weather_code',
    timezone:'auto',
    past_days:'1',
    forecast_days:'3',
    temperature_unit:'celsius',
    wind_speed_unit:'ms',
    precipitation_unit:'mm'
  });
  const r=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if(!r.ok)throw new Error(`Ошибка Open-Meteo: HTTP ${r.status}`);
  return r.json();
}

function calcHourly(data){
  const h=data.hourly;
  if(!h?.time?.length) return [];
  const offset=Number(data.utc_offset_seconds)||0;
  const currentInstant=data.current?.time?parseApiLocalTime(data.current.time,offset):new Date();
  const startMs=currentInstant.getTime();
  const endMs=startMs+48*3600000;
  const out=[];

  for(let i=0;i<h.time.length;i++){
    const t=parseApiLocalTime(h.time[i],offset);
    if(!Number.isFinite(t.getTime())||t.getTime()<startMs||t.getTime()>=endMs)continue;

    const p=Number(h.pressure_msl[i]);
    const temp=Number(h.temperature_2m[i]);
    const ws=Number(h.wind_speed_10m[i]);
    const wd=Number(h.wind_direction_10m[i]);
    const cc=Number(h.cloud_cover[i]);
    const pr=Number(h.precipitation[i]);
    const wc=Number(h.weather_code[i]);

    const i6=Math.max(0,i-6),i12=Math.max(0,i-12);
    const dp6=p-Number(h.pressure_msl[i6]);
    const dp12=p-Number(h.pressure_msl[i12]);
    const dt6=temp-Number(h.temperature_2m[i6]);
    const dt12=temp-Number(h.temperature_2m[i12]);

    let pt='stable';
    if(dp12>5)pt='sharp_rise';else if(dp12<-5)pt='sharp_fall';else if(dp6>2)pt='slow_rise';else if(dp6<-2)pt='slow_fall';

    let tt='stable';
    if(Math.abs(dt12)>5)tt=dt12>0?'rise_5plus':'fall_5plus';
    else if(Math.abs(dt12)>3)tt=dt12>0?'rise_3_5':'fall_3_5';
    else if(Math.abs(dt6)>1)tt=dt6>0?'rise_1_3':'fall_1_3';

    const parts=localParts(h.time[i]);
    const wdir=degToDir(wd);
    const wind=windCat(wdir,ws);
    const pc=precipCat(pr,wc,temp);
    const cl=cloudCat(cc,pc);
    const tod=todCat(parts.hour,cl);
    const season=seasonCat(parts.month);
    const moon=moonPhase(t);

    const cond={pressure_trend:pt,temp_trend:tt,time_of_day:tod,moon_phase:moon,wind,precipitation:cl,season,water:'clear'};
    const score=heur(cond);

    out.push({
      t,
      local:h.time[i],
      day:`${String(parts.day).padStart(2,'0')}.${String(parts.month).padStart(2,'0')}`,
      hour:parts.hour,
      score,
      cond,
      meta:{
        p:pressureMmHg(p),
        pHpa:Number.isFinite(p)?Math.round(p*10)/10:null,
        temp:Number.isFinite(temp)?Math.round(temp*10)/10:null,
        feels:Number.isFinite(Number(h.apparent_temperature?.[i]))?Math.round(Number(h.apparent_temperature[i])*10)/10:null,
        ws:Number.isFinite(ws)?Math.round(ws*10)/10:null,
        wind:wdir,
        wd:Number.isFinite(wd)?Math.round(wd):null,
        cc:Number.isFinite(cc)?Math.round(cc):null,
        pr:Number.isFinite(pr)?Math.round(pr*10)/10:null,
        rain:Number.isFinite(Number(h.rain?.[i]))?Math.round(Number(h.rain[i])*10)/10:null,
        snow:Number.isFinite(Number(h.snowfall?.[i]))?Math.round(Number(h.snowfall[i])*10)/10:null,
        wc
      }
    });
  }
  return out;
}

function findSlots(hourly){
  const slots=[];let cur=null,scores=[];
  for(let i=0;i<hourly.length;i++){
    const h=hourly[i];
    if(h.score>=60){if(!cur)cur=h;scores.push(h.score);}
    else if(cur){
      if(scores.length>=2){const e=hourly[i-1];slots.push({s:cur,e,avg:scores.reduce((a,b)=>a+b,0)/scores.length,max:Math.max(...scores),dur:scores.length});}
      cur=null;scores=[];
    }
  }
  if(cur&&scores.length>=2){const e=hourly[hourly.length-1];slots.push({s:cur,e,avg:scores.reduce((a,b)=>a+b,0)/scores.length,max:Math.max(...scores),dur:scores.length});}
  return slots.sort((a,b)=>b.avg-a.avg).slice(0,5);
}

function findCurrentSlot(hourly,data){
  const currentLocal=data.current?.time;
  if(currentLocal){
    const exact=hourly.find(h=>h.local===currentLocal);
    if(exact)return exact;
  }
  const now=Date.now();
  return hourly.reduce((best,h)=>!best||Math.abs(h.t.getTime()-now)<Math.abs(best.t.getTime()-now)?h:best,null);
}

async function run(){
  const city=document.getElementById('city').value.trim();
  if(!city)return;
  document.getElementById('btn').disabled=true;
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  try{
    const g=await geo(city);
    if(!g)throw new Error('Город не найден');
    const w=await weather(g.latitude,g.longitude);
    const hourly=calcHourly(w);
    if(!hourly.length)throw new Error('Нет почасовых данных за ближайшие 48 часов');

    const nowSlot=findCurrentSlot(hourly,w);
    if(!nowSlot)throw new Error('Не удалось определить текущий час');

    const score=nowSlot.score;
    const col=scoreCol(score);
    document.getElementById('score-pct').textContent=score.toFixed(1)+'%';
    document.getElementById('score-pct').style.color=col;
    document.getElementById('score-label').textContent=scoreLbl(score);
    document.getElementById('score-bar').style.width=score+'%';
    document.getElementById('score-bar').style.background=col;

    const currentTemp=w.current?.temperature_2m;
    const currentPressure=w.current?.pressure_msl;
    const currentWind=w.current?.wind_speed_10m;
    const currentWindDir=w.current?.wind_direction_10m;
    const currentCloud=w.current?.cloud_cover;
    const currentPrecip=w.current?.precipitation;
    const currentWeatherCode=w.current?.weather_code;
    const moon=moonPhase(nowSlot.t);

    document.getElementById('weather-grid').innerHTML=`
      <div>Давление: <span>${pressureMmHg(Number(currentPressure??nowSlot.meta.pHpa))} мм</span></div>
      <div>Температура: <span>${Number(currentTemp??nowSlot.meta.temp).toFixed(1)}°C</span></div>
      <div>Ветер: <span>${degToDir(Number(currentWindDir??nowSlot.meta.wd))} ${Number(currentWind??nowSlot.meta.ws).toFixed(1)} м/с</span></div>
      <div>Облачность: <span>${Math.round(Number(currentCloud??nowSlot.meta.cc))}%</span></div>
      <div>Осадки: <span>${Number(currentPrecip??nowSlot.meta.pr).toFixed(1)} мм/ч</span></div>
      <div>Луна: <span>${moon}</span></div>`;

    const slots=findSlots(hourly);
    document.getElementById('slots-list').innerHTML=slots.map((sl,i)=>{
      const c=scoreCol(sl.avg);
      const sameDay=sl.s.day===sl.e.day;
      const endDay=sameDay?'':` ${sl.e.day}`;
      return `<div class="slot-card"><div class="slot-info"><div class="slot-num" style="background:${c}">${i+1}</div><div><div class="slot-time">${sl.s.day} ${String(sl.s.hour).padStart(2,'0')}:00 – ${sameDay?'':sl.e.day+' '}${String(sl.e.hour).padStart(2,'0')}:00</div><div class="slot-dur">${sl.dur} ч · пик ${sl.max.toFixed(0)}%</div></div></div><div class="slot-score"><div class="val" style="color:${c}">${sl.avg.toFixed(1)}%</div><div class="txt">${scoreLbl(sl.avg)}</div></div></div>`;
    }).join('')||'<div style="color:var(--text-2);font-size:13px;padding:8px">Хороших слотов не найдено</div>';

    document.getElementById('hourly').innerHTML=hourly.map(h=>{
      const c=scoreCol(h.score);
      return `<div class="hour-item"><div class="d">${h.day}</div><div class="h">${String(h.hour).padStart(2,'0')}:00</div><div class="bar-bg"><div class="bar-fill" style="height:${h.score}%;background:${c}"></div></div><div class="s" style="color:${c}">${h.score.toFixed(0)}</div></div>`;
    }).join('');

    document.getElementById('result').classList.remove('hidden');
  }catch(e){
    console.error(e);
    document.getElementById('error').textContent=e?.message||'Неизвестная ошибка';
    document.getElementById('error').classList.remove('hidden');
  }finally{
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('btn').disabled=false;
  }
}

run();
