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
  // Free key from https://dev.pokemontcg.io — unauthenticated requests share a
  // tiny rate limit and are the main cause of intermittent 500s / failed
  // fetches on the set & card endpoints. Get a key (takes ~1 min, no cost)
  // and paste it here to fix that.
  POKEMON_TCG_API_KEY: 'b1902dec-c387-4d44-b8f1-ac6205687cdc',
  // PokéWallet (api.pokewallet.io) — used as a Japanese-art-specific
  // fallback below. By default it serves each card's *original* regional
  // artwork (Japanese for Japanese sets), which is what TCGdex is often
  // missing entirely for Japan-only sets. Free tier: 100 req/hour, 1,000/day
  // — spent carefully; see the PokéWallet section below for how.
  POKEWALLET_API_KEY: 'pk_live_66aa02f9fbab0e5e98972538a417e4dd1192bd54d9956bbd',

  ECONOMY: {
    STARTING_CREDITS: 5000,
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
        const CACHE_NAME = 'chasecards-universal-images-v17';
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
          const isImage = e.request.destination === 'image' || url.pathname.match(/\\.(png|jpe?g|webp|svg|gif)$/i) || (url.hostname.includes('pokemontcg.io') && !url.pathname.startsWith('/v2/')) || url.hostname.includes('githubusercontent.com') || url.hostname.includes('tcgdex.net') || url.hostname.includes('pokellector.com') || url.hostname.includes('bulbagarden.net');
          
          if (isImage) {
            e.respondWith(
              caches.open(CACHE_NAME).then(async cache => {
                const cachedRes = await cache.match(e.request);
                if (cachedRes) return cachedRes;
                try {
                  let netRes;
                  try {
                    netRes = await fetch(e.request, { mode: 'cors', credentials: 'omit' });
                    if (!netRes || !netRes.ok) throw new Error('cors-not-ok');
                  } catch (corsErr) {
                    // Plenty of the image hosts this app pulls from (assets.tcgdex.net,
                    // den-media.pokellector.com, archives.bulbagarden.net) don't send an
                    // Access-Control-Allow-Origin header. A strict 'cors' fetch to those
                    // throws outright instead of just missing headers, which used to fall
                    // through to Response.error() below — a hard network failure applied
                    // to every image on that domain, not a benign cache miss. 'no-cors'
                    // still gets a renderable (opaque) response we can cache and hand back;
                    // we never need to read its bytes, only display it.
                    netRes = await fetch(e.request, { mode: 'no-cors', credentials: 'omit' });
                  }
                  if (netRes && (netRes.ok || netRes.type === 'opaque')) {
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

/* Larger, sharper pack-art thumbnails on the home overview grid */
#set-grid.set-grid {
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
  gap: 14px !important;
}
.set-card {
  overflow: hidden !important;
  padding: 0 0 10px 0 !important;
  display: flex !important;
  flex-direction: column !important;
}
.set-card img {
  width: 100% !important;
  height: 150px !important;
  object-fit: contain !important;
  object-position: center !important;
  box-sizing: border-box !important;
  padding: 10px !important;
  border-radius: 10px 10px 0 0 !important;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  display: block !important;
}
.set-card .name {
  padding: 8px 10px 0 10px !important;
}
.set-card .meta {
  padding: 0 10px !important;
}
@media (max-width: 420px) {
  #set-grid.set-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important; }
  .set-card img { height: 130px !important; }
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
   Card Market Valuation & 70% Sell-Back System
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
          <img src="${imgSrc}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%2394a3b8%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2214%22%3EImage Unavailable%3C/text%3E%3C/svg%3E'" style="width:100%; border-radius:18px; box-shadow:0 30px 60px rgba(0,0,0,0.8); animation: zoomIn 0.3s cubic-bezier(0.2,0.8,0.2,1); object-fit:contain; max-height:70vh;"/>
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
  store.set(scopedKey('user_collections'), map);
  
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
  CACHE_NAME: 'chasecards-universal-images-v16',
  // The Cache Storage API only accepts http(s) request URLs — cache.match()/
  // cache.put() throw a TypeError on anything else. pokewallet://images/{id}
  // is a synthetic marker scheme (see get() below), not a real URL, so it
  // can never be used as the Cache Storage key directly. Map it to the real
  // https endpoint for cache purposes while still keying the in-memory
  // blobUrls map (and everything callers pass around) by the marker string.
  _cacheKeyFor(url) {
    return url.startsWith('pokewallet://images/')
      ? `https://api.pokewallet.io/images/${url.slice('pokewallet://images/'.length)}`
      : url;
  },
  async has(url) {
    if (!url) return false;
    if (this.blobUrls[url]) return true;
    if (!('caches' in window)) return false;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      return !!(await cache.match(this._cacheKeyFor(url)));
    } catch (e) { return false; }
  },
  async get(url, silent = false) {
    if (!url) return '';
    if (this.blobUrls[url]) return this.blobUrls[url];
    
    if (!silent) showLoader();
    try {
      if ('caches' in window) {
        const cache = await caches.open(this.CACHE_NAME);
        const cacheKey = this._cacheKeyFor(url);
        let res = await cache.match(cacheKey);
        if (!res) {
          // PokéWallet images need an X-API-Key header, which a plain
          // fetch(url) here can't attach for a normal https:// URL —
          // this synthetic scheme is how getCardsForSet() marks "this
          // needs the real endpoint + auth header", while still letting
          // it flow through the exact same cache-then-fetch path as
          // every other image source (just keyed via cacheKey, since
          // the marker itself isn't a cacheable URL — see _cacheKeyFor).
          if (url.startsWith('pokewallet://images/')) {
            const pwId = url.slice('pokewallet://images/'.length);
            res = CONFIG.POKEWALLET_API_KEY
              ? await fetch(`https://api.pokewallet.io/images/${pwId}`, { headers: { 'X-API-Key': CONFIG.POKEWALLET_API_KEY } })
              : null;
          } else {
            res = await fetch(url, { mode: 'cors', credentials: 'omit' });
          }
          if (res && res.ok) await cache.put(cacheKey, res.clone());
        }
        if (res && res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          this.blobUrls[url] = blobUrl;
          if (!silent) hideLoader();
          return blobUrl;
        }
      }
    } catch (e) {
      console.warn('Persistent caching fallback triggered', e);
    } finally {
      if (!silent) hideLoader();
    }

    // pokewallet:// isn't a scheme a browser can ever load directly (unlike
    // the plain-https branch below, where letting <img>/Image() hit the
    // original URL is a reasonable last resort) — so there's no fallback
    // for it beyond what already ran above.
    if (url.startsWith('pokewallet://images/')) return '';

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
   Niche pack-art sources (Bulbapedia / Pokéllector)
   ============================================================ */
function normPackName(name) {
  return String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function bulbapediaFile(filename) {
  return 'https://archives.bulbagarden.net/wiki/Special:FilePath/' + encodeURIComponent(filename);
}
function pokellector(slugDotIdDotPng) {
  return 'https://den-media.pokellector.com/logos/' + slugDotIdDotPng;
}
const NICHE_PACK_ART = {
  exemerald: [
    bulbapediaFile('EX9_Booster_Kyogre.jpg'),
    bulbapediaFile('EX9_Booster_Groudon.jpg'),
    bulbapediaFile('EX9_Booster_Rayquaza.jpg'),
    bulbapediaFile('EX9_Booster_Deoxys_Speed.jpg'),
    pokellector('EX-Emerald.logo.60.png'),
  ],
  mcdonaldscollection2011: [pokellector('McDonalds-Promos-2011.logo.10.png')],
  mcdonaldscollection2012: [pokellector('McDonalds-Promos-2012.logo.11.png')],
  mcdonaldscollection2013: [pokellector('McDonalds-Promos-2013.logo.147.png')],
  mcdonaldscollection2014: [pokellector('McDonalds-Collection-2014.logo.158.png')],
  mcdonaldscollection2015: [pokellector('McDonalds-Collection-2015.logo.182.png')],
  mcdonaldscollection2016: [pokellector('McDonalds-Collection-2016.logo.207.png')],
  mcdonaldscollection2017: [pokellector('McDonalds-Collection-2017.logo.230.png')],
  mcdonaldscollection2018: [pokellector('McDonalds-Collection-2018.logo.265.png')],
  mcdonaldscollection2019: [pokellector('McDonalds-Collection-2019.logo.290.png')],
  mcdonaldscollection2019fr: [pokellector('McDonalds-Collection-2019-FR.logo.334.png')],
  mcdonalds25thanniversary: [pokellector('McDonalds-25th-Anniversary.logo.300.png')],
  mcdonaldsmatchbattle: [pokellector('McDonalds-Match-Battle.logo.353.png')],
  mcdonaldsmatchbattle2023: [pokellector('McDonalds-Match-Battle-2023.logo.372.png')],
  mcdonaldsdragondiscovery: [pokellector('McDonalds-Dragon-Discovery.logo.410.png')],
  southernislands: [pokellector('Southern-Islands.logo.124.png')],
  bestofgame: [pokellector('Best-of-Game.logo.196.png')],
  legendarycollection: [pokellector('Legendary-Collection.logo.112.png')],
  detectivepikachu: [pokellector('Detective-Pikachu.logo.270.png')],
  pokemongo: [pokellector('Pokemon-Go.logo.346.png')],
  popseries1: [pokellector('POP-Series-1.logo.68.png')],
  popseries2: [pokellector('POP-Series-2.logo.69.png')],
  popseries3: [pokellector('POP-Series-3.logo.70.png')],
  popseries4: [pokellector('POP-Series-4.logo.71.png')],
  popseries5: [pokellector('POP-Series-5.logo.102.png')],
  popseries6: [pokellector('POP-Series-6.logo.103.png')],
  popseries7: [pokellector('POP-Series-7.logo.104.png')],
  popseries8: [pokellector('POP-Series-8.logo.105.png')],
  popseries9: [pokellector('POP-Series-9.logo.106.png')],
  nintendopromos: [pokellector('Nintendo-Promos.logo.50.png')],
  dragonvault: [pokellector('Dragon-Vault.logo.8.png')],
  radiantcollection: [pokellector('Radiant-Collection.logo.148.png')],
  kalosstarterset: [pokellector('Kalos-Starter-Set.logo.150.png')],
  doublecrisis: [pokellector('Double-Crisis.logo.172.png')],
  callsoflegends: [pokellector('Call-of-Legends.logo.33.png')],
  pokemonrumble: [pokellector('Pokemon-Rumble.logo.52.png')],
  unbrokenbonds: [pokellector('Unbroken-Bonds.logo.269.png')],
  wizardsblackstarpromos: [pokellector('Wizards-of-the-Coast-Promos.logo.125.png')],
  wizardsofthecoastpromos: [pokellector('Wizards-of-the-Coast-Promos.logo.125.png')],
  exdragonfrontiers: [pokellector('EX-Dragon-Frontiers.logo.66.png')],
  dragonfrontiers: [pokellector('EX-Dragon-Frontiers.logo.66.png')],
  dpblackstarpromos: [pokellector('DP-Black-Star-Promos.logo.101.png')],
  swordshield: [pokellector('Sword-Shield.logo.286.png')],
  megaevolution: [pokellector('Mega-Evolution.logo.422.png')],
  perfectorder: [pokellector('Perfect-Order.logo.429.png')],
  rebelclash: [pokellector('Rebel-Clash.logo.292.png')],
};
function nicheArtFor(setMeta) {
  const key = normPackName(setMeta.name);
  if (NICHE_PACK_ART[key]) return NICHE_PACK_ART[key];
  if (/mcdonald/i.test(setMeta.name || '')) {
    const yearMatch = String(setMeta.name).match(/20\d{2}/);
    if (yearMatch && NICHE_PACK_ART['mcdonaldscollection' + yearMatch[0]]) {
      return NICHE_PACK_ART['mcdonaldscollection' + yearMatch[0]];
    }
  }
  return [];
}

/* ============================================================
   Japanese niche pack-art sources (Pokéllector JP / Bulbapedia)
   ------------------------------------------------------------
   normPackName() strips every non a-z0-9 character, so it can't be
   used to key Japanese set names (they'd all collapse to ""). This
   table is keyed on the *exact* Japanese set name string instead —
   no fuzzy matching, so there's no risk of the English-name collision
   problem that isJp deliberately avoids elsewhere in this file.
   Sourced by hand from jp.pokellector.com (den-media CDN, same host
   nicheArtFor() already trusts) and cross-checked against Bulbapedia/
   Bulbagarden archives for the handful of ADV/e-Card era sets
   Pokéllector JP doesn't carry.
   ============================================================ */
function normJpKey(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}
// Exact JP set name -> confirmed den-media.pokellector.com logo URL(s).
const JP_DIRECT_PACK_ART = {
  'ポケモンジャングル': [pokellector('Pokemon-Jungle.logo.313.png')],
  '化石の秘密': [pokellector('Mystery-of-the-Fossils.logo.314.png')],
  'ロケット団': [pokellector('Rocket-Gang.logo.315.png')],
  '闇からの挑戦': [pokellector('Challenge-from-the-Darkness.logo.317.png')],
  '遺跡をこえて...': [pokellector('Crossing-the-Ruins.logo.331.png')],
  'めざめる伝説': [pokellector('Awakening-Legends.logo.332.png')],
  '闇、そして光へ...': [pokellector('Darkness-and-to-Light.logo.333.png')],
  '基本拡張パック': [pokellector('Expansion-Pack.logo.311.png')],
  '地図にない町': [pokellector('The-Town-on-No-Map.logo.390.png')],
  '頂上大激突': [pokellector('Clash-at-the-Summit.logo.250.png')],
  'よみがえる伝説': [pokellector('Reviving-Legends.logo.249.png')],
  'ソウルシルバーコレクション': [pokellector('SoulSilver-Collection.logo.248.png')],
  'ポケットモンスターカードゲーム 拡張パック 20th Anniversary': [pokellector('20th-Anniversary-Collection.logo.198.png')],
  'めざめる超王': [pokellector('Awakening-of-Psychic-Kings.logo.184.png')],
  'プレミアムチャンピオンパック EX×M×BREAK': [pokellector('Premium-Champion-Pack-EX-x-M-x-BREAK.logo.185.png')],
  '冷酷の反逆者': [pokellector('Ruthless-Rebel.logo.193.png')],
  'ワイルドブレイズ': [pokellector('Wild-Blaze.logo.152.png')],
  'コレクションY': [pokellector('Collection-Y.logo.140.png')],
  'バンデットリング': [pokellector('Bandit-Ring.logo.171.png')],
  'エメラルドブレイク': [pokellector('Emerald-Break.logo.167.png')],
  'ガイアボルケーノ': [pokellector('Gaia-Volcano.logo.165.png')],
  'タイダルストーム': [pokellector('Tidal-Storm.logo.164.png')],
  'ファントムゲート': [pokellector('Phantom-Gate.logo.160.png')],
  'ポケキュンコレクション': [pokellector('Pokekyun-Collection.logo.186.png')],
  '赤い閃光': [pokellector('Red-Flash.logo.175.png')],
  '青い衝撃': [pokellector('Blue-Impact.logo.176.png')],
  'コレクションムーン': [pokellector('Collection-Moon.logo.202.png')],
  'サン＆ムーン': [pokellector('Collection-Sun.logo.201.png')],
  'キミを待つ島々': [pokellector('Islands-Awaiting-You.logo.211.png')],
  '新たなる試練の向こう': [pokellector('Strengthening-Expansion-Pack-Beyond-A-New-Challenge.logo.212.png')],
  '光を喰らう闇': [pokellector('Light-Consuming-Darkness.logo.218.png')],
  '闘う虹を見たか': [pokellector('Seen-the-Rainbow-Battle.logo.219.png')],
  '覚醒の勇者': [pokellector('The-Awoken-Hero.logo.226.png')],
  '超次元の暴獣': [pokellector('The-Transdimensional-Beast.logo.227.png')],
  'GXバトルブースト': [pokellector('GX-Battle-Boost.logo.228.png')],
  'ウルトラムーン': [pokellector('Ultra-Moon.logo.233.png')],
  'ウルトラフォース': [pokellector('Ultra-Force.logo.238.png')],
  '禁断の光': [pokellector('Forbidden-Light.logo.235.png')],
  'チャンピオンロード': [pokellector('Champion-Road.logo.237.png')],
  '裂空のカリスマ': [pokellector('Charisma-of-the-Cracked-Sky.logo.242.png')],
  '迅雷スパーク': [pokellector('Thunderclap-Spark.logo.243.png')],
  '超爆インパクト': [pokellector('Explosive-Impact.logo.258.png')],
  'ダークオーダー': [pokellector('Dark-Order.logo.245.png')],
  'GXウルトラシャイニー': [pokellector('Ultra-Shiny-GX.logo.241.png')],
  'ナイトユニゾン': [pokellector('Night-Unison.logo.262.png')],
  'フルメタルウォール': [pokellector('Full-Metal-Wall.logo.263.png')],
  'ダブルブレイズ': [pokellector('Double-Blaze.logo.266.png')],
  'スカイレジェンド': [pokellector('Sky-Legends.logo.268.png')],
  '名探偵ピカチュウ': [pokellector('Detective-Pikachu.logo.271.png')],
  'ミラクルツイン': [pokellector('Miracle-Twins.logo.277.png')],
  'ドリームリーグ': [pokellector('Dream-League.logo.278.png')],
  'オルタージェネシス': [pokellector('Alter-Genesis.logo.281.png')],
  'TAG TEAM GX タッグオールスターズ': [pokellector('Tag-Team-GX-All-Stars.logo.288.png')],
  'VMAXライジング': [pokellector('VMAX-Rising.logo.285.png')],
  '反逆クラッシュ': [pokellector('Rebellion-Crash.logo.291.png')],
  'ムゲンゾーン': [pokellector('Infinity-Zone.logo.293.png')],
  '伝説の鼓動': [pokellector('Legendary-Pulse.logo.294.png')],
  'トリプレットビート': [pokellector('Triple-Beat.logo.366.png')],
  '連撃マスター': [pokellector('Rapid-Strike-Master.logo.307.png')],
  'ロストアビス': [pokellector('Lost-Abyss.logo.344.png')],
  '白銀のランス': [pokellector('Silver-Lance.logo.309.png')],
  'タイムゲイザー': [pokellector('Time-Gazer.logo.341.png')],
  'パラダイムトリガー': [pokellector('Paradigm-Trigger.logo.351.png')],
  '蒼空ストリーム': [pokellector('Blue-Sky-Stream.logo.319.png')],
  'VMAXクライマックス': [pokellector('VMAX-Climax.logo.338.png')],
  'シャイニースターV': [pokellector('Shiny-Star-V.logo.301.png')],
  'フュージョンアーツ': [pokellector('Fusion-ARTS.logo.326.png')],
  'ダークファンタズマ': [pokellector('Dark-Phantasma.logo.343.png')],
  'スターバース': [pokellector('Star-Birth.logo.336.png')],
  '漆黒のガイスト': [pokellector('Dark-Phantasma.logo.343.png')],
  '摩天パーフェクト': [pokellector('Perfect-Skyscraper.logo.318.png')],
  'スペースジャグラー': [pokellector('Space-Juggler.logo.342.png')],
  '白熱のアルカナ': [pokellector('Incandescent-Arcana.logo.352.png')],
  '一撃マスター': [pokellector('Single-Strike-Master.logo.306.png')],
  '黒炎の支配者': [pokellector('Ruler-of-the-Black-Flame.logo.368.png')],
  '変幻の仮面': [pokellector('Mask-of-Change.logo.393.png')],
  'レイジングサーフ': [pokellector('Raging-Surf.logo.376.png')],
  'ロケット団の栄光': [pokellector('Glory-of-Team-Rocket.logo.413.png')],
  'ワイルドフォース': [pokellector('Wild-Force.logo.386.png')],
  '楽園ドラゴーナ': [pokellector('Paradise-Dragona.logo.403.png')],
  'ナイトワンダラー': [pokellector('Night-Wanderer.logo.398.png')],
  '超電ブレイカー': [pokellector('Super-Electric-Breaker.logo.405.png')],
  'テラスタルフェスex': [pokellector('Terastal-Festival-ex.logo.406.png')],
  'バイオレットex': [pokellector('Violet-ex.logo.362.png')],
  'クレイバースト': [pokellector('Clay-Burst.logo.370.png')],
  'ポケモンカード151': [pokellector('Pokemon-151.logo.371.png')],
  'ブラックボルト': [pokellector('Black-Bolt.logo.414.png')],
  'デッキビルドBOX ステラミラクル': [pokellector('Stella-Miracle.logo.401.png')],
  '熱風のアリーナ': [pokellector('Hot-Air-Arena.logo.411.png')],
  'クリムゾンヘイズ': [pokellector('Crimson-Haze.logo.391.png')],
  '未来の一閃': [pokellector('Future-Flash.logo.382.png')],
  'スタートデッキ100 バトルコレクション': [pokellector('Start-Deck-100.logo.337.png')],
  'メガ プロモカード': [pokellector('Mega-Series-Promos.logo.419.png')],
  'アビスアイ': [pokellector('Abyss-Eye.logo.433.png')],
  'ニンジャスピナー': [pokellector('Ninja-Spinner.logo.430.png')],
  'ムニキスゼロ': [pokellector('Munikis-Zero.logo.428.png')],
  'インフェルノX': [pokellector('Inferno-X.logo.425.png')],
  'メガシンフォニア': [pokellector('Mega-Symphonia.logo.417.png')],
};
// Sets Pokéllector JP doesn't carry (mostly ADV/e-Card era) but which
// map 1:1 to a real English TCG set — route these through the existing
// English tcgdexLogoFor()/nicheArtFor() pipeline via an explicit,
// hand-verified name instead of fuzzy-matching the Japanese string.
const JP_NAME_TO_EN_FALLBACK = {
  '海からの風': 'Aquapolis',
  '裂けた大地': 'Skyridge',
  '神秘なる山': 'Skyridge',
  '砂漠のきせき': 'EX Sandstorm',
  '天空の覇者': 'EX Dragon',
  '強化拡張パックex1マグマVSアクア ふたつの野望': 'EX Team Magma vs Team Aqua',
  'ロケット団の逆襲': 'EX Team Rocket Returns',
  '金の空、銀の海': 'EX Unseen Forces',
  'まぼろしの森': 'EX Legend Maker',
  'ホロンの研究塔': 'EX Delta Species',
  'ホロンの幻影': 'EX Holon Phantoms',
  'ワールドチャンピオンズパック': 'EX Power Keepers',
  '蒼空の激突': 'EX Deoxys',
};
function jpDirectArtFor(setMeta) {
  return JP_DIRECT_PACK_ART[normJpKey(setMeta.name)] || [];
}
async function jpFallbackArtFor(setMeta) {
  const enName = JP_NAME_TO_EN_FALLBACK[normJpKey(setMeta.name)];
  if (!enName) return [];
  const fakeSetMeta = { name: enName };
  const niche = nicheArtFor(fakeSetMeta);
  let tcgdex = null;
  try { tcgdex = await tcgdexLogoFor(fakeSetMeta); } catch (e) { /* offline */ }
  return [...niche, tcgdex].filter(Boolean);
}

/* ============================================================
   OWN_PACK_ART — real photographed booster packs from repo
   ============================================================ */
const PACK_ART_REPO_BASE = 'https://raw.githubusercontent.com/imnotanaiaccount/chasecard/main/';
const OWN_PACK_ART = {
  base1: ['pack_001_1.png', 'pack_001_2.png', 'pack_001_3.png'],
  base2: ['pack_002_1.png', 'pack_002_2.png', 'pack_002_4.png'],
  base3: ['pack_003_1.png', 'pack_003_4.png', 'pack_003_5.png'],
  base4: ['pack_004_1.png'],
  base5: ['pack_005_1.png'],
  gym1:  ['pack_006_1.png'],
  gym2:  ['pack_007_1.png'],
  base6: ['pack_008_2.png', 'pack_008_5.png', 'pack_008_6.png', 'pack_008_8.png'],
  neo1:  ['pack_009_2.png', 'pack_009_3.png', 'pack_009_4.png', 'pack_009_6.png'],
  neo2:  ['pack_010_1.png'],
  neo3:  ['pack_011_1.png'],
  neo4:  ['pack_012_1.png'],
  ecard1:['pack_013_2.png'],
  ecard2:['pack_014_1.png'],
  ecard3:['pack_015_1.png'],
  ex1:   ['pack_016_1.png'],
  ex2:   ['pack_017_1.png'],
  ex3:   ['pack_018_1.png'],
  ex4:   ['pack_019_1.png'],
  ex5:   ['pack_020_2.png'],
  ex6:   ['pack_021_1.png'],
  ex7:   ['pack_022_2.png'],
  ex8:   ['pack_023_2.png'],
  ex9:   ['pack_024_1.png'],
  ex10:  ['pack_025_1.png'],
  ex11:  ['pack_026_1.png'],
  ex12:  ['pack_027_2.png'],
  ex13:  ['pack_028_10.png'],
  ex14:  ['pack_029_1.png'],
  ex15:  ['pack_030_1.png'],
  ex16:  ['pack_031_1.png'],
  dp1:   ['pack_034_1.png'],
  dp2:   ['pack_035_1.png'],
  dp3:   ['pack_036_1.png'],
  dp4:   ['pack_037_1.png'],
  dp5:   ['pack_038_1.png'],
  dp6:   ['pack_039_1.png'],
  dp7:   ['pack_040_1.png'],
  pl1:   ['pack_041_1.png'],
  pl2:   ['pack_042_1.png'],
  pl3:   ['pack_043_1.png'],
  pl4:   ['pack_044_1.png'],
  hgss1: ['pack_045_1.png'],
  hgss2: ['pack_046_1.png'],
  hgss3: ['pack_047_1.png'],
  hgss4: ['pack_048_1.png'],
  col1:  ['pack_049_1.png'],
  bw1:   ['pack_050_11.png'],
  bw2:   ['pack_051_2.png'],
  bw3:   ['pack_052_1.png'],
  bw4:   ['pack_053_1.png'],
  bw5:   ['pack_054_1.png'],
  bw6:   ['pack_055_1.png'],
  dv1:   ['pack_056_1.png'],
  bw7:   ['pack_057_1.png'],
  bw8:   ['pack_058_1.png'],
  bw9:   ['pack_059_1.png'],
  bw10:  ['pack_060_1.png'],
  bw11:  ['pack_061_1.png'],
  xy1:   ['pack_062_1.png'],
  xy2:   ['pack_063_1.png'],
  xy3:   ['pack_064_1.png'],
  xy4:   ['pack_065_1.png'],
  xy5:   ['pack_066_1.png'],
  dc1:   ['pack_067_1.png'],
  xy6:   ['pack_068_10.png'],
  xy7:   ['pack_069_1.png'],
  xy8:   ['pack_070_1.png'],
  xy9:   ['pack_071_11.png'],
  g1:    ['pack_072_2.png'],
  xy10:  ['pack_073_1.png'],
  xy11:  ['pack_074_10.png'],
  xy12:  ['pack_075_2.png'],
  sm1:   ['pack_076_1.png'],
  sm2:   ['pack_077_1.png'],
  sm3:   ['pack_078_1.png'],
  sm35:  ['pack_079_1.png'],
  sm4:   ['pack_080_1.png'],
  sm5:   ['pack_081_1.png'],
  sm6:   ['pack_082_1.png'],
  sm7:   ['pack_083_1.png'],
  sm75:  ['pack_084_2.png'],
  sm8:   ['pack_085_2.png'],
  sm9:   ['pack_086_2.png'],
  det1:  ['pack_087_1.png'],
  sm10:  ['pack_088_2.png'],
  sm11:  ['pack_089_1.png'],
  sm115: ['pack_090_2.png'],
  sm12:  ['pack_091_10.png'],
  swsh1: ['pack_092_2.png'],
  swsh2: ['pack_093_1.png'],
  swsh3: ['pack_094_1.png'],
  swsh35:['pack_095_1.png'],
  swsh4: ['pack_096_1.png'],
  swsh45:['pack_097_1.png'],
  swsh5: ['pack_098_1.png'],
  swsh6: ['pack_099_2.png'],
  swsh7: ['pack_100_2.png'],
  cel25: ['pack_101_2.png'],
  swsh8: ['pack_102_2.png'],
  swsh9: ['pack_103_1.png'],
  swsh10:['pack_104_1.png'],
  pgo:   ['pack_105_3.png'],
  swsh11:['pack_106_3.png'],
  swsh12:['pack_107_3.png'],
  swsh12pt5:['pack_108_2.png'],
  sv1:   ['pack_110_1.png'],
  sv2:   ['pack_111_3.png'],
  sv3:   ['pack_112_3.png'],
  sv3pt5:['pack_113_2.png'],
  sv4:   ['pack_114_2.png'],
  sv4pt5:['pack_115_2.png'],
  sv5:   ['pack_116_2.png'],
  sv6:   ['pack_117_2.png'],
  sv6pt5:['pack_118_3.png'],
  sv7:   ['pack_119_2.png'],
  sv8:   ['pack_120_1.png'],
  sv8pt5:['pack_121_2.png'], // Prismatic Evolutions
  sv9:   ['pack_121_2.png'],
  sv10:  ['pack_122_10.png'],
  sv11:  ['pack_123_10.png'],
};

// Case-insensitive Japanese matching function
function ownArtFor(setMeta) {
  if (setMeta.id && setMeta.id.startsWith('jp-')) {
    const realId = (setMeta.tcgdexId || setMeta.id.slice(3)).toLowerCase();
    const jpKeys = Object.keys(OWN_PACK_ART_JP);
    const matchedKey = jpKeys.find(k => k.toLowerCase() === realId);
    if (matchedKey) {
      const jpFiles = OWN_PACK_ART_JP[matchedKey];
      if (jpFiles && jpFiles.length) return jpFiles.map(f => PACK_ART_REPO_BASE + f);
    }
    return [];
  }
  const files = OWN_PACK_ART[setMeta.id];
  if (files && files.length) return files.map(f => PACK_ART_REPO_BASE + f);
  const byName = OWN_PACK_ART_BY_NAME[normPackName(setMeta.name)];
  if (byName && byName.length) return byName.map(f => PACK_ART_REPO_BASE + f);
  return [];
}

const OWN_PACK_ART_JP = {
  PMCG1: ['pack_143_1.png'],
  PMCG5: ['pack_144_2.png'],
  neo1:  ['pack_145_1.png'],
  VS1:   ['pack_146_3.png'],
  ADV1:  ['pack_156_1.png'],
  ADV5:  ['pack_157_1.png'],
  PCG1:  ['pack_158_2.png'],
  PCG8:  ['pack_159_10.png'],
  PCG9:  ['pack_160_1.png'],
  L1a:   ['pack_166_2.png'],
  LL:    ['pack_167_1.png'],
  S1H:   ['pack_168_1.png'],
  XY1a:  ['pack_173_1.png'],
  XY3:   ['pack_174_3.png'],
  CP1:   ['pack_175_3.png'],
  CP2:   ['pack_176_2.png'],
  XY9:   ['pack_177_3.png'],
  XY11a: ['pack_178_2.png'],
  SM1S:  ['pack_180_2.png'],
  SM2L:  ['pack_181_1.png'],
  'SM3+':['pack_182_1.png'],
  SM5S:  ['pack_183_3.png'],
  SM6a:  ['pack_184_2.png'],
  SM7b:  ['pack_185_1.png'],
  SM9:   ['pack_186_1.png'],
  sn10a: ['pack_187_2.png'],
  SM11a: ['pack_188_1.png'],
  s1W:   ['pack_189_3.png'],
  s2a:   ['pack_190_2.png'],
  S4:    ['pack_191_1.png'],
  s5a:   ['pack_192_3.png'],
  s6a:   ['pack_193_1.png'],
  s8a:   ['pack_194_1.png'],
  s9a:   ['pack_195_1.png'],
  s10b:  ['pack_196_2.png'],
  s12a:  ['pack_197_2.png'],
  sv1S:  ['pack_198_1.png'],
  sv2P:  ['pack_199_3.png'],
  sv4K:  ['pack_200_2.png'],
  sv5M:  ['pack_201_1.png'],
  sv7:   ['pack_202_1.png'],
  sv9:   ['pack_203_1.png'],
  sv11W: ['pack_204_1.png'],
  M1L:   ['pack_205_1.png'],
  M2a:   ['pack_206_1.png'],
};

const OWN_PACK_ART_BY_NAME = {
  [normPackName('Black Bolt')]: ['pack_124_1.png'],
  [normPackName('White Flare')]: ['pack_204_1.png'],
  [normPackName('Prismatic Evolutions')]: ['pack_121_2.png'],
  [normPackName('Mega Evolution')]: ['pack_125_1.png', 'pack_125_2.png', 'pack_125_3.png', 'pack_125_4.png'],
  [normPackName('Mega Evolution Phantasmal Flames')]: ['pack_126_1.png'],
  [normPackName('Phantasmal Flames')]: ['pack_126_1.png'],
  [normPackName('Mega Evolution Ascended Heroes')]: ['pack_127_1.png'],
  [normPackName('Ascended Heroes')]: ['pack_127_1.png'],
  [normPackName('Mega Evolution Perfect Order')]: ['pack_128_3.png'],
  [normPackName('Perfect Order')]: ['pack_128_3.png'],
  [normPackName('Mega Evolution Chaos Rising')]: ['pack_129_1.png'],
  [normPackName('Chaos Rising')]: ['pack_129_1.png'],
  [normPackName('Mega Evolution Pitch Black')]: ['pack_130_1.png'],
  [normPackName('Pitch Black')]: ['pack_130_1.png'],
  [normPackName('30th Celebration')]: ['pack_131_1.png'],
};

/* ============================================================
   TCGdex — algorithmic set-logo fallback
   ============================================================ */
const TCGDEX_SETS_URL = 'https://api.tcgdex.net/v2/en/sets';
const TCGDEX_INDEX_KEY = 'tcgdex_set_index_v1';
let _tcgdexIndexPromise = null;
async function getTcgdexSetIndex() {
  const cached = store.get(TCGDEX_INDEX_KEY);
  if (cached && cached.map && Date.now() - cached.t < 1000 * 60 * 60 * 24 * 14) {
    return cached.map;
  }
  if (_tcgdexIndexPromise) return _tcgdexIndexPromise;
  _tcgdexIndexPromise = (async () => {
    try {
      const res = await fetch(TCGDEX_SETS_URL);
      if (!res.ok) throw new Error('tcgdex sets ' + res.status);
      const list = await res.json();
      const map = {};
      for (const s of list) {
        if (!s || !s.name || !s.logo) continue;
        const key = normPackName(s.name);
        if (!map[key]) map[key] = s.logo + '.png';
      }
      store.set(TCGDEX_INDEX_KEY, { t: Date.now(), map });
      return map;
    } catch (e) {
      return (cached && cached.map) || {};
    } finally {
      _tcgdexIndexPromise = null;
    }
  })();
  return _tcgdexIndexPromise;
}
const TCGDEX_NAME_ALIASES = {
  wizardsblackstarpromos: 'wizardsofthecoastpromos',
};
async function tcgdexLogoFor(setMeta) {
  const map = await getTcgdexSetIndex();
  const key = normPackName(setMeta.name);
  if (map[key]) return map[key];
  const aliasKey = TCGDEX_NAME_ALIASES[key];
  if (aliasKey && map[aliasKey]) return map[aliasKey];
  return null;
}

/* ============================================================
   Background pack-art prewarmer
   ============================================================ */
const Prewarm = {
  running: false,
  PROGRESS_KEY: 'prewarm_progress_v3',
  FAIL_KEY: 'prewarm_fail_counts_v3',
  ART_TTL_MS: 1000 * 60 * 60 * 24 * 3,
  
  async resolvePackArtUrls(setMeta) {
    const own = ownArtFor(setMeta);
    if (own.length) return own;

    const cacheKey = 'packart_urls_v8_' + setMeta.id; 
    const cached = store.get(cacheKey);
    if (cached && Array.isArray(cached.urls) && cached.urls.length && (Date.now() - cached.t) < (cached.ttl || this.ART_TTL_MS)) {
      return cached.urls;
    }

    const isJp = setMeta.id && setMeta.id.startsWith('jp-');
    const realIdLower = (setMeta.tcgdexId || (isJp ? setMeta.id.slice(3) : setMeta.id)).toLowerCase();
    
    // Japanese sets on the GitHub repo use the 'ja_' prefix
    const githubId = isJp ? `ja_${realIdLower}` : realIdLower;

    // tcgdexLogoFor() and nicheArtFor() match by normalized set NAME against
    // an English-only index. normPackName() strips every non a-z0-9
    // character, so a pure-Japanese set name collapses to "" and can match
    // (or a partly-Latin JP name like "VMAXクライマックス" can accidentally
    // collide with) an unrelated English set — that's how English pack art
    // was leaking into the JP tab. So JP sets never go through that *fuzzy*
    // path. Instead they get JP_DIRECT_PACK_ART (exact JP name -> a
    // hand-verified Pokéllector JP logo) or, for the handful of ADV/e-Card
    // era sets Pokéllector JP doesn't carry, JP_NAME_TO_EN_FALLBACK (exact
    // JP name -> a hand-verified English set name run through the existing
    // English pipeline) — both keyed on the literal string, not fuzzy.
    let tcgdexUrl = null;
    let jpDirect = [];
    if (!isJp) {
      try { tcgdexUrl = await tcgdexLogoFor(setMeta); } catch (e) { /* offline */ }
    } else {
      jpDirect = jpDirectArtFor(setMeta);
      if (!jpDirect.length) {
        try { jpDirect = await jpFallbackArtFor(setMeta); } catch (e) { /* offline */ }
      }
    }

    if (!tcgdexUrl && isJp && setMeta.images?.logo) {
      tcgdexUrl = setMeta.images.logo;
    }

    let ghConfirmed = [];
    try {
      // 1niceroli/ptcg-assets is confirmed English-only (its own README:
      // "for now the collection is only in english"). Because TCGdex shares
      // one set id across every locale, a JP set's realIdLower (e.g.
      // "neo1") is the *same* id as that repo's English folder — so a
      // fallback to the plain, un-prefixed folder here would silently
      // serve an English pack photo for a Japanese set. Only the ja_
      // prefixed folder can ever legitimately be Japanese content; if it
      // 404s, there's nothing safe to fall back to in this repo.
      const ghRes = await fetch(`https://api.github.com/repos/1niceroli/ptcg-assets/contents/${githubId}/packshots`);
      if (ghRes.ok) {
        const files = await ghRes.json();
        const images = files.filter(f => f.type === 'file' && f.name.match(/\.(png|jpe?g|webp)$/i));
        images.sort((a, b) => a.name.localeCompare(b.name));
        ghConfirmed = images.map(img => img.download_url);
      }
    } catch (e) { /* offline */ }

    // Same reasoning as tcgdexUrl above: NICHE_PACK_ART is keyed to English
    // set names, so skip it for JP sets rather than risk a false match.
    const niche = isJp ? [] : nicheArtFor(setMeta);

    const rawUrls = [...new Set([
      ...ghConfirmed, 
      tcgdexUrl,       // TCGdex's own official set logo — prefer this over the fan-hosted
                        // Pokéllector JP art below whenever TCGdex actually has it
      ...jpDirect,      // Pokéllector JP fallback — only used when TCGdex has no logo
      ...niche,        
      `https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/${githubId}/packshots/1.png`,
      `https://raw.githubusercontent.com/1niceroli/ptcg-assets/main/${githubId}/packshots/1.jpg`,
      // No un-prefixed realIdLower guess here for JP — see comment above;
      // that path is what was leaking English art into JP packs.
      setMeta.images?.logo || null,
    ].filter(Boolean))];

    const hasReliableSource = ghConfirmed.length > 0 || !!tcgdexUrl || niche.length > 0 || jpDirect.length > 0;
    if (rawUrls.length) {
      // Cache confirmed sources for the full TTL. Cache guessed/fallback-only
      // results too, but for a much shorter window — otherwise every render
      // re-hits GitHub's rate-limited contents API from scratch, which tends
      // to fail right when a pack-opening burst is already hammering the
      // network for card images.
      const ttl = hasReliableSource ? this.ART_TTL_MS : 1000 * 60 * 10;
      store.set(cacheKey, { t: Date.now(), urls: rawUrls, ttl });
    }
    return rawUrls;
  },
  
  async warmSet(setMeta) {
    const urls = await this.resolvePackArtUrls(setMeta);
    let cachedAny = false;
    for (const url of urls) {
      if (await this.yieldIfBusy()) return 'paused'; 
      if (await ImgCache.has(url)) { cachedAny = true; continue; }
      const resolved = await ImgCache.get(url, true).catch(() => null);
      if (resolved) cachedAny = true;
    }
    if (setMeta.images.symbol && !(await ImgCache.has(setMeta.images.symbol))) {
      await ImgCache.get(setMeta.images.symbol, true).catch(() => null);
    }
    if (setMeta.images.logo) {
      if (await ImgCache.has(setMeta.images.logo)) cachedAny = true;
      else if (await ImgCache.get(setMeta.images.logo, true).catch(() => null)) cachedAny = true;
    }
    return cachedAny ? 'warmed' : 'empty';
  },
  
  async yieldIfBusy() {
    if (!window.__packOpenInFlight) return false;
    await new Promise(r => setTimeout(r, 1500));
    return !!window.__packOpenInFlight;
  },
  
  start(sets) {
    if (this.running || !sets || !sets.length) return;
    this.running = true;
    (async () => {
      let doneIds = new Set(store.get(this.PROGRESS_KEY, []));
      let failCounts = store.get(this.FAIL_KEY, {});
      for (const setMeta of sets) {
        if (doneIds.has(setMeta.id)) continue;
        await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 2000 }));
        try {
          const result = await this.warmSet(setMeta);
          if (result === 'warmed') {
            doneIds.add(setMeta.id);
            store.set(this.PROGRESS_KEY, [...doneIds]);
            delete failCounts[setMeta.id];
            store.set(this.FAIL_KEY, failCounts);
          } else if (result === 'empty') {
            failCounts[setMeta.id] = (failCounts[setMeta.id] || 0) + 1;
            if (failCounts[setMeta.id] >= 5) {
              doneIds.add(setMeta.id);
              store.set(this.PROGRESS_KEY, [...doneIds]);
            }
            store.set(this.FAIL_KEY, failCounts);
          }
        } catch (e) { /* transient */ }
        await new Promise(r => setTimeout(r, 500)); 
      }
      this.running = false;
    })();
  }
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
  const timeout = setTimeout(()=>ctrl.abort(), 12000);
  try{
    const headers = CONFIG.POKEMON_TCG_API_KEY ? { 'X-Api-Key': CONFIG.POKEMON_TCG_API_KEY } : {};
    const res = await fetch(`${POKE_API_BASE}${endpoint}`, { signal: ctrl.signal, headers });
    if(!res.ok){
      const err = new Error('Pokémon TCG API error ' + res.status);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  }catch(e){
    if(attempt < 4 && (e.name==='AbortError' || e.status>=500 || !e.status)){
      await new Promise(r=>setTimeout(r, attempt*1200));
      return pokeFetch(endpoint, attempt+1);
    }
    throw e;
  }finally{ 
    clearTimeout(timeout); 
    hideLoader();
  }
}

/* ============================================================
   PokéWallet — Japanese-native card art fallback
   ============================================================
   Free tier is 100 req/hour, 1,000/day, so unlike pokeFetch above
   this deliberately does NOT retry on failure (a retry storm here
   could burn a meaningful slice of the hourly budget on one bad
   set). Per-card image calls happen lazily through ImgCache.get()
   (see its pokewallet:// handling) at the same prefetch step every
   other card image goes through, which naturally caps usage to the
   ~10 cards actually drawn into an opened pack rather than every
   missing-image card in the whole set.
   ============================================================ */
const POKEWALLET_API_BASE = 'https://api.pokewallet.io';
async function pokeWalletFetch(path) {
  if (!CONFIG.POKEWALLET_API_KEY) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(`${POKEWALLET_API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { 'X-API-Key': CONFIG.POKEWALLET_API_KEY },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}
// Card numbers get formatted differently across sources ("020/189" vs
// "20" vs "20/189") — strip everything but the leading digits so "020",
// "20", and "20/189" all normalize to the same key for matching.
function normCardNum(n) {
  const m = String(n || '').match(/\d+/);
  return m ? String(parseInt(m[0], 10)) : '';
}
// One set-level lookup (not per-card) to get PokéWallet's card list for
// this set, keyed by printed card number so it can be matched against
// TCGdex's localId. Tries the TCGdex set code as-is; PokéWallet set
// codes for modern-era sets commonly follow the same official
// convention, but this is a best-effort guess, not a guaranteed match —
// wrapped so any mismatch just yields an empty map and changes nothing.
async function pokeWalletCardsForSet(tcgdexRealId) {
  if (!CONFIG.POKEWALLET_API_KEY || !tcgdexRealId) return {};
  const data = await pokeWalletFetch(`/sets/${encodeURIComponent(tcgdexRealId)}?language=jap`);
  const cards = data?.cards || (Array.isArray(data) ? data : null);
  if (!cards || !cards.length) return {};
  const byNumber = {};
  for (const c of cards) {
    const num = normCardNum(c.card_number || c.number);
    if (num && c.id) byNumber[num] = c.id;
  }
  return byNumber;
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

/* ============================================================
   Japanese sets — sourced from TCGdex 
   ============================================================ */
const TCGDEX_JA_SETS_URL = 'https://api.tcgdex.net/v2/ja/sets';
async function getJPSets(){
  const cacheKey = 'cache_jp_sets_v1';
  const cached = store.get(cacheKey);
  if(cached && Date.now() - cached.t < 1000*60*60*12) return cached.data;
  try{
    const res = await fetch(TCGDEX_JA_SETS_URL);
    if(!res.ok) throw new Error('tcgdex ja sets ' + res.status);
    const list = await res.json();
    const data = list.filter(s => s && s.id && s.name).map((s, idx) => ({
      id: 'jp-' + s.id,
      tcgdexId: s.id,
      name: s.name,
      series: '',
      total: s.cardCount?.total || s.cardCount?.official || 0,
      releaseDate: '',
      region: 'jp',
      images: { symbol: s.symbol || '', logo: s.logo ? s.logo + '.png' : '' },
      packCost: calculatePackCost(idx, list.length) * 20,
    }));
    store.set(cacheKey, { t: Date.now(), data });
    return data;
  }catch(e){
    if(cached) return cached.data;
    return []; 
  }
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

    const jpData = await getJPSets();
    data = data.concat(jpData);

    globalSortedSets = data;
    store.set('cache_sets_v3', { t: Date.now(), data });
    return data;
  }catch(e){
    if(cached){ toast('Showing cached sets — live data unavailable'); globalSortedSets = cached.data; return cached.data; }
    throw e;
  }
}

// TCGdex fetches below (unlike pokeFetch, which has its own 12s
// AbortController) had no timeout at all. getCardsForSet() for a JP set
// issues one of these per card to fetch rarity — 100+ individual requests
// for a large set, 8 at a time. With no timeout, a single stalled TCGdex
// connection leaves its worker's while-loop permanently pending, so
// Promise.all() never resolves and beginOpen() hangs on "Loading cards…"
// forever. This wraps every tcgdex fetch below with a hard deadline so a
// stalled request fails fast into the existing try/catch instead.
async function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getCardsForSet(setId){
  const key = 'cache_cards_v11_' + setId; // v3->v4: JP rarity; v4->v5: pokemontcg.io image fallback; v5->v6: fixed fallback to use English name; v6->v7: curated Trainer names; v7->v8: dexId-based fallback; v8->v9: empty-result handling fix; v9->v10: added PokéWallet native-JP-art fallback; v10->v11: fixed fallback order so PokéWallet actually runs instead of being pre-empted by the English TCGdex asset
  const cached = store.get(key);
  if(cached && Date.now() - cached.t < 1000*60*60*24*7) return cached.data;
  if (setId.startsWith('jp-')) {
    const realId = setId.slice(3);
    try{
      const res = await fetchWithTimeout(`https://api.tcgdex.net/v2/ja/sets/${realId}`);
      if(!res.ok) throw new Error('tcgdex ja set ' + res.status);
      const setData = await res.json();
      const jaCards = setData.cards || [];

      // TCGdex uses ONE shared set id across every locale (the "ja" and
      // "en" releases of realId are the same underlying set object) but
      // stores each locale's scans as separate assets. Older/niche JP
      // sets often never had their own ja/ image assets contributed
      // (tcgdex's own FAQ: "if a card has no image field, the image has
      // not yet been added to the database"), even though the identical
      // card usually got an English asset uploaded. So for any card
      // missing a ja image, fall back to the English asset for the same
      // set id + localId — same artwork, not a different card.
      let enByLocalId = {};
      let enNameByLocalId = {};
      if (jaCards.some(c => !c.image)) {
        try {
          const enRes = await fetchWithTimeout(`https://api.tcgdex.net/v2/en/sets/${realId}`);
          if (enRes.ok) {
            const enData = await enRes.json();
            for (const ec of (enData.cards || [])) {
              if (!ec.localId) continue;
              if (ec.image) enByLocalId[ec.localId] = ec.image;
              if (ec.name) enNameByLocalId[ec.localId] = ec.name; // English name, even when this locale also has no image — needed below since c.name is Japanese and pokemontcg.io is English-only
            }
          }
        } catch (e) { /* no English release of this set either — fine, just no fallback */ }
      }

      // PokéWallet: one set-level lookup (not per-card) for cards still
      // missing an image after both TCGdex locales. Best-effort — see
      // pokeWalletCardsForSet's comment — an empty result here just means
      // this tier contributes nothing and the existing fallbacks below
      // still run.
      let pokeWalletByNumber = {};
      if (jaCards.some(c => !c.image)) {
        try { pokeWalletByNumber = await pokeWalletCardsForSet(realId); } catch (e) { /* stays empty */ }
      }

      // BUGFIX: the /sets/{id} endpoint (used above for jaCards) only ever
      // returns CardBrief objects — id/localId/name/image, no `rarity` field
      // at all (confirmed against TCGdex's own schema docs). So `c.rarity`
      // below was silently always undefined for every JP card, every JP
      // card fell into the "common" tier, and generatePack() never had a
      // holo/rare/etc. pool to pull from — JP packs were always flat with
      // no chase hits, unlike English packs (which come from the
      // pokemontcg.io /cards endpoint that does include rarity per card).
      // Real rarity only exists on the full Card object, which requires a
      // per-card GET. Fetch those in small concurrent batches and cache
      // the merged result for the same week-long TTL as everything else
      // here, so this cost is paid once per set, not per pack opened.
      const rarityByCardId = {};
      const dexIdByCardId = {}; // locale-independent Pokédex number, captured here for free — used below for the quaternary image fallback since it doesn't require any English name/translation
      // Raised from 8: for a 60-card set this was 8 sequential rounds of
      // up to 8s each in the worst case (and this same constant gates
      // every fallback layer below too, so a slow set could chain
      // several such waits back to back before ever opening). Timeout
      // shortened to match, so one stalled connection doesn't dominate.
      const CONCURRENCY = 16;
      let cursor = 0;
      async function rarityWorker() {
        while (cursor < jaCards.length) {
          const c = jaCards[cursor++];
          try {
            const cRes = await fetchWithTimeout(`https://api.tcgdex.net/v2/ja/cards/${c.id}`, 6000);
            if (cRes.ok) {
              const full = await cRes.json();
              if (full && full.rarity) rarityByCardId[c.id] = full.rarity;
              if (full && Array.isArray(full.dexId) && full.dexId.length) dexIdByCardId[c.id] = full.dexId[0];
            }
          } catch (e) { /* leave unset — falls back to English rarity below, then Common */ }
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jaCards.length) }, rarityWorker));

      // A handful of niche JP cards never got their own ja/ card record
      // filled in (same "not yet added to the database" gap as images).
      // Same card, same print — the English release's rarity is a safe
      // fallback for those, matched by localId like the image fallback above.
      const missingRarity = jaCards.filter(c => !rarityByCardId[c.id]);
      if (missingRarity.length) {
        let enRarityByLocalId = {};
        try {
          const enSetRes = await fetchWithTimeout(`https://api.tcgdex.net/v2/en/sets/${realId}`);
          if (enSetRes.ok) {
            const enSetData = await enSetRes.json();
            const enBriefs = enSetData.cards || [];
            let ecursor = 0;
            async function enRarityWorker() {
              while (ecursor < enBriefs.length) {
                const ec = enBriefs[ecursor++];
                if (!missingRarity.some(c => c.localId === ec.localId)) continue;
                try {
                  const ecRes = await fetchWithTimeout(`https://api.tcgdex.net/v2/en/cards/${ec.id}`, 6000);
                  if (ecRes.ok) {
                    const enFull = await ecRes.json();
                    if (enFull && enFull.rarity) enRarityByLocalId[ec.localId] = enFull.rarity;
                  }
                } catch (e) { /* offline */ }
              }
            }
            await Promise.all(Array.from({ length: Math.min(CONCURRENCY, enBriefs.length) }, enRarityWorker));
          }
        } catch (e) { /* offline — these stay Common, same as before the fix */ }
        for (const c of missingRarity) {
          if (enRarityByLocalId[c.localId]) rarityByCardId[c.id] = enRarityByLocalId[c.localId];
        }
      }

      // POKÉWALLET IMAGE FALLBACK: native Japanese art, so this takes
      // priority over the pokemontcg.io tiers below when matched.
      // BUGFIX (caught before shipping): this used to eagerly fetch and
      // bake a blob: URL directly into `data` here. Blob URLs only live
      // for the current page session — persisting one into the 7-day
      // localStorage cache would work once, then silently break on every
      // reload after. Instead, store a stable synthetic URL
      // (pokewallet://images/{id}) and let it resolve lazily through
      // ImgCache.get() at the same prefetch step every other image
      // source here already goes through — ImgCache special-cases that
      // scheme below to attach the required auth header. This is also
      // strictly better for the rate limit: it only spends a PokéWallet
      // call on cards that actually get drawn into an opened pack, not
      // every missing-image card in the whole set (a set can have far
      // more cards than the ~10 that end up in any one pack).
      const pokeWalletImgByCardId = {};
      for (const c of jaCards) {
        // Only skip when TCGdex already has the *native ja* asset — a card
        // having an English asset should NOT block a Japanese-art lookup,
        // otherwise PokéWallet (the actual JP-art source) never runs for
        // any card TCGdex has English-localized, which is most of them.
        if (c.image) continue;
        const pwId = pokeWalletByNumber[normCardNum(c.localId)];
        if (pwId) pokeWalletImgByCardId[c.id] = `pokewallet://images/${pwId}`;
      }

      // TERTIARY IMAGE FALLBACK: a card can still have no image here if
      // TCGdex has neither a ja/ nor an en/ asset for it (genuinely never
      // contributed — same FAQ gap noted above). pokemontcg.io indexes
      // English prints from a separate pipeline and frequently has art
      // for cards TCGdex is still missing.
      //
      // BUGFIX: this used to search pokemontcg.io (English-only) using
      // c.name directly — but c.name here is the Japanese name (e.g.
      // "基本草エネルギー"), which can never match an English database.
      // That silently made this whole fallback a no-op for every card
      // whose TCGdex en/ record also had no image, which is exactly the
      // "Image Unavailable" case it was meant to catch. Now it looks up
      // an actual English name first — from TCGdex's own en/ locale data
      // (enNameByLocalId, captured above independently of whether that
      // locale had an image) — and only falls back to the small hardcoded
      // JP energy map below for the handful of ancient sets where TCGdex
      // has no en/ record at all for that localId. If neither resolves to
      // an English name, there's nothing safe to search with, so that
      // card is skipped rather than querying with Japanese text.
      const JP_ENERGY_NAME_EN = {
        '基本草エネルギー': 'Grass Energy', '草エネルギー': 'Grass Energy',
        '基本炎エネルギー': 'Fire Energy', '炎エネルギー': 'Fire Energy',
        '基本水エネルギー': 'Water Energy', '水エネルギー': 'Water Energy',
        '基本雷エネルギー': 'Lightning Energy', '雷エネルギー': 'Lightning Energy',
        '基本超エネルギー': 'Psychic Energy', '超エネルギー': 'Psychic Energy',
        '基本闘エネルギー': 'Fighting Energy', '闘エネルギー': 'Fighting Energy',
        '基本悪エネルギー': 'Darkness Energy', '悪エネルギー': 'Darkness Energy',
        '基本鋼エネルギー': 'Metal Energy', '鋼エネルギー': 'Metal Energy',
        '基本フェアリーエネルギー': 'Fairy Energy', 'フェアリーエネルギー': 'Fairy Energy',
      };
      // Classic Trainer/Item cards get reprinted with identical names and
      // art across dozens of vintage Japan-only sets, so a small curated
      // list here closes a disproportionate share of the remaining gap —
      // e.g. "ポケモンいれかえ" (Switch) shows up in nearly every early
      // set. Kept short and high-confidence on purpose: a wrong pairing
      // here would show the wrong card's art, which is worse than the
      // "Image Unavailable" placeholder it's replacing.
      const JP_TRAINER_NAME_EN = {
        'ポケモンいれかえ': 'Switch',
        'キズぐすり': 'Potion',
        'スーパーポーション': 'Super Potion',
        'どくけし': 'Antidote',
        'ふしぎなアメ': 'Rare Candy',
        '全回復': 'Full Heal',
        'ポケモンセンター': 'Pokémon Center',
        'ポケモントレーダー': 'Pokémon Trader',
        'エネルギー回収': 'Energy Retrieval',
        'プラスパワー': 'PlusPower',
        '退化スプレー': 'Devolution Spray',
        'コンピュータサーチ': 'Computer Search',
        'エネルギーさがし': 'Energy Search',
      };
      function englishNameFor(c) {
        return enNameByLocalId[c.localId] || JP_ENERGY_NAME_EN[c.name] || JP_TRAINER_NAME_EN[c.name] || null;
      }
      const stillMissingImg = jaCards.filter(c => !c.image && !pokeWalletImgByCardId[c.id] && !enByLocalId[c.localId] && englishNameFor(c));
      let pokeImgByName = {};
      if (stillMissingImg.length) {
        const uniqueNames = [...new Set(stillMissingImg.map(c => englishNameFor(c)))];
        let pcursor = 0;
        async function pokeImgWorker() {
          while (pcursor < uniqueNames.length) {
            const nm = uniqueNames[pcursor++];
            try {
              const pRes = await pokeFetch(`/cards?q=${encodeURIComponent('name:"' + nm + '"')}&pageSize=1`);
              const hit = pRes?.data?.[0];
              if (hit?.images?.large) pokeImgByName[nm] = { small: hit.images.small || hit.images.large, large: hit.images.large };
            } catch (e) { /* offline, not found, or rate-limited — card stays without art */ }
          }
        }
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, uniqueNames.length) }, pokeImgWorker));
      }

      // QUATERNARY IMAGE FALLBACK: this is the one that actually closes
      // most of the remaining gap. Every Pokémon-type card (not
      // Trainer/Energy) carries a dexId — the National Pokédex number —
      // and that number means the same thing in every language, with no
      // translation needed. So even for the earliest Japan-only sets that
      // predate any international release (no en/ set to fall back to at
      // all, no curated name to match on), this can still ask
      // pokemontcg.io for "any card of Pokédex #X" and get real official
      // art of that Pokémon. It won't necessarily be the exact same
      // print/illustration as the JP card, but it's genuine art of the
      // right Pokémon rather than a placeholder — and dexId was already
      // fetched for free above (same request that got rarity), so this
      // costs no extra calls to TCGdex, only the pokemontcg.io lookups.
      const stillNoImage = jaCards.filter(c => {
        if (c.image || pokeWalletImgByCardId[c.id] || enByLocalId[c.localId]) return false;
        const enName = englishNameFor(c);
        return !(enName && pokeImgByName[enName]);
      });
      const dexIdCandidates = stillNoImage.filter(c => dexIdByCardId[c.id]);
      let pokeImgByDexId = {};
      if (dexIdCandidates.length) {
        const uniqueDexIds = [...new Set(dexIdCandidates.map(c => dexIdByCardId[c.id]))];
        let dcursor = 0;
        async function dexImgWorker() {
          while (dcursor < uniqueDexIds.length) {
            const dexId = uniqueDexIds[dcursor++];
            try {
              const pRes = await pokeFetch(`/cards?q=${encodeURIComponent('nationalPokedexNumbers:' + dexId)}&pageSize=1`);
              const hit = pRes?.data?.[0];
              if (hit?.images?.large) pokeImgByDexId[dexId] = { small: hit.images.small || hit.images.large, large: hit.images.large };
            } catch (e) { /* offline, not found, or rate-limited — card stays without art */ }
          }
        }
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, uniqueDexIds.length) }, dexImgWorker));
      }

      // BUGFIX: a successful (200 OK) response with a real-but-empty
      // cards array was being cached and returned as if it were valid
      // data. generatePack() then had nothing to pick from, every slot
      // came back undefined, and pack.filter(p=>p.card) stripped them
      // all out — the "Card 1/0" broken rip. An empty set is exactly as
      // unusable as a failed fetch, so treat it the same way: don't
      // cache it (a transient/partial TCGdex response shouldn't poison
      // this set for a week), prefer stale cache if there is any, and
      // otherwise throw so the caller shows a real error instead of
      // silently opening a 0-card pack.
      if (!jaCards.length) {
        if (cached) return cached.data;
        throw new Error('tcgdex ja set ' + realId + ' returned zero cards');
      }

      const data = jaCards.map(c => {
        // Priority: native ja asset > PokéWallet native JP art > TCGdex en
        // asset > pokemontcg.io name match > pokemontcg.io dexId match.
        // PokéWallet must be checked before the en fallback, not after —
        // otherwise a card with an English asset but no ja asset always
        // wins on img and PokéWallet (the real JP-art source) never runs.
        const pwUrl = !c.image ? pokeWalletImgByCardId[c.id] : null;
        const img = c.image || (pwUrl ? '' : enByLocalId[c.localId]) || '';
        const pokeFallback = (!img && !pwUrl) ? (pokeImgByName[englishNameFor(c)] || pokeImgByDexId[dexIdByCardId[c.id]]) : null;
        return {
          id: 'jp-' + c.id,
          name: c.name,
          rarity: rarityByCardId[c.id] || '',
          images: pwUrl ? {
            small: pwUrl,
            large: pwUrl,
          } : pokeFallback ? {
            small: pokeFallback.small,
            large: pokeFallback.large,
          } : {
            small: img ? img + '/low.webp' : '',
            large: img ? img + '/high.webp' : '',
          },
          set: { name: setData.name || realId },
        };
      });
      store.set(key, { t: Date.now(), data });
      return data;
    }catch(e){
      if(cached) { toast('Showing cached cards — live data unavailable'); return cached.data; }
      throw e;
    }
  }
  try{
    const raw = await pokeFetch(`/cards?q=set.id:${setId}&pageSize=250`);
    const rawCards = raw.data || [];
    if (!rawCards.length) {
      if (cached) return cached.data;
      throw new Error('pokemontcg.io set ' + setId + ' returned zero cards');
    }
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
async function loadProfile(attempt=1){
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if(error){
    if(error.code === 'PGRST116' && attempt === 1){
      const { error: insertErr } = await sb.from('profiles').insert({
        id: session.user.id,
        credits: CONFIG.ECONOMY.STARTING_CREDITS,
      });
      if(!insertErr) return loadProfile(attempt+1);
      console.error('loadProfile: could not provision new profile row:', insertErr);
    }
    console.error('loadProfile failed:', error);
    if(attempt < 3){
      await new Promise(r=>setTimeout(r, attempt*1000));
      return loadProfile(attempt+1);
    }
    return;
  }
  {
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
function scopedKey(base){
  const uid = (!guestMode && session?.user?.id) ? session.user.id : 'guest';
  return base + '__' + uid;
}

function getCollectionsMap() {
  let map = store.get(scopedKey('user_collections'), null);
  if (!map || typeof map !== 'object') {
    const legacy = guestMode ? store.get('collection', null) : null;
    map = { 'Main Collection': legacy || {} };
    store.set(scopedKey('user_collections'), map);
  }
  return map;
}

function getActiveCollectionName() {
  const map = getCollectionsMap();
  let active = store.get(scopedKey('active_collection'), null);
  if (!active || !map[active]) {
    active = Object.keys(map)[0] || 'Main Collection';
    store.set(scopedKey('active_collection'), active);
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
  store.set(scopedKey('user_collections'), map);
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
      bar.querySelector('#logout-btn').addEventListener('click', async (e)=> {
          const btn = e.currentTarget;
          if(btn.dataset.busy === '1') return;
          btn.dataset.busy = '1';
          const origText = btn.textContent;
          btn.textContent = '...';
          try {
            await sb.auth.signOut();
          } catch(err) {
            console.error('signOut failed:', err);
          } finally {
            session = null;
            profile = null;
            guestMode = true;
            render('home');
          }
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
              <img src="${item.card_image || ''}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'" style="width:44px; height:62px; object-fit:cover; border-radius:4px; margin-right:12px;" />
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
          item.innerHTML = `<img src="${c.image}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/><span class="count">×${c.count}</span>`;
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

         const tradeBtn = el('button','btn btn-primary','🤝 Propose Trade');
         tradeBtn.style.cssText = 'width:100%; margin-top:12px;';
         tradeBtn.addEventListener('click', ()=> openTradeBuilder(targetUserId, username, coll));
         wrap.appendChild(tradeBtn);
     }
  } catch(err) {
     grid.innerHTML = '<div class="hint" style="grid-column:1/-1; color:var(--danger)">Error loading user collection.</div>';
  }
}

async function openTradeBuilder(targetUserId, username, theirColl){
  if(!session){ toast('Log in to trade'); return; }
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });

  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>Trade with ${username || 'this collector'}</h2>
    <div class="sub">Tap one card you'll give, then one card you want back. Quantity is 1-for-1 for now.</div>
    <div style="margin-top:14px;">
      <div style="font-weight:700; font-size:13px; margin-bottom:6px;">Your card to offer</div>
      <div class="collection-grid" id="my-trade-grid" style="max-height:160px; overflow-y:auto;"><div class="hint">Loading your collection…</div></div>
    </div>
    <div style="margin-top:16px;">
      <div style="font-weight:700; font-size:13px; margin-bottom:6px;">Their card you want</div>
      <div class="collection-grid" id="their-trade-grid" style="max-height:160px; overflow-y:auto;"></div>
    </div>
    <button class="btn btn-primary" id="send-trade-btn" style="width:100%; margin-top:16px;" disabled>Select a card from each side</button>
    <div class="hint" id="trade-err" style="color:#ff6b6b; text-align:center; min-height:14px; margin-top:8px;"></div>
  `;

  let myCard = null, theirCard = null;
  const sendBtn = $('#send-trade-btn', sheet);
  const errBox = $('#trade-err', sheet);
  function refreshSendBtn(){
    if(myCard && theirCard){ sendBtn.disabled = false; sendBtn.textContent = 'Send Trade Offer'; }
    else { sendBtn.disabled = true; sendBtn.textContent = 'Select a card from each side'; }
  }

  const theirGrid = $('#their-trade-grid', sheet);
  const theirKeys = Object.keys(theirColl || {});
  if(!theirKeys.length){
    theirGrid.innerHTML = '<div class="hint">They have no cards to trade yet.</div>';
  } else {
    theirGrid.innerHTML = '';
    theirKeys.forEach(id=>{
      const c = theirColl[id];
      const item = el('div','coll-item');
      item.style.cursor = 'pointer';
      item.innerHTML = `<img src="${c.image}" onerror="this.style.opacity=0.3"/><span class="count">×${c.count}</span>`;
      item.addEventListener('click', ()=>{
        theirGrid.querySelectorAll('.coll-item').forEach(n=>n.style.outline='');
        item.style.outline = '2px solid var(--cyan)';
        theirCard = { id, name:c.name, image:c.image, rarity:c.rarity, qty:1 };
        refreshSendBtn();
      });
      theirGrid.appendChild(item);
    });
  }

  const myGrid = $('#my-trade-grid', sheet);
  try{
    const { data: myColl, error } = await sb.rpc('get_user_collection', { p_user: session.user.id });
    if(error) throw error;
    if(!myColl || !myColl.length){
      myGrid.innerHTML = '<div class="hint">You don\'t have any tradeable cards yet — open a pack first.</div>';
    } else {
      myGrid.innerHTML = '';
      myColl.forEach(c=>{
        const item = el('div','coll-item');
        item.style.cursor = 'pointer';
        item.innerHTML = `<img src="${c.image}" onerror="this.style.opacity=0.3"/><span class="count">×${c.count}</span>`;
        item.addEventListener('click', ()=>{
          myGrid.querySelectorAll('.coll-item').forEach(n=>n.style.outline='');
          item.style.outline = '2px solid var(--gold)';
          myCard = { id:c.card_id, name:c.name, image:c.image, rarity:c.rarity, qty:1 };
          refreshSendBtn();
        });
        myGrid.appendChild(item);
      });
    }
  }catch(e){
    myGrid.innerHTML = '<div class="hint" style="color:var(--danger)">Could not load your collection. Try again.</div>';
  }

  sendBtn.addEventListener('click', async ()=>{
    if(!myCard || !theirCard) return;
    sendBtn.disabled = true; sendBtn.textContent = 'Sending…'; errBox.textContent = '';
    try{
      const { error } = await sb.rpc('propose_trade', {
        p_to_user: targetUserId,
        p_offer_cards: [myCard],
        p_request_cards: [theirCard]
      });
      if(error) throw error;
      overlay.remove();
      toast('Trade offer sent!');
    }catch(e){
      errBox.textContent = e.message?.includes('you_do_not_have_enough') ? "You don't have that card anymore." : (e.message || 'Could not send trade.');
      sendBtn.disabled = false; sendBtn.textContent = 'Send Trade Offer';
    }
  });
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

  let activeHomeTab = store.get('active_home_tab') || 'pkmn_en';
  const tabsWrap = el('div');
  tabsWrap.style.cssText = 'display:flex; gap:8px; overflow-x:auto; margin-bottom:16px; padding-bottom:4px; scrollbar-width: none;';
  const tabs = [
    { id: 'pkmn_en', label: 'Pokémon (EN)' },
    { id: 'pkmn_jp', label: 'Pokémon (JP)' },
    { id: 'onepiece', label: 'One Piece' },
    { id: 'mtg', label: 'Magic: The Gathering' }
  ];

  tabs.forEach(t => {
    const btn = el('button', activeHomeTab === t.id ? 'btn btn-primary' : 'btn btn-secondary');
    btn.textContent = t.label;
    btn.style.flexShrink = '0';
    btn.addEventListener('click', () => {
        store.set('active_home_tab', t.id);
        render('home');
    });
    tabsWrap.appendChild(btn);
  });
  setsWrap.appendChild(tabsWrap);

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
    const allSets = await getSets();
    let displaySets = [];

    if (activeHomeTab === 'pkmn_en') {
        displaySets = allSets.filter(s => !s.id.startsWith('jp-'));
    } else if (activeHomeTab === 'pkmn_jp') {
        displaySets = allSets.filter(s => s.id.startsWith('jp-'));
    } else if (activeHomeTab === 'onepiece') {
        displaySets = [
            { id: 'op-01', name: 'Romance Dawn', series: 'One Piece', total: 121, packCost: 150, isPlaceholder: true, images: { logo: '' } },
            { id: 'op-02', name: 'Paramount War', series: 'One Piece', total: 121, packCost: 150, isPlaceholder: true, images: { logo: '' } },
            { id: 'op-03', name: 'Pillars of Strength', series: 'One Piece', total: 127, packCost: 150, isPlaceholder: true, images: { logo: '' } }
        ];
    } else if (activeHomeTab === 'mtg') {
        displaySets = [
            { id: 'mtg-alpha', name: 'Alpha', series: 'Magic: The Gathering', total: 295, packCost: 250, isPlaceholder: true, images: { logo: '' } },
            { id: 'mtg-beta', name: 'Beta', series: 'Magic: The Gathering', total: 302, packCost: 200, isPlaceholder: true, images: { logo: '' } },
            { id: 'mtg-arabian', name: 'Arabian Nights', series: 'Magic: The Gathering', total: 78, packCost: 200, isPlaceholder: true, images: { logo: '' } }
        ];
    }

    grid.innerHTML = '';
    
    if (activeHomeTab === 'pkmn_en' || activeHomeTab === 'pkmn_jp') {
        Prewarm.start(displaySets);
    }

    const CONCURRENCY = 5;
    const tasks = displaySets.map(s => async () => {
      const card = el('div','set-card');
      const costDisplay = s.packCost || 150;
      
      card.innerHTML = `<img src="" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg=='" alt=""/><div class="name">${s.name}</div><div class="meta">${s.series} · ${costDisplay} cr</div>`;
      
      card.addEventListener('click', ()=> {
          if (s.isPlaceholder) {
              toast(`${s.series} is coming soon!`);
          } else {
              render('set', { set: s });
          }
      });
      grid.appendChild(card);

      if (s.isPlaceholder) return; 

      const imgEl = card.querySelector('img');
      if (!imgEl) return;
      const FALLBACK_SRC = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==';
      try {
        const candidates = await Prewarm.resolvePackArtUrls(s);
        for (const url of candidates) {
          const src = await ImgCache.get(url, true).catch(() => null);
          if (src) { imgEl.src = src; return; }
        }
      } catch (e) { /* fall through */ }
      if (s.images.symbol) {
        const src = await ImgCache.get(s.images.symbol, true).catch(() => null);
        if (src) { imgEl.src = src; return; }
      }
      // Every candidate failed — explicitly set the fallback instead of
      // leaving src="" (empty src never fires onerror, so it would show
      // the browser's native broken-image icon instead of our placeholder).
      imgEl.src = FALLBACK_SRC;
    });

    let next = 0;
    async function lane() {
      while (next < tasks.length) {
        const i = next++;
        await tasks[i]();
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, lane));

  } catch(e) {
    const msg = "Couldn't reach the card database — it can be flaky. Nothing was charged.";
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

    const rawUrls = await Prewarm.resolvePackArtUrls(setMeta);

    // BUGFIX: this used to await ImgCache.get() one URL at a time in a
    // serial for-loop. Even when every candidate was already cached from
    // the sets-grid thumbnail moments earlier (ImgCache's in-memory
    // blobUrls, same page session), awaiting them one after another still
    // stacks up real, visible latency across however many art candidates
    // a set has — which read as "it has to load it all over again" even
    // though nothing was actually re-downloaded over the network. Now
    // they resolve concurrently, and the (rare, genuine) case where art
    // truly isn't cached yet gets an honest "N of M loaded" readout
    // instead of the global bar's indeterminate animation, which never
    // reflected real progress for this or anything else in the app.
    const galleryWrap = $('#pack-gallery-wrap', wrap);
    let artProgress = null;
    if (rawUrls.length > 1) {
      artProgress = el('div', 'hint');
      artProgress.id = 'pack-art-progress';
      artProgress.style.cssText = 'margin-top:4px; margin-bottom:12px; color:var(--dim); text-align:center;';
      artProgress.textContent = `Loading pack art… 0 / ${rawUrls.length}`;
      if (galleryWrap) galleryWrap.appendChild(artProgress);
    }
    let loadedCount = 0;
    const resolvedOrUndef = await Promise.all(rawUrls.map(async (url) => {
      try {
        const resolved = await ImgCache.get(url, true);
        loadedCount++;
        if (artProgress) artProgress.textContent = `Loading pack art… ${loadedCount} / ${rawUrls.length}`;
        return resolved || undefined;
      } catch (err) {
        loadedCount++;
        if (artProgress) artProgress.textContent = `Loading pack art… ${loadedCount} / ${rawUrls.length}`;
        return undefined;
      }
    }));
    if (artProgress) artProgress.remove();
    const validUrls = resolvedOrUndef.filter(Boolean);

    const uniqueValidUrls = [...new Set(validUrls)];
    gallery.innerHTML = '';
    const existingStatus = $('#pack-art-status', wrap);
    if (existingStatus) existingStatus.remove();

    if (uniqueValidUrls.length === 0) {
        const pa = el('div', 'pack-art is-fallback active');
        pa.innerHTML = `<div class="pack-art-bg" style="background: linear-gradient(135deg, #1e293b, #0f172a); display:flex; align-items:center; justify-content:center; text-align:center; padding:12px; font-weight:bold; color:var(--cyan);">${setMeta.name}</div><div class="pack-crimp top fallback-only"></div><div class="pack-crimp bottom fallback-only"></div>`;
        gallery.appendChild(pa);
        gallery.classList.add('single');
        setMeta.resolvedPackArt = null;
        const status = el('div', 'hint');
        status.id = 'pack-art-status';
        status.style.cssText = 'margin-top:4px; margin-bottom:12px; color:var(--dim);';
        status.textContent = `No pack art found for ${setMeta.name} yet — showing a placeholder.`;
        $('#pack-gallery-wrap', wrap).appendChild(status);
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
            hint.id = 'pack-art-status';
            hint.style.marginTop = '4px'; hint.style.marginBottom = '12px'; hint.style.fontWeight = '600'; hint.style.color = 'var(--cyan)';
            hint.textContent = '← Swipe & tap to choose pack art →';
            $('#pack-gallery-wrap', wrap).appendChild(hint);
        } else {
            const status = el('div', 'hint');
            status.id = 'pack-art-status';
            status.style.cssText = 'margin-top:4px; margin-bottom:12px; color:var(--dim);';
            status.textContent = `Pack art loaded for ${setMeta.name}.`;
            $('#pack-gallery-wrap', wrap).appendChild(status);
        }
    }

  }catch(e){
    const status = el('div', 'hint');
    status.id = 'pack-art-status';
    status.style.cssText = 'margin-top:4px; margin-bottom:12px; color:var(--danger);';
    status.textContent = /zero cards/.test(e?.message || '')
      ? `This set has no cards available yet — try another set.`
      : `Couldn't load pack art (network issue) — retry by reopening this set.`;
    const galleryWrap = $('#pack-gallery-wrap', wrap);
    if (galleryWrap) galleryWrap.appendChild(status);
  }
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
  window.__packOpenInFlight = true;
  try{
    // BUGFIX: `[] || X` never reaches X — an empty array is truthy in JS.
    // If setDetailCardsCache had ever ended up empty for this set (see
    // the getCardsForSet fix below for why that could happen), this line
    // would silently reuse that empty result forever for the rest of the
    // page session, never retrying getCardsForSet even once. That's the
    // direct cause of the "Card 1/0" broken rip — generatePack() got an
    // empty card list and every pickFrom() call returned undefined.
    const cachedOk = setDetailCardsCacheSetId === setMeta.id && setDetailCardsCache && setDetailCardsCache.length > 0;
    const cards = cachedOk ? setDetailCardsCache : await getCardsForSet(setMeta.id);
    if (!cards || !cards.length) {
      toast("This set has no cards available yet — try another set.", 6000);
      if (btn) { btn.disabled = false; btn.textContent = isAdminUser() ? `Open ${qty} Pack${qty > 1 ? 's' : ''} (Admin)` : `Open ${qty} Pack${qty > 1 ? 's' : ''} — ${totalCost.toLocaleString()} cr`; }
      window.__packOpenInFlight = false;
      return;
    }

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
    window.__packOpenInFlight = false;
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
      <div class="reveal-progress" id="prog">Card 1 / ${pack.cards.length}<span class="pct" id="prog-pct">0%</span></div>
      <button class="close-x" id="close-reveal">✕</button>
    </div>
    <div class="stage"><div class="flipcard" id="flipcard">
      <div class="face back"></div>
      <div class="face front"><img id="front-img" src="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%2394a3b8%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2214%22%3EImage Unavailable%3C/text%3E%3C/svg%3E'" alt=""/><div class="tier-badge" id="tier-badge"></div></div>
    </div></div>
    <div class="card-name" id="card-name">&nbsp;</div>
    <div class="card-sub" id="card-sub">&nbsp;</div>
    <div id="buy-slot"></div>
    <div class="dots" id="dots"></div>
    <div class="reveal-progress-track"><div class="reveal-progress-fill" id="prog-fill"></div></div>
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
      const progPct = el('span','pct'); progPct.id='prog-pct'; progPct.textContent = `${Math.round((i/pack.cards.length)*100)}%`;
      $('#prog', screen).appendChild(progPct);
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
      const doneCount = i + 1;
      const pct = Math.round((doneCount / pack.cards.length) * 100);
      const fill = $('#prog-fill', screen);
      if(fill){ fill.style.width = pct + '%'; if(doneCount >= pack.cards.length) fill.classList.add('done'); }
      const pctEl = $('#prog-pct', screen);
      if(pctEl) pctEl.textContent = doneCount >= pack.cards.length ? 'All revealed ✓' : `${pct}%`;
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
    mini.innerHTML = `<img src="${ImgCache.sync(p.card.images.small)}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/>`;
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
      mini.innerHTML = `<img src="${ImgCache.sync(p.card.images.small)}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/>`;
      mini.addEventListener('click', ()=> showCardFullscreen(ImgCache.sync(p.card.images.large || p.card.images.small), p.card));
      grid.appendChild(mini);
    });
  }

  burstConfetti(100);
  SFX.chase();

  $('#bulk-sum-close', sheet).addEventListener('click', ()=>{ overlay.remove(); render('home'); });
}

/* ============================================================
   Collections View
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
    store.set(scopedKey('active_collection'), e.target.value);
    render('collection');
  });

  $('#new-collection-btn', wrap).addEventListener('click', () => {
    const bName = prompt('Enter a name for the new collection:');
    if(!bName || !bName.trim()) return;
    const name = bName.trim();
    if(map[name]) { toast('Collection already exists'); return; }
    map[name] = {};
    store.set(scopedKey('user_collections'), map);
    store.set(scopedKey('active_collection'), name);
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
    store.set(scopedKey('user_collections'), map);
    store.set(scopedKey('active_collection'), trimmed);
    render('collection');
    toast('Collection renamed successfully');
  });

  $('#clear-coll-btn', wrap).addEventListener('click', () => {
    if(!Object.keys(coll).length) { toast('Collection is already empty'); return; }
    if(!confirm(`Are you sure you want to clear all cards from collection "${activeName}"?`)) return;
    map[activeName] = {};
    store.set(scopedKey('user_collections'), map);
    render('collection');
    toast(`Cleared all cards from "${activeName}"`);
  });

  $('#delete-collection-btn', wrap).addEventListener('click', () => {
    if(Object.keys(map).length <= 1) { toast('Cannot delete your last remaining collection'); return; }
    if(!confirm(`Are you sure you want to permanently delete collection "${activeName}" and all its cards?`)) return;
    delete map[activeName];
    store.set(scopedKey('user_collections'), map);
    store.set(scopedKey('active_collection'), Object.keys(map)[0]);
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
        store.set(scopedKey('user_collections'), map);
        store.set(scopedKey('active_collection'), uniqueName);
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
      item.innerHTML = `<img src="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/><span class="count">×${c.count}</span>`;
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
   Trading Hub
   ============================================================ */
function renderTrade(){
  const wrap = el('div');
  wrap.innerHTML = `<div class="section-title">Trade Hub</div><div id="trade-list"></div>`;
  app.appendChild(wrap);
  const list = $('#trade-list', wrap);

  if(guestMode || !session){
    list.innerHTML = `<div class="account-card"><p class="hint">Log in to trade cards with other collectors — guest collections aren't saved to an account, so there's nothing to trade from.</p></div>`;
    return;
  }

  list.innerHTML = '<div class="hint">Loading your trade offers…</div>';
  loadTrades();

  async function loadTrades(){
    try{
      const { data, error } = await sb.rpc('my_pending_trades');
      if(error) throw error;
      if(!data || !data.length){
        list.innerHTML = `<div class="account-card"><p class="hint">No pending trades. Find a collector under Search, open their collection, and tap "Propose Trade" to start one.</p></div>`;
        return;
      }
      list.innerHTML = '';
      data.forEach(t=>{
        const incoming = t.to_user === session.user.id;
        const card = el('div','account-card'); card.style.marginBottom = '10px';
        const offer = t.offer_cards[0], request = t.request_cards[0];
        card.innerHTML = `
          <div style="font-size:12px; color:var(--dim); margin-bottom:6px;">${incoming ? 'Offer to you' : 'Your pending offer'}</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${offer?.image||''}" style="width:48px;height:67px;object-fit:cover;border-radius:6px;" onerror="this.style.opacity=0.3"/>
            <span style="color:var(--dim); font-size:18px;">⇄</span>
            <img src="${request?.image||''}" style="width:48px;height:67px;object-fit:cover;border-radius:6px;" onerror="this.style.opacity=0.3"/>
            <div style="flex:1; font-size:12.5px; color:var(--dim);">
              ${incoming ? `Gives you <b style="color:var(--text)">${offer?.name}</b> for your <b style="color:var(--text)">${request?.name}</b>` : `You offered <b style="color:var(--text)">${offer?.name}</b> for their <b style="color:var(--text)">${request?.name}</b>`}
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            ${incoming ? `<button class="btn btn-primary accept-btn" style="flex:1;">Accept</button><button class="btn btn-secondary decline-btn" style="flex:1;">Decline</button>`
                       : `<button class="btn btn-secondary cancel-btn" style="flex:1;">Cancel Offer</button>`}
          </div>
        `;
        if(incoming){
          card.querySelector('.accept-btn').addEventListener('click', async (e)=>{
            e.target.disabled = true; e.target.textContent = '...';
            try{ const { error } = await sb.rpc('respond_trade', { p_trade_id: t.id, p_accept: true }); if(error) throw error; toast('Trade complete!'); loadTrades(); }
            catch(err){ toast(err.message || 'Could not accept trade'); e.target.disabled = false; e.target.textContent = 'Accept'; }
          });
          card.querySelector('.decline-btn').addEventListener('click', async (e)=>{
            e.target.disabled = true;
            try{ await sb.rpc('respond_trade', { p_trade_id: t.id, p_accept: false }); loadTrades(); }
            catch(err){ toast('Could not decline trade'); e.target.disabled = false; }
          });
        } else {
          card.querySelector('.cancel-btn').addEventListener('click', async (e)=>{
            e.target.disabled = true;
            try{ await sb.rpc('cancel_trade', { p_trade_id: t.id }); loadTrades(); }
            catch(err){ toast('Could not cancel trade'); e.target.disabled = false; }
          });
        }
        list.appendChild(card);
      });
    }catch(e){
      list.innerHTML = `<div class="hint" style="color:var(--danger)">Couldn't load trades. <button class="btn btn-secondary" id="retry-trades" style="margin-top:8px;">Retry</button></div>`;
      $('#retry-trades', list)?.addEventListener('click', loadTrades);
    }
  }
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
      const { data: sessData } = await sb.auth.getSession();
      session = sessData.session;
      if(!session){ throw new Error('signed_out'); }
      if(!profile || profile.id !== session.user.id) await loadProfile();
      if(!profile) throw new Error('profile_unavailable');

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
    const msg = e?.message || e?.error_description || e?.code || 'unknown error';
    if(msg === 'signed_out'){
      toast('Your session expired — please sign in again');
    } else if(msg === 'profile_unavailable'){
      toast('Could not load your account — try again in a moment');
    } else {
      toast(msg === 'already_claimed' ? 'Already claimed for this platform' : `Could not claim bonus (${msg}) — try again`);
    }
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
