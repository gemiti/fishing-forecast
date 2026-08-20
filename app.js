const W={pressure_trend:0.25,temp_trend:0.20,time_of_day:0.15,moon_phase:0.10,wind:0.10,precipitation:0.10,season:0.05,water:0.05};
const S={pressure_trend:{stable:100,slow_rise:50,slow_fall:40,sharp_rise:20,sharp_fall:10,before_front:60},temp_trend:{stable:100,rise_1_3:80,fall_1_3:80,rise_3_5:50,fall_3_5:50,rise_5plus:20,fall_5plus:20,extreme_low:40,extreme_high:35},time_of_day:{dawn:100,dusk:95,night:70,overcast_day:55,sunny_noon_hot:40,sunny_noon_cool:35,deep_night:30},moon_phase:{waxing:100,waning:90,first_quarter:75,last_quarter:75,new:60,full:35,super:50},wind:{light_breeze:100,moderate_warm:85,calm:70,cold_dir:55,strong:40,storm:20,gusty_front:60},precipitation:{light_rain:100,overcast:85,partly_cloudy:70,clear_calm:55,heavy_rain:40,sleet:30,cold_snap:25,fog:50},season:{pre_spawn:100,autumn_feed:90,summer_stable:80,winter_ice:70,spawn:50,post_spawn:40,summer_stagnation:35,winter_oxygen:30},water:{clear:100,slightly_murky:85,murky_stable:70,very_murky:55,low_level:45,flood:40,bloom:30,ice:50}};

function degToDir(d){const dirs=['N','NE','E','SE','S','SW','W','NW'];return d==null?'calm':dirs[Math.round(d/45)%8]}
function windCat(dir,spd){if(spd<1)return'calm';if(spd<=4)return(dir=='S'||dir=='SW'||dir=='W')?'light_breeze':'cold_dir';if(spd<=6)return'moderate_warm';if(spd<=10)return'strong';return'storm'}
function precipCat(mm,wc){
  if([95,96,99].includes(wc))return'heavy_rain';
  if([71,73,75,77,85,86].includes(wc))return'sleet';
  if([66,67].includes(wc))return'sleet';
  if([56,57].includes(wc))return'light_rain';
  if([51,53,55].includes(wc))return'light_rain';
  if([61,80].includes(wc))return'light_rain';
  if([63,65,81,82].includes(wc))return'heavy_rain';
  if(mm>5)return'heavy_rain';
  if(mm>0.5)return'light_rain';
  if([45,48].includes(wc))return'fog';
  if([0,1].includes(wc))return'clear_calm';
  if([2,3].includes(wc))return'partly_cloudy';
  return'overcast';
}
function cloudCat(pct,pc){if(['light_rain','heavy_rain','sleet'].includes(pc))return pc;if(pct<20)return'clear_calm';if(pct<60)return'partly_cloudy';return'overcast'}
function todCat(h,cc){if(h>=4&&h<7)return'dawn';if(h>=7&&h<11)return(cc=='overcast'||cc=='light_rain')?'overcast_day':'sunny_noon_cool';if(h>=11&&h<16)return(cc=='overcast'||cc=='light_rain')?'overcast_day':'sunny_noon_hot';if(h>=16&&h<19)return(cc=='overcast'||cc=='light_rain')?'overcast_day':'sunny_noon_cool';if(h>=19&&h<21)return'dusk';if(h>=21&&h<23)return'night';return'deep_night'}
function seasonCat(m){if([3,4,5].includes(m))return'pre_spawn';if([6,7,8].includes(m))return'summer_stable';if([9,10,11].includes(m))return'autumn_feed';return'winter_ice'}
function moonCat(d){
  const k=Date.UTC(2026,0,1);
  const days=(d.getTime()-k)/86400000;
  const age=((days%29.53059)+29.53059)%29.53059;
  if(age<1)return'new';
  if(age<7)return'waxing';
  if(age<8)return'first_quarter';
  if(age<14)return'waxing';
  if(age<16)return'full';
  if(age<22)return'waning';
  if(age<23)return'last_quarter';
  return'waning';
}
function heur(c){let t=0;for(let f in W){t+=(S[f][c[f]]||50)*W[f];}return t}
function scoreCol(s){if(s>=80)return'#22c55e';if(s>=60)return'#84cc16';if(s>=40)return'#f59e0b';if(s>=20)return'#f97316';return'#ef4444'}
function scoreLbl(s){if(s>=80)return'Отличный';if(s>=60)return'Хороший';if(s>=40)return'Средний';if(s>=20)return'Слабый';return'Почти нет'}

async function geo(city,preferredCountry='RU'){
  let url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=ru`;
  let r=await fetch(url);
  let d=await r.json();
  if(!d.results||!d.results.length){
    url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city+', '+preferredCountry)}&count=10&language=ru`;
    r=await fetch(url);
    d=await r.json();
    if(!d.results||!d.results.length)return null;
  }
  const inCountry=d.results.filter(x=>x.country_code===preferredCountry).sort((a,b)=>(b.population||0)-(a.population||0));
  if(inCountry.length)return inCountry[0];
  return d.results[0];
}
async function weather(lat,lon){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,weather_code&hourly=temperature_2m,pressure_msl,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,weather_code&timezone=auto&past_days=1&forecast_days=5`;
  const r=await fetch(url);return r.json();
}

// Все данные без фильтра по времени (нужны для графика за весь день)
function calcHourly(data){
  const h=data.hourly,n=h.time.length,out=[];
  for(let i=0;i<n;i++){
    const t=new Date(h.time[i]+':00');
    const p=h.pressure_msl[i],temp=h.temperature_2m[i],ws=h.wind_speed_10m[i],wd=h.wind_direction_10m[i],cc=h.cloud_cover[i],pr=h.precipitation[i],wc=h.weather_code[i];
    const i6=Math.max(0,i-6),i12=Math.max(0,i-12);
    const dp6=(p-h.pressure_msl[i6])/1.333,dp12=(p-h.pressure_msl[i12])/1.333;
    const dt6=temp-h.temperature_2m[i6],dt12=temp-h.temperature_2m[i12];
    let pt='stable';if(dp12>5)pt='sharp_rise';else if(dp12<-5)pt='sharp_fall';else if(dp6>2)pt='slow_rise';else if(dp6<-2)pt='slow_fall';
    let tt='stable';if(Math.abs(dt12)>5)tt=dt12>0?'rise_5plus':'fall_5plus';else if(Math.abs(dt12)>3)tt=dt12>0?'rise_3_5':'fall_3_5';else if(Math.abs(dt6)>1)tt=dt6>0?'rise_1_3':'fall_1_3';
    const wdir=degToDir(wd),wind=windCat(wdir,ws),pc=precipCat(pr,wc),cl=cloudCat(cc,pc),tod=todCat(t.getHours(),cl),season=seasonCat(t.getMonth()+1),moon=moonCat(t);
    const cond={pressure_trend:pt,temp_trend:tt,time_of_day:tod,moon_phase:moon,wind:wind,precipitation:cl,season:season,water:'clear'};
    const score=heur(cond);
    out.push({t,day:t.getDate()+'/'+String(t.getMonth()+1).padStart(2,'0'),hour:t.getHours(),score,cond,meta:{p:Math.round(p/1.333*10)/10,temp,ws,wind:wdir,cc,pr}});
  }
  return out;
}

function findSlots(hourly){
  const slots=[];let cur=null,scores=[],idx=-1;
  for(let h of hourly){idx++;
    if(h.score>=60){if(!cur)cur=h;scores.push(h.score);}
    else{if(cur&&scores.length>=3){slots.push({s:cur,e:hourly[idx-1],avg:scores.reduce((a,b)=>a+b,0)/scores.length,max:Math.max(...scores),dur:scores.length,date:cur.day});}cur=null;scores=[];}
  }
  if(cur&&scores.length>=3){slots.push({s:cur,e:hourly[hourly.length-1],avg:scores.reduce((a,b)=>a+b,0)/scores.length,max:Math.max(...scores),dur:scores.length,date:cur.day});}
  return slots.sort((a,b)=>a.s.t-b.s.t).slice(0,5);
}

function groupByDay(hourly){
  const m={};
  hourly.forEach(h=>{if(!m[h.day])m[h.day]=[];m[h.day].push(h);});
  return Object.values(m);
}

// ===== DAY CHART =====
let activeDayIndex=0;
let chartDays=[];

function renderDayTabs(days){
  chartDays=days;
  const container=document.getElementById('day-tabs');
  const dow=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  container.innerHTML=days.map((day,i)=>{
    const t=day[0].t;
    const isActive=i===activeDayIndex;
    return`<div class="day-tab ${isActive?'active':''}" data-index="${i}">
      <div class="dow">${dow[t.getDay()]}</div>
      <div class="date">${t.getDate()}</div>
    </div>`;
  }).join('');
  container.querySelectorAll('.day-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      activeDayIndex=parseInt(tab.dataset.index);
      renderDayTabs(chartDays);
      document.getElementById('hourly').innerHTML=renderDayChart(chartDays[activeDayIndex]);
    });
  });
}

function renderDayChart(dayData){
  if(!dayData||!dayData.length)return'';
  const pts=dayData.filter((_,i)=>i%3===0);
  if(!pts.length)return'';
  const W=800,H=320;
  const pad={l:56,r:24,t:32,b:82};
  const cw=W-pad.l-pad.r;
  const ch=H-pad.t-pad.b;
  const x=i=>pad.l+(i/(pts.length-1))*cw;
  const y=v=>pad.t+ch-(v/100)*ch;
  const points=pts.map((d,i)=>({x:x(i),y:y(d.score)}));

  let lineD=`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for(let i=0;i<points.length-1;i++){
    const p0=points[i===0?0:i-1],p1=points[i],p2=points[i+1],p3=points[i+2]||p2;
    const cp1x=p1.x+(p2.x-p0.x)/6,cp1y=p1.y+(p2.y-p0.y)/6;
    const cp2x=p2.x-(p3.x-p1.x)/6,cp2y=p2.y-(p3.y-p1.y)/6;
    lineD+=` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  const areaD=lineD+` L ${points[points.length-1].x.toFixed(1)} ${pad.t+ch} L ${points[0].x.toFixed(1)} ${pad.t+ch} Z`;

  let grid='',yLabels='';
  [0,25,50,75,100].forEach(t=>{
    const yy=y(t);
    grid+=`M ${pad.l} ${yy} L ${pad.l+cw} ${yy} `;
    yLabels+=`<text x="${pad.l-12}" y="${yy+7}" text-anchor="end" fill="#94a3b8" font-size="22" font-weight="500">${t}</text>`;
  });

  let circles='',xLabels='';
  pts.forEach((d,i)=>{
    const px=points[i].x,py=points[i].y;
    const col=scoreCol(d.score);
    circles+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8" fill="${col}" stroke="#0f172a" stroke-width="3"/>`;
    xLabels+=`<text x="${px.toFixed(1)}" y="${H-28}" text-anchor="middle" fill="#94a3b8" font-size="22" font-weight="500">${String(d.hour).padStart(2,'0')}:00</text>`;
  });

  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;">
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
// ===== AUTOCOMPLETE =====
let selectedGeo=null;
let activeSuggestionIndex=-1;

function debounce(fn,ms){
  let t;
  return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms);};
}

async function suggestCity(query){
  const box=document.getElementById('suggestions');
  if(!query||query.length<2){box.classList.add('hidden');return;}
  box.classList.remove('hidden');
  box.innerHTML='<div class="suggestion-loading">Поиск…</div>';
  activeSuggestionIndex=-1;
  try{
    const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=ru`;
    const r=await fetch(url);
    const d=await r.json();
    if(!d.results||!d.results.length){box.innerHTML='<div class="suggestion-empty">Ничего не найдено</div>';return;}
    renderSuggestions(d.results);
  }catch(e){box.classList.add('hidden');}
}

function renderSuggestions(results){
  const box=document.getElementById('suggestions');
  box.innerHTML=results.map((x,i)=>{
    const meta=[x.admin1,x.country].filter(Boolean).join(', ');
    return`<div class="suggestion-item" data-index="${i}" data-json="${encodeURIComponent(JSON.stringify(x))}">
      <div><div class="suggestion-name">${x.name}</div><div class="suggestion-meta">${meta}</div></div>
      <div class="suggestion-meta">${x.latitude.toFixed(2)}, ${x.longitude.toFixed(2)}</div>
    </div>`;
  }).join('');
  box.querySelectorAll('.suggestion-item').forEach(el=>{
    el.addEventListener('click',()=>{selectCity(JSON.parse(decodeURIComponent(el.dataset.json)));});
    el.addEventListener('mouseenter',()=>{activeSuggestionIndex=parseInt(el.dataset.index);updateActiveSuggestion();});
  });
}

function updateActiveSuggestion(){
  document.getElementById('suggestions').querySelectorAll('.suggestion-item').forEach((el,i)=>{
    el.classList.toggle('active',i===activeSuggestionIndex);
  });
}

function selectCity(result){
  selectedGeo=result;
  document.getElementById('city').value=result.name;
  document.getElementById('suggestions').classList.add('hidden');
  activeSuggestionIndex=-1;
  run();
}

function hideSuggestions(){
  document.getElementById('suggestions').classList.add('hidden');
  activeSuggestionIndex=-1;
}

document.addEventListener('DOMContentLoaded',()=>{
  const input=document.getElementById('city');
  const debouncedSuggest=debounce(suggestCity,300);
  input.addEventListener('input',()=>{selectedGeo=null;debouncedSuggest(input.value.trim());});
  input.addEventListener('keydown',(e)=>{
    const box=document.getElementById('suggestions');
    const items=box.querySelectorAll('.suggestion-item');
    if(box.classList.contains('hidden')||!items.length){if(e.key==='Enter'){e.preventDefault();run();}return;}
    if(e.key==='ArrowDown'){e.preventDefault();activeSuggestionIndex=(activeSuggestionIndex+1)%items.length;updateActiveSuggestion();}
    else if(e.key==='ArrowUp'){e.preventDefault();activeSuggestionIndex=(activeSuggestionIndex-1+items.length)%items.length;updateActiveSuggestion();}
    else if(e.key==='Enter'){e.preventDefault();if(activeSuggestionIndex>=0&&items[activeSuggestionIndex]){selectCity(JSON.parse(decodeURIComponent(items[activeSuggestionIndex].dataset.json)));}else if(items.length){selectCity(JSON.parse(decodeURIComponent(items[0].dataset.json)));}}
    else if(e.key==='Escape'){hideSuggestions();}
  });
  document.addEventListener('click',(e)=>{if(!e.target.closest('.search-wrap'))hideSuggestions();});
});

async function run(){
  const city=document.getElementById('city').value.trim();
  if(!city&&!selectedGeo)return;
  document.getElementById('btn').disabled=true;
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  try{
    let g=selectedGeo;
    if(!g)g=await geo(city);
    if(!g)throw new Error('Город не найден');
    const w=await weather(g.latitude,g.longitude);
    const allHourly=calcHourly(w);
    if(!allHourly.length)throw new Error('Нет данных');

    const now=new Date();now.setMinutes(0,0,0);
    const nowSlot=allHourly.find(h=>h.hour===now.getHours()&&h.day===`${now.getDate()}/${String(now.getMonth()+1).padStart(2,'0')}`)||allHourly[0];
    const score=nowSlot.score;
    const col=scoreCol(score);
    const locName=[g.name,g.admin1,g.country].filter(Boolean).join(', ');
    document.getElementById('location-name').textContent=locName;
    document.getElementById('score-pct').textContent=score.toFixed(1)+'%';
    document.getElementById('score-pct').style.color=col;
    document.getElementById('score-label').textContent=scoreLbl(score);
    document.getElementById('score-bar').style.width=score+'%';
    document.getElementById('score-bar').style.background=col;
    const updateTime=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
    document.getElementById('weather-grid').innerHTML=`<div>Давление: <span>${nowSlot.meta.p} мм</span></div><div>Температура: <span>${nowSlot.meta.temp}°C</span></div><div>Ветер: <span>${nowSlot.meta.wind} ${nowSlot.meta.ws} м/с</span></div><div>Облачность: <span>${nowSlot.meta.cc}%</span></div><div>Осадки: <span>${nowSlot.meta.pr} мм/ч</span></div><div>Обновлено: <span>${updateTime}</span></div>`;

    // Slots: 48 hours from now
    const futureHourly=allHourly.filter(h=>h.t>=now);
    const slots=findSlots(futureHourly);
    document.getElementById('slots-list').innerHTML=slots.map((sl,i)=>{
      const c=scoreCol(sl.avg);
      const peakC=scoreCol(sl.max);
      return`<div class="slot-card"><div class="slot-info"><div class="slot-num" style="background:${c}">${i+1}</div><div><div class="slot-date">${sl.date}</div><div class="slot-time">${String(sl.s.hour).padStart(2,'0')}:00 – ${String(sl.e.hour).padStart(2,'0')}:00</div><div class="slot-dur">${sl.dur} ч · пик <span class="slot-peak" style="color:${peakC}">${sl.max.toFixed(0)}%</span></div></div></div><div class="slot-score"><div class="val" style="color:${c}">${sl.avg.toFixed(1)}%</div><div class="txt">${scoreLbl(sl.avg)}</div></div></div>`;
    }).join('')||'<div style="color:var(--text-2);font-size:13px;padding:8px">Хороших слотов не найдено</div>';

    // Day chart with tabs (5 days, skip yesterday)
    const days=groupByDay(allHourly).slice(1,6);
    activeDayIndex=0;
    renderDayTabs(days);
    document.getElementById('hourly').innerHTML=renderDayChart(days[0]);

    document.getElementById('result').classList.remove('hidden');
  }catch(e){
    document.getElementById('error').textContent=e.message;
    document.getElementById('error').classList.remove('hidden');
  }
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('btn').disabled=false;
  selectedGeo=null;
}
