/* ============================================================
   ЗАХВАТ — игровая логика (вынесена из index.html без изменений).
   importmap и разметка (#app, #labels, кнопки, оверлеи) — в index.html.
   Ассеты грузятся относительно index.html: models/… , vendor/… .

   КАРТА ФАЙЛА — ищи по заголовкам «---------------- <раздел> ----------------»:
     • платформа (Яндекс Игры и т.п.)
     • game constants & data   — баланс, биомы, цвета (PROD_BASE, CAP_BASE, MAXLINKS…)
     • three.js setup          — рендер, свет, камера, загрузка GLB-моделей
     • stars / sound / confetti
     • туториал (комендант Филин 🦉)
     • герой (прокачка за звёзды)
     • map / nodes             — генерация карт, узлы (worldPos, genDecor)
     • бесконечный режим
     • интро боя
     • декор башни             — цоколь/тень/флаг: buildTower()
     • simulation              — производство/потоки/бой/захват: prod, cap, linkCap, applyArrival
     • per-frame visual sync   — юниты, связи: rebuildLinks()
     • специализация           — выбор пути по тапу
     • input                   — драг связей, тапы
     • loop                    — главный кадр

   Правила механики и планы — см. DESIGN.md рядом с этим файлом.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const $ = id => document.getElementById(id);
function fail(msg){ const e=document.getElementById('err'); e.style.display='block';
  e.textContent = msg + ' Обнови страницу или попробуй другой браузер.'; }

// ---------------- платформа (Яндекс Игры и т.п.) ----------------
let ysdk=null;
async function initPlatform(){
  try{ if(window.YaGames) ysdk=await window.YaGames.init(); }catch(e){ ysdk=null; }
}
function platformReady(){ try{ ysdk && ysdk.features.LoadingAPI && ysdk.features.LoadingAPI.ready(); }catch(e){} }
function gpStart(){ try{ ysdk && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.start(); }catch(e){} }
function gpStop(){ try{ ysdk && ysdk.features.GameplayAPI && ysdk.features.GameplayAPI.stop(); }catch(e){} }
// облачные сейвы: локальный и облачный прогресс сливаются по максимуму
function cloudSave(){ if(!ysdk) return;
  try{ ysdk.getPlayer().then(p=>p.setData({ progress, stars:bestStars, endless:bestEndless,
    tut: localStorage.getItem(TUT_KEY)?1:0 })).catch(()=>{}); }catch(e){} }
async function cloudLoad(){ if(!ysdk) return;
  try{ const p=await ysdk.getPlayer(); const d=await p.getData(['progress','stars','endless','tut']);
    if(!d) return;
    if((d.progress|0)>progress){ progress=d.progress|0; localStorage.setItem(STORE,progress); }
    if(d.stars) for(const k in d.stars){ if((d.stars[k]|0)>(bestStars[k]|0)) bestStars[k]=d.stars[k]|0; }
    localStorage.setItem(STARS_KEY,JSON.stringify(bestStars));
    if((d.endless|0)>bestEndless){ bestEndless=d.endless|0; localStorage.setItem('g_zahvat_endless',bestEndless); }
    if(d.tut) localStorage.setItem(TUT_KEY,'1');
  }catch(e){} }
function submitEndless(r){ if(!ysdk) return;
  try{ ysdk.getLeaderboards().then(l=>l.setLeaderboardScore('endless', r)).catch(()=>{}); }catch(e){} }

// ---------------- game constants & data ----------------
const PROD_BASE=2.2, CAP_BASE=30, MAX_LEVEL=4, MAXLINKS=3, BOT_INTERVAL=1.45;
const ISL_W=15, ISL_D=10, GROUNDPAD=0.84;
const COL = { 0:0xc9ceda, 1:0x4f8bff, 2:0xff5c72 };       // soldiers / accents
const SOLID = { 0:0x94a3b8, 1:0x3b82f6, 2:0xef4444 };      // solid team color for towers & links
const SOLIDD= { 0:0x64748b, 1:0x1d4ed8, 2:0xb91c1c };      // darker base ring
const TINT= { 0:0xffffff, 1:0xd2e2ff, 2:0xffd6dc };        // (unused now) gentle tower tint
const CSS = { 0:'#64748b', 1:'#3b82f6', 2:'#ef4444' };
const STORE='g_zahvat_progress';

// biomes: 1 движок → много миров (см. /igra-zahvat/plan/, раздел 1)
const BIOMES = {
  meadow:{ label:'🌿 Луга', ground:0x77c24e, pA:0x5fae4e, pB:0x7cca64, sky:['#d3ecf6','#bfe2f0','#a3cfe4'], fog:0xc7e6f2,
    groves:10, trees:['tree','tree2','tree3','pine'], bushes:30, grassN:52, flowersN:40, rocksN:12, mushN:6, logsN:4 },
  sparse:{ label:'⛰ Редколесье', ground:0x8dbb58, pA:0x79a84c, pB:0x9cc768, sky:['#d9f0f8','#c8e6f2','#b0d6e8'], fog:0xd0e8f0,
    groves:7, trees:['tree2','pine','pine2'], bushes:20, grassN:44, flowersN:16, rocksN:30, mushN:4, logsN:8 },
  autumn:{ label:'🍂 Осенний лес', ground:0x9caf4b, pA:0x88a03f, pB:0xb0bf5b, sky:['#f6e8cf','#ecdabd','#d9c5a4'], fog:0xe8dcc0,
    groves:15, trees:['treeF','tree2F','tree3F','tree'], bushes:26, grassN:38, flowersN:14, rocksN:14, mushN:16, logsN:10, mush:'mushT' },
  pines:{ label:'🌲 Сосновый бор', ground:0x5da354, pA:0x4c9147, pB:0x6cb463, sky:['#cfe6f2','#b8d8ea','#9cc4dc'], fog:0xbfdfe8,
    groves:16, trees:['pine','pine2','pine3'], bushes:20, grassN:34, flowersN:10, rocksN:22, mushN:12, logsN:10 },
  thicket:{ label:'🌳 Густая чаща', ground:0x4f9c45, pA:0x428c3a, pB:0x5fae4e, sky:['#d0ecdc','#bce0cc','#a2ceb6'], fog:0xbcdcc8,
    groves:20, trees:['tree','tree2','tree3','pine2'], bushes:34, grassN:44, flowersN:12, rocksN:12, mushN:14, logsN:12 },
  golden:{ label:'🍁 Золотая долина', ground:0xa8b854, pA:0x93a648, pB:0xbcc964, sky:['#f6eed2','#eadfb8','#d7c99a'], fog:0xe6dab4,
    groves:9, trees:['treeF','tree3F','tree2'], bushes:24, grassN:46, flowersN:30, rocksN:14, mushN:8, logsN:6, mush:'mushT' },
};

// особые нейтральные здания: трейт остаётся при захвате — стратегическая цель
const TRAITS={
  mill:{ icon:'🌾', name:'Мельница', desc:'+30% производства своим башням рядом' },
  fort:{ icon:'🏰', name:'Форт', desc:'принимает вдвое меньше урона' },
  beacon:{ icon:'🚩', name:'Маяк', desc:'+1 связь владельцу' },
};
// командиры врага: у каждой карты бот со своим перком
const COMMANDERS={
  greed:{ emoji:'💰', name:'Скупец', desc:'враг производит на 15% больше' },
  forge:{ emoji:'🛠', name:'Кузнец', desc:'башни врага крепче: −15% вашего урона' },
  wind:{ emoji:'🌪', name:'Вихрь', desc:'солдаты врага на 20% быстрее' },
  haste:{ emoji:'⏱', name:'Блиц', desc:'враг принимает решения заметно чаще' },
  war:{ emoji:'⚔️', name:'Вояка', desc:'солдаты врага бьют на 20% сильнее' },
};
// дебюты: одно решение до боя — у игрока и у бота
const GAMBITS={
  reserve:{ icon:'🪖', name:'Резерв', desc:'+10 войск в сильнейшую башню' },
  tempo:{ icon:'⚡', name:'Темп', desc:'+30% производства первые 20 секунд' },
  found:{ icon:'🏗', name:'Фундамент', desc:'сильнейшая башня сразу +1 уровень' },
};

// порядок и цифры выверены симулятором (~5000 матчей): плавная кривая сложности
// винрейт эвристики среднего игрока на «Норме»: 100 → 72 → 69 → 65 → 51 → 42 %
const MAPS = [
  { name:'Первый контакт', biome:'meadow', par:60, aggro:0.32, nodes:[
    {x:.16,y:.5,o:1,t:22,l:1},{x:.84,y:.5,o:2,t:20,l:1},
    {x:.5,y:.28,o:0,t:10,l:1},{x:.5,y:.72,o:0,t:10,l:1} ] },
  { name:'Перекрёсток', biome:'sparse', par:45, aggro:0.36, cmd:'greed', nodes:[
    {x:.12,y:.5,o:1,t:26,l:1},{x:.88,y:.5,o:2,t:20,l:1},{x:.5,y:.5,o:0,t:16,l:1,tr:'mill'},
    {x:.34,y:.24,o:0,t:9,l:1},{x:.66,y:.24,o:0,t:9,l:1},{x:.34,y:.76,o:0,t:9,l:1},{x:.66,y:.76,o:0,t:9,l:1} ] },
  { name:'Архипелаг', biome:'golden', par:55, aggro:0.60, cmd:'war', nodes:[
    {x:.1,y:.5,o:1,t:24,l:1},{x:.9,y:.2,o:2,t:20,l:1},{x:.9,y:.8,o:2,t:20,l:1},
    {x:.35,y:.2,o:0,t:10,l:1,tr:'mill'},{x:.35,y:.8,o:0,t:10,l:1,tr:'mill'},{x:.55,y:.5,o:0,t:16,l:1,tr:'fort'},
    {x:.7,y:.3,o:0,t:11,l:1},{x:.7,y:.7,o:0,t:11,l:1},{x:.5,y:.15,o:0,t:9,l:1,tr:'beacon'},{x:.5,y:.85,o:0,t:9,l:1,tr:'beacon'} ] },
  { name:'Две крепости', biome:'thicket', par:50, aggro:0.72, cmd:'haste', nodes:[
    {x:.15,y:.5,o:1,t:26,l:1,tr:'fort'},{x:.85,y:.5,o:2,t:30,l:2,tr:'fort'},
    {x:.4,y:.3,o:0,t:14,l:1,tr:'mill'},{x:.6,y:.7,o:0,t:14,l:1,tr:'fort'},{x:.6,y:.3,o:0,t:14,l:1},{x:.4,y:.7,o:0,t:14,l:1} ] },
  { name:'Клин', biome:'autumn', par:50, aggro:0.45, cmd:'forge', nodes:[
    {x:.13,y:.3,o:1,t:20,l:1},{x:.13,y:.7,o:1,t:20,l:1},
    {x:.87,y:.3,o:2,t:22,l:1},{x:.87,y:.7,o:2,t:22,l:1},
    {x:.5,y:.5,o:0,t:18,l:1,tr:'fort'},{x:.5,y:.18,o:0,t:11,l:1},{x:.5,y:.82,o:0,t:11,l:1} ] },
  { name:'Окружение', biome:'pines', par:55, aggro:0.44, cmd:'wind', nodes:[
    {x:.5,y:.5,o:1,t:28,l:1},{x:.5,y:.16,o:0,t:12,l:1,tr:'mill'},{x:.5,y:.84,o:0,t:12,l:1,tr:'beacon'},
    {x:.2,y:.3,o:2,t:16,l:1},{x:.2,y:.7,o:0,t:12,l:1},{x:.8,y:.3,o:0,t:12,l:1},{x:.8,y:.7,o:2,t:16,l:1}
  ] },
];

// ---------------- three.js setup ----------------
let renderer, labelRenderer, scene, camera, raycaster, groundPlane, sun=null;
let composer=null, bloomPass=null, gtaoPass=null;

// адаптивное качество: если телефон не тянет, снижаем эффекты (запоминается)
let qLevel=+(localStorage.getItem('g_zahvat_q')||0), fpsN=0, fpsT=0;
function applyQuality(q){
  qLevel=q; try{ localStorage.setItem('g_zahvat_q',q); }catch(e){}
  if(q>=1) composer=null;                       // без пост-эффектов (bloom/SMAA)
  if(q>=2 && renderer){                          // без теней, ниже разрешение
    renderer.shadowMap.enabled=false; if(sun) sun.castShadow=false;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
    scene.traverse(o=>{ if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true); });
  }
}
let MODELS={}, GROUND_TOP=0, stripeTex;
let nodes=[], links=[], soldiers=[], decor=[];
let mapIndex=0, running=true, ended=false, speed=1, botTimer=0, progress=+(localStorage.getItem(STORE)||0);
let drag=null, dragLine=null, linkSig='', simTime=0;
const pointer=new THREE.Vector2();

// ---------------- stars (1-3 за карту, по времени) ----------------
const STARS_KEY='g_zahvat_stars';
let bestStars={}; try{ bestStars=JSON.parse(localStorage.getItem(STARS_KEY)||'{}')||{}; }catch(e){ bestStars={}; }
function starsFor(t){ const par=(curMap && curMap.par)||60; return t<=par?3 : t<=par*1.8?2 : 1; }
function starsMarkup(s){ return [1,2,3].map(k=>`<span${k<=s?'':' class="off"'}>★</span>`).join(''); }

// ---------------- sound (WebAudio, без ассетов) ----------------
let AC=null, muted = localStorage.getItem('g_zahvat_mute')==='1';
function audio(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(AC && AC.state==='suspended') AC.resume(); return AC; }
function tone(f0,f1,dur,type,vol,at){ const a=AC; if(!a) return;
  const t=a.currentTime+(at||0); const o=a.createOscillator(), g=a.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(Math.max(30,f1||f0),t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.18,t+0.015); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+0.05); }
function sfx(n){ if(muted || !audio()) return;
  switch(n){
    case 'link':   tone(340,660,0.12,'sine',0.15); break;
    case 'unlink': tone(520,240,0.14,'sine',0.12); break;
    case 'step':   tone(660,880,0.10,'sine',0.10); break;
    case 'cap':    tone(392,392,0.10,'triangle',0.2); tone(523,523,0.12,'triangle',0.2,0.09); tone(659,659,0.16,'triangle',0.2,0.18); break;
    case 'lost':   tone(392,180,0.30,'sawtooth',0.07); break;
    case 'lvl':    tone(523,523,0.08,'square',0.05); tone(659,659,0.08,'square',0.05,0.07); tone(784,784,0.12,'square',0.05,0.14); break;
    case 'rush':   tone(392,784,0.18,'sawtooth',0.1); tone(784,1568,0.22,'sawtooth',0.08,0.12); break;
    case 'win':    [523,659,784,1047].forEach((f,i)=>tone(f,f,0.22,'triangle',0.18,i*0.13)); break;
    case 'lose':   [392,330,262,196].forEach((f,i)=>tone(f,f*0.94,0.30,'sine',0.14,i*0.16)); break;
  } }

function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }

// пауза и тишина, когда игра свёрнута/не в фокусе (требование площадок)
let hiddenPause=false;
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){
    hiddenPause=running; running=false;
    try{ if(AC && AC.state==='running') AC.suspend(); }catch(e){}
  } else {
    try{ if(AC && AC.state==='suspended' && !muted) AC.resume(); }catch(e){}
    if(hiddenPause && !ended && !document.getElementById('ovMenu').classList.contains('show')) running=true;
    hiddenPause=false;
  }
});

// ---------------- confetti (победа) ----------------
function confetti(){ const cv=$('confetti'), ctx=cv.getContext('2d');
  cv.width=innerWidth; cv.height=innerHeight;
  const cols=['#ffd166','#21d4fd','#2bffb0','#7c5cff','#ff5c72','#ffffff'], P=[];
  for(let i=0;i<150;i++) P.push({ x:innerWidth/2+(Math.random()-0.5)*140, y:innerHeight*0.34,
    vx:(Math.random()-0.5)*9, vy:-4-Math.random()*7, r:3+Math.random()*4,
    c:cols[(Math.random()*cols.length)|0], a:Math.random()*6.28, va:(Math.random()-0.5)*0.3 });
  const t0=performance.now();
  (function tick(){ const el=(performance.now()-t0)/1000; ctx.clearRect(0,0,cv.width,cv.height);
    if(el>=2.8) return;
    for(const p of P){ p.x+=p.vx; p.y+=p.vy; p.vy+=0.25; p.a+=p.va;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); ctx.globalAlpha=Math.max(0,1-el/2.6);
      ctx.fillStyle=p.c; ctx.fillRect(-p.r,-p.r*0.6,p.r*2,p.r*1.2); ctx.restore(); }
    requestAnimationFrame(tick); })(); }

// ---------------- туториал: ведёт комендант Филин 🦉 ----------------
const TUT_KEY='g_zahvat_tut';
let tutStep=-1;
const TUT_STEPS=[
  { txt:'Привет! Я <b>комендант Филин</b>. Потяни пальцем линию от <b>синей</b> башни к серой — отправим войска!',
    done:()=>links.some(L=>L.o===1) },
  { txt:'Пошли! Когда у серой башни кончатся защитники — она станет нашей. Подожди чуть-чуть…',
    done:()=>nodes.filter(n=>n.o===1).length>=2 },
  { txt:'Отлично! 🎉 Пока башня ни с кем не воюет, войска в ней растут. Захвати и вторую серую башню.',
    done:()=>nodes.filter(n=>n.o===1).length>=3 },
  { txt:'Чем больше войск в башне, тем больше стрелок: от 10 — две, от 30 — три. Теперь тяни линию к <b>красной</b> башне!',
    done:()=>links.some(L=>L.o===1 && nodes[L.to] && nodes[L.to].o===2) },
  { txt:'В атаку! Захвати все красные башни — и карта наша. ⚔️ Лишнюю связь можно убрать: тапни по линии.',
    done:()=>false },
];
function tutShow(){ const el=$('tut'); el.classList.remove('show'); void el.offsetWidth;
  el.classList.add('show'); $('tutTxt').innerHTML=TUT_STEPS[tutStep].txt; }
function tutHide(){ $('tut').classList.remove('show'); }
function tutTick(){ if(tutStep<0) return;
  if(TUT_STEPS[tutStep].done()){ tutStep++;
    if(tutStep>=TUT_STEPS.length){ tutStep=-1; tutHide(); }
    else { sfx('step'); tutShow(); } } }

// ---------------- герой: комендант Филин, прокачка за звёзды ----------------
const HERO_LEVELS=[
  { need:3,  icon:'⚙️', name:'Производство +10%' },
  { need:6,  icon:'⚡', name:'Активка «Рывок»: ×2 поток на 5 с' },
  { need:9,  icon:'🪖', name:'+6 войск на старте' },
  { need:12, icon:'💨', name:'Скорость войск +15%' },
  { need:15, icon:'📦', name:'Ёмкость башен +20%' },
  { need:18, icon:'🌟', name:'«Рывок» ×3 и перезарядка 15 с' },
];
let HLVL=0, rushT=0, rushCD=0;
function totalStars(){ let s=bestEndless|0; for(const k in bestStars) s+=bestStars[k]|0; return s; }
function refreshHero(){ const t=totalStars(); HLVL=0; for(const h of HERO_LEVELS){ if(t>=h.need) HLVL++; } }

// сложность: множители силы бота (живут в localStorage, применяются сразу)
const DIFFS={
  easy:{ label:'😌 Легко', prod:0.75, think:1.45, spec:0.2, defend:false, aggroMul:0.7 },
  norm:{ label:'⚖️ Норма', prod:0.88, think:1.15, spec:0.4, defend:true, aggroMul:0.95 },
  hard:{ label:'🔥 Сложно', prod:1.05, think:0.9, spec:0.65, defend:true, aggroMul:1.1 },
};
let diff=localStorage.getItem('g_zahvat_diff')||'norm'; if(!DIFFS[diff]) diff='norm';
function D(){ return DIFFS[diff]; }
const TIPS=[
  'захвати 🌾 мельницу и держи рядом свои башни — аура производства решает.',
  'против ⚔ атаки ставь 🛡 защиту — она гасит 40% урона.',
  '✨ Завод в тылу, ⚔ атака и 🚜 осада на границе — как делает бот 😉',
  'не распыляйся: одна цель — один кулак из двух-трёх связей.',
  'сними лишние связи тапом — войска будут копиться дома.',
  'дебют «Фундамент» открывает специализацию с первой секунды.',
  'башня 4 уровня усиливает все связанные с ней башни на +25%.',
  'мало солдат — стрелки бьют вполсилы: не растягивай слабую башню на две цели.',
];

let CMD=null, pTempo=false, eTempo=false;   // командир карты и дебюты «Темп»
function cap(n){ let c=CAP_BASE*n.l; if(n.o===1 && HLVL>=5) c*=1.2; return c; }
function millBoost(n){ for(const m of nodes){ if(m!==n && m.o===n.o && m.trait==='mill' &&
  Math.hypot(m.x-n.x,m.z-n.z)<5.5) return 1.3; } return 1; }
// синергия L4: башня 4 уровня производит +25% и даёт +25% всем своим башням, связанным с ней
function synergy(n){
  if(n.l>=4) return 1.25;
  for(const L of links){
    if(L.from===n.id){ const t=nodes[L.to]; if(t && t.o===n.o && t.l>=4) return 1.25; }
    else if(L.to===n.id){ const f=nodes[L.from]; if(f && f.o===n.o && f.l>=4) return 1.25; }
  }
  return 1;
}
function prod(n){ let p=PROD_BASE*n.l*synergy(n)*millBoost(n);
  if(n.spec==='spirit') p*=1.5;   // Духи — «Завод»: производство ×1.5 (бывш. эконом)
  if(n.o===1){ if(HLVL>=1) p*=1.1; if(rushT>0) p*=(HLVL>=6?3:2); if(pTempo && simTime<20) p*=1.3; }
  else if(n.o===2){ p*=D().prod; if(CMD==='greed') p*=1.15; if(eTempo && simTime<20) p*=1.3; }
  return p; }
// КЛАССЫ (стиль = роль). null = «рекрут». Иконка в подписи + акцент-цвет цоколя.
const SPEC_ICON  ={ chibi:'🛡', knight:'⚔', mech:'🚜', spirit:'✨' };
const CLASS_ACCENT={ chibi:0x2fb08a, knight:0xcaa23c, mech:0xc9622e, spirit:0x7c5cff };
// стрелок = уровню башни (маяк +1) — стабильно, не «плавает» от числа войск
function linkCap(n){ return Math.min(4,n.l) + (n.trait==='beacon'?1:0); }
function flowNeed(k){ return k<=1?0 : k===2?10 : k===3?30 : 60; }
// солдат меньше порога — стрелки остаются, но поток слабеет
function flowMul(n,k){ const need=flowNeed(k); return (need<=0 || n.t>=need) ? 1 : Math.max(0.35, n.t/need); }
function synergyOn(n){ return n.l>=4; }            // L4 unlocks synergy
function worldPos(nx,ny){ return new THREE.Vector3((nx-0.5)*ISL_W*GROUNDPAD, GROUND_TOP, (ny-0.5)*ISL_D*GROUNDPAD); }
function camViewSize(){ const aspect=innerWidth/innerHeight;
  const halfW=(ISL_W+ISL_D)*0.5*0.62, halfH=(ISL_W+ISL_D)*0.5*0.40;
  return Math.max(halfH, halfW/aspect)*1.06; }

async function init(){
  await initPlatform();
  await cloudLoad();
  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;   // keep the kit's vibrant baked colors
  document.getElementById('app').appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
  labelRenderer.setSize(innerWidth, innerHeight);

  scene = new THREE.Scene();
  scene.background = makeSky();
  scene.fog = new THREE.Fog(0xc7e6f2, 80, 180);
  // soft studio image-based lighting -> materials read much nicer
  try{ const pmrem=new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; }catch(e){ console.warn('env',e); }

  // camera: isometric orthographic
  const aspect = innerWidth/innerHeight; const vs = camViewSize();
  camera = new THREE.OrthographicCamera(-vs*aspect, vs*aspect, vs, -vs, 0.1, 200);
  camera.position.set(18, 21, 18); camera.lookAt(0, 0.4, 0);

  // lights (IBL provides ambient; sun gives shape + shadows)
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x5c7a42, 0.5));
  sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.position.set(13, 22, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera; sc.left=-18; sc.right=18; sc.top=14; sc.bottom=-14; sc.near=1; sc.far=80;
  sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.04; sun.shadow.radius=4; scene.add(sun);
  const fill=new THREE.DirectionalLight(0xbcd2ff, 0.32); fill.position.set(-14,9,-4); scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff, 0.7); rim.position.set(-7,7,-15); scene.add(rim);

  raycaster = new THREE.Raycaster();
  groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(200,200).rotateX(-Math.PI/2),
                               new THREE.MeshBasicMaterial({visible:false}));
  scene.add(groundPlane);

  // stripe texture for flow ribbons
  stripeTex = makeStripeTexture();

  // load models
  const loader = new GLTFLoader();
  const names = {
    tb:'td/tower-round-build-b.glb', tc:'td/tower-round-build-c.glb', td:'td/tower-round-build-d.glb', tf:'td/tower-round-build-f.glb',
    tree:'nat/tree_oak.glb', tree2:'nat/tree_default.glb', tree3:'nat/tree_fat.glb', pine:'nat/tree_pineRoundA.glb', pine2:'nat/tree_pineDefaultA.glb',
    pine3:'nat/tree_pineRoundC.glb', treeF:'nat/tree_oak_fall.glb', tree2F:'nat/tree_default_fall.glb', tree3F:'nat/tree_fat_fall.glb',
    mushT:'nat/mushroom_tanGroup.glb', logD:'nat/log.glb', stump:'nat/stump_old.glb',
    bush:'nat/plant_bush.glb', bushL:'nat/plant_bushLarge.glb', grass:'nat/grass.glb', grassL:'nat/grass_large.glb',
    fR:'nat/flower_redB.glb', fY:'nat/flower_yellowB.glb', fP:'nat/flower_purpleB.glb',
    rock:'nat/rock_smallB.glb', rock2:'nat/rock_largeB.glb', mush:'nat/mushroom_redGroup.glb',
    fence:'nat/fence_simple.glb', fenceP:'nat/fence_planks.glb', fenceG:'nat/fence_gate.glb', camp:'nat/campfire_logs.glb', campS:'nat/campfire_stones.glb', sign:'nat/sign.glb', logS:'nat/log_stack.glb', vlg:'nat/villager.glb', cflag:'c-flag.glb',
    h1:'vil/house1.glb', h2:'vil/house2.glb', h3:'vil/house3.glb', h4:'vil/house4.glb', h5:'vil/house5.glb', h6:'vil/house6.glb' };
  const entries = await Promise.all(Object.entries(names).map(async ([k,f])=>{
    const g = await loader.loadAsync('models/'+f); return [k, g.scene];
  }));
  for(const [k,s] of entries) MODELS[k]=s;
  buildTowerTextures();   // перекрашенные под команды варианты текстуры башни

  buildGround();
  buildScenery();
  document.getElementById('loading').style.display='none';

  // drag line
  const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
  dragLine = new THREE.Line(lg, new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.85}));
  dragLine.visible=false; scene.add(dragLine);

  bindInput();
  loadMap(0);
  setupPost();
  if(qLevel) applyQuality(qLevel);   // запомненный «лёгкий» режим со старта
  platformReady();
  renderer.setAnimationLoop(frame);
}

function setupPost(){
  try{
    const rt=new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type:THREE.HalfFloatType });
    composer=new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene,camera));
    gtaoPass=null;   // GTAO disabled — it produced a stray dark quad artifact
    bloomPass=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 0.14, 0.6, 0.96);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    try{ composer.addPass(new SMAAPass(innerWidth, innerHeight)); }catch(e){}
  }catch(e){ console.warn('post off',e); composer=null; }
}

function makeSky(cols){ cols=cols||['#d3ecf6','#bfe2f0','#a3cfe4'];
  const c=document.createElement('canvas'); c.width=4; c.height=256; const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,256);
  g.addColorStop(0,cols[0]); g.addColorStop(0.62,cols[1]); g.addColorStop(1,cols[2]);
  x.fillStyle=g; x.fillRect(0,0,4,256);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
function makeStripeTexture(){
  // шевроны остриём к верху канвы (v=1) — поток бежит от источника к цели
  const c=document.createElement('canvas'); c.width=16; c.height=64; const x=c.getContext('2d');
  x.clearRect(0,0,16,64);
  x.fillStyle='#fff';
  for(let i=0;i<2;i++){ const y=i*32;
    x.beginPath(); x.moveTo(2,y+20); x.lineTo(8,y+8); x.lineTo(14,y+20); x.lineTo(14,y+27); x.lineTo(8,y+15); x.lineTo(2,y+27); x.closePath(); x.fill(); }
  const t=new THREE.CanvasTexture(c); t.wrapS=THREE.RepeatWrapping; t.wrapT=THREE.RepeatWrapping; return t;
}

let groundMat=null, groundPatches=[];
function buildGround(){
  GROUND_TOP = 0;
  // ровная земля с плавной тональной фактурой (vertex-цвета как множитель к цвету биома)
  groundMat=new THREE.MeshStandardMaterial({color:0x77c24e, roughness:1, metalness:0, vertexColors:true});
  const geo=new THREE.PlaneGeometry(180,180,120,120).rotateX(-Math.PI/2);
  const pos=geo.attributes.position, col=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), z=pos.getZ(i);
    // низкочастотный «шум» -> крупные мягкие пятна; в центре карты чуть светлее
    const n=Math.sin(x*0.13+1.3)*Math.cos(z*0.11)
          + Math.sin(x*0.07-z*0.09)*0.6
          + Math.cos(z*0.17+x*0.05)*0.4;
    let m=1+ n*0.10;                                  // множитель яркости — крупные мягкие пятна
    const d=Math.hypot(x,z); if(d<20) m+=0.05*(1-d/20); // лёгкий подсвет игровой зоны
    m=Math.max(0.78,Math.min(1.2,m));
    col.push(m,m,m);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  const g=new THREE.Mesh(geo, groundMat);
  g.position.y=0; g.receiveShadow=true; scene.add(g);
  // groundPatches остаётся пустым — фактуру теперь даёт vertex-цвет (applyBiome это учитывает)
}
function applyBiome(b){
  if(groundMat) groundMat.color.setHex(b.ground);
  groundPatches.forEach((p,i)=>p.material.color.setHex(i%2? b.pA : b.pB));
  scene.background=makeSky(b.sky);
  if(scene.fog) scene.fog.color.setHex(b.fog);
}
function findMesh(root){ let found=null; root.traverse(o=>{ if(!found && o.isMesh) found=o; }); return found; }
// auto-normalize a character: stand up + scale to height + drop feet to ground
function addChar(model,x,z,h,ry){ const m=model.clone(true); let box=new THREE.Box3().setFromObject(m); const sz=new THREE.Vector3(); box.getSize(sz);
  if(sz.y<Math.max(sz.x,sz.z)*0.6){ m.rotation.x=-Math.PI/2; box=new THREE.Box3().setFromObject(m); box.getSize(sz); }
  m.scale.multiplyScalar(h/Math.max(1e-4,sz.y)); box=new THREE.Box3().setFromObject(m); m.position.set(x,-box.min.y,z); m.rotation.y=ry;
  m.traverse(c=>{ if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } }); scene.add(m); }
function buildScenery(){
  const ribbon=(pts,w,col,flat)=>{ const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],0.03,p[1])));
    const geo=new THREE.TubeGeometry(curve,64,w,10,false); const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:col,roughness:1})); mesh.scale.y=flat; mesh.position.y=0.02; mesh.receiveShadow=true; scene.add(mesh); return curve; };
  const roadCurve=ribbon([[-26,9],[-13,7.5],[-2,9],[10,7.5],[26,9]],1.3,0x9c7b4a,0.05);   // road (south)
  ribbon([[-26,-9],[-12,-7.5],[2,-9.5],[14,-7.5],[26,-9]],1.7,0x49a9d8,0.05);              // river (north)
  const onRoad=t=>{ const p=roadCurve.getPointAt(t),tan=roadCurve.getTangentAt(t).normalize(); return {p,tan,perp:new THREE.Vector3(-tan.z,0,tan.x)}; };
  // fence along the road
  const N=Math.max(10,Math.round(roadCurve.getLength()/1.0)), off=1.95;
  for(let i=0;i<=N;i++){ const t=i/N, o=onRoad(t); const x=o.p.x+o.perp.x*off,z=o.p.z+o.perp.z*off,yaw=Math.atan2(-o.tan.z,o.tan.x);
    if(Math.abs(t-0.5)<0.04){ const g=MODELS.fenceG.clone(true); g.position.set(x,0,z); g.rotation.y=yaw; g.scale.setScalar(0.95); scene.add(g); continue; }
    const m=((i%6===0)?MODELS.fenceP:MODELS.fence).clone(true); m.position.set(x,0,z); m.rotation.y=yaw; m.scale.setScalar(0.95); scene.add(m); }
  // houses set back, facing the road
  const hm=[MODELS.h1,MODELS.h2,MODELS.h3,MODELS.h4,MODELS.h5,MODELS.h6];
  [0.30,0.38,0.46,0.54,0.62,0.70].forEach((t,i)=>{ const o=onRoad(t); const x=o.p.x+o.perp.x*4.4,z=o.p.z+o.perp.z*4.4;
    const h=hm[i].clone(true); h.position.set(x,0,z); h.rotation.y=Math.atan2(-o.perp.x,-o.perp.z); h.scale.setScalar(1.4);
    h.traverse(c=>{ if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } }); scene.add(h); });
  // campfire, sign, villagers
  { const o=onRoad(0.5); const a=MODELS.campS.clone(true); a.position.set(o.p.x+o.perp.x*2.8,0,o.p.z+o.perp.z*2.8); a.scale.setScalar(0.6); scene.add(a);
    const b=MODELS.camp.clone(true); b.position.copy(a.position); b.scale.setScalar(0.5); scene.add(b); }
  { const o=onRoad(0.04); const s=MODELS.sign.clone(true); s.position.set(o.p.x+o.perp.x*0.95,0,o.p.z+o.perp.z*0.95); s.rotation.y=Math.atan2(-o.perp.x,-o.perp.z); s.scale.setScalar(0.9); scene.add(s); }
  [0.32,0.5,0.7].forEach(t=>{ const o=onRoad(t); addChar(MODELS.vlg,o.p.x+o.perp.x*1.5,o.p.z+o.perp.z*1.5,1.6,Math.random()*6.28); });
}

// ---------------- map / nodes ----------------
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function genDecor(seed,b){ const rng=mulberry32(seed*131+7), out=[];
  const inBand=z=> (z>5.5 && z<13) || (z<-5 && z>-13);   // keep road/village + river bands clear
  const fits=(x,z,r)=> !inBand(z) && out.every(d=>Math.hypot(x-d.x,z-d.z)>=r+(d.r||0.4)) && nodes.every(n=>Math.hypot(x-n.x,z-n.z)>=r+1.9);
  // tree groves toward the edges (glade kept open); species & density per biome
  for(let g=0; g<b.groves; g++){ const a=rng()*6.283, gr=8+rng()*8, gx=Math.cos(a)*gr, gz=Math.sin(a)*gr*0.82;
    const sp=b.trees[(rng()*b.trees.length)|0], n=3+((rng()*4)|0);
    for(let i=0;i<n;i++){ const x=gx+(rng()-0.5)*4, z=gz+(rng()-0.5)*4;
      if(Math.abs(x)<7 && Math.abs(z)<4.6) continue; const s=0.8+rng()*0.5, r=0.8*s;
      if(fits(x,z,r)) out.push({x,z,type:sp,rot:rng()*6.28,s,r}); } }
  const scatter=(cnt,types,smin,smax,r,minRad)=>{ for(let i=0;i<cnt;i++){ const a=rng()*6.283, gr=minRad+rng()*12, x=Math.cos(a)*gr, z=Math.sin(a)*gr*0.82;
    if(Math.abs(x)<6.5 && Math.abs(z)<4.2 && rng()<0.7) continue;
    if(fits(x,z,r)) out.push({x,z,type:types[(rng()*types.length)|0],rot:rng()*6.28,s:smin+rng()*(smax-smin),r}); } };
  scatter(b.bushes,['bush','bushL'],0.7,1.1,0.5,5);
  scatter(b.grassN,['grass','grassL'],0.7,1.2,0.25,3);
  scatter(b.flowersN,['fR','fY','fP'],0.7,1.1,0.3,4);
  scatter(b.rocksN,['rock','rock2'],0.7,1.1,0.5,6);
  scatter(b.mushN,[b.mush||'mush'],0.6,0.9,0.3,6);
  scatter(b.logsN,['logD','stump'],0.8,1.1,0.5,6);
  return out;
}

let nodeGroup=null, decorGroup=null, soldierGroup=null, linkGroup=null;
function clearGroup(g){ if(!g) return; while(g.children.length) g.remove(g.children[0]); }

// ---------------- бесконечный режим: карты по правилам ----------------
let curMap=null, endless=false, endlessRound=1,
    bestEndless=+(localStorage.getItem('g_zahvat_endless')||0);
function genEndless(r){
  const rng=mulberry32(r*7919+13);
  const bioKeys=Object.keys(BIOMES), biome=bioKeys[(r-1)%bioKeys.length];
  const nodes=[ {x:.12,y:.5,o:1,t:24,l:1},
                {x:.88,y:.5,o:2,t:Math.min(60,22+r*3),l:r>=5?2:1} ];
  const pts=[{x:.12,y:.5},{x:.88,y:.5}];
  const far=(x,y)=>pts.every(p=>Math.hypot((x-p.x)*12.6,(y-p.y)*8.4)>=2.3);
  const pairs=Math.min(5,1+Math.ceil(r/2));   // нейтралы зеркальными парами — честный старт
  for(let k=0;k<pairs;k++){
    let x,y,tries=0;
    do{ x=.2+rng()*.6; y=.14+rng()*.72; tries++; }
    while(tries<80 && !(far(x,y) && far(1-x,1-y) && Math.hypot((2*x-1)*12.6,(2*y-1)*8.4)>=2.3));
    if(tries>=80) continue;
    const t=8+((rng()*10)|0), l=(r>=4 && rng()<0.3)?2:1;
    const tr = rng()<0.35 ? ['mill','fort','beacon'][(rng()*3)|0] : null;   // парам — одинаковый трейт
    nodes.push({x,y,o:0,t,l,tr});         pts.push({x,y});
    nodes.push({x:1-x,y:1-y,o:0,t,l,tr}); pts.push({x:1-x,y:1-y});
  }
  if(rng()<0.5 && far(.5,.5)) nodes.push({x:.5,y:.5,o:0,t:14+((rng()*8)|0),l:1, tr:(rng()<0.4?'fort':null)});
  const cmdKeys=Object.keys(COMMANDERS);
  return { name:'Раунд '+r, biome, par:60+nodes.length*9, aggro:Math.min(0.85,0.38+r*0.05), nodes,
           cmd: r>=2 ? cmdKeys[(r-2)%cmdKeys.length] : null };
}
function loadMap(i){ endless=false; mapIndex=i; startMap(MAPS[i], i, (i+1)+'. '+MAPS[i].name); }
function loadEndless(r){ endless=true; endlessRound=r; startMap(genEndless(r), 100+r, '∞ Раунд '+r); }

function startMap(m, seed, label){
  curMap=m;
  // reset groups
  if(nodeGroup) scene.remove(nodeGroup); if(decorGroup) scene.remove(decorGroup);
  if(soldierGroup) scene.remove(soldierGroup); if(linkGroup) scene.remove(linkGroup);
  nodeGroup=new THREE.Group(); decorGroup=new THREE.Group(); soldierGroup=new THREE.Group(); linkGroup=new THREE.Group();
  scene.add(nodeGroup); scene.add(decorGroup); scene.add(soldierGroup); scene.add(linkGroup);
  // clear labels
  document.getElementById('labels').innerHTML='';

  const biome=BIOMES[m.biome]||BIOMES.meadow;
  applyBiome(biome);

  nodes = m.nodes.map((d,idx)=>{ const p=worldPos(d.x,d.y);
    return { id:idx, nx:d.x, ny:d.y, x:p.x, z:p.z, o:d.o, t:d.t, l:d.l||1, atk:0, spec:null, trait:d.tr||null, view:null, lr:-1, or:-1 }; });
  hideSpec();
  countToken++; counting=false; document.getElementById('count').style.display='none';
  CMD=m.cmd||null; pTempo=false; eTempo=false;
  refreshHero(); rushT=0; rushCD=0;
  if(HLVL>=3) for(const n of nodes){ if(n.o===1) n.t+=6; }   // 🪖 стартовый бонус героя
  links=[]; soldiers=[]; linkSig=''; drag=null; botTimer=0; ended=false; running=true; speed=1; simTime=0;
  document.getElementById('speedBtn').textContent='×1';
  document.getElementById('mapName').textContent=label+' · '+biome.label;
  hideOverlay('ovEnd'); hideOverlay('ovMenu'); hideOverlay('ovIntro');
  if(!endless && mapIndex===0 && !localStorage.getItem(TUT_KEY)){ tutStep=0; tutShow(); }
  else { tutStep=-1; tutHide(); }
  const hintEl=document.getElementById('hint');
  hintEl.textContent='Тяни от своей башни к другой — создать связь. Убрать: тапни по линии.';
  hintEl.style.opacity = (!endless && mapIndex===0 && tutStep<0)?'1':'0';

  // decor
  decor=genDecor(seed,biome);
  for(const d of decor){ const src=MODELS[d.type]; const o=src.clone(true);
    o.traverse(c=>{ if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; } });
    o.position.set(d.x,GROUND_TOP,d.z); o.rotation.y=d.rot; o.scale.setScalar(d.s);
    decorGroup.add(o); }

  for(const n of nodes) buildTower(n);
  pickPrompted=false;
  showIntro(m,label);   // интро перед каждым боем; на карте 1 — упрощённое, без дебютов
}

// отсчёт перед боем: поле видно, бот заморожен — время осмотреться (и даже протянуть линию)
let countToken=0, counting=false;
function startCountdown(){
  const my=++countToken; counting=true; running=false;
  const el=$('count'); el.style.display='flex';
  let n=3;
  (function tick(){
    if(my!==countToken){ el.style.display='none'; return; }
    if(n>0){ el.innerHTML='<div class="n">'+n+'</div><div class="s">осмотрись — можно уже тянуть линии</div>';
      sfx('step'); n--; setTimeout(tick,700); }
    else { el.innerHTML='<div class="n go">⚔️ В бой!</div>'; sfx('rush');
      setTimeout(()=>{ if(my===countToken) el.style.display='none'; },650);
      counting=false; botTimer=0.9; running=true; gpStart(); }
  })();
}

// ---------------- интро боя: командир, здания, выбор дебюта ----------------
function showIntro(m,label){
  running=false;
  const firstMap = !endless && mapIndex===0;
  $('inMap').textContent=label;
  const c=m.cmd?COMMANDERS[m.cmd]:null;
  $('inCmd').innerHTML = c
    ? '<span class="ce">'+c.emoji+'</span><span><b>Командир '+c.name+'</b><br><small>'+c.desc+'</small></span>'
    : '<span class="ce">🦉</span><span><b>Филин на связи</b><br><small>'+(firstMap?'разведка: у врага обычный гарнизон':'у врага обычный гарнизон, без умений')+'</small></span>';
  const trs=[...new Set(nodes.filter(n=>n.trait).map(n=>n.trait))];
  const tl=$('inTraits');
  tl.innerHTML = trs.map(t=>TRAITS[t].icon+' <b>'+TRAITS[t].name+'</b> — '+TRAITS[t].desc).join('<br>');
  tl.style.display = trs.length?'block':'none';
  const g=$('inGambits');
  if(firstMap){
    $('inGambitsTitle').style.display='none';
    g.innerHTML='<button class="btn primary" id="introGo" style="font-size:17px;padding:14px 34px">⚔️ В бой</button>';
    document.getElementById('introGo').onclick=()=>{ hideOverlay('ovIntro'); startCountdown(); };
  } else {
    $('inGambitsTitle').style.display='block';
    g.innerHTML='';
    Object.entries(GAMBITS).forEach(([k,d])=>{ const b=document.createElement('button'); b.className='gcard';
      b.innerHTML='<span class="gi">'+d.icon+'</span><span><b>'+d.name+'</b><small>'+d.desc+'</small></span>';
      b.onclick=()=>chooseGambit(k); g.appendChild(b); });
  }
  document.getElementById('ovIntro').className='overlay show';
}
function applyGambit(side,key){
  const own=nodes.filter(n=>n.o===side); if(!own.length) return;
  const top=own.reduce((a,b)=>a.t>b.t?a:b);
  if(key==='reserve') top.t+=10;
  else if(key==='found'){ if(top.l<MAX_LEVEL) top.l++; }
  else if(key==='tempo'){ if(side===1) pTempo=true; else eTempo=true; }
}
function chooseGambit(k){
  const keys=Object.keys(GAMBITS), ek=keys[(Math.random()*keys.length)|0];
  applyGambit(1,k); applyGambit(2,ek);
  hideOverlay('ovIntro'); startCountdown();
  const c=CMD?COMMANDERS[CMD]:null;
  const h=$('hint'); h.textContent=(c? c.emoji+' '+c.name : 'Враг')+' выбирает дебют: «'+GAMBITS[ek].name+'»';
  h.style.opacity='1'; setTimeout(()=>{ h.style.opacity='0'; },3500);
}

// --- декор башни: контактная тень + каменный цоколь + флаг команды ---
let _contactTex=null;
function contactShadowTex(){
  if(_contactTex) return _contactTex;
  const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,4,64,64,60);
  g.addColorStop(0,'rgba(0,0,0,0.5)'); g.addColorStop(0.55,'rgba(0,0,0,0.24)'); g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.fillRect(0,0,128,128);
  _contactTex=new THREE.CanvasTexture(c); return _contactTex;
}
function makeTeamFlag(color,topY){
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.032,0.7,7),
    new THREE.MeshStandardMaterial({color:0x6b5636,roughness:0.85}));
  pole.position.y=0.35; pole.castShadow=true; g.add(pole);
  const cloth=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.27),
    new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.18,roughness:0.6,side:THREE.DoubleSide}));
  cloth.position.set(0.22,0.58,0); cloth.castShadow=true; g.add(cloth);
  const knob=new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8),
    new THREE.MeshStandardMaterial({color:0xffd27a,roughness:0.4,metalness:0.3}));
  knob.position.y=0.71; g.add(knob);
  g.position.y=topY-0.12; g.scale.setScalar(0.9);
  return g;
}

// Башня kit-модели красная в САМОЙ текстуре (палитра-атлас). Готовим по варианту
// текстуры на команду: «тёплые/красные» свотчи перекрашиваются в цвет владельца
// (яркость свотча сохраняется), серый камень и прочее — без изменений.
const TOWER_TEX={};
function buildTowerTextures(){
  let src=null;
  MODELS.tb.traverse(o=>{ if(!src && o.isMesh && o.material && o.material.map) src=o.material.map; });
  if(!src || !src.image) return;
  const img=src.image, W=img.width||512, H=img.height||512;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const cx=c.getContext('2d', {willReadFrequently:true});
  cx.drawImage(img,0,0,W,H);
  const base=cx.getImageData(0,0,W,H);
  for(const o of [0,1,2]){
    const out=new ImageData(new Uint8ClampedArray(base.data), W, H);
    const d=out.data, tc=new THREE.Color(SOLID[o]);
    for(let i=0;i<d.length;i+=4){
      const r=d[i], g=d[i+1], b=d[i+2];
      // красно-оранжевое семейство свотчей (крыша, поясок)
      if(r>110 && r>g*1.35 && r>b*1.35){
        const lum=Math.min(1,(r*0.6+g*0.3+b*0.1)/210);   // сохраняем светлоту свотча
        d[i]  =Math.round(tc.r*255*lum + 255*(1-lum)*0.12);
        d[i+1]=Math.round(tc.g*255*lum + 255*(1-lum)*0.12);
        d[i+2]=Math.round(tc.b*255*lum + 255*(1-lum)*0.12);
      }
    }
    const cc=document.createElement('canvas'); cc.width=W; cc.height=H;
    cc.getContext('2d').putImageData(out,0,0);
    const t=new THREE.CanvasTexture(cc);
    t.flipY=src.flipY; t.colorSpace=src.colorSpace; t.wrapS=src.wrapS; t.wrapT=src.wrapT;
    t.magFilter=src.magFilter; t.minFilter=src.minFilter; t.generateMipmaps=true; t.needsUpdate=true;
    TOWER_TEX[o]=t;
  }
}
// подменяем текстуру башни на вариант владельца (материалы клонируем, чтобы не задеть общий кит)
function tintTowerTeam(root,owner){
  const tex=TOWER_TEX[owner]; if(!tex) return;
  root.traverse(o=>{ if(!o.isMesh || !o.material) return;
    const arr=Array.isArray(o.material)?o.material:[o.material];
    const out=arr.map(m=>{ if(!m.map) return m; const c=m.clone(); c.map=tex; c.needsUpdate=true; return c; });
    o.material=Array.isArray(o.material)?out:out[0]; });
}

const TOWER={1:'tb',2:'tc',3:'td',4:'tf'}; // level -> Tower Defense Kit model
function buildTower(n){
  if(n.view){ nodeGroup.remove(n.view.group);
    if(n.view.div && n.view.div.parentNode) n.view.div.parentNode.removeChild(n.view.div); }
  const group=new THREE.Group(); group.position.set(n.x, GROUND_TOP, n.z); group.scale.setScalar(1.0);
  // мягкая контактная тень — башня «прилипает» к земле
  const csh=new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({ map:contactShadowTex(), transparent:true, opacity:0.5, depthWrite:false }));
  csh.position.y=0.015; csh.renderOrder=-1; group.add(csh);
  // каменный цоколь — цвет-акцент по классу (разводит башни визуально), иначе серый
  const cocleCol = n.spec ? CLASS_ACCENT[n.spec] : 0x8b8f96;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.84,0.18,24),
    new THREE.MeshStandardMaterial({ color:cocleCol, roughness:0.9 }));
  base.position.y=0.09; base.castShadow=true; base.receiveShadow=true; base.userData.nodeId=n.id; group.add(base);
  // team ring on the ground (ownership); у врага — шестигранник (форма, не только цвет)
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.64,0.07,12,n.o===2?6:40).rotateX(Math.PI/2),
    new THREE.MeshStandardMaterial({ color:SOLID[n.o], emissive:SOLID[n.o], emissiveIntensity:0.5, roughness:0.5 }));
  ring.position.y=0.18; group.add(ring);
  // TD-kit tower model, grows by level (b->c->d->f) — стоит на цоколе, тонирована в цвет команды
  const tow=MODELS[TOWER[Math.min(4,n.l)]].clone(true);
  tow.scale.setScalar(n.trait==='fort'?1.38:1.15); tow.position.y=0.17;
  tintTowerTeam(tow, n.o);           // крыша и поясок — уже в цвете владельца (перекрашенная текстура)
  tow.traverse(c=>{ if(c.isMesh){ c.castShadow=true; c.receiveShadow=true; c.userData.nodeId=n.id; } });
  group.add(tow);
  const topY=new THREE.Box3().setFromObject(tow).max.y;
  // флаг команды на вершине (у своих/врага; нейтралам и маякам — нет, чтобы не пестрило)
  if((n.o===1||n.o===2) && n.trait!=='beacon'){
    const flag=makeTeamFlag(SOLID[n.o], topY);
    flag.traverse(c=>{ if(c.isMesh) c.userData.nodeId=n.id; }); group.add(flag);
  }
  // особые здания: мельница — домик рядом, маяк — флаг
  if(n.trait==='mill'){ const h=MODELS.h2.clone(true); h.scale.setScalar(0.6);
    h.position.set(0.95,0,0.6); h.rotation.y=-0.7;
    h.traverse(c=>{ if(c.isMesh){ c.castShadow=true; c.userData.nodeId=n.id; } }); group.add(h); }
  if(n.trait==='beacon'){ const f=MODELS.cflag.clone(true); f.scale.setScalar(0.9);
    f.position.set(-0.75,0,0.55);
    f.traverse(c=>{ if(c.isMesh){ c.castShadow=true; c.userData.nodeId=n.id; } }); group.add(f); }
  // L4 synergy glow
  if(synergyOn(n)){ const halo=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.06,10,28).rotateX(Math.PI/2),
      new THREE.MeshStandardMaterial({ color:0xffe08a, emissive:0xffd166, emissiveIntensity:1.0, roughness:0.4 }));
    halo.position.y=1.55; group.add(halo); }
  // invisible easy-tap target
  const pick=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,2.2,12), new THREE.MeshBasicMaterial({visible:false}));
  pick.position.y=1.1; pick.userData.nodeId=n.id; group.add(pick);
  // number label
  const div=document.createElement('div'); div.className='tlabel'+(n.o===2?' en':n.o===0?' nt':'');
  const label=new CSS2DObject(div); label.position.set(0, 2.0, 0); group.add(label);
  nodeGroup.add(group);
  n.view={group, div, label}; n.lr=n.l; n.or=n.o; n.cr=n.spec;
}

// ---------------- simulation (same rules as before) ----------------
function findLink(f,t){ return links.find(L=>L.from===f && L.to===t); }
function removeLink(L){ const i=links.indexOf(L); if(i>=0) links.splice(i,1); }
function removeLinksFrom(id){ links.filter(L=>L.from===id).forEach(removeLink); }
function toggleLink(from,to){ if(from===to) return; const src=nodes[from];
  const ex=findLink(from,to); if(ex){ removeLink(ex); sfx('unlink'); return; }
  const out=links.filter(L=>L.from===from); if(out.length>=linkCap(src)) removeLink(out[0]);
  links.push({from,to,o:src.o,accum:0}); sfx('link'); }

// прочность в полевой стычке: пузатик самый живучий, дух — самый хрупкий
const CLASS_HP={ chibi:1.8, knight:1.3, mech:1.5, spirit:0.7, recruit:1 };
function spawnSoldier(from,to){ const c=from.spec;
  const dmg=(c==='knight'?1.4 : c==='mech'?1.8 : 1)*(from.o===2 && CMD==='war'?1.2:1);
  soldiers.push({ x:from.x, z:from.z, tid:to.id, o:from.o, mesh:null,
    kind: c||'recruit', dmg, hp:CLASS_HP[c||'recruit'], dead:0,
    fast:(c==='knight'||c==='spirit') }); }

// юниты = класс башни: 🛡 Пузатик / ⚔ Рыцарь / 🚜 Механизм / ✨ Дух / рекрут — все в цвет команды
function _sm(geo,mat,x,y,z){ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); return m; }
function makeSoldierMesh(kind,color){
  const g=new THREE.Group();
  const body=new THREE.MeshStandardMaterial({ color, roughness:0.5, emissive:color, emissiveIntensity:0.12 });
  const steel=new THREE.MeshStandardMaterial({ color:0xd3dae6, metalness:0.35, roughness:0.35 });
  const dark=new THREE.MeshStandardMaterial({ color:0x3a3f47, roughness:0.6 });
  if(kind==='knight'){          // Рыцарь — атака (туника, шлем, меч)
    g.add(_sm(new THREE.CylinderGeometry(0.13,0.17,0.32,12),body,0,0.32,0));
    g.add(_sm(new THREE.CylinderGeometry(0.175,0.175,0.05,12),dark,0,0.22,0));
    g.add(_sm(new THREE.SphereGeometry(0.11,14,12),steel,0,0.56,0));
    g.add(_sm(new THREE.BoxGeometry(0.02,0.09,0.14),body,0,0.66,0));                 // гребень
    g.add(_sm(new THREE.BoxGeometry(0.035,0.36,0.03),steel,0.21,0.42,0.03));         // меч
  } else if(kind==='chibi'){    // Пузатик — защита (круглый + большой щит)
    const t=_sm(new THREE.SphereGeometry(0.22,16,14),body,0,0.26,0); t.scale.y=0.85; g.add(t);
    g.add(_sm(new THREE.SphereGeometry(0.17,16,14),body,0,0.58,0));
    g.add(_sm(new THREE.SphereGeometry(0.03,8,8),dark,0.07,0.61,0.15));
    g.add(_sm(new THREE.SphereGeometry(0.03,8,8),dark,-0.07,0.61,0.15));
    g.add(_sm(new THREE.CylinderGeometry(0.21,0.21,0.04,18).rotateX(Math.PI/2),steel,0,0.32,0.22)); // щит
  } else if(kind==='mech'){     // Механизм — осада (танк)
    g.add(_sm(new THREE.BoxGeometry(0.4,0.1,0.5),new THREE.MeshStandardMaterial({color:0x2f333a,roughness:0.75}),0,0.09,0));
    g.add(_sm(new THREE.BoxGeometry(0.36,0.17,0.44),body,0,0.23,0));
    g.add(_sm(new THREE.CylinderGeometry(0.14,0.16,0.13,14),body,0,0.38,-0.03));
    g.add(_sm(new THREE.CylinderGeometry(0.032,0.038,0.42,8).rotateX(Math.PI/2),steel,0,0.38,0.3)); // ствол
  } else if(kind==='spirit'){   // Дух — поддержка (парящий кристалл)
    const gm=new THREE.MeshStandardMaterial({color:0xdff2ff,emissive:color,emissiveIntensity:1.5,roughness:0.15,transparent:true,opacity:0.92});
    g.add(_sm(new THREE.IcosahedronGeometry(0.2,0),gm,0,0.46,0));
    g.add(_sm(new THREE.TetrahedronGeometry(0.08),gm,0,0.22,0));
    g.add(_sm(new THREE.TetrahedronGeometry(0.05),gm,0,0.08,0));
  } else {                      // Рекрут — базовый (класс ещё не выбран)
    g.add(_sm(new THREE.CapsuleGeometry(0.13,0.18,4,10),body,0,0.28,0));
    g.add(_sm(new THREE.SphereGeometry(0.1,12,10),body,0,0.52,0));
  }
  g.traverse(c=>{ if(c.isMesh) c.castShadow=true; });
  return g;
}
function applyArrival(node, owner, dmg){
  if(node.o===owner){ node.t+=1; }
  else { node.atk=0.6;
    node.t-=(dmg||1)*(node.spec==='chibi'?0.6:1)*(node.trait==='fort'?0.5:1)*(node.o===2 && CMD==='forge'?0.85:1);
    if(node.t<=0){ const prev=node.o;
    node.o=owner; node.t=-node.t; node.atk=0; node.spec=null; removeLinksFrom(node.id);
    if(owner===1){ sfx('cap'); buzz(30); } else if(prev===1){ sfx('lost'); buzz([40,40,40]); } } }
}

function step(dt){
  simTime+=dt;
  rushT=Math.max(0,rushT-dt); rushCD=Math.max(0,rushCD-dt);
  tutTick();
  for(const n of nodes){
    if(n.atk>0) n.atk=Math.max(0,n.atk-dt);
    if(n.o===0) continue;
    links.filter(L=>L.from===n.id && L.o!==n.o).forEach(removeLink);
    const out=links.filter(L=>L.from===n.id);
    if(out.length===0){ const c=cap(n); if(n.t<c && n.atk<=0) n.t=Math.min(c, n.t+prod(n)*dt); }
    else { const per=(prod(n)/out.length)*flowMul(n,out.length)*dt;
      for(const L of out){ L.accum+=per; while(L.accum>=1){ L.accum-=1; spawnSoldier(n, nodes[L.to]); } } }
    if(n.t>cap(n)+0.001 && n.l<MAX_LEVEL){ n.l++;
      if(n.o===1){ sfx('lvl');
        // 2 уровень — открываем выбор класса сразу и объясняем (иначе никто не догадается тапнуть)
        if(n.l===2 && !n.spec && !pickPrompted){ pickPrompted=true; specHint(); setTimeout(()=>{ if(!n.spec && !ended) openSpec(n); }, 500); }
      } }
  }
  // полевые стычки: встречные вражеские юниты сходятся и падают (слабый гибнет)
  const CLASH=0.42, CLASH2=CLASH*CLASH;
  for(let i=0;i<soldiers.length;i++){ const a=soldiers[i]; if(a.dead) continue;
    for(let j=i+1;j<soldiers.length;j++){ const b=soldiers[j];
      if(b.dead || b.o===a.o) continue;                       // дерутся только враги
      const dx=a.x-b.x, dz=a.z-b.z; if(dx*dx+dz*dz>CLASH2) continue;
      const m=Math.min(a.hp,b.hp); a.hp-=m; b.hp-=m;          // размен прочностью
      if(a.hp<=0.001) a.dead=0.45; if(b.hp<=0.001) b.dead=0.45;
      if(a.dead) break;
    }
  }
  // soldiers move in world (x,z)
  for(let i=soldiers.length-1;i>=0;i--){ const s=soldiers[i], tn=nodes[s.tid];
    if(s.dead>0){ s.dead-=dt;                                  // падает — не идёт и не бьёт
      if(s.dead<=0){ if(s.mesh){ soldierGroup.remove(s.mesh);
          s.mesh.traverse(c=>{ if(c.isMesh){ c.geometry.dispose(); if(c.material.dispose) c.material.dispose(); } }); }
        soldiers.splice(i,1); }
      continue; }
    const dx=tn.x-s.x, dz=tn.z-s.z, d=Math.hypot(dx,dz);
    if(d<=0.5){ applyArrival(tn,s.o,s.dmg);
      if(s.mesh){ soldierGroup.remove(s.mesh);
        s.mesh.traverse(c=>{ if(c.isMesh){ c.geometry.dispose(); if(c.material.dispose) c.material.dispose(); } }); }
      soldiers.splice(i,1); continue; }
    const v=3.1*(s.o===1 && HLVL>=4 ? 1.15 : 1)*(s.fast?1.2:1)*(s.o===2 && CMD==='wind'?1.2:1)*dt; s.x+=dx/d*v; s.z+=dz/d*v;
  }
  botTimer-=dt; if(botTimer<=0){ botTimer=BOT_INTERVAL*(CMD==='haste'?0.65:1)*D().think; botThink(); }
  checkEnd();
}

function botThink(){
  const aggro=curMap.aggro*(D().aggroMul||1), mine=nodes.filter(n=>n.o===2); if(!mine.length) return;
  for(const L of links.filter(L=>L.o===2)){ const tn=nodes[L.to]; if(tn.o===2 && tn.t>=cap(tn)-0.5) removeLink(L); }
  // бот тоже выбирает классы: приграничным — бой, тыловым — Завод (на всех картах)
  for(const n of mine){
    if(n.l<2 || n.spec || Math.random()>D().spec) continue;
    let dMin=Infinity; for(const x of nodes){ if(x.o===1){ const d=Math.hypot(x.x-n.x,x.z-n.z); if(d<dMin) dMin=d; } }
    n.spec = dMin<7 ? ['knight','chibi','mech'][(Math.random()*3)|0] : 'spirit';   // фронт — бой, тыл — Завод
  }
  // защита: соседи подкрепляют свою башню под атакой (на «легко» бот не защищается)
  for(const n of (D().defend?mine:[])){
    const threat=soldiers.filter(s=>s.o===1 && s.tid===n.id).length;
    if(threat<4 && n.atk<=0) continue;
    for(const src of mine){ if(src===n || src.t<12) continue;
      if(Math.hypot(src.x-n.x,src.z-n.z)>8) continue;
      if(findLink(src.id,n.id)) continue;
      if(links.filter(L=>L.from===src.id).length>=linkCap(src)) continue;
      links.push({from:src.id,to:n.id,o:2,accum:0}); break; }
  }
  const sorted=[...mine].sort((a,b)=>b.t-a.t);
  for(const src of sorted){
    if(src.t<10) continue;
    if(links.filter(L=>L.from===src.id).length>=linkCap(src)) continue;
    if(Math.random()>aggro+0.25) continue;
    let best=null,bs=Infinity;
    for(const n of nodes){ if(n.o===2) continue; if(findLink(src.id,n.id)) continue;
      const dist=Math.hypot(n.x-src.x,n.z-src.z), def=n.t+(n.o===1?6:0);
      if(def>src.t*1.15) continue; const sc=dist*0.6+def*4; if(sc<bs){ bs=sc; best=n; } }
    if(best) links.push({from:src.id,to:best.id,o:2,accum:0});
    else if(src.t>cap(src)*0.7){ let feed=null,fd=Infinity;
      for(const n of mine){ if(n===src||n.l>=MAX_LEVEL) continue; const d=Math.hypot(n.x-src.x,n.z-src.z); if(d<fd){fd=d;feed=n;} }
      if(feed && !findLink(src.id,feed.id)) links.push({from:src.id,to:feed.id,o:2,accum:0}); }
  }
}

function counts(){ let p=0,e=0; for(const n of nodes){ if(n.o===1)p++; else if(n.o===2)e++; } return {p,e}; }
function checkEnd(){ if(ended) return; const {p,e}=counts();
  const pS=soldiers.some(s=>s.o===1), eS=soldiers.some(s=>s.o===2);
  if(e===0 && !eS) endGame(true); else if(p===0 && !pS) endGame(false); }
function endGame(win){ ended=true; running=false; gpStop();
  if(tutStep>=0){ tutHide(); if(win){ localStorage.setItem(TUT_KEY,'1'); tutStep=-1; } }
  sfx(win?'win':'lose'); buzz(win?[60,50,60,50,120]:180); if(win) confetti();
  const ov=document.getElementById('ovEnd'); ov.className='overlay show '+(win?'win':'lose');
  document.getElementById('ovTitle').textContent = win?'Победа! 🎉':'Поражение';
  const row=document.getElementById('ovRow'); row.innerHTML='';
  const prevH=HLVL;
  if(endless){
    if(win){ if(endlessRound>bestEndless){ bestEndless=endlessRound; localStorage.setItem('g_zahvat_endless',bestEndless);
        submitEndless(bestEndless); }
      cloudSave(); refreshHero();
      document.getElementById('ovStars').innerHTML=starsMarkup(starsFor(simTime));
      document.getElementById('ovSub').textContent='Раунд '+endlessRound+' пройден за '+Math.round(simTime)+' с · Рекорд: '+bestEndless+
        (HLVL>prevH?' · 🦉 Филин — новый уровень!':'');
      addBtn(row,'Раунд '+(endlessRound+1),'primary',()=>loadEndless(endlessRound+1));
      if(!ysdk) addBtn(row,'Поделиться','',shareResult);
      addBtn(row,'Заново','',()=>loadEndless(endlessRound));
    } else { document.getElementById('ovStars').innerHTML='';
      document.getElementById('ovSub').innerHTML='Это был раунд '+endlessRound+' · Рекорд: '+bestEndless+
        '<br><small style="color:#a7adda">Совет: '+TIPS[(Math.random()*TIPS.length)|0]+'</small>';
      addBtn(row,'Ещё раз','primary',()=>loadEndless(endlessRound));
      if(diff!=='easy') addBtn(row,'Полегче 😌','',()=>{ diff='easy'; localStorage.setItem('g_zahvat_diff','easy'); loadEndless(endlessRound); });
      addBtn(row,'С начала','',()=>loadEndless(1)); }
    return;
  }
  if(win){ const s=starsFor(simTime);
    if((bestStars[mapIndex]|0)<s){ bestStars[mapIndex]=s; localStorage.setItem(STARS_KEY,JSON.stringify(bestStars)); }
    cloudSave(); refreshHero();
    document.getElementById('ovStars').innerHTML=starsMarkup(s);
    const next=mapIndex+1; if(next<MAPS.length && next>progress){ progress=next; localStorage.setItem(STORE,progress); }
    document.getElementById('ovSub').textContent = 'Время: '+Math.round(simTime)+' с · '+
      (next<MAPS.length?'Карта зачищена. Дальше?':'Все карты пройдены! 🏆')+
      (HLVL>prevH?' · 🦉 Филин — новый уровень!':'');
    if(next<MAPS.length) addBtn(row,'Следующая','primary',()=>loadMap(next));
    else addBtn(row,'∞ Бесконечный','primary',()=>loadEndless(1));
    if(!ysdk) addBtn(row,'Поделиться','',shareResult);
    addBtn(row,'Заново','',()=>loadMap(mapIndex));
  } else { document.getElementById('ovStars').innerHTML='';
    document.getElementById('ovSub').innerHTML='Враг захватил все твои башни.'+
      '<br><small style="color:#a7adda">Совет: '+TIPS[(Math.random()*TIPS.length)|0]+'</small>';
    addBtn(row,'Ещё раз','primary',()=>loadMap(mapIndex));
    if(diff!=='easy') addBtn(row,'Полегче 😌','',()=>{ diff='easy'; localStorage.setItem('g_zahvat_diff','easy'); loadMap(mapIndex); }); }
}
function addBtn(row,label,cls,fn){ const b=document.createElement('button'); b.className='btn '+cls; b.textContent=label; b.onclick=fn; row.appendChild(b); }
function hideOverlay(id){ document.getElementById(id).className='overlay'; }

// ---------------- per-frame visual sync ----------------
const bursts=[];
function burst(n){ const ring=new THREE.Mesh(new THREE.TorusGeometry(0.7,0.09,10,36).rotateX(Math.PI/2),
  new THREE.MeshBasicMaterial({ color:SOLID[n.o], transparent:true, opacity:0.9, depthWrite:false }));
  ring.position.set(n.x, GROUND_TOP+0.15, n.z); scene.add(ring); bursts.push({ m:ring, t:0 }); }

function syncVisuals(){
  for(const n of nodes){
    if(n.lr!==n.l || n.or!==n.o || n.cr!==n.spec){ if(n.or!==-1 && n.or!==n.o) burst(n); buildTower(n); }   // rebuild on level/owner/class change
    const v=n.view; if(!v) continue;
    v.group.position.x = n.x;   // башни стоят статично (дрожание убрано)
    // label
    const canPick = (n.o===1 && n.l>=2 && !n.spec);
    v.div.textContent = (n.trait?TRAITS[n.trait].icon+' ':'')+(n.spec?SPEC_ICON[n.spec]+' ':'')
                      + Math.floor(n.t) + (canPick?' ⭐':'');
    if(v.pick!==canPick){ v.pick=canPick; v.div.classList.toggle('pick',canPick); }   // пульс: «тапни — выбери класс»
    v.div.style.borderColor = CSS[n.o];
    v.div.style.color = CSS[n.o];
  }
  // soldiers meshes — фигурка по типу, лицом по ходу движения
  for(const s of soldiers){ if(!s.mesh){ s.mesh=makeSoldierMesh(s.kind, SOLID[s.o]); soldierGroup.add(s.mesh); }
    const tn=nodes[s.tid];
    const ph=performance.now()*0.001, seed=(s.x+s.z)*3;
    if(s.dead>0){                       // падение: заваливается набок, оседает и тает
      const k=1-Math.max(0,s.dead)/0.45;
      s.mesh.rotation.z=k*Math.PI*0.5; s.mesh.position.set(s.x, GROUND_TOP+0.06-k*0.05, s.z);
      s.mesh.scale.setScalar(Math.max(0.15,1-k*0.55));
      s.mesh.traverse(c=>{ if(c.isMesh && c.material){ c.material.transparent=true; c.material.opacity=Math.max(0,1-k); } });
      continue; }
    s.mesh.rotation.y=Math.atan2(tn.x-s.x, tn.z-s.z);
    const y = s.kind==='mech'   ? 0                                            // танк не подпрыгивает
           : s.kind==='spirit' ? 0.14+Math.abs(Math.sin(ph*1.6+seed))*0.06     // дух парит
           :                     Math.abs(Math.sin(ph*8+seed))*0.06;           // шаг
    s.mesh.position.set(s.x, GROUND_TOP+0.06+y, s.z);
    if(s.kind==='spirit') s.mesh.rotation.z=Math.sin(ph*2+seed)*0.2; }
  // links — rebuild ribbon meshes when set changes
  const sig=links.map(L=>L.from+'>'+L.to+':'+L.o).join('|');
  if(sig!==linkSig){ linkSig=sig; rebuildLinks(); }
  const c=counts(); document.getElementById('cntP').textContent=c.p; document.getElementById('cntE').textContent=c.e;
  // полоса баланса сил (войска в башнях + в пути)
  let sp=0,sn=0,se=0;
  for(const n of nodes){ if(n.o===1) sp+=n.t; else if(n.o===2) se+=n.t; else sn+=n.t; }
  for(const s of soldiers){ if(s.o===1) sp+=1; else if(s.o===2) se+=1; }
  const tot=Math.max(1,sp+sn+se);
  document.getElementById('powP').style.width=(100*sp/tot)+'%';
  document.getElementById('powN').style.width=(100*sn/tot)+'%';
  document.getElementById('powE').style.width=(100*se/tot)+'%';
  // кнопка «Рывок»
  const rb=document.getElementById('rushBtn');
  rb.style.display=(HLVL>=2 && !ended)?'block':'none';
  if(rushT>0){ rb.className='rush on'; rb.textContent='⚡'; }
  else if(rushCD>0){ rb.className='rush cd'; rb.textContent=Math.ceil(rushCD); }
  else { rb.className='rush'; rb.textContent='⚡'; }
}

let flowTexes=[];
function rebuildLinks(){
  clearGroup(linkGroup);
  flowTexes.forEach(t=>t.dispose()); flowTexes=[];
  const up=new THREE.Vector3(0,1,0);
  for(const L of links){ const a=nodes[L.from], b=nodes[L.to];
    const A=new THREE.Vector3(a.x,GROUND_TOP+0.12,a.z), B=new THREE.Vector3(b.x,GROUND_TOP+0.12,b.z);
    const u=new THREE.Vector3().subVectors(B,A).normalize();
    const start=A.clone().add(u.clone().multiplyScalar(0.7));
    const end=B.clone().add(u.clone().multiplyScalar(-0.85));
    const seg=new THREE.Vector3().subVectors(end,start); const L2=seg.length();
    const q=new THREE.Quaternion().setFromUnitVectors(up, seg.clone().normalize());
    const mid=start.clone().add(end).multiplyScalar(0.5);
    // тонкая линия-связь: видно, какие башни соединены и чей поток (без толстой стрелки и шевронов — их заменяют солдатики)
    const mat=new THREE.MeshStandardMaterial({ color:SOLID[L.o], emissive:SOLID[L.o], emissiveIntensity:0.28,
      roughness:0.5, metalness:0.05, transparent:true, opacity:0.55, depthWrite:false });
    const line=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,L2,8), mat);
    line.quaternion.copy(q); line.position.copy(mid); line.userData.link=L; linkGroup.add(line);
    // невидимая широкая зона вдоль связи — чтобы её по-прежнему легко было убрать тапом
    const pick=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,L2,6),
      new THREE.MeshBasicMaterial({ visible:false }));
    pick.quaternion.copy(q); pick.position.copy(mid); pick.userData.link=L; linkGroup.add(pick);
  }
}

// ---------------- специализация: выбор по тапу на свою башню ----------------
let specNode=null, pickPrompted=false;
function worldToScreen(x,y,z){ const v=new THREE.Vector3(x,y,z).project(camera);
  return { x:(v.x*0.5+0.5)*innerWidth, y:(-v.y*0.5+0.5)*innerHeight }; }
function openSpec(n){ specNode=n; const p=worldToScreen(n.x,2.2,n.z);
  const m=$('specMenu'); m.style.left=p.x+'px'; m.style.top=p.y+'px'; m.classList.add('show'); }
function hideSpec(){ specNode=null; const m=$('specMenu'); if(m) m.classList.remove('show'); }
function specHint(){
  if(localStorage.getItem('g_zahvat_spec_hint')) return;
  localStorage.setItem('g_zahvat_spec_hint','1');
  const h=$('hint'); h.textContent='⭐ Башня 2 уровня! Выбери класс её войск: 🛡 защита · ⚔ атака · 🚜 осада · ✨ Завод. Потом — тап по башне со звёздочкой.';
  h.style.opacity='1'; setTimeout(()=>{ h.style.opacity='0'; }, 7000);
}

// ---------------- input ----------------
function setPointer(e){ pointer.x=(e.clientX/innerWidth)*2-1; pointer.y=-(e.clientY/innerHeight)*2+1; }
function pickNode(e){ setPointer(e); raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(nodeGroup.children, true);
  for(const h of hits){ let o=h.object; while(o){ if(o.userData && o.userData.nodeId!=null) return nodes[o.userData.nodeId]; o=o.parent; } }
  return null; }
function pickGround(e){ setPointer(e); raycaster.setFromCamera(pointer,camera);
  const h=raycaster.intersectObject(groundPlane); return h.length?h[0].point:null; }
function pickLink(e){ setPointer(e); raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects(linkGroup.children,true);
  for(const h of hits){ const L=h.object.userData.link; if(L && L.o===1) return L; } return null; }

let downXY=null;
function bindInput(){
  const el=renderer.domElement;
  el.addEventListener('pointerdown',e=>{ audio(); hideSpec(); if(ended) return; downXY={x:e.clientX,y:e.clientY};
    const n=pickNode(e); if(n && n.o===1){ drag={fromId:n.id}; dragLine.visible=true; document.getElementById('hint').style.opacity='0'; } });
  el.addEventListener('pointermove',e=>{ if(!drag) return; const g=pickGround(e); if(!g) return;
    const a=nodes[drag.fromId]; dragLine.geometry.setFromPoints([new THREE.Vector3(a.x,GROUND_TOP+0.4,a.z), new THREE.Vector3(g.x,GROUND_TOP+0.2,g.z)]); });
  el.addEventListener('pointerup',e=>{
    const far = downXY && Math.hypot(e.clientX-downXY.x, e.clientY-downXY.y)>14;
    if(drag){ const n=pickNode(e);
      if(n && n.id!==drag.fromId && far) toggleLink(drag.fromId,n.id);
      else if(!far){ const src=nodes[drag.fromId];      // тап по своей башне — меню специализации (со 2-й карты)
        if(src.l>=2 && !src.spec) openSpec(src); else hideSpec(); }   // класс — со 2 уровня (на любой карте)
      drag=null; dragLine.visible=false; }
    else if(!far){ hideSpec(); const L=pickLink(e); if(L){ removeLink(L); sfx('unlink'); } }
    downXY=null; });
  el.addEventListener('pointercancel',()=>{ drag=null; dragLine.visible=false; downXY=null; });

  document.querySelectorAll('#specMenu button').forEach(b=>{
    b.addEventListener('pointerup',e=>{ e.stopPropagation();
      if(specNode && specNode.o===1 && !specNode.spec && specNode.l>=2){ specNode.spec=b.dataset.s; sfx('lvl'); buzz(20); }
      hideSpec(); }); });
  document.getElementById('rushBtn').onclick=()=>{ if(rushCD>0 || !running || ended) return;
    rushT=5; rushCD=HLVL>=6?15:20; sfx('rush'); buzz(25); };
  const sndBtn=document.getElementById('sndBtn'); sndBtn.textContent = muted?'🔇':'🔊';
  sndBtn.onclick=()=>{ muted=!muted; localStorage.setItem('g_zahvat_mute',muted?'1':'0');
    sndBtn.textContent = muted?'🔇':'🔊'; if(!muted) sfx('step'); };
  document.getElementById('speedBtn').onclick=()=>{ speed=speed===1?2:1; document.getElementById('speedBtn').textContent='×'+speed; };
  document.getElementById('menuBtn').onclick=()=>{ running=false; gpStop(); openMenu(); };
  document.getElementById('closeMenu').onclick=()=>{ hideOverlay('ovMenu'); if(!ended && !counting){ running=true; gpStart(); } };
  addEventListener('resize',onResize);
}
function openMenu(){ const grid=document.getElementById('lvlGrid'); grid.innerHTML='';
  MAPS.forEach((m,i)=>{ const el=document.createElement('div'); const locked=i>progress;
    el.className='lvl'+(locked?' locked':'')+(i<progress?' done':'');
    el.innerHTML='<span>'+(i+1)+'</span>'+(bestStars[i]?'<span class="st">'+starsMarkup(bestStars[i])+'</span>':'');
    if(!locked) el.onclick=()=>{ hideOverlay('ovMenu'); loadMap(i); }; grid.appendChild(el); });
  const infLocked = progress<3 && !bestEndless;
  const inf=document.createElement('div'); inf.className='lvl inf'+(infLocked?' locked':'');
  inf.innerHTML = infLocked ? '<span>∞</span><span class="st">🔒</span>'
    : '<span>∞</span>'+(bestEndless?'<span class="st">рекорд '+bestEndless+'</span>':'');
  if(!infLocked) inf.onclick=()=>{ hideOverlay('ovMenu'); loadEndless(1); };
  grid.appendChild(inf);
  document.getElementById('menuNote').textContent = infLocked ? '∞ Бесконечный режим откроется после карты 3' : '';
  const dr=document.getElementById('diffRow'); dr.innerHTML='';
  Object.entries(DIFFS).forEach(([k,d])=>{ const b=document.createElement('button');
    b.className='dbtn'+(k===diff?' sel':''); b.textContent=d.label;
    b.onclick=()=>{ diff=k; localStorage.setItem('g_zahvat_diff',k); sfx('step');
      [...dr.children].forEach(c=>c.classList.remove('sel')); b.classList.add('sel'); };
    dr.appendChild(b); });
  renderHero();
  document.getElementById('ovMenu').className='overlay show'; }

function renderHero(){ refreshHero(); const t=totalStars();
  const card=document.getElementById('heroCard');
  if(t<=0){ card.style.display='none'; return; }   // герой появляется с первой звездой
  card.style.display='block';
  let h='<div class="hh"><span style="font-size:22px">🦉</span> Филин · ур. '+HLVL+'<span class="hst">⭐ '+t+'</span></div>';
  const got=HERO_LEVELS.filter(lv=>t>=lv.need), next=HERO_LEVELS.find(lv=>t<lv.need);
  if(got.length) h+='<div>'+got.map(lv=>'<span class="chip">'+lv.icon+' '+lv.name+'</span>').join('')+'</div>';
  else h+='<div class="hrow" style="color:var(--muted)">Зарабатывай звёзды — Филин будет помогать в бою.</div>';
  if(next) h+='<div class="hrow locked"><span>'+next.icon+'</span><span>'+next.name+'</span><span class="hn">⭐ '+next.need+'</span></div>';
  else h+='<div class="hrow" style="color:var(--muted)">Максимальный уровень! 🏆</div>';
  card.innerHTML=h; }

function shareResult(){
  const url='https://lanashakh.github.io/igra-zahvat/';
  const txt = endless
    ? 'Захват: раунд '+endlessRound+' в бесконечном режиме! Сыграешь? '+url
    : 'Захват: карта «'+curMap.name+'» за '+Math.round(simTime)+' с '+'★'.repeat(starsFor(simTime))+' Сыграешь? '+url;
  if(navigator.share){ navigator.share({text:txt}).catch(()=>{}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(()=>{
    const s=document.getElementById('ovSub'), old=s.textContent;
    s.textContent='Скопировано — вставь другу в чат 😉'; setTimeout(()=>{ s.textContent=old; },1800); }).catch(()=>{}); }
}

function onResize(){ const aspect=innerWidth/innerHeight, vs=camViewSize();
  camera.left=-vs*aspect; camera.right=vs*aspect; camera.top=vs; camera.bottom=-vs; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight); labelRenderer.setSize(innerWidth,innerHeight);
  if(composer){ composer.setSize(innerWidth,innerHeight); if(bloomPass) bloomPass.setSize(innerWidth,innerHeight);
    if(gtaoPass) gtaoPass.setSize(innerWidth,innerHeight); } }

// ---------------- loop ----------------
let last=performance.now();
function frame(){
  const now=performance.now(); let dt=(now-last)/1000; last=now;
  if(dt<0.5){ fpsN++; fpsT+=dt;
    if(fpsT>=5){ const fps=fpsN/fpsT; fpsN=0; fpsT=0; if(fps<35 && qLevel<2) applyQuality(qLevel+1); } }
  if(dt>0.05) dt=0.05;
  if(running && !ended) step(dt*speed);
  for(const t of flowTexes) t.offset.y = (t.offset.y - dt*1.5) % 1;
  for(let i=bursts.length-1;i>=0;i--){ const b=bursts[i]; b.t+=dt; const k=b.t/0.6;
    if(k>=1){ scene.remove(b.m); b.m.geometry.dispose(); b.m.material.dispose(); bursts.splice(i,1); continue; }
    b.m.scale.setScalar(1+k*2.2); b.m.material.opacity=0.9*(1-k); }
  syncVisuals();
  if(composer) composer.render(); else renderer.render(scene,camera);
  labelRenderer.render(scene,camera);
}

init().catch(err=>{ console.error(err); document.querySelector('#loading .spinner').style.display='none';
  document.querySelector('#loading div').textContent='Не удалось запустить 3D.';
  fail('Ошибка загрузки: '+(err&&err.message?err.message:err)+'.'); });
