/* ============================================================
   CONFIG — fill these in with your own project values.
   ============================================================ */
const CONFIG = {
  SUPABASE_URL: 'https://mdtpdqwxegmseidxnnvb.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdHBkcXd4ZWdtc2VpZHhubnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMTEzMzEsImV4cCI6MjEwMTg4NzMzMX0.ZWkYKmt6N7-0jqwEMB4Zn9H1BDUvGPZb1EsEAS7VRBI',
  APP_URL: 'https://chasecards.netlify.app/',
  CHECKOUT_ENDPOINT: 'https://YOUR-PROJECT.supabase.co/functions/v1/create-checkout-session',
  SUBSCRIBE_ENDPOINT: 'https://YOUR-PROJECT.supabase.co/functions/v1/create-subscription-checkout',
  BILLING_PORTAL_ENDPOINT: 'https://YOUR-PROJECT.supabase.co/functions/v1/create-billing-portal-session',
  
  ECONOMY: {
    STARTING_CREDITS: 500,
    GUEST_CREDITS: 450*5,
    REFERRAL_BONUS: 250,
    PREMIUM_TIERS: [
      { key:'starter', label:'Starter', price:'$3.49/mo', dailyCredits:3500  },
      { key:'plus',    label:'Plus',    price:'$6.99/mo', dailyCredits:10000 },
      { key:'pro',     label:'Pro',     price:'$13.99/mo', dailyCredits:20000 },
      { key:'elite',   label:'Elite',   price:'$24.49/mo', dailyCredits:33500 },
      { key:'vip',     label:'VIP',     price:'$99.99/mo', unlimited:true    },
    ],
  },
};

/* ============================================================
   Dynamic Styles Injection (Includes Loading Bar & Adjustments)
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
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove('show'), ms);
}
function vibrate(pattern){ if(navigator.vibrate) try{navigator.vibrate(pattern);}catch(e){} }
const store = {
  get(k, fallback=null){ try{ return JSON.parse(localStorage.getItem(k)) ?? fallback; }catch(e){ return fallback; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
};

function buyLink(card){
  const q = encodeURIComponent(`${card.name} ${card.set?.name || ''}`.trim());
  return `<a class="buy-card-btn" href="https://www.tcgplayer.com/search/pokemon/product?q=${q}" target="_blank" rel="noopener sponsored">🛒 Buy this card</a>`;
}

function showCardFullscreen(imgSrc, cardObj){
  const overlay = el('div','overlay');
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '300';
  overlay.innerHTML = `
      <div style="position:relative; width:90%; max-width:400px; perspective:1200px; display:flex; flex-direction:column; align-items:center;">
          <img src="${imgSrc}" style="width:100%; border-radius:18px; box-shadow:0 30px 60px rgba(0,0,0,0.8); animation: zoomIn 0.3s cubic-bezier(0.2,0.8,0.2,1); object-fit:contain; max-height:75vh;"/>
          ${cardObj ? `<div style="text-align:center; margin-top:20px; animation: slideup 0.3s ease;">${buyLink(cardObj)}</div>` : ''}
      </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
}

/* ============================================================
   Image Caching System (Everything/Every Image Cached)
   ============================================================ */
const ImgCache = {
  blobUrls: {},
  async get(url) {
    if (!url) return '';
    if (this.blobUrls[url]) return this.blobUrls[url];
    
    showLoader();
    try {
      if ('caches' in window) {
        const cache = await caches.open('packpull-images-v2-comprehensive');
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
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { this.blobUrls[url] = url; resolve(url); };
      img.onerror = () => reject(new Error('Image missing'));
      img.src = url;
    });
  },
  sync(url) { return this.blobUrls[url] || url; }
};

/* ============================================================
   Sound design & Confetti
   ============================================================ */
const SFX = { flip(){}, common(){}, uncommon(){}, holo(){}, hit(){}, chase(){}, coin(){}, tear(){} };

const confettiCanvas = $('#confetti'); const cctx = confettiCanvas.getContext('2d');
function resizeConfetti(){ confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight; }
addEventListener('resize', resizeConfetti); resizeConfetti();
let particles = [];
function burstConfetti(count=60, colors=['#4de8e0','#e84dc0','#f0b94d','#ffffff']){
  const cx = innerWidth/2, cy = innerHeight*0.4;
  for(let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2, speed = 3+Math.random()*7;
    particles.push({ x:cx, y:cy, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed-3, life:1, size:4+Math.random()*4, color:colors[i%colors.length], rot:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.3 });
  }
  if(!burstConfetti._running){ burstConfetti._running = true; requestAnimationFrame(tickConfetti); }
}
function tickConfetti(){
  cctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
  particles.forEach(p=>{ p.vy += 0.15; p.x += p.vx; p.y += p.vy; p.life -= 0.012; p.rot += p.vr;
    cctx.save(); cctx.globalAlpha = Math.max(p.life,0); cctx.translate(p.x,p.y); cctx.rotate(p.rot);
    cctx.fillStyle = p.color; cctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6); cctx.restore();
  });
  particles = particles.filter(p=>p.life>0 && p.y < innerHeight+50);
  if(particles.length){ requestAnimationFrame(tickConfetti); } else { burstConfetti._running=false; }
}

/* ============================================================
   TCGdex API & Dynamic Pack Pricing Formula
   ============================================================ */
const TCG_BASE = 'https://api.tcgdex.net/v2/en';
async function tcgFetch(path, attempt=1){
  showLoader();
  const ctrl = new AbortController();
  const timeout = setTimeout(()=>ctrl.abort(), 10000);
  try{
    const res = await fetch(TCG_BASE + path, { signal: ctrl.signal });
    if(!res.ok){
      const err = new Error('TCGdex API error ' + res.status);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }catch(e){
    if(attempt < 3 && (e.name==='AbortError' || e.status>=500 || !e.status)){
      await new Promise(r=>setTimeout(r, attempt*1000));
      return tcgFetch(path, attempt+1);
    }
    throw e;
  }finally{ 
    clearTimeout(timeout); 
    hideLoader();
  }
}
function tcgAssetUrl(base, quality, ext){ return `${base}/${quality}.${ext}`; }

let globalSortedSets = [];

function calculatePackCost(index, totalSets) {
  if (totalSets <= 1) return 150;
  const minCost = 50;
  const maxCost = 300;
  // index 0 is oldest, totalSets - 1 is newest
  // Oldest sets = most expensive (300), newest sets = cheapest (50)
  const ratio = index / (totalSets - 1);
  const cost = maxCost - ratio * (maxCost - minCost);
  return Math.round(cost / 5) * 5; // rounded to nearest 5 credits
}

async function getSets(){
  const cached = store.get('cache_sets');
  if(cached && Date.now() - cached.t < 1000*60*60*12) {
    globalSortedSets = cached.data;
    return cached.data;
  }
  try{
    const raw = await tcgFetch('/sets');
    let data = raw
      .filter(s => s.cardCount?.total > 0)
      .sort((a,b)=> (a.id > b.id ? 1 : -1)) // Sorted oldest to newest
      .map(s => ({
        id: s.id, name: s.name, series: s.serie?.name || '',
        total: s.cardCount?.total || s.cardCount?.official || 0,
        images: { symbol: s.symbol ? s.symbol + '.png' : '', logo: s.logo ? s.logo + '.png' : '' },
      }));
    
    const totalCount = data.length;
    data = data.map((s, idx) => ({
      ...s,
      packCost: calculatePackCost(idx, totalCount)
    }));

    globalSortedSets = data;
    store.set('cache_sets', { t: Date.now(), data });
    return data;
  }catch(e){
    if(cached){ toast('Showing cached sets — live data unavailable'); globalSortedSets = cached.data; return cached.data; }
    throw e;
  }
}

async function mapWithConcurrency(items, limit, fn){
  const results = new Array(items.length);
  let i = 0;
  async function worker(){
    while(i < items.length){
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
  return results;
}

async function getCardsForSet(setId){
  const key = 'cache_cards_' + setId;
  const cached = store.get(key);
  if(cached && Date.now() - cached.t < 1000*60*60*24*7) return cached.data;
  try{
    const setData = await tcgFetch(`/sets/${setId}`);
    const briefCards = setData.cards || [];
    const fullCards = await mapWithConcurrency(briefCards, 12, async (bc)=>{
      try{ return await tcgFetch(`/cards/${bc.id}`); }
      catch(e){ return null; }
    });
    const data = fullCards.filter(Boolean).map(c => ({
      id: c.id, name: c.name, rarity: c.rarity,
      images: {
        small: c.image ? tcgAssetUrl(c.image, 'low', 'webp') : '',
        large: c.image ? tcgAssetUrl(c.image, 'high', 'webp') : '',
      },
      set: { name: c.set?.name || setData.name },
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
let session = null, profile = null, guestMode = false;

function getGuestState(){ return store.get('guest_state', { credits: null, usedFreePack: false }); }
function setGuestState(s){ store.set('guest_state', s); }

function startGuestSession(redirect=true){
  guestMode = true;
  let s = getGuestState();
  if(s.credits === null){ s = { credits: CONFIG.ECONOMY.GUEST_CREDITS, usedFreePack: false }; setGuestState(s); }
  if(redirect) render('home');
  else render(route.name, route.params); 
}
function exitGuestMode(){ guestMode = false; openAuthModal(); }
function currentCredits(){ return guestMode ? (getGuestState().credits ?? 0) : (profile?.credits ?? 0); }

async function initAuth(){
  const { data } = await sb.auth.getSession();
  session = data.session;
  sb.auth.onAuthStateChange((_evt, s)=>{ 
    session = s; 
    if(s){ guestMode = false; onLoggedIn(); } 
    else { profile = null; render('home'); } 
  });
  if(session) await onLoggedIn(); else { guestMode = false; render('home'); }
}
async function onLoggedIn(){
  await loadProfile();
  const pendingRef = store.get('pending_ref');
  if(pendingRef && profile){
    try{ await sb.rpc('redeem_referral', { p_code: pendingRef }); store.set('pending_ref', null); await loadProfile(); toast('Referral bonus applied — +' + CONFIG.ECONOMY.REFERRAL_BONUS + ' credits'); }
    catch(e){ store.set('pending_ref', null); }
  }
  render('home');
}
async function loadProfile(){
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if(!error) profile = data;
}

(function captureRef(){
  const p = new URLSearchParams(location.search);
  if(p.get('ref')) store.set('pending_ref', p.get('ref'));
})();

/* ============================================================
   Views
   ============================================================ */
const app = $('#app');
let route = { name:'home' };

function render(name, params={}){
  route = { name, params };
  app.innerHTML = '';
  app.appendChild(renderTopbar());
  
  if(name==='home') renderHome();
  if(name==='set') renderSetDetail(params.set);
  if(name==='collection') renderCollection();
  if(name==='search') renderSearch();
  if(name==='profile') renderProfile();
  if(name==='user_collection') renderUserCollection(params.userId, params.username);
  
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
      <div class="sub">Choose how you'd like to log in or sign up.</div>
      
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
          <button class="btn btn-secondary" type="button" id="google-auth-btn" style="display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <button class="btn btn-secondary" type="button" id="passkey-auth-btn" style="display:flex; align-items:center; justify-content:center; gap:8px;">
            👤 Continue with Passkey / Face ID
          </button>
          <button class="btn btn-secondary" type="button" id="email-view-btn" style="display:flex; align-items:center; justify-content:center; gap:8px;">
            ✉️ Continue with Email & Password
          </button>
      </div>

      <div class="hint" id="auth-error-msg" style="color:#ff6b6b; text-align:center; min-height:14px; margin-top:4px;"></div>

      <div style="height:1px; background:var(--edge); margin:20px 0;"></div>
      <button class="btn btn-secondary" type="button" id="modal-guest-btn" style="width:100%;">Continue as guest</button>
      <div class="hint" style="margin-top:8px;text-align:center;">Guests get up to 5 free packs on this device.</div>
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

    $('#passkey-auth-btn', sheet).addEventListener('click', async () => {
      errBox.style.color = 'var(--text)'; errBox.textContent = 'Waiting for Passkey...';
      try {
          const { error } = await sb.auth.signInWithWebAuthn();
          if (error) throw error;
          overlay.remove();
      } catch (err) {
          errBox.style.color = '#ff6b6b';
          errBox.textContent = 'Passkey login failed or canceled.';
      }
    });

    $('#email-view-btn', sheet).addEventListener('click', renderEmailView);

    $('#modal-guest-btn', sheet).addEventListener('click', ()=>{
      overlay.remove();
      startGuestSession(false);
      if(resumeSetMeta) beginOpen(resumeSetMeta); 
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
    <div class="brand"><span class="dot"></span>PackPull${guestMode ? ' <span style="font-size:10px;color:var(--dim-2);font-weight:700;letter-spacing:.08em;background:var(--panel);border:1px solid var(--edge);padding:2px 7px;border-radius:999px;margin-left:6px;">GUEST</span>' : ''}${isVip() ? '<span class="vip-badge">👑 VIP</span>' : ''}${authBtn}</div>
    <button class="credits-pill tappable" id="credits-btn"><span class="coin"></span><span id="credit-count">${isVip() ? '∞' : currentCredits()}</span></button>
  `;
  
  if(session) {
      bar.querySelector('#logout-btn').addEventListener('click', async ()=> {
          await sb.auth.signOut();
          guestMode = false;
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
    { key:'collection', label:'Collection', icon:'M4 6h16M4 12h16M4 18h16' },
    { key:'search', label:'Search', icon:'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
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
  
  if (profile?.is_admin) {
      return { label: '🛠️ System Admin', cssClass: 'badge-vip' };
  }
  
  const tier = (profile?.premium_tier || 'free').toLowerCase();

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
  const accountHtml = `
    <div class="account-card">
      <div class="account-header">
        <h3>${user ? user.email : 'Guest Session'}</h3>
        <span class="account-badge ${badge.cssClass}">${badge.label}</span>
      </div>
      <div class="account-details">
        <p><strong>Credits:</strong> ${userProfile?.credits?.toLocaleString() || 0}</p>
        <p><strong>Status:</strong> ${userProfile?.is_premium ? 'Active Subscription' : 'Standard'}</p>
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
      
      <!-- Secure Admin Panel with Grant & Demote Controls -->
      <div id="admin-panel" style="display:none; margin-top:30px; padding:18px; background:var(--panel-2); border:1px solid var(--vip-gold-dim); border-radius:14px; box-shadow: 0 4px 15px rgba(255, 233, 184, 0.1);">
         <h3 style="color:var(--vip-gold); margin-top:0; font-family:var(--font-display); font-size:18px;">🛠️ Admin Controls</h3>
         <p class="hint" style="margin-bottom:14px;">Manage free VIP promotions or demote users by their exact account email.</p>
         <input type="email" id="admin-target-email" placeholder="user@email.com" style="width:100%; padding:14px 16px; border-radius:12px; border:1px solid var(--edge); background:var(--panel); color:var(--text); margin-bottom:12px; font-family:var(--font-body);" />
         <div style="display:flex; gap:8px;">
             <button class="btn btn-vip" id="admin-grant-btn" style="flex:1;">Grant VIP Status</button>
             <button class="btn btn-secondary" id="admin-demote-btn" style="flex:1; border-color:var(--danger); color:var(--danger);">Demote to Free</button>
         </div>
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
  
  setTimeout(() => {
    renderAccountArea(session?.user, profile);
    if (session && profile?.is_admin) {
        const adminPanel = $('#admin-panel', wrap);
        const grantBtn = $('#admin-grant-btn', wrap);
        const demoteBtn = $('#admin-demote-btn', wrap);
        const targetInput = $('#admin-target-email', wrap);
        const msgBox = $('#admin-msg', wrap);
        
        if (adminPanel) adminPanel.style.display = 'block';
        
        if (grantBtn) {
            grantBtn.addEventListener('click', async () => {
                const targetEmail = targetInput.value.trim();
                if(!targetEmail) {
                    msgBox.style.color = 'var(--danger)';
                    msgBox.textContent = 'Enter an email first.';
                    return;
                }
                grantBtn.disabled = true; grantBtn.textContent = 'Granting...';
                try {
                    const { error } = await sb.rpc('admin_grant_vip', { target_email: targetEmail });
                    if(error) throw error;
                    msgBox.style.color = 'var(--cyan)';
                    msgBox.textContent = 'Success! User is now a VIP.';
                    targetInput.value = '';
                } catch(e) {
                    msgBox.style.color = 'var(--danger)';
                    msgBox.textContent = e.message;
                }
                grantBtn.disabled = false; grantBtn.textContent = 'Grant VIP Status';
            });
        }

        if (demoteBtn) {
            demoteBtn.addEventListener('click', async () => {
                const targetEmail = targetInput.value.trim();
                if(!targetEmail) {
                    msgBox.style.color = 'var(--danger)';
                    msgBox.textContent = 'Enter an email first.';
                    return;
                }
                demoteBtn.disabled = true; demoteBtn.textContent = 'Demoting...';
                try {
                    const { error } = await sb.rpc('admin_demote_vip', { target_email: targetEmail });
                    if(error) throw error;
                    msgBox.style.color = 'var(--cyan)';
                    msgBox.textContent = 'Success! User has been demoted to free.';
                    targetInput.value = '';
                } catch(e) {
                    msgBox.style.color = 'var(--danger)';
                    msgBox.textContent = e.message;
                }
                demoteBtn.disabled = false; demoteBtn.textContent = 'Demote to Free';
            });
        }
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
              <img src="${item.card_image || ''}" style="width:44px; height:62px; object-fit:cover; border-radius:4px; margin-right:12px;" />
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
          item.innerHTML = `<img src="${c.image}"/><span class="count">×${c.count}</span>`;
          item.addEventListener('click', async ()=> showCardFullscreen(await ImgCache.get(c.image), c));
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

function renderPremiumBanner(claimedToday){
  const tier = CONFIG.ECONOMY.PREMIUM_TIERS.find(t=>t.key===profile?.premium_tier);
  if(tier?.unlimited){
    const box = el('div');
    box.className = 'vip-banner';
    box.innerHTML = `
      <div class="vip-shimmer"></div>
      <div style="position:relative;">
        <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--vip-gold);letter-spacing:0.5px;">👑 VIP MEMBER</div>
        <div style="font-size:12.5px;color:var(--vip-gold-dim);">Unlimited packs — always. Welcome back.</div>
      </div>
    `;
    return box;
  }
  const dailyAmt = tier?.dailyCredits || 0;
  const box = el('div');
  box.style.cssText = 'background:linear-gradient(135deg,rgba(240,185,77,0.14),rgba(240,185,77,0.04)); border:1px solid var(--gold); border-radius:14px; padding:14px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:4px;';
  box.innerHTML = `
    <div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--gold);">${tier?.label || 'Premium'}</div>
      <div style="font-size:12.5px;color:var(--dim);">${claimedToday ? 'Come back tomorrow for more credits' : `${dailyAmt.toLocaleString()} credits ready to claim`}</div>
    </div>
    <button class="btn btn-gold" id="claim-daily-btn" ${claimedToday?'disabled':''}>${claimedToday ? 'Claimed ✓' : 'Claim'}</button>
  `;
  const btn = box.querySelector('#claim-daily-btn');
  if(!claimedToday){
    btn.addEventListener('click', async ()=>{
      btn.disabled = true; btn.textContent = '…';
      try{
        const { data, error } = await sb.rpc('claim_daily_credits');
        if(error) throw error;
        profile.credits = data; profile.last_daily_grant = new Date().toISOString().slice(0,10);
        $('#credit-count').textContent = data;
        btn.textContent = 'Claimed ✓'; SFX.coin(); toast(`+${dailyAmt.toLocaleString()} credits`);
      }catch(e){ btn.disabled=false; btn.textContent='Claim'; toast('Already claimed today'); }
    });
  }
  return box;
}

async function renderHome(){
  const setsWrap = el('div');
  if(!guestMode && profile?.is_premium){
    const claimedToday = profile.last_daily_grant === new Date().toISOString().slice(0,10);
    setsWrap.appendChild(renderPremiumBanner(claimedToday));
  }
  setsWrap.appendChild(el('div','section-title','Choose a booster (Oldest → Newest)'));
  const gridHolder = el('div'); gridHolder.innerHTML = `<div class="set-grid" id="set-grid"></div>`;
  setsWrap.appendChild(gridHolder.firstChild);
  
  const footer = el('div','hint');
  footer.style.cssText = 'text-align:center; padding: 24px 12px; font-size: 11px; opacity: 0.6; line-height: 1.4;';
  footer.innerHTML = 'Not affiliated with, sponsored, or endorsed by Nintendo, Creatures Inc., or GAME FREAK. Pokémon and Pokémon character names are trademarks of Nintendo. For entertainment purposes only.';
  setsWrap.appendChild(footer);
  
  app.appendChild(setsWrap);
  const grid = $('#set-grid');
  for(let i=0;i<6;i++){ const s = el('div','set-card skeleton'); s.style.height='96px'; grid.appendChild(s); }
  try{
    const sets = await getSets();
    grid.innerHTML = '';
    sets.forEach(s=>{
      const card = el('div','set-card');
      card.innerHTML = `<img src="" alt=""/><div class="name">${s.name}</div><div class="meta">${s.series} · ${s.packCost} cr</div>`;
      card.addEventListener('click', ()=> render('set', { set: s }));
      grid.appendChild(card);
      ImgCache.get(s.images.symbol).then(src => card.querySelector('img').src = src);
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
  
  wrap.innerHTML = `
    <div class="pack-hero">
      <img class="logo" id="hero-logo" src="" alt=""/>
      
      <div id="pack-gallery-wrap" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
          <div class="pack-gallery single" id="pack-gallery">
            <div class="pack-art is-fallback active" id="skeleton-art">
              <div class="pack-art-bg skeleton"></div>
              <div class="pack-crimp top fallback-only"></div>
              <div class="pack-crimp bottom fallback-only"></div>
              <img class="pack-art-logo fallback-only" id="pack-art-logo" src=""/>
            </div>
          </div>
      </div>

      <div class="pack-count">10 cards per pack · ${setMeta.total} cards in ${setMeta.name}</div>
      <button class="btn btn-primary" id="open-pack-btn" style="width:100%;">${isVip() ? 'Open pack — Unlimited (VIP)' : `Open pack — ${dynamicCost} credits`}</button>
      <div class="odds-box">
        <div class="row"><span>Structure</span><b>4 common · 3 uncommon · 1 reverse holo · 2 hit slots</b></div>
        <div class="row"><span>Hit-slot odds</span><b>modeled on SV-era community data</b></div>
        <div class="row"><span>God pack chance</span><b>1 in 600</b></div>
      </div>
    </div>
  `;
  app.appendChild(wrap);
  $('#open-pack-btn').addEventListener('click', ()=> beginOpen(setMeta, dynamicCost));
  
  ImgCache.get(setMeta.images.logo).then(src => {
    $('#hero-logo').src = src; 
    const fal = $('#pack-art-logo', wrap);
    if(fal) fal.src = src;
  });

  try{
    const cards = await getCardsForSet(setMeta.id);
    setDetailCardsCache = cards; setDetailCardsCacheSetId = setMeta.id;
    
    const gallery = $('#pack-gallery', wrap);
    const idLower = setMeta.id.toLowerCase();
    const tcgdexBase = setMeta.images.logo ? setMeta.images.logo.replace(/\/(logo|symbol)\.png$/, '') : '';
    
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

    if (rawUrls.length === 0) {
      rawUrls = [
        `https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/${idLower}/packshots/1.png`,
        `https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/${idLower}/packshots/1.jpg`,
        tcgdexBase ? `${tcgdexBase}/pack/high.webp` : null
      ].filter(Boolean);
    }

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
        pa.innerHTML = `<div class="pack-art-bg"></div><div class="pack-crimp top fallback-only"></div><div class="pack-crimp bottom fallback-only"></div><img class="pack-art-logo fallback-only" id="pack-art-logo" src="${ImgCache.sync(setMeta.images.logo)}"/>`;
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

    const hits = cards.filter(c => classify(c.rarity).id >= 4);
    const feature = hits.length ? hits[Math.floor(Math.random()*hits.length)] : cards[0];
    if(feature?.images?.large){ ImgCache.get(feature.images.large); }

  }catch(e){ }
}

let setDetailCardsCache = null, setDetailCardsCacheSetId = null;

function isVip(){ 
  if (profile?.is_admin) return true;
  return !guestMode && profile?.premium_tier === 'vip'; 
}

async function beginOpen(setMeta, packCost){
  if(!session && !guestMode) {
      openAuthModal(setMeta);
      return;
  }

  if(!isVip() && currentCredits() < packCost){ return openGetCreditsModal(true); }
  const btn = $('#open-pack-btn'); btn.disabled = true; btn.textContent = 'Loading cards…';
  try{
    const cards = (setDetailCardsCacheSetId === setMeta.id && setDetailCardsCache) || await getCardsForSet(setMeta.id);

    if(isVip()){
    } else if(guestMode){
      const gs = getGuestState(); gs.credits -= packCost; gs.usedFreePack = true;
      setGuestState(gs); $('#credit-count').textContent = gs.credits;
    } else {
      const { data: newBalance, error } = await sb.rpc('spend_credits', { p_amount: packCost });
      if(error) throw error;
      profile.credits = newBalance; $('#credit-count').textContent = newBalance;
    }

    const pack = generatePack(cards);
    btn.textContent = 'Caching pack assets...';
    
    const urlsToPrefetch = [setMeta.images.logo];
    if(setMeta.resolvedPackArt) urlsToPrefetch.push(setMeta.resolvedPackArt);
    if(setMeta.images.symbol) urlsToPrefetch.push(setMeta.images.symbol);
    
    pack.cards.forEach(p => {
      urlsToPrefetch.push(p.card.images.large || p.card.images.small);
      urlsToPrefetch.push(p.card.images.small);
    });
    
    const hits = cards.filter(c => classify(c.rarity).id >= 4);
    const feature = hits.length ? hits[Math.floor(Math.random()*hits.length)] : cards[0];
    const bgUrl = feature?.images?.large;
    if (bgUrl) urlsToPrefetch.push(bgUrl);
    
    await Promise.all(urlsToPrefetch.map(url => ImgCache.get(url).catch(()=>null)));
    
    if(!guestMode){
      await sb.from('openings').insert({ user_id: session.user.id, set_id: setMeta.id, set_name: setMeta.name, cards: pack.cards.map(p=>({id:p.card.id,name:p.card.name,rarity:p.card.rarity,image:p.card.images.small})), cost: packCost });
    }
    persistToCollection(pack.cards);
    openRevealScreen(setMeta, pack, bgUrl);
  }catch(e){
    toast(e.message==='insufficient_credits' ? 'Not enough credits' : 'Something went wrong — try again');
  }finally{ btn.disabled=false; btn.textContent = isVip() ? 'Open pack — Unlimited (VIP)' : `Open pack — ${packCost} credits`; }
}

function persistToCollection(packCards){
  const coll = store.get('collection', {});
  packCards.forEach(p=>{
    const c = p.card;
    coll[c.id] = coll[c.id] || { name:c.name, image:c.images.small, rarity:c.rarity, count:0 };
    coll[c.id].count++;
  });
  store.set('collection', coll);
}

function openRevealScreen(setMeta, pack, bgUrl){
  const collection = store.get('collection', {});
  const screen = el('div','reveal-screen');
  let idx = 0; let bestTier = 0;
  screen.innerHTML = `
    <div class="reveal-header">
      <div class="reveal-progress" id="prog">Card 1 / ${pack.cards.length}</div>
      <button class="close-x" id="close-reveal">✕</button>
    </div>
    <div class="stage"><div class="flipcard" id="flipcard">
      <div class="face back"></div>
      <div class="face front"><img id="front-img" src="" alt=""/><div class="foil-layer" id="foil"></div><div class="tier-badge" id="tier-badge"></div></div>
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
    <div class="pack-art ${setMeta.resolvedPackArt ? '' : 'is-fallback'}" style="margin:0; animation:packshake 1.1s ease-in-out;">
      <div class="pack-art-bg" style="${authenticPackBg ? `background-image:${authenticPackBg}; background-size: 100% 100%;` : ''}"></div>
      <div class="pack-crimp top fallback-only"></div>
      <div class="pack-crimp bottom fallback-only"></div>
      <img class="pack-art-logo fallback-only" src="${ImgCache.sync(setMeta.images.logo)}"/>
    </div>
  `;
  
  document.body.appendChild(intro);
  SFX.tear();
  vibrate([15,30,15]);
  setTimeout(()=>{ 
    const packArtEl = intro.querySelector('.pack-art');
    if(packArtEl) packArtEl.style.animation = 'packrip 0.5s ease-out forwards';
    setTimeout(()=>{
      intro.remove(); document.body.appendChild(screen); boot();
    }, 450);
  }, 620);

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
      const flip = $('#flipcard', screen); flip.classList.remove('flipped','rare-fx');
      if(tier.id >= 3) flip.classList.add('rare-fx');
      if(!guestMode && profile?.is_premium) flip.classList.add(isVip() ? 'vip-fx' : 'premium-fx');
      $('#tap-hint', screen).textContent = 'Tap the card to flip it';
      flip.dataset.done = '0';
    }
    function markDot(i, tier){
      const dot = dotsWrap.children[i]; dot.classList.add('done'); if(tier>=4) dot.classList.add('hit');
    }
    function foilTilt(e){
      const flip = $('#flipcard', screen); if(!flip.classList.contains('rare-fx')) return;
      const rect = flip.getBoundingClientRect();
      const cx = (e.touches?e.touches[0].clientX:e.clientX) - rect.left, cy = (e.touches?e.touches[0].clientY:e.clientY) - rect.top;
      const ang = Math.atan2(cy-rect.height/2, cx-rect.width/2) * 180/Math.PI;
      $('#foil', screen).style.setProperty('--ang', ang+'deg');
    }
    screen.addEventListener('pointermove', foilTilt);
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
        $('#buy-slot', screen).innerHTML = buyLink(cardObj);
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
    mini.innerHTML = `<img src="${ImgCache.sync(p.card.images.small)}"/>`;
    mini.addEventListener('click', ()=> showCardFullscreen(ImgCache.sync(p.card.images.large || p.card.images.small), p.card));
    grid.appendChild(mini);
  });
  $('#sum-close', sheet).addEventListener('click', ()=>{ overlay.remove(); render('home'); });
}

function renderCollection(){
  const coll = store.get('collection', {});
  const keys = Object.keys(coll);
  const wrap = el('div');
  if(!keys.length){
    wrap.innerHTML = `<div class="section-title">Collection</div><div class="empty-state">No cards yet — open your first pack to start your binder.</div>`;
  } else {
    wrap.innerHTML = `<div class="section-title">Collection · ${keys.length} unique cards</div><div class="collection-grid" id="coll-grid"></div>`;
  }
  app.appendChild(wrap);
  if(keys.length){
    const grid = $('#coll-grid');
    keys.sort((a,b)=> classify(coll[b].rarity).id - classify(coll[a].rarity).id).forEach(id=>{
      const c = coll[id]; const item = el('div','coll-item');
      item.innerHTML = `<img src=""/><span class="count">×${c.count}</span>`;
      item.addEventListener('click', async ()=> showCardFullscreen(await ImgCache.get(c.image), c));
      grid.appendChild(item);
      ImgCache.get(c.image).then(src => item.querySelector('img').src = src);
    });
  }
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
      <div class="sub">Guest mode gets up to 5 free packs per device — sign in to unlock referrals and save your collection permanently.</div>
      <div class="bundle" style="flex-direction:column;align-items:stretch;gap:10px;">
        <div>
          <div class="amt">Log in or create an account</div>
          <p class="sub">Keeps your collection and unlocks referrals (+${CONFIG.ECONOMY.REFERRAL_BONUS} credits each).</p>
        </div>
        <button class="btn btn-primary" id="guest-signup-btn" style="width:100%;">Sign In / Sign Up</button>
      </div>
    `;
    overlay.appendChild(sheet); document.body.appendChild(overlay);
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
    $('#guest-signup-btn', sheet).addEventListener('click', ()=>{ overlay.remove(); exitGuestMode(); });
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
    <div class="hint" style="margin-bottom:18px;">You both get +${refBonus} credits when they sign up.${profile?.is_premium ? ' (2× Premium bonus applied)' : ''}</div>
    ${!profile?.is_premium ? `
    <div class="section-title" style="margin-top:0;">Premium — daily credits</div>
    ${CONFIG.ECONOMY.PREMIUM_TIERS.map(t=>`
      <div class="bundle${t.key==='vip' ? ' vip-bundle' : ''}">
        <div>
          <div class="amt"${t.key==='vip' ? ' style="color:var(--vip-gold);"' : ''}>${t.key==='vip' ? '👑 ' : ''}${t.label}</div>
          <p class="sub">${t.unlimited ? 'Unlimited packs, every day' : `${t.dailyCredits.toLocaleString()} credits/day`} · ${t.price}</p>
        </div>
        <button class="btn ${t.key==='vip' ? 'btn-vip' : 'btn-gold'}" data-tier="${t.key}">Subscribe</button>
      </div>
    `).join('')}
    <div class="hint">Cancel anytime. 2× referral bonus and gold foil included at every tier — VIP adds unlimited packs and the full luxury treatment.</div>` : `
    <div class="bundle" style="flex-direction:column;align-items:stretch;gap:8px;">
      <div>
        <div class="amt"${currentTier?.key==='vip' ? ' style="color:var(--vip-gold);"' : ' style="color:var(--gold);"'}>${currentTier?.key==='vip' ? '👑 ' : ''}${currentTier?.label || 'Premium'} active</div>
        <p class="sub">Manage or cancel your subscription anytime.</p>
      </div>
      <button class="btn btn-secondary" id="manage-billing-btn">Manage subscription</button>
    </div>`}
  `;
  overlay.appendChild(sheet); document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
  $('#copy-ref', sheet).addEventListener('click', ()=>{
    navigator.clipboard?.writeText(refLink); SFX.coin(); toast('Referral link copied');
  });
  sheet.querySelectorAll('[data-tier]').forEach(btn=>{
    btn.addEventListener('click', ()=> startSubscriptionCheckout(btn.dataset.tier, btn));
  });
  $('#manage-billing-btn', sheet)?.addEventListener('click', async (e)=>{
    const btn = e.target; const original = btn.textContent; btn.disabled = true; btn.textContent = '…';
    try{
      const res = await fetch(CONFIG.BILLING_PORTAL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      if(!res.ok) throw new Error('portal_failed');
      const { url } = await res.json();
      if(!url) throw new Error('portal_failed');
      location.href = url;
    }catch(e){ btn.disabled=false; btn.textContent=original; toast('Billing portal not set up yet'); }
  });
}

async function startSubscriptionCheckout(tierKey, btn){
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = '…';
  try{
    const res = await fetch(CONFIG.SUBSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ tier: tierKey }),
    });
    if(!res.ok) throw new Error('checkout_failed');
    const { url } = await res.json();
    if(!url) throw new Error('checkout_failed');
    location.href = url;
  }catch(e){
    btn.disabled = false; btn.textContent = original;
    toast('Subscriptions aren\'t live yet — coming soon');
  }
}

async function startCheckout(bundleKey, btn){
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = '…';
  try{
    const res = await fetch(CONFIG.CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bundle: bundleKey }),
    });
    if(!res.ok) throw new Error('checkout_failed');
    const { url } = await res.json();
    if(!url) throw new Error('checkout_failed');
    location.href = url; 
  }catch(e){
    btn.disabled = false; btn.textContent = original;
    toast('Could not start checkout — try again');
  }
}

/* ============================================================
   Boot
   ============================================================ */
initAuth();
