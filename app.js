/* ============================================================
   CONFIG — fill these in with your own project values.
   No real-money purchase paths exist in this app. Premium/VIP
   status is admin-granted only (see admin panel) and carries no
   price — it's a cosmetic status, not something users can buy.
   ============================================================ */
const CONFIG = {
  SUPABASE_URL: 'https://mdtpdqwxegmseidxnnvb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdHBkcXd4ZWdtc2VpZHhubnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMTEzMzEsImV4cCI6MjEwMTg4NzMzMX0.ZWkYKmt6N7-0jqwEMB4Zn9H1BDUvGPZb1EsEAS7VRBI',
  APP_URL: window.location.origin + '/',

  ECONOMY: {
    STARTING_CREDITS: 2250,
    GUEST_CREDITS: 2250,
    REFERRAL_BONUS: 25000,
    PREMIUM_TIERS: [
      { key:'free',    label:'Free' },
      { key:'starter', label:'Starter' },
      { key:'plus',    label:'Plus' },
      { key:'pro',     label:'Pro' },
      { key:'elite',   label:'Elite' },
      { key:'vip',     label:'VIP' },
    ],
  },
};

/* ============================================================
   PWA Setup & Aggressive Universal Image Caching Service Worker
   ============================================================ */
(function setupPWA() {
  const manifest = {
    name: "Chase Cards - TCG Simulator",
    short_name: "Chase Cards",
    start_url: ".",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
  const stringManifest = JSON.stringify(manifest);
  const blob = new Blob([stringManifest], { type: 'application/json' });
  const manifestURL = URL.createObjectURL(blob);
  
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestURL;
  document.head.appendChild(link);

  const metaTheme = document.createElement('meta');
  metaTheme.name = 'theme-color';
  metaTheme.content = '#0f172a';
  document.head.appendChild(metaTheme);

  const metaApple = document.createElement('meta');
  metaApple.name = 'apple-mobile-web-app-capable';
  metaApple.content = 'yes';
  document.head.appendChild(metaApple);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swCode = `
        const CACHE_NAME = 'chasecards-universal-images-v16';
        self.addEventListener('install', e => {
          self.skipWaiting();
          e.waitUntil(caches.open(CACHE_NAME));
        });
        self.addEventListener('activate', e => {
          e.waitUntil(
            caches.keys().then(keys => Promise.all(
              keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )).then(() => self.clients.claim())
          );
        });
        self.addEventListener('fetch', e => {
          const url = new URL(e.request.url);
          const isImage = e.request.destination === 'image' || url.pathname.match(/\\.(png|jpe?g|webp|svg|gif)$/i) || url.hostname.includes('pokemontcg.io') || url.hostname.includes('githubusercontent.com');
          
          if (isImage) {
            e.respondWith(
              caches.open(CACHE_NAME).then(async cache => {
                const cachedRes = await cache.match(e.request);
                if (cachedRes) return cachedRes;
                try {
                  const netRes = await fetch(e.request, { mode: 'cors', credentials: 'omit' });
                  if (netRes && netRes.ok) {
                    cache.put(e.request, netRes.clone());
                  }
                  return netRes;
                } catch (err) {
                  return cachedRes || Response.error();
                }
              })
            );
          } else {
            e.respondWith(
              caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/')))
            );
          }
        });
      `;
      const swBlob = new Blob([swCode], { type: 'text/javascript' });
      const swUrl = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swUrl).catch(() => {});
    });
  }
})();

/* ============================================================
   Dynamic Styles Injection
   ============================================================ */
const customStyles = document.createElement('style');
customStyles.innerHTML = `
.account-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: bold;
  text-transform: uppercase;
}

.badge-guest { background: #64748b; color: #fff; }
.badge-free { background: #475569; color: #cbd5e1; }
.badge-bronze { background: #b45309; color: #fff; }
.badge-gold { background: #eab308; color: #0f172a; }
.badge-pro { background: #3b82f6; color: #fff; }
.badge-elite { background: #8b5cf6; color: #fff; }
.badge-vip { 
  background: linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6); 
  color: #fff; 
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}

.account-card {
  background: var(--panel);
  border: 1px solid var(--edge);
  border-radius: 14px;
  padding: 16px;
  margin-top: 10px;
}
.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--edge);
  padding-bottom: 12px;
  margin-bottom: 12px;
}
.account-header h3 { margin: 0; }
.account-details p {
  margin: 8px 0;
  color: var(--dim);
}
.search-bar-wrap {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.search-bar-wrap input {
  flex: 1;
}

/* Polished Auth Inputs Fix */
.auth-form input, .sheet input[type="email"], .sheet input[type="password"], .sheet input[type="text"], .sheet select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--edge);
  background: var(--panel);
  color: var(--text);
  font-family: var(--font-body);
  box-sizing: border-box;
  margin-bottom: 8px;
  font-size: 1rem;
}
.auth-form input:focus, .sheet input:focus, .sheet select:focus {
  border-color: var(--cyan);
  outline: none;
}

/* Global Network Loading Bar */
#global-loader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: transparent;
  z-index: 9999;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.2s ease;
}
#global-loader.active {
  opacity: 1;
}
#global-loader::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--cyan, #4de8e0), transparent);
  animation: loadbar 1.2s infinite linear;
}
@keyframes loadbar {
  0% { left: -100%; }
  100% { left: 100%; }
}
`;
document.head.appendChild(customStyles);

// Inject Global Loader DOM element
const globalLoader = document.createElement('div');
globalLoader.id = 'global-loader';
document.body.appendChild(globalLoader);

let activeRequests = 0;
function showLoader() {
  activeRequests++;
  if (activeRequests === 1) globalLoader.classList.add('active');
}
function hideLoader() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) globalLoader.classList.remove('active');
}

/* ============================================================
   Supabase client
   ============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

/* ============================================================
   Tiny utilities & Global Configs
   ============================================================ */
const $ = (sel, root=document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
function toast(msg, ms=2400){
  const t = $('#toast'); if(!t) return; t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove('show'), ms);
}
function vibrate(pattern){ if(navigator.vibrate) try{navigator.vibrate(pattern);}catch(e){} }
const store = {
  get(k, fallback=null){ try{ return JSON.parse(localStorage.getItem(k)) ?? fallback; }catch(e){ return fallback; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
};



/* ============================================================
   Player Statistics Store
   ============================================================ */
function getPlayerStats() {
  return store.get('player_stats', {
    packsOpened: 0,
    creditsSpent: 0,
    rarestPull: { name: 'None Recorded', rarity: 'Common', tierId: -1, image: '' },
    cardsSold: 0,
    totalSoldEarned: 0,
    lastLoginDate: '',
    loginStreak: 0
  });
}

function updatePlayerStats(updater) {
  const stats = getPlayerStats();
  updater(stats);
  store.set('player_stats', stats);
}

function checkDailyStreak() {
  const stats = getPlayerStats();
  const today = new Date().toISOString().slice(0, 10);
  if(stats.lastLoginDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if(stats.lastLoginDate === yesterday) {
      stats.loginStreak = (stats.loginStreak || 0) + 1;
    } else {
      stats.loginStreak = 1;
    }
    stats.lastLoginDate = today;
    store.set('player_stats', stats);
  }
}
checkDailyStreak();

/* ============================================================
   Card Market Valuation & 70% Sell-Back System (Virtual Currency Only)
   ============================================================ */
const RARITY_ESTIMATED_VALUES = {
  0: 0.15,   // Common
  1: 0.35,   // Uncommon
  2: 1.50,   // Rare
  3: 4.00,   // Holo Rare
  4: 12.50,  // Double Rare (ex/gx/v)
  5: 25.00,  // Ultra Rare
  6: 35.00,  // Illustration Rare
  7: 75.00,  // Special Illustration Rare
  8: 150.00  // Hyper / Secret Rare
};

function getCardMarketValue(card) {
  const tierId = classify(card?.rarity).id;
  return RARITY_ESTIMATED_VALUES[tierId] || 0.50;
}

function getCardSellValue(card) {
  const marketValUSD = getCardMarketValue(card);
  const sellValCredits = Math.round(marketValUSD * 0.70 * 100);
  return Math.max(10, sellValCredits);
}

function showCardFullscreen(imgSrc, cardObj){
  const overlay = el('div','overlay');
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '300';
  
  const sellCredits = cardObj ? getCardSellValue(cardObj) : 0;
  
  overlay.innerHTML = `
      <div style="position:relative; width:90%; max-width:400px; perspective:1200px; display:flex; flex-direction:column; align-items:center;">
          <img src="${imgSrc}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'280\'><rect width=\'100%\' height=\'100%\' fill=\'%231e293b\'/><text x=\'50%\' y=\'50%\' fill=\'%2394a3b8\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'sans-serif\' font-size=\'14\'>Image Unavailable</text></svg>'" style="width:100%; border-radius:18px; box-shadow:0 30px 60px rgba(0,0,0,0.8); animation: zoomIn 0.3s cubic-bezier(0.2,0.8,0.2,1); object-fit:contain; max-height:70vh;"/>
          ${cardObj ? `
            <div style="text-align:center; margin-top:16px; display:flex; gap:10px; width:100%; justify-content:center; flex-wrap:wrap; animation: slideup 0.3s ease;">
                <button class="btn btn-secondary" id="sell-card-btn" style="background:var(--danger); border-color:var(--danger); color:#fff; padding:10px 16px; font-size:13px;">Sell for ${sellCredits} Credits (70%)</button>
            </div>
            <div class="hint" style="font-size:10px; margin-top:6px; color:var(--dim); text-align:center;">Virtual currency only. No real-world cash value.</div>
          ` : ''}
      </div>
  `;
  document.body.appendChild(overlay);
  
  if(cardObj) {
    overlay.querySelector('#sell-card-btn').addEventListener('click', () => {
      sellCardFromCollection(cardObj, sellCredits);
      overlay.remove();
    });
  }

  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
}

function sellCardFromCollection(cardObj, creditsEarned) {
  const map = getCollectionsMap();
  const activeName = getActiveCollectionName();
  const coll = map[activeName] || {};
  
  if(!cardObj || !cardObj.id || !coll[cardObj.id] || coll[cardObj.id].count <= 0) {
    toast('Card not found in active collection');
    return;
  }
  
  coll[cardObj.id].count--;
  if(coll[cardObj.id].count <= 0) {
    delete coll[cardObj.id];
  }
  
  map[activeName] = coll;
  store.set('user_collections', map);
  store.set('collection', coll);
  
  updatePlayerStats(st => {
    st.cardsSold = (st.cardsSold || 0) + 1;
    st.totalSoldEarned = (st.totalSoldEarned || 0) + creditsEarned;
  });

  if(guestMode) {
    const gs = getGuestState();
    gs.credits = (Number(gs.credits) || CONFIG.ECONOMY.GUEST_CREDITS) + creditsEarned;
    setGuestState(gs);
    $('#credit-count').textContent = gs.credits;
  } else if(profile) {
    profile.credits = (profile.credits || 0) + creditsEarned;
    $('#credit-count').textContent = profile.credits;
    sb.from('profiles').update({ credits: profile.credits }).eq('id', session.user.id).then();
  }
  
  SFX.coin();
  toast(`Sold card for +${creditsEarned} virtual credits!`);
  render(route.name, route.params);
}

/* ============================================================
   Aggressive Universal Image Caching System
   ============================================================ */
const ImgCache = {
  blobUrls: {},
  async get(url) {
    if (!url) return '';
    if (this.blobUrls[url]) return this.blobUrls[url];
    
    showLoader();
    try {
      if ('caches' in window) {
        const cache = await caches.open('chasecards-universal-images-v16');
        let res = await cache.match(url);
        if (!res) {
          res = await fetch(url, { mode: 'cors', credentials: 'omit' });
          if (res.ok) await cache.put(url, res.clone());
        }
        if (res && res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          this.blobUrls[url] = blobUrl;
          hideLoader();
          return blobUrl;
        }
      }
    } catch (e) {
      console.warn('Persistent caching fallback triggered', e);
    } finally {
      hideLoader();
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.blobUrls[url] = url; resolve(url); };
      img.onerror = () => { resolve(''); };
      img.src = url;
    });
  },
  sync(url) { return this.blobUrls[url] || url; }
};

/* ============================================================
   Sound design & Confetti
   ============================================================ */
const SFX = { flip(){}, common(){}, uncommon(){}, holo(){}, hit(){}, chase(){}, coin(){}, tear(){} };

const confettiCanvas = $('#confetti'); const cctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
function resizeConfetti(){ if(confettiCanvas) { confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight; } }
addEventListener('resize', resizeConfetti); resizeConfetti();
let particles = [];
function burstConfetti(count=60, colors=['#4de8e0','#e84dc0','#f0b94d','#ffffff']){
  if(!cctx || !confettiCanvas) return;
  const cx = innerWidth/2, cy = innerHeight*0.4;
  for(let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2, speed = 3+Math.random()*7;
    particles.push({ x:cx, y:cy, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed-3, life:1, size:4+Math.random()*4, color:colors[i%colors.length], rot:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.3 });
  }
  if(!burstConfetti._running){ burstConfetti._running = true; requestAnimationFrame(tickConfetti); }
}
function tickConfetti(){
  if(!cctx || !confettiCanvas) return;
  cctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
  particles.forEach(p=>{ p.vy += 0.15; p.x += p.vx; p.y += p.vy; p.life -= 0.012; p.rot += p.vr;
    cctx.save(); cctx.globalAlpha = Math.max(p.life,0); cctx.translate(p.x,p.y); cctx.rotate(p.rot);
    cctx.fillStyle = p.color; cctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6); cctx.restore();
  });
  particles = particles.filter(p=>p.life>0 && p.y < innerHeight+50);
  if(particles.length){ requestAnimationFrame(tickConfetti); } else { burstConfetti._running=false; }
}

/* ============================================================
   Pokémon TCG API v2 & Dynamic Pack Pricing Formula
   ============================================================ */
const POKE_API_BASE = 'https://api.pokemontcg.io/v2';
async function pokeFetch(endpoint, attempt=1){
  showLoader();
  const ctrl = new AbortController();
  const timeout = setTimeout(()=>ctrl.abort(), 10000);
  try{
    const res = await fetch(`${POKE_API_BASE}${endpoint}`, { signal: ctrl.signal });
    if(!res.ok){
      const err = new Error('Pokémon TCG API error ' + res.status);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }catch(e){
    if(attempt < 3 && (e.name==='AbortError' || e.status>=500 || !e.status)){
      await new Promise(r=>setTimeout(r, attempt*1000));
      return pokeFetch(endpoint, attempt+1);
    }
    throw e;
  }finally{ 
    clearTimeout(timeout); 
    hideLoader();
  }
}

let globalSortedSets = [];

function calculatePackCost(index, totalSets) {
  if (totalSets <= 1) return 150;
  const minCost = 50;
  const maxCost = 300;
  const ratio = index / (totalSets - 1);
  const cost = maxCost - ratio * (maxCost - minCost);
  return Math.round(cost / 5) * 5; 
}

async function getSets(){
  const cached = store.get('cache_sets_v3');
  if(cached && Date.now() - cached.t < 1000*60*60*12) {
    globalSortedSets = cached.data;
    return cached.data;
  }
  try{
    const raw = await pokeFetch('/sets?orderBy=-releaseDate');
    let setsData = raw.data || [];
    setsData.sort((a,b)=> new Date(a.releaseDate) - new Date(b.releaseDate));
    
    let data = setsData.map(s => ({
      id: s.id, 
      name: s.name, 
      series: s.series || '',
      total: s.total || s.printedTotal || 0,
      releaseDate: s.releaseDate || '',
      images: { symbol: s.images?.symbol || '', logo: s.images?.logo || '' },
    }));
    
    const totalCount = data.length;
    data = data.map((s, idx) => {
      let cost = calculatePackCost(idx, totalCount);
      if (s.releaseDate) {
        const year = parseInt(s.releaseDate.split(/[-/]/)[0], 10);
        if (!isNaN(year)) {
          let multiplier = 15;
          if (year < 2000) {
            multiplier = 55;
          } else if (year >= 2000 && year <= 2004) {
            multiplier = 40;
          } else if (year >= 2005 && year <= 2007) {
            multiplier = 30;
          } else if (year >= 2008 && year <= 2010) {
            multiplier = 25;
          } else if (year >= 2011 && year <= 2014) {
            multiplier = 20;
          } else {
            multiplier = 15;
          }
          cost *= multiplier;
        }
      }
      return {
        ...s,
        packCost: Math.round(cost / 5) * 5
      };
    });

    globalSortedSets = data;
    store.set('cache_sets_v3', { t: Date.now(), data });
    return data;
  }catch(e){
    if(cached){ toast('Showing cached sets — live data unavailable'); globalSortedSets = cached.data; return cached.data; }
    throw e;
  }
}

async function getCardsForSet(setId){
  const key = 'cache_cards_v2_' + setId;
  const cached = store.get(key);
  if(cached && Date.now() - cached.t < 1000*60*60*24*7) return cached.data;
  try{
    const raw = await pokeFetch(`/cards?q=set.id:${setId}&pageSize=250`);
    const rawCards = raw.data || [];
    const data = rawCards.map(c => ({
      id: c.id, 
      name: c.name, 
      rarity: c.rarity,
      images: {
        small: c.images?.small || '',
        large: c.images?.large || '',
      },
      set: { name: c.set?.name || setId },
    }));
    store.set(key, { t: Date.now(), data });
    return data;
  }catch(e){
    if(cached){ toast('Showing cached cards — live data unavailable'); return cached.data; }
    throw e;
  }
}

/* ============================================================
   Rarity tiering 
   ============================================================ */
const TIERS = [
  { id:0, key:'common', label:'Common', color:'var(--tier-common)', match:/^common$/i },
  { id:1, key:'uncommon', label:'Uncommon', color:'var(--tier-uncommon)', match:/^uncommon$/i },
  { id:2, key:'rare', label:'Rare', color:'var(--tier-rare)', match:/^rare$/i },
  { id:3, key:'holo', label:'Holo Rare', color:'var(--tier-holo)', match:/rare holo$|classic collection|radiant|amazing|ace spec|rare holo lv\.?x/i },
  { id:4, key:'double', label:'Double Rare', color:'var(--tier-double)', match:/\b(ex|gx|v|vmax|vstar|break|prime|shining)\b/i },
  { id:5, key:'ultra', label:'Ultra Rare', color:'var(--tier-ultra)', match:/rare ultra|full art|rare shiny$/i },
  { id:6, key:'illustration', label:'Illustration Rare', color:'var(--tier-illus)', match:/^illustration rare$/i },
  { id:7, key:'sillustration', label:'Special Illustration Rare', color:'var(--tier-sillus)', match:/special illustration|rare rainbow|trainer gallery/i },
  { id:8, key:'hyper', label:'Hyper / Secret Rare', color:'var(--tier-hyper)', match:/hyper|secret|rare shiny gx|gold/i },
];
function classify(rarity){
  if(!rarity) return TIERS[0];
  for(let i=TIERS.length-1;i>=1;i--){ if(TIERS[i].match.test(rarity)) return TIERS[i]; }
  if(/rare/i.test(rarity)) return TIERS[2];
  if(/uncommon/i.test(rarity)) return TIERS[1];
  return TIERS[0];
}
function groupBySets(cards){
  const buckets = {};
  cards.forEach(c=>{ const t = classify(c.rarity).id; (buckets[t] ??= []).push(c); });
  return buckets;
}
const HIT_WEIGHTS = { 2:25, 3:40, 4:20, 5:8, 6:4, 7:2, 8:1 };
const GOD_PACK_ODDS = 1/600;

function weightedPick(pool, weights){
  const tiersAvail = Object.keys(pool).map(Number).filter(t=>t>=2 && pool[t]?.length);
  if(!tiersAvail.length) return null;
  const total = tiersAvail.reduce((s,t)=>s+(weights[t]||1),0);
  let r = Math.random()*total;
  for(const t of tiersAvail){ r -= (weights[t]||1); if(r<=0) return pickFrom(pool[t]); }
  return pickFrom(pool[tiersAvail[tiersAvail.length-1]]);
}
function pickFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function generatePack(cards){
  const buckets = groupBySets(cards);
  const commons = buckets[0]?.length ? buckets[0] : (buckets[1]||buckets[2]||cards);
  const uncommons = buckets[1]?.length ? buckets[1] : commons;
  const reverseHoloPool = [...(buckets[0]||[]), ...(buckets[1]||[]), ...(buckets[2]||[])];
  const isGodPack = Math.random() < GOD_PACK_ODDS;
  const pack = [];
  for(let i=0;i<4;i++) pack.push({ card: pickFrom(commons), foil:false });
  for(let i=0;i<3;i++) pack.push({ card: pickFrom(uncommons), foil:false });
  pack.push({ card: pickFrom(reverseHoloPool.length?reverseHoloPool:commons), foil:true });
  for(let i=0;i<2;i++){
    let card;
    if(isGodPack){ const hi = buckets[8]||buckets[7]||buckets[6]||buckets[5]||buckets[4]||buckets[3]; card = hi ? pickFrom(hi) : weightedPick(buckets, HIT_WEIGHTS); }
    else card = weightedPick(buckets, HIT_WEIGHTS);
    pack.push({ card, foil: classify(card?.rarity).id >= 3 });
  }
  return { cards: pack.filter(p=>p.card), godPack: isGodPack };
}

/* ============================================================
   Auth & profile
   ============================================================ */
let session = null, profile = null, guestMode = true;

function getGuestState(){ 
  let s = store.get('guest_state', null);
  if(!s || typeof s.credits !== 'number' || isNaN(s.credits) || s.credits <= 0) {
    s = { credits: CONFIG.ECONOMY.GUEST_CREDITS, usedFreePack: false };
    store.set('guest_state', s);
  }
  // Sanity clamp — guards against corrupted/edited localStorage values
  // breaking the UI (e.g. negative counts, Infinity). This cannot stop
  // someone from editing their own browser storage — that's inherent to
  // any client-only guest mode with no server-side account.
  const MAX_GUEST_CREDITS = 5_000_000;
  if(s.credits > MAX_GUEST_CREDITS || !Number.isFinite(s.credits)) {
    s.credits = MAX_GUEST_CREDITS;
    store.set('guest_state', s);
  }
  return s;
}
function setGuestState(s){ store.set('guest_state', s); }

function startGuestSession(redirect=true){
  guestMode = true;
  let s = getGuestState();
  if(isNaN(s.credits) || s.credits <= 0){ 
    s = { credits: CONFIG.ECONOMY.GUEST_CREDITS, usedFreePack: false }; 
    setGuestState(s); 
  }
  if(redirect) render('home');
  else render(route.name, route.params); 
}
function exitGuestMode(){ guestMode = false; openAuthModal(); }

function isAdminUser(){
  return !!(profile?.is_admin);
}

function currentCredits(){ 
  if (isAdminUser()) return '∞';
  if (guestMode) return Number(getGuestState().credits) || CONFIG.ECONOMY.GUEST_CREDITS;
  if (!profile || profile.credits == null) return CONFIG.ECONOMY.STARTING_CREDITS;
  return profile.credits; 
}

async function initAuth(){
  const { data } = await sb.auth.getSession();
  session = data.session;
  sb.auth.onAuthStateChange((_evt, s)=>{ 
    session = s; 
    if(s){ guestMode = false; onLoggedIn(); } 
    else { profile = null; guestMode = true; render('home'); } 
  });
  if(session) {
    guestMode = false;
    await onLoggedIn();
  } else {
    guestMode = true;
    render('home');
  }
}
async function onLoggedIn(){
  await loadProfile();
  const pendingRef = store.get('pending_ref');
  if(pendingRef && profile){
    try{ await sb.rpc('redeem_referral', { p_code: pendingRef }); store.set('pending_ref', null); await loadProfile(); toast('Referral bonus applied — +' + CONFIG.ECONOMY.REFERRAL_BONUS.toLocaleString() + ' credits'); }
    catch(e){ store.set('pending_ref', null); }
  }
  render('home');
}
async function loadProfile(){
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if(error) console.error('loadProfile failed:', error);
  if(!error) {
    profile = data;
    const creditCountEl = $('#credit-count');
    if (creditCountEl) creditCountEl.textContent = currentCredits();

    if (profile.premium_tier === 'vip') {
      const today = new Date().toISOString().slice(0, 10);
      if (profile.last_daily_grant !== today) {
        sb.rpc('claim_daily_credits').then(({ data: newCreds, error: claimErr }) => {
          if (!claimErr && newCreds !== null) {
            profile.credits = newCreds;
            profile.last_daily_grant = today;
            if (creditCountEl && !isAdminUser()) creditCountEl.textContent = newCreds;
          }
        }).catch(()=>{});
      }
    }
  }
}

(function captureRef(){
  const p = new URLSearchParams(location.search);
  if(p.get('ref')) store.set('pending_ref', p.get('ref'));
})();

/* ============================================================
   Multi-Collection & Trading Helpers
   ============================================================ */
function getCollectionsMap() {
  let map = store.get('user_collections', null);
  if (!map || typeof map !== 'object') {
    const legacy = store.get('collection', null);
    map = { 'Main Collection': legacy || {} };
    store.set('user_collections', map);
  }
  return map;
}

function getActiveCollectionName() {
  const map = getCollectionsMap();
  let active = store.get('active_collection', null);
  if (!active || !map[active]) {
    active = Object.keys(map)[0] || 'Main Collection';
    store.set('active_collection', active);
  }
  return active;
}

function getActiveCollectionCards() {
  const map = getCollectionsMap();
  const active = getActiveCollectionName();
  return map[active] || {};
}

function persistToActiveCollection(packCards){
  const map = getCollectionsMap();
  const active = getActiveCollectionName();
  map[active] = map[active] || {};
  packCards.forEach(p=>{
    const c = p.card;
    map[active][c.id] = map[active][c.id] || { name:c.name, image:c.images.small, rarity:c.rarity, count:0 };
    map[active][c.id].count++;
  });
  store.set('user_collections', map);
  store.set('collection', map[active]);
}

/* ============================================================
   Views
   ============================================================ */
const app = $('#app');
let route = { name:'home' };

function render(name, params={}){
  route = { name, params };
  if(!app) return;
  app.innerHTML = '';
  app.appendChild(renderTopbar());
  
  if(name==='home') renderHome();
  if(name==='set') renderSetDetail(params.set);
  if(name==='collection') renderCollection();
  if(name==='search') renderSearch();
  if(name==='profile') renderProfile();
  if(name==='user_collection') renderUserCollection(params.userId, params.username);
  if(name==='trade') renderTrade();
  
  app.appendChild(renderTabs());
}

function openAuthModal(resumeSetMeta = null){
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  overlay.appendChild(sheet); 
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', (e)=>{ 
    if(e.target===overlay) overlay.remove();
  });

  function renderMainView() {
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h2>Welcome Back</h2>
      <div class="sub">Choose how you'd like to log in or sign up. New accounts receive ${CONFIG.ECONOMY.STARTING_CREDITS.toLocaleString()} starting credits!</div>
      
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
          <button class="btn btn-secondary" type="button" id="google-auth-btn" style="display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <button class="btn btn-secondary" type="button" id="email-view-btn" style="display:flex; align-items:center; justify-content:center; gap:8px;">
            ✉️ Continue with Email & Password
          </button>
      </div>

      <div class="hint" id="auth-error-msg" style="color:#ff6b6b; text-align:center; min-height:14px; margin-top:4px;"></div>

      <div style="height:1px; background:var(--edge); margin:20px 0;"></div>
      <button class="btn btn-secondary" type="button" id="modal-guest-btn" style="width:100%;">Continue as guest</button>
      <div class="hint" style="margin-top:8px;text-align:center;">Guests get ${CONFIG.ECONOMY.GUEST_CREDITS.toLocaleString()} credits on this device.</div>
    `;

    const errBox = $('#auth-error-msg', sheet);

    $('#google-auth-btn', sheet).addEventListener('click', async () => {
      errBox.style.color = 'var(--text)'; errBox.textContent = 'Redirecting to Google...';
      const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: CONFIG.APP_URL }
      });
      if (error) {
          errBox.style.color = '#ff6b6b';
          errBox.textContent = error.message;
      }
    });

    $('#email-view-btn', sheet).addEventListener('click', renderEmailView);

    $('#modal-guest-btn', sheet).addEventListener('click', ()=>{
      overlay.remove();
      startGuestSession(false);
      if(resumeSetMeta) beginOpen(resumeSetMeta, resumeSetMeta.packCost || 150, 1); 
      else render(route.name, route.params);
    });
  }

  function renderEmailView() {
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
          <button id="back-to-main-btn" style="background:transparent; border:none; color:var(--text); cursor:pointer; padding:4px; display:flex; align-items:center; margin-left:-4px;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2 style="margin:0;">Email & Password</h2>
      </div>

      <form class="auth-form" id="modal-auth-form" style="display:flex; flex-direction:column; gap:8px;">
        <input type="email" id="modal-email-input" placeholder="you@email.com" required autocomplete="email" inputmode="email"/>
        <input type="password" id="modal-password-input" placeholder="Password" required autocomplete="current-password" minlength="6"/>
        <div style="display:flex; gap:8px; margin-top:4px;">
            <button class="btn btn-primary" type="button" id="login-pwd-btn" style="flex:1;">Log In</button>
            <button class="btn btn-secondary" type="button" id="signup-pwd-btn" style="flex:1;">Sign Up</button>
        </div>
        <div class="hint" id="auth-error-msg" style="color:#ff6b6b; text-align:center; min-height:14px; margin-top:4px;"></div>
      </form>
    `;

    $('#back-to-main-btn', sheet).addEventListener('click', renderMainView);

    const errBox = $('#auth-error-msg', sheet);
    const emailIn = $('#modal-email-input', sheet);
    const passIn = $('#modal-password-input', sheet);

    $('#login-pwd-btn', sheet).addEventListener('click', async () => {
      errBox.style.color = '#ff6b6b'; errBox.textContent = '';
      if(!emailIn.value || !passIn.value) return errBox.textContent = 'Enter email and password.';
      
      const btn = $('#login-pwd-btn', sheet);
      const origText = btn.textContent; btn.textContent = '...';
      try {
          const { error } = await sb.auth.signInWithPassword({
              email: emailIn.value.trim(),
              password: passIn.value
          });
          if (error) throw error;
          overlay.remove();
      } catch (err) {
          errBox.textContent = err.message;
          btn.textContent = origText;
      }
    });

    $('#signup-pwd-btn', sheet).addEventListener('click', async () => {
      errBox.style.color = '#ff6b6b'; errBox.textContent = '';
      if(!emailIn.value || !passIn.value) return errBox.textContent = 'Enter email and password.';
      
      const btn = $('#signup-pwd-btn', sheet);
      const origText = btn.textContent; btn.textContent = '...';
      try {
          const { error } = await sb.auth.signUp({
              email: emailIn.value.trim(),
              password: passIn.value
          });
          if (error) throw error;
          errBox.style.color = 'var(--cyan)';
          errBox.textContent = 'Success! Check your email to verify your account.';
          btn.textContent = origText;
      } catch (err) {
          errBox.textContent = err.message;
          btn.textContent = origText;
      }
    });
  }

  renderMainView();
}

function renderTopbar(){
  const bar = el('div','topbar');
  const authBtn = session
    ? `<button class="topbar-auth" id="logout-btn">Log Out</button>`
    : `<button class="topbar-auth" id="login-btn">Log In</button>`;

  bar.innerHTML = `
    <div class="brand" style="display:flex; align-items:center; gap:8px; flex:1;">
      <div id="brand-home-btn" style="display:flex; align-items:center; gap:6px; cursor:pointer; flex:1;">
        <span class="dot"></span>Chase Cards${guestMode ? ' <span style="font-size:10px;color:var(--dim-2);font-weight:700;letter-spacing:.08em;background:var(--panel);border:1px solid var(--edge);padding:2px 7px;border-radius:999px;margin-left:6px;">GUEST</span>' : ''}${isAdminUser() ? '<span class="vip-badge">🛠️ ADMIN</span>' : (profile?.premium_tier === 'vip' ? '<span class="vip-badge">👑 VIP</span>' : '')}
      </div>
      ${authBtn}
    </div>
    <button class="credits-pill tappable" id="credits-btn"><span class="coin"></span><span id="credit-count">${currentCredits()}</span></button>
  `;
  
  bar.querySelector('#brand-home-btn').addEventListener('click', () => render('home'));

  if(session) {
      bar.querySelector('#logout-btn').addEventListener('click', async ()=> {
          await sb.auth.signOut();
          session = null;
          profile = null;
          guestMode = true;
          render('home');
      });
  } else {
      bar.querySelector('#login-btn').addEventListener('click', ()=> openAuthModal());
  }
  
  bar.querySelector('#credits-btn').addEventListener('click', ()=> openGetCreditsModal());
  return bar;
}

function renderTabs(){
  const tabs = el('div','tabs');
  const items = [
    { key:'home', label:'Packs', icon:'M4 12l8-8 8 8M6 10v10h12V10' },
    { key:'collection', label:'Collections', icon:'M4 6h16M4 12h16M4 18h16' },
    { key:'trade', label:'Trade', icon:'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { key:'profile', label:'Profile', icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
  ];
  items.forEach(it=>{
    const t = el('div','tab'+(route.name===it.key?' active':''));
    t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="${it.icon}"/></svg><span>${it.label}</span>`;
    t.addEventListener('click', ()=> render(it.key));
    tabs.appendChild(t);
  });
  return tabs;
}

function getAccountTypeBadge(user, userProfile) {
  if (!user) {
    return { label: 'Guest', cssClass: 'badge-guest' };
  }
  
  if (userProfile?.is_admin) {
      return { label: '🛠️ System Admin', cssClass: 'badge-vip' };
  }
  
  const tier = (userProfile?.premium_tier || 'free').toLowerCase();

  switch (tier) {
    case 'vip': return { label: '👑 VIP Member', cssClass: 'badge-vip' };
    case 'elite': return { label: '💎 Elite VIP', cssClass: 'badge-elite' };
    case 'pro': return { label: '🔥 Pro Member', cssClass: 'badge-pro' };
    case 'plus':
    case 'gold': return { label: '🥇 Gold Tier', cssClass: 'badge-gold' };
    case 'starter':
    case 'bronze': return { label: '🥉 Bronze Tier', cssClass: 'badge-bronze' };
    default: return { label: 'Free Account', cssClass: 'badge-free' };
  }
}

function renderAccountArea(user, userProfile) {
  const badge = getAccountTypeBadge(user, userProfile);
  const stats = getPlayerStats();
  const accountHtml = `
    <div class="account-card">
      <div class="account-header">
        <h3>${user ? user.email : 'Guest Session'}</h3>
        <span class="account-badge ${badge.cssClass}">${badge.label}</span>
      </div>
      <div class="account-details">
        <p><strong>Credits:</strong> ${userProfile?.is_admin ? '∞ (Admin Unlimited)' : (userProfile?.credits?.toLocaleString() || CONFIG.ECONOMY.STARTING_CREDITS)}</p>
        <p><strong>Status:</strong> ${userProfile?.is_premium ? 'Premium (Admin-Granted)' : 'Standard'}</p>
        <p><strong>🔥 Daily Streak:</strong> ${stats.loginStreak || 1} Days Active</p>
      </div>
    </div>
  `;
  const accountSection = document.getElementById('account-section');
  if (accountSection) accountSection.innerHTML = accountHtml;
}

async function renderProfile() {
  const wrap = el('div');
  wrap.innerHTML = `
      <div class="section-title">My Account</div>
      <div id="account-section"></div>
      
      <div id="admin-panel" style="display:none; margin-top:30px; padding:18px; background:var(--panel-2); border:1px solid var(--vip-gold-dim); border-radius:14px; box-shadow: 0 4px 15px rgba(255, 233, 184, 0.1);">
         <h3 style="color:var(--vip-gold); margin-top:0; font-family:var(--font-display); font-size:18px;">🛠️ Admin Controls</h3>
         <p class="hint" style="margin-bottom:14px;">Select any registered user from the list and manually update their membership level.</p>
         
         <div style="margin-bottom:12px;">
             <label class="hint" style="display:block; margin-bottom:4px; font-weight:bold;">Select Registered User:</label>
             <select id="admin-target-user-select" style="width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--edge); background:var(--panel); color:var(--text); font-family:var(--font-body);">
                 <option value="">Loading registered users...</option>
             </select>
         </div>

         <div style="margin-bottom:12px;">
             <label class="hint" style="display:block; margin-bottom:4px; font-weight:bold;">Target Membership Tier:</label>
             <select id="admin-target-tier-select" style="width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--edge); background:var(--panel); color:var(--text); font-family:var(--font-body);">
                 <option value="free">Free Account</option>
                 <option value="starter">Starter</option>
                 <option value="plus">Plus</option>
                 <option value="pro">Pro</option>
                 <option value="elite">Elite</option>
                 <option value="vip">VIP Member (100,000 daily credits)</option>
             </select>
         </div>

         <button class="btn btn-vip" id="admin-update-membership-btn" style="width:100%;">Update User Membership</button>
         <div id="admin-msg" class="hint" style="margin-top:12px; text-align:center; font-weight:bold; min-height:16px;"></div>
      </div>
  `;
  app.appendChild(wrap);

  if (!session && guestMode) {
      wrap.querySelector('#account-section').innerHTML = `
          <div class="account-card" style="text-align:center;">
              <div class="account-header" style="justify-content:center; border-bottom:none;">
                  <span class="account-badge badge-guest" style="font-size:1rem; padding:8px 16px;">Guest Session</span>
              </div>
              <div class="account-details">
                  <p>Create an account to save your collection, follow other collectors, and claim daily rewards.</p>
                  <button class="btn btn-primary" id="profile-login-btn" style="width:100%; margin-top:12px;">Sign Up / Log In</button>
              </div>
          </div>
      `;
      $('#profile-login-btn', wrap)?.addEventListener('click', () => exitGuestMode());
      return;
  }
  
  setTimeout(async () => {
    if(session) await loadProfile();
    renderAccountArea(session?.user, profile);

    const adminPanel = $('#admin-panel', wrap);

    if (session && profile?.is_admin) {
        if (adminPanel) adminPanel.style.display = 'block';

        const updateBtn = $('#admin-update-membership-btn', wrap);
        const userSelect = $('#admin-target-user-select', wrap);
        const tierSelect = $('#admin-target-tier-select', wrap);
        const msgBox = $('#admin-msg', wrap);

        try {
            const { data: usersList, error: usersErr } = await sb.from('profiles').select('id, email, username, premium_tier').order('email', { ascending: true });
            if (usersErr) throw usersErr;
            if (usersList && usersList.length > 0) {
                userSelect.innerHTML = usersList.map(u => `<option value="${u.email || u.id}">${u.email || u.username || u.id} (Current: ${u.premium_tier || 'free'})</option>`).join('');
            } else {
                userSelect.innerHTML = '<option value="">No registered users found</option>';
            }
        } catch(e) {
            userSelect.innerHTML = '<option value="">Error loading users list (Check RLS policies on profiles table)</option>';
        }
        
        if (updateBtn) {
            updateBtn.addEventListener('click', async () => {
                const targetIdentifier = userSelect.value;
                const newTier = tierSelect.value;
                if(!targetIdentifier) {
                    msgBox.style.color = 'var(--danger)';
                    msgBox.textContent = 'Please select a valid user.';
                    return;
                }
                updateBtn.disabled = true; updateBtn.textContent = 'Updating...';
                try {
                    const { error } = await sb.rpc('admin_set_membership', { target_identifier: targetIdentifier, new_tier: newTier });
                    if(error) throw error;
                    msgBox.style.color = 'var(--cyan)';
                    msgBox.textContent = `Success! User membership updated to ${newTier.toUpperCase()}.`;
                    
                    const { data: refreshedList } = await sb.from('profiles').select('id, email, username, premium_tier').order('email', { ascending: true });
                    if (refreshedList) {
                        userSelect.innerHTML = refreshedList.map(u => `<option value="${u.email || u.id}" ${u.email === targetIdentifier ? 'selected' : ''}>${u.email || u.username || u.id} (Current: ${u.premium_tier || 'free'})</option>`).join('');
                    }
                } catch(e) {
                    msgBox.style.color = 'var(--danger)';
                    msgBox.textContent = e.message;
                }
                updateBtn.disabled = false; updateBtn.textContent = 'Update User Membership';
            });
        }
    } else {
        if (adminPanel) adminPanel.style.display = 'none';
    }
  }, 0);
}

async function renderSearch() {
  const wrap = el('div');
  wrap.innerHTML = `
    <div class="section-title">Search Card Pulls</div>
    <div class="search-bar-wrap">
      <input type="text" id="search-input" placeholder="Search a card name..." class="auth-form" style="width:auto;" />
      <button class="btn btn-primary" id="search-btn">Search</button>
    </div>
    <div id="search-results" style="display:flex; flex-direction:column; gap:10px;"></div>
  `;
  app.appendChild(wrap);

  $('#search-btn', wrap).addEventListener('click', async () => {
     const query = $('#search-input', wrap).value.trim();
     if (!query) return;
     const resultsDiv = $('#search-results', wrap);
     resultsDiv.innerHTML = '<div class="hint">Searching database...</div>';
     try {
        const { data, error } = await sb.rpc('search_card_owners', { p_card_query: query });
        if (error) throw error;
        if (!data || data.length === 0) {
            resultsDiv.innerHTML = '<div class="hint">No public pulls found for this search.</div>';
            return;
        }
        resultsDiv.innerHTML = '';
        data.forEach(item => {
           const card = el('div', 'refer-box'); 
           card.style.display = 'flex'; card.style.alignItems = 'center'; card.style.cursor = 'pointer';
           card.innerHTML = `
              <img src="${item.card_image || ''}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'62\'><rect width=\'100%\' height=\'100%\' fill=\'%231e293b\'/></svg>'" style="width:44px; height:62px; object-fit:cover; border-radius:4px; margin-right:12px;" />
              <div style="flex:1;">
                 <div style="font-weight:bold; font-size:14px; margin-bottom:2px;">${item.card_name}</div>
                 <div class="hint" style="color:var(--dim);">Pulled by: ${item.username || 'User'}</div>
              </div>
              <button class="btn btn-secondary" style="padding:6px 14px; font-size:12px;">View Collection</button>
           `;
           card.addEventListener('click', () => render('user_collection', { userId: item.user_id, username: item.username }));
           resultsDiv.appendChild(card);
        });
     } catch (err) {
        resultsDiv.innerHTML = '<div class="hint" style="color:var(--danger)">Error querying the database. Please try again.</div>';
     }
  });
}

async function renderUserCollection(targetUserId, username) {
  const wrap = el('div');
  wrap.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin:22px 0 10px;">
      <div class="section-title" style="margin:0;">${username || 'User'}'s Collection</div>
      <button class="btn btn-secondary" id="follow-btn" style="padding:6px 14px; font-size:12px; display:none;">Follow</button>
    </div>
    <div id="user-coll-grid" class="collection-grid"></div>
  `;
  app.appendChild(wrap);

  const grid = $('#user-coll-grid', wrap);
  grid.innerHTML = '<div class="hint" style="grid-column:1/-1;">Loading collection...</div>';

  try {
     const { data: pulls, error: pullsErr } = await sb.from('openings').select('cards').eq('user_id', targetUserId);
     if (pullsErr) throw pullsErr;
     
     const coll = {};
     (pulls || []).forEach(opening => {
        (opening.cards || []).forEach(c => {
           coll[c.id] = coll[c.id] || { name:c.name, image:c.image, rarity:c.rarity, count:0 };
           coll[c.id].count++;
        });
     });

     const keys = Object.keys(coll);
     if (!keys.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">This user has no cards yet.</div>';
     } else {
        grid.innerHTML = '';
        keys.sort((a,b)=> classify(coll[b].rarity).id - classify(coll[a].rarity).id).forEach(id=>{
          const c = coll[id]; const item = el('div','coll-item');
          item.innerHTML = `<img src="${c.image}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'140\'><rect width=\'100%\' height=\'100%\' fill=\'%231e293b\'/></svg>'"/><span class="count">×${c.count}</span>`;
          item.addEventListener('click', async ()=> showCardFullscreen(await ImgCache.get(c.image), { id, ...c }));
          grid.appendChild(item);
        });
     }

     if (session && session.user.id !== targetUserId) {
         const followBtn = $('#follow-btn', wrap);
         followBtn.style.display = 'block';

         const { data: followData } = await sb.from('follows')
            .select('*')
            .eq('follower_id', session.user.id)
            .eq('following_id', targetUserId)
            .single();

         let isFollowing = !!followData;
         followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
         followBtn.className = isFollowing ? 'btn btn-secondary' : 'btn btn-primary';

         followBtn.addEventListener('click', async () => {
             followBtn.disabled = true;
             try {
                 if (isFollowing) {
                     await sb.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', targetUserId);
                     isFollowing = false;
                 } else {
                     await sb.from('follows').insert({ follower_id: session.user.id, following_id: targetUserId });
                     isFollowing = true;
                 }
                 followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
                 followBtn.className = isFollowing ? 'btn btn-secondary' : 'btn btn-primary';
             } catch(e) { toast('Action failed'); }
             followBtn.disabled = false;
         });
     }
  } catch(err) {
     grid.innerHTML = '<div class="hint" style="grid-column:1/-1; color:var(--danger)">Error loading user collection.</div>';
  }
}

async function renderHome(){
  const setsWrap = el('div');

  if(!store.get('seen_welcome')){
    const welcome = el('div');
    welcome.style.cssText = 'background:var(--panel); border:1px solid var(--edge); border-radius:14px; padding:16px; margin-bottom:16px; position:relative;';
    welcome.innerHTML = `
      <button id="dismiss-welcome" style="position:absolute; top:10px; right:10px; width:28px; height:28px; border-radius:50%; background:var(--panel-2); color:var(--dim); display:flex; align-items:center; justify-content:center; font-size:14px;">✕</button>
      <div style="font-family:var(--font-display); font-weight:700; font-size:17px; margin-bottom:4px;">Welcome to Chase Cards 👋</div>
      <div style="color:var(--dim); font-size:13.5px; line-height:1.5;">Rip open real Pokémon booster packs using free credits — no purchase needed. Pick a set below, tear the pack, and see what you pull. Credits are virtual and never cost real money.</div>
    `;
    $('#dismiss-welcome', welcome).addEventListener('click', ()=>{ store.set('seen_welcome', true); welcome.remove(); });
    setsWrap.appendChild(welcome);
  }

  setsWrap.appendChild(el('div','section-title','Choose a booster (Oldest → Newest)'));
  const gridHolder = el('div'); gridHolder.innerHTML = `<div class="set-grid" id="set-grid"></div>`;
  setsWrap.appendChild(gridHolder.firstChild);
  
  const footer = el('div','hint');
  footer.style.cssText = 'text-align:center; padding: 24px 12px; font-size: 11px; opacity: 0.6; line-height: 1.4;';
  footer.innerHTML = 'Not affiliated with, sponsored, or endorsed by Nintendo, Creatures Inc., or GAME FREAK. Pokémon and Pokémon character names are trademarks of Nintendo. For entertainment and simulation purposes only. Virtual credits have no cash value and cannot be redeemed for real-world currency.';
  setsWrap.appendChild(footer);
  
  app.appendChild(setsWrap);
  const grid = $('#set-grid');
  for(let i=0;i<6;i++){ const s = el('div','set-card skeleton'); s.style.height='96px'; grid.appendChild(s); }
  try{
    const sets = await getSets();
    grid.innerHTML = '';
    sets.forEach(s=>{
      const card = el('div','set-card');
      const costDisplay = s.packCost || 150;
      card.innerHTML = `<img src="" onerror="this.style.display='none'" alt=""/><div class="name">${s.name}</div><div class="meta">${s.series} · ${costDisplay} cr</div>`;
      card.addEventListener('click', ()=> render('set', { set: s }));
      grid.appendChild(card);
      if(s.images.symbol) {
        ImgCache.get(s.images.symbol).then(src => {
          const imgEl = card.querySelector('img');
          if(imgEl && src) imgEl.src = src;
        });
      }
    });
  }catch(e){
    const msg = 'Couldn\'t reach the card database — it can be flaky. Nothing was charged.';
    grid.innerHTML = `<div class="hint" style="grid-column:1/-1;text-align:center;padding:20px 8px;">${msg}</div>`;
    const retryBtn = el('button','btn btn-secondary'); retryBtn.textContent = 'Retry'; retryBtn.style.gridColumn = '1/-1';
    retryBtn.addEventListener('click', ()=> render('home')); grid.appendChild(retryBtn);
  }
}

async function renderSetDetail(setMeta){
  setDetailCardsCache = null; setDetailCardsCacheSetId = null;
  const wrap = el('div');
  const dynamicCost = setMeta.packCost || 150;
  
  const creds = currentCredits();
  const numericCreds = isAdminUser() ? 999999 : (typeof creds === 'number' ? creds : parseInt(creds, 10) || CONFIG.ECONOMY.STARTING_CREDITS);
  const maxAffordable = Math.max(1, Math.floor(numericCreds / dynamicCost));
  
  wrap.innerHTML = `
    <div class="pack-hero">
      <img class="logo" id="hero-logo" src="" onerror="this.style.display='none'" alt=""/>
      
      <div id="pack-gallery-wrap" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
          <div class="pack-gallery single" id="pack-gallery">
            <div class="pack-art is-fallback active" id="skeleton-art">
              <div class="pack-art-bg skeleton"></div>
              <div class="pack-crimp top fallback-only"></div>
              <div class="pack-crimp bottom fallback-only"></div>
              <img class="pack-art-logo fallback-only" id="pack-art-logo" src="" onerror="this.style.display='none'"/>
            </div>
          </div>
      </div>

      <div class="pack-count">10 cards per pack · ${setMeta.total} cards in ${setMeta.name}</div>
      
      <div style="width:100%; margin:8px 0 16px; background:var(--panel); border:1px solid var(--edge); border-radius:12px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:14px; font-weight:bold;">
          <span>Quantity: <span id="qty-display" style="color:var(--cyan);">1</span> Pack</span>
          <span id="cost-display" style="color:var(--gold);">${dynamicCost} cr</span>
        </div>
        <input type="range" id="pack-qty-slider" min="1" max="${maxAffordable}" value="1" style="width:100%; accent-color:var(--cyan); cursor:pointer;" />
      </div>

      <div style="display:flex; gap:8px; width:100%;">
        <button class="btn btn-primary" id="open-pack-btn" style="flex:1;">${isAdminUser() ? 'Open Packs (Admin)' : `Open 1 Pack — ${dynamicCost} cr`}</button>
      </div>
      <div class="odds-box">
        <div class="row"><span>Structure</span><b>4 common · 3 uncommon · 1 reverse holo · 2 hit slots</b></div>
        <div class="row"><span>Hit-slot odds</span><b>modeled on SV-era community data</b></div>
        <div class="row"><span>God pack chance</span><b>1 in 600</b></div>
      </div>
    </div>
  `;
  app.appendChild(wrap);

  const slider = $('#pack-qty-slider', wrap);
  const qtyDisplay = $('#qty-display', wrap);
  const costDisplay = $('#cost-display', wrap);
  const openBtn = $('#open-pack-btn', wrap);

  slider.addEventListener('input', () => {
    const q = parseInt(slider.value, 10);
    const totalCost = q * dynamicCost;
    qtyDisplay.textContent = q;
    costDisplay.textContent = `${totalCost.toLocaleString()} cr`;
    openBtn.textContent = isAdminUser() ? `Open ${q} Packs (Admin)` : `Open ${q} Pack${q > 1 ? 's' : ''} — ${totalCost.toLocaleString()} cr`;
  });

  openBtn.addEventListener('click', ()=> beginOpen(setMeta, dynamicCost, parseInt(slider.value, 10)));
  
  if(setMeta.images.logo){
    ImgCache.get(setMeta.images.logo).then(src => {
      const heroLogo = $('#hero-logo');
      if(heroLogo && src) heroLogo.src = src; 
      const fal = $('#pack-art-logo', wrap);
      if(fal && src) fal.src = src;
    });
  }

  try{
    const cards = await getCardsForSet(setMeta.id);
    setDetailCardsCache = cards; setDetailCardsCacheSetId = setMeta.id;
    
    const gallery = $('#pack-gallery', wrap);
    const idLower = setMeta.id.toLowerCase();
    
    let rawUrls = [];
    try {
      const githubApiUrl = `https://api.github.com/repos/1niceroli/ptcg-assets/contents/${idLower}/packshots`;
      const ghRes = await fetch(githubApiUrl);
      if (ghRes.ok) {
        const files = await ghRes.json();
        const images = files.filter(f => f.type === 'file' && f.name.match(/\.(png|jpe?g|webp)$/i));
        images.sort((a,b) => a.name.localeCompare(b.name));
        rawUrls = images.map(img => img.download_url);
      }
    } catch(err) { console.warn('Could not fetch packshot directory contents', err); }

    rawUrls.push(
      `https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/${idLower}/packshots/1.png`,
      `https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/${idLower}/packshots/1.jpg`,
      setMeta.images.logo || null
    );
    rawUrls = rawUrls.filter(Boolean);

    const validUrls = [];
    for(const url of rawUrls) {
      try {
        const resolved = await ImgCache.get(url);
        if(resolved) {
          validUrls.push(resolved);
        }
      } catch(err) { continue; }
    }

    const uniqueValidUrls = [...new Set(validUrls)];
    gallery.innerHTML = '';

    if (uniqueValidUrls.length === 0) {
        const pa = el('div', 'pack-art is-fallback active');
        pa.innerHTML = `<div class="pack-art-bg" style="background: linear-gradient(135deg, #1e293b, #0f172a); display:flex; align-items:center; justify-content:center; text-align:center; padding:12px; font-weight:bold; color:var(--cyan);">${setMeta.name}</div><div class="pack-crimp top fallback-only"></div><div class="pack-crimp bottom fallback-only"></div>`;
        gallery.appendChild(pa);
        gallery.classList.add('single');
        setMeta.resolvedPackArt = null;
    } else {
        if (uniqueValidUrls.length === 1) gallery.classList.add('single');
        else gallery.classList.remove('single');
        
        uniqueValidUrls.forEach((url, i) => {
            const pa = el('div', `pack-art ${i === 0 ? 'active' : ''}`);
            pa.innerHTML = `<div class="pack-art-bg" style="background-image:url('${url}'); background-size:100% 100%; background-repeat:no-repeat; background-position:center;"></div>`;
            
            pa.addEventListener('click', () => {
                gallery.querySelectorAll('.pack-art').forEach(el => el.classList.remove('active'));
                pa.classList.add('active');
                pa.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                setMeta.resolvedPackArt = url; 
            });
            
            gallery.appendChild(pa);
            if (i === 0) setMeta.resolvedPackArt = url; 
        });
        
        if (uniqueValidUrls.length > 1) {
            const hint = el('div', 'hint');
            hint.style.marginTop = '4px'; hint.style.marginBottom = '12px'; hint.style.fontWeight = '600'; hint.style.color = 'var(--cyan)';
            hint.textContent = '← Swipe & tap to choose pack art →';
            $('#pack-gallery-wrap', wrap).appendChild(hint);
        }
    }

  }catch(e){ }
}

let setDetailCardsCache = null, setDetailCardsCacheSetId = null;

async function beginOpen(setMeta, packCost, qty = 1){
  if(!session && !guestMode) {
      openAuthModal(setMeta);
      return;
  }

  const totalCost = packCost * qty;
  if(!isAdminUser() && currentCredits() < totalCost){ return openGetCreditsModal(true); }
  const btn = $('#open-pack-btn'); if(btn) { btn.disabled = true; btn.textContent = 'Loading cards…'; }
  try{
    const cards = (setDetailCardsCacheSetId === setMeta.id && setDetailCardsCache) || await getCardsForSet(setMeta.id);

    if(isAdminUser()){
      // Admin gets unlimited pack openings for free
    } else if(guestMode){
      const gs = getGuestState(); 
      gs.credits = (Number(gs.credits) || CONFIG.ECONOMY.GUEST_CREDITS) - totalCost; 
      gs.usedFreePack = true;
      setGuestState(gs); 
      const creditCountEl = $('#credit-count');
      if(creditCountEl) creditCountEl.textContent = gs.credits;
    } else {
      if(!profile) {
        await loadProfile();
        if(!profile) { toast('Could not load your account — try reloading the page.', 8000); if(btn) { btn.disabled=false; btn.textContent = 'Open 1 Pack — ' + packCost + ' cr'; } return; }
      }
      const { data: newBalance, error } = await sb.rpc('spend_credits', { p_amount: totalCost });
      if(error) throw error;
      profile.credits = newBalance; 
      const creditCountEl = $('#credit-count');
      if(creditCountEl) creditCountEl.textContent = newBalance;
    }

    const openedPacks = [];
    for(let i=0; i<qty; i++) {
      openedPacks.push(generatePack(cards));
    }
    
    updatePlayerStats(st => {
      st.packsOpened = (st.packsOpened || 0) + qty;
      st.creditsSpent = (st.creditsSpent || 0) + (isAdminUser() ? 0 : totalCost);
      
      openedPacks.forEach(pack => {
        pack.cards.forEach(p => {
          const tId = classify(p.card.rarity).id;
          if(tId > (st.rarestPull.tierId ?? -1)) {
            st.rarestPull = {
              name: p.card.name,
              rarity: p.card.rarity || 'Common',
              tierId: tId,
              image: p.card.images.small
            };
          }
        });
      });
    });

    if(btn) btn.textContent = 'Caching pack assets...';
    
    const urlsToPrefetch = [];
    if(setMeta.images.logo) urlsToPrefetch.push(setMeta.images.logo);
    if(setMeta.resolvedPackArt) urlsToPrefetch.push(setMeta.resolvedPackArt);
    if(setMeta.images.symbol) urlsToPrefetch.push(setMeta.images.symbol);
    
    openedPacks.forEach(pack => {
      pack.cards.forEach(p => {
        if(p.card.images.large) urlsToPrefetch.push(p.card.images.large);
        if(p.card.images.small) urlsToPrefetch.push(p.card.images.small);
      });
    });
    
    await Promise.all(urlsToPrefetch.map(url => ImgCache.get(url).catch(()=>null)));
    
    const allFlatCards = [];
    openedPacks.forEach(p => p.cards.forEach(c => allFlatCards.push(c)));

    if(!guestMode && session){
      for(const pack of openedPacks) {
        await sb.from('openings').insert({ user_id: session.user.id, set_id: setMeta.id, set_name: setMeta.name, cards: pack.cards.map(p=>({id:p.card.id,name:p.card.name,rarity:p.card.rarity,image:p.card.images.small})), cost: packCost });
      }
    }
    persistToActiveCollection(allFlatCards);
    
    if(qty === 1) {
      openRevealScreen(setMeta, openedPacks[0], openedPacks[0].cards[0]?.card?.images?.large);
    } else {
      showBulkSummary(setMeta, openedPacks);
    }
  }catch(e){
    console.error('beginOpen failed:', e);
    const detail = e?.message || e?.error_description || e?.details || String(e);
    toast(e.message==='insufficient_credits' ? 'Not enough credits' : `Error: ${detail}`, 8000);
  }finally{ 
    if(btn) { 
      btn.disabled=false; 
      const currentSliderVal = $('#pack-qty-slider')?.value || 1;
      const currentTotalCost = currentSliderVal * packCost;
      btn.textContent = isAdminUser() ? `Open ${currentSliderVal} Packs (Admin)` : `Open ${currentSliderVal} Pack${currentSliderVal > 1 ? 's' : ''} — ${currentTotalCost.toLocaleString()} cr`; 
    } 
  }
}

function openRevealScreen(setMeta, pack, bgUrl){
  const collection = getActiveCollectionCards();
  const screen = el('div','reveal-screen');
  let idx = 0; let bestTier = 0;
  screen.innerHTML = `
    <div class="reveal-header">
      <div class="reveal-progress" id="prog">Card 1 / ${pack.cards.length}</div>
      <button class="close-x" id="close-reveal">✕</button>
    </div>
    <div class="stage"><div class="flipcard" id="flipcard">
      <div class="face back"></div>
      <div class="face front"><img id="front-img" src="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'280\'><rect width=\'100%\' height=\'100%\' fill=\'%231e293b\'/><text x=\'50%\' y=\'50%\' fill=\'%2394a3b8\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'sans-serif\' font-size=\'14\'>Image Unavailable</text></svg>'" alt=""/><div class="tier-badge" id="tier-badge"></div></div>
    </div></div>
    <div class="card-name" id="card-name">&nbsp;</div>
    <div class="card-sub" id="card-sub">&nbsp;</div>
    <div id="buy-slot"></div>
    <div class="dots" id="dots"></div>
    <div class="tap-hint" id="tap-hint">Tap the card to flip it</div>
  `;
  const flashLayer = el('div','flash-layer'); document.body.appendChild(flashLayer);

  const intro = el('div','pack-intro');
  let authenticPackBg = setMeta.resolvedPackArt ? `url('${ImgCache.sync(setMeta.resolvedPackArt)}')` : '';
  
  intro.innerHTML = `
    <div class="pack-art ${setMeta.resolvedPackArt ? '' : 'is-fallback'}" id="rip-wrapper" style="margin:0; cursor:grab; touch-action:none;">
      <div class="pack-art-bg" style="${authenticPackBg ? `background-image:${authenticPackBg}; background-size: 100% 100%;` : 'background:linear-gradient(135deg, #1e293b, #0f172a);'}"></div>
      <div class="pack-crimp top fallback-only"></div>
      <div class="pack-crimp bottom fallback-only"></div>
      <img class="pack-art-logo fallback-only" src="${ImgCache.sync(setMeta.images.logo)}" onerror="this.style.display='none'"/>
      <div style="position:absolute; bottom:15px; width:100%; text-align:center; font-weight:bold; color:#fff; font-size:13px; text-shadow:0 2px 4px rgba(0,0,0,0.8);">👆 Swipe or Tap to Rip Open!</div>
    </div>
  `;
  
  document.body.appendChild(intro);

  let startY = 0;
  const ripEl = intro.querySelector('#rip-wrapper');
  
  function triggerRip() {
    SFX.tear();
    vibrate([15,30,15]);
    ripEl.style.animation = 'packrip 0.4s ease-out forwards';
    setTimeout(()=>{
      intro.remove(); document.body.appendChild(screen); boot();
    }, 380);
  }

  ripEl.addEventListener('pointerdown', (e) => { startY = e.clientY; });
  ripEl.addEventListener('pointerup', (e) => {
    if(Math.abs(e.clientY - startY) > 20 || true) {
      triggerRip();
    }
  });

  function boot(){
    const dotsWrap = $('#dots', screen);
    pack.cards.forEach(()=> dotsWrap.appendChild(el('span')));
    $('#close-reveal', screen).addEventListener('click', ()=>{ screen.remove(); flashLayer.remove(); showSummary(setMeta, pack); });

    function showCard(i){
      const p = pack.cards[i]; const tier = classify(p.card.rarity);
      bestTier = Math.max(bestTier, tier.id);
      $('#prog', screen).textContent = `Card ${i+1} / ${pack.cards.length}`;
      $('#front-img', screen).src = ImgCache.sync(p.card.images.large || p.card.images.small);
      
      $('#card-name', screen).innerHTML = '&nbsp;';
      $('#card-sub', screen).innerHTML = '&nbsp;';
      
      const badge = $('#tier-badge', screen); badge.textContent = tier.label; badge.style.background = tier.color;
      if(!collection[p.card.id]){
        const nb = el('div','new-badge','NEW'); $('.face.front', screen).appendChild(nb);
      } else { $('.face.front .new-badge', screen)?.remove(); }
      $('#buy-slot', screen).innerHTML = '';
      const flip = $('#flipcard', screen); flip.classList.remove('flipped');
      if(!guestMode && profile?.is_premium) flip.classList.add(isAdminUser() ? 'vip-fx' : 'premium-fx');
      $('#tap-hint', screen).textContent = 'Tap the card to flip it';
      flip.dataset.done = '0';
    }
    function markDot(i, tier){
      const dot = dotsWrap.children[i]; dot.classList.add('done'); if(tier>=4) dot.classList.add('hit');
    }
    showCard(0);

    $('#flipcard', screen).addEventListener('click', function(){
      if(this.dataset.done==='1'){
        idx++;
        if(idx >= pack.cards.length){ screen.remove(); flashLayer.remove(); showSummary(setMeta, pack); return; }
        this.classList.remove('flipped'); this.dataset.done='0';
        setTimeout(()=>showCard(idx), 180);
        return;
      }
      this.classList.add('flipped'); this.dataset.done='1';
      const cardObj = pack.cards[idx].card;
      const tier = classify(cardObj.rarity);
      markDot(idx, tier.id);
      SFX.flip();
      setTimeout(()=>{
        $('#card-name', screen).textContent = cardObj.name;
        $('#card-sub', screen).textContent = `${cardObj.rarity || 'Common'}${pack.cards[idx].foil ? ' · Foil' : ''} — ${cardObj.set?.name || setMeta.name}`;
        if(tier.id>=7){
          SFX.chase(); vibrate([30,60,30,60,80]); burstConfetti(90);
          screen.classList.add('shake'); setTimeout(()=>screen.classList.remove('shake'), 500);
          flashLayer.classList.add('go'); setTimeout(()=>flashLayer.classList.remove('go'), 500);
        }
        else if(tier.id>=4){ SFX.hit(); vibrate([20,40,20]); burstConfetti(45); }
        else if(tier.id>=3){ SFX.holo(); vibrate(15); burstConfetti(18); }
        else if(tier.id===1){ SFX.uncommon(); }
        else SFX.common();
      }, 250);
      $('#tap-hint', screen).textContent = idx < pack.cards.length-1 ? 'Tap to reveal the next card' : 'Tap to see your full pack';
    });
  }
}

function showSummary(setMeta, pack){
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  const best = pack.cards.reduce((a,b)=> classify(b.card.rarity).id > classify(a.card.rarity).id ? b : a);
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>${pack.godPack ? '⚡ GOD PACK!' : 'Pack opened'}</h2>
    <div class="sub">Best pull: <b style="color:var(--text)">${best.card.name}</b> — ${best.card.rarity}</div>
    <div class="summary-grid" id="sum-grid"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:18px;" id="sum-close">Done</button>
  `;
  overlay.appendChild(sheet); document.body.appendChild(overlay);
  const grid = $('#sum-grid', sheet);
  pack.cards.forEach(p=>{
    const tier = classify(p.card.rarity);
    const mini = el('div','mini'+(tier.id>=4?' hit':''));
    mini.innerHTML = `<img src="${ImgCache.sync(p.card.images.small)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'80\'><rect width=\'100%\' height=\'100%\' fill=\'%231e293b\'/></svg>'"/>`;
    mini.addEventListener('click', ()=> showCardFullscreen(ImgCache.sync(p.card.images.large || p.card.images.small), p.card));
    grid.appendChild(mini);
  });
  $('#sum-close', sheet).addEventListener('click', ()=>{ overlay.remove(); render('home'); });
}

function showBulkSummary(setMeta, openedPacks){
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  sheet.style.maxWidth = '550px';
  
  const allCardsFlat = [];
  openedPacks.forEach(p => p.cards.forEach(c => allCardsFlat.push(c)));
  const topHits = allCardsFlat.filter(p => classify(p.card.rarity).id >= 3);
  topHits.sort((a,b) => classify(b.card.rarity).id - classify(a.card.rarity).id);

  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>🎉 Opened ${openedPacks.length} Packs!</h2>
    <div class="sub">All cards have been added to your collection. (${allCardsFlat.length} total cards)</div>
    <div style="font-weight:bold; color:var(--cyan); margin:12px 0 6px;">Top Hits & Holos (${topHits.length}):</div>
    <div class="summary-grid" id="bulk-sum-grid" style="max-height:40vh; overflow-y:auto; padding:4px;"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:18px;" id="bulk-sum-close">Done</button>
  `;
  overlay.appendChild(sheet); document.body.appendChild(overlay);
  
  const grid = $('#bulk-sum-grid', sheet);
  if(topHits.length === 0) {
    grid.innerHTML = '<div class="hint">No rare or holo hits pulled in this batch.</div>';
  } else {
    topHits.forEach(p => {
      const tier = classify(p.card.rarity);
      const mini = el('div','mini'+(tier.id>=4?' hit':''));
      mini.innerHTML = `<img src="${ImgCache.sync(p.card.images.small)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'80\'><rect width=\'100%\' height=\'100%\' fill=\'%231e293b\'/></svg>'"/>`;
      mini.addEventListener('click', ()=> showCardFullscreen(ImgCache.sync(p.card.images.large || p.card.images.small), p.card));
      grid.appendChild(mini);
    });
  }

  burstConfetti(100);
  SFX.chase();

  $('#bulk-sum-close', sheet).addEventListener('click', ()=>{ overlay.remove(); render('home'); });
}

/* ============================================================
   Collections View (With Clear, Rename, Delete, Export/Import)
   ============================================================ */
function renderCollection(){
  const map = getCollectionsMap();
  const activeName = getActiveCollectionName();
  const coll = map[activeName] || {};
  const keys = Object.keys(coll);

  const wrap = el('div');
  wrap.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div class="section-title" style="margin:0;">My Collections</div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary" id="export-coll-btn" style="padding:6px 12px; font-size:12px;">💾 Export (.pkcard)</button>
          <label class="btn btn-secondary" style="padding:6px 12px; font-size:12px; cursor:pointer; margin:0;">
            📂 Import <input type="file" id="import-coll-file" accept=".json,.pkcard" style="display:none;"/>
          </label>
        </div>
      </div>

      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <select id="collection-select" style="padding:8px 12px; border-radius:10px; background:var(--panel); color:var(--text); border:1px solid var(--edge); font-family:var(--font-body); flex:1;">
          ${Object.keys(map).map(b => `<option value="${b}" ${b===activeName?'selected':''}>📁 ${b} (${Object.values(map[b]).reduce((s,c)=>s+c.count,0)} cards)</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="new-collection-btn" style="padding:8px 14px; font-size:13px;">+ New Collection</button>
        <button class="btn btn-secondary" id="rename-collection-btn" style="padding:8px 12px; font-size:13px;">✏️ Rename</button>
        <button class="btn btn-secondary" id="clear-coll-btn" style="padding:8px 12px; font-size:13px; color:var(--gold); border-color:var(--gold);">🧹 Clear Cards</button>
        <button class="btn btn-secondary" id="delete-collection-btn" style="padding:8px 12px; font-size:13px; color:var(--danger); border-color:var(--danger);">🗑️ Delete</button>
      </div>
      <div class="hint" style="font-size:11px;">💡 Tap any card in your collection to view details or sell it back for 70% of estimated market value in virtual credits.</div>
    </div>

    ${!keys.length ? `<div class="empty-state">Collection "${activeName}" is empty — open your first pack to start collecting!</div>` : `<div class="collection-grid" id="coll-grid"></div>`}
  `;
  app.appendChild(wrap);

  $('#collection-select', wrap).addEventListener('change', (e) => {
    store.set('active_collection', e.target.value);
    render('collection');
  });

  $('#new-collection-btn', wrap).addEventListener('click', () => {
    const bName = prompt('Enter a name for the new collection:');
    if(!bName || !bName.trim()) return;
    const name = bName.trim();
    if(map[name]) { toast('Collection already exists'); return; }
    map[name] = {};
    store.set('user_collections', map);
    store.set('active_collection', name);
    render('collection');
    toast(`Created collection "${name}"`);
  });

  $('#rename-collection-btn', wrap).addEventListener('click', () => {
    if(Object.keys(map).length <= 1) { toast('Cannot rename your only collection'); return; }
    const newName = prompt(`Rename collection "${activeName}" to:`, activeName);
    if(!newName || !newName.trim() || newName.trim() === activeName) return;
    const trimmed = newName.trim();
    if(map[trimmed]) { toast('A collection with that name already exists'); return; }
    map[trimmed] = map[activeName];
    delete map[activeName];
    store.set('user_collections', map);
    store.set('active_collection', trimmed);
    render('collection');
    toast('Collection renamed successfully');
  });

  $('#clear-coll-btn', wrap).addEventListener('click', () => {
    if(!Object.keys(coll).length) { toast('Collection is already empty'); return; }
    if(!confirm(`Are you sure you want to clear all cards from collection "${activeName}"?`)) return;
    map[activeName] = {};
    store.set('user_collections', map);
    store.set('collection', {});
    render('collection');
    toast(`Cleared all cards from "${activeName}"`);
  });

  $('#delete-collection-btn', wrap).addEventListener('click', () => {
    if(Object.keys(map).length <= 1) { toast('Cannot delete your last remaining collection'); return; }
    if(!confirm(`Are you sure you want to permanently delete collection "${activeName}" and all its cards?`)) return;
    delete map[activeName];
    store.set('user_collections', map);
    store.set('active_collection', Object.keys(map)[0]);
    render('collection');
    toast('Collection permanently deleted');
  });

  $('#export-coll-btn', wrap).addEventListener('click', () => {
    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      collectionName: activeName,
      collection: coll
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${activeName.toLowerCase().replace(/\s+/g, '_')}_collection.pkcard`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    toast('Collection exported successfully (.pkcard)');
  });

  $('#import-coll-file', wrap).addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedColl = parsed.collection || parsed;
        const bName = parsed.collectionName || 'Imported Collection';
        let uniqueName = bName;
        let counter = 1;
        while(map[uniqueName]) {
          uniqueName = `${bName} (${counter++})`;
        }
        map[uniqueName] = importedColl;
        store.set('user_collections', map);
        store.set('active_collection', uniqueName);
        render('collection');
        toast(`Successfully imported collection "${uniqueName}"!`);
      } catch(err) {
        toast('Invalid file format. Could not import collection.');
      }
    };
    reader.readAsText(file);
  });

  if(keys.length){
    const grid = $('#coll-grid', wrap);
    keys.sort((a,b)=> classify(coll[b].rarity).id - classify(coll[a].rarity).id).forEach(id=>{
      const c = coll[id]; const item = el('div','coll-item');
      item.innerHTML = `<img src="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'140\'><rect width=\'100%\' height=\'100%\' fill=\'%231e293b\'/></svg>'"/><span class="count">×${c.count}</span>`;
      item.addEventListener('click', async ()=> showCardFullscreen(await ImgCache.get(c.image), { id, ...c }));
      grid.appendChild(item);
      ImgCache.get(c.image).then(src => {
        const imgEl = item.querySelector('img');
        if(imgEl && src) imgEl.src = src;
      });
    });
  }
}

/* ============================================================
   Trading Hub — coming soon
   Real trading requires collections to live server-side so there's
   an actual recipient to transfer to. Until that exists, this screen
   must not claim to send anything or remove cards from the sender.
   ============================================================ */
function renderTrade(){
  const wrap = el('div');
  wrap.innerHTML = `
    <div class="section-title">Direct Card Trade Hub</div>
    <div class="account-card" style="margin-bottom:16px;">
      <h3 style="margin-top:0; color:var(--cyan);">🤝 Trading — Coming Soon</h3>
      <p class="hint">Trading directly with other collectors isn't live yet. We're building it out so trades are real and secure. Check back soon!</p>
    </div>
  `;
  app.appendChild(wrap);
}

const SHARE_BONUS = 5000;
const SHARE_PLATFORMS = [
  { id:'x', label:'X (Twitter)', icon:'' },
  { id:'instagram', label:'Instagram', icon:'📸' },
  { id:'facebook', label:'Facebook', icon:'📘' },
  { id:'tiktok', label:'TikTok', icon:'🎵' },
];

function openShareIntent(platform){
  const text = 'Just pulled some awesome cards in Chase Cards! Come open packs with me 🔥';
  const link = location.origin + location.pathname;
  if(navigator.share){
    navigator.share({ title:'Chase Cards', text, url: link }).catch(()=>{});
    return;
  }
  const urls = {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(text)}`,
  };
  if(urls[platform]){
    window.open(urls[platform], '_blank', 'noopener');
  } else {
    navigator.clipboard?.writeText(`${text} ${link}`);
    toast('Link copied — paste it into your ' + platform + ' post');
    window.open(platform === 'instagram' ? 'https://www.instagram.com/' : 'https://www.tiktok.com/upload', '_blank', 'noopener');
  }
}

function getSharedPlatforms(){
  if(guestMode) return getGuestState().sharedPlatforms || [];
  return profile?.shared_platforms || [];
}

async function claimShareBonus(platform, btn){
  if(getSharedPlatforms().includes(platform)){ toast('Already claimed for this platform'); return; }

  openShareIntent(platform);

  const originalLabel = btn.textContent;
  btn.disabled = true; btn.textContent = '…';
  try{
    if(guestMode){
      const gs = getGuestState();
      gs.credits = (Number(gs.credits) || 0) + SHARE_BONUS;
      gs.sharedPlatforms = [...(gs.sharedPlatforms || []), platform];
      setGuestState(gs);
      const creditCountEl = $('#credit-count');
      if(creditCountEl) creditCountEl.textContent = gs.credits;
    } else {
      const { data: newBalance, error } = await sb.rpc('claim_share_bonus', { p_platform: platform });
      if(error) throw error;
      profile.credits = newBalance;
      profile.shared_platforms = [...(profile.shared_platforms || []), platform];
      const creditCountEl = $('#credit-count');
      if(creditCountEl) creditCountEl.textContent = newBalance;
    }
    SFX.coin();
    toast(`+${SHARE_BONUS.toLocaleString()} credits — thanks for sharing!`);
    btn.textContent = '✓ Claimed';
  }catch(e){
    console.error('claimShareBonus failed:', e);
    toast(e.message === 'already_claimed' ? 'Already claimed for this platform' : 'Could not claim bonus — try again');
    btn.disabled = false; btn.textContent = originalLabel;
  }
}

function shareSectionHTML(){
  const claimed = getSharedPlatforms();
  return `
    <div class="section-title" style="margin-top:0;">Share &amp; Earn</div>
    <div class="hint" style="margin-bottom:10px;">Share Chase Cards for +${SHARE_BONUS.toLocaleString()} credits each (once per platform).</div>
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:18px;">
      ${SHARE_PLATFORMS.map(p=>`
        <button class="btn btn-secondary share-btn" data-platform="${p.id}" style="flex:1; min-width:120px;" ${claimed.includes(p.id) ? 'disabled' : ''}>${claimed.includes(p.id) ? '✓ Claimed' : `${p.icon} ${p.label}`}</button>
      `).join('')}
    </div>
  `;
}

function openGetCreditsModal(lowBalance=false){
  if(!session && !guestMode){
    openAuthModal();
    return;
  }
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');

  if(guestMode){
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h2>${lowBalance ? 'Your free packs are used up' : 'Get more credits'}</h2>
      <div class="sub">Guest mode gets ${CONFIG.ECONOMY.GUEST_CREDITS.toLocaleString()} credits per device — sign in to unlock referrals and save your collection permanently.</div>
      <div class="bundle" style="flex-direction:column;align-items:stretch;gap:10px;">
        <div>
          <div class="amt">Log in or create an account</div>
          <p class="sub">Keeps your collection and unlocks referrals (+${CONFIG.ECONOMY.REFERRAL_BONUS.toLocaleString()} credits each).</p>
        </div>
        <button class="btn btn-primary" id="guest-signup-btn" style="width:100%;">Sign In / Sign Up</button>
      </div>
      ${shareSectionHTML()}
    `;
    overlay.appendChild(sheet); document.body.appendChild(overlay);
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
    $('#guest-signup-btn', sheet).addEventListener('click', ()=>{ overlay.remove(); exitGuestMode(); });
    sheet.querySelectorAll('.share-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> claimShareBonus(btn.dataset.platform, btn));
    });
    return;
  }

  const refLink = `${location.origin}${location.pathname}?ref=${profile?.referral_code || ''}`;
  const refBonus = profile?.is_premium ? CONFIG.ECONOMY.REFERRAL_BONUS*2 : CONFIG.ECONOMY.REFERRAL_BONUS;
  const currentTier = CONFIG.ECONOMY.PREMIUM_TIERS.find(t=>t.key===profile?.premium_tier);
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>${lowBalance ? 'Out of credits' : 'Get more credits'}</h2>
    <div class="sub">Refer a friend for free credits.</div>
    <div class="refer-box">
      <code id="ref-link">${refLink}</code>
      <button class="btn btn-secondary" id="copy-ref">Copy</button>
    </div>
    <div class="hint" style="margin-bottom:18px;">You both get +${refBonus.toLocaleString()} credits when they sign up.${profile?.is_premium ? ' (2× Premium bonus applied)' : ''}</div>
    ${shareSectionHTML()}
    ${profile?.is_premium ? `
    <div class="bundle" style="flex-direction:column;align-items:stretch;gap:8px; margin-top:12px;">
      <div>
        <div class="amt"${currentTier?.key==='vip' ? ' style="color:var(--vip-gold);"' : ' style="color:var(--gold);"'}>${currentTier?.key==='vip' ? '👑 ' : ''}${currentTier?.label || 'Premium'} status</div>
        <p class="sub">Granted by the site admin.</p>
      </div>
    </div>` : ''}
  `;
  overlay.appendChild(sheet); document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
  sheet.querySelectorAll('.share-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> claimShareBonus(btn.dataset.platform, btn));
  });
  $('#copy-ref', sheet).addEventListener('click', ()=>{
    navigator.clipboard?.writeText(refLink); SFX.coin(); toast('Referral link copied');
  });
}

/* ============================================================
   Boot
   ============================================================ */
initAuth();
