/* ============================================================
   CONFIG — fill these in with your own project values.
   No real-money purchase paths exist in this app. Premium/VIP
   status is admin-granted only (see admin panel) and carries no
   price — it's a cosmetic status, not something users can buy.
   ============================================================ */
const CONFIG = {
  // Tip jar (see renderProfile() for where this is surfaced). Point
  // this at an external donation page — Ko-fi, Buy Me a Coffee,
  // GitHub Sponsors, a PayPal.me link, a Stripe Payment Link, etc. —
  // NOT at anything this app processes itself. Leave it '' to hide the
  // tip jar entirely (the default; nothing shows until you set this).
  //
  // Not legal advice, but the design choice worth being deliberate
  // about: this app opens randomized packs with a virtual currency —
  // exactly the mechanic several jurisdictions (Belgium, Netherlands,
  // and increasing US state-level scrutiny) treat as gambling-adjacent
  // WHEN real money buys the randomized reward. This app doesn't do
  // that today (see the note above — credits aren't purchasable), and
  // a tip jar should never become the thing that quietly reintroduces
  // that risk. Concretely, for whatever page TIP_JAR_URL points to and
  // however it's worded:
  //   - It must grant ZERO in-app benefit — no credits, packs, cards,
  //     cosmetics, odds boosts, anything. A tip that affects app state
  //     in any way stops being a gift and starts looking like a
  //     purchase of loot-box-adjacent value.
  //   - Avoid quid-pro-quo language ("tip for more packs", "donate to
  //     unlock") even informally — keep it "support the developer",
  //     full stop.
  //   - Route through an established external processor (Ko-fi/BMC/
  //     Stripe Payment Links/PayPal.me) rather than handling payment
  //     details in this app — keeps PCI scope and payment-processing
  //     compliance entirely on their side, not this app's.
  //   - If this app is ever wrapped for an App Store / Play Store
  //     listing (vs. staying a web app), check their current policies
  //     on donation/tip links specifically — platforms sometimes
  //     require IAP for in-app monetization even when nothing is
  //     "purchased" in the traditional sense.
  TIP_JAR_URL: 'https://paypal.me/joshhawleyofficial',
  // Sovrn Commerce placement link, for their account-verification /
  // network-approval requirement. Real, visible, disclosed link on the
  // profile page (next to the tip jar) — NOT hidden or admin-only. A link
  // only you can see and click doesn't verify anything and reads as
  // self-referral fraud to any affiliate network; a real placement that
  // any visitor could click is the legitimate version of this.
  SOVRN_VERIFICATION_URL: 'https://sovrn.co/1hvs377',
  // Cloudflare Worker caching proxy in front of the "pokewallet-images"
  // Supabase Storage mirror bucket — see ImgCache._cacheKeyFor() below.
  // Supabase Storage alone serves from one region, so even a cache "hit"
  // is a real round-trip there for every user everywhere; this Worker
  // caches images at Cloudflare's edge (300+ locations) once requested,
  // free tier, no custom domain needed. Falls back to hitting Supabase
  // Storage directly if left empty, so this is safe to leave blank.
  CDN_IMAGE_BASE: 'https://chase-cards-img.joshhawleyofficial.workers.dev',
  // Cloudflare Worker edge-caching proxy in front of the two shared
  // Supabase read tables (set_card_cache, jp_set_filter_cache) — see
  // chase-cards-db-worker.js for the Worker code and setup steps.
  // Same idea as CDN_IMAGE_BASE above, applied to those table reads
  // instead of images: without this, every user's "has anyone already
  // resolved this set?" check is a direct round-trip to Supabase's one
  // region; with it, the first person anywhere to ask warms the
  // nearest edge location, and everyone near there after that gets an
  // edge-local answer. Leave blank and getSharedSetCache /
  // getJpFilterCacheBatch both fall back to calling Supabase directly —
  // safe to leave blank, this is purely a speed optimization.
  //
  // After deploying chase-cards-db-worker.js (see that file for setup
  // steps), paste its workers.dev URL here.
  CDN_DB_BASE: '',
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
  //
  // The actual API key is NOT here anymore — it used to be, which meant
  // it shipped to every browser and anyone could pull it from devtools
  // and burn the shared quota outside this app entirely. It now lives
  // server-side only, as a Supabase Edge Function secret (see
  // supabase/functions/pokewallet-proxy/). All PokéWallet calls go
  // through that function instead of hitting api.pokewallet.io directly
  // — see pokeWalletFetch() and ImgCache.get() below.
  //
  // IMPORTANT: the old key (pk_live_66aa02f9fbab0e5e98972538a417e4dd...)
  // was exposed client-side in every previously deployed build of this
  // app, so treat it as already compromised — rotate/revoke it in the
  // PokéWallet dashboard and set the new one via:
  //   supabase secrets set POKEWALLET_API_KEY=<new key>

  ECONOMY: {
    STARTING_CREDITS: 5000,
    GUEST_CREDITS: 2250,
    REFERRAL_BONUS: 25000,
    // "Rank" (not "Premium"/"Tier"): earned by opening packs/referring
    // friends — see TIER_LADDER below for labels/thresholds, the DB
    // column (profiles.premium_tier) keeps its existing name since
    // renaming a live column is a schema change, out of scope here.
    // Kept fully separate from `is_premium`, an admin-settable flag
    // that no longer has any badge/label of its own — it now only
    // drives the alternate pack-open flip effect (see 'premium-fx').
  },
};

/* ============================================================
   Tier ladder — single source of truth for the progress banner
   AND the "see all tiers" breakdown panel, so the thresholds
   below only ever need to be edited in one place.

   packs/referrals are the requirement to REACH that tier from
   the one before it. dailyBonus is the credit bonus/day once on
   that tier. "Rookie" (not "Free") for the base tier — every tier
   here is free/earned, never purchased, so "Free" read as if it
   were contrasting with paid tiers that don't exist in this app.
   ============================================================ */
const TIER_LADDER = [
  { key:'free',    label:'Rookie',  packs:0,    referrals:0,  dailyBonus:125,   color:'#94a3b8' },
  { key:'starter', label:'Starter', packs:10,   referrals:1,  dailyBonus:625,   color:'#cd7f32' },
  { key:'plus',    label:'Plus',    packs:50,   referrals:3,  dailyBonus:1250,  color:'#eab308' },
  { key:'pro',     label:'Pro',     packs:150,  referrals:7,  dailyBonus:2500,  color:'#3b82f6' },
  { key:'elite',   label:'Elite',   packs:400,  referrals:15, dailyBonus:5000,  color:'#8b5cf6' },
  { key:'vip',     label:'VIP',     packs:1000, referrals:30, dailyBonus:12500, color:'#f59e0b' },
];

// Custom line-art icon set for tiers/badges/achievements — built from
// plain shapes (no emoji) so the badges area reads like a proper rank
// system rather than a row of stickers.
const TIER_ICON_PATHS = {
  free:    '<circle cx="12" cy="12" r="7"/>',
  starter: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>',
  plus:    '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  pro:     '<polyline points="5,16 12,9 19,16"/><polyline points="5,11 12,4 19,11"/>',
  elite:   '<polygon points="12,3 21,12 12,21 3,12"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/>',
  vip:     '<polyline points="4,18 4,10 9,14 12,7 15,14 20,10 20,18"/><line x1="4" y1="18" x2="20" y2="18"/>'
};

function tierIconSVG(key, size=22){
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TIER_ICON_PATHS[key] || TIER_ICON_PATHS.free}</svg>`;
}

const ACHIEVEMENT_ICON_PATHS = {
  first_pull:    '<rect x="4" y="10" width="16" height="10" rx="1"/><polyline points="4,10 8,4 16,4 20,10"/><line x1="12" y1="10" x2="12" y2="20"/>',
  pack_rat:      '<rect x="4" y="14" width="10" height="7" rx="1"/><rect x="7" y="9" width="10" height="7" rx="1"/><rect x="10" y="4" width="10" height="7" rx="1"/>',
  century_club:  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
  first_trade:   '<line x1="4" y1="7" x2="17" y2="7"/><polyline points="13,3 17,7 13,11"/><line x1="20" y1="17" x2="7" y2="17"/><polyline points="11,13 7,17 11,21"/>',
  dealmaker:     '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
  duelist:       '<line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/><line x1="4" y1="4" x2="7" y2="4"/><line x1="4" y1="4" x2="4" y2="7"/><line x1="20" y1="4" x2="17" y2="4"/><line x1="20" y1="4" x2="20" y2="7"/>',
  win_streak_5:  '<rect x="1" y="9" width="22" height="6" rx="3"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="8.75" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="13" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="17.25" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="21.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  dealer:        '<rect x="3" y="5" width="13" height="9" rx="1.5"/><line x1="3" y1="9" x2="16" y2="9"/><line x1="17" y1="20" x2="17" y2="12"/><polyline points="13,16 17,12 21,16"/>',
  high_roller:   '<ellipse cx="12" cy="18" rx="8" ry="2.5"/><ellipse cx="12" cy="13" rx="8" ry="2.5"/><ellipse cx="12" cy="8" rx="8" ry="2.5"/>',
  set_complete:  '<rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="7,12 11,16 17,8"/>',
  collector:     '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  whale_watcher: '<polygon points="12,2 20,9 16,22 8,22 4,9"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="8" y1="22" x2="12" y2="9"/><line x1="16" y1="22" x2="12" y2="9"/>',
  popular:       '<circle cx="7" cy="10" r="3"/><circle cx="17" cy="10" r="3"/><circle cx="12" cy="7" r="3.4"/><rect x="2" y="16" width="20" height="5" rx="2.5"/>'
};

// Each badge gets its own fully unique color — no two badges share a
// hex value. Loosely grouped by hue family (packs = cyan/teal/sky,
// trading = green/lime, battle = red/rose, selling = amber/orange,
// collecting = violet/purple/fuchsia, referral = pink) so the "every
// badge" reference list still reads as organized, but every single
// row is visually distinct at a glance rather than reusing one shared
// category color across 2-3 badges.
const ACHIEVEMENT_COLORS = {
  first_pull: '#22d3ee', pack_rat: '#2dd4bf', century_club: '#0ea5e9',
  first_trade: '#34d399', dealmaker: '#84cc16',
  duelist: '#f87171', win_streak_5: '#fb7185',
  dealer: '#fbbf24', high_roller: '#f97316',
  set_complete: '#a78bfa', collector: '#8b5cf6', whale_watcher: '#d946ef',
  popular: '#f472b6'
};

/* ============================================================
   BATTLE BADGES — a separate, harder-earned tier from the
   achievement badges above. Escalating cumulative-win thresholds
   (not "1 badge per win") — see the note above record_battle_result()
   below for why that changed and what it buys. Deliberately original
   geometric-gem designs (not modeled on any existing gym-badge-style
   franchise art) that escalate in color/facet complexity from badge
   1 to badge 8, so the set reads as a genuine progression rather
   than 8 reskins of one shape.
   Reads from `userProfile.battle_badges` (array of earned keys),
   `userProfile.battle_wins` (cumulative wins), and
   `userProfile.battle_win_streak` (current unbroken win streak) —
   none of those columns exist until the SQL in the project notes is
   run, so this defaults safely to "nothing earned yet" everywhere
   until then. */
const BATTLE_BADGE_META = [
  { key: 'stonewall', label: 'Stonewall', color: '#94a3b8', winsRequired: 1,  desc: 'Win 1 battle' },
  { key: 'riptide',   label: 'Riptide',   color: '#38bdf8', winsRequired: 3,  desc: 'Win 3 battles total' },
  { key: 'ember',     label: 'Ember',     color: '#f97316', winsRequired: 6,  desc: 'Win 6 battles total' },
  { key: 'verdant',   label: 'Verdant',   color: '#22c55e', winsRequired: 10, desc: 'Win 10 battles total' },
  { key: 'voltage',   label: 'Voltage',   color: '#eab308', winsRequired: 15, desc: 'Win 15 battles total' },
  { key: 'glacier',   label: 'Glacier',   color: '#22d3ee', winsRequired: 21, desc: 'Win 21 battles total' },
  { key: 'eclipse',   label: 'Eclipse',   color: '#a78bfa', winsRequired: 28, desc: 'Win 28 battles total' },
  { key: 'prism',     label: 'Prism',     color: '#f472b6', winsRequired: 36, streakRequired: 3, desc: 'Win 36 battles total, including a 3-win streak — completes the set' },
];
const BATTLE_STREAK_TARGET = 3; // consecutive wins with no loss between them, required only for Prism

/* Each entry: `outline` = flat silhouette shown until earned,
   `facets` = the full detailed art shown once earned. Both share
   the same outer contour on purpose, so the earned reveal reads as
   the same badge "lighting up" rather than a shape swap. */
const BATTLE_BADGE_ART = {
  stonewall: {
    outline: '<polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#334155" stroke="#1e293b" stroke-width="2"/>',
    facets: `
      <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
      <polygon points="50,6 88,28 50,50 12,28" fill="#e2e8f0" stroke="#475569" stroke-width="1"/>
      <polygon points="50,50 88,28 88,72 50,94" fill="#64748b" stroke="#475569" stroke-width="1"/>
      <line x1="50" y1="6" x2="50" y2="94" stroke="#475569" stroke-width="1"/>`
  },
  riptide: {
    outline: '<path d="M8,50 a42,42 0 1,0 84,0 a42,42 0 1,0 -84,0" fill="#334155" stroke="#1e293b" stroke-width="2"/>',
    facets: `
      <path d="M50,8 C68,34 84,54 84,72 A34,34 0 1 1 16,72 C16,54 32,34 50,8 Z" fill="#38bdf8" stroke="#0ea5e9" stroke-width="2"/>
      <path d="M50,8 C58,22 66,36 70,50 L50,60 L30,50 C34,36 42,22 50,8 Z" fill="#7dd3fc" stroke="#0ea5e9" stroke-width="1"/>
      <ellipse cx="38" cy="55" rx="7" ry="11" fill="#e0f2fe" opacity="0.8"/>`
  },
  ember: {
    outline: '<path d="M50,6 C40,26 26,34 26,54 C26,74 38,92 50,92 C62,92 74,74 74,54 C74,34 60,26 50,6 Z" fill="#334155" stroke="#1e293b" stroke-width="2"/>',
    facets: `
      <path d="M50,6 C40,26 26,34 26,54 C26,74 38,92 50,92 C62,92 74,74 74,54 C74,34 60,26 50,6 Z" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
      <path d="M50,26 C44,38 36,44 36,58 C36,72 42,82 50,82 C58,82 64,72 64,58 C64,44 56,38 50,26 Z" fill="#f97316" stroke="#991b1b" stroke-width="1"/>
      <path d="M50,44 C47,50 43,54 43,62 C43,70 46,76 50,76 C54,76 57,70 57,62 C57,54 53,50 50,44 Z" fill="#fde047"/>`
  },
  verdant: {
    outline: '<g fill="#334155" stroke="#1e293b" stroke-width="2"><ellipse cx="50" cy="35" rx="14" ry="26" transform="rotate(0 50 50)"/><ellipse cx="50" cy="35" rx="14" ry="26" transform="rotate(120 50 50)"/><ellipse cx="50" cy="35" rx="14" ry="26" transform="rotate(240 50 50)"/></g>',
    facets: `
      <g stroke="#166534" stroke-width="1.5">
        <ellipse cx="50" cy="35" rx="14" ry="26" fill="#16a34a" transform="rotate(0 50 50)"/>
        <ellipse cx="50" cy="35" rx="14" ry="26" fill="#22c55e" transform="rotate(120 50 50)"/>
        <ellipse cx="50" cy="35" rx="14" ry="26" fill="#4ade80" transform="rotate(240 50 50)"/>
      </g>
      <circle cx="50" cy="50" r="9" fill="#bbf7d0" stroke="#166534" stroke-width="1"/>`
  },
  voltage: {
    outline: '<polygon points="50,4 90,50 50,96 10,50" fill="#334155" stroke="#1e293b" stroke-width="2"/>',
    facets: `
      <polygon points="50,4 90,50 50,96 10,50" fill="#eab308" stroke="#a16207" stroke-width="2"/>
      <polygon points="50,4 70,50 50,96 30,50" fill="#facc15" stroke="#a16207" stroke-width="1"/>
      <polygon points="56,14 38,52 52,52 44,86 72,44 56,44" fill="#fef9c3" stroke="#a16207" stroke-width="1"/>`
  },
  glacier: {
    outline: '<polygon points="50,3 61,37 97,37 68,58 79,92 50,71 21,92 32,58 3,37 39,37" fill="#334155" stroke="#1e293b" stroke-width="2"/>',
    facets: `
      <polygon points="50,3 61,37 97,37 68,58 79,92 50,71 21,92 32,58 3,37 39,37" fill="#22d3ee" stroke="#0e7490" stroke-width="2"/>
      <polygon points="50,20 58,42 50,58 42,42" fill="#cffafe" stroke="#0e7490" stroke-width="1"/>`
  },
  eclipse: {
    outline: '<path d="M8,50 a42,42 0 1,0 84,0 a42,42 0 1,0 -84,0" fill="#334155" stroke="#1e293b" stroke-width="2"/>',
    facets: `
      <path d="M8,50 a42,42 0 1,0 84,0 a42,42 0 1,0 -84,0" fill="#7c3aed" stroke="#5b21b6" stroke-width="2"/>
      <path fill-rule="evenodd" d="M8,50 a42,42 0 1,0 84,0 a42,42 0 1,0 -84,0 M32,38 a34,34 0 1,0 68,0 a34,34 0 1,0 -68,0" fill="#a78bfa"/>
      <circle cx="30" cy="66" r="2.5" fill="#e9d5ff"/>
      <circle cx="66" cy="24" r="1.8" fill="#e9d5ff"/>`
  },
  prism: {
    outline: '<polygon points="50,5 80,18 95,50 80,82 50,95 20,82 5,50 20,18" fill="#334155" stroke="#1e293b" stroke-width="2"/>',
    facets: `
      <polygon points="50,50 50,5 80,18" fill="#f87171"/>
      <polygon points="50,50 80,18 95,50" fill="#fb923c"/>
      <polygon points="50,50 95,50 80,82" fill="#fde047"/>
      <polygon points="50,50 80,82 50,95" fill="#4ade80"/>
      <polygon points="50,50 50,95 20,82" fill="#22d3ee"/>
      <polygon points="50,50 20,82 5,50" fill="#60a5fa"/>
      <polygon points="50,50 5,50 20,18" fill="#c084fc"/>
      <polygon points="50,50 20,18 50,5" fill="#f472b6"/>
      <polygon points="50,5 80,18 95,50 80,82 50,95 20,82 5,50 20,18" fill="none" stroke="#f8fafc" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="8" fill="#ffffff" opacity="0.9"/>`
  },
};

function battleBadgeIconSVG(key, earned, size = 54){
  const art = BATTLE_BADGE_ART[key];
  if (!art) return '';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">${earned ? art.facets : art.outline}</svg>`;
}

function isBattleChampion(userProfile){
  const earned = new Set(userProfile?.battle_badges || []);
  return BATTLE_BADGE_META.every(b => earned.has(b.key));
}

/* ============================================================
   BATTLE ENGINE — original ruleset, not the real Pokémon TCG's.
   Deliberately simplified/renamed on every mechanic that could
   otherwise read as a copy: no Energy attachment, no Bench, no
   Prize-card pile, no 18-type chart, no real move names — just an
   original 7-element wheel (reusing the battle-badge palette so
   the whole feature feels like one system) and a "3 knockouts
   wins" duel instead of the real game's 6-prize structure. Cards
   never get real stat data from the API (only name/image/rarity
   are stored anywhere in this app — see getCollectionsMap()), so
   HP/ATK/element here are entirely original, deterministically
   derived from each card's id + rarity tier. Same card always
   rolls the same stats, but the numbers are ours, not Nintendo's/
   The Pokémon Company's/Creatures Inc.'s.
   ============================================================ */
const BATTLE_ELEMENTS = ['stone','tide','ember','verdant','voltage','glacier','eclipse'];
const ELEMENT_COLOR = { stone:'#94a3b8', tide:'#38bdf8', ember:'#f97316', verdant:'#22c55e', voltage:'#eab308', glacier:'#22d3ee', eclipse:'#a78bfa' };
// beats[X] = the element X has the advantage over (a fixed 7-cycle, entirely original — not the real type chart)
const ELEMENT_BEATS = { stone:'glacier', glacier:'tide', tide:'ember', ember:'verdant', verdant:'eclipse', eclipse:'voltage', voltage:'stone' };
const BATTLE_KO_TARGET = 3; // first to land this many knockouts wins the duel

function hashStr(s){
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Deterministic per-card battle stats, derived only from id/name/rarity —
// never fetched or copied from any real game's stat line.
function deriveBattleStats(card){
  const h = hashStr(String(card.id || '') + '|' + (card.name || ''));
  const tier = Math.min(classify(card.rarity).id || 0, 8);
  const hp = 42 + tier * 11 + (h % 13);
  const atk = 11 + tier * 5 + ((h >>> 4) % 9);
  const element = BATTLE_ELEMENTS[h % BATTLE_ELEMENTS.length];
  return { hp, maxHp: hp, atk, element };
}

function battleCardFromCollectionCard(c){
  const stats = deriveBattleStats(c);
  return { id: c.id, name: c.name, image: c.image, rarity: c.rarity, ...stats };
}

// A fair, unowned "practice roster" for the AI opponent — generic
// placeholder names/no real card images, so solo battles never need a
// second person's collection. Power-matched loosely to the player's deck
// so early duels aren't lopsided against a big established collection.
function generateAIDeck(avgTier){
  const names = ['Stray Sparkbeast','Ridgeback Grazer','Tide Whelp','Cinder Pup','Moss Warden','Glimmer Wisp','Duneback','Thornling','Marsh Skitterer','Frostcap'];
  return names.map((name, i) => {
    const h = hashStr(name + '|ai');
    const tier = Math.max(0, Math.min(8, avgTier + ((h % 3) - 1)));
    const hp = 42 + tier * 11 + (h % 13);
    const atk = 11 + tier * 5 + ((h >>> 4) % 9);
    const element = BATTLE_ELEMENTS[h % BATTLE_ELEMENTS.length];
    return { id: `ai-${i}`, name, image: null, rarity: null, hp, maxHp: hp, atk, element };
  });
}

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pure state machine — no DOM access — so the same functions can drive a
// live PvP match later (server-authoritative) without a rewrite; only the
// renderer around it would change.
function createBattleState(playerDeck, aiDeck){
  const pDeck = shuffle(playerDeck.map(c => ({ ...c })));
  const aDeck = shuffle(aiDeck.map(c => ({ ...c })));
  return {
    player: { deck: pDeck.slice(4), hand: pDeck.slice(0, 4), active: null, ko: 0 },
    ai: { deck: aDeck.slice(4), hand: aDeck.slice(0, 4), active: null, ko: 0 },
    log: ['Duel started — pick your first card.'],
    winner: null,
  };
}

function elementMultiplier(atkEl, defEl){
  if (ELEMENT_BEATS[atkEl] === defEl) return 1.3;
  if (ELEMENT_BEATS[defEl] === atkEl) return 0.75;
  return 1;
}

// Renders the actual ELEMENT_BEATS cycle as a chain of chips (stone beats
// glacier beats tide beats ...), generated from the real rule data rather
// than hand-typed, so this can never silently drift out of sync with what
// battleAttack() actually does.
function battleElementWheelHTML(){
  const chip = (el) => `<span style="display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:999px; background:${ELEMENT_COLOR[el]}22; border:1px solid ${ELEMENT_COLOR[el]}; color:${ELEMENT_COLOR[el]}; font-weight:700; font-size:11.5px; text-transform:capitalize;">${el}</span>`;
  let order = ['stone'];
  while (order.length < BATTLE_ELEMENTS.length) order.push(ELEMENT_BEATS[order[order.length - 1]]);
  return `<div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px;">
    ${order.map((el, i) => chip(el) + (i < order.length ? ` <span style="color:var(--dim); font-size:12px;">beats</span> ` : '')).join('')}
    ${chip(order[0])}
  </div>`;
}

function battlePlayCard(state, side, cardId){
  const s = state[side];
  if (s.active) return state;
  const idx = s.hand.findIndex(c => c.id === cardId);
  if (idx === -1) return state;
  s.active = s.hand.splice(idx, 1)[0];
  state.log.push(`${side === 'player' ? 'You' : 'Opponent'} sent out ${s.active.name}.`);
  return state;
}

function battleDrawCard(state, side){
  const s = state[side];
  if (s.deck.length) s.hand.push(s.deck.shift());
  return state;
}

// Resolves one attack, applies KOs, checks the win condition. Returns the
// same state object (mutated) for convenience in the renderer's loop.
function battleAttack(state, attackerSide){
  const defSide = attackerSide === 'player' ? 'ai' : 'player';
  const atk = state[attackerSide].active, def = state[defSide].active;
  if (!atk || !def || state.winner) return state;

  const mult = elementMultiplier(atk.element, def.element);
  const dmg = Math.max(1, Math.round(atk.atk * mult));
  def.hp = Math.max(0, def.hp - dmg);
  const edge = mult > 1 ? ' (elemental advantage!)' : mult < 1 ? ' (resisted)' : '';
  state.log.push(`${attackerSide === 'player' ? 'You' : 'Opponent'}'s ${atk.name} hit ${def.name} for ${dmg}${edge}`);

  if (def.hp <= 0) {
    state.log.push(`${def.name} was knocked out!`);
    state[attackerSide].ko += 1;
    state[defSide].active = null;
    if (state[attackerSide].ko >= BATTLE_KO_TARGET) {
      state.winner = attackerSide;
      state.log.push(attackerSide === 'player' ? 'You win the duel!' : 'Opponent wins the duel.');
    } else if (!state[defSide].hand.length && !state[defSide].deck.length) {
      state.winner = attackerSide;
      state.log.push(`${defSide === 'player' ? 'You have' : 'Opponent has'} no cards left — duel over.`);
    }
  }
  return state;
}

// Simple heuristic opponent: play a card if it doesn't have one active,
// otherwise attack. No difficulty tiers yet — deliberately beatable so a
// first-time player can realistically string together 8 wins.
function battleAiTakeTurn(state){
  if (state.winner) return state;
  if (!state.ai.active) {
    if (!state.ai.hand.length) battleDrawCard(state, 'ai');
    if (state.ai.hand.length) {
      // Prefer the card with the best elemental matchup against the
      // player's current active card, if any.
      let choice = state.ai.hand[0];
      if (state.player.active) {
        choice = state.ai.hand.reduce((best, c) =>
          elementMultiplier(c.element, state.player.active.element) > elementMultiplier(best.element, state.player.active.element) ? c : best
        , state.ai.hand[0]);
      }
      battlePlayCard(state, 'ai', choice.id);
    }
  } else {
    battleAttack(state, 'ai');
  }
  return state;
}

// Starts a server-recorded battle session at the moment a duel begins.
// The returned id has to be handed back to record_battle_result()
// before a badge can be claimed — see the mitigation note below.
async function startBattleSession(){
  if (guestMode || !session?.user) return null;
  try {
    const { data, error } = await sb.rpc('start_battle_session');
    if (error) throw error;
    return data; // session id (uuid)
  } catch (e) {
    console.warn('start_battle_session RPC unavailable (run the battle-badges SQL in Supabase):', e.message);
    return null;
  }
}

// Persists a battle result server-side (win OR loss — a loss still needs
// to consume the session token and reset the streak). Escalating
// cumulative-win thresholds (1, 3, 6, 10, 15, 21, 28, 36 — see
// BATTLE_BADGE_META) replaced the old "1 badge per win" design: that
// meant literally any single win handed out a badge, so a player was
// done in 8 easy matches against a deliberately-beatable AI, and the
// session-token mitigation only had to be defeated once per badge. Under
// this version, spamming the exploit now costs 36 valid session-gated
// wins instead of 8 — each still gated to a real ~10-second-minimum
// session — which meaningfully raises the bar even though it's still not
// full server-side match validation (see the note on startBattleSession
// above; that limitation is unchanged, just made more expensive to
// abuse). Prism additionally requires a 3-win streak with no loss in
// between, so the final badge can't be reached by attrition alone — it
// asks for a stretch of actually being good at it, not just persistent.
// See record_battle_result() in the SQL for the exact server-side logic
// (threshold table lives there too, kept in sync with BATTLE_BADGE_META
// above by hand).
async function reportBattleResult(won, sessionId){
  if (guestMode || !session?.user) return null;
  try {
    const { data, error } = await sb.rpc('record_battle_result', { p_won: won, p_session_id: sessionId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (profile && row) {
      profile.battle_badges = row.battle_badges || [];
      profile.battle_wins = row.battle_wins || 0;
      profile.battle_win_streak = row.battle_win_streak || 0;
    }
    if (document.getElementById('account-section') && profile) renderAccountArea(session.user, profile);
    return row;
  } catch (e) {
    console.warn('record_battle_result RPC unavailable or session invalid (run the battle-badges SQL in Supabase) — result not persisted:', e.message);
    return null;
  }
}


const ADMIN_ICON_PATH = '<polygon points="12,2 20,5 20,12 12,22 4,12 4,5"/><polyline points="8,12 11,15 16,9"/>';
const MAIL_ICON_PATH = '<rect x="3" y="5" width="18" height="14" rx="1.5"/><polyline points="3,6 12,13 21,6"/>';
const CHART_ICON_PATH = '<line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>';
const TROPHY_ICON_PATH = '<path d="M6 4h12v3a6 6 0 0 1-12 0V4z"/><path d="M6 4H3a3 3 0 0 0 3 4"/><path d="M18 4h3a3 3 0 0 1-3 4"/><line x1="12" y1="13" x2="12" y2="18"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="9" y1="21" x2="9" y2="18"/><line x1="15" y1="21" x2="15" y2="18"/>';

function badgeIconSVG(pathMarkup, size=30){
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${pathMarkup}</svg>`;
}

/* Computes where a user sits on the tier ladder and how close
   they are to the next one.

   NOTE ON DATA SOURCE: tier-ups happen server-side inside
   open_pack() (see the tierRankOrder logic further down), so the
   raw packs/referrals counters live in Supabase, not in any
   client-side variable. This reads them off the profile row via
   a couple of likely column names with safe fallbacks to 0 so it
   never throws — but if your `profiles` table uses different
   column names for these two counters, swap them in below. */
function getTierProgress(userProfile){
  const packs = userProfile?.packs_opened ?? userProfile?.total_packs_opened ?? userProfile?.packs_opened_count ?? 0;
  const referrals = userProfile?.referral_count ?? userProfile?.referrals_count ?? userProfile?.successful_referrals ?? 0;

  // Winning all 8 battle badges is a permanent VIP override — once earned
  // it sticks regardless of whatever premium_tier says in the DB, since
  // this is a status fought for, not something that should quietly
  // regress if e.g. premium_tier gets reset for an unrelated reason.
  if (isBattleChampion(userProfile)) {
    const vip = TIER_LADDER[TIER_LADDER.length - 1];
    return { current: vip, next: null, packs, referrals, percent: 100, maxed: true, battleChampion: true };
  }

  const currentKey = (userProfile?.premium_tier || 'free').toLowerCase();
  const idx = Math.max(0, TIER_LADDER.findIndex(t => t.key === currentKey));
  const current = TIER_LADDER[idx];
  const next = TIER_LADDER[idx + 1] || null;

  if (!next) {
    return { current, next: null, packs, referrals, percent: 100, maxed: true };
  }

  const packsPct = next.packs ? Math.min(100, (packs / next.packs) * 100) : 100;
  const referralsPct = next.referrals ? Math.min(100, (referrals / next.referrals) * 100) : 100;
  const fasterPath = referralsPct >= packsPct ? 'referrals' : 'packs';

  return {
    current, next, packs, referrals,
    packsNeeded: Math.max(0, next.packs - packs),
    referralsNeeded: Math.max(0, next.referrals - referrals),
    percent: Math.max(packsPct, referralsPct),
    fasterPath, maxed: false,
  };
}

/* ============================================================
   AFFILIATE MARKETING — separate from CONFIG above on purpose:
   this is about linking OUT to real card/product marketplaces,
   not anything this app processes. Leave any ID blank to hide
   that network's links entirely (nothing shows until you fill
   one in — same pattern as TIP_JAR_URL above).

   Where these show up (see buildAffiliateLinks() and its call
   sites): the card fullscreen viewer (showCardFullscreen) and
   the pack/set landing screen (beginOpen) — deliberately NOT on
   every thumbnail in the collection/checklist grids. A handful
   of well-placed, high-intent links converts better than link
   spam, and keeps the grids fast.

   FTC compliance (not legal advice, but load-bearing): US law
   requires a "clear and conspicuous" disclosure next to affiliate
   links, not just buried in a footer. renderAffiliateButtons()
   below already appends "(affiliate link)" under each button row
   — don't strip that if you restyle these. Also keep the one-line
   disclosure in the About/profile area (see the tip-jar section
   render call) so there's a standing disclosure too, not just
   per-link.

   Getting real IDs (you have to sign up yourself — these can't be
   fabricated):
   - eBay Partner Network: partnernetwork.ebay.com → apply → your
     campaign ID (campid) is a plain numeric string, drop it into
     EBAY_CAMPAIGN_ID below. No link-wrapping needed, EPN reads
     the campid query param directly off a normal ebay.com URL.
   - Amazon Associates: affiliate-program.amazon.com → apply →
     your "Associate tag" (e.g. yoursite-20) goes in AMAZON_TAG.
     Same deal — it's a plain query param, no wrapping needed.
     Heads up: Amazon requires 3 qualifying sales within 180 days
     of approval or they close the account — the hardest bar here.
   - TCGplayer: runs its affiliate program through Impact
     (impact.com). There are two ways Impact tracks clicks — pick
     whichever matches what your Impact dashboard actually gave you:
       (a) Universal Tracking Tag (UTT) — a single <script> snippet
           in index.html's <head> that auto-detects and wraps any
           outbound link to an enrolled advertiser's domain, no
           per-link wrapping needed. If that's what you have (look
           for a script tag calling impactStat('transformLinks') in
           index.html), leave TCGPLAYER_WRAPPER_TEMPLATE blank —
           tcgplayerUrl() below already emits a plain tcgplayer.com
           link, and the UTT script rewrites it client-side once the
           page has loaded.
       (b) A per-link tracking-link template (the older/manual style)
           — paste it into TCGPLAYER_WRAPPER_TEMPLATE with {URL}
           where the destination goes (e.g.
           'https://tcgplayer.pxf.io/c/XXXXX/YYYY/ZZZZ?u={URL}').
           tcgplayerUrl() below prefers this if it's set.
   - GameStop: also runs through Impact — same two options as
     TCGplayer above (UTT vs. manual template), same
     GAMESTOP_WRAPPER_TEMPLATE field, same {URL} placeholder if you
     have a manual template. GameStop's approval bar is lower than
     Amazon's — no traffic/sales minimum stated, mainly a
     content-relevance check.
   - Can't get approved anywhere yet? Sovrn Commerce (sovrn.com/commerce,
     formerly VigLink) is a different kind of thing: sign up once, and
     rather than applying to each retailer yourself, Sovrn's script
     auto-detects outbound links on the page and monetizes whichever
     of its 30,000+ merchant programs (Amazon, eBay, GameStop, Walmart,
     Target, Best Buy...) you already qualify for — no per-network
     approval needed from you. It takes ~25% of the commission as its
     cut, and your first clicks go unpaid until Sovrn reviews and
     approves the campaign (up to 5 business days), but it's the most
     realistic path if you don't yet have the standing to get approved
     directly. Set SOVRN_API_KEY below once you have one — this file
     will inject the required script at boot; you don't need to touch
     any HTML. Once approved, you can keep it running alongside the
     direct networks above (Sovrn only touches links it recognizes as
     unmonetized) or drop the direct ones later if you'd rather not
     maintain both.
   ============================================================ */
const AFFILIATE = {
  EBAY_CAMPAIGN_ID: '5339197568',  // numeric campid from EPN, e.g. '5339123456'
  AMAZON_TAG: '',                 // Associate tag, e.g. 'yourtag-20'
  TCGPLAYER_WRAPPER_TEMPLATE: 'https://partner.tcgplayer.com/c/7682682/1780961/21018?u={URL}', // Manual Impact deep link (account SID/campaign ID/media ID from Josh's Impact "My Brands > TCGplayer" text-link tool) + the standard ?u= destination param Impact deep links expect. Safe alongside the UTT script in index.html — this already points at partner.tcgplayer.com (Impact's own domain), not tcgplayer.com, so transformLinks() has nothing left to rewrite here; no double-wrapping.
  GAMESTOP_WRAPPER_TEMPLATE: '',  // Same deal as TCGplayer above — manual template only, blank if covered by the UTT script.
  SOVRN_API_KEY: '',              // Sovrn Commerce API key — injects their site-wide script at boot

  ebayUrl(query){
    if(!this.EBAY_CAMPAIGN_ID) return null;
    return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&campid=${encodeURIComponent(this.EBAY_CAMPAIGN_ID)}`;
  },
  amazonUrl(query){
    if(!this.AMAZON_TAG) return null;
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(this.AMAZON_TAG)}`;
  },
  tcgplayerUrl(query){
    const dest = `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(query)}`;
    // Manual template takes priority if set; otherwise emit the plain
    // link and let the Impact UTT script (see index.html <head>)
    // rewrite it client-side. Always returns a link — TCGplayer isn't
    // gated behind a blank config field the way it used to be.
    return this.TCGPLAYER_WRAPPER_TEMPLATE
      ? this.TCGPLAYER_WRAPPER_TEMPLATE.replace('{URL}', encodeURIComponent(dest))
      : dest;
  },
  gamestopUrl(query){
    // Unlike TCGplayer above, there's no confirmed evidence GameStop is
    // covered by the same auto-wrapping script — Rakuten (GameStop's
    // likely network) typically needs its own deep-link/SID format, not
    // a bare URL. So this stays gated behind an explicit template until
    // that's confirmed one way or the other — a bare link here would
    // send real traffic that just doesn't get credited.
    if(!this.GAMESTOP_WRAPPER_TEMPLATE) return null;
    const dest = `https://www.gamestop.com/search/?q=${encodeURIComponent(query)}`;
    return this.GAMESTOP_WRAPPER_TEMPLATE.replace('{URL}', encodeURIComponent(dest));
  },

  // Returns [{label, url}] for whichever networks are configured —
  // callers render these, they don't build URLs themselves. `context`
  // reorders by which network actually converts best for that kind of
  // purchase: TCGplayer/eBay lead for single cards (GameStop rarely
  // lists individual TCG singles, so it's pushed last rather than
  // dropped — still occasionally useful, just not the best first tap);
  // GameStop leads for sealed product (boxes/packs are squarely in
  // their catalog) alongside eBay, with TCGplayer after.
  linksFor(query, context = 'card'){
    const built = {
      tcg: this.tcgplayerUrl(query) && { label: 'TCGplayer', url: this.tcgplayerUrl(query) },
      ebay: this.ebayUrl(query) && { label: 'eBay', url: this.ebayUrl(query) },
      amazon: this.amazonUrl(query) && { label: 'Amazon', url: this.amazonUrl(query) },
      gamestop: this.gamestopUrl(query) && { label: 'GameStop', url: this.gamestopUrl(query) },
    };
    const order = context === 'sealed'
      ? ['gamestop', 'ebay', 'tcg', 'amazon']
      : ['tcg', 'ebay', 'amazon', 'gamestop'];
    return order.map(k => built[k]).filter(Boolean);
  },
};

// Sovrn Commerce: unlike the networks above, this isn't a per-link wrapper —
// their script scans the page for outbound links and monetizes whichever it
// recognizes, so this just needs to load once at boot. Safe to run alongside
// the direct networks above (it only touches links it doesn't already see as
// monetized). No-op if SOVRN_API_KEY is blank.
function initSovrnCommerce(){
  if(!AFFILIATE.SOVRN_API_KEY) return;
  if(document.getElementById('sovrn-commerce-script')) return; // don't double-inject
  window.vglnk = { key: AFFILIATE.SOVRN_API_KEY };
  const s = document.createElement('script');
  s.id = 'sovrn-commerce-script';
  s.type = 'text/javascript';
  s.async = true;
  s.src = '//cdn.viglink.com/api/vglnk.js';
  if(document.body) document.body.appendChild(s);
  else document.addEventListener('DOMContentLoaded', () => document.body.appendChild(s));
}
initSovrnCommerce();

// Renders a compact row of "Buy on X" buttons for the given search query.
// Returns '' (renders nothing) if no networks are configured — never shows
// a dead/broken-looking button.
function renderAffiliateButtons(query, context = 'card'){
  const links = AFFILIATE.linksFor(query, context);
  if(!links.length) return '';
  return `
    <div style="margin-top:12px;">
      <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center;">
        ${links.map(l => `<a class="btn btn-secondary" style="font-size:12px; padding:8px 12px;" href="${l.url}" target="_blank" rel="sponsored noopener">🛒 Buy on ${l.label}</a>`).join('')}
      </div>
      <div class="hint" style="text-align:center; margin-top:6px; font-size:10.5px;">(affiliate link — we may earn a commission on purchases at no extra cost to you)</div>
    </div>
  `;
}

/* ============================================================
   Lightweight analytics — write-only inserts into analytics_events.
   Never throws, never blocks the UI; failures are silently swallowed
   since a missed analytics event should never break the app.
   ============================================================ */
function getAnonId() {
  let id = store.get('analytics_anon_id');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    store.set('analytics_anon_id', id);
  }
  return id;
}

function track(eventName, properties = {}) {
  try {
    sb.from('analytics_events').insert({
      user_id: session?.user?.id || null,
      anon_id: getAnonId(),
      event_name: eventName,
      properties
    }).then(() => {}).catch(() => {});
  } catch (e) { /* analytics must never break the app */ }
}

// Delegated click tracking for every affiliate link on the page,
// regardless of which screen rendered it (card popup, pack purchase, etc).
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[rel~="sponsored"]');
  if (a) {
    track('affiliate_click', { url: a.href, label: a.textContent.trim(), page: location.hash || 'home' });
  }
});

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

  // Resource hints — nothing in this app was warming DNS/TLS ahead of
  // time for any of the hosts it actually loads images from, so every
  // first image request on a fresh page load paid full DNS + TCP + TLS
  // handshake latency before the request itself even started. These run
  // once at boot, in parallel with everything else, and cost nothing if
  // a given host never ends up used this session.
  //
  // preconnect (full handshake, incl. TLS) is reserved for the handful
  // of hosts virtually every session hits early and repeatedly: the
  // Cloudflare Worker mirror (CDN_IMAGE_BASE — every cached card/pack
  // image goes through this), Supabase itself (auth + storage fallback
  // when CDN_IMAGE_BASE is unset), and the TCGdex API (the primary card
  // data + art source). dns-prefetch (cheaper, DNS only) covers the
  // rest — real sources but hit less often per session (pack-art
  // fallbacks, JP art, GitHub asset repo).
  const PRECONNECT_HOSTS = [
    CONFIG.CDN_IMAGE_BASE || null,
    CONFIG.SUPABASE_URL,
    'https://api.tcgdex.net',
  ].filter(Boolean);
  const DNS_PREFETCH_HOSTS = [
    'https://assets.tcgdex.net',
    'https://api.pokemontcg.io',
    'https://den-media.pokellector.com',
    'https://archives.bulbagarden.net',
    'https://raw.githubusercontent.com',
    'https://api.github.com',
  ];
  PRECONNECT_HOSTS.forEach(href => {
    try {
      const l = document.createElement('link');
      l.rel = 'preconnect'; l.href = href; l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    } catch (e) { /* never block boot over a resource hint */ }
  });
  DNS_PREFETCH_HOSTS.forEach(href => {
    try {
      const l = document.createElement('link');
      l.rel = 'dns-prefetch'; l.href = href;
      document.head.appendChild(l);
    } catch (e) { /* never block boot over a resource hint */ }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swCode = `
        // Deliberately its own cache, NOT the same name as ImgCache.CACHE_NAME
        // in the page script (currently 'chasecards-universal-images-v18').
        // This SW cache only ever stores raw pass-through fetches to the
        // original image hosts (see isImage below) for <img> tags that load
        // a source URL directly instead of going through ImgCache.get() —
        // e.g. the promo pack strip on signup/referral. ImgCache's cache
        // stores a completely different set of keys (CDN-mirror URLs it
        // fetches itself). Naming used to drift by exactly one version
        // number between the two (v17 here vs v18 there), which read like a
        // forgotten bump rather than the two intentionally-separate caches
        // they are — renamed so that's unambiguous. Bump the suffix here
        // only if this SW's own fetch-handling logic changes; it has no
        // relationship to ImgCache's version number.
        const CACHE_NAME = 'chasecards-sw-passthrough-v1';
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

/* ============================================================
   Badge tiles — rank/achievement badges, rendered chunky and
   bordered like the old-school "achievement unlocked" badge
   cases (custom line-art icons, no emoji).
   ============================================================ */
.badges-section { margin-top: 16px; }
.badges-section-title {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--dim);
  margin-bottom: 10px;
}
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 12px;
}
.badge-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  cursor: default;
  transition: transform 0.12s ease;
}
.badge-tile:active { transform: scale(0.96); }
.badge-tile-icon {
  width: 62px;
  height: 62px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f8fafc;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--badge-color) 92%, white 8%), color-mix(in srgb, var(--badge-color) 70%, black 30%));
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,0.35),
    inset 0 -3px 6px rgba(0,0,0,0.35),
    0 3px 0 color-mix(in srgb, var(--badge-color) 55%, black 45%),
    0 6px 14px color-mix(in srgb, var(--badge-color) 55%, transparent);
  border: 2px solid color-mix(in srgb, var(--badge-color) 60%, black 15%);
}
.badge-tile-label {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
  text-align: center;
  color: var(--dim);
  line-height: 1.25;
  max-width: 80px;
}
.badge-tile-legendary .badge-tile-icon {
  background:
    linear-gradient(145deg, #fff6d0, var(--badge-color) 55%, #a8720a);
  box-shadow:
    inset 0 2px 0 rgba(255,255,255,0.6),
    inset 0 -3px 6px rgba(0,0,0,0.3),
    0 3px 0 #92660a,
    0 0 18px color-mix(in srgb, var(--badge-color) 75%, transparent),
    0 0 34px color-mix(in srgb, var(--badge-color) 40%, transparent);
  border-color: #ffe37a;
}
.badge-tile-legendary .badge-tile-label { color: var(--badge-color); }

/* Battle badges — always-8-slots layout, silhouette until earned.
   Deliberately circular + dimmer/greyscale by default (vs. the square
   achievement tiles above) so this reads as a visually distinct,
   higher tier at a glance, not just "more achievements." */
.battle-badges-section { margin-top: 18px; }
.battle-badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 12px;
}
.battle-badge-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  cursor: default;
}
.battle-badge-icon {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.06), transparent 60%), #0f172a;
  border: 2px solid #1e293b;
  opacity: 0.5;
  filter: grayscale(0.5);
  transition: transform 0.12s ease, opacity 0.2s ease, filter 0.2s ease;
}
.battle-badge-tile.earned .battle-badge-icon {
  opacity: 1;
  filter: none;
  border-color: rgba(255,255,255,0.18);
  box-shadow: 0 0 14px rgba(255,255,255,0.1), 0 3px 10px rgba(0,0,0,0.4);
}
.battle-badge-tile:active .battle-badge-icon { transform: scale(0.94); }
.battle-badge-label {
  font-size: 10.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
  text-align: center;
  color: var(--dim);
  line-height: 1.25;
}
.battle-badge-tile.earned .battle-badge-label { color: var(--text); }
.battle-champion-banner {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(244,114,182,0.1));
  border: 1px solid rgba(251,191,36,0.4);
  color: #fbbf24;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: .02em;
}

/* Battle mode — deck builder + live duel screens */
.battle-deck-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.battle-pick-tile {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid var(--edge);
  background: var(--panel);
  cursor: pointer;
  transition: border-color .12s ease, transform .12s ease;
}
.battle-pick-tile img { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; }
.battle-pick-tile.picked { border-color: var(--el-color, var(--cyan)); transform: scale(0.97); box-shadow: 0 0 0 2px var(--el-color, var(--cyan)) inset; }
.battle-pick-stats { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; padding: 4px 6px; color: var(--dim); }
.battle-pick-element {
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .03em;
  text-align: center;
  padding: 2px 4px;
  color: #08090c;
}

.battle-arena { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.battle-side-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--dim); margin-bottom: 6px; }
.battle-active-slot { min-height: 84px; display: flex; align-items: center; }
.battle-empty-slot { color: var(--dim); font-size: 12.5px; padding: 14px 0; }
.battle-card {
  width: 100%;
  border: 2px solid var(--el-color, var(--edge));
  border-radius: 12px;
  padding: 10px 12px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--el-color) 16%, var(--panel)), var(--panel));
}
.battle-card-name { font-weight: 800; font-size: 13.5px; }
.battle-card-element {
  display: inline-block;
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--el-color, var(--dim));
  margin: 2px 0 6px;
}
.battle-hp-bar { height: 6px; border-radius: 4px; background: rgba(255,255,255,0.08); overflow: hidden; }
.battle-hp-fill { height: 100%; background: var(--el-color, var(--cyan)); transition: width .2s ease; }
.battle-hp-text { font-size: 10.5px; color: var(--dim); margin-top: 4px; }

.battle-log {
  background: var(--panel);
  border: 1px solid var(--edge);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 11.5px;
  color: var(--dim);
  max-height: 96px;
  overflow-y: auto;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.battle-hand { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.battle-hand-card {
  flex-shrink: 0;
  width: 120px;
  border: 2px solid var(--el-color, var(--edge));
  border-radius: 12px;
  padding: 10px;
  cursor: pointer;
  background: var(--panel);
  transition: transform .12s ease;
}
.battle-hand-card:active { transform: scale(0.96); }

/* Impact feedback — a brief flash+shake on a hit, a stronger pop on a
   knockout (applied to the slot itself, since a KO'd card is already
   gone from state by the time this class lands — see redraw() in
   renderBattleDuel). Previously an attack just silently updated numbers;
   this is the only thing that makes a hit *read* as a hit. */
.battle-active-slot.battle-hit .battle-card { animation: battleHitFx .32s ease; }
@keyframes battleHitFx {
  0% { filter: brightness(1); transform: translateX(0); }
  22% { filter: brightness(1.7) saturate(1.5); transform: translateX(-5px); }
  46% { transform: translateX(4px); }
  70% { transform: translateX(-2px); }
  100% { filter: brightness(1); transform: translateX(0); }
}
.battle-active-slot.battle-ko { animation: battleKoFx .45s cubic-bezier(.3,1.4,.4,1); }
@keyframes battleKoFx {
  0% { filter: brightness(1); transform: scale(1); }
  30% { filter: brightness(2.2) saturate(0); transform: scale(1.06); }
  100% { filter: brightness(1); transform: scale(1); }
}
.ko-count.pop { display: inline-block; animation: koCountPop .4s cubic-bezier(.3,1.6,.4,1); }
@keyframes koCountPop { 0% { transform: scale(0.4); opacity: 0.3; } 60% { transform: scale(1.35); } 100% { transform: scale(1); opacity: 1; } }
.battle-result-banner {
  text-align: center;
  padding: 14px;
  border-radius: 12px;
  font-weight: 800;
  margin: 12px 0;
}
.battle-result-banner.win { background: linear-gradient(135deg, rgba(251,191,36,0.18), rgba(244,114,182,0.12)); border: 1px solid rgba(251,191,36,0.4); color: #fbbf24; }
.battle-result-banner.lose { background: rgba(148,163,184,0.1); border: 1px solid var(--edge); color: var(--dim); }

/* Marketing opt-in — bottom banner, not a full-screen modal (see the
   comment above maybePromptMarketingOptIn for why). Sits just above the
   tab bar, slides up on show, never dims or blocks the rest of the UI. */
.optin-banner {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(58px + var(--safe-bottom));
  max-width: 536px;
  margin: 0 auto;
  background: var(--panel);
  border: 1px solid var(--edge);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.45);
  z-index: 45;
  transform: translateY(16px);
  opacity: 0;
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.optin-banner.show { transform: translateY(0); opacity: 1; }
.optin-banner-close {
  position: absolute;
  top: 8px;
  right: 10px;
  background: none;
  border: none;
  color: var(--dim);
  font-size: 13px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.optin-banner-title { font-weight: 800; font-size: 14.5px; padding-right: 20px; color: var(--cyan); }
.optin-banner-sub { font-size: 12px; color: var(--dim); margin-top: 3px; }

/* Signup pack promo strip */
.promo-pack-strip { display: flex; gap: 8px; margin: 4px 0 2px; }
.promo-pack-tile { flex: 1; text-align: center; }
.promo-pack-img-wrap {
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: 8px;
  overflow: hidden;
  background: var(--panel-2, var(--panel));
  border: 1px solid var(--edge);
  display: flex;
  align-items: center;
  justify-content: center;
}
.promo-pack-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.promo-pack-placeholder { font-size: 9.5px; font-weight: 700; color: var(--dim); padding: 4px; text-align: center; }
.promo-pack-label { font-size: 9.5px; font-weight: 700; color: var(--dim); margin-top: 4px; }

.pack-ticket-banner {
  width: 100%;
  margin: 6px 0 2px;
  padding: 8px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05));
  border: 1px solid rgba(34,197,94,0.4);
  color: #4ade80;
  font-size: 11.5px;
  font-weight: 700;
  text-align: center;
}

.account-card {
  background: var(--panel);
  border: 1px solid var(--edge);
  border-radius: 14px;
  padding: 16px;
  margin-top: 10px;
}

/* Tier progress banner — the whole point is that this is the
   FIRST thing seen in the account card, not a tiny "?" someone
   has to notice and tap. */
.tier-progress-banner {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--tier-color) 18%, var(--panel)), var(--panel-2, #1e293b));
  border: 1px solid color-mix(in srgb, var(--tier-color) 45%, var(--edge));
  box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 4px 16px color-mix(in srgb, var(--tier-color) 20%, transparent);
}
.tier-progress-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tier-progress-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: var(--tier-color);
  background: color-mix(in srgb, var(--tier-color) 20%, transparent);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--tier-color) 60%, transparent));
  flex-shrink: 0;
}
.tier-progress-labels { flex: 1; min-width: 0; }
.tier-progress-current {
  font-weight: 800;
  font-size: 14px;
  color: var(--text);
  letter-spacing: .01em;
}
.tier-progress-sub {
  font-size: 11.5px;
  color: var(--dim);
  margin-top: 1px;
}
.tier-progress-details-btn {
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--edge);
  color: var(--dim);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.tier-progress-details-btn:hover { color: var(--text); border-color: var(--tier-color); }
.tier-progress-bar-track {
  position: relative;
  height: 9px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  margin-top: 10px;
  overflow: hidden;
}
.tier-progress-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--tier-color) 70%, white 0%), var(--tier-color));
  box-shadow: 0 0 10px color-mix(in srgb, var(--tier-color) 70%, transparent);
  transition: width 0.6s cubic-bezier(.4,1.4,.6,1);
}
.tier-progress-bar-fill.tier-progress-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  animation: tierShimmer 1.8s ease-in-out infinite;
}
@keyframes tierShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.tier-progress-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 7px;
  font-size: 11px;
  color: var(--dim);
  font-weight: 600;
}
.tier-progress-footer .lead { color: var(--text); }
.tier-progress-maxed {
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--tier-color);
  font-weight: 700;
}
.tier-details-panel {
  display: none;
  margin: 10px 0 4px;
  padding: 12px;
  background: var(--panel-2, #1e293b);
  border: 1px solid var(--edge);
  border-radius: 10px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dim);
}
.tier-ladder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--edge);
}
.tier-ladder-row:last-child { border-bottom: none; }
.tier-ladder-row .icon { display:inline-flex; align-items:center; justify-content:center; width: 20px; flex-shrink: 0; }
.tier-ladder-row .name { color: var(--text); font-weight: 700; width: 62px; flex-shrink: 0; }
.tier-ladder-row .req { flex: 1; }
.tier-ladder-row.current-tier-row {
  background: color-mix(in srgb, var(--tier-color) 12%, transparent);
  border-radius: 6px;
  padding-left: 6px;
  margin-left: -6px;
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

// This bucket mirrors card art from EVERY external source this app uses
// (PokéWallet, TCGdex ja/en, pokemontcg.io) into shared Supabase Storage —
// see ImgCache.get() below. PokéWallet is the one with a hard, shared
// rate limit (100 req/hour, 1,000/day total across every user — see
// CONFIG comment near pokeWalletFetch), but mirroring everything else too
// means the very first fetch of ANY card, by anyone, is the last time
// this app's servers/browsers hit that source directly for that card —
// every later request (any user, any device, forever) hits this bucket
// instead. Turns "100/hour total, permanently" into "100/hour until the
// catalog is warm," and cuts load on TCGdex/pokemontcg.io too.
//
// SETUP REQUIRED (one-time, in the Supabase dashboard — the anon key here
// can't create buckets or set policies):
//   1. Storage → New bucket → name it exactly "pokewallet-images" → Public bucket: ON.
//      (Name is legacy from when this only mirrored PokéWallet — kept as-is
//      to avoid orphaning anything already mirrored under it.)
//   2. Storage → pokewallet-images → Policies → add a policy allowing
//      INSERT for authenticated users only (guests won't contribute to
//      the mirror, but still read from it fine — see the `session`
//      check in ImgCache.get() below, which skips the upload attempt
//      entirely for guests rather than sending a request RLS will
//      reject) — public SELECT is on by default for a public bucket.
const POKEWALLET_MIRROR_BUCKET = 'pokewallet-images';

// Shared cross-user cache for a WHOLE resolved set's card data (name,
// rarity, and the final chosen image URL for every card) — not just
// images. This is the expensive part of getCardsForSet(): the TCGdex
// ja+en fetches, the per-card rarity lookups, the PokéWallet set lookup,
// and the pokemontcg.io name/dexId fallback searches. None of that ever
// needs to happen more than once per set, ever — card art/rarity/names
// don't change once a set is printed, so after the first user resolves
// a set, every other user (any device, forever, until the 30-day TTL)
// just reads the stored result instead of re-running the whole pipeline.
//
// SETUP REQUIRED (one-time, same caveat as the image bucket — the anon
// key can't create tables/policies). Run once in the Supabase SQL editor:
//   create table set_card_cache (
//     set_id text primary key,
//     data jsonb not null,
//     updated_at timestamptz not null default now()
//   );
//   alter table set_card_cache enable row level security;
//   create policy "public read" on set_card_cache for select using (true);
//   create policy "authenticated write" on set_card_cache for insert
//     with check (auth.role() = 'authenticated');
//   create policy "authenticated update" on set_card_cache for update
//     using (auth.role() = 'authenticated');
// Guests still read fine (getSharedSetCache below never checks session)
// — they just don't contribute new entries; putSharedSetCache() skips
// the write attempt entirely when there's no session, rather than
// sending one RLS will reject.
const SET_CARD_CACHE_TABLE = 'set_card_cache';
const SET_CARD_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
// Shared with the local cache_cards_vN key below (getCardsForSet) — bump
// this whenever the resolution pipeline itself changes, so a shared-cache
// row written under an OLDER, since-fixed version of that pipeline gets
// treated as a miss and re-resolved, instead of permanently serving
// whatever it happened to produce back when it was written (which is
// exactly what let a months-old broken PokéWallet integration keep
// serving all-English results even after the underlying bug was fixed —
// the shared cache had no way to know its own stored data was stale).
// v14->v15: added each card's _artSource field — cached v14 cards lack
// it, and isSetGenuinelyJapanese() below would misread that as "no real
// Japanese art" (false, just missing data) for every already-cached set.
const CARD_CACHE_VERSION = 'v15';
async function getSharedSetCache(setId) {
  try {
    let data;
    if (CONFIG.CDN_DB_BASE) {
      // Edge-cached path (see CDN_DB_BASE comment / chase-cards-db-worker.js).
      const res = await fetch(`${CONFIG.CDN_DB_BASE}/set_card_cache?set_id=${encodeURIComponent(setId)}`);
      if (!res.ok) return null;
      const rows = await res.json();
      data = rows && rows[0] ? rows[0] : null;
    } else {
      const r = await sb.from(SET_CARD_CACHE_TABLE).select('data, updated_at').eq('set_id', setId).maybeSingle();
      if (r.error) return null;
      data = r.data;
    }
    if (!data) return null;
    if (Date.now() - new Date(data.updated_at).getTime() > SET_CARD_CACHE_MAX_AGE_MS) return null;
    if (data.data?.v !== CARD_CACHE_VERSION) return null; // written by an older pipeline version — treat as a miss
    return data.data.cards;
  } catch (e) {
    return null; // table not set up yet / unreachable — fall through to normal resolution
  }
}
function putSharedSetCache(setId, cards, game='pokemon') {
  // Guests can't write under the authenticated-only RLS policy (see the
  // SQL comment above) — skip the request entirely rather than sending
  // one that's just going to be rejected.
  if (!session) return;

  // One Piece sets: routed to warm-set-cache-op. This branch didn't
  // used to exist at all — every One Piece set fell through to the
  // generic (Pokémon) warm-set-cache path below, which silently no-ops
  // for a set_id it doesn't recognize (fire-and-forget, errors
  // swallowed), so set_card_cache never actually got populated for
  // this game on the normal browse-a-set happy path. The only thing
  // that ever warmed a One Piece set was the one-shot reactive retry
  // in the pack-open flow (see ensureSetWarmed) — which only fires
  // *after* a real purchase attempt already failed once, and gives up
  // for good if that single retry doesn't land. This call proactively
  // warms it the moment a set is first viewed instead, same as every
  // other game.
  if (game === 'onepiece') {
    fetch(`${CONFIG.SUPABASE_URL}/functions/v1/warm-set-cache-op`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ set_id: setId }),
    }).catch(() => {});
    return;
  }

  // Non-JP (Pokémon) sets: written exclusively through the warm-set-cache
  // Edge Function now (see its own header comment) — it re-resolves the
  // set itself server-side via the service role, rather than trusting
  // whatever this client computed. set_card_cache's RLS no longer
  // accepts a direct client INSERT for a non-jp- set_id at all, so a
  // direct .upsert() here would just be rejected; call the function
  // instead. Fire-and-forget, same as before — a slow/failed warm
  // shouldn't hold up this user, who already has their own copy of
  // `cards` either way.
  if (!setId.startsWith('jp-')) {
    fetch(`${CONFIG.SUPABASE_URL}/functions/v1/warm-set-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ set_id: setId }),
    }).catch(() => {});
    return;
  }

  // JP sets: submitted to warm-set-cache-jp for independent server-side
  // verification of rarity + image-host legitimacy (see that function's
  // header comment for why this doesn't need to re-derive the art
  // itself) rather than a direct client write. Same fire-and-forget
  // philosophy as the non-JP path above.
  fetch(`${CONFIG.SUPABASE_URL}/functions/v1/warm-set-cache-jp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      apikey: CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ set_id: setId, cards }),
  }).catch(() => {});
}

// Waits for a set's server-side row in set_card_cache to actually exist
// (POSTs to the right warm-* Edge Function and awaits it, instead of the
// fire-and-forget calls above), then confirms via getSharedSetCache.
// Needed because open_pack's generate_duel_pack() reads set_card_cache
// directly and knows nothing about a client's own already-resolved
// `cards` — if this user is the first to ever view a set, the
// fire-and-forget warm from putSharedSetCache*() may still be in flight
// (or not yet started) the moment they tap "Open Pack", and the RPC
// fails with 'set_not_cached_yet:<id>' even though the pack art/cards
// are already visible locally. Used as a one-shot recovery, not on the
// normal happy path.
async function ensureSetWarmed(setId, game, cards){
  if(!session) return false;
  const isJp = setId.startsWith('jp-');
  const endpoint = game === 'onepiece' ? 'warm-set-cache-op' : isJp ? 'warm-set-cache-jp' : 'warm-set-cache';
  const body = isJp && game !== 'onepiece' ? { set_id: setId, cards } : { set_id: setId };
  try{
    await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    });
  }catch(e){ /* fall through — the retry below will just fail again if this didn't help */ }
  const warmed = await getSharedSetCache(setId);
  return !!(warmed && warmed.length);
}

/* ============================================================
   Tiny utilities & Global Configs
   ============================================================ */
const $ = (sel, root=document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
// Escapes user-supplied text (usernames, emails, etc.) before it's
// interpolated into an innerHTML template. Anything that came from
// another user's profile — not from our own fixed card/set data —
// must go through this before hitting innerHTML, or it's a stored
// XSS vector (e.g. via the public shared-pull page).
const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
function toast(msg, ms=2400){
  const t = $('#toast'); if(!t) return; t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove('show'), ms);
}
function vibrate(pattern){ if(navigator.vibrate) try{navigator.vibrate(pattern);}catch(e){} }
const store = {
  get(k, fallback=null){ try{ return JSON.parse(localStorage.getItem(k)) ?? fallback; }catch(e){ return fallback; } },
  set(k,v){
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch(e) {
      // Quota exceeded (most likely — every set a user's ever opened
      // stayed cached indefinitely with no cap, so a long-time user's
      // storage would eventually fill up and every set from then on
      // would silently just stop getting cached at all). Evict the
      // oldest cached card-set entries to make room and retry once,
      // rather than accepting that permanently-degraded state.
      if (this._evictOldestCardCache()) {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch(e2) { /* still full — give up gracefully, same as before */ }
      }
    }
  },
  // Only touches getCardsForSet()'s versioned per-set cache — that's the
  // one that grows unbounded with normal use (a new key per set a user
  // has ever opened) and the one it's safe to regenerate on demand
  // (worst case: one extra network round-trip, or a shared-cache hit —
  // see set_card_cache — for the set that gets re-requested next).
  // Every other localStorage key (profile/preferences/etc.) is left
  // alone.
  _evictOldestCardCache(count = 5) {
    try {
      const entries = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_cards_v')) {
          let t = 0;
          try { t = JSON.parse(localStorage.getItem(key))?.t || 0; } catch(e) { /* unparseable — treat as oldest, safe to evict */ }
          entries.push([key, t]);
        }
      }
      if (!entries.length) return false;
      entries.sort((a, b) => a[1] - b[1]); // oldest first
      for (const [key] of entries.slice(0, count)) localStorage.removeItem(key);
      return true;
    } catch(e) { return false; }
  },
};

/* ============================================================
   GAME ADAPTER REGISTRY
   ------------------------------------------------------------
   ACTIVE_GAME picks which adapter the classify()/getSets()/
   getCardsForSet() dispatchers (defined next to each Pokémon
   implementation, further down) route to. Every screen and helper
   in this file calls those three dispatcher functions by name —
   never the per-game implementations directly — so adding a new
   game later is just: write its {classify, getSets, getCardsForSet}
   adapter, add it to GAMES below, and flip ACTIVE_GAME (eventually
   via a UI switcher on Home rather than this hardcoded default).

   Only 'pokemon' exists today. classifyPokemon/getSetsPokemon/
   getCardsForSetPokemon are unchanged from before this refactor —
   this file is pure restructuring, no behavior change.

   Must be declared after `store` (above) since it reads
   'active_game' from it at load time.
   ============================================================ */
let ACTIVE_GAME = store.get('active_game') || 'pokemon';
function setActiveGame(game){
  if(!GAMES[game]) return;
  ACTIVE_GAME = game;
  store.set('active_game', game);
}
// GAMES wraps classifyPokemon/getSetsPokemon/getCardsForSetPokemon,
// which are declared later in the file. That's safe here because
// these are function *declarations* (hoisted before any code runs)
// referenced only inside arrow functions that aren't called until
// well after the whole script has loaded.
const GAMES = {
  pokemon: {
    id: 'pokemon',
    label: 'Pokémon',
    classify: (...args) => classifyPokemon(...args),
    getSets: (...args) => getSetsPokemon(...args),
    getCardsForSet: (...args) => getCardsForSetPokemon(...args),
  },
  onepiece: {
    id: 'onepiece',
    label: 'One Piece',
    classify: (...args) => classifyOnePiece(...args),
    getSets: (...args) => getSetsOnePiece(...args),
    getCardsForSet: (...args) => getCardsForSetOnePiece(...args),
  },
};

/* ============================================================
   Player Statistics Store
   ============================================================ */
// Keyed per-user (falls back to a shared 'guest' bucket while signed
// out) so switching accounts on the same device/browser doesn't read
// or mutate another account's pack count, streak, etc.
function playerStatsKey() {
  return 'player_stats_' + (session?.user?.id || 'guest');
}

function getPlayerStats() {
  return store.get(playerStatsKey(), {
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
  store.set(playerStatsKey(), stats);
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
    store.set(playerStatsKey(), stats);
  }
}

/* ============================================================
   Card Market Valuation & Sell-Back System
   ------------------------------------------------------------
   These are flat credit values per rarity tier, NOT derived from a
   real-dollar market estimate multiplied out. That used to be how this
   worked (rarity -> real USD estimate -> ×0.70 ×100 for "cents"), and
   it produced a genuine economy bug: the dollar-based values were
   realistic for actual cardboard (~$10-20 expected value per pack hit,
   which is roughly true), but packCost (see calculatePackCost) was
   tuned completely independently, from 50-300 credits for English sets.
   Result: opening the cheapest EN pack and selling everything pulled
   returned ~1,680 credits on average against a 50-300 credit cost — a
   5x-30x infinite-credits loop, not a "sell your extras back" feature.

   These values are tuned instead against packCost itself: the two hit
   slots plus the rest of the pack should return LESS than the pack
   cost on average (packs should feel like a bet, not a faucet), while
   a top-tier pull still nets a clear, satisfying windfall — that
   asymmetry (mostly small losses, occasionally a big win) is what
   makes pulling something rare feel good, same as the reveal-effect
   tiering above.

   Known remaining imperfection: this is one flat schedule across ALL
   sets, but packCost itself ranges roughly 50-6000 credits (English's
   cheapest sets up through Japanese's priciest). A flat schedule can't
   track a 100x cost range — it lands well below cost for a typical/
   expensive pack, but the very cheapest English packs can still be
   marginally sell-profitable on average. Closing that completely would
   mean storing each collected card's origin packCost and computing
   sell value as a fraction of THAT specific pack's cost — a real
   improvement, but it needs a schema change to the collections table
   (to persist packCost per card) that's worth doing deliberately
   rather than guessing at blind.
   ============================================================ */
const RARITY_SELL_VALUE_CREDITS = {
  0: 1,     // Common
  1: 3,     // Uncommon
  2: 8,     // Rare
  3: 18,    // Holo Rare
  4: 45,    // Double Rare (ex/gx/v)
  5: 100,   // Ultra Rare
  6: 160,   // Illustration Rare
  7: 320,   // Special Illustration Rare
  8: 750,   // Hyper / Secret Rare — the "jackpot" tier, deliberately worth a lot more than its weight alone would suggest
};

function getCardSellValue(card) {
  const tierId = classifyForCard(card).id;
  return RARITY_SELL_VALUE_CREDITS[tierId] ?? 1;
}

// Same visual language as showCardFullscreen, deliberately NOT reusing it
// directly — that function's "Sell for X Credits" button assumes you own
// the card (sellCardFromCollection would just fail/toast for one you
// don't), so this is its own small function for the "you're missing
// this one" case specifically: real card art, no sell button, straight
// to the actual buy buttons. This is the single highest-intent moment
// in the app for these — someone looking at the exact card they want —
// and it previously dead-ended at a toast that just restated what they
// already knew ("not yet in your collection") with no next step at all.
function showMissingCardBuyPrompt(imgSrc, cardObj){
  const overlay = el('div','overlay');
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '300';
  overlay.innerHTML = `
      <div style="position:relative; width:90%; max-width:400px; display:flex; flex-direction:column; align-items:center;">
          <button id="missing-card-close-btn" aria-label="Close" style="position:absolute; top:-18px; right:-18px; z-index:301; width:40px; height:40px; border-radius:50%; border:2px solid rgba(255,255,255,0.85); background:#171923; color:#fff; font-size:22px; font-weight:700; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.55);">&times;</button>
          <img src="${escapeHtml(imgSrc)}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'" style="width:100%; border-radius:18px; box-shadow:0 30px 60px rgba(0,0,0,0.8); animation: zoomIn 0.3s cubic-bezier(0.2,0.8,0.2,1); object-fit:contain; max-height:70vh; opacity:0.9;"/>
          <div style="text-align:center; margin-top:14px; animation: slideup 0.3s ease;">
            <div style="font-weight:700; font-size:14px;">${escapeHtml(cardObj.name)}</div>
            <div class="hint" style="margin-top:2px;">Not in your collection yet — open packs for a chance at it, or:</div>
            ${renderAffiliateButtons(`${cardObj.name}${cardObj.set?.name ? ' ' + cardObj.set.name : ''}`, 'card')}
          </div>
      </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#missing-card-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
}

function showCardFullscreen(imgSrc, cardObj){
  const overlay = el('div','overlay');
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '300';
  
  const sellCredits = cardObj ? getCardSellValue(cardObj) : 0;
  
  overlay.innerHTML = `
      <div style="position:relative; width:90%; max-width:400px; perspective:1200px; display:flex; flex-direction:column; align-items:center;">
          <button id="card-fullscreen-close-btn" aria-label="Close" style="position:absolute; top:-18px; right:-18px; z-index:301; width:40px; height:40px; border-radius:50%; border:2px solid rgba(255,255,255,0.85); background:#171923; color:#fff; font-size:22px; font-weight:700; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.55);">&times;</button>
          <img src="${escapeHtml(imgSrc)}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%2394a3b8%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2214%22%3EImage Unavailable%3C/text%3E%3C/svg%3E'" style="width:100%; border-radius:18px; box-shadow:0 30px 60px rgba(0,0,0,0.8); animation: zoomIn 0.3s cubic-bezier(0.2,0.8,0.2,1); object-fit:contain; max-height:70vh;"/>
          ${cardObj ? `
            <div style="text-align:center; margin-top:16px; display:flex; gap:10px; width:100%; justify-content:center; flex-wrap:wrap; animation: slideup 0.3s ease;">
                <button class="btn btn-secondary" id="sell-card-btn" style="background:var(--danger); border-color:var(--danger); color:#fff; padding:10px 16px; font-size:13px;">Sell for ${sellCredits} Credits</button>
            </div>
            <div class="hint" style="font-size:10px; margin-top:6px; color:var(--dim); text-align:center;">Virtual currency only. No real-world cash value.</div>
            ${renderAffiliateButtons(`${cardObj.name}${cardObj.set?.name ? ' ' + cardObj.set.name : ''}`, 'card')}
          ` : ''}
      </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#card-fullscreen-close-btn').addEventListener('click', () => overlay.remove());

  if(cardObj) {
    overlay.querySelector('#sell-card-btn').addEventListener('click', (e) => {
      e.target.disabled = true; // guard against a double-tap firing sell_card twice before the first call resolves
      sellCardFromCollection(cardObj, sellCredits);
      overlay.remove();
    });
  }

  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
}

async function sellCardFromCollection(cardObj, creditsEarnedEstimate) {
  const map = getCollectionsMap();
  const activeName = getActiveCollectionName();
  const coll = map[activeName] || {};

  if(!cardObj || !cardObj.id || !coll[cardObj.id] || coll[cardObj.id].count <= 0) {
    toast('Card not found in active collection');
    return;
  }

  // Guests have no server-side ledger to reconcile against (see
  // get_user_collection/sell_card below) — local-only, same as the rest
  // of guest mode.
  if(guestMode){
    coll[cardObj.id].count--;
    if(coll[cardObj.id].count <= 0) delete coll[cardObj.id];
    map[activeName] = coll;
    store.set(scopedKey('user_collections'), map);
    updatePlayerStats(st => { st.cardsSold = (st.cardsSold || 0) + 1; st.totalSoldEarned = (st.totalSoldEarned || 0) + creditsEarnedEstimate; });
    const gs = getGuestState();
    gs.credits = (Number(gs.credits) || CONFIG.ECONOMY.GUEST_CREDITS) + creditsEarnedEstimate;
    setGuestState(gs);
    $('#credit-count').textContent = gs.credits;
    SFX.coin();
    toast(`Sold card for +${creditsEarnedEstimate} virtual credits!`);
    render(route.name, route.params);
    return;
  }

  // Logged-in accounts: the actual sale — ownership check, credit value,
  // ledger entry, and the credit grant itself — all happen server-side
  // in one atomic call (see the sell_card RPC). This used to be a raw
  // client-side `.update({credits})` on the profiles table, which
  // silently affected zero rows (profiles has RLS enabled with no
  // UPDATE policy) — meaning selling never actually persisted for a
  // real account; it only looked like it worked until the next reload.
  try{
    const { data, error } = await sb.rpc('sell_card', { p_card_id: cardObj.id });
    if(error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const earned = row?.credits_earned ?? creditsEarnedEstimate;
    const newBalance = row?.new_balance;

    coll[cardObj.id].count--;
    if(coll[cardObj.id].count <= 0) delete coll[cardObj.id];
    map[activeName] = coll;
    store.set(scopedKey('user_collections'), map);
    syncCollectionDeltaToServer(activeName, [{ id: cardObj.id, name: cardObj.name, rarity: cardObj.rarity, image: cardObj.image, game: cardObj.game, delta: -1 }]);
    updatePlayerStats(st => { st.cardsSold = (st.cardsSold || 0) + 1; st.totalSoldEarned = (st.totalSoldEarned || 0) + earned; });

    if(profile && newBalance != null){ profile.credits = newBalance; }
    const creditCountEl = $('#credit-count');
    if(creditCountEl && newBalance != null) creditCountEl.textContent = isAdminUser() ? '∞' : newBalance;

    SFX.coin();
    toast(`Sold card for +${earned} credits!`);
    render(route.name, route.params);
    syncAchievementsQuiet();
  }catch(e){
    const msg = e?.message || '';
    toast(msg.includes('you_do_not_have_that_card') ? "You don't have that card anymore." : 'Could not sell card — try again.');
  }
}

/* ============================================================
   Dusting — bulk-sell commons
   ------------------------------------------------------------
   Daily openers pile up commons fast, and there's no other sink
   for them. This lets a collector trade a batch of tier-0 commons
   in for credits in one action instead of tapping "Sell" on
   dozens of cards individually — same per-card price
   (RARITY_SELL_VALUE_CREDITS[0]) and same server-authoritative
   sell_card RPC underneath for logged-in accounts, just looped
   sequentially so a mid-batch failure can't race with itself.
   ============================================================ */
function openDustCommonsSheet(coll, activeName){
  const commonEntries = Object.entries(coll).filter(([, c]) => classifyForCard(c).id === 0);
  const totalCommons = commonEntries.reduce((s, [, c]) => s + c.count, 0);
  if(!totalCommons){ toast('No common cards to dust'); return; }

  const perUnit = RARITY_SELL_VALUE_CREDITS[0];
  const defaultAmt = Math.min(50, totalCommons);

  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });

  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>✨ Dust Commons</h2>
    <div class="sub">Trade in common cards for credits — you own ${totalCommons} common${totalCommons===1?'':'s'}, worth ${perUnit} credit${perUnit===1?'':'s'} each.</div>
    <div style="display:flex; align-items:center; gap:10px; margin:16px 0 6px;">
      <input type="number" id="dust-amount-input" min="1" max="${totalCommons}" value="${defaultAmt}" class="auth-form" style="flex:1; min-width:0;"/>
      <button class="btn btn-secondary" id="dust-all-btn" style="flex-shrink:0; padding:10px 14px; font-size:12.5px;">All (${totalCommons})</button>
    </div>
    <div class="hint" id="dust-preview" style="margin-bottom:14px;">≈ +${defaultAmt * perUnit} credits</div>
    <button class="btn btn-primary" id="dust-confirm-btn" style="width:100%;">Dust &amp; Sell</button>
  `;

  const input = $('#dust-amount-input', sheet);
  const preview = $('#dust-preview', sheet);
  const clampedAmount = () => Math.max(1, Math.min(totalCommons, parseInt(input.value, 10) || 0));
  const updatePreview = () => { preview.textContent = `≈ +${clampedAmount() * perUnit} credits`; };
  input.addEventListener('input', updatePreview);
  $('#dust-all-btn', sheet).addEventListener('click', () => { input.value = totalCommons; updatePreview(); });

  $('#dust-confirm-btn', sheet).addEventListener('click', async (e) => {
    const amt = clampedAmount();
    e.target.disabled = true; e.target.textContent = 'Dusting…';
    overlay.remove();
    await dustCommons(amt, activeName);
  });
}

async function dustCommons(targetCount, activeName){
  const map = getCollectionsMap();
  const coll = map[activeName] || {};
  const commonIds = Object.keys(coll).filter(id => classifyForCard(coll[id]).id === 0);
  if(!commonIds.length){ toast('No common cards to dust'); return; }

  let remaining = targetCount;
  let earned = 0;
  let sold = 0;
  const deltas = [];

  for(const id of commonIds){
    if(remaining <= 0) break;
    const entry = coll[id];
    if(!entry || entry.count <= 0) continue;
    const sellEach = getCardSellValue(entry);
    const take = Math.min(entry.count, remaining);
    if(take <= 0) continue;

    let actuallySold = 0;
    if(guestMode){
      earned += sellEach * take;
      actuallySold = take;
    } else {
      // No bulk RPC exists server-side, so this sells one unit at a
      // time through the same atomic sell_card call as a manual sale —
      // sequential, not parallel, so ownership/balance stay consistent
      // even if a card gets sold from another device mid-batch. Stops
      // early on this id (rather than aborting the whole dust) if a
      // sale fails, and moves on to the next common.
      for(let i=0;i<take;i++){
        try{
          const { data, error } = await sb.rpc('sell_card', { p_card_id: id });
          if(error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          earned += row?.credits_earned ?? sellEach;
          if(row?.new_balance != null && profile) profile.credits = row.new_balance;
          actuallySold++;
        }catch(e){ break; }
      }
    }
    if(actuallySold <= 0) continue;

    entry.count -= actuallySold;
    if(entry.count <= 0) delete coll[id];
    deltas.push({ id, name: entry.name, rarity: entry.rarity, image: entry.image, game: entry.game, delta: -actuallySold });
    remaining -= actuallySold;
    sold += actuallySold;
  }

  map[activeName] = coll;
  store.set(scopedKey('user_collections'), map);

  if(guestMode){
    const gs = getGuestState();
    gs.credits = (Number(gs.credits) || CONFIG.ECONOMY.GUEST_CREDITS) + earned;
    setGuestState(gs);
  } else if(deltas.length){
    syncCollectionDeltaToServer(activeName, deltas);
  }
  updatePlayerStats(st => { st.cardsSold = (st.cardsSold || 0) + sold; st.totalSoldEarned = (st.totalSoldEarned || 0) + earned; });

  const creditCountEl = $('#credit-count');
  if(creditCountEl) creditCountEl.textContent = isAdminUser() ? '∞' : currentCredits();

  if(sold){
    SFX.coin();
    toast(`Dusted ${sold} common${sold===1?'':'s'} for +${earned} credits!`);
  } else {
    toast('Could not dust cards — try again.');
  }
  render(route.name, route.params);
  if(!guestMode) syncAchievementsQuiet();
}

/* ============================================================
   Aggressive Universal Image Caching System
   ============================================================ */
const ImgCache = {
  // Shared timeout wrapper for every raw fetch this object makes —
  // mirrors fetchWithTimeout's pattern (defined later in this file for
  // the card/set API calls) but kept local here since ImgCache is
  // defined before that helper exists.
  async _fetchTimed(url, opts, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  },
  // A Map preserves insertion order, which this uses as an LRU order:
  // every get/access re-inserts the key (moving it to the "most
  // recently used" end — see _remember below), and once the cache grows
  // past _BLOB_CACHE_LIMIT the oldest entries get evicted and their
  // blob: URLs revoked. Without this, createObjectURL() was called for
  // every unique image ever viewed in a session and NEVER revoked —
  // over a long session across many sets, that memory just accumulated
  // for the life of the page.
  //
  // The cap is deliberately generous rather than tight: renderCollection()
  // renders a user's ENTIRE collection at once (no pagination/
  // virtualization — every unique card gets an ImgCache.get() call in
  // the same pass), so a cap lower than a dedicated collector's card
  // count would evict — and revoke — a blob: URL still attached to a
  // currently-visible <img> mid-render, causing broken images on
  // screen. This is a safety valve against unbounded growth over a
  // very long multi-hour session, not an aggressive memory optimizer —
  // if this app ever gets collectors with 1000+ unique cards, raise
  // this further (or better, virtualize that grid so it doesn't render
  // everything at once in the first place).
  blobUrls: new Map(),
  _BLOB_CACHE_LIMIT: 1500,
  _remember(url, blobUrl) {
    this.blobUrls.delete(url);
    this.blobUrls.set(url, blobUrl);
    while (this.blobUrls.size > this._BLOB_CACHE_LIMIT) {
      const oldestUrl = this.blobUrls.keys().next().value;
      const oldestBlobUrl = this.blobUrls.get(oldestUrl);
      this.blobUrls.delete(oldestUrl);
      // No-op (per spec) if oldestBlobUrl isn't actually a blob: URL —
      // the plain-https last-resort branch below stores the original
      // URL string here too, so this is always safe to call.
      URL.revokeObjectURL(oldestBlobUrl);
    }
  },

  // ----------------------------------------------------------------
  // Dual-tier image system — separate from the full-res tier above.
  // Grid/vault views (Collection, Set Checklist) pull hundreds-to-
  // thousands of images at once; caching every one of those at full
  // resolution is what silently bloats mobile browsers' storage
  // until the app gets evicted. This tier downscales + recompresses
  // to a small WebP once, then caches THAT persistently (Cache
  // Storage, its own cache name so it never collides with or gets
  // evicted by the full-res tier's LRU). Full-res only ever gets
  // fetched/cached via the existing get() above — callers opt into
  // it explicitly (fullscreen card viewer, trade offer previews),
  // never as a side effect of drawing a grid.
  thumbBlobUrls: new Map(),
  _THUMB_CACHE_LIMIT: 4000, // thumbnails are tiny (~5-15KB post-recompression) vs a full-res object URL's backing blob, so this tier can comfortably hold far more before LRU eviction kicks in
  _THUMB_MAX_DIM: 220, // px — comfortably covers .coll-item grid tiles at up to ~2x pixel density without shipping full-res bytes
  CACHE_NAME_THUMB: 'chasecards-thumbs-v1',
  _rememberThumb(url, blobUrl) {
    this.thumbBlobUrls.delete(url);
    this.thumbBlobUrls.set(url, blobUrl);
    while (this.thumbBlobUrls.size > this._THUMB_CACHE_LIMIT) {
      const oldestUrl = this.thumbBlobUrls.keys().next().value;
      const oldestBlobUrl = this.thumbBlobUrls.get(oldestUrl);
      this.thumbBlobUrls.delete(oldestUrl);
      URL.revokeObjectURL(oldestBlobUrl);
    }
  },
  // Resolves + returns raw bytes only (no object-URL bookkeeping, no
  // Cache Storage write of its own) — shared by getThumb() below to
  // derive a thumbnail from. Mirrors the same source-resolution order
  // as get() (shared mirror → PokéWallet proxy / original URL).
  async _fetchRawBlob(url) {
    try {
      const mirrorUrl = this._cacheKeyFor(url);
      let res = await this._fetchTimed(mirrorUrl, { mode: 'cors', credentials: 'omit' }, 6000).catch(() => null);
      if (!res || !res.ok) {
        if (url.startsWith('pokewallet://images/')) {
          const pwId = url.slice('pokewallet://images/'.length);
          res = await this._fetchTimed(
            `${POKEWALLET_PROXY_URL}?path=${encodeURIComponent(`/images/${pwId}`)}`,
            { headers: { Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`, apikey: CONFIG.SUPABASE_ANON_KEY } },
            8000
          ).catch(() => null);
        } else {
          res = await this._fetchTimed(url, { mode: 'cors', credentials: 'omit' }, 10000).catch(() => null);
        }
      }
      return (res && res.ok) ? await res.blob() : null;
    } catch (e) { return null; }
  },
  // Downscales+recompresses a source blob to a small WebP. Returns null
  // (caller falls back to caching the original) on any browser that
  // lacks createImageBitmap/canvas WebP export rather than throwing.
  async _downscale(blob, maxDim) {
    if (typeof createImageBitmap !== 'function') return null;
    let bitmap;
    try { bitmap = await createImageBitmap(blob); } catch (e) { return null; }
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = ('OffscreenCanvas' in window) ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    try {
      if (canvas.convertToBlob) return await canvas.convertToBlob({ type: 'image/webp', quality: 0.72 });
      return await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.72));
    } catch (e) { return null; }
  },
  // Grid views should call this instead of get(). Persistent (Cache
  // Storage) + in-memory LRU, same shape as get(), but always resolves
  // to the small recompressed version — falls back to the full-res
  // tier only if thumbnailing itself isn't possible in this browser.
  async getThumb(url, silent = true) {
    if (!url) return '';
    if (this.thumbBlobUrls.has(url)) {
      const cached = this.thumbBlobUrls.get(url);
      this._rememberThumb(url, cached);
      return cached;
    }
    if (!('caches' in window)) return this.get(url, silent);
    const thumbKey = this._cacheKeyFor(url) + '&thumb=1'; // synthetic — never actually fetched, just a stable Cache Storage key distinct from the full-res entry for the same source url
    try {
      const cache = await caches.open(this.CACHE_NAME_THUMB);
      let res = await cache.match(thumbKey);
      if (!res) {
        const sourceBlob = await this._fetchRawBlob(url);
        if (!sourceBlob) return this.get(url, silent); // nothing to thumbnail — fall back to the full-res path rather than showing a blank tile
        const thumbBlob = (await this._downscale(sourceBlob, this._THUMB_MAX_DIM)) || sourceBlob;
        await cache.put(thumbKey, new Response(thumbBlob, { headers: { 'Content-Type': thumbBlob.type || 'image/webp' } }));
        res = await cache.match(thumbKey);
      }
      if (res) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        this._rememberThumb(url, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn('Thumbnail cache fallback triggered', e);
    }
    return this.get(url, silent);
  },
  CACHE_NAME: 'chasecards-universal-images-v18',
  // Deterministic, non-crypto hash (FNV-1a) so the same source URL always
  // maps to the same Supabase Storage path across every session/user,
  // without needing crypto.subtle (secure-context only) for this.
  _hashUrl(url) {
    let h = 0x811c9dc5;
    for (let i = 0; i < url.length; i++) {
      h ^= url.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  },
  // Every external image source (PokéWallet, TCGdex ja/en, pokemontcg.io)
  // mirrors into the same shared bucket now, not just PokéWallet — see
  // get() below. PokéWallet images keep their real id as the path (handy
  // for debugging, and preserves anything already mirrored under the
  // previous PokéWallet-only version of this cache); everything else is
  // keyed by a hash of its source URL, since TCGdex/pokemontcg.io ids
  // aren't unique across sources the way PokéWallet's are.
  _mirrorPath(url) {
    return url.startsWith('pokewallet://images/')
      ? `pw/${url.slice('pokewallet://images/'.length)}`
      : `ext/${this._hashUrl(url)}`;
  },
  // The Cache Storage API only accepts http(s) request URLs — cache.match()/
  // cache.put() throw a TypeError on anything else, and pokewallet://... is
  // a synthetic marker scheme (see get() below), not a real URL. Every
  // lookup is keyed by the CDN mirror URL (always a real https endpoint)
  // instead, while blobUrls (and everything callers pass around) stays
  // keyed by the original url. Prefers the Cloudflare Worker in front of
  // the bucket (CDN_IMAGE_BASE) when configured — that's what actually
  // gives edge-cached speed — falling back to hitting Supabase Storage's
  // public URL directly if it isn't set.
  _cacheKeyFor(url) {
    const base = CONFIG.CDN_IMAGE_BASE || `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${POKEWALLET_MIRROR_BUCKET}`;
    return `${base}/${this._mirrorPath(url)}`;
  },
  async has(url) {
    if (!url) return false;
    if (this.blobUrls.has(url)) return true;
    if (!('caches' in window)) return false;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      return !!(await cache.match(this._cacheKeyFor(url)));
    } catch (e) { return false; }
  },
  async get(url, silent = false) {
    if (!url) return '';
    if (this.blobUrls.has(url)) {
      const cached = this.blobUrls.get(url);
      this._remember(url, cached); // touch — keep it "hot" in LRU order
      return cached;
    }
    
    if (!silent) showLoader();
    try {
      if ('caches' in window) {
        const cache = await caches.open(this.CACHE_NAME);
        const mirrorUrl = this._cacheKeyFor(url);
        let res = await cache.match(mirrorUrl);
        if (!res) {
          // 1) Try the shared Supabase mirror first — covers every
          // source now, not just PokéWallet. Plain https fetch, no
          // auth, no per-source rate limit, and it's on the same CDN
          // this app already talks to for everything else.
          // BUGFIX: neither fetch below used to have a timeout, unlike
          // every other network call in this file (see fetchWithTimeout).
          // A single stalled host (mirror or original source) hung here
          // indefinitely with nothing to catch it — since this runs per
          // pack-art candidate on every pack open, that's the difference
          // between "a bit slow" and "never appears". Both now abort and
          // fall through on a deadline instead.
          res = await this._fetchTimed(mirrorUrl, { mode: 'cors', credentials: 'omit' }, 6000).catch(() => null);
          if (!res || !res.ok) {
            // 2) Not mirrored yet — fetch from the real source. This is
            // the only branch that actually spends PokéWallet's rate
            // limit or hits TCGdex/pokemontcg.io directly.
            if (url.startsWith('pokewallet://images/')) {
              const pwId = url.slice('pokewallet://images/'.length);
              // Goes through the pokewallet-proxy Edge Function, not
              // api.pokewallet.io directly — see the CONFIG comment
              // near where POKEWALLET_API_KEY used to live.
              res = await this._fetchTimed(
                `${POKEWALLET_PROXY_URL}?path=${encodeURIComponent(`/images/${pwId}`)}`,
                { headers: { Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`, apikey: CONFIG.SUPABASE_ANON_KEY } },
                8000
              ).catch(() => null);
            } else {
              res = await this._fetchTimed(url, { mode: 'cors', credentials: 'omit' }, 10000).catch(() => null);
            }
            if (res && res.ok) {
              // Guests can't write under the authenticated-only RLS
              // policy (see the bucket setup comment above) — skip the
              // upload attempt entirely rather than sending one that's
              // just going to be rejected.
              if (session) {
                // Mirror it for every other session — fire-and-forget;
                // upsert:true means a race with another user's upload of
                // the same image just overwrites safely instead of
                // erroring.
                res.clone().blob().then(blob =>
                  sb.storage.from(POKEWALLET_MIRROR_BUCKET).upload(this._mirrorPath(url), blob, {
                    contentType: blob.type || 'image/webp',
                    upsert: true,
                  })
                ).catch(() => {});
              }
            }
          }
          if (res && res.ok) await cache.put(mirrorUrl, res.clone());
        }
        if (res && res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          this._remember(url, blobUrl);
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
      img.onload = () => { this._remember(url, url); resolve(url); };
      img.onerror = () => { resolve(''); };
      img.src = url;
    });
  },
  sync(url) {
    if (!this.blobUrls.has(url)) return url;
    const cached = this.blobUrls.get(url);
    this._remember(url, cached); // touch here too — sync() is called on
                                  // every render, so this keeps whatever's
                                  // actually on-screen from being evicted
    return cached;
  }
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

// One Piece equivalent of OWN_PACK_ART above — same convention (set id ->
// list of photo filenames living at PACK_ART_REPO_BASE), currently empty
// because there are no photographed One Piece booster packs in that repo
// yet. This is why "no pack art for any One Piece pack" happens: the rest
// of resolvePackArtUrls() below (TCGdex, the 1niceroli/ptcg-assets GitHub
// repo, Pokéllector) is Pokémon-only — none of it was ever going to have
// One Piece results, it just silently 404s/no-matches every time. Add real
// photos to the repo and list them here, keyed by Punk Records' pack id
// (e.g. 'OP01', 'ST01', 'EB01' — dashless; see getSetsOnePiece/
// PUNKRECORDS_BASE above. NOT optcgapi.com's old dashed 'OP-01' form —
// that source was replaced) the same way OWN_PACK_ART is keyed by
// Pokémon set id, and they'll show up immediately — no other wiring needed.
const OWN_PACK_ART_ONEPIECE = {
  // 'OP01': ['pack_op01_1.png'],
};

// Case-insensitive Japanese matching function
function ownArtFor(setMeta) {
  if (setMeta.series === 'One Piece') {
    const files = OWN_PACK_ART_ONEPIECE[setMeta.id];
    if (files && files.length) return files.map(f => PACK_ART_REPO_BASE + f);
    return [];
  }
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
      const res = await fetchWithTimeout(TCGDEX_SETS_URL, 6000);
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

    // Everything below this line — TCGdex, the 1niceroli/ptcg-assets GitHub
    // repo, Pokéllector JP fallback, NICHE_PACK_ART — only ever has Pokémon
    // data. Letting a One Piece set fall through it was pure wasted work:
    // a doomed GitHub contents-API call (which is itself rate-limited, so
    // this was also stealing from the budget actual Pokémon lookups need)
    // plus a TCGdex lookup that can never match a One Piece set name. Bail
    // out here instead — ownArtFor() above is the only real source for One
    // Piece art right now (see OWN_PACK_ART_ONEPIECE).
    if (setMeta.series === 'One Piece') return [];

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
    // These three lookups (TCGdex/JP name resolution, the GitHub packshots
    // listing) are all independent network round-trips — they used to run
    // one after another (tcgdexLogoFor, THEN the github fetch), which on a
    // cold cache (e.g. incognito) stacked their full latency serially
    // before a single pack-art candidate existed. Now they run concurrently,
    // and both bare fetch() calls that previously had no timeout at all are
    // capped with fetchWithTimeout so a slow/stalled source can't block the
    // whole chain.
    const tcgdexOrJpPromise = (async () => {
      if (!isJp) {
        try { return { tcgdexUrl: await tcgdexLogoFor(setMeta), jpDirect: [] }; } catch (e) { return { tcgdexUrl: null, jpDirect: [] }; }
      } else {
        let jpDirect = jpDirectArtFor(setMeta);
        if (!jpDirect.length) {
          try { jpDirect = await jpFallbackArtFor(setMeta); } catch (e) { /* offline */ }
        }
        return { tcgdexUrl: null, jpDirect };
      }
    })();

    const ghPromise = (async () => {
      try {
        // 1niceroli/ptcg-assets is confirmed English-only (its own README:
        // "for now the collection is only in english"). Because TCGdex shares
        // one set id across every locale, a JP set's realIdLower (e.g.
        // "neo1") is the *same* id as that repo's English folder — so a
        // fallback to the plain, un-prefixed folder here would silently
        // serve an English pack photo for a Japanese set. Only the ja_
        // prefixed folder can ever legitimately be Japanese content; if it
        // 404s, there's nothing safe to fall back to in this repo.
        const ghRes = await fetchWithTimeout(`https://api.github.com/repos/1niceroli/ptcg-assets/contents/${githubId}/packshots`, 6000);
        if (ghRes.ok) {
          const files = await ghRes.json();
          const images = files.filter(f => f.type === 'file' && f.name.match(/\.(png|jpe?g|webp)$/i));
          images.sort((a, b) => a.name.localeCompare(b.name));
          return images.map(img => img.download_url);
        }
      } catch (e) { /* offline */ }
      return [];
    })();

    const [{ tcgdexUrl: resolvedTcgdexUrl, jpDirect }, ghConfirmed] = await Promise.all([tcgdexOrJpPromise, ghPromise]);
    let tcgdexUrl = resolvedTcgdexUrl;

    if (!tcgdexUrl && isJp && setMeta.images?.logo) {
      tcgdexUrl = setMeta.images.logo;
    }

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

// Both confetti (square chips) and sparks (thin radiating streaks, used
// for the pack-rip tear and the top-tier reveal effect) draw onto the
// same canvas. They used to each run their own independent
// requestAnimationFrame loop with their own clearRect — harmless when
// only one was ever active at a time, but the moment both need to run
// together (a legendary pull can spawn sparks while confetti from a
// previous reveal is still settling) two competing clearRect calls
// fight each other and produce a visible flicker. One shared loop, one
// clear per frame, both particle types drawn into it.
let particles = [];
let sparks = [];
let fxRunning = false;
function ensureFXLoop(){ if(!fxRunning){ fxRunning = true; requestAnimationFrame(tickFX); } }
function burstConfetti(count=60, colors=['#4de8e0','#e84dc0','#f0b94d','#ffffff']){
  if(!cctx || !confettiCanvas) return;
  const cx = innerWidth/2, cy = innerHeight*0.4;
  for(let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2, speed = 3+Math.random()*7;
    particles.push({ x:cx, y:cy, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed-3, life:1, size:4+Math.random()*4, color:colors[i%colors.length], rot:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.3 });
  }
  ensureFXLoop();
}
// Thin bright streaks radiating roughly left/right from a point — used
// for the pack tear (bursting along the seam) and the Hyper/Secret Rare
// reveal (see revealCurrent below), which deliberately does NOT use
// confetti — a card in that tier is meant to read as a different KIND
// of moment, not a bigger version of the same one.
function burstSparks(count=40, colors=['#ffffff','#4de8e0','#f0b94d'], originY=innerHeight*0.4){
  if(!cctx || !confettiCanvas) return;
  for(let i=0;i<count;i++){
    const goingLeft = Math.random() < 0.5;
    const ang = (Math.random()-0.5) * 0.7 + (goingLeft ? Math.PI : 0);
    const speed = 7+Math.random()*11;
    sparks.push({ x: innerWidth/2, y: originY, vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed*0.35 - 1.5, life:1, color: colors[i%colors.length] });
  }
  ensureFXLoop();
}
function tickFX(){
  if(!cctx || !confettiCanvas) { fxRunning = false; return; }
  cctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
  particles.forEach(p=>{ p.vy += 0.15; p.x += p.vx; p.y += p.vy; p.life -= 0.012; p.rot += p.vr;
    cctx.save(); cctx.globalAlpha = Math.max(p.life,0); cctx.translate(p.x,p.y); cctx.rotate(p.rot);
    cctx.fillStyle = p.color; cctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6); cctx.restore();
  });
  particles = particles.filter(p=>p.life>0 && p.y < innerHeight+50);
  sparks.forEach(s=>{ s.vy += 0.08; s.x += s.vx; s.y += s.vy; s.life -= 0.018;
    cctx.save(); cctx.globalAlpha = Math.max(s.life,0); cctx.strokeStyle = s.color; cctx.lineWidth = 2.2;
    cctx.beginPath(); cctx.moveTo(s.x, s.y); cctx.lineTo(s.x - s.vx*1.6, s.y - s.vy*1.6); cctx.stroke(); cctx.restore();
  });
  sparks = sparks.filter(s=>s.life>0);
  if(particles.length || sparks.length){ requestAnimationFrame(tickFX); } else { fxRunning = false; }
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

   All requests below go through the pokewallet-proxy Supabase Edge
   Function (supabase/functions/pokewallet-proxy/) rather than hitting
   api.pokewallet.io directly — that function holds the real API key
   as a server-side secret. See the CONFIG comment near where
   POKEWALLET_API_KEY used to live for why.
   ============================================================ */
const POKEWALLET_PROXY_URL = `${CONFIG.SUPABASE_URL}/functions/v1/pokewallet-proxy`;
// TEMP DEBUG (remove once re-confirmed working, same as the earlier
// round of this): records what the proxy actually returned, surfaced
// via the ?jpdebug=1 alert in getCardsForSet() below. Re-added because a
// lot changed since this was last verified (Edge Function redeploy,
// Cloudflare Worker in front of the image mirror, cache version bump).
let _lastPokeWalletSetDebug = null;
async function pokeWalletFetch(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(`${POKEWALLET_PROXY_URL}?path=${encodeURIComponent(path)}`, {
      signal: ctrl.signal,
      headers: {
        // Standard Supabase Edge Function auth — the anon key is meant
        // to be public (that's what RLS/function-level checks are for),
        // unlike the PokéWallet key this replaces.
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) {
      let body = null;
      try { body = await res.clone().json(); } catch (e2) { /* non-JSON error body — fine, status alone is still useful */ }
      _lastPokeWalletSetDebug = { path, status: res.status, ok: false, body };
      return null;
    }
    const json = await res.json();
    const cardCount = json?.cards?.length ?? (Array.isArray(json) ? json.length : 0);
    _lastPokeWalletSetDebug = { path, status: res.status, ok: true, cardCount };
    return json;
  } catch (e) {
    _lastPokeWalletSetDebug = { path, error: e?.name || String(e) };
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
// TCGdex's set codes (e.g. "E4", "PMCG1") are TCGdex's own internal ids —
// there's no guaranteed relationship to PokéWallet's own identifiers
// (per their docs, PokéWallet keys sets by its own set_code/group_id,
// which only happens to match TCGdex's code for some modern sets, not
// as a rule). When a set's real PokéWallet code is known, add it here —
// found via PokéWallet's own dashboard/site, not guessed — and it'll be
// used instead of the raw TCGdex code below. This is a manual, verified
// override rather than automatic fuzzy-matching against PokéWallet's
// /sets list on purpose: this API's schema has already been guessed
// wrong once before (see the card_number bugfix comment below), so
// another blind guess at how to reliably match set names across two
// different providers isn't worth the risk of silently mismatching a
// card's real art to the wrong set. Empty by default — every set just
// uses its TCGdex code as before until you add entries here.
const JP_POKEWALLET_SET_CODE_OVERRIDES = {
  // 'E4': '<the real PokéWallet set_code for this set, once known>',
};

// One set-level lookup (not per-card) to get PokéWallet's card list for
// this set, keyed by printed card number so it can be matched against
// TCGdex's localId. Tries the TCGdex set code as-is (after checking the
// override table above); PokéWallet set codes for modern-era sets
// commonly follow the same official convention, but this is a
// best-effort guess, not a guaranteed match — wrapped so any mismatch
// just yields an empty map and changes nothing.
async function pokeWalletCardsForSet(tcgdexRealId) {
  if (!tcgdexRealId) return {};
  const pwSetCode = JP_POKEWALLET_SET_CODE_OVERRIDES[tcgdexRealId] || tcgdexRealId;
  const data = await pokeWalletFetch(`/sets/${encodeURIComponent(pwSetCode)}?language=jap`);
  const cards = data?.cards || (Array.isArray(data) ? data : null);
  if (!cards || !cards.length) return {};
  const byNumber = {};
  for (const c of cards) {
    // BUGFIX: the real API nests this under card_info (per PokéWallet's
    // own docs — {id, card_info:{card_number, ...}}), not top-level on
    // the card object. Reading c.card_number/c.number here always came
    // back undefined, so byNumber was silently empty for every set —
    // including ones where this request succeeded with real data.
    const num = normCardNum(c.card_info?.card_number || c.card_number || c.number);
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

/* ============================================================
   ONE PIECE TCG ADAPTER — Punk Records (static dataset, via jsDelivr)
   ------------------------------------------------------------
   SWITCHED from optcgapi.com: its card_image URLs render with a
   diagonal "SAMPLE" watermark baked into the image file itself (a
   third-party API limitation, not something fixable client-side —
   see the note this replaced). Punk Records
   (github.com/buhbbl/punk-records) is a static, versioned JSON
   dataset generated by the vegapull tool directly from the OFFICIAL
   One Piece TCG website's own card data/art
   (en.onepiece-cardgame.com and its regional siblings), so
   img_full_url points at the same clean card images the official
   site itself uses — no marketplace-listing watermark.

   No API key, no rate limit, no server to go down independently —
   it's plain static JSON served off GitHub through jsDelivr's CDN
   (proper CORS headers, edge-cached). Layout (per language folder):
     GET /english/packs.json           -> [{ id, raw_title, title_parts }, ...]
     GET /english/cards/{pack_id}.json -> [{ id, pack_id, name, rarity,
                                              category, img_url,
                                              img_full_url, colors, cost,
                                              attributes, power, counter,
                                              types, effect, trigger }, ...]
   pack_id (e.g. "OP01", "ST01", or a numeric structure-deck id like
   "569001") is the same string used as this app's setId throughout.

   Rarity strings: Common, Uncommon, Rare, SuperRare, SecretRare,
   Leader, Special, TreasureRare, Promo (see OPTCG_TIERS below for
   how these map to pull-tier weighting).
   ============================================================ */
const PUNKRECORDS_BASE = 'https://cdn.jsdelivr.net/gh/buhbbl/punk-records@main/english';
const OPTCG_SETS_CACHE_KEY = 'cache_punkrecords_sets_v1';
const OPTCG_CARD_CACHE_VERSION = 'v2'; // v1->v2: switched source from optcgapi.com (watermarked images) to Punk Records

const OPTCG_TIERS = [
  { id:0, key:'common',   label:'Common',       color:'var(--tier-common, #94a3b8)',  match:/^(common|promo)$/i },
  { id:1, key:'uncommon', label:'Uncommon',     color:'var(--tier-uncommon, #4ade80)', match:/^uncommon$/i },
  { id:2, key:'rare',     label:'Rare',         color:'var(--tier-rare, #60a5fa)',    match:/^rare$/i },
  { id:3, key:'super',    label:'Super Rare',   color:'var(--tier-holo, #c084fc)',    match:/^superrare$/i },
  { id:4, key:'leader',   label:'Leader',       color:'var(--tier-double, #fb7185)',  match:/^leader$/i },
  { id:5, key:'secret',   label:'Secret Rare',  color:'var(--tier-hyper, #f59e0b)',   match:/^secretrare$/i },
  // Special/TreasureRare are campaign-exclusive alt-art prints, above
  // even Secret Rare in practice — kept as their own top tier.
  { id:6, key:'treasure', label:'Treasure Rare',color:'var(--tier-sillus, #facc15)',  match:/^(special|treasurerare)$/i },
];
function classifyOnePiece(rarity){
  if(!rarity) return OPTCG_TIERS[0];
  const r = String(rarity).trim();
  for(const t of OPTCG_TIERS){ if(t.match.test(r)) return t; }
  return OPTCG_TIERS[0];
}

// Fetches packs.json — tries the get-op-packs Supabase Edge Function
// FIRST, falling back to jsDelivr directly only if that fails. This
// order is deliberate and the reverse of how it reads: confirmed via
// Supabase edge logs (zero warm-set-cache-op invocations ever) and an
// empty set_card_cache for every onepiece set that direct client-side
// fetches to cdn.jsdelivr.net were failing outright for at least some
// users — the whole tab errored with no fallback, since nothing here
// ever went through Supabase before. Supabase's own egress reaches
// jsDelivr fine (see warm-set-cache-op's server-side fetch), so
// proxying through a Supabase Edge Function reaches a host the client
// already talks to for everything else, instead of a host that may be
// blocked on its network. Direct jsDelivr is kept as a fallback in case
// the Edge Function itself is ever down, not as the primary path.
async function fetchOnePiecePacksList(){
  try{
    const res = await fetchWithTimeout(`${CONFIG.SUPABASE_URL}/functions/v1/get-op-packs`, 12000, {
      headers: { Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`, apikey: CONFIG.SUPABASE_ANON_KEY },
    });
    if(!res.ok) throw new Error('get-op-packs ' + res.status);
    const body = await res.json();
    if(!Array.isArray(body.packs) || !body.packs.length) throw new Error('get-op-packs empty');
    return body.packs;
  }catch(e){
    console.error('fetchOnePiecePacksList: get-op-packs failed, falling back to direct jsDelivr:', e);
    const res = await fetchWithTimeout(`${PUNKRECORDS_BASE}/packs.json`, 12000);
    if(!res.ok) throw new Error('punk-records packs.json ' + res.status);
    const raw = await res.json();
    // punk-records' packs.json used to be a flat array; upstream now
    // serves an object keyed by pack id (e.g. {"569001": {...}, ...}).
    // Accept either shape so a future format change doesn't silently
    // break this again (see get-op-packs edge function for the same fix
    // on the primary path).
    const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object') ? Object.values(raw) : [];
    if(!list.length) throw new Error('punk-records packs.json empty');
    return list;
  }
}

async function getSetsOnePiece(){
  const cached = store.get(OPTCG_SETS_CACHE_KEY);
  if(cached && Date.now() - cached.t < 1000*60*60*12) return cached.data;
  try{
    const list = await fetchOnePiecePacksList();
    // No release dates in this dataset either, so sets keep their
    // natural list order (same reasoning as before this source swap).
    const data = list.map((s, idx) => ({
      id: s.id,
      name: s.raw_title || s.title_parts?.title || s.id,
      series: 'One Piece',
      total: 0,
      releaseDate: '',
      images: { symbol: '', logo: '' },
      packCost: Math.round(calculatePackCost(idx, list.length) * 20 / 5) * 5,
    }));
    store.set(OPTCG_SETS_CACHE_KEY, { t: Date.now(), data });
    return data;
  }catch(e){
    console.error('getSetsOnePiece failed:', e);
    if(cached) { toast('Showing cached One Piece sets — live data unavailable'); return cached.data; }
    throw e;
  }
}

async function getCardsForSetOnePiece(setId){
  const key = 'cache_optcg_cards_' + OPTCG_CARD_CACHE_VERSION + '_' + setId;
  const cached = store.get(key);
  if(cached && Date.now() - cached.t < 1000*60*60*24) return cached.data;

  // Shared cross-user cache next, before any external fetch — same
  // priority order as getCardsForSetPokemon. A set anyone else already
  // resolved (via warm-set-cache-op below, or the reactive retry in
  // ensureSetWarmed) is served straight from set_card_cache.
  const shared = await getSharedSetCache(setId);
  if (shared) {
    store.set(key, { t: Date.now(), data: shared });
    return shared;
  }

  try{
    // warm-set-cache-op is now the primary fetch path, not just a
    // fire-and-forget cache warmer: it resolves the set server-side
    // (via Supabase's own egress, which reaches jsDelivr fine) and
    // returns `cards` directly, self-warming set_card_cache in the same
    // call. This exists because the direct client-side fetch below was
    // confirmed failing outright for at least some users (jsDelivr
    // unreachable on their network path) — every prior attempt threw
    // before ever reaching the putSharedSetCache() call that used to be
    // the only thing hitting this function, which is why it had zero
    // invocations and set_card_cache had zero onepiece rows despite the
    // app having shipped for a while.
    const opRes = await fetchWithTimeout(`${CONFIG.SUPABASE_URL}/functions/v1/warm-set-cache-op`, 15000, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        apikey: CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ set_id: setId }),
    });
    if(!opRes.ok) throw new Error('warm-set-cache-op ' + opRes.status);
    const opBody = await opRes.json();
    if(!Array.isArray(opBody.cards) || !opBody.cards.length) throw new Error('warm-set-cache-op returned no cards for ' + setId);
    store.set(key, { t: Date.now(), data: opBody.cards });
    return opBody.cards;
  }catch(opErr){
    console.error('getCardsForSetOnePiece: warm-set-cache-op failed, falling back to direct jsDelivr for', setId, ':', opErr);
  }

  try{
    // Last-resort fallback: direct client fetch to jsDelivr. Punk
    // Records is already split one JSON file per pack, so this is a
    // single direct fetch — no full-dump fallback needed like the old
    // optcgapi.com adapter required.
    // NOTE: 'data', not 'cards' - upstream moved the flat per-set array
    // file from cards/<id>.json to data/<id>.json; cards/<id> is now a
    // directory containing one file per individual card instead.
    const res = await fetchWithTimeout(`${PUNKRECORDS_BASE}/data/${encodeURIComponent(setId)}.json`, 15000);
    if(!res.ok) throw new Error('punk-records data/' + setId + '.json ' + res.status);
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : [];
    if(!arr.length) throw new Error('punk-records set ' + setId + ' returned zero cards');
    // Drop cards with no sourceable image rather than leaving them as
    // broken "Image Unavailable" pulls (same convention used for the
    // Pokémon JP adapter above).
    const data = arr
      .filter(c => c.img_full_url)
      .map(c => ({
        id: c.id,
        name: c.name,
        rarity: c.rarity,
        game: 'onepiece', // stamped on every card so classifyForCard() resolves correctly later regardless of which tab is active when it's viewed
        images: { small: c.img_full_url, large: c.img_full_url },
        set: { name: setId },
      }));
    if(!data.length) throw new Error('punk-records set ' + setId + ' has no cards with images');
    store.set(key, { t: Date.now(), data });
    putSharedSetCache(setId, data, 'onepiece');
    return data;
  }catch(e){
    console.error('getCardsForSetOnePiece failed for', setId, ':', e);
    if(cached) { toast('Showing cached cards — live data unavailable'); return cached.data; }
    throw e;
  }
}

async function getSetsPokemon(){
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
// Dispatches to the active game's adapter (see GAMES registry, defined
// further down once all per-game implementations exist). Same routing
// pattern as classify() above. `game` is optional and overrides
// ACTIVE_GAME for this one call without touching global state — added
// so callers that need a specific game regardless of whatever tab the
// user is currently on (e.g. the global card search) don't have to
// mutate ACTIVE_GAME and race with anything else reading it mid-flight.
// Omitting it preserves the exact old behavior (reads ACTIVE_GAME), so
// every pre-existing call site is unaffected.
async function getSets(game){
  return GAMES[game || ACTIVE_GAME].getSets();
}

// TCGdex fetches below (unlike pokeFetch, which has its own 12s
// AbortController) had no timeout at all. getCardsForSet() for a JP set
// issues one of these per card to fetch rarity — 100+ individual requests
// for a large set, 8 at a time. With no timeout, a single stalled TCGdex
// connection leaves its worker's while-loop permanently pending, so
// Promise.all() never resolves and beginOpen() hangs on "Loading cards…"
// forever. This wraps every tcgdex fetch below with a hard deadline so a
// stalled request fails fast into the existing try/catch instead.
async function fetchWithTimeout(url, ms = 8000, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getCardsForSetPokemon(setId){
  const key = 'cache_cards_' + CARD_CACHE_VERSION + '_' + setId; // v3->v4: JP rarity; v4->v5: pokemontcg.io image fallback; v5->v6: fixed fallback to use English name; v6->v7: curated Trainer names; v7->v8: dexId-based fallback; v8->v9: empty-result handling fix; v9->v10: added PokéWallet native-JP-art fallback; v10->v11: fixed fallback order so PokéWallet actually runs instead of being pre-empted by the English TCGdex asset; v11->v12: fixed PokéWallet card_number field (was reading the wrong path, so it never matched anything); v12->v13: drop cards with no sourceable image from the pool instead of leaving them as broken "Image Unavailable" pulls; v13->v14: forced invalidation — extensive testing happened while the PokéWallet Edge Function/secret were still being set up, so both this local cache and the shared set_card_cache table could hold results cached during that broken window. Shares this same version string with CARD_CACHE_VERSION (see getSharedSetCache) specifically so both layers invalidate together from now on, not just this once.
  // TEMP DEBUG: ?jpdebug=1 forces a live refetch (bypassing BOTH the
  // local and shared caches) so the diagnostic alert below actually
  // reflects a fresh resolution, not whatever's cached.
  const jpDebugOn = new URLSearchParams(location.search).get('jpdebug') === '1';
  const cached = jpDebugOn ? null : store.get(key);
  if(cached && Date.now() - cached.t < 1000*60*60*24*7) return cached.data;

  // Shared cross-user cache next, before any external API calls — see
  // getSharedSetCache's comment above.
  const shared = jpDebugOn ? null : await getSharedSetCache(setId);
  if (shared) {
    store.set(key, { t: Date.now(), data: shared }); // warm the local 7-day cache too
    return shared;
  }

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
      let pokeWalletAttempted = false;
      if (jaCards.some(c => !c.image)) {
        pokeWalletAttempted = true;
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

      let dbgNativeJa = 0, dbgPokeWallet = 0, dbgEnglish = 0, dbgPokeTier = 0, dbgNone = 0;
      const dataAll = jaCards.map(c => {
        // Priority: native ja asset > PokéWallet native JP art > TCGdex en
        // asset > pokemontcg.io name match > pokemontcg.io dexId match.
        // PokéWallet must be checked before the en fallback, not after —
        // otherwise a card with an English asset but no ja asset always
        // wins on img and PokéWallet (the real JP-art source) never runs.
        const pwUrl = !c.image ? pokeWalletImgByCardId[c.id] : null;
        const img = c.image || (pwUrl ? '' : enByLocalId[c.localId]) || '';
        const pokeFallback = (!img && !pwUrl) ? (pokeImgByName[englishNameFor(c)] || pokeImgByDexId[dexIdByCardId[c.id]]) : null;
        if (c.image) dbgNativeJa++;
        else if (pwUrl) dbgPokeWallet++;
        else if (img) dbgEnglish++;
        else if (pokeFallback) dbgPokeTier++;
        else dbgNone++;
        return {
          id: 'jp-' + c.id,
          name: c.name,
          rarity: rarityByCardId[c.id] || '',
          game: 'pokemon', // JP is still the Pokémon adapter — same game, different region
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
          // Which tier actually resolved this card's art — 'native' or
          // 'pokewallet' mean genuine Japanese-sourced art; 'english' and
          // 'poketier' both mean English-print art shown on a Japanese
          // card. Ordinary card data everywhere else (name/rarity/images
          // are all any other code reads), but isSetGenuinelyJapanese()
          // below uses this to decide whether a whole SET is worth
          // listing at all — see renderHome's JP tab. A plain string
          // field survives JSON round-trips through both the local and
          // shared caches (unlike e.g. an extra property tacked onto the
          // array itself, which JSON.stringify silently drops), so this
          // works whether the cards came from a fresh resolution or a
          // cached one — it doesn't need to be recomputed either way.
          _artSource: c.image ? 'native' : pwUrl ? 'pokewallet' : img ? 'english' : pokeFallback ? 'poketier' : 'none',
          set: { name: setData.name || realId },
        };
      });

      // A card with no image from ANY tier (native ja, PokéWallet, English
      // TCGdex, pokemontcg.io name/dexId match) can never render anything
      // but a broken "Image Unavailable" placeholder — worse than just not
      // being in the pool, especially in a paid pack-opening flow. Drop
      // those from what generatePack() can actually draw. If dropping
      // leaves nothing usable, treat it the same as the zero-cards case
      // above (prefer stale cache, otherwise throw) rather than caching
      // an empty pool for a week.
      const data = dataAll.filter(c => c.images.small);
      if (!data.length) {
        if (cached) return cached.data;
        throw new Error('tcgdex ja set ' + realId + ' had no sourceable card images');
      }

      store.set(key, { t: Date.now(), data });
      putSharedSetCache(setId, data);

      // TEMP DEBUG (remove alongside _lastPokeWalletSetDebug above once
      // re-confirmed) — opt-in via ?jpdebug=1 only.
      if (jpDebugOn) {
        alert(
          `JP DEBUG — set ${realId}\n` +
          `Total cards: ${jaCards.length}\n` +
          `Native ja TCGdex art: ${dbgNativeJa}\n` +
          `PokéWallet art used: ${dbgPokeWallet}\n` +
          `English TCGdex fallback: ${dbgEnglish}\n` +
          `pokemontcg.io fallback: ${dbgPokeTier}\n` +
          `Dropped (no image at all): ${dbgNone}\n\n` +
          `PokéWallet proxy call: ${pokeWalletAttempted ? '' : '(skipped — every card already had native ja TCGdex art)'}\n${pokeWalletAttempted ? JSON.stringify(_lastPokeWalletSetDebug, null, 2) : ''}`
        );
      }

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
      game: 'pokemon',
      images: {
        small: c.images?.small || '',
        large: c.images?.large || '',
      },
      set: { name: c.set?.name || setId },
    }));
    store.set(key, { t: Date.now(), data });
    putSharedSetCache(setId, data);
    return data;
  }catch(e){
    if(cached){ toast('Showing cached cards — live data unavailable'); return cached.data; }
    throw e;
  }
}
// Dispatches to the active game's adapter — see GAMES registry below.
// `game` is optional (see getSets() above for why) and overrides
// ACTIVE_GAME for just this call.
async function getCardsForSet(setId, game){
  return GAMES[game || ACTIVE_GAME].getCardsForSet(setId);
}

/* ============================================================
   Rarity tiering 
   ============================================================ */
// BUGFIX: these `match` regexes were only ever written to match
// pokemontcg.io's English rarity strings, which put "Rare" FIRST
// ("Rare Holo", "Rare Ultra", "Rare Shiny"). TCGdex — the API the JP
// adapter uses (see getCardsForSetPokemon's tcgdex.net calls) — uses
// its own controlled vocabulary that instead puts "Rare" LAST for the
// exact same tiers ("Holo Rare", "Ultra Rare", "Shiny rare", "Shiny
// Ultra Rare"; confirmed against TCGdex's own published rarity list at
// github.com/tcgdex/cards-database/blob/master/interfaces.d.ts). Since
// classify()/classifyPokemon() is shared by both the English adapter
// (pokemontcg.io) and the JP adapter (TCGdex), only the English word
// order matched — every JP card whose real rarity was TCGdex's plain
// "Holo Rare", "Ultra Rare", "Shiny rare", or "Shiny Ultra Rare" fell
// through every tier check below, hit the generic `/rare/i` fallback
// at the bottom, and landed on plain "Rare" (or worse, "Common", for
// values like "LEGEND" that don't even contain the word "rare") —
// exactly the "full art / clearly rare JP cards showing as
// common/uncommon" symptom. Fixed by matching both word orders.
const TIERS = [
  { id:0, key:'common', label:'Common', color:'var(--tier-common)', match:/^common$/i },
  { id:1, key:'uncommon', label:'Uncommon', color:'var(--tier-uncommon)', match:/^uncommon$/i },
  { id:2, key:'rare', label:'Rare', color:'var(--tier-rare)', match:/^rare$/i },
  { id:3, key:'holo', label:'Holo Rare', color:'var(--tier-holo)', match:/rare holo$|^holo rare$|classic collection|radiant|amazing|ace spec|rare holo lv\.?x/i },
  { id:4, key:'double', label:'Double Rare', color:'var(--tier-double)', match:/\b(ex|gx|v|vmax|vstar|break|prime|shining|legend)\b/i },
  { id:5, key:'ultra', label:'Ultra Rare', color:'var(--tier-ultra)', match:/rare ultra|^ultra rare$|full art|rare shiny$|^shiny rare$/i },
  { id:6, key:'illustration', label:'Illustration Rare', color:'var(--tier-illus)', match:/^illustration rare$/i },
  { id:7, key:'sillustration', label:'Special Illustration Rare', color:'var(--tier-sillus)', match:/special illustration|rare rainbow|trainer gallery|black white rare/i },
  { id:8, key:'hyper', label:'Hyper / Secret Rare', color:'var(--tier-hyper)', match:/hyper|secret|rare shiny gx|gold|shiny ultra rare/i },
];
function classifyPokemon(rarity){
  if(!rarity) return TIERS[0];
  for(let i=TIERS.length-1;i>=1;i--){ if(TIERS[i].match.test(rarity)) return TIERS[i]; }
  if(/rare/i.test(rarity)) return TIERS[2];
  if(/uncommon/i.test(rarity)) return TIERS[1];
  return TIERS[0];
}
// Dispatches to the active game's adapter (see GAMES registry). Signature/
// call sites are unchanged — this is a pure routing layer so every existing
// classify(rarity) call keeps working as-is while other games can plug in
// their own tier logic later.
function classify(rarity){
  return GAMES[ACTIVE_GAME].classify(rarity);
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

// Filters a JP set's card pool down to ones that actually have genuine
// Japanese-sourced art (_artSource 'native' or 'pokewallet' — same bar
// isSetGenuinelyJapanese uses to decide whether the SET belongs on the
// JP tab at all). Without this, a set that's, say, 90% genuine JP art
// still has that other 10% sitting in the exact same pool generatePack
// draws from — an English-art card can and does get pulled into an
// otherwise-JP pack. The set-level check only answers "is this set
// worth listing", it was never filtering what a pack from it could
// actually contain.
// Falls back to the full pool if filtering would empty it out entirely
// (better to show a still-mostly-correct pack than crash on 0 cards),
// but that should be rare — sets only pass the set-level check to begin
// with because most of their cards already clear this same bar.
function filterToGenuineArt(cards){
  const genuine = cards.filter(c => c._artSource === 'native' || c._artSource === 'pokewallet');
  return genuine.length ? genuine : cards;
}

/* ============================================================
   Auth & profile
   ============================================================ */
let session = null, profile = null, guestMode = true;
// Free pack tickets — real per-set redemption rights (see open_pack in the
// SQL), keyed as "<game>:<setId>" -> count. Populated on login and after
// any grant/consumption; a stale/empty cache just means the free-ticket
// banner doesn't show yet, never a functional problem — the actual
// redemption is enforced server-side inside open_pack regardless of what
// this cache says.
let myPackTickets = {};
async function refreshPackTickets(){
  if (guestMode || !session?.user) { myPackTickets = {}; return; }
  try {
    const { data, error } = await sb.from('pack_tickets').select('game,set_id,count').gt('count', 0);
    if (error) throw error;
    const next = {};
    (data || []).forEach(r => { next[`${r.game}:${r.set_id}`] = r.count; });
    myPackTickets = next;
  } catch (e) {
    console.warn('refreshPackTickets failed:', e.message);
    myPackTickets = {}; // don't leave a possibly-stale (or another account's) ticket count showing
  }
}

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

/* ============================================================
   Realtime trade/duel notifications
   ------------------------------------------------------------
   Trade Hub used to require a manual reopen (or the Retry button)
   to find out about a new offer/challenge or a response to one you
   sent. These two channels push that instantly via Supabase
   Realtime instead — a toast the moment a row lands, plus a live
   refresh of the Trade Hub screen if it's the one currently open.
   Requires Realtime replication to be turned on for the
   trade_offers and duels tables (Database → Replication in the
   Supabase dashboard) — if it isn't, .subscribe()'s CHANNEL_ERROR
   below just logs a warning and the app falls back to the existing
   manual-refresh behavior, same as CDN_IMAGE_BASE/CDN_DB_BASE being
   left blank elsewhere in this file.
   ============================================================ */
let _realtimeChannels = [];
function teardownRealtimeNotifications(){
  _realtimeChannels.forEach(ch => { try{ sb.removeChannel(ch); }catch(e){} });
  _realtimeChannels = [];
}
function setupRealtimeNotifications(){
  teardownRealtimeNotifications(); // guard against a second subscribe if onLoggedIn fires again for the same session (see the deepLinkRenderedAt callers)
  if(guestMode || !session?.user) return;
  const uid = session.user.id;

  const tradeCh = sb.channel(`trade-notify-${uid}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'trade_offers', filter:`to_user=eq.${uid}` }, () => {
      toast('🔔 New trade offer received!');
      if(route.name === 'trade') render('trade', route.params);
    })
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'trade_offers', filter:`from_user=eq.${uid}` }, (payload) => {
      const status = payload.new?.status;
      if(status === 'accepted') toast('✅ Your trade offer was accepted!');
      else if(status === 'declined') toast('Your trade offer was declined.');
      if(route.name === 'trade') render('trade', route.params);
    })
    .subscribe((status) => {
      if(status === 'CHANNEL_ERROR') console.warn('Trade realtime channel unavailable — check that Realtime replication is enabled for trade_offers.');
    });
  _realtimeChannels.push(tradeCh);

  const duelCh = sb.channel(`duel-notify-${uid}`)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'duels', filter:`opponent_id=eq.${uid}` }, () => {
      toast('⚔️ New duel challenge!');
      if(route.name === 'trade') render('trade', route.params);
    })
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'duels', filter:`challenger_id=eq.${uid}` }, (payload) => {
      const status = payload.new?.status;
      if(status === 'accepted') toast('⚔️ Your duel challenge was accepted — open your pack!');
      else if(status === 'declined') toast('Your duel challenge was declined.');
      if(route.name === 'trade') render('trade', route.params);
    })
    .subscribe((status) => {
      if(status === 'CHANNEL_ERROR') console.warn('Duel realtime channel unavailable — check that Realtime replication is enabled for duels.');
    });
  _realtimeChannels.push(duelCh);
}

async function initAuth(){
  const { data } = await sb.auth.getSession();
  session = data.session;
  sb.auth.onAuthStateChange((_evt, s)=>{ 
    session = s; 
    if(s){ guestMode = false; onLoggedIn(); } 
    else {
      profile = null; guestMode = true;
      myPackTickets = {}; // stale tickets from the account that just signed out must not leak into guest mode or the next login
      teardownRealtimeNotifications();
      // See the deepLinkRenderedAt comment in onLoggedIn() — same
      // reasoning: don't let a late-firing INITIAL_SESSION event from
      // this listener undo a deep-link render that JUST happened at
      // the end of initAuth(), while still rendering normally for any
      // genuine logout (which won't be within this narrow window).
      if (Date.now() - deepLinkRenderedAt > 3000) render('home');
    }
  });
  if(session) {
    guestMode = false;
    await onLoggedIn();
  } else {
    guestMode = true;
    checkDailyStreak();
    render('home');
  }
  // If the page was opened via a share link, navigate to it now — after
  // the normal boot render above has settled, so this simply overrides
  // whatever 'home' just rendered rather than needing to be threaded
  // through every call site that can render during boot (onLoggedIn()
  // is also called later for genuine, non-boot logins, so it can't
  // itself carry one-time deep-link logic without breaking that case).
  // deepLinkRenderedAt records when this happens so the onAuthStateChange
  // listener above and onLoggedIn() below can each tell "a deep link
  // render JUST happened, an immediately-following INITIAL_SESSION
  // firing shouldn't undo it" apart from "this is a real, later login/
  // logout — render normally."
  if (pendingDeepLink) {
    const dl = pendingDeepLink;
    pendingDeepLink = null;
    deepLinkRenderedAt = Date.now();
    render(dl.name, dl.params);
  }
}
// The marketing opt-in checkbox only exists on the email/password signup
// view (see openAuthModal's renderEmailView) — Google sign-in skips it
// entirely and the server-side trigger defaults marketing_opt_in to
// false for those accounts (see handle_new_user). Since Google is the
// FIRST button offered, most real signups never see the checkbox at
// all. This asks once per account (tracked via a local "asked" flag,
// not account age — a time-window check meant it could silently never
// fire if there was any delay between signup and this running, or for
// any account that existed before this fix shipped) instead of
// silently losing that opt-in entirely for anyone who used Google.
let _marketingOptInPrompted = false; // guards against onLoggedIn firing more than once in the same page load
// Fires this on a delay after login rather than the instant onLoggedIn()
// resolves — showing it immediately meant it slammed down over the home
// screen before it had even finished rendering, which read as an
// aggressive, badly-timed popup rather than a casual one-time ask.
// Waiting a few seconds lets the person actually land on the app first;
// checking for an existing overlay (auth modal, card viewer, etc.) and
// document visibility avoids stacking on top of something else or firing
// while the tab is backgrounded. If either check fails it just retries
// once, a moment later, rather than giving up (asked-flag isn't set yet,
// so nothing is lost either way).
const MARKETING_OPTIN_DELAY_MS = 4000;
function scheduleMarketingOptInPrompt(){
  setTimeout(() => {
    if(document.hidden){
      document.addEventListener('visibilitychange', function onVis(){
        if(!document.hidden){ document.removeEventListener('visibilitychange', onVis); scheduleMarketingOptInPrompt(); }
      });
      return;
    }
    if(document.querySelector('.overlay')){ setTimeout(scheduleMarketingOptInPrompt, MARKETING_OPTIN_DELAY_MS); return; }
    maybePromptMarketingOptIn();
  }, MARKETING_OPTIN_DELAY_MS);
}
const MARKETING_OPTIN_BONUS = 2500;

async function maybePromptMarketingOptIn(){
  if(_marketingOptInPrompted || guestMode || !session?.user || !profile) return;
  const isGoogle = session.user.app_metadata?.provider === 'google';
  const alreadyDecided = profile.marketing_opt_in === true;
  const askedKey = scopedKey('marketing_optin_asked');
  const alreadyAsked = store.get(askedKey, false);
  if(!isGoogle || alreadyDecided || alreadyAsked) return;
  // Something else claimed the screen between when this was scheduled and
  // now (e.g. the person opened a pack) — don't interrupt that, try again
  // shortly instead of forcing the sheet on top of it.
  if(document.querySelector('.overlay')){ setTimeout(scheduleMarketingOptInPrompt, MARKETING_OPTIN_DELAY_MS); return; }
  _marketingOptInPrompted = true;
  store.set(askedKey, true); // set immediately, not just on dismiss — so a reload mid-prompt can't loop it forever

  // A non-blocking bottom banner, not a full-screen overlay+sheet. This
  // used to use the same `.overlay`/`.sheet` modal pattern as things like
  // "Get more credits" — appropriate for something the person actively
  // opened, wrong for something that interrupts them unprompted. A
  // modal demands a decision before you can do anything else; a banner
  // sits below the content, doesn't dim/block the screen, and can just
  // be ignored and scrolled past if that's what someone wants to do with
  // it — much closer to how a permission-respecting app should ask for
  // something optional. The credit incentive is new too: previously this
  // asked for an email address for literally nothing in return.
  const banner = el('div', 'optin-banner');
  banner.innerHTML = `
    <button type="button" class="optin-banner-close" aria-label="Dismiss">✕</button>
    <div class="optin-banner-title">Get +${MARKETING_OPTIN_BONUS.toLocaleString()} credits</div>
    <div class="optin-banner-sub">Sign up for emails about new set drops and deals — unsubscribe anytime.</div>
    <div style="display:flex; gap:8px; margin-top:10px;">
      <button class="btn btn-secondary" id="optin-no-btn" style="flex:1;">No thanks</button>
      <button class="btn btn-primary" id="optin-yes-btn" style="flex:1;">Yes, email me</button>
    </div>`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('show'));

  function dismiss(){ banner.classList.remove('show'); setTimeout(() => banner.remove(), 250); }
  $('.optin-banner-close', banner).addEventListener('click', dismiss);
  $('#optin-no-btn', banner).addEventListener('click', dismiss);
  $('#optin-yes-btn', banner).addEventListener('click', async () => {
    const yesBtn = $('#optin-yes-btn', banner);
    yesBtn.disabled = true; yesBtn.textContent = '…';
    try{
      const { data: newBalance, error } = await sb.rpc('claim_marketing_optin_bonus');
      if(error) throw error;
      if(profile){ profile.marketing_opt_in = true; profile.credits = newBalance; }
      const creditCountEl = $('#credit-count');
      if(creditCountEl) creditCountEl.textContent = isAdminUser() ? '∞' : newBalance;
      SFX.coin();
      toast(`You're on the list — +${MARKETING_OPTIN_BONUS.toLocaleString()} credits!`);
    }catch(e){
      console.warn('claim_marketing_optin_bonus failed:', e.message);
      toast('Could not save that — try again from your account settings later.');
    }
    dismiss();
  });
}

async function onLoggedIn(){
  await loadProfile();
  checkDailyStreak();
  setupRealtimeNotifications();
  scheduleMarketingOptInPrompt();
  await refreshPackTickets();

  if (store.get('pending_welcome_bonus', false)) {
    try {
      const { error } = await sb.rpc('claim_welcome_bonus');
      if (error) throw error;
      store.set('pending_welcome_bonus', false);
      await refreshPackTickets();
      toast('Welcome! You got a free Base Set & Base Set 2 pack — check the ticket badge on those sets');
    } catch (e) {
      // Most likely "already claimed" for a returning Google user (see
      // the comment at the google-auth-btn click handler) — that's
      // expected and not an error worth surfacing. Anything else just
      // leaves the flag set to retry next login rather than losing the
      // bonus silently.
      if (String(e.message || '').includes('already')) store.set('pending_welcome_bonus', false);
      else console.warn('claim_welcome_bonus:', e.message);
    }
  }

  // Catch-up sync rather than a one-shot claim — safe to call every
  // login, including for accounts that referred people before this
  // bonus existed. Pays only the gap between what referral_count
  // entitles them to and what's already been granted (see the RPC).
  if (!guestMode && session?.user) {
    sb.rpc('sync_referral_pack_bonus').then(async ({ data, error }) => {
      if (error || !data) return;
      await refreshPackTickets();
      if (data.granted > 0) toast(`+${data.granted} free pack ticket${data.granted === 1 ? '' : 's'} — referral bonus`);
    }).catch(() => {});
  }

  const pendingRef = store.get('pending_ref');
  if(pendingRef && profile){
    try{ await sb.rpc('redeem_referral', { p_code: pendingRef }); store.set('pending_ref', null); await loadProfile(); toast('Referral bonus applied — +' + CONFIG.ECONOMY.REFERRAL_BONUS.toLocaleString() + ' credits'); track('referral_redeemed'); }
    catch(e){
      // Keep it queued if the only blocker is email verification — this
      // same code path runs again on the next loadProfile, so it'll
      // naturally succeed once they confirm. Every other failure reason
      // (already redeemed, invalid code, self-referral) is terminal —
      // clear it so we don't retry something that can never succeed.
      if(String(e.message||'') !== 'verify_your_email_first') store.set('pending_ref', null);
    }
  }
  // See deepLinkRenderedAt in initAuth(): if this call is the boot-time
  // invocation (via initAuth's `await onLoggedIn()`), deepLinkRenderedAt
  // is still its initial 0 here (that only gets set AFTER this await
  // resolves, back in initAuth), so this renders 'home' normally — which
  // is correct, since the deep-link override (if any) is applied right
  // after in initAuth anyway. This guard only matters for a delayed
  // INITIAL_SESSION firing that calls onLoggedIn() again AFTER initAuth
  // has already finished and applied a deep link — without it, that
  // second call would silently flip the screen back to 'home'. A real,
  // later login (well outside this window) renders normally either way.
  if (Date.now() - deepLinkRenderedAt > 3000) render('home');
}
// Achievements are purely cosmetic/status — earned from existing gameplay
// tables (openings/trade_offers/duels/card_sales) or, for the client-checked
// ones, granted through the allow-listed award_achievement RPC. Nothing here
// ever reads or writes credits, pack odds, or pack contents.
const ACHIEVEMENT_META = {
  first_pull:    { label: 'First Pull',    desc: 'Opened your first pack' },
  pack_rat:      { label: 'Pack Rat',      desc: 'Opened a bunch of packs' },
  century_club:  { label: 'Century Club',  desc: 'Opened 100 packs' },
  first_trade:   { label: 'First Trade',   desc: 'Completed your first trade' },
  dealmaker:     { label: 'Dealmaker',     desc: 'Completed several trades' },
  duelist:       { label: 'Duelist',       desc: 'Completed your first duel' },
  win_streak_5:  { label: 'Win Streak',    desc: 'Won 5 duels in a row' },
  dealer:        { label: 'Dealer',        desc: 'Sold cards on the market' },
  high_roller:   { label: 'High Roller',   desc: 'Sold cards for a lot of credits' },
  set_complete:  { label: 'Set Complete',  desc: 'Completed a full set' },
  collector:     { label: 'Collector',     desc: 'Completed 5 full sets' },
  whale_watcher: { label: 'Whale Watcher', desc: 'Pulled a top-tier rare card' },
  popular:       { label: 'Popular',       desc: 'Referred several friends' },
};
let myAchievements = [];

// Best-effort: recompute the server-verifiable achievements, refetch the
// current list, and re-render the account area if it's on screen. Never
// throws into a caller — a missed/late badge is fine, a broken pack-open
// or trade flow because of it is not.
async function syncAchievementsQuiet(){
  if(!session?.user) return;
  try{
    await sb.rpc('sync_achievements', { p_user_id: session.user.id });
    const { data } = await sb.from('achievements').select('achievement_key').eq('user_id', session.user.id);
    myAchievements = (data || []).map(r => r.achievement_key);
    if(document.getElementById('account-section') && profile) renderAccountArea(session.user, profile);
  }catch(e){ /* non-critical */ }
}

async function loadProfile(attempt=1){
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if(error){
    if(error.code === 'PGRST116' && attempt === 1){
      const { error: insertErr } = await sb.from('profiles').insert({
        id: session.user.id,
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
    syncAchievementsQuiet();

    // profiles has no packs_opened/referral_count columns — those are
    // computed live server-side (see check_and_upgrade_tier) and never
    // written back to the row. Without this, getTierProgress()'s
    // packs/referrals fallback chain always resolved to 0, so the "X/Y
    // packs to next tier" progress bar was permanently stuck at zero
    // for every real account regardless of actual history. Fire-and-
    // forget: current tier itself (profile.premium_tier) is already
    // correct without this, so there's nothing broken while this is
    // still in flight — it only fills in the progress-bar numbers once
    // it resolves.
    sb.rpc('get_my_stats').then(({ data: stats, error: statsErr }) => {
      if (statsErr || !stats || !profile) return;
      profile.packs_opened = stats.packs;
      profile.referral_count = stats.referrals;
      if (document.getElementById('account-section')) renderAccountArea(session.user, profile);
    }).catch(() => {});

    // Tier daily/monthly bonuses are claim-based, not passive — they
    // only land when the account owner has the app open, which is why
    // credits don't move on days nobody signs in. Both claims fire here
    // on every load (each is a no-op server-side if already claimed for
    // the current day/month), and a toast surfaces it since crediting
    // the balance silently made it easy to miss you got anything at all.
    if (profile.premium_tier && profile.premium_tier !== 'free') {
      const today = new Date().toISOString().slice(0, 10);
      const thisMonth = today.slice(0, 7);
      const startingCredits = profile.credits || 0;

      const applyGrant = (newCreds) => {
        if (newCreds === null || newCreds === undefined) return;
        profile.credits = newCreds;
        if (creditCountEl && !isAdminUser()) creditCountEl.textContent = newCreds;
      };

      const claims = [];
      if (profile.last_daily_grant !== today) {
        claims.push(
          sb.rpc('claim_daily_credits').then(({ data: newCreds, error: claimErr }) => {
            if (!claimErr) { applyGrant(newCreds); profile.last_daily_grant = today; }
          }).catch(()=>{})
        );
      }
      if (profile.last_monthly_grant !== thisMonth) {
        claims.push(
          sb.rpc('claim_monthly_credits').then(({ data: newCreds, error: claimErr }) => {
            if (!claimErr) { applyGrant(newCreds); profile.last_monthly_grant = thisMonth; }
          }).catch(()=>{})
        );
      }
      if (claims.length) {
        Promise.all(claims).then(() => {
          const grantedTotal = (profile.credits || 0) - startingCredits;
          if (grantedTotal > 0) toast(`+${grantedTotal.toLocaleString()} credits — welcome back!`);
        });
      }
    }
  }
}


(function captureRef(){
  const p = new URLSearchParams(location.search);
  if(p.get('ref')) store.set('pending_ref', p.get('ref'));
})();

// Share-link deep linking (see shareLink/sharePull/shareCollection near
// showSummary, and renderSharedPull). Consumed once, at the end of
// initAuth() below, after whatever normal boot render already happened
// — see the comment there for why it's applied that way rather than
// threaded through every render call site during boot.
let pendingDeepLink = null;
let deepLinkRenderedAt = 0; // see initAuth()/onLoggedIn() for how this guards against a late-firing INITIAL_SESSION event undoing the deep link
(function captureShareLink(){
  const p = new URLSearchParams(location.search);
  const pullId = p.get('pull');
  const userId = p.get('u');
  if (pullId) pendingDeepLink = { name: 'shared_pull', params: { openingId: pullId } };
  else if (userId) pendingDeepLink = { name: 'user_collection', params: { userId, username: p.get('un') || '' } };
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

// Switches the active collection locally AND mirrors the choice to the
// server (profiles.active_collection) — the server needs to know which
// collection to credit when resolving a Pack Duel server-side, since
// that can happen while this client isn't even open. Best-effort: a
// failed server sync doesn't block switching locally.
function setActiveCollectionName(name){
  store.set(scopedKey('active_collection'), name);
  if(session && !guestMode){
    sb.from('profiles').update({ active_collection: name }).eq('id', session.user.id).then(({error}) => {
      if(error) console.error('Could not sync active collection to server:', error);
    });
  }
}

function getActiveCollectionCards() {
  const map = getCollectionsMap();
  const active = getActiveCollectionName();
  return map[active] || {};
}

// Best-effort mirror of local collection changes up to the server (see
// collection_server_sync.sql). Fire-and-forget: a failed sync never
// blocks the local UI, since local storage remains the thing every
// screen actually reads/writes synchronously. This is what lets Pack
// Duel resolve card transfers without depending on this client being
// open — see submit_duel_pull, which does its own server-side mirroring
// directly and does NOT need this helper called for duel packs.
function syncCollectionDeltaToServer(collectionName, deltas){
  if(!session || guestMode || !deltas.length) return;
  sb.rpc('adjust_collection_cards', { p_collection_name: collectionName, p_deltas: deltas }).then(({error}) => {
    if(error) console.error('Could not sync collection to server:', error);
  });
}

function persistToActiveCollection(packCards, opts={}){
  const map = getCollectionsMap();
  const active = getActiveCollectionName();
  map[active] = map[active] || {};
  const serverDeltas = [];
  packCards.forEach(p=>{
    const c = p.card;
    // Tag with the game that was active when this card was pulled, so
    // classify() can be resolved per-card later regardless of which
    // game tab is active when the collection is viewed (see
    // classifyForCard() below). Older entries pulled before this tag
    // existed have no `game` field — classifyForCard() treats a
    // missing tag as 'pokemon' since that's the only game that could
    // have produced them.
    map[active][c.id] = map[active][c.id] || { name:c.name, image:c.images.small, rarity:c.rarity, count:0, game: c.game || ACTIVE_GAME };
    map[active][c.id].count++;
    serverDeltas.push({ id: c.id, name: c.name, rarity: c.rarity, image: c.images.small, game: c.game || ACTIVE_GAME, delta: 1 });
  });
  store.set(scopedKey('user_collections'), map);
  if(!opts.skipServerSync) syncCollectionDeltaToServer(active, serverDeltas);
}
// classify() itself always uses the currently active game (right for
// pack-opening, where every card on screen belongs to ACTIVE_GAME).
// Stored collection cards need to be classified by the game they were
// actually pulled from, which may differ from whatever tab is active
// right now — this resolves that per-card instead of globally.
function classifyForCard(cardLike){
  const game = cardLike?.game || 'pokemon';
  return (GAMES[game] || GAMES.pokemon).classify(cardLike.rarity);
}

async function renderSharedPull(openingId) {
  const wrap = el('div');
  wrap.innerHTML = `<div class="hint" style="margin-top:22px;">Loading shared pull...</div>`;
  app.appendChild(wrap);

  const { data, error } = await sb.rpc('get_shared_opening', { p_opening_id: openingId });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    wrap.innerHTML = `
      <div class="empty-state" style="margin-top:22px;">This shared pull couldn't be found — the link may be invalid, or it's been removed.</div>
      <button class="btn btn-primary" style="width:100%;margin-top:14px;" id="shared-pull-home">Open the app</button>
    `;
    $('#shared-pull-home', wrap).addEventListener('click', () => render('home'));
    return;
  }

  const cards = row.cards || [];
  const best = cards.length ? cards.reduce((a,b)=> classify(b.rarity).id > classify(a.rarity).id ? b : a) : null;

  wrap.innerHTML = `
    <div class="section-title" style="margin:22px 0 4px;">${escapeHtml(row.username) || 'A collector'}'s pull</div>
    <div class="hint" style="margin-bottom:14px;">From ${escapeHtml(row.set_name) || 'a pack'}${best ? ` — best pull: <b style="color:var(--text)">${escapeHtml(best.name)}</b> (${escapeHtml(best.rarity)})` : ''}</div>
    <div class="summary-grid" id="shared-pull-grid"></div>
    <button class="btn btn-primary" style="width:100%;margin-top:18px;" id="shared-pull-view-collection">View ${escapeHtml(row.username) || 'their'}'s full collection →</button>
    <button class="btn btn-secondary" style="width:100%;margin-top:10px;" id="shared-pull-home">Open your own pack</button>
  `;
  const grid = $('#shared-pull-grid', wrap);
  cards.forEach(c => {
    const tier = classify(c.rarity);
    const mini = el('div','mini'+(tier.id>=4?' hit':''));
    mini.innerHTML = `<img src="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/>`;
    mini.addEventListener('click', async ()=> showCardFullscreen(await ImgCache.get(c.image), c));
    grid.appendChild(mini);
    ImgCache.get(c.image).then(src => {
      const imgEl = mini.querySelector('img');
      if (imgEl && src) imgEl.src = src;
    });
  });
  $('#shared-pull-view-collection', wrap).addEventListener('click', () => render('user_collection', { userId: row.user_id, username: row.username }));
  $('#shared-pull-home', wrap).addEventListener('click', () => render('home'));
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
  if(name==='shared_pull') renderSharedPull(params.openingId);
  if(name==='trade') renderTrade();
  if(name==='battle') renderBattleHome();
  if(name==='battle_deck_builder') renderBattleDeckBuilder();
  if(name==='battle_duel') renderBattleDuel(params.deck);
  if(name==='set_checklist') renderSetChecklist(params.set);
  if(name==='pack_contents') renderPackContents(params.set);
  if(name==='privacy') renderLegalPage('privacy');
  if(name==='terms') renderLegalPage('terms');

  // Persistent Privacy/Terms links — added here, once, at the dispatcher
  // level rather than inside each individual screen function, so every
  // route gets it automatically (including any screen added later)
  // instead of relying on each one to remember to include it. Before
  // this, the only Privacy/Terms links in the whole app lived at the
  // bottom of the Profile tab — every other screen (set detail,
  // collection, search, trade, battle, checklist, pack contents, shared
  // pull, user collection) had no path to them at all. Skipped on
  // 'profile' (already has its own fuller version alongside the
  // affiliate disclosure) and on 'privacy'/'terms' themselves (already
  // showing the content this links to).
  if (name !== 'profile' && name !== 'privacy' && name !== 'terms') {
    const globalLegalFooter = el('div');
    globalLegalFooter.style.cssText = 'text-align:center; margin-top:20px; padding-top:2px; display:flex; gap:12px; justify-content:center;';
    globalLegalFooter.innerHTML = `
      <a href="#" id="global-footer-privacy-link" style="color:var(--dim-2, var(--dim)); font-size:10.5px; text-decoration:underline; opacity:0.7;">Privacy Policy</a>
      <a href="#" id="global-footer-terms-link" style="color:var(--dim-2, var(--dim)); font-size:10.5px; text-decoration:underline; opacity:0.7;">Terms of Service</a>
    `;
    app.appendChild(globalLegalFooter);
    $('#global-footer-privacy-link', globalLegalFooter).addEventListener('click', (e) => { e.preventDefault(); render('privacy'); });
    $('#global-footer-terms-link', globalLegalFooter).addEventListener('click', (e) => { e.preventDefault(); render('terms'); });
  }
  
  app.appendChild(renderTabs());
}

// Small pack-art strip used on the signup screen ("sign up and get these
// free") — reuses the real pack-art resolution chain (own photographed
// art → TCGdex → other fallbacks) so these aren't placeholder/fake
// images, just the same art the actual pack-opening screens use.
// Only base1/base2 are ever actually granted as free tickets (welcome
// bonus + referral bonus) — see claim_welcome_bonus / redeem_referral
// in the SQL. Fossil/Jungle stay defined here (harmless) in case a
// future promo wants them, but nothing currently passes their ids into
// renderPromoPackStrip.
const PROMO_PACK_SETS = [
  { id: 'base1', name: 'Base', label: 'Base Set' },
  { id: 'base2', name: 'Base Set 2', label: 'Base Set 2' },
  { id: 'fossil', name: 'Fossil', label: 'Fossil' },
  { id: 'jungle', name: 'Jungle', label: 'Jungle' },
];

function renderPromoPackStrip(container, setIds){
  const sets = PROMO_PACK_SETS.filter(s => setIds.includes(s.id));
  if (!sets.length) return;
  container.innerHTML = sets.map(s => `
    <div class="promo-pack-tile" id="promo-pack-${s.id}">
      <div class="promo-pack-img-wrap"><div class="promo-pack-placeholder">${escapeHtml(s.label)}</div></div>
      <div class="promo-pack-label">${escapeHtml(s.label)}</div>
    </div>`).join('');

  sets.forEach(async s => {
    try {
      const urls = await Prewarm.resolvePackArtUrls(s);
      if (!urls || !urls.length) return;
      const wrap = container.querySelector(`#promo-pack-${s.id} .promo-pack-img-wrap`);
      if (wrap) wrap.innerHTML = `<img src="${urls[0]}" alt="${escapeHtml(s.label)} pack" loading="lazy" decoding="async"/>`;
    } catch (e) { /* leave the text placeholder — never break the signup flow over art */ }
  });
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

      <div class="promo-pack-strip" id="signup-promo-strip"></div>
      <div class="hint" style="text-align:center; margin:6px 0 14px;">New accounts get a free Base Set &amp; Base Set 2 pack on top of starting credits</div>

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
      <div class="hint" style="margin-top:10px;text-align:center;font-size:10.5px;">By continuing, you agree to our <a href="#" id="auth-terms-link" style="color:var(--dim); text-decoration:underline;">Terms</a> and <a href="#" id="auth-privacy-link" style="color:var(--dim); text-decoration:underline;">Privacy Policy</a>.</div>
    `;

    $('#auth-terms-link', sheet)?.addEventListener('click', (e) => { e.preventDefault(); overlay.remove(); render('terms'); });
    $('#auth-privacy-link', sheet)?.addEventListener('click', (e) => { e.preventDefault(); overlay.remove(); render('privacy'); });

    const promoStrip = $('#signup-promo-strip', sheet);
    if (promoStrip) renderPromoPackStrip(promoStrip, ['base1', 'base2']);

    const errBox = $('#auth-error-msg', sheet);

    $('#google-auth-btn', sheet).addEventListener('click', async () => {
      errBox.style.color = 'var(--text)'; errBox.textContent = 'Redirecting to Google...';
      // Set optimistically for both new and returning Google users — the
      // claim_welcome_bonus RPC is idempotent (won't pay twice), and
      // there's no clean client-side signal here to distinguish "brand
      // new account" from "logging back in" before the redirect happens.
      store.set('pending_welcome_bonus', true);
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
        <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--dim); margin-top:2px; cursor:pointer;">
            <input type="checkbox" id="modal-marketing-optin" checked style="margin-top:2px; flex-shrink:0;"/>
            <span>Email me about new set drops and deals. Only applies when signing up — unsubscribe anytime.</span>
        </label>
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
    const optInCheckbox = $('#modal-marketing-optin', sheet);

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
              password: passIn.value,
              options: { data: { marketing_opt_in: !!optInCheckbox.checked } }
          });
          if (error) throw error;
          track('signup_completed', { marketing_opt_in: !!optInCheckbox.checked });
          store.set('pending_welcome_bonus', true);
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

  // Rank chip — the tier/rank system otherwise only ever showed up on
  // the Profile tab, which meant most people would never stumble onto
  // it at all. This puts the current rank somewhere persistent (every
  // screen) and tappable. Icon-only here on purpose — a text label on
  // every screen was crowding the topbar (brand name truncating, the
  // auth button wrapping to two lines on narrow phones); the full
  // icon+label version lives at the very top of Profile instead, where
  // there's room for it. Skipped for guests (no rank exists outside a
  // real account). Admins get their own distinct badge in this same
  // slot instead (see below) rather than a rank, since tiers don't
  // apply to an unlimited-credits account.
  let rankChip = '';
  if (session && profile && !profile.is_admin) {
    const { current } = getTierProgress(profile);
    rankChip = `<button class="rank-chip tappable" id="rank-chip-btn" style="color:${current.color};" title="Rank: ${current.label}" aria-label="Rank: ${current.label}">${tierIconSVG(current.key, 17)}</button>`;
  } else if (session && profile?.is_admin) {
    rankChip = `<span class="rank-chip" style="color:#38bdf8;" title="System Admin" aria-label="System Admin">${badgeIconSVG(ADMIN_ICON_PATH, 17)}</span>`;
  }

  bar.innerHTML = `
    <div class="brand" style="display:flex; align-items:center; gap:8px; flex:1;">
      <div id="brand-home-btn" style="display:flex; align-items:center; gap:6px; cursor:pointer; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        <span class="dot"></span>Chase Cards${guestMode ? ' <span style="font-size:10px;color:var(--dim-2);font-weight:700;letter-spacing:.08em;background:var(--panel);border:1px solid var(--edge);padding:2px 7px;border-radius:999px;margin-left:6px;">GUEST</span>' : ''}
      </div>
      ${authBtn}
    </div>
    ${rankChip}
    <button class="credits-pill tappable" id="credits-btn"><span class="coin"></span><span id="credit-count">${currentCredits()}</span></button>
  `;
  
  bar.querySelector('#brand-home-btn').addEventListener('click', () => render('home'));

  const rankChipBtn = bar.querySelector('#rank-chip-btn');
  if (rankChipBtn) rankChipBtn.addEventListener('click', () => render('profile'));

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
            myPackTickets = {};
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
    { key:'search', label:'Search', icon:'M11 4a7 7 0 104.9 12l4.5 4.5 1.4-1.4-4.5-4.5A7 7 0 0011 4z' },
    { key:'trade', label:'Trade', icon:'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { key:'battle', label:'Battle', icon:'M4 20l16-16M4 4l16 16M8 4L4 8M16 4l4 4M4 16l4 4M20 16l-4 4' },
    { key:'profile', label:'Profile', icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
  ];
  items.forEach(it=>{
    const isActive = route.name===it.key || (it.key==='battle' && route.name.startsWith('battle_'));
    const t = el('div','tab'+(isActive?' active':''));
    t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="${it.icon}"/></svg><span>${it.label}</span>`;
    t.addEventListener('click', ()=> render(it.key));
    tabs.appendChild(t);
  });
  return tabs;
}

function renderTierLadderRows(progress) {
  return TIER_LADDER.map(t => {
    const isCurrent = t.key === progress.current.key;
    const reqText = t.packs === 0
      ? 'Everyone starts here'
      : `${t.packs.toLocaleString()} packs <em style="font-style:normal;color:var(--dim-2, var(--dim));">or</em> ${t.referrals} referral${t.referrals===1?'':'s'}`;
    return `
      <div class="tier-ladder-row${isCurrent ? ' current-tier-row' : ''}" style="${isCurrent ? `--tier-color:${t.color};` : ''}">
        <span class="icon" style="color:${t.color};">${tierIconSVG(t.key, 18)}</span>
        <span class="name">${t.label}</span>
        <span class="req">${reqText} — ${t.dailyBonus.toLocaleString()} credits/day</span>
        ${isCurrent ? '<span style="font-size:10px; font-weight:800; color:var(--tier-color); flex-shrink:0;">YOU</span>' : ''}
      </div>`;
  }).join('');
}

// Read-only reference view for admin accounts — same "All tiers ›" ladder
// non-admins get, minus the progress bar/packs-or-referrals tracking, since
// none of that applies to an account with unlimited credits. Replaces what
// used to be a completely blank rank header for admins — there was no way
// for an admin to see the tier ladder at all before this.
function renderAdminTierReference(){
  return `
    <div class="tier-progress-banner" style="--tier-color:#38bdf8;">
      <div class="tier-progress-top">
        <span class="tier-progress-icon">${badgeIconSVG(ADMIN_ICON_PATH, 24)}</span>
        <div class="tier-progress-labels">
          <div class="tier-progress-current">System Admin</div>
          <div class="tier-progress-sub">Unlimited credits — the tier ladder doesn't apply to this account</div>
        </div>
        <button id="tier-details-toggle" class="tier-progress-details-btn" aria-expanded="false">All tiers ›</button>
      </div>
    </div>
    <div id="tier-details-panel" class="tier-details-panel">
      <strong style="color:var(--text);">How tiers work (reference only)</strong>
      <p style="margin:6px 0 10px;">Regular accounts earn these automatically by opening packs or referring friends. Shown here so you can see what everyone else is progressing through — admin accounts don't climb this ladder themselves.</p>
      ${renderTierLadderRows({ current: { key: '__none__' } })}
    </div>`;
}

function renderTierProgressBanner(userProfile) {
  const p = getTierProgress(userProfile);
  const { current, next } = p;

  const subLine = p.maxed
    ? `Highest tier unlocked — ${current.dailyBonus.toLocaleString()} bonus credits every day, forever`
    : `${Math.round(p.percent)}% of the way to ${next.label}`;

  const footer = p.maxed ? '' : `
    <div class="tier-progress-bar-track">
      <div class="tier-progress-bar-fill${p.percent >= 100 ? ' tier-progress-shimmer' : ''}" style="width:${Math.max(4, p.percent)}%"></div>
    </div>
    <div class="tier-progress-footer">
      <span class="${p.fasterPath === 'packs' ? 'lead' : ''}">${p.packs.toLocaleString()}/${next.packs.toLocaleString()} packs</span>
      <button type="button" id="tier-invite-btn" class="${p.fasterPath === 'referrals' ? 'lead' : ''}" style="background:none;border:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px;">${p.referrals.toLocaleString()}/${next.referrals.toLocaleString()} referrals — invite a friend</button>
    </div>`;

  return `
    <div class="tier-progress-banner" style="--tier-color:${current.color};">
      <div class="tier-progress-top">
        <span class="tier-progress-icon">${tierIconSVG(current.key, 24)}</span>
        <div class="tier-progress-labels">
          <div class="tier-progress-current">${current.label}${p.maxed ? ' — Max Tier' : ''}</div>
          <div class="tier-progress-sub">${subLine}</div>
        </div>
        <button id="tier-details-toggle" class="tier-progress-details-btn" aria-expanded="false">All tiers ›</button>
      </div>
      ${footer}
      ${p.maxed ? `<div class="tier-progress-maxed">You've unlocked every tier there is.</div>` : ''}
    </div>
    <div id="tier-details-panel" class="tier-details-panel">
      <strong style="color:var(--text);">How tiers work</strong>
      <p style="margin:6px 0 10px;">Not for sale — earn your way up automatically by opening packs or referring friends (whichever gets you there first). Tiers only ever go up, and each one pays out bonus credits every single day on top of packs, selling, and referrals.</p>
      ${renderTierLadderRows(p)}
    </div>`;
}

function badgeTileHTML(icon, label, desc, color, legendary){
  return `
    <div class="badge-tile${legendary ? ' badge-tile-legendary' : ''}" style="--badge-color:${color};" title="${escapeHtml(desc || label)}">
      <div class="badge-tile-icon">${icon}</div>
      <div class="badge-tile-label">${escapeHtml(label)}</div>
    </div>`;
}

function renderBadgesSection(userProfile) {
  const tiles = [];
  myAchievements.forEach(key => {
    const meta = ACHIEVEMENT_META[key];
    if (meta) tiles.push(badgeTileHTML(
      badgeIconSVG(ACHIEVEMENT_ICON_PATHS[key] || '', 30),
      meta.label,
      meta.desc,
      ACHIEVEMENT_COLORS[key] || '#94a3b8'
    ));
  });
  const earnedSection = !tiles.length ? '' : `
    <div class="badges-section">
      <div class="badges-section-title">Badges</div>
      <div class="badges-grid">${tiles.join('')}</div>
    </div>`;
  return earnedSection + renderAllBadgesPanel(userProfile);
}

// Battle badges — always renders all 8 slots (unlike the achievement
// grid above, which only shows what's earned). Unearned slots render
// as flat silhouettes with a hidden label ("???") on purpose: the
// point is that people can see the shape of the challenge (8 slots,
// clearly a set to complete) without the payoff being spoiled before
// they've won it.
function renderBattleBadgesSection(userProfile){
  const earned = new Set(userProfile?.battle_badges || []);
  const wins = userProfile?.battle_wins || 0;
  const streak = userProfile?.battle_win_streak || 0;
  const champion = isBattleChampion(userProfile);
  const nextBadge = BATTLE_BADGE_META.find(b => !earned.has(b.key));

  const tiles = BATTLE_BADGE_META.map(b => {
    const has = earned.has(b.key);
    const lockedTitle = b.streakRequired
      ? `Locked — ${b.winsRequired} wins total + a ${b.streakRequired}-win streak`
      : `Locked — ${b.winsRequired} wins total`;
    return `
      <div class="battle-badge-tile${has ? ' earned' : ''}" title="${has ? escapeHtml(b.label) : lockedTitle}">
        <div class="battle-badge-icon">${battleBadgeIconSVG(b.key, has, 46)}</div>
        <div class="battle-badge-label">${has ? escapeHtml(b.label) : '???'}</div>
      </div>`;
  }).join('');

  let progressLine;
  if (champion) {
    progressLine = `${wins} career wins — every badge earned`;
  } else if (nextBadge) {
    const winsPart = `${Math.min(wins, nextBadge.winsRequired)}/${nextBadge.winsRequired} wins toward ${nextBadge.label}`;
    const streakPart = nextBadge.streakRequired ? ` · streak ${Math.min(streak, nextBadge.streakRequired)}/${nextBadge.streakRequired}` : '';
    progressLine = winsPart + streakPart;
  } else {
    progressLine = `${wins} career wins`;
  }

  return `
    <div class="battle-badges-section">
      <div class="badges-section-title">Battle Badges${champion ? ' — <span style="color:#fbbf24;">CHAMPION</span>' : ` (${earned.size}/8)`}</div>
      <p class="hint" style="margin:2px 0 4px;">${progressLine}</p>
      <p class="hint" style="margin:0 0 10px;">Each badge takes more cumulative wins than the last — the final one, Prism, also needs a 3-win streak. All 8 unlocks a Champion badge and permanent VIP rank — for life.</p>
      <div class="battle-badges-grid">${tiles}</div>
      ${champion ? `<div class="battle-champion-banner">${badgeIconSVG(TROPHY_ICON_PATH, 16)}<span>Undefeated — permanent VIP rank unlocked</span></div>` : ''}
    </div>`;
}

/* ============================================================
   Battle mode screens (hub / deck builder / live duel)
   ============================================================ */
function renderBattleHome(){
  const wrap = el('div');
  if (guestMode || !session?.user) {
    wrap.innerHTML = `
      <div class="section-title">Battle</div>
      <div class="hint" style="margin-bottom:14px;">Create a free account to build a battle deck and start winning Battle Badges.</div>
      <button class="btn btn-primary" id="battle-login-btn" style="width:100%;">Sign up / Log in</button>`;
    app.appendChild(wrap);
    $('#battle-login-btn', wrap).addEventListener('click', () => openAuthModal());
    return;
  }

  const deckIds = store.get(scopedKey('battle_deck'), []);
  const map = getCollectionsMap();
  const activeName = getActiveCollectionName();
  const coll = map[activeName] || {};
  const deckCards = deckIds.map(id => coll[id] ? { id, ...coll[id] } : null).filter(Boolean);
  const deckReady = deckCards.length === 10;

  wrap.innerHTML = `
    <div class="section-title">Battle</div>
    <div class="hint" style="margin:-4px 0 14px;">Original card-duel mode — win battles to earn Battle Badges. Beat all 8 for a Champion badge and permanent VIP rank.</div>
    <button class="btn btn-secondary" id="battle-rules-toggle" style="width:100%; margin-bottom:14px; display:flex; align-items:center; justify-content:center; gap:6px;">How to Battle <span id="battle-rules-caret">▾</span></button>
    <div id="battle-rules-panel" style="display:none; margin:-6px 0 16px; padding:14px; border:1px solid var(--edge); border-radius:12px; font-size:13px; line-height:1.55;">
      <p style="margin:0 0 10px;"><b>Deck:</b> exactly 10 cards from your active collection. You start with 4 in hand and draw one more each time your active card is knocked out. First to <b>${BATTLE_KO_TARGET} knockouts</b> wins the duel.</p>
      <p style="margin:0 0 10px;"><b>Your active card stays in the fight</b> until it's knocked out — you can't voluntarily swap out a healthy card, so pick wisely when it's your turn to send one in.</p>
      <p style="margin:0 0 6px;"><b>Elements — this is the part that decides most fights:</b> each card has one of 7 elements. Every element has exactly one other element it's strong against (+30% damage dealt) and one it's weak against (−25% damage dealt). It's a single cycle:</p>
      ${battleElementWheelHTML()}
      <p style="margin:10px 0 0; color:var(--dim);">HP and ATK are generated from the card itself (same card always rolls the same stats) — they're original numbers for this game, not real card stats.</p>
    </div>
    ${renderBattleBadgesSection(profile)}
    <div style="margin-top:22px; padding-top:16px; border-top:1px solid var(--edge);">
      <div class="badges-section-title">Your Battle Deck</div>
      <p class="hint" style="margin:2px 0 10px;">${deckReady ? `${deckCards.length}/10 cards ready` : `${deckCards.length}/10 cards selected — build a full deck to duel`}</p>
      <button class="btn btn-secondary" id="edit-deck-btn" style="width:100%; margin-bottom:10px;">${deckCards.length ? 'Edit Deck' : 'Build a Deck'}</button>
      <button class="btn btn-primary" id="start-ai-battle-btn" style="width:100%;" ${deckReady ? '' : 'disabled'}>⚔️ Battle the AI</button>
      <p class="hint" style="margin-top:14px; text-align:center;">Live PvP battles are coming soon — AI opponents are here now so you can start earning badges today.</p>
    </div>
  `;
  app.appendChild(wrap);
  const rulesToggle = $('#battle-rules-toggle', wrap);
  const rulesPanel = $('#battle-rules-panel', wrap);
  const rulesCaret = $('#battle-rules-caret', wrap);
  if (rulesToggle) rulesToggle.addEventListener('click', () => {
    const open = rulesPanel.style.display !== 'none';
    rulesPanel.style.display = open ? 'none' : 'block';
    rulesCaret.textContent = open ? '▾' : '▴';
  });
  $('#edit-deck-btn', wrap).addEventListener('click', () => render('battle_deck_builder'));
  const startBtn = $('#start-ai-battle-btn', wrap);
  if (startBtn) startBtn.addEventListener('click', () => {
    if (!deckReady) return;
    render('battle_duel', { deck: deckCards.map(battleCardFromCollectionCard) });
  });
}

function renderBattleDeckBuilder(){
  const wrap = el('div');
  const map = getCollectionsMap();
  const activeName = getActiveCollectionName();
  const coll = map[activeName] || {};
  const cards = Object.entries(coll).map(([id, c]) => ({ id, ...c }));
  let selected = new Set(store.get(scopedKey('battle_deck'), []).filter(id => coll[id]));

  wrap.innerHTML = `
    <div class="section-title">Build Your Battle Deck</div>
    <div class="hint" id="deck-count-hint" style="margin:-4px 0 14px;">Pick exactly 10 cards from "${escapeHtml(activeName)}" — ${selected.size}/10 selected</div>
    ${cards.length ? `<div class="battle-deck-grid" id="deck-pick-grid"></div>` : `<div class="hint">This collection is empty — open some packs first.</div>`}
    <div style="position:sticky; bottom:0; padding-top:12px; background:var(--bg);">
      <button class="btn btn-primary" id="save-deck-btn" style="width:100%;" disabled>Save Deck (0/10)</button>
    </div>
  `;
  app.appendChild(wrap);

  const grid = $('#deck-pick-grid', wrap);
  const countHint = $('#deck-count-hint', wrap);
  const saveBtn = $('#save-deck-btn', wrap);

  function updateSaveBtn(){
    saveBtn.disabled = selected.size !== 10;
    saveBtn.textContent = `Save Deck (${selected.size}/10)`;
    countHint.textContent = `Pick exactly 10 cards from "${activeName}" — ${selected.size}/10 selected`;
  }

  if (grid) {
    cards
      .sort((a, b) => classify(b.rarity).id - classify(a.rarity).id)
      .forEach(c => {
        const stats = deriveBattleStats(c);
        const tile = el('div', 'battle-pick-tile' + (selected.has(c.id) ? ' picked' : ''));
        tile.style.setProperty('--el-color', ELEMENT_COLOR[stats.element]);
        tile.innerHTML = `
          <img src="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/>
          <div class="battle-pick-stats"><span>HP ${stats.hp}</span><span>ATK ${stats.atk}</span></div>
          <div class="battle-pick-element" style="background:${ELEMENT_COLOR[stats.element]};">${stats.element}</div>
        `;
        ImgCache.get(c.image).then(src => { const img = tile.querySelector('img'); if (img && src) img.src = src; });
        tile.addEventListener('click', () => {
          if (selected.has(c.id)) selected.delete(c.id);
          else { if (selected.size >= 10) return; selected.add(c.id); }
          tile.classList.toggle('picked');
          updateSaveBtn();
        });
        grid.appendChild(tile);
      });
  }

  updateSaveBtn();
  saveBtn.addEventListener('click', () => {
    store.set(scopedKey('battle_deck'), [...selected]);
    render('battle');
  });
}

function renderBattleDuel(deck){
  if (!Array.isArray(deck) || deck.length < 1) { render('battle'); return; }
  const wrap = el('div');
  const avgTier = Math.round(deck.reduce((s, c) => s + classify(c.rarity ? c.rarity : '').id, 0) / deck.length) || 3;
  const state = createBattleState(deck, generateAIDeck(avgTier));
  let awarded = false;
  const sessionPromise = startBattleSession(); // minted now, spent on win/loss — see reportBattleResult()

  wrap.innerHTML = `
    <div class="section-title">Battle</div>
    <div class="battle-arena">
      <div class="battle-side">
        <div class="battle-side-label">Opponent · <span id="ai-ko-count" class="ko-count">${state.ai.ko}</span>/${BATTLE_KO_TARGET} KOs</div>
        <div id="ai-active-slot" class="battle-active-slot"></div>
      </div>
      <div class="battle-side">
        <div class="battle-side-label">You · <span id="player-ko-count" class="ko-count">${state.player.ko}</span>/${BATTLE_KO_TARGET} KOs</div>
        <div id="player-active-slot" class="battle-active-slot"></div>
      </div>
    </div>
    <div id="battle-log" class="battle-log"></div>
    <div id="player-hand" class="battle-hand"></div>
    <button class="btn btn-primary" id="battle-attack-btn" style="width:100%; margin-top:10px;">Attack</button>
  `;
  app.appendChild(wrap);

  const aiSlot = $('#ai-active-slot', wrap);
  const playerSlot = $('#player-active-slot', wrap);
  const aiKoCount = $('#ai-ko-count', wrap);
  const playerKoCount = $('#player-ko-count', wrap);
  const handEl = $('#player-hand', wrap);
  const logEl = $('#battle-log', wrap);
  const attackBtn = $('#battle-attack-btn', wrap);

  function activeSlotHTML(card, side){
    if (!card) return `<div class="battle-empty-slot">No active card</div>`;
    const pct = Math.max(0, Math.round((card.hp / card.maxHp) * 100));
    return `
      <div class="battle-card" style="--el-color:${ELEMENT_COLOR[card.element]};">
        <div class="battle-card-name">${escapeHtml(card.name)}</div>
        <div class="battle-card-element">${card.element}</div>
        <div class="battle-hp-bar"><div class="battle-hp-fill" style="width:${pct}%;"></div></div>
        <div class="battle-hp-text">${card.hp}/${card.maxHp} HP</div>
      </div>`;
  }

  // fx: which side(s) got hit or knocked out THIS redraw, so the right
  // animation classes land once — see the attack handler below for how
  // these get computed from the before/after state.
  function redraw(fx = {}){
    aiSlot.innerHTML = activeSlotHTML(state.ai.active, 'ai');
    playerSlot.innerHTML = activeSlotHTML(state.player.active, 'player');
    if (fx.aiKo) { aiSlot.classList.add('battle-ko'); setTimeout(() => aiSlot.classList.remove('battle-ko'), 450); }
    else if (fx.aiHit) { aiSlot.classList.add('battle-hit'); setTimeout(() => aiSlot.classList.remove('battle-hit'), 320); }
    if (fx.playerKo) { playerSlot.classList.add('battle-ko'); setTimeout(() => playerSlot.classList.remove('battle-ko'), 450); }
    else if (fx.playerHit) { playerSlot.classList.add('battle-hit'); setTimeout(() => playerSlot.classList.remove('battle-hit'), 320); }
    if (aiKoCount.textContent != state.ai.ko) { aiKoCount.textContent = state.ai.ko; aiKoCount.classList.add('pop'); setTimeout(() => aiKoCount.classList.remove('pop'), 400); }
    if (playerKoCount.textContent != state.player.ko) { playerKoCount.textContent = state.player.ko; playerKoCount.classList.add('pop'); setTimeout(() => playerKoCount.classList.remove('pop'), 400); }
    logEl.innerHTML = state.log.slice(-6).map(l => `<div>${escapeHtml(l)}</div>`).join('');
    logEl.scrollTop = logEl.scrollHeight;

    if (!state.player.active && state.player.hand.length === 0) battleDrawCard(state, 'player');
    handEl.innerHTML = '';
    if (!state.player.active) {
      state.player.hand.forEach(c => {
        const tile = el('div', 'battle-hand-card');
        tile.style.setProperty('--el-color', ELEMENT_COLOR[c.element]);
        tile.innerHTML = `<div class="battle-card-name">${escapeHtml(c.name)}</div><div class="battle-card-element">${c.element}</div><div class="battle-hp-text">${c.hp} HP / ${c.atk} ATK</div>`;
        tile.addEventListener('click', () => {
          battlePlayCard(state, 'player', c.id);
          maybeAiRespond();
          redraw();
        });
        handEl.appendChild(tile);
      });
      handEl.style.display = state.player.hand.length ? 'flex' : 'none';
    } else {
      handEl.style.display = 'none';
    }

    attackBtn.style.display = (state.player.active && state.ai.active && !state.winner) ? 'block' : 'none';

    if (state.winner) endDuel();
  }

  function maybeAiRespond(){
    if (state.winner) return;
    if (!state.ai.active) battleAiTakeTurn(state);
  }

  attackBtn.addEventListener('click', () => {
    if (state.winner) return;
    const aiCardBefore = state.ai.active;
    battleAttack(state, 'player');
    const fx = {
      aiKo: !!(aiCardBefore && !state.ai.active),
      aiHit: !!(aiCardBefore && state.ai.active === aiCardBefore),
    };
    if (!state.winner) {
      const playerCardBefore = state.player.active;
      battleAiTakeTurn(state); // AI attacks back same beat — keeps a duel short and readable
      fx.playerKo = !!(playerCardBefore && !state.player.active);
      fx.playerHit = !!(playerCardBefore && state.player.active === playerCardBefore);
    }
    redraw(fx);
  });

  async function endDuel(){
    attackBtn.style.display = 'none';
    if (!awarded && (state.winner === 'player' || state.winner === 'ai')) {
      awarded = true;
      const before = new Set(profile?.battle_badges || []);
      const result = await reportBattleResult(state.winner === 'player', await sessionPromise);
      const newlyEarned = result ? BATTLE_BADGE_META.filter(b => (result.battle_badges || []).includes(b.key) && !before.has(b.key)) : [];

      if (state.winner === 'player') {
        const streakLine = result ? `<div style="margin-top:6px; font-size:11.5px; color:var(--dim);">${result.battle_wins} total wins${result.battle_win_streak > 1 ? ` · ${result.battle_win_streak}-win streak` : ''}</div>` : '';
        const badgeLines = newlyEarned.map(b => `<div style="margin-top:6px; font-size:12.5px;">Earned the <b>${b.label}</b> Battle Badge</div>`).join('');
        const banner = el('div', 'battle-result-banner win');
        banner.innerHTML = `<div>🏆 You won the duel!</div>${badgeLines}${streakLine}`;
        wrap.insertBefore(banner, $('.battle-arena', wrap));
      } else {
        const banner = el('div', 'battle-result-banner lose');
        banner.innerHTML = `<div>Defeated — your win streak reset, but total progress is safe. Try again anytime.</div>`;
        wrap.insertBefore(banner, $('.battle-arena', wrap));
      }
    }
    const doneBtn = el('button', 'btn btn-secondary');
    doneBtn.style.cssText = 'width:100%; margin-top:12px;';
    doneBtn.textContent = 'Back to Battle';
    doneBtn.addEventListener('click', () => render('battle'));
    wrap.appendChild(doneBtn);
  }

  // Player always sends out first (simplest fair-start rule for an
  // original ruleset — no coin-flip/turn-order mechanic to lift from
  // the real game).
  redraw();
}

// Full reference of every badge that exists — including ones this
// account hasn't earned yet — so "what badges even exist and how do I
// get them" has an answer somewhere instead of only ever showing up
// piecemeal as they're unlocked. Locked entries are dimmed but still
// show their full description, since knowing what to aim for is the
// point of a reference list like this.
function renderAllBadgesPanel(userProfile){
  const earnedSet = new Set(myAchievements);
  const isAdmin = !!userProfile?.is_admin;
  const rows = [];

  Object.keys(ACHIEVEMENT_META).forEach(key => {
    const meta = ACHIEVEMENT_META[key];
    const earned = earnedSet.has(key);
    const color = ACHIEVEMENT_COLORS[key] || '#94a3b8';
    // Each badge keeps its own color even locked — dimming comes from the
    // row's opacity alone. Flattening every unearned icon to the shared
    // --dim grey (as this used to) made the whole reference list read as
    // one generic color instead of a set of distinct badges to chase.
    rows.push(`
      <div class="tier-ladder-row${earned ? ' current-tier-row' : ''}" style="opacity:${earned ? '1' : '0.65'}; --tier-color:${color};">
        <span class="icon" style="color:${color};">${badgeIconSVG(ACHIEVEMENT_ICON_PATHS[key] || '', 18)}</span>
        <span class="name">${escapeHtml(meta.label)}</span>
        <span class="req">${escapeHtml(meta.desc)}</span>
        ${earned ? `<span style="font-size:10px; font-weight:800; color:${color}; flex-shrink:0;">EARNED</span>` : ''}
      </div>`);
  });

  return `
    <div style="margin-top:14px;">
      <button id="all-badges-toggle" class="tier-progress-details-btn" aria-expanded="false" style="width:100%; text-align:left;">All badges ›</button>
      <div id="all-badges-panel" class="tier-details-panel" style="display:none;">
        <strong style="color:var(--text);">Every badge</strong>
        <p style="margin:6px 0 10px;">Dimmed ones aren't earned yet. Some come from gameplay milestones.</p>
        ${rows.join('')}
      </div>
    </div>`;
}

function renderAccountArea(user, userProfile) {
  const isAdmin = !!userProfile?.is_admin;
  const stats = getPlayerStats();

  // Prominent rank header — icon + label + progress, at the very top of
  // Profile, above "My Account." Used to live nested inside the account
  // card alongside username/credits/etc.; pulled out to its own spot
  // since "what rank am I and how close is the next one" deserves to be
  // the first thing seen here, not one line among many.
  const rankHeaderEl = document.getElementById('profile-rank-header');
  if (rankHeaderEl) {
    rankHeaderEl.innerHTML = !user ? '' : isAdmin ? renderAdminTierReference() : renderTierProgressBanner(userProfile);
  }

  const accountHtml = `
    <div class="account-card">
      ${!user ? '' : isAdmin
        ? `<div class="admin-status-line"><span style="display:inline-flex; color:#38bdf8;">${badgeIconSVG(ADMIN_ICON_PATH, 20)}</span><span>System Admin — unlimited credits &amp; full access</span></div>`
        : ''}
      <div class="account-header">
        <h3 title="${user ? escapeHtml(user.email) : 'Guest Session'}">${user ? escapeHtml(user.email) : 'Guest Session'}</h3>
      </div>
      <div class="account-details">
        ${user ? `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
          <strong style="flex-shrink:0;">Username:</strong>
          <span id="username-display" style="flex:1; color:${userProfile?.username ? 'var(--text)' : 'var(--dim)'};">${escapeHtml(userProfile?.username) || 'Not set — pick one to trade & battle'}</span>
          <button class="btn btn-secondary" id="edit-username-btn" style="padding:5px 12px; font-size:11.5px; flex-shrink:0;">Edit</button>
        </div>
        ` : ''}
        <p><strong>Credits:</strong> ${userProfile?.is_admin ? '∞ (Admin Unlimited)' : (userProfile?.credits?.toLocaleString() || CONFIG.ECONOMY.STARTING_CREDITS)}</p>
        <p><strong>Daily Streak:</strong> ${stats.loginStreak || 1} Days Active</p>
        ${user ? `<button type="button" id="profile-invite-btn" class="btn btn-secondary" style="width:100%; margin:4px 0 6px;">Invite a friend — earn free credits</button>` : ''}
        ${user ? renderBadgesSection(userProfile) : ''}
        ${user ? renderBattleBadgesSection(userProfile) : ''}
        ${user ? `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:14px; padding-top:12px; border-top:1px solid var(--edge);">
          <div style="min-width:0;">
            <div style="font-weight:700; font-size:13px;">Show my rank &amp; badges to others</div>
            <div style="font-size:11.5px; color:var(--dim); margin-top:2px;">When on, other users can see your tier, achievements, and collection. Your email and credits are never shown.</div>
          </div>
          <button type="button" id="public-toggle-btn" role="switch" aria-checked="${userProfile?.is_public !== false}" style="flex-shrink:0; width:42px; height:24px; border-radius:999px; border:1px solid var(--edge); background:${userProfile?.is_public !== false ? 'var(--cyan)' : 'var(--panel-2)'}; position:relative; cursor:pointer; padding:0; transition:background 0.15s;">
            <span style="position:absolute; top:2px; left:${userProfile?.is_public !== false ? '20px' : '2px'}; width:18px; height:18px; border-radius:50%; background:#fff; transition:left 0.15s;"></span>
          </button>
        </div>
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:12px;">
          <div style="min-width:0;">
            <div style="font-weight:700; font-size:13px;">Email me about new set drops and deals</div>
            <div style="font-size:11.5px; color:var(--dim); margin-top:2px;">Unsubscribe anytime.</div>
          </div>
          <button type="button" id="marketing-toggle-btn" role="switch" aria-checked="${userProfile?.marketing_opt_in === true}" style="flex-shrink:0; width:42px; height:24px; border-radius:999px; border:1px solid var(--edge); background:${userProfile?.marketing_opt_in === true ? 'var(--cyan)' : 'var(--panel-2)'}; position:relative; cursor:pointer; padding:0; transition:background 0.15s;">
            <span style="position:absolute; top:2px; left:${userProfile?.marketing_opt_in === true ? '20px' : '2px'}; width:18px; height:18px; border-radius:50%; background:#fff; transition:left 0.15s;"></span>
          </button>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  const accountSection = document.getElementById('account-section');
  if (accountSection) accountSection.innerHTML = accountHtml;

  const editBtn = document.getElementById('edit-username-btn');
  if(editBtn){
    editBtn.addEventListener('click', () => openUsernameEditor(userProfile));
  }

  const publicToggleBtn = document.getElementById('public-toggle-btn');
  if(publicToggleBtn){
    publicToggleBtn.addEventListener('click', async () => {
      const nextValue = publicToggleBtn.getAttribute('aria-checked') !== 'true';
      publicToggleBtn.disabled = true;
      const { error } = await sb.from('profiles').update({ is_public: nextValue }).eq('id', session.user.id);
      publicToggleBtn.disabled = false;
      if (error) {
        console.error('Failed to update visibility', error);
        toast('Could not update visibility — try again');
        return;
      }
      if (userProfile) userProfile.is_public = nextValue;
      publicToggleBtn.setAttribute('aria-checked', String(nextValue));
      publicToggleBtn.style.background = nextValue ? 'var(--cyan)' : 'var(--panel-2)';
      publicToggleBtn.querySelector('span').style.left = nextValue ? '20px' : '2px';
    });
  }

  const marketingToggleBtn = document.getElementById('marketing-toggle-btn');
  if(marketingToggleBtn){
    marketingToggleBtn.addEventListener('click', async () => {
      const nextValue = marketingToggleBtn.getAttribute('aria-checked') !== 'true';
      marketingToggleBtn.disabled = true;
      const { error } = await sb.from('profiles').update({ marketing_opt_in: nextValue }).eq('id', session.user.id);
      marketingToggleBtn.disabled = false;
      if (error) {
        console.error('Failed to update marketing opt-in', error);
        toast('Could not update that — try again');
        return;
      }
      if (userProfile) userProfile.marketing_opt_in = nextValue;
      if (profile) profile.marketing_opt_in = nextValue;
      marketingToggleBtn.setAttribute('aria-checked', String(nextValue));
      marketingToggleBtn.style.background = nextValue ? 'var(--cyan)' : 'var(--panel-2)';
      marketingToggleBtn.querySelector('span').style.left = nextValue ? '20px' : '2px';
    });
  }

  const tierDetailsToggle = document.getElementById('tier-details-toggle');
  const tierDetailsPanel = document.getElementById('tier-details-panel');
  if(tierDetailsToggle && tierDetailsPanel){
    tierDetailsToggle.addEventListener('click', () => {
      const showing = tierDetailsPanel.style.display !== 'none';
      tierDetailsPanel.style.display = showing ? 'none' : 'block';
      tierDetailsToggle.setAttribute('aria-expanded', String(!showing));
      tierDetailsToggle.textContent = showing ? 'All tiers ›' : 'Hide ˅';
    });
  }

  const allBadgesToggle = document.getElementById('all-badges-toggle');
  const allBadgesPanel = document.getElementById('all-badges-panel');
  if(allBadgesToggle && allBadgesPanel){
    allBadgesToggle.addEventListener('click', () => {
      const showing = allBadgesPanel.style.display !== 'none';
      allBadgesPanel.style.display = showing ? 'none' : 'block';
      allBadgesToggle.setAttribute('aria-expanded', String(!showing));
      allBadgesToggle.textContent = showing ? 'All badges ›' : 'Hide ˅';
    });
  }

  const tierInviteBtn = document.getElementById('tier-invite-btn');
  if(tierInviteBtn){
    tierInviteBtn.addEventListener('click', () => openGetCreditsModal());
  }

  const profileInviteBtn = document.getElementById('profile-invite-btn');
  if(profileInviteBtn){
    profileInviteBtn.addEventListener('click', () => openGetCreditsModal());
  }
}

function openUsernameEditor(userProfile){
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });

  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>Set Your Username</h2>
    <div class="sub">Shown to other collectors when trading, battling, or in search — 3-20 characters, letters/numbers/underscores only.</div>
    <input type="text" id="username-edit-input" value="${escapeHtml(userProfile?.username)}" maxlength="20" class="auth-form" style="width:100%; margin-top:14px;" placeholder="e.g. ash_ketchum99" />
    <div id="username-edit-msg" class="hint" style="min-height:16px; margin-top:6px;"></div>
    <button class="btn btn-primary" id="username-edit-save" style="width:100%; margin-top:10px;">Save Username</button>
  `;

  const input = $('#username-edit-input', sheet);
  const msg = $('#username-edit-msg', sheet);
  const saveBtn = $('#username-edit-save', sheet);
  input.focus();

  saveBtn.addEventListener('click', async () => {
    const newUsername = input.value.trim();
    if(!/^[a-zA-Z0-9_]{3,20}$/.test(newUsername)){
      msg.textContent = '3-20 characters — letters, numbers, and underscores only.';
      msg.style.color = 'var(--danger)';
      return;
    }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
    msg.textContent = '';
    try{
      // .select() so we get back the row that was actually written —
      // without it, a Supabase update that RLS silently filters out
      // (0 rows affected) returns no error at all, and this would have
      // shown "Username updated!" even though nothing was saved.
      const { data, error } = await sb.from('profiles').update({ username: newUsername }).eq('id', session.user.id).select();
      if(error){
        // Postgres unique-constraint violation code
        if(error.code === '23505'){
          msg.textContent = 'That username is already taken — try another.';
          msg.style.color = 'var(--danger)';
        } else if(error.message?.includes('reserved_username')){
          msg.textContent = 'That username is reserved — try another.';
          msg.style.color = 'var(--danger)';
        } else if(error.message?.includes('invalid_username_format')){
          msg.textContent = '3-20 characters — letters, numbers, and underscores only.';
          msg.style.color = 'var(--danger)';
        } else {
          throw error;
        }
        saveBtn.disabled = false; saveBtn.textContent = 'Save Username';
        return;
      }
      if(!data || !data.length){
        msg.textContent = "Couldn't save that username — try again.";
        msg.style.color = 'var(--danger)';
        saveBtn.disabled = false; saveBtn.textContent = 'Save Username';
        return;
      }
      profile = { ...(profile||{}), username: newUsername };
      toast('Username updated!');
      overlay.remove();
      render('profile');
    } catch(e){
      msg.textContent = 'Could not save — try again.';
      msg.style.color = 'var(--danger)';
      saveBtn.disabled = false; saveBtn.textContent = 'Save Username';
    }
  });
}

async function renderProfile() {
  const wrap = el('div');
  wrap.innerHTML = `
      <div id="profile-rank-header"></div>
      <div class="section-title">My Account</div>
      <div id="account-section"></div>
      
      <div id="admin-panel" style="display:none; margin-top:30px; padding:18px; background:var(--panel-2); border:1px solid var(--vip-gold-dim); border-radius:14px; box-shadow: 0 4px 15px rgba(255, 233, 184, 0.1);">
         <h3 style="color:var(--vip-gold); margin-top:0; font-family:var(--font-display); font-size:18px; display:flex; align-items:center; gap:8px;"><span style="display:inline-flex;">${badgeIconSVG(ADMIN_ICON_PATH, 20)}</span>Admin Controls</h3>
         <p class="hint" style="margin-bottom:14px;">Select any registered user from the list and manually update their membership level.</p>
         
         <div style="margin-bottom:12px;">
             <label class="hint" style="display:block; margin-bottom:4px; font-weight:bold;">Select Registered User:</label>
             <select id="admin-target-user-select" style="width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--edge); background:var(--panel); color:var(--text); font-family:var(--font-body);">
                 <option value="">Loading registered users...</option>
             </select>
         </div>

         <div id="admin-selected-user-box" style="display:none; margin-bottom:14px; padding:12px 14px; background:var(--panel); border:1px solid var(--edge); border-radius:12px;">
             <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                 <div style="display:flex; align-items:center; gap:6px; font-size:13px; min-width:0;">
                     <span class="hint" style="font-weight:bold;">Credits:</span>
                     <span id="admin-selected-user-credits" style="font-weight:800; color:var(--vip-gold);">—</span>
                 </div>
                 <button type="button" id="admin-toggle-collection-btn" class="btn btn-secondary" style="padding:7px 12px; font-size:12px; display:flex; align-items:center; gap:6px; white-space:nowrap; flex-shrink:0;">
                     <span id="admin-toggle-collection-icon" style="display:inline-block; font-size:10px; transition:transform .2s ease;">▶</span>
                     <span id="admin-toggle-collection-label">Show Cards</span>
                 </button>
             </div>
             <div id="admin-user-collection-panel" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid var(--edge); max-height:360px; overflow-y:auto; -webkit-overflow-scrolling:touch;">
                 <div id="admin-user-collection-grid" class="collection-grid"></div>
             </div>
         </div>

         <div style="margin-bottom:12px;">
             <label class="hint" style="display:block; margin-bottom:4px; font-weight:bold;">Target Membership Tier:</label>
             <select id="admin-target-tier-select" style="width:100%; padding:12px 14px; border-radius:12px; border:1px solid var(--edge); background:var(--panel); color:var(--text); font-family:var(--font-body);">
                 <option value="free">Rookie (base rank, 125 daily credits)</option>
                 <option value="starter">Starter (625 daily credits)</option>
                 <option value="plus">Plus (1,250 daily credits)</option>
                 <option value="pro">Pro (2,500 daily credits)</option>
                 <option value="elite">Elite (5,000 daily credits)</option>
                 <option value="vip">VIP Member (12,500 daily credits)</option>
                 <option value="admin">Admin (always ∞ credits)</option>
             </select>
         </div>

         <button class="btn btn-vip" id="admin-update-membership-btn" style="width:100%;">Update User Membership</button>
         <div id="admin-msg" class="hint" style="margin-top:12px; text-align:center; font-weight:bold; min-height:16px;"></div>

         <div style="margin-top:18px; padding-top:16px; border-top:1px solid var(--edge);">
             <p class="hint" style="margin-bottom:10px;">Export the email list of users who opted in at signup — paste into whatever ESP (Mailchimp, ConvertKit, Beehiiv, etc.) you're sending from. Only opted-in emails are included.</p>
             <button class="btn btn-secondary" id="admin-export-subs-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;"><span style="display:inline-flex;">${badgeIconSVG(MAIL_ICON_PATH, 18)}</span>Export Subscriber List</button>
             <textarea id="admin-subs-output" readonly style="display:none; width:100%; margin-top:10px; min-height:120px; padding:10px; border-radius:10px; border:1px solid var(--edge); background:var(--panel); color:var(--text); font-family:monospace; font-size:12px;"></textarea>
             <div id="admin-subs-msg" class="hint" style="margin-top:10px; text-align:center; font-weight:bold; min-height:16px;"></div>
         </div>

         <div style="margin-top:18px; padding-top:16px; border-top:1px solid var(--edge);">
             <p class="hint" style="margin-bottom:10px;">Last 7 days — signups, pack opens, affiliate clicks, referrals.</p>
             <button class="btn btn-secondary" id="admin-load-analytics-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;"><span style="display:inline-flex;">${badgeIconSVG(CHART_ICON_PATH, 18)}</span>Load Analytics</button>
             <div id="admin-analytics-output" style="margin-top:10px;"></div>
         </div>
      </div>

      <div id="tip-jar-section"></div>
  `;
  app.appendChild(wrap);

  // Shown regardless of guest/logged-in state (it's not account or
  // gameplay related) — but only if a tip jar is actually configured;
  // see the CONFIG.TIP_JAR_URL comment for why this is worded the way
  // it is and kept fully separate from anything account/credits-related.
  if (CONFIG.TIP_JAR_URL) {
    $('#tip-jar-section', wrap).innerHTML = `
      <div style="text-align:center; margin-top:32px; padding-top:16px; border-top:1px solid var(--edge);">
        <a href="${CONFIG.TIP_JAR_URL}" target="_blank" rel="noopener noreferrer" style="color:var(--dim); font-size:12px; text-decoration:none;">☕ Support the developer</a>
        <div class="hint" style="font-size:10px; margin-top:4px;">Voluntary tip — doesn't affect your credits, packs, or account in any way.</div>
        ${CONFIG.SOVRN_VERIFICATION_URL ? `
        <div style="margin-top:14px;">
          <a href="${CONFIG.SOVRN_VERIFICATION_URL}" target="_blank" rel="noopener noreferrer" style="color:var(--dim); font-size:12px; text-decoration:none;">🛍️ Shop cards & collectibles (affiliate link)</a>
        </div>` : ''}
      </div>
    `;
  }
  // Standing FTC-style disclosure — separate from the per-link "(affiliate
  // link)" note in renderAffiliateButtons() so it's visible even on pages
  // that don't happen to show a buy button (see AFFILIATE config comment).
  if (AFFILIATE.linksFor('x').length || AFFILIATE.SOVRN_API_KEY) {
    const disclosure = el('div');
    disclosure.style.cssText = 'text-align:center; margin-top:14px; padding-top:14px; border-top:1px solid var(--edge);';
    disclosure.innerHTML = `<div class="hint" style="font-size:10px;">Some card/booster links in this app are affiliate links — we may earn a commission on qualifying purchases at no extra cost to you. See our full <a href="#" id="footer-affiliate-link" style="color:var(--dim); text-decoration:underline;">affiliate disclosure</a>.</div>`;
    wrap.appendChild(disclosure);
    $('#footer-affiliate-link', disclosure).addEventListener('click', (e) => { e.preventDefault(); render('terms'); });
  }

  // Legal footer — shown regardless of guest/logged-in state, same as
  // the tip jar/affiliate disclosure above.
  const legalFooter = el('div');
  legalFooter.style.cssText = 'text-align:center; margin-top:14px; padding-top:14px; border-top:1px solid var(--edge); display:flex; gap:14px; justify-content:center;';
  legalFooter.innerHTML = `
    <a href="#" id="footer-privacy-link" style="color:var(--dim); font-size:11px; text-decoration:underline;">Privacy Policy</a>
    <a href="#" id="footer-terms-link" style="color:var(--dim); font-size:11px; text-decoration:underline;">Terms of Service</a>
  `;
  wrap.appendChild(legalFooter);
  $('#footer-privacy-link', legalFooter).addEventListener('click', (e) => { e.preventDefault(); render('privacy'); });
  $('#footer-terms-link', legalFooter).addEventListener('click', (e) => { e.preventDefault(); render('terms'); });

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

        // Selected-user credits readout + collapsible "their cards" panel.
        // adminUsersById lets us look up the full row (credits, is_admin,
        // premium_tier, id) for whichever option is currently selected,
        // without a round-trip every time the dropdown changes.
        const selectedUserBox = $('#admin-selected-user-box', wrap);
        const selectedUserCredits = $('#admin-selected-user-credits', wrap);
        const toggleBtn = $('#admin-toggle-collection-btn', wrap);
        const toggleIcon = $('#admin-toggle-collection-icon', wrap);
        const toggleLabel = $('#admin-toggle-collection-label', wrap);
        const collectionPanel = $('#admin-user-collection-panel', wrap);
        const collectionGrid = $('#admin-user-collection-grid', wrap);

        let adminUsersById = {};
        let collectionOpen = false;
        let collectionLoadToken = 0; // guards stale fetches when the user is switched mid-load

        function cacheUsers(list) {
            adminUsersById = {};
            (list || []).forEach(u => { adminUsersById[u.email || u.id] = u; });
        }

        function setToggleState(open, countLabel) {
            collectionOpen = open;
            toggleIcon.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
            collectionPanel.style.display = open ? 'block' : 'none';
            toggleLabel.textContent = open ? `Hide Cards${countLabel != null ? ` (${countLabel})` : ''}` : 'Show Cards';
        }

        async function loadCollectionFor(targetUserId) {
            const myToken = ++collectionLoadToken;
            collectionGrid.innerHTML = '<div class="hint" style="grid-column:1/-1;">Loading cards…</div>';
            try {
                const { data: coll, error } = await sb.rpc('get_public_collection', { p_user_id: targetUserId });
                if (myToken !== collectionLoadToken) return; // a different user was selected while this was in flight
                if (error) throw error;
                setToggleState(true, (coll || []).length);
                if (!coll || !coll.length) {
                    collectionGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">This user has no cards yet.</div>';
                    return;
                }
                collectionGrid.innerHTML = '';
                coll
                  .slice()
                  .sort((a, b) => classify(b.rarity).id - classify(a.rarity).id)
                  .forEach(c => {
                    const item = el('div', 'coll-item');
                    item.innerHTML = `<img src="${escapeHtml(c.image)}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/><span class="count">×${c.count}</span>`;
                    item.addEventListener('click', async () => showCardFullscreen(await ImgCache.get(c.image), { id: c.card_id, name: c.name, image: c.image, rarity: c.rarity }));
                    collectionGrid.appendChild(item);
                });
            } catch (e) {
                if (myToken !== collectionLoadToken) return;
                collectionGrid.innerHTML = '<div class="hint" style="grid-column:1/-1; color:var(--danger)">Error loading collection.</div>';
            }
        }

        // Called whenever the selected user changes (initial load, dropdown
        // change, or after an admin update refreshes the list). Keeps the
        // credits readout, tier dropdown, and — if the cards panel is
        // currently open — the collection grid all "listening" to whichever
        // user is selected above.
        function updateSelectedUserPanel(identifier) {
            const u = adminUsersById[identifier];
            if (!u) {
                selectedUserBox.style.display = 'none';
                return;
            }
            selectedUserBox.style.display = 'block';
            selectedUserCredits.textContent = u.is_admin ? '∞' : (typeof u.credits === 'number' ? u.credits.toLocaleString() : '—');
            if (u.is_admin) tierSelect.value = 'admin';
            else if (u.premium_tier) tierSelect.value = u.premium_tier;

            if (collectionOpen && u.id) loadCollectionFor(u.id);
            else setToggleState(false);
        }

        toggleBtn.addEventListener('click', () => {
            const u = adminUsersById[userSelect.value];
            if (!collectionOpen && u?.id) loadCollectionFor(u.id);
            else setToggleState(false);
        });

        userSelect.addEventListener('change', () => updateSelectedUserPanel(userSelect.value));

        // Builds <option> elements via safe DOM APIs (.value/.textContent
        // as properties) instead of string-concatenating user-controlled
        // fields (email/username) into an innerHTML template. The old
        // version let a crafted email/username like `x" onmouseover="..`
        // break out of the value="..." attribute and inject a real
        // event-handler attribute — into an ADMIN's authenticated
        // session, specifically, since only admins ever render this.
        function renderUserOptions(selectEl, users, selectedIdentifier) {
            selectEl.replaceChildren();
            for (const u of users) {
                const opt = document.createElement('option');
                const identifier = u.email || u.id;
                opt.value = identifier;
                opt.textContent = `${u.email || u.username || u.id} (Current: ${u.premium_tier || 'free'})`;
                if (selectedIdentifier && identifier === selectedIdentifier) opt.selected = true;
                selectEl.appendChild(opt);
            }
        }

        try {
            const { data: usersList, error: usersErr } = await sb.rpc('admin_list_users');
            if (usersErr) throw usersErr;
            if (usersList && usersList.length > 0) {
                renderUserOptions(userSelect, usersList);
                cacheUsers(usersList);
                updateSelectedUserPanel(userSelect.value);
            } else {
                userSelect.innerHTML = '<option value="">No registered users found</option>';
            }
        } catch(e) {
            userSelect.innerHTML = '<option value="">Error loading users list</option>';
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
                    
                    const { data: refreshedList } = await sb.rpc('admin_list_users');
                    if (refreshedList) {
                        renderUserOptions(userSelect, refreshedList, targetIdentifier);
                        cacheUsers(refreshedList);
                        updateSelectedUserPanel(targetIdentifier);
                    }
                } catch(e) {
                    msgBox.style.color = 'var(--danger)';
                    msgBox.textContent = e.message;
                }
                updateBtn.disabled = false; updateBtn.textContent = 'Update User Membership';
            });
        }

        const exportSubsBtn = $('#admin-export-subs-btn', wrap);
        const subsOutput = $('#admin-subs-output', wrap);
        const subsMsgBox = $('#admin-subs-msg', wrap);
        if (exportSubsBtn) {
            exportSubsBtn.addEventListener('click', async () => {
                exportSubsBtn.disabled = true; exportSubsBtn.textContent = 'Exporting...';
                try {
                    const { data, error } = await sb.rpc('admin_export_subscribers');
                    if (error) throw error;
                    if (!data || !data.length) {
                        subsMsgBox.style.color = 'var(--dim)';
                        subsMsgBox.textContent = 'No opted-in subscribers yet.';
                        subsOutput.style.display = 'none';
                    } else {
                        subsOutput.value = data.map(u => u.email).join('\n');
                        subsOutput.style.display = 'block';
                        subsMsgBox.style.color = 'var(--cyan)';
                        subsMsgBox.textContent = `${data.length} subscriber${data.length === 1 ? '' : 's'} — tap to select all, then copy.`;
                        subsOutput.addEventListener('click', () => subsOutput.select());
                    }
                } catch (e) {
                    subsMsgBox.style.color = 'var(--danger)';
                    subsMsgBox.textContent = e.message;
                }
                exportSubsBtn.disabled = false; exportSubsBtn.innerHTML = `<span style="display:inline-flex;">${badgeIconSVG(MAIL_ICON_PATH, 18)}</span>Export Subscriber List`;
            });
        }

        const loadAnalyticsBtn = $('#admin-load-analytics-btn', wrap);
        const analyticsOutput = $('#admin-analytics-output', wrap);
        if (loadAnalyticsBtn) {
            loadAnalyticsBtn.addEventListener('click', async () => {
                loadAnalyticsBtn.disabled = true; loadAnalyticsBtn.textContent = 'Loading...';
                try {
                    const { data, error } = await sb.rpc('admin_get_event_counts', { p_days: 7 });
                    if (error) throw error;
                    if (!data || !data.length) {
                        analyticsOutput.innerHTML = `<div class="hint" style="text-align:center;">No events logged in the last 7 days.</div>`;
                    } else {
                        const totals = {};
                        data.forEach(row => { totals[row.event_name] = (totals[row.event_name] || 0) + Number(row.count); });
                        const rows = Object.entries(totals).sort((a,b) => b[1]-a[1]).map(([name, count]) => `
                          <div style="display:flex; justify-content:space-between; padding:8px 10px; border-bottom:1px solid var(--edge); font-size:13px;">
                            <span>${escapeHtml(name)}</span>
                            <span style="font-weight:800; color:var(--vip-gold);">${count.toLocaleString()}</span>
                          </div>
                        `).join('');
                        analyticsOutput.innerHTML = `<div style="border:1px solid var(--edge); border-radius:10px; overflow:hidden;">${rows}</div>`;
                    }
                } catch (e) {
                    analyticsOutput.innerHTML = `<div class="hint" style="color:var(--danger); text-align:center;">${escapeHtml(e.message)}</div>`;
                }
                loadAnalyticsBtn.disabled = false; loadAnalyticsBtn.innerHTML = `<span style="display:inline-flex;">${badgeIconSVG(CHART_ICON_PATH, 18)}</span>Load Analytics`;
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
    <div class="section-title">Search</div>
    <div style="display:flex; gap:8px; margin-bottom:12px;">
      <button class="btn btn-primary" id="search-mode-cards" style="flex:1; padding:9px;">Cards</button>
      <button class="btn btn-secondary" id="search-mode-users" style="flex:1; padding:9px;">Collectors</button>
    </div>
    <div id="search-card-panel">
      <div class="search-bar-wrap">
        <input type="text" id="search-input" placeholder="Search a card name..." class="auth-form" style="width:auto;" />
        <button class="btn btn-primary" id="search-btn">Search</button>
      </div>
      <div id="search-results" style="display:flex; flex-direction:column; gap:10px;"></div>

      <div style="margin:26px 0 4px; font-family:var(--font-display); font-weight:700; font-size:15px;">Browse Every Pack for a Card</div>
      <div class="hint" style="margin-bottom:10px;">Find every pack (and every art variant) a Pokémon appears in — not just what's already been pulled.</div>
      <input type="text" id="global-card-search" placeholder="e.g. Charizard" class="auth-form" style="width:100%; margin-bottom:8px;" />
      <div id="global-search-progress" class="hint" style="display:none; margin-bottom:8px;"></div>
      <div id="global-search-results"></div>
    </div>
    <div id="search-user-panel" style="display:none;">
      <input type="text" id="username-search-input" placeholder="Search by username..." class="auth-form" style="width:100%;" />
      <div id="username-search-results" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;"></div>
    </div>
  `;
  app.appendChild(wrap);

  const cardPanel = $('#search-card-panel', wrap);
  const userPanel = $('#search-user-panel', wrap);
  const modeCardsBtn = $('#search-mode-cards', wrap);
  const modeUsersBtn = $('#search-mode-users', wrap);

  modeCardsBtn.addEventListener('click', () => {
    cardPanel.style.display = ''; userPanel.style.display = 'none';
    modeCardsBtn.className = 'btn btn-primary'; modeUsersBtn.className = 'btn btn-secondary';
  });
  modeUsersBtn.addEventListener('click', () => {
    cardPanel.style.display = 'none'; userPanel.style.display = '';
    modeCardsBtn.className = 'btn btn-secondary'; modeUsersBtn.className = 'btn btn-primary';
  });

  wireUsernameSearch($('#username-search-input', wrap), $('#username-search-results', wrap));
  wireGlobalCardSearch($('#global-card-search', wrap), $('#global-search-progress', wrap), $('#global-search-results', wrap));

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
              <img src="${escapeHtml(item.card_image || '')}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'" style="width:44px; height:62px; object-fit:cover; border-radius:4px; margin-right:12px;" />
              <div style="flex:1;">
                 <div style="font-weight:bold; font-size:14px; margin-bottom:2px;">${escapeHtml(item.card_name)}</div>
                 <div class="hint" style="color:var(--dim);">Pulled by: ${escapeHtml(item.username) || 'User'}</div>
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

// Shared by the Search tab's "Collectors" panel and the Trade Hub's
// "Find a collector" box — wires a text input to a debounced,
// live-autocomplete username lookup via the search_usernames RPC.
// resultsEl gets replaced with matching rows as the user types; each row
// calls onSelect(user) if provided, otherwise defaults to opening that
// user's collection directly.
function wireUsernameSearch(inputEl, resultsEl, onSelect){
  let debounceTimer;
  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = inputEl.value.trim();
    if(query.length < 2){ resultsEl.innerHTML = ''; return; }
    debounceTimer = setTimeout(async () => {
      resultsEl.innerHTML = '<div class="hint">Searching…</div>';
      try {
        const { data, error } = await sb.rpc('search_usernames', { p_query: query });
        if(error) throw error;
        if(!data || !data.length){
          resultsEl.innerHTML = '<div class="hint">No collectors found with that username.</div>';
          return;
        }
        resultsEl.innerHTML = '';
        data.forEach(u => {
          const row = el('div','refer-box');
          row.style.cssText = 'display:flex; align-items:center; cursor:pointer;';
          row.innerHTML = `
            <div style="width:36px; height:36px; border-radius:50%; background:var(--panel-2); display:flex; align-items:center; justify-content:center; font-weight:bold; margin-right:12px; flex-shrink:0;">${escapeHtml((u.username||'?')[0].toUpperCase())}</div>
            <div style="flex:1; font-weight:bold; font-size:14px;">${escapeHtml(u.username)}</div>
            <span style="font-size:18px; color:var(--dim);">›</span>
          `;
          row.addEventListener('click', () => {
            if(onSelect) onSelect(u);
            else render('user_collection', { userId: u.id, username: u.username });
          });
          resultsEl.appendChild(row);
        });
      } catch(e){
        resultsEl.innerHTML = '<div class="hint" style="color:var(--danger)">Search failed — try again.</div>';
      }
    }, 250);
  });
}

// Searches every Pokémon set (EN + JP) for cards whose name matches the
// query, grouping every matching art variant/print under its card name
// so a person can see everywhere a given Pokémon shows up across packs.
// Deliberately client-side rather than a new server RPC: getCardsForSet
// already has a 7-day local cache plus a shared cross-user cache (see
// getSharedSetCache), so after the first person anywhere searches a
// given set, every later search of that set is just cache reads — no
// repeated API hammering. Runs with limited concurrency and renders
// results incrementally as each set resolves, rather than blocking on
// every set finishing first, since a full sweep of every EN+JP set can
// take a few seconds even fully cached.
function wireGlobalCardSearch(inputEl, progressEl, resultsEl){
  let debounceTimer;
  let searchGen = 0;

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = inputEl.value.trim();
    if(query.length < 2){
      searchGen++; // invalidate any in-flight search
      resultsEl.innerHTML = '';
      progressEl.style.display = 'none';
      return;
    }
    debounceTimer = setTimeout(() => runGlobalCardSearch(query, progressEl, resultsEl, ++searchGen, () => searchGen), 400);
  });
}

async function runGlobalCardSearch(query, progressEl, resultsEl, myGen, currentGen){
  resultsEl.innerHTML = '';
  progressEl.style.display = 'block';
  progressEl.textContent = 'Loading set list…';

  // Passes 'pokemon' explicitly to getSets/getCardsForSet instead of
  // flipping the shared ACTIVE_GAME global — this search runs fully
  // independent of whatever tab the user is actually on, and never
  // touches state anything else in the app reads. (Previously this
  // mutated ACTIVE_GAME for the duration of the sweep and restored it
  // after, which raced with the user switching tabs mid-search.)
  let sets;
  try{
    sets = await getSets('pokemon');
  } catch(e){
    if(myGen !== currentGen()) return;
    progressEl.textContent = "Couldn't load the set list — try again.";
    return;
  }
  if(myGen !== currentGen()) return;

  const q = query.toLowerCase();
  const grouped = new Map(); // lowercase card name -> { name, entries: [{set, card}] }
  let searched = 0;
  progressEl.textContent = `Searching 0 / ${sets.length} packs…`;

  function paint(){
    if(myGen !== currentGen()) return;
    const names = [...grouped.keys()].sort();
    resultsEl.innerHTML = '';
    names.forEach(key => {
      const group = grouped.get(key);
      const section = el('div');
      section.style.marginBottom = '18px';
      const totalPrints = group.entries.length;
      section.innerHTML = `<div style="font-weight:bold; font-size:14px; margin-bottom:8px;">${group.name} <span class="hint" style="font-weight:normal;">— ${totalPrints} print${totalPrints===1?'':'s'} found</span></div>`;
      const grid = el('div','collection-grid');
      group.entries.forEach(({ set, card }) => {
        const item = el('div','coll-item');
        item.innerHTML = `<img src="" onerror="this.style.opacity=0.3"/><span class="count" style="font-size:9px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${set.name}</span>`;
        item.title = `${card.name} — ${set.name}`;
        item.addEventListener('click', async ()=>{
          const src = card.images?.large || card.images?.small || '';
          showCardFullscreen(await ImgCache.get(src), null);
        });
        grid.appendChild(item);
        const thumbUrl = card.images?.small || card.images?.large || '';
        if(thumbUrl){
          ImgCache.get(thumbUrl, true).then(src => {
            const imgEl = item.querySelector('img');
            if(imgEl && src) imgEl.src = src;
          });
        }
      });
      section.appendChild(grid);
      resultsEl.appendChild(section);
    });
  }

  const CONCURRENCY = 6;
  let cursor = 0;
  async function worker(){
    while(cursor < sets.length){
      if(myGen !== currentGen()) return;
      const setMeta = sets[cursor++];
      try{
        const cards = await getCardsForSet(setMeta.id, 'pokemon');
        if(myGen !== currentGen()) return;
        let addedAny = false;
        cards.forEach(c => {
          if(!c.name || !c.name.toLowerCase().includes(q)) return;
          const key = c.name.toLowerCase();
          if(!grouped.has(key)) grouped.set(key, { name: c.name, entries: [] });
          grouped.get(key).entries.push({ set: setMeta, card: c });
          addedAny = true;
        });
        if(addedAny) paint();
      } catch(e){ /* skip sets that fail to load — keep sweeping the rest */ }
      searched++;
      if(myGen === currentGen()) progressEl.textContent = `Searching ${searched} / ${sets.length} packs…`;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if(myGen !== currentGen()) return;

  const totalPrints = [...grouped.values()].reduce((s,g)=>s+g.entries.length, 0);
  progressEl.textContent = grouped.size
    ? `Done — "${query}" found in ${grouped.size} card name${grouped.size===1?'':'s'}, ${totalPrints} print${totalPrints===1?'':'s'} total.`
    : `No cards matching "${query}" found in any pack.`;
}

// Read-only tier + badges row for VIEWING another user (their own profile
// tab uses renderBadgesSection instead, which also handles admin styling
// for the owner's view). Relies on the get_public_profile_badges RPC
// since profiles' own RLS only allows reading your own row — this RPC
// deliberately exposes just the tier field, gated on that profile's
// is_public flag, nothing else (no email/credits/etc).
function renderPublicBadgesRow(tierRow, achievementKeys) {
  const tiles = [];
  if (tierRow) {
    const t = TIER_LADDER.find(x => x.key === (tierRow.premium_tier || 'free').toLowerCase()) || TIER_LADDER[0];
    tiles.push(badgeTileHTML(tierIconSVG(t.key, 30), `${t.label} Tier`, `${t.label} tier`, t.color));
  }
  (achievementKeys || []).forEach(key => {
    const meta = ACHIEVEMENT_META[key];
    if (meta) tiles.push(badgeTileHTML(
      badgeIconSVG(ACHIEVEMENT_ICON_PATHS[key] || '', 30),
      meta.label,
      meta.desc,
      ACHIEVEMENT_COLORS[key] || '#94a3b8'
    ));
  });
  if (!tiles.length) return '';
  return `<div id="public-badges-row" class="badges-grid" style="margin:4px 0 14px;">${tiles.join('')}</div>`;
}

async function renderUserCollection(targetUserId, username) {
  const wrap = el('div');
  wrap.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin:22px 0 4px;">
      <div class="section-title" style="margin:0;">${escapeHtml(username) || 'User'}'s Collection</div>
      <button class="btn btn-secondary" id="follow-btn" style="padding:6px 14px; font-size:12px; display:none;">Follow</button>
    </div>
    <div id="user-badges-slot"></div>
    <div id="user-coll-grid" class="collection-grid"></div>
  `;
  app.appendChild(wrap);

  const grid = $('#user-coll-grid', wrap);
  grid.innerHTML = '<div class="hint" style="grid-column:1/-1;">Loading collection...</div>';

  // get_public_profile_badges returns no row both when the profile
  // doesn't exist and when it's set private — fetch it once up front so
  // the grid below can tell "private" apart from "genuinely empty".
  let tierRow = null, isPrivate = false;
  try {
    const { data } = await sb.rpc('get_public_profile_badges', { p_user_id: targetUserId }).maybeSingle();
    tierRow = data;
    isPrivate = !data;
  } catch (e) { /* treat as unknown/private below */ isPrivate = true; }

  // Badges — best-effort, never blocks the grid.
  (async () => {
    if (isPrivate) return;
    try {
      const { data: ach } = await sb.from('achievements').select('achievement_key').eq('user_id', targetUserId);
      const slot = $('#user-badges-slot', wrap);
      if (slot) slot.innerHTML = renderPublicBadgesRow(tierRow, (ach || []).map(r => r.achievement_key));
    } catch (e) { /* no badges shown */ }
  })();

  if (isPrivate) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">This collection is private.</div>';
    return;
  }

  try {
     const { data: coll, error: collErr } = await sb.rpc('get_public_collection', { p_user_id: targetUserId });
     if (collErr) throw collErr;

     if (!coll || !coll.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">This user has no cards yet.</div>';
     } else {
        grid.innerHTML = '';
        coll
          .slice()
          .sort((a,b)=> classify(b.rarity).id - classify(a.rarity).id)
          .forEach(c=>{
          const item = el('div','coll-item');
          item.innerHTML = `<img src="${escapeHtml(c.image)}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/><span class="count">×${c.count}</span>`;
          item.addEventListener('click', async ()=> showCardFullscreen(await ImgCache.get(c.image), { id: c.card_id, name: c.name, image: c.image, rarity: c.rarity }));
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
    <h2>Trade with ${escapeHtml(username) || 'this collector'}</h2>
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
      item.innerHTML = `<img src="${escapeHtml(c.image)}" onerror="this.style.opacity=0.3"/><span class="count">×${c.count}</span>`;
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
        item.innerHTML = `<img src="${escapeHtml(c.image)}" onerror="this.style.opacity=0.3"/><span class="count">×${c.count}</span>`;
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

// Resolves the best available pack-art image for a set — tries
// Prewarm.resolvePackArtUrls candidates in order, then s.images.symbol.
// Returns null if nothing actually loaded, rather than a placeholder —
// callers decide what "nothing loaded" means for them (renderHome's JP
// tab filters the set out entirely; every other tab falls back to a
// blank placeholder image, same as before this existed).
async function resolveSetImageSrc(s) {
  try {
    const candidates = await Prewarm.resolvePackArtUrls(s);
    for (const url of candidates) {
      const src = await ImgCache.get(url, true).catch(() => null);
      if (src) return src;
    }
  } catch (e) { /* fall through */ }
  if (s.images.symbol) {
    const src = await ImgCache.get(s.images.symbol, true).catch(() => null);
    if (src) return src;
  }
  return null;
}

// A set is only worth listing as a Japanese pack if opening it actually
// shows genuine Japanese-sourced art (TCGdex's native ja asset or
// PokéWallet), not English-print art on a card claiming to be Japanese
// (TCGdex's en asset or the pokemontcg.io fallback tiers — see each
// card's _artSource, set above in getCardsForSet).
//
// 0.5 means at least half the set must be real JP art. This was
// originally 0 ("exclude only if EVERY card is English-sourced"), which
// was too lenient in practice: a set with just a handful of real-JP
// cards scattered across a large pool still passed that bar, while any
// individual 10-card pack pulled from it was overwhelmingly likely to
// land entirely on the English-fallback majority — exactly the
// all-English-pack experience this filter exists to prevent. Raise
// further (e.g. 0.8) to be stricter still, at the cost of excluding
// more sets that only have partial coverage (e.g. SV11W, where
// PokéWallet covers roughly a third of the set).
const JP_SET_MIN_REAL_ART_RATIO = 0.5;

// Shared cross-user cache for the JP tab's per-set "genuine Japanese
// art?" verdict — the pass/fail result itself, not the card data that
// produced it. That card data is already cached (see set_card_cache
// above), but re-deriving the verdict from it still means resolving
// every card in the set on every single page load, for every JP set,
// every time anyone opens the JP tab — that's the "long check". Once a
// set's verdict is known it never changes unless the pipeline that
// produced it changes (see JP_FILTER_VERSION), so it only ever needs to
// be computed once, ever, across every user, on every device.
//
// SETUP REQUIRED (one-time, same caveat as set_card_cache above — the
// anon key can't create tables/policies). Run once in the Supabase SQL
// editor:
//   create table jp_set_filter_cache (
//     set_id text primary key,
//     genuine boolean not null,
//     v text not null,
//     updated_at timestamptz not null default now()
//   );
//   alter table jp_set_filter_cache enable row level security;
//   create policy "public read" on jp_set_filter_cache for select using (true);
//   create policy "authenticated write" on jp_set_filter_cache for insert
//     with check (auth.role() = 'authenticated');
//   create policy "authenticated update" on jp_set_filter_cache for update
//     using (auth.role() = 'authenticated');
// Guests still read fine (getJpFilterCacheBatch below never checks
// session) — they just don't contribute new verdicts; putJpFilterCache()
// skips the write attempt entirely when there's no session, rather than
// sending one RLS will reject.
const JP_FILTER_CACHE_TABLE = 'jp_set_filter_cache';
const JP_FILTER_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days — same safety-net TTL as set_card_cache
// Tied to CARD_CACHE_VERSION (a verdict derived from card data resolved
// under an older pipeline version is meaningless once that pipeline
// changes) AND to JP_SET_MIN_REAL_ART_RATIO (a verdict computed under a
// different bar for "genuine enough" is a different question entirely).
// Bump this (or just bump CARD_CACHE_VERSION, which flows through
// automatically) whenever either changes, so old rows are treated as a
// miss instead of serving a verdict that no longer reflects current
// logic.
const JP_FILTER_VERSION = CARD_CACHE_VERSION + '_r' + JP_SET_MIN_REAL_ART_RATIO;
function putJpFilterCache(setId, genuine) {
  // Guests can't write under the authenticated-only RLS policy — skip
  // the request entirely rather than sending one that's just going to
  // be rejected.
  if (!session) return;
  // Fire-and-forget: a slow/failed write shouldn't hold up this user,
  // who already has their verdict either way.
  sb.from(JP_FILTER_CACHE_TABLE)
    .upsert({ set_id: setId, genuine, v: JP_FILTER_VERSION, updated_at: new Date().toISOString() })
    .then(() => {})
    .catch(() => {});
}
// One round-trip for every set's verdict instead of one request per
// set — the JP tab's home render always needs every set's verdict at
// once, and asking for them one at a time is a network round-trip per
// set before a single card can appear. With a dozen-plus JP sets,
// that's the difference between one query and a dozen. Returns a Map of
// setId -> boolean, containing only fresh, version-matching hits;
// anything not in the map is a miss (new set, stale version, or table
// unreachable) and falls through to the real check.
async function getJpFilterCacheBatch(setIds) {
  const map = new Map();
  if (!setIds.length) return map;
  try {
    let rows;
    if (CONFIG.CDN_DB_BASE) {
      // Edge-cached path (see CDN_DB_BASE comment / chase-cards-db-worker.js).
      const res = await fetch(`${CONFIG.CDN_DB_BASE}/jp_set_filter_cache?ids=${setIds.map(encodeURIComponent).join(',')}`);
      if (!res.ok) return map;
      rows = await res.json();
    } else {
      const { data, error } = await sb.from(JP_FILTER_CACHE_TABLE).select('set_id, genuine, v, updated_at').in('set_id', setIds);
      if (error || !data) return map;
      rows = data;
    }
    const cutoff = Date.now() - JP_FILTER_CACHE_MAX_AGE_MS;
    for (const row of rows) {
      if (row.v !== JP_FILTER_VERSION) continue; // written under an older pipeline/threshold — treat as a miss
      if (new Date(row.updated_at).getTime() < cutoff) continue; // stale — treat as a miss
      map.set(row.set_id, row.genuine);
    }
  } catch (e) {
    // table not set up yet / unreachable — empty map, everything falls through
  }
  return map;
}

// Builds one set card, appends it to whatever grid is currently on
// screen, then fills in its image (immediately if already resolved,
// otherwise after resolveSetImageSrc finishes). Shared by the generic
// per-tab render loop and the JP tab's progressive lane below, so a
// card behaves identically — same skeleton-then-fill, same click
// handler, same abandoned-render guard — no matter which path put it
// on screen.
function resolveAndAppendSetCard(s, myGen, gridEl) {
  return (async () => {
    if (myGen !== homeRenderGen) return; // abandoned before we even started this card
    const card = el('div', 'set-card');
    card.dataset.setId = s.id;
    const costDisplay = s.packCost || 150;

    card.innerHTML = `<img src="" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg=='" alt=""/><div class="name">${s.name}</div><div class="meta">${s.series} · ${costDisplay} cr</div>`;

    card.addEventListener('click', () => {
      if (s.isPlaceholder) {
        toast(`${s.series} is coming soon!`);
      } else {
        render('set', { set: s });
      }
    });
    gridEl.appendChild(card);

    if (s.isPlaceholder) return;

    const imgEl = card.querySelector('img');
    if (!imgEl) return;
    const FALLBACK_SRC = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==';

    // JP sets already had their art resolved during the pre-filter pass
    // above — that resolved image is WHY this set made it into
    // displaySets at all — so reuse it directly instead of spending a
    // second (redundant, if cheap) lookup re-resolving the same thing.
    if (s._resolvedImgSrc) { imgEl.src = s._resolvedImgSrc; return; }

    const src = await resolveSetImageSrc(s);
    if (myGen !== homeRenderGen) return; // this grid may no longer be on screen
    imgEl.src = src || FALLBACK_SRC;
  })();
}

async function isSetGenuinelyJapanese(setMeta) {
  try {
    const cards = await getCardsForSet(setMeta.id);
    if (!cards.length) return false;
    const realCount = cards.filter(c => c._artSource === 'native' || c._artSource === 'pokewallet').length;
    return (realCount / cards.length) > JP_SET_MIN_REAL_ART_RATIO;
  } catch (e) {
    // Couldn't resolve at all (rate limit, edge function hiccup, network
    // blip) — this is UNKNOWN, not "genuinely not Japanese". Returning
    // false here used to get written into the shared jp_set_filter_cache
    // table as a real negative verdict with a 30-day TTL, which meant a
    // single transient failure (e.g. PokéWallet's 100/hr free-tier limit
    // getting hit) could hide a perfectly good JP set from every user for
    // a month. null signals "try again later" — see the caller, which
    // deliberately does not cache a null result.
    return null;
  }
}

// Session-only (page-load-lifetime) cache of the JP tab's fully filtered
// set list — see renderHome's pkmn_jp branch. Even when every underlying
// getCardsForSet() call is itself a cache hit, re-running the full
// two-pass resolve+filter pipeline (many sets, each awaited through
// concurrency lanes) still costs real time just from orchestration/
// event-loop overhead — which is exactly what made revisiting this tab
// feel slow, on top of it being a full recomputation every single time.
// A full page reload always recomputes fresh; this only smooths out
// repeat visits within the same session.
let jpTabFilteredCache = null;
// Incremented on every renderHome() call; each call captures its own
// value and checks it after every await before touching the DOM. If a
// newer renderHome() has started in the meantime (e.g. the user tapped
// back into the Packs tab again before the previous call finished
// resolving), the older call abandons itself instead of appending cards
// into a grid element that's no longer the one on screen — which is
// what could make already-loaded-looking images seem to vanish: the
// OLD call was still running, finished late, and its DOM references
// were stale by the time it got there.
let homeRenderGen = 0;

// Re-appends each already-rendered set-card in the given order. appendChild
// on an existing child MOVES it (doesn't duplicate), so calling this after
// concurrent loading finishes fixes final DOM order regardless of which
// set's image happened to resolve first — sorting the underlying array
// before the fetch loop starts isn't enough on its own since the
// concurrency lanes race.
function reorderGridBySets(gridEl, orderedSets){
  orderedSets.forEach(s => {
    const node = gridEl.querySelector(`[data-set-id="${CSS.escape(s.id)}"]`);
    if(node) gridEl.appendChild(node);
  });
}

function applyHomeSortFilter(sets, sortMode, maxCostFilter){
  let out = sets;
  if(maxCostFilter && maxCostFilter !== 'all'){
    const cap = parseInt(maxCostFilter, 10);
    out = out.filter(s => (s.packCost || 150) <= cap);
  }
  const arr = [...out];
  if(sortMode === 'cost_asc') arr.sort((a,b) => (a.packCost||150) - (b.packCost||150));
  else if(sortMode === 'cost_desc') arr.sort((a,b) => (b.packCost||150) - (a.packCost||150));
  else if(sortMode === 'date_desc') arr.reverse(); // incoming order is already oldest->newest (or the closest natural equivalent for games with no real release dates), so newest-first is just a reversal
  // 'date_asc' (default) needs no sorting — incoming order already is that
  return arr;
}

async function renderHome(){
  const myGen = ++homeRenderGen;
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

  const sortFilterWrap = el('div');
  sortFilterWrap.style.cssText = 'display:flex; gap:8px; margin-bottom:14px;';
  sortFilterWrap.innerHTML = `
    <select id="home-sort-select" style="flex:1; min-width:0; padding:9px 10px; border-radius:10px; background:var(--panel); color:var(--text); border:1px solid var(--edge); font-family:var(--font-body); font-size:12.5px;">
      <option value="date_asc">Release: Oldest → Newest</option>
      <option value="date_desc">Release: Newest → Oldest</option>
      <option value="cost_asc">Cost: Low → High</option>
      <option value="cost_desc">Cost: High → Low</option>
    </select>
    <select id="home-cost-filter" style="flex:1; min-width:0; padding:9px 10px; border-radius:10px; background:var(--panel); color:var(--text); border:1px solid var(--edge); font-family:var(--font-body); font-size:12.5px;">
      <option value="all">Any cost</option>
      <option value="100">Under 100 cr</option>
      <option value="250">Under 250 cr</option>
      <option value="500">Under 500 cr</option>
      <option value="1000">Under 1,000 cr</option>
      <option value="2500">Under 2,500 cr</option>
      <option value="6000">Under 6,000 cr</option>
    </select>
  `;
  setsWrap.appendChild(sortFilterWrap);

  const gridHolder = el('div'); gridHolder.innerHTML = `<div class="set-grid" id="set-grid"></div>`;
  setsWrap.appendChild(gridHolder.firstChild);
  
  const footer = el('div','hint');
  footer.style.cssText = 'text-align:center; padding: 24px 12px; font-size: 11px; opacity: 0.6; line-height: 1.4;';
  footer.innerHTML = 'Not affiliated with, sponsored, or endorsed by Nintendo, Creatures Inc., or GAME FREAK. Pokémon and Pokémon character names are trademarks of Nintendo. For entertainment and simulation purposes only. Virtual credits have no cash value and cannot be redeemed for real-world currency.';
  setsWrap.appendChild(footer);
  
  app.appendChild(setsWrap);
  const grid = $('#set-grid');

  const sortSelect = $('#home-sort-select', setsWrap);
  const costFilterSelect = $('#home-cost-filter', setsWrap);
  sortSelect.value = store.get('home_sort_pref', 'date_asc');
  costFilterSelect.value = store.get('home_cost_filter_pref', 'all');
  sortSelect.addEventListener('change', () => { store.set('home_sort_pref', sortSelect.value); render('home'); });
  costFilterSelect.addEventListener('change', () => { store.set('home_cost_filter_pref', costFilterSelect.value); render('home'); });

  for(let i=0;i<6;i++){ const s = el('div','set-card skeleton'); s.style.height='96px'; grid.appendChild(s); }

  try{
    // Each tab maps to a GAMES adapter — flip ACTIVE_GAME before
    // fetching so every downstream call in this tab (this fetch, and
    // later getCardsForSet/classify once a set is opened) resolves
    // through the right adapter. pkmn_en/pkmn_jp share the 'pokemon'
    // adapter (JP is a filter on the same set list, same as before
    // this change). 'mtg' has no adapter yet, so it keeps its
    // hardcoded placeholder cards below and ACTIVE_GAME is left
    // untouched — setActiveGame() no-ops on an unknown game id.
    if (activeHomeTab === 'pkmn_en' || activeHomeTab === 'pkmn_jp') setActiveGame('pokemon');
    else if (activeHomeTab === 'onepiece') setActiveGame('onepiece');

    let displaySets = [];

    if (activeHomeTab === 'pkmn_en') {
        const allSets = await getSets();
        if (myGen !== homeRenderGen) return; // a newer renderHome() call has taken over
        displaySets = allSets.filter(s => !s.id.startsWith('jp-'));
    } else if (activeHomeTab === 'pkmn_jp') {
        const allSets = await getSets();
        if (myGen !== homeRenderGen) return;
        displaySets = allSets.filter(s => s.id.startsWith('jp-'));
    } else if (activeHomeTab === 'onepiece') {
        displaySets = await getSets(); // -> getSetsOnePiece() via GAMES.onepiece
        if (myGen !== homeRenderGen) return;
    } else if (activeHomeTab === 'mtg') {
        displaySets = [
            { id: 'mtg-alpha', name: 'Alpha', series: 'Magic: The Gathering', total: 295, packCost: 250, isPlaceholder: true, images: { logo: '' } },
            { id: 'mtg-beta', name: 'Beta', series: 'Magic: The Gathering', total: 302, packCost: 200, isPlaceholder: true, images: { logo: '' } },
            { id: 'mtg-arabian', name: 'Arabian Nights', series: 'Magic: The Gathering', total: 78, packCost: 200, isPlaceholder: true, images: { logo: '' } }
        ];
    }

    // Cost filter deferred for the JP tab specifically — applying it now
    // would mean a set filtered out today never gets its (expensive)
    // genuine-JP-art check run or cached, so switching the cost filter
    // back later would still show it as missing. Sort is safe to apply
    // now (it only affects processing/DOM order, fixed up either way via
    // reorderGridBySets once loading finishes).
    displaySets = applyHomeSortFilter(displaySets, sortSelect.value, activeHomeTab === 'pkmn_jp' ? 'all' : costFilterSelect.value);

    // Japanese sets specifically: only show ones that are both
    // genuinely Japanese-sourced art (isSetGenuinelyJapanese) AND have a
    // REAL resolved pack image, not the CSS/blank placeholder every
    // other tab falls back to when art can't be found. Each set clears
    // both checks independently and lands on screen the moment it does
    // — same progressive skeleton-then-fill behavior as every other
    // tab, no whole-list pause. The shared jp_set_filter_cache table
    // means most sets clear the genuine-check instantly; only a
    // never-before-seen set pays for the full per-card resolve.
    if (activeHomeTab === 'pkmn_jp') {
      if (jpTabFilteredCache) {
        // Already computed this session — skip straight to rendering
        // instead of re-running the whole resolve+filter pipeline. Still
        // re-apply sort/filter since those can change between visits
        // without the underlying survivor set changing.
        displaySets = applyHomeSortFilter(jpTabFilteredCache, sortSelect.value, costFilterSelect.value);
      } else {
        Prewarm.start(displaySets);
        grid.innerHTML = ''; // no more blocking pause — cards land here one by one below, same as EN

        // One round-trip for EVERY set's verdict up front, instead of a
        // request per set. On a warm cache (the common case after this
        // has run once, anywhere) this single query is often all that's
        // needed before every genuine set can start rendering.
        const verdictMap = await getJpFilterCacheBatch(displaySets.map(s => s.id));
        if (myGen !== homeRenderGen) return;

        const survivors = [];
        let jpNext = 0;
        const JP_CONCURRENCY = 4;
        async function jpLane() {
          while (jpNext < displaySets.length) {
            const i = jpNext++;
            const s = displaySets[i];

            // Cheap check first: is this set even genuinely Japanese?
            // A cache hit answers instantly; a miss means resolving
            // every card in the set (see isSetGenuinelyJapanese) — the
            // one part of this that's still slow on a truly cold cache.
            // Either way, checking THIS before touching pack art means
            // sets we already know to exclude never pay for an image
            // fetch that's just going to be thrown away.
            let genuine = verdictMap.has(s.id) ? verdictMap.get(s.id) : null;
            if (genuine === null) {
              genuine = await isSetGenuinelyJapanese(s);
              if (genuine !== null) putJpFilterCache(s.id, genuine);
            }
            if (myGen !== homeRenderGen) return;
            if (!genuine) continue;

            const src = await resolveSetImageSrc(s);
            if (myGen !== homeRenderGen) return;
            if (!src) continue; // genuine art exists, but nothing displayable to show for it

            s._resolvedImgSrc = src;
            survivors.push(s);
            // Card goes on screen the moment THIS set clears both
            // checks — it doesn't wait for the slowest set in the list,
            // the way the old two-pass version did.
            resolveAndAppendSetCard(s, myGen, grid);
          }
        }
        await Promise.all(Array.from({ length: JP_CONCURRENCY }, jpLane));
        if (myGen !== homeRenderGen) return;

        if (!survivors.length) {
          grid.innerHTML = '<div class="hint" style="grid-column:1/-1;text-align:center;padding:20px 8px;">No Japanese sets with real Japanese card art available right now — check back later.</div>';
          return;
        }
        // survivors landed in COMPLETION order (concurrency races), not
        // the sorted order the user picked — re-derive the correct order
        // from displaySets (already sorted above) and fix the DOM to
        // match. jpTabFilteredCache stores ALL genuine survivors
        // regardless of cost filter (see comment above where cost
        // filtering is deferred for this tab) so a later cost-filter
        // change doesn't need to re-run the expensive genuine-art check.
        const survivorIds = new Set(survivors.map(s => s.id));
        const allGenuineOrdered = displaySets.filter(s => survivorIds.has(s.id));
        jpTabFilteredCache = allGenuineOrdered;
        displaySets = applyHomeSortFilter(allGenuineOrdered, sortSelect.value, costFilterSelect.value);
        reorderGridBySets(grid, displaySets);
        // Cost filter may have excluded cards already appended above —
        // remove any DOM nodes for sets that didn't make this render's cut.
        Array.from(grid.children).forEach(node => {
          if(node.dataset?.setId && !displaySets.some(s => s.id === node.dataset.setId)) node.remove();
        });
        if (!displaySets.length) {
          grid.innerHTML = '<div class="hint" style="grid-column:1/-1;text-align:center;padding:20px 8px;">No Japanese sets match this cost filter.</div>';
        }
        return; // cards already appended progressively above — skip the generic loop below
      }

      grid.innerHTML = '';
      if (!displaySets.length) {
        grid.innerHTML = '<div class="hint" style="grid-column:1/-1;text-align:center;padding:20px 8px;">No Japanese sets with real Japanese card art available right now — check back later.</div>';
        return;
      }
    } else {
      grid.innerHTML = '';
      if (activeHomeTab === 'pkmn_en') Prewarm.start(displaySets);
    }

    const CONCURRENCY = 5;
    const tasks = displaySets.map(s => () => resolveAndAppendSetCard(s, myGen, grid));

    let next = 0;
    async function lane() {
      while (next < tasks.length) {
        const i = next++;
        await tasks[i]();
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, lane));
    if (myGen === homeRenderGen) reorderGridBySets(grid, displaySets);

  } catch(e) {
    if (myGen !== homeRenderGen) return;
    console.error('renderHome failed for tab', activeHomeTab, ':', e);
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
      ${myPackTickets[`${ACTIVE_GAME}:${setMeta.id}`] > 0 ? `<div class="pack-ticket-banner">🎟️ You have ${myPackTickets[`${ACTIVE_GAME}:${setMeta.id}`]} free pack ticket${myPackTickets[`${ACTIVE_GAME}:${setMeta.id}`] > 1 ? 's' : ''} for this set — your next open${myPackTickets[`${ACTIVE_GAME}:${setMeta.id}`] > 1 ? 's use them' : ' uses one'} automatically, no charge</div>` : ''}
      
      <div style="display:flex; gap:8px; width:100%;">
        <button class="btn btn-primary" id="open-pack-btn" style="flex:1;">${isAdminUser() ? 'Open Packs (Admin)' : `Open 1 Pack — ${dynamicCost} cr`}</button>
        <button class="btn btn-secondary" id="view-all-cards-btn" style="flex:0 0 auto; padding:0 16px;">View All Cards</button>
      </div>

      <div style="width:100%; margin:8px 0 16px; background:var(--panel); border:1px solid var(--edge); border-radius:12px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:14px; font-weight:bold;">
          <span>Quantity: <span id="qty-display" style="color:var(--cyan);">1</span> Pack</span>
          <span id="cost-display" style="color:var(--gold);">${dynamicCost} cr</span>
        </div>
        <input type="range" id="pack-qty-slider" min="1" max="${maxAffordable}" value="1" style="width:100%; accent-color:var(--cyan); cursor:pointer;" />
      </div>
      <div class="odds-box">
        <div class="row"><span>Structure</span><b>4 common · 3 uncommon · 1 reverse holo · 2 hit slots</b></div>
        <div class="row"><span>Hit-slot odds</span><b>modeled on SV-era community data</b></div>
        <div class="row"><span>God pack chance</span><b>1 in 600</b></div>
      </div>
      ${renderAffiliateButtons(`${setMeta.name} booster box`, 'sealed')}
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
  $('#view-all-cards-btn', wrap).addEventListener('click', () => render('pack_contents', { set: setMeta }));
  
  if(setMeta.images.logo){
    ImgCache.get(setMeta.images.logo).then(src => {
      const heroLogo = $('#hero-logo');
      if(heroLogo && src) heroLogo.src = src; 
      const fal = $('#pack-art-logo', wrap);
      if(fal && src) fal.src = src;
    });
  }

  try{
    // Cards and pack-art candidates are independent lookups — they used to
    // run one after another (full card fetch, THEN art resolution), which
    // meant art couldn't even start resolving until the card fetch
    // finished. Kicking both off together shaves that wait, especially
    // noticeable on a cold cache where neither has anything cached yet.
    const [cards, rawUrls] = await Promise.all([
      getCardsForSet(setMeta.id),
      Prewarm.resolvePackArtUrls(setMeta)
    ]);
    setDetailCardsCache = cards; setDetailCardsCacheSetId = setMeta.id;
    
    const gallery = $('#pack-gallery', wrap);

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
        const isOnePiece = setMeta.series === 'One Piece';
        const pa = el('div', 'pack-art is-fallback active');
        const fallbackGradient = isOnePiece ? 'linear-gradient(135deg, #7a1620, #1a0404)' : 'linear-gradient(135deg, #1e293b, #0f172a)';
        const textColor = isOnePiece ? 'rgba(255,255,255,0.85)' : 'var(--cyan)';
        pa.innerHTML = `<div class="pack-art-bg" style="background: ${fallbackGradient}; display:flex; align-items:center; justify-content:center; text-align:center; padding:12px; font-weight:bold; color:${textColor};">${setMeta.name}</div><div class="pack-crimp top fallback-only"></div><div class="pack-crimp bottom fallback-only"></div>`;
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
  if(!isAdminUser() && currentCredits() < totalCost){
    // Local profile.credits can be stale — a daily/monthly bonus claim
    // still in flight from page load (see the claim_daily_credits /
    // claim_monthly_credits calls in loadProfile, which are
    // fire-and-forget and can still be pending if the user taps "Open
    // Pack" fast), a purchase completing on another tab/device, a sold
    // card, etc. Guests have no server ledger to fall out of sync with
    // (their credits ARE the local copy), so only real accounts get this
    // extra round trip — and only when the local number already looks
    // insufficient, so it costs nothing in the common case.
    if(!guestMode && session){
      const { data: fresh } = await sb.from('profiles').select('credits').eq('id', session.user.id).single();
      if(fresh && fresh.credits != null){
        profile.credits = fresh.credits;
        const creditCountEl = $('#credit-count');
        if(creditCountEl && !isAdminUser()) creditCountEl.textContent = fresh.credits;
      }
    }
    if(currentCredits() < totalCost) return openGetCreditsModal(true);
  }
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
      // Admin gets unlimited pack openings for free — enforced again
      // server-side inside open_pack (it reads is_admin from profiles
      // itself), this local check just decides which UI copy to show.
    } else if(guestMode){
      const gs = getGuestState(); 
      gs.credits = (Number(gs.credits) || CONFIG.ECONOMY.GUEST_CREDITS) - totalCost; 
      gs.usedFreePack = true;
      setGuestState(gs); 
      const creditCountEl = $('#credit-count');
      if(creditCountEl) creditCountEl.textContent = gs.credits;
    }
    // Logged-in, non-guest: payment now happens inside open_pack itself
    // (see below) rather than a separate spend_credits() call, so
    // there's no window between "paid" and "rolled" for a client to
    // exploit.

    let openedPacks = [];
    let lastOpeningId = null;

    if(guestMode){
      // No server account exists for a guest to write to — packs are
      // rolled locally same as always. This never touches shared
      // credits or the database, so there's nothing to cheat here.
      const cardsForPack = setMeta.id.startsWith('jp-') ? filterToGenuineArt(cards) : cards;
      for(let i=0; i<qty; i++) openedPacks.push(generatePack(cardsForPack));
    } else {
      // Real account: the server rolls the pack(s) AND charges for them
      // in one atomic call (see open_pack in Supabase) — the client
      // only ever renders what comes back, it never decides or reports
      // pack contents anymore.
      if(btn) btn.textContent = 'Opening…';
      let openPackCall = async () => sb.rpc('open_pack', {
        p_set_id: setMeta.id, p_game: ACTIVE_GAME, p_set_name: setMeta.name,
        p_pack_cost: packCost, p_qty: qty
      });
      let { data, error } = await openPackCall();
      if(error && String(error.message||'').startsWith('set_not_cached_yet')){
        // Server-side set_card_cache doesn't have this set yet — most
        // likely this device's own fire-and-forget warm (see
        // putSharedSetCache/putSharedSetCacheOnePiece) hadn't finished
        // writing by the time the tap landed, since it fired the moment
        // the set page opened, not before. No credits were taken (the
        // whole RPC is one transaction, so the deduction rolled back
        // with the exception) — just wait for the warm to actually land
        // server-side, then retry the exact same call once.
        if(btn) btn.textContent = 'Loading set data…';
        const ok = await ensureSetWarmed(setMeta.id, ACTIVE_GAME, cards);
        if(ok){
          if(btn) btn.textContent = 'Opening…';
          ({ data, error } = await openPackCall());
        }
      }
      if(error){
        if(String(error.message||'').includes('insufficient_credits')) return openGetCreditsModal(true);
        if(String(error.message||'').startsWith('set_not_cached_yet')){
          throw new Error("This set is still loading server-side — give it a few seconds and try again.");
        }
        throw error;
      }
      openedPacks = data.packs;
      lastOpeningId = data.opening_ids?.length ? data.opening_ids[data.opening_ids.length-1] : null;
      if(data.new_balance != null){
        if(profile) profile.credits = data.new_balance;
        const creditCountEl = $('#credit-count');
        if(creditCountEl) creditCountEl.textContent = isAdminUser() ? '∞' : data.new_balance;
      }
      if (data.tickets_used > 0) {
        toast(`Used ${data.tickets_used} free pack ticket${data.tickets_used > 1 ? 's' : ''} for this set!`);
        refreshPackTickets(); // updates the "you have N free tickets" banner next time this set page renders
      }
      syncAchievementsQuiet();
      track('pack_opened', { set_id: setMeta.id, game: ACTIVE_GAME, qty, total_cost: totalCost });

      // Tier progression happens server-side inside open_pack itself —
      // check here just to surface it as a moment, not to compute it.
      const tierRankOrder = { free:0, starter:1, plus:2, pro:3, elite:4, vip:5 };
      const tierBefore = profile?.premium_tier || 'free';
      sb.from('profiles').select('premium_tier').eq('id', session.user.id).single().then(({ data: freshProfile }) => {
        if (!freshProfile) return;
        const tierAfter = freshProfile.premium_tier || 'free';
        if ((tierRankOrder[tierAfter] || 0) > (tierRankOrder[tierBefore] || 0)) {
          if (profile) profile.premium_tier = tierAfter;
          const tierLabels = { starter:'Starter', plus:'Plus', pro:'Pro', elite:'Elite', vip:'VIP' };
          toast(`Tier up! You're now ${tierLabels[tierAfter] || tierAfter}`);
          if(document.getElementById('account-section') && profile) renderAccountArea(session.user, profile);
        }
      }).catch(()=>{});
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

    // Don't block the reveal on caching every card image — every place
    // that renders these (openRevealScreen, showBulkSummary) already
    // goes through ImgCache.sync(), which just hands back the raw URL
    // when nothing's cached yet and lets the <img> tag load it itself
    // (each has an onerror fallback). Waiting here for a full Promise.all
    // over every large+small image in the batch — the actual cause of
    // the "how long from tap to pack appearing" lag, especially at
    // qty>1 — bought us nothing but a warmed cache the reveal doesn't
    // need to see first. Kick it off in the background instead so the
    // pack-rip screen shows the moment the server call returns.
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
    
    Promise.all(urlsToPrefetch.map(url => ImgCache.get(url).catch(()=>null))).catch(()=>{});
    
    const allFlatCards = [];
    openedPacks.forEach(p => p.cards.forEach(c => allFlatCards.push(c)));

    // Captures the id of the LAST opening this call created — matters
    // only for qty===1 (single pack), the only case with exactly one
    // unambiguous "the pull" to link to. See showSummary's share button
    // — bulk opens share the user's whole collection instead.
    // (For guests, there's no server-side opening at all — lastOpeningId
    // just stays null, same as before.)
    persistToActiveCollection(allFlatCards);
    
    if(qty === 1) {
      openRevealScreen(setMeta, openedPacks[0], openedPacks[0].cards[0]?.card?.images?.large, lastOpeningId);
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

function openRevealScreen(setMeta, pack, bgUrl, openingId){
  const collection = getActiveCollectionCards();
  const screen = el('div','reveal-screen');
  let idx = 0; let bestTier = 0;
  screen.innerHTML = `
    <div class="reveal-header">
      <div class="reveal-progress" id="prog">Card 1 / ${pack.cards.length}<span class="pct" id="prog-pct">0%</span></div>
      <button class="close-x" id="close-reveal">✕</button>
    </div>
    <div class="stage"><div class="flipcard-wrap" id="flipcard-wrap">
      <div class="tier-badge" id="tier-badge"></div>
      <div class="flipcard" id="flipcard">
        <div class="face back"></div>
        <div class="face front"><img id="front-img" src="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%2394a3b8%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2214%22%3EImage Unavailable%3C/text%3E%3C/svg%3E'" alt=""/></div>
      </div>
    </div></div>
    <div class="card-name" id="card-name">&nbsp;</div>
    <div class="card-sub" id="card-sub">&nbsp;</div>
    <div id="buy-slot"></div>
    <div class="dots" id="dots"></div>
    <div class="reveal-progress-track"><div class="reveal-progress-fill" id="prog-fill"></div></div>
    <div class="reveal-nav" style="display:flex; gap:10px; justify-content:center; margin-top:10px;">
      <button class="btn btn-secondary" id="reveal-prev" style="flex:0 0 auto; padding:8px 18px;">‹ Prev</button>
      <button class="btn btn-secondary" id="reveal-next" style="flex:0 0 auto; padding:8px 18px;">Next ›</button>
    </div>
    <div class="tap-hint" id="tap-hint">Tap the card to flip it</div>
  `;
  const flashLayer = el('div','flash-layer'); document.body.appendChild(flashLayer);

  const intro = el('div','pack-intro');
  const isOnePiece = setMeta.series === 'One Piece';
  let authenticPackBg = setMeta.resolvedPackArt ? `url('${ImgCache.sync(setMeta.resolvedPackArt)}')` : '';
  // No real photographed pack art exists for One Piece yet (see
  // OWN_PACK_ART_ONEPIECE) — give it its own themed fallback rather than
  // silently reusing the navy Pokémon placeholder gradient below.
  const fallbackGradient = isOnePiece
    ? 'linear-gradient(135deg, #7a1620, #1a0404)'
    : 'linear-gradient(135deg, #1e293b, #0f172a)';
  const packBgStyle = authenticPackBg ? `background-image:${authenticPackBg}; background-size:100% 100%;` : `background:${fallbackGradient};`;

  intro.innerHTML = `
    <div class="pack-art idle-pulse ${setMeta.resolvedPackArt ? '' : 'is-fallback'}" id="rip-wrapper" style="margin:0; cursor:grab; touch-action:none;">
      <div class="pack-art-bg" style="${packBgStyle}">${!authenticPackBg && isOnePiece ? `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; text-align:center; padding:12px; font-weight:800; letter-spacing:2px; color:rgba(255,255,255,0.85); text-shadow:0 2px 6px rgba(0,0,0,0.6);">${setMeta.name}</div>` : ''}</div>
      <div class="pack-crimp top fallback-only"></div>
      <div class="pack-crimp bottom fallback-only"></div>
      <img class="pack-art-logo fallback-only" src="${ImgCache.sync(setMeta.images.logo)}" onerror="this.style.display='none'"/>
      <div class="pack-half top" id="pack-half-top" style="${packBgStyle}"></div>
      <div class="pack-half bottom" id="pack-half-bottom" style="${packBgStyle}"></div>
      <div class="tear-seam" id="tear-seam"></div>
      <div style="position:absolute; bottom:15px; width:100%; text-align:center; font-weight:bold; color:#fff; font-size:13px; text-shadow:0 2px 4px rgba(0,0,0,0.8);">👆 Swipe or Tap to Rip Open!</div>
    </div>
  `;

  document.body.appendChild(intro);

  const ripEl = intro.querySelector('#rip-wrapper');
  const halfTop = intro.querySelector('#pack-half-top');
  const halfBottom = intro.querySelector('#pack-half-bottom');
  const seam = intro.querySelector('#tear-seam');

  let dragging = false, startX = 0, startY = 0, progress = 0, ripTriggered = false;
  const MAX_DRAG = 120; // px of drag to fully complete the tear by hand

  // Live feedback while dragging, BEFORE release — a small peel/glow
  // that tracks finger position 1:1, so ripping the pack feels like an
  // actual physical tear instead of a single canned animation firing on
  // release. This is the "juicy" part TCG Pocket's rip has that a fixed
  // CSS animation alone can't give you: it responds to you mid-gesture.
  function setTearProgress(p){
    progress = Math.max(0, Math.min(1, p));
    const shiftPx = progress * 20;
    halfTop.style.transform = `translateY(${-shiftPx}px) rotate(${-progress*4}deg)`;
    halfBottom.style.transform = `translateY(${shiftPx}px) rotate(${progress*3}deg)`;
    seam.style.opacity = String(progress * 0.9);
  }

  function finishRip(wasQuickTap){
    if(ripTriggered) return; ripTriggered = true;
    ripEl.classList.remove('idle-pulse');
    SFX.tear();
    vibrate(wasQuickTap ? [15,30,15] : [10,20,10,20,40]);
    halfTop.classList.add('fly-top');
    halfBottom.classList.add('fly-bottom');
    seam.style.opacity = '1';
    burstSparks(45, ['#ffffff','#4de8e0','#f0b94d'], innerHeight*0.42);
    ripEl.style.animation = 'packrip 0.4s ease-out forwards';
    setTimeout(()=>{
      intro.remove(); document.body.appendChild(screen); boot();
    }, 420);
  }

  function snapBack(){
    halfTop.style.transition = 'transform 0.3s cubic-bezier(.34,1.56,.64,1)';
    halfBottom.style.transition = 'transform 0.3s cubic-bezier(.34,1.56,.64,1)';
    setTearProgress(0);
    setTimeout(()=>{ halfTop.style.transition = ''; halfBottom.style.transition = ''; }, 320);
  }

  ripEl.addEventListener('pointerdown', (e) => {
    dragging = true; startX = e.clientX; startY = e.clientY;
    ripEl.classList.remove('idle-pulse');
    ripEl.setPointerCapture?.(e.pointerId);
  });
  ripEl.addEventListener('pointermove', (e) => {
    if(!dragging || ripTriggered) return;
    setTearProgress(Math.abs(e.clientY - startY) / MAX_DRAG);
    if(progress >= 1) finishRip(false);
  });
  ripEl.addEventListener('pointerup', (e) => {
    if(ripTriggered) return;
    dragging = false;
    const dy = Math.abs(e.clientY - startY), dx = Math.abs(e.clientX - startX);
    const wasQuickTap = dy < 8 && dx < 8;
    if(wasQuickTap || progress > 0.3) finishRip(wasQuickTap);
    else snapBack();
  });
  ripEl.addEventListener('pointercancel', () => { dragging = false; if(!ripTriggered) snapBack(); });

  function boot(){
    const dotsWrap = $('#dots', screen);
    pack.cards.forEach(()=> dotsWrap.appendChild(el('span')));
    $('#close-reveal', screen).addEventListener('click', ()=>{ screen.remove(); flashLayer.remove(); showSummary(setMeta, pack, openingId); });

    // Indices whose flip animation + SFX/confetti have already played.
    // Prev/Next between cards in here should feel instant — re-showing
    // a card you've already seen, not re-triggering its reveal.
    const revealed = new Set();
    // True from the moment a tap starts a card's charge-flip-payoff
    // sequence until that sequence lands — blocks a second tap mid-way
    // through (e.g. during the charge pause) from starting a duplicate
    // reveal on the same card.
    let revealing = false;

    function updateNav(){
      const prevBtn = $('#reveal-prev', screen);
      if(prevBtn) prevBtn.disabled = idx === 0;
    }

    function showCard(i, opts = {}){
      const alreadySeen = opts.instant && revealed.has(i);
      const p = pack.cards[i]; const tier = classify(p.card.rarity);
      bestTier = Math.max(bestTier, tier.id);
      $('#prog', screen).textContent = `Card ${i+1} / ${pack.cards.length}`;
      const progPct = el('span','pct'); progPct.id='prog-pct'; progPct.textContent = `${Math.round((i/pack.cards.length)*100)}%`;
      $('#prog', screen).appendChild(progPct);
      const frontSrc = p.card.images.large || p.card.images.small;

      // Rarity badge is intentionally NOT set here. Setting it this early
      // (before the flip/charge animation plays) meant it was visible the
      // whole time a card was on screen, including before the reveal
      // itself — spoiling the pull, and reading as "stale" since it never
      // disappeared between cards. It's cleared here on every nav/entry
      // and only populated once the card is actually shown (immediately
      // below for an already-seen card, or in revealCurrent()'s payoff
      // step for a fresh reveal).
      const badge = $('#tier-badge', screen); badge.textContent = ''; badge.style.background = 'transparent';
      badge.classList.remove('pop');
      if(!collection[p.card.id]){
        const nb = el('div','new-badge','NEW'); $('.face.front', screen).appendChild(nb);
      } else { $('.face.front .new-badge', screen)?.remove(); }
      $('#buy-slot', screen).innerHTML = '';
      const flip = $('#flipcard', screen);
      // Lets .face.back pick a per-game look via CSS (see styles.css) —
      // without this every game shared the same hardcoded card-back image.
      flip.dataset.game = p.card.game || 'pokemon';
      // Clear any per-reveal effect classes from whichever card was
      // showing before — none of these should carry over onto this one.
      flip.classList.remove('legendary-flip', 'tier-hi', 'charging');
      const faceFront = $('.face.front', screen);
      faceFront.classList.remove('shimmer', 'legendary-shimmer');
      const nameEl = $('#card-name', screen), subEl = $('#card-sub', screen);
      nameEl.classList.remove('legend-text', 'pop');
      subEl.classList.remove('pop');
      if(!guestMode && profile?.is_premium) flip.classList.add(isAdminUser() ? 'vip-fx' : 'premium-fx');

      if(alreadySeen){
        // Jumping back (or forward again) to a card already revealed —
        // show it fully flipped immediately, no animation, no SFX/
        // confetti replay. Reviewing a pull shouldn't re-trigger the
        // "moment" of pulling it. The shimmer itself is a static visual
        // property of the card (holo-and-up cards shimmer), so that
        // part is restored — it's the one-time flip/SFX/particles that
        // don't replay.
        //
        // Genuinely instant this time: the transition is switched off
        // for this one mutation. Previously .flipped was added the same
        // way here as during a real reveal, so it silently replayed the
        // full .55s/1.15s CSS flip on every Prev/Next through cards
        // you'd already seen — that's the extra lag when paging back
        // through a pack.
        flip.style.transition = 'none';
        $('#front-img', screen).src = ImgCache.sync(frontSrc);
        flip.classList.add('flipped'); flip.dataset.done = '1';
        if(tier.id === 8){ faceFront.classList.add('legendary-shimmer'); nameEl.classList.add('legend-text'); }
        else if(tier.id >= 2){ faceFront.classList.add('shimmer'); }
        nameEl.textContent = p.card.name;
        subEl.textContent = `${p.card.rarity || 'Common'}${p.foil ? ' · Foil' : ''} — ${p.card.set?.name || setMeta.name}`;
        badge.textContent = tier.label; badge.style.background = tier.color;
        $('#tap-hint', screen).textContent = i < pack.cards.length-1 ? 'Tap to reveal the next card' : 'Tap to see your full pack';
        // Force the transition:none to actually apply before restoring
        // the real transition, so the *next* (real, animated) flip
        // isn't accidentally instant too.
        void flip.offsetHeight;
        requestAnimationFrame(()=>{ flip.style.transition = ''; });
      } else {
        flip.style.transition = '';
        flip.classList.remove('flipped'); flip.dataset.done = '0';
        nameEl.innerHTML = '&nbsp;';
        subEl.innerHTML = '&nbsp;';
        $('#tap-hint', screen).textContent = 'Tap the card to flip it';
        // Deliberately NOT touching #front-img here. It still shows
        // whichever card was revealed before, while this card flips
        // back to its card-back — that's correct, nothing new to hide
        // yet. The old code swapped #front-img to *this* (upcoming)
        // card's art right here, before the flip-back animation even
        // started. backface-visibility only hides the front face for
        // the second half of that rotation, so for the first half the
        // front face — now showing the next card — was still the
        // visible one. That's the "can see the next card" bug. Instead,
        // just warm the cache silently (no loading spinner) so the art
        // is ready; the actual swap happens in revealCurrent(), right
        // as the forward flip begins, when the front face is
        // guaranteed to still be hidden.
        ImgCache.get(frontSrc, true).catch(()=>{});
      }
      updateNav();
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

    // The actual flip-and-reveal for the FIRST time a card is seen.
    // Three stages instead of one flat "flip, then show name": a brief
    // charge/anticipation on the card back (longer for rarer pulls —
    // the pause itself is a signal), the flip, then the payoff — where
    // tier determines how far things go, ending in the single Hyper/
    // Secret Rare tier getting a completely different, non-confetti
    // treatment (god-rays, vignette, rainbow foil shimmer, a banner)
    // rather than a bigger version of the same particle burst everyone
    // else gets. Extracted out of the click handler so the Next button
    // triggers the identical sequence, not a second slightly-different
    // copy of it.
    function revealCurrent(){
      if(revealing) return; // already mid charge-flip-payoff sequence — ignore extra taps until it lands
      revealing = true;
      const flip = $('#flipcard', screen);
      const cardObj = pack.cards[idx].card;
      const tier = classify(cardObj.rarity);
      const isLegendary = tier.id === 8; // Hyper/Secret Rare — the one bespoke, confetti-free effect
      const isChase = tier.id === 7;      // Special Illustration Rare — big, but stays in the confetti family

      flip.classList.add('charging');
      if(isLegendary || isChase) flip.classList.add('tier-hi');
      SFX.flip();
      const chargeMs = isLegendary ? 650 : isChase ? 420 : 260;

      setTimeout(()=>{
        flip.classList.remove('charging');
        if(isLegendary) flip.classList.add('legendary-flip');
        // Swap in this card's art right as the forward flip starts. At
        // this instant the front face is still fully hidden (its net
        // rotation only crosses into "visible" once the flip is more
        // than halfway done), so there's no frame where this could leak
        // early — unlike setting it back in showCard(), which is what
        // used to cause the peek-through.
        $('#front-img', screen).src = ImgCache.sync(cardObj.images.large || cardObj.images.small);
        flip.classList.add('flipped'); flip.dataset.done = '1';
        revealed.add(idx);
        markDot(idx, tier.id);

        const flipMs = isLegendary ? 1150 : 550; // matches .legendary-flip's own transition length
        setTimeout(()=>{
          const nameEl = $('#card-name', screen), subEl = $('#card-sub', screen), badge = $('#tier-badge', screen);
          const faceFront = $('.face.front', screen);
          nameEl.textContent = cardObj.name;
          subEl.textContent = `${cardObj.rarity || 'Common'}${pack.cards[idx].foil ? ' · Foil' : ''} — ${cardObj.set?.name || setMeta.name}`;
          badge.textContent = tier.label; badge.style.background = tier.color;
          nameEl.classList.add('pop'); subEl.classList.add('pop'); badge.classList.add('pop');
          faceFront.classList.remove('shimmer', 'legendary-shimmer');

          if(isLegendary){
            nameEl.classList.add('legend-text');
            faceFront.classList.add('legendary-shimmer');
            SFX.chase(); vibrate([40,80,40,80,40,120,200]);
            burstSparks(70, ['#ffe9b8','#ff9ecf','#94ffd6','#94c5ff'], innerHeight*0.4);
            screen.classList.add('shake'); setTimeout(()=>screen.classList.remove('shake'), 600);
            flashLayer.classList.add('legendary','go');
            setTimeout(()=>{ flashLayer.classList.remove('go'); flashLayer.classList.remove('legendary'); }, 550);

            const dim = el('div','legend-dim'); document.body.appendChild(dim);
            requestAnimationFrame(()=>dim.classList.add('go'));
            setTimeout(()=>dim.classList.remove('go'), 1400);
            setTimeout(()=>dim.remove(), 2000);

            const rays = el('div','godray-layer'); document.body.appendChild(rays);
            requestAnimationFrame(()=>rays.classList.add('go'));
            setTimeout(()=>rays.remove(), 1500);

            const banner = el('div','legend-banner','★ Hyper Rare Pull ★'); document.body.appendChild(banner);
            requestAnimationFrame(()=>banner.classList.add('go'));
            setTimeout(()=>banner.remove(), 1900);
          }
          else if(isChase){
            faceFront.classList.add('shimmer');
            SFX.chase(); vibrate([30,60,30,60,80]); burstConfetti(90);
            screen.classList.add('shake'); setTimeout(()=>screen.classList.remove('shake'), 500);
            flashLayer.classList.add('go'); setTimeout(()=>flashLayer.classList.remove('go'), 500);
          }
          else if(tier.id>=4){ faceFront.classList.add('shimmer'); SFX.hit(); vibrate([20,40,20]); burstConfetti(45); }
          else if(tier.id>=2){ faceFront.classList.add('shimmer'); SFX.holo(); vibrate(15); burstConfetti(tier.id===3?18:10); }
          else if(tier.id===1){ SFX.uncommon(); }
          else SFX.common();

          // The reveal itself, right as a legendary/chase payoff lands,
          // is the single highest-leverage moment to offer a share —
          // more so than waiting for the end-of-pack summary, since
          // this is the actual peak of the "juice." Reuses the same
          // canShare gating as showSummary() (needs a persisted,
          // logged-in opening to link back to).
          if((isLegendary || isChase) && openingId && !guestMode && session){
            const buySlot = $('#buy-slot', screen);
            if(buySlot){
              buySlot.innerHTML = `<button class="btn btn-primary" id="reveal-share-flex" style="width:100%; margin-top:14px;">📸 Share this pull</button>`;
              $('#reveal-share-flex', buySlot).addEventListener('click', (e) => {
                e.stopPropagation();
                e.target.disabled = true; const orig = e.target.textContent; e.target.textContent = 'Generating…';
                shareFlexImage(openingId, cardObj, setMeta).finally(() => { e.target.disabled = false; e.target.textContent = orig; });
              });
            }
          }

          flip.classList.remove('tier-hi');
          revealing = false;
        }, flipMs - 30); // land the payoff right as the flip visually settles, not after an extra beat
        $('#tap-hint', screen).textContent = idx < pack.cards.length-1 ? 'Tap to reveal the next card' : 'Tap to see your full pack';
      }, chargeMs);
    }

    // Shared by tapping the card AND the Next button: if the current
    // card hasn't been flipped yet, flip it (first reveal); if it has,
    // advance — instantly if the next card was already seen (Prev'd
    // back past it earlier), otherwise into a fresh reveal.
    function goNext(){
      if(revealing) return; // mid charge/flip/payoff on the current card — let it land first
      const flip = $('#flipcard', screen);
      if(flip.dataset.done !== '1'){ revealCurrent(); return; }
      if(idx >= pack.cards.length - 1){ screen.remove(); flashLayer.remove(); showSummary(setMeta, pack, openingId); return; }
      idx++;
      // Straight into showCard either way now — no artificial delay
      // before an unseen card starts flipping back. The CSS transition
      // (.55s/1.15s) already provides pacing on its own; the old extra
      // 180ms setTimeout on top of that was just added lag between
      // tapping Next and anything visibly happening.
      showCard(idx, { instant: revealed.has(idx) });
    }
    function goPrev(){
      if(revealing) return;
      if(idx === 0) return;
      idx--;
      showCard(idx, { instant: true }); // anything at a lower index has necessarily already been revealed
    }

    $('#flipcard', screen).addEventListener('click', goNext);
    $('#reveal-next', screen).addEventListener('click', goNext);
    $('#reveal-prev', screen).addEventListener('click', goPrev);

    // Swipe-to-navigate — before this, paging through a pack was tap/
    // click-only (see the two listeners above), which meant "flipping
    // through cards" always cost a deliberate tap-then-wait per card even
    // for cards you'd already seen and just wanted to flick past. A
    // left/right drag on the card itself now drives Next/Prev directly,
    // with the card following your finger for real-time feedback and
    // snapping back if you don't drag past the threshold — the gesture a
    // stack-of-cards interaction should have had from the start. Purely
    // additive: tap-to-reveal and the Prev/Next buttons above are
    // untouched, this only adds a second way to trigger the same
    // goNext/goPrev functions.
    (function initSwipeNav(){
      const wrap = $('#flipcard-wrap', screen);
      const flip = $('#flipcard', screen);
      const SWIPE_THRESHOLD = 60; // px — past this on release, treat as an intentional swipe
      let dragging = false, startX = 0, dx = 0, moved = false;

      wrap.addEventListener('pointerdown', (e) => {
        if(revealing) return; // don't fight the charge/flip/payoff sequence
        dragging = true; moved = false; startX = e.clientX; dx = 0;
        wrap.setPointerCapture(e.pointerId);
        flip.style.transition = 'none';
      });
      wrap.addEventListener('pointermove', (e) => {
        if(!dragging) return;
        dx = e.clientX - startX;
        if(Math.abs(dx) > 4) moved = true;
        // Follow the finger with a bit of rotation for weight — clamped
        // so a long drag doesn't fling the card off-axis.
        const clampedDx = Math.max(-160, Math.min(160, dx));
        wrap.style.transform = `translateX(${clampedDx}px) rotate(${clampedDx / 18}deg)`;
      });
      function endDrag(commit){
        if(!dragging) return;
        dragging = false;
        flip.style.transition = '';
        wrap.style.transition = 'transform 0.25s cubic-bezier(.2,.8,.2,1)';
        wrap.style.transform = '';
        setTimeout(()=>{ wrap.style.transition = ''; }, 260);
        if(commit && moved){
          if(dx <= -SWIPE_THRESHOLD) goNext();
          else if(dx >= SWIPE_THRESHOLD && idx > 0) goPrev();
        }
        dx = 0; moved = false;
      }
      wrap.addEventListener('pointerup', () => endDrag(true));
      wrap.addEventListener('pointercancel', () => endDrag(false));
      wrap.addEventListener('pointerleave', () => { if(dragging) endDrag(true); });

      // The wrap's own click handler on #flipcard (bound above) already
      // fires goNext() on a plain tap. A drag that crossed the "moved"
      // threshold shouldn't ALSO fire that click's goNext — capture the
      // click in this scope and swallow it once, right after a real drag.
      let suppressNextClick = false;
      wrap.addEventListener('pointerup', () => { if(moved) suppressNextClick = true; }, true);
      flip.addEventListener('click', (e) => {
        if(suppressNextClick){ suppressNextClick = false; e.stopImmediatePropagation(); }
      }, true);
    })();
  }
}

// Builds a link to this app with the given query params — used by both
// share functions below so the URL format only lives in one place.
//
// SETUP REQUIRED (one-time, in the Supabase SQL editor — this is a new
// RPC, not something already in the schema): sharePull() below fetches
// a single opening by id via get_shared_opening(), which needs to work
// for a visitor who may not be logged in at all (someone clicking a
// share link cold) — SECURITY DEFINER, same pattern as the existing
// get_user_collection/search_card_owners RPCs already used elsewhere in
// this file, rather than relying on the raw openings table's own RLS
// (which may or may not permit anon reads — this sidesteps that
// question entirely). Assumes `openings` has a uuid primary key column
// named `id` — if yours is named differently, adjust the SQL below to
// match. Safe against enumeration: a UUID is effectively unguessable,
// and this only ever returns the ONE row matching the id you already
// have, never a list.
//
//   create or replace function get_shared_opening(p_opening_id uuid)
//   returns table (
//     id uuid, user_id uuid, username text, set_name text,
//     cards jsonb, created_at timestamptz
//   )
//   language sql
//   security definer
//   set search_path = public
//   as $$
//     select o.id, o.user_id, p.username, o.set_name, o.cards, o.created_at
//     from openings o
//     join profiles p on p.id = o.user_id
//     where o.id = p_opening_id;
//   $$;
//   grant execute on function get_shared_opening(uuid) to anon, authenticated;
function shareLink(params) {
  const url = new URL(location.origin + location.pathname);
  Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  return url.toString();
}

// Native share sheet where available (this is a mobile web app, so this
// is the common case — gives the person the OS's own share targets
// instead of a custom picker this app would have to build and
// maintain), falling back to clipboard, and finally to just surfacing
// the link directly if even clipboard access fails.
async function shareOrCopy(shareData) {
  if (navigator.share) {
    try { await navigator.share(shareData); return; }
    catch (e) { if (e?.name === 'AbortError') return; /* person cancelled the share sheet — not an error */ }
  }
  try {
    await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    toast('Share link copied to clipboard');
  } catch (e) {
    toast('Could not copy — link: ' + shareData.url, 6000);
  }
}

async function sharePull(openingId, bestCard, setMeta) {
  const url = shareLink({ pull: openingId });
  await shareOrCopy({
    title: 'Chase Cards pull',
    text: `I just pulled ${bestCard.name} (${bestCard.rarity}) from a ${setMeta.name} pack! 🎉`,
    url,
  });
}

/* ============================================================
   Shareable "flex" pull image
   ------------------------------------------------------------
   The plain-text/link share above (sharePull) works, but a
   branded image is what actually gets posted/reposted on X,
   Instagram Stories, Discord, etc. — a link card in a feed gets
   scrolled past, a card graphic gets a screenshot-and-repost.
   Renders entirely client-side onto an off-DOM <canvas> (no
   server round trip) using whatever's already in ImgCache for
   that card's art, then hands the resulting PNG to the native
   share sheet (files array, Web Share API Level 2) where
   supported, falling back to a direct download + clipboard copy
   of the caption/link everywhere else (desktop browsers mainly).
   ============================================================ */
function _roundRectPath(ctx, x, y, w, h, r){
  if (typeof ctx.roundRect === 'function') { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  // Manual fallback for browsers without native roundRect (older Safari).
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function _wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = String(text).split(' ');
  let line = '';
  const lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else { line = test; }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  return lines.length;
}

async function generateFlexImage(cardObj, tier, setMeta){
  const W = 1080, H = 1350; // 4:5 — fills an IG/X feed card without letterboxing
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1220'); bg.addColorStop(1, '#1e293b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Soft tier-colored glow behind where the card art sits.
  const glow = ctx.createRadialGradient(W/2, H*0.4, 40, W/2, H*0.4, W*0.7);
  glow.addColorStop(0, `${tier.color}55`);
  glow.addColorStop(1, `${tier.color}00`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  const eyebrow = tier.id >= 7 ? '🔥 CHASE PULL 🔥' : tier.id >= 4 ? '✨ RARE PULL ✨' : 'PACK PULL';
  ctx.textAlign = 'center';
  ctx.font = '700 34px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = tier.color;
  ctx.fillText(eyebrow, W/2, 96);

  const artSrc = await ImgCache.get(cardObj.images?.large || cardObj.images?.small || cardObj.image, true);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = artSrc; });

  const cardW = 640, cardH = cardW * (img.height / img.width);
  const cardX = (W - cardW) / 2, cardY = 160;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
  _roundRectPath(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();

  ctx.save();
  _roundRectPath(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.clip();
  ctx.drawImage(img, cardX, cardY, cardW, cardH);
  ctx.restore();

  ctx.save();
  _roundRectPath(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.lineWidth = 6; ctx.strokeStyle = tier.color; ctx.stroke();
  ctx.restore();

  const textTop = cardY + cardH + 74;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 54px system-ui, -apple-system, sans-serif';
  _wrapText(ctx, cardObj.name, W/2, textTop, W - 140, 62);

  ctx.font = '600 30px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${cardObj.rarity || 'Common'} · ${setMeta?.name || cardObj.set?.name || ''}`, W/2, textTop + 76);

  ctx.font = '700 32px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText('Chase Cards', W/2, H - 70);
  ctx.font = '400 22px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(location.host || 'chasecards.app', W/2, H - 38);

  return await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
}

async function shareFlexImage(openingId, cardObj, setMeta){
  const tier = classify(cardObj.rarity);
  try{
    const blob = await generateFlexImage(cardObj, tier, setMeta);
    if(!blob) throw new Error('no blob');
    const link = openingId ? shareLink({ pull: openingId }) : location.origin + location.pathname;
    const text = `I just pulled ${cardObj.name} (${cardObj.rarity})! 🔥`;
    const file = new File([blob], 'chase-cards-pull.png', { type: 'image/png' });

    if(navigator.canShare && navigator.canShare({ files: [file] })){
      await navigator.share({ files: [file], title: 'Chase Cards pull', text: `${text} ${link}` });
      return;
    }
    // Most desktop browsers (and iOS Safari outside certain contexts)
    // can't share files via the Web Share API — download the image and
    // copy the caption+link instead, so posting is still just paste +
    // attach rather than a dead end.
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl; a.download = 'chase-cards-pull.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(dlUrl), 4000);
    try{ await navigator.clipboard.writeText(`${text} ${link}`); toast('Image saved — caption & link copied. Ready to post!', 3500); }
    catch(e){ toast(`Image saved — caption: "${text}"`, 4500); }
  }catch(e){
    console.warn('Flex image generation failed, falling back to text share', e);
    await sharePull(openingId, cardObj, setMeta); // link-only fallback — still lets them share something
  }
}

async function shareCollection(topCard, packCount) {
  const url = shareLink({ u: session.user.id, un: profile?.username || '' });
  const text = topCard
    ? `I just opened ${packCount} pack${packCount > 1 ? 's' : ''} and pulled ${topCard.name} (${topCard.rarity})! Check out my collection:`
    : `I just opened ${packCount} pack${packCount > 1 ? 's' : ''}! Check out my collection:`;
  await shareOrCopy({ title: 'My Chase Cards collection', text, url });
}

function showSummary(setMeta, pack, openingId){
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  const best = pack.cards.reduce((a,b)=> classify(b.card.rarity).id > classify(a.card.rarity).id ? b : a);
  // Sharing needs a persisted opening to link to, which only exists for
  // logged-in, non-guest opens (see beginOpen) — nothing to share for a
  // guest session since there's no durable record of the pull at all.
  const canShare = !!openingId && !guestMode && !!session;
  const bestTier = classify(best.card.rarity);
  const isHit = bestTier.id >= 4;
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>${pack.godPack ? '⚡ GOD PACK!' : 'Pack opened'}</h2>
    <div class="sub">Best pull: <b style="color:var(--text)">${best.card.name}</b> — ${best.card.rarity}</div>
    ${canShare && isHit ? `<button class="btn btn-primary" style="width:100%;margin-top:14px;" id="sum-share-flex">📸 Share this pull</button>` : ''}
    <div class="summary-grid" id="sum-grid"></div>
    ${canShare && !isHit ? `<button class="btn btn-secondary" style="width:100%;margin-top:14px;" id="sum-share-flex">📤 Share this pull</button>` : ''}
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="sum-close">Done</button>
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
  if (canShare) {
    $('#sum-share-flex', sheet).addEventListener('click', (e) => {
      e.target.disabled = true; const orig = e.target.textContent; e.target.textContent = 'Generating…';
      shareFlexImage(openingId, best.card, setMeta).finally(() => { e.target.disabled = false; e.target.textContent = orig; });
    });
  }
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

  // Same guest/session constraint as showSummary — there's no persisted
  // collection to link to for a guest session.
  const canShare = !guestMode && !!session;
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>🎉 Opened ${openedPacks.length} Packs!</h2>
    <div class="sub">All cards have been added to your collection. (${allCardsFlat.length} total cards)</div>
    <div style="font-weight:bold; color:var(--cyan); margin:12px 0 6px;">Top Hits & Holos (${topHits.length}):</div>
    <div class="summary-grid" id="bulk-sum-grid" style="max-height:40vh; overflow-y:auto; padding:4px;"></div>
    ${canShare ? `<button class="btn btn-secondary" style="width:100%;margin-top:14px;" id="bulk-sum-share">📤 Share my collection</button>` : ''}
    <button class="btn btn-primary" style="width:100%;margin-top:10px;" id="bulk-sum-close">Done</button>
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

  if (canShare) {
    $('#bulk-sum-share', sheet).addEventListener('click', () => shareCollection(topHits[0]?.card, openedPacks.length));
  }
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
  const totalCards = Object.values(coll).reduce((s,c)=>s+c.count,0);

  const wrap = el('div');
  wrap.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
      <div style="display:flex; gap:8px; align-items:center;">
        <select id="collection-select" style="padding:10px 12px; border-radius:10px; background:var(--panel); color:var(--text); border:1px solid var(--edge); font-family:var(--font-body); flex:1; min-width:0;">
          ${Object.keys(map).map(b => `<option value="${b}" ${b===activeName?'selected':''}>📁 ${b} (${Object.values(map[b]).reduce((s,c)=>s+c.count,0)})</option>`).join('')}
        </select>
        <div style="position:relative; flex-shrink:0;">
          <button class="btn btn-secondary" id="coll-menu-btn" style="padding:10px 14px; font-size:16px; line-height:1;">⋯</button>
          <div id="coll-menu" style="display:none; position:absolute; right:0; top:calc(100% + 4px); z-index:20; background:var(--panel); border:1px solid var(--edge); border-radius:10px; min-width:190px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.35);">
            <button class="coll-menu-item" id="new-collection-btn" style="display:block; width:100%; text-align:left; padding:10px 14px; font-size:13px; background:none; border:none; color:var(--text); cursor:pointer;">+ New Collection</button>
            <button class="coll-menu-item" id="rename-collection-btn" style="display:block; width:100%; text-align:left; padding:10px 14px; font-size:13px; background:none; border:none; color:var(--text); cursor:pointer;">✏️ Rename</button>
            <button class="coll-menu-item" id="export-coll-btn" style="display:block; width:100%; text-align:left; padding:10px 14px; font-size:13px; background:none; border:none; color:var(--text); cursor:pointer;">💾 Export</button>
            <label class="coll-menu-item" style="display:block; width:100%; text-align:left; padding:10px 14px; font-size:13px; color:var(--text); cursor:pointer; margin:0;">📂 Import<input type="file" id="import-coll-file" accept=".json,.pkcard" style="display:none;"/></label>
            <button class="coll-menu-item" id="clear-coll-btn" style="display:block; width:100%; text-align:left; padding:10px 14px; font-size:13px; background:none; border:none; color:var(--gold); cursor:pointer;">🧹 Clear Cards</button>
            <button class="coll-menu-item" id="dust-commons-btn" style="display:block; width:100%; text-align:left; padding:10px 14px; font-size:13px; background:none; border:none; color:var(--text); cursor:pointer;">✨ Dust Commons</button>
            <button class="coll-menu-item" id="sync-cloud-btn" style="display:block; width:100%; text-align:left; padding:10px 14px; font-size:13px; background:none; border:none; color:var(--cyan); cursor:pointer;">☁️ Sync to Cloud</button>
            <button class="coll-menu-item" id="delete-collection-btn" style="display:block; width:100%; text-align:left; padding:10px 14px; font-size:13px; background:none; border:none; color:var(--danger); cursor:pointer;">🗑️ Delete Collection</button>
          </div>
        </div>
      </div>
      <button class="btn btn-secondary" id="open-checklist-btn" style="width:100%; padding:9px; font-size:12.5px;">📋 View Set Checklist (see missing cards)</button>
      ${keys.length ? `<div class="hint" style="font-size:11px; margin:0;">${totalCards} card${totalCards===1?'':'s'} · ${keys.length} unique — tap a card to view or sell it back</div>` : ''}
      ${keys.length ? `
      <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
        <input type="text" id="coll-search-input" placeholder="Search by card or Pokémon name..." class="auth-form" style="flex:1; min-width:0; padding:10px 12px;" />
        <select id="coll-sort-select" style="padding:10px 10px; border-radius:10px; background:var(--panel); color:var(--text); border:1px solid var(--edge); font-family:var(--font-body); flex-shrink:0;">
          <option value="rarity">Rarity (high→low)</option>
          <option value="name">Name (A→Z)</option>
          <option value="count">Quantity (high→low)</option>
        </select>
      </div>
      ` : ''}
    </div>

    ${!keys.length ? `<div class="empty-state">Collection "${activeName}" is empty — open your first pack to start collecting!</div>` : `<div class="collection-grid" id="coll-grid"></div><div class="hint" id="coll-empty-search" style="display:none; grid-column:1/-1; text-align:center; padding:20px 8px;">No cards match your search.</div>`}
  `;
  app.appendChild(wrap);

  const menu = $('#coll-menu', wrap);
  $('#coll-menu-btn', wrap).addEventListener('click', (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', () => { menu.style.display = 'none'; }, { once: true });

  $('#collection-select', wrap).addEventListener('change', (e) => {
    setActiveCollectionName(e.target.value);
    render('collection');
  });

  $('#new-collection-btn', wrap).addEventListener('click', () => {
    const bName = prompt('Enter a name for the new collection:');
    if(!bName || !bName.trim()) return;
    const name = bName.trim();
    if(map[name]) { toast('Collection already exists'); return; }
    map[name] = {};
    store.set(scopedKey('user_collections'), map);
    setActiveCollectionName(name);
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
    setActiveCollectionName(trimmed);
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

  $('#dust-commons-btn', wrap).addEventListener('click', () => openDustCommonsSheet(coll, activeName));

  $('#sync-cloud-btn', wrap).addEventListener('click', async () => {
    if(guestMode || !session){ toast('Log in to sync to the cloud'); return; }
    const btn = $('#sync-cloud-btn', wrap);
    btn.disabled = true; btn.textContent = 'Syncing…';
    try{
      const cards = Object.entries(coll).map(([id, c]) => ({ id, name: c.name, rarity: c.rarity, image: c.image, game: c.game, count: c.count }));
      if(!cards.length){ toast('Nothing to sync — this collection is empty'); return; }
      const { error } = await sb.rpc('set_collection_cards', { p_collection_name: activeName, p_cards: cards });
      if(error) throw error;
      toast(`Synced ${cards.length} card${cards.length===1?'':'s'} to the cloud`);
    } catch(e){
      toast('Sync failed — try again');
    } finally {
      btn.disabled = false; btn.textContent = '☁️ Sync to Cloud';
    }
  });

  $('#delete-collection-btn', wrap).addEventListener('click', () => {
    if(Object.keys(map).length <= 1) { toast('Cannot delete your last remaining collection'); return; }
    if(!confirm(`Are you sure you want to permanently delete collection "${activeName}" and all its cards?`)) return;
    delete map[activeName];
    store.set(scopedKey('user_collections'), map);
    setActiveCollectionName(Object.keys(map)[0]);
    render('collection');
    toast('Collection permanently deleted');
  });

  $('#open-checklist-btn', wrap).addEventListener('click', () => openSetChecklistPicker());

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
        setActiveCollectionName(uniqueName);
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
    const emptySearchMsg = $('#coll-empty-search', wrap);
    const searchInput = $('#coll-search-input', wrap);
    const sortSelect = $('#coll-sort-select', wrap);

    // Remembers the collector's last-used sort across visits to this tab
    // (search term intentionally does NOT persist — that's a one-off
    // filter, not a standing preference).
    const savedSort = store.get('coll_sort_pref', 'rarity');
    sortSelect.value = savedSort;

    function sortKeys(ids, sortMode){
      const sorted = [...ids];
      if(sortMode === 'name'){
        sorted.sort((a,b) => (coll[a].name || '').localeCompare(coll[b].name || ''));
      } else if(sortMode === 'count'){
        sorted.sort((a,b) => coll[b].count - coll[a].count || classifyForCard(coll[b]).id - classifyForCard(coll[a]).id);
      } else {
        sorted.sort((a,b) => classifyForCard(coll[b]).id - classifyForCard(coll[a]).id);
      }
      return sorted;
    }

    // Windowed rendering — a dedicated collector's vault can run into
    // the thousands of unique cards, and building one <img> + one
    // ImgCache call per card in a single pass is what makes the DOM
    // (and the grid's scroll perf) lag out on phones at that size.
    // Cards render in small batches instead, growing the grid only as
    // the collector actually scrolls toward the bottom (via a sentinel
    // + IntersectionObserver below), so the DOM only ever holds what's
    // been scrolled into view plus one lookahead batch — not the whole
    // collection at once.
    const GRID_BATCH_SIZE = 60;
    let orderedKeys = [];
    let renderedCount = 0;
    let gridObserver = null;
    const sentinel = el('div');
    sentinel.style.cssText = 'grid-column:1/-1; height:1px;';

    function appendCardItem(id){
      const c = coll[id]; const item = el('div','coll-item');
      item.innerHTML = `<img src="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/><span class="count">×${c.count}</span>`;
      // Fullscreen inspect is the one place per-card art is worth the
      // full-res fetch/cache — the grid tile itself only ever needs
      // the small thumbnail tier (see ImgCache.getThumb above).
      item.addEventListener('click', async ()=> showCardFullscreen(await ImgCache.get(c.image), { id, ...c }));
      grid.insertBefore(item, sentinel);
      ImgCache.getThumb(c.image).then(src => {
        const imgEl = item.querySelector('img');
        if(imgEl && src) imgEl.src = src;
      });
    }

    function renderNextBatch(){
      const nextIds = orderedKeys.slice(renderedCount, renderedCount + GRID_BATCH_SIZE);
      nextIds.forEach(appendCardItem);
      renderedCount += nextIds.length;
      if(renderedCount >= orderedKeys.length && gridObserver){ gridObserver.disconnect(); gridObserver = null; }
    }

    function drawGrid(){
      const query = searchInput.value.trim().toLowerCase();
      const sortMode = sortSelect.value;
      const filteredKeys = query
        ? keys.filter(id => (coll[id].name || '').toLowerCase().includes(query))
        : keys;
      orderedKeys = sortKeys(filteredKeys, sortMode);
      renderedCount = 0;

      if(gridObserver){ gridObserver.disconnect(); gridObserver = null; }
      grid.replaceChildren();
      emptySearchMsg.style.display = orderedKeys.length ? 'none' : 'block';
      if(!orderedKeys.length) return;

      grid.appendChild(sentinel);
      renderNextBatch();

      if(orderedKeys.length > GRID_BATCH_SIZE){
        if('IntersectionObserver' in window){
          gridObserver = new IntersectionObserver((entries)=>{
            if(entries.some(e => e.isIntersecting)) renderNextBatch();
          }, { rootMargin: '600px 0px' }); // starts loading the next batch well before the sentinel is actually on-screen, so scrolling stays smooth
          gridObserver.observe(sentinel);
        } else {
          // No IntersectionObserver support — render everything up
          // front rather than leaving cards permanently unreachable.
          while(renderedCount < orderedKeys.length) renderNextBatch();
        }
      }
    }

    let searchDebounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(drawGrid, 150);
    });
    sortSelect.addEventListener('change', () => {
      store.set('coll_sort_pref', sortSelect.value);
      drawGrid();
    });

    drawGrid();
  }
}

/* ============================================================
   Set Checklist — pick a set, see every card in it with owned
   vs. missing marked, cross-referenced against the ACTIVE
   collection only (same collection renderCollection() shows).
   MTG is excluded: its sets are still hardcoded placeholders
   with no real per-card data (see renderHome), so there's
   nothing real to check off yet.
   ============================================================ */
function openSetChecklistPicker(){
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });

  const pickerTabs = [
    { id: 'pkmn_en', label: 'Pokémon (EN)', game: 'pokemon' },
    { id: 'pkmn_jp', label: 'Pokémon (JP)', game: 'pokemon' },
    { id: 'onepiece', label: 'One Piece', game: 'onepiece' }
  ];
  let activeTab = pickerTabs[0];

  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>Set Checklist</h2>
    <div id="checklist-picker-tabs" style="display:flex; gap:8px; overflow-x:auto; margin:10px 0 12px; padding-bottom:4px;"></div>
    <input type="text" id="checklist-set-search" placeholder="Search sets..." class="auth-form" style="width:100%; margin-bottom:10px; padding:10px 12px;" />
    <div id="checklist-set-list" style="display:flex; flex-direction:column; gap:8px; max-height:50vh; overflow-y:auto;"><div class="hint">Loading sets…</div></div>
  `;

  const tabsWrap = $('#checklist-picker-tabs', sheet);
  const listWrap = $('#checklist-set-list', sheet);
  const searchInput = $('#checklist-set-search', sheet);
  let allSetsForTab = [];

  function renderTabButtons(){
    tabsWrap.replaceChildren();
    pickerTabs.forEach(t => {
      const btn = el('button', t.id === activeTab.id ? 'btn btn-primary' : 'btn btn-secondary');
      btn.textContent = t.label;
      btn.style.flexShrink = '0';
      btn.addEventListener('click', () => { activeTab = t; renderTabButtons(); loadSetsForTab(); });
      tabsWrap.appendChild(btn);
    });
  }

  function drawList(){
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query ? allSetsForTab.filter(s => s.name.toLowerCase().includes(query)) : allSetsForTab;
    listWrap.replaceChildren();
    if(!filtered.length){
      listWrap.innerHTML = '<div class="hint">No sets match your search.</div>';
      return;
    }
    filtered.forEach(s => {
      const row = el('div','refer-box');
      row.style.cssText = 'display:flex; align-items:center; cursor:pointer;';
      const year = s.releaseDate ? s.releaseDate.split(/[-/]/)[0] : '';
      row.innerHTML = `
        <div style="flex:1;">
          <div style="font-weight:bold; font-size:14px; margin-bottom:2px;">${s.name}</div>
          <div class="hint" style="color:var(--dim);">${s.total || '?'} cards${year ? ' · ' + year : ''}</div>
        </div>
        <span style="font-size:18px; color:var(--dim);">›</span>
      `;
      row.addEventListener('click', () => {
        overlay.remove();
        render('set_checklist', { set: { ...s, _game: activeTab.game } });
      });
      listWrap.appendChild(row);
    });
  }

  async function loadSetsForTab(){
    listWrap.innerHTML = '<div class="hint">Loading sets…</div>';
    try{
      setActiveGame(activeTab.game);
      const sets = await getSets();
      allSetsForTab = activeTab.id === 'pkmn_jp'
        ? sets.filter(s => s.id.startsWith('jp-'))
        : activeTab.id === 'pkmn_en'
          ? sets.filter(s => !s.id.startsWith('jp-'))
          : sets;
      drawList();
    } catch(e){
      listWrap.innerHTML = '<div class="hint" style="color:var(--danger)">Could not load sets — try again.</div>';
    }
  }

  searchInput.addEventListener('input', drawList);
  renderTabButtons();
  loadSetsForTab();
}

/* ============================================================
   Legal — Privacy Policy & Terms of Service
   ------------------------------------------------------------
   Rendered in-app (not a separate static page) so it works the
   same way everything else in this file does — no index.html
   changes needed. NOT LEGAL ADVICE: this is a reasonable,
   plain-language starting point tailored to what this specific
   app actually does (virtual currency with no cash value, guest
   mode stored only in localStorage, Supabase auth/db, the
   third-party APIs and affiliate networks configured above, and
   the fact that this uses Pokémon/One Piece TCG names & artwork
   as a fan project) — have an actual lawyer review before this
   is the only thing standing behind a live, public app,
   especially the trademark/fair-use and gambling-adjacent
   framing, both of which carry real risk if worded wrong.
   Fill in CONFIG.LEGAL below with your real contact + business
   details before relying on this.
   ============================================================ */
CONFIG.LEGAL = {
  CONTACT_EMAIL: '',       // e.g. 'support@chasecards.app' — shown as the contact method on both pages; falls back to a generic notice if left blank
  EFFECTIVE_DATE: 'August 28, 2026',
  JURISDICTION: '',        // e.g. 'the State of Michigan, USA' — fill in for the governing-law clause; left blank shows a placeholder prompting you to set it
};

function legalSection(title, bodyHtml){
  return `<div style="margin-top:20px;"><h3 style="font-size:15px; margin:0 0 8px;">${title}</h3><div class="hint" style="font-size:13px; line-height:1.6; color:var(--text);">${bodyHtml}</div></div>`;
}

function renderPrivacyPolicyHTML(){
  const contact = CONFIG.LEGAL.CONTACT_EMAIL
    ? `<a href="mailto:${CONFIG.LEGAL.CONTACT_EMAIL}" style="color:var(--cyan);">${CONFIG.LEGAL.CONTACT_EMAIL}</a>`
    : `the contact method listed in the app (set CONFIG.LEGAL.CONTACT_EMAIL to replace this placeholder)`;
  return `
    ${legalSection('Overview', `Chase Cards is a fan-made trading card pack-opening simulator. This policy explains what information the app collects, why, and the choices you have. It applies whether you use a guest session or a full account.`)}
    ${legalSection('Information we collect', `
      <b>If you create an account</b> — your email address (or Google account info if you sign in with Google), a username you choose, and gameplay data: your virtual credit balance, card collection, trade/duel history, referral code, and daily-streak activity.<br><br>
      <b>If you use guest mode</b> — nothing is sent to a server at all. Your collection, credits, and preferences are stored only in your browser's local storage on that device, and are lost if you clear your browser data or switch devices.<br><br>
      <b>Anonymous analytics</b> — a random device identifier (not tied to your name or email) plus basic event names (e.g. "pack opened," "trade completed") to understand how the app is used and improve it.
    `)}
    ${legalSection('How we use it', `To run your account (authentication, saving your collection, enabling trading/duels with other collectors), to prevent abuse of the referral/credit system, and to improve the app based on aggregate usage patterns. We do not use your data for targeted advertising, and we do not sell personal information.`)}
    ${legalSection('Cookies & local storage', `The app uses your browser's local storage to remember guest-mode data, your preferences (like sort order), and your login session. It does not use third-party advertising or tracking cookies. Affiliate links you click (see below) may set their own cookies once you leave this app — that's between you and that site.`)}
    ${legalSection('Third-party services', `
      This app relies on a few outside services to work:<br>
      • <b>Supabase</b> — authentication, database, and file storage.<br>
      • <b>Cloudflare</b> — edge caching for images and set data (no personal data involved).<br>
      • <b>Pokémon TCG API, TCGdex, and PokéWallet</b> — card data and artwork.<br>
      • <b>Affiliate networks</b> (eBay Partner Network, TCGplayer/Impact, GameStop/Rakuten, and/or Sovrn Commerce) — power the "Buy on..." links; clicking one sends you to that retailer's site under their own privacy policy.<br>
      Each of these has its own privacy practices, separate from this app's.
    `)}
    ${legalSection('Sharing your information', `We don't sell your personal data. Your username, public collection, and tier/badges may be visible to other users if you use trading, duels, or a public profile — that's the intended, opt-in social part of the app. We may disclose information if required by law.`)}
    ${legalSection('Data retention & deletion', `Account data is kept for as long as your account is active. You can request deletion of your account and associated data at any time by contacting ${contact}. Guest-mode data lives only in your browser and is deleted whenever you clear your browser's site data.`)}
    ${legalSection("Children's privacy", `This app is not directed at children under 13, and we don't knowingly collect personal information from anyone under 13. If you believe a child has provided personal information to us, contact ${contact} and we'll delete it.`)}
    ${legalSection('Security', `We use reasonable measures (including Supabase's built-in security features) to protect your information, but no method of transmission or storage is 100% secure, and we can't guarantee absolute security.`)}
    ${legalSection('Your choices', `You can play entirely in guest mode to avoid creating any server-side account. If you have an account, you can request access to, correction of, or deletion of your data by contacting ${contact}.`)}
    ${legalSection('Changes to this policy', `We may update this policy as the app changes. Material changes will be reflected by updating the "Effective date" below.`)}
    ${legalSection('Contact', `Questions about this policy? Reach out at ${contact}.`)}
    <div class="hint" style="margin-top:24px; font-size:11px; opacity:0.7;">Effective date: ${CONFIG.LEGAL.EFFECTIVE_DATE}</div>
  `;
}

function renderTermsOfServiceHTML(){
  const contact = CONFIG.LEGAL.CONTACT_EMAIL
    ? `<a href="mailto:${CONFIG.LEGAL.CONTACT_EMAIL}" style="color:var(--cyan);">${CONFIG.LEGAL.CONTACT_EMAIL}</a>`
    : `the contact method listed in the app (set CONFIG.LEGAL.CONTACT_EMAIL to replace this placeholder)`;
  const jurisdiction = CONFIG.LEGAL.JURISDICTION || '[set CONFIG.LEGAL.JURISDICTION to your governing jurisdiction]';
  return `
    ${legalSection('Acceptance of terms', `By using Chase Cards, you agree to these Terms of Service and our Privacy Policy. If you don't agree, please don't use the app.`)}
    ${legalSection('Eligibility', `You must be at least 13 years old to create an account. If you're under the age of majority where you live, you should have a parent or guardian's permission to use this app.`)}
    ${legalSection('Fan project — not affiliated with any card game publisher', `Chase Cards is an unofficial, fan-made simulator. Pokémon, One Piece, and all associated card names, artwork, and trademarks are the property of their respective owners (including Nintendo, Game Freak, Creatures Inc., The Pokémon Company, Bandai, and Shueisha, as applicable). This app is not produced, endorsed, sponsored, or approved by any of them. Card data and artwork are sourced from public/community APIs and used here for non-commercial, fan-entertainment purposes.`)}
    ${legalSection('Virtual currency — no real-world value', `"Credits" are a virtual, in-app currency with <b>no real-world monetary value</b>. Credits cannot be purchased with real money, cannot be redeemed, exchanged, or cashed out for real money or anything of real-world value, and cannot be transferred outside the app. This app does not sell randomized rewards for real money — nothing here is a lottery, loot box purchase, or gambling product.`)}
    ${legalSection('Accounts', `You're responsible for keeping your account credentials secure and for activity that happens under your account. We may suspend or terminate accounts that violate these terms, exploit bugs, or engage in fraud (including referral-bonus abuse).`)}
    ${legalSection('Acceptable use', `Don't cheat, exploit bugs for unintended advantage, harass other collectors in trading or duels, or attempt to reverse-engineer, scrape, or abuse the app's backend outside of normal use.`)}
    ${legalSection('Virtual items & trading', `Cards, packs, and credits exist only within the app and are not property in any legal sense — they may be adjusted, reset, or removed (e.g. to fix a bug or balance issue) at any time. Trades and duels between users are final once accepted; we don't arbitrate individual trade disputes beyond investigating suspected fraud or exploits.`)}
    ${legalSection('Affiliate links & tip jar', `Some "Buy on..." links in this app are affiliate links — we may earn a commission from qualifying purchases at no extra cost to you (see our Privacy Policy for which networks are involved). Any tip jar link is a voluntary, external donation and grants zero in-app benefit — it never affects your credits, packs, or account. Purchases you make on any third-party site are a transaction between you and that site; we're not responsible for them.`)}
    ${legalSection("This app's own content", `The app's original code, design, and branding (apart from third-party card data/artwork, which belongs to its respective owners as noted above) belong to its developer. Using the app doesn't grant you any rights to that underlying code or design.`)}
    ${legalSection('Disclaimers', `This app is provided "as is" and "as available," without warranties of any kind, express or implied. We don't guarantee the app will be uninterrupted, error-free, or that your data will never be lost — back up anything guest-mode related yourself, since it lives only in your browser.`)}
    ${legalSection('Limitation of liability', `To the fullest extent permitted by law, we aren't liable for any indirect, incidental, or consequential damages arising from your use of the app, including loss of virtual items or credits.`)}
    ${legalSection('Termination', `You can stop using the app at any time. We may suspend or terminate access for violations of these terms.`)}
    ${legalSection('Governing law', `These terms are governed by the laws of ${jurisdiction}, without regard to conflict-of-law principles.`)}
    ${legalSection('Changes to these terms', `We may update these terms as the app changes. Continued use after an update means you accept the revised terms.`)}
    ${legalSection('Contact', `Questions about these terms? Reach out at ${contact}.`)}
    <div class="hint" style="margin-top:24px; font-size:11px; opacity:0.7;">Effective date: ${CONFIG.LEGAL.EFFECTIVE_DATE}</div>
  `;
}

function renderLegalPage(kind){
  const isPrivacy = kind === 'privacy';
  const wrap = el('div');
  wrap.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; margin:22px 0 4px;">
      <button class="btn btn-secondary" id="legal-back-btn" style="padding:8px 12px; font-size:13px;">‹ Back</button>
      <div class="section-title" style="margin:0;">${isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</div>
    </div>
    <div style="display:flex; gap:8px; margin-bottom:10px;">
      <button class="btn ${isPrivacy ? 'btn-primary' : 'btn-secondary'}" id="legal-tab-privacy" style="flex:1; padding:8px; font-size:12px;">Privacy Policy</button>
      <button class="btn ${!isPrivacy ? 'btn-primary' : 'btn-secondary'}" id="legal-tab-terms" style="flex:1; padding:8px; font-size:12px;">Terms of Service</button>
    </div>
    <div class="account-card">${isPrivacy ? renderPrivacyPolicyHTML() : renderTermsOfServiceHTML()}</div>
  `;
  app.appendChild(wrap);
  $('#legal-back-btn', wrap).addEventListener('click', () => render('profile'));
  $('#legal-tab-privacy', wrap).addEventListener('click', () => render('privacy'));
  $('#legal-tab-terms', wrap).addEventListener('click', () => render('terms'));
}

async function renderSetChecklist(setMeta){
  const wrap = el('div');
  wrap.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; margin:22px 0 4px;">
      <button class="btn btn-secondary" id="checklist-back-btn" style="padding:8px 12px; font-size:13px;">‹ Back</button>
      <div class="section-title" style="margin:0;">${setMeta.name} Checklist</div>
    </div>
    <div class="hint" id="checklist-progress" style="margin-bottom:14px;">Loading…</div>
    <div class="collection-grid" id="checklist-grid"></div>
  `;
  app.appendChild(wrap);

  $('#checklist-back-btn', wrap).addEventListener('click', () => render('collection'));

  const grid = $('#checklist-grid', wrap);
  const progressEl = $('#checklist-progress', wrap);
  for(let i=0;i<8;i++){ const s = el('div','coll-item skeleton'); grid.appendChild(s); }

  try{
    setActiveGame(setMeta._game || 'pokemon');
    const rawCards = await getCardsForSet(setMeta.id);
    // JP sets: getCardsForSet() intentionally includes English-art
    // fallback cards in its pool (see getCardsForSetPokemon's
    // enByLocalId/pokeFallback tiers) so a set doesn't get dropped
    // entirely just because a few cards lack native JP art. The actual
    // pack-opening flow (renderSetDetail) already narrows that down to
    // genuine JP art via filterToGenuineArt before drawing — this
    // checklist was reading the raw unfiltered pool instead, so English
    // cards showed up in a "Japanese" set's checklist. Match pack-opening
    // behavior here too.
    const cards = setMeta.id.startsWith('jp-') ? filterToGenuineArt(rawCards) : rawCards;

    const map = getCollectionsMap();
    const activeName = getActiveCollectionName();
    const coll = map[activeName] || {};

    const ownedCount = cards.filter(c => coll[c.id] && coll[c.id].count > 0).length;
    progressEl.textContent = `${ownedCount} / ${cards.length} owned in "${activeName}"`;

    if(session?.user && cards.length > 0 && ownedCount === cards.length){
      sb.rpc('award_achievement', { p_key: 'set_complete' }).then(async () => {
        const completedBefore = Number(store.get(scopedKey('sets_completed_count')) || 0);
        // Only count each set once per collection toward "Collector", not every
        // repeat visit to an already-completed checklist.
        const completedSetsKey = scopedKey('completed_set_ids');
        const completedSetIds = new Set(store.get(completedSetsKey) || []);
        if(!completedSetIds.has(setMeta.id)){
          completedSetIds.add(setMeta.id);
          store.set(completedSetsKey, [...completedSetIds]);
          store.set(scopedKey('sets_completed_count'), completedBefore + 1);
          if(completedBefore + 1 >= 5) await sb.rpc('award_achievement', { p_key: 'collector' });
        }
        const { data } = await sb.from('achievements').select('achievement_key').eq('user_id', session.user.id);
        myAchievements = (data || []).map(r => r.achievement_key);
        if(document.getElementById('account-section') && profile) renderAccountArea(session.user, profile);
      }).catch(()=>{});
    }

    grid.replaceChildren();
    cards.forEach(c => {
      const owned = coll[c.id] && coll[c.id].count > 0;
      const item = el('div','coll-item');
      if(!owned) item.style.opacity = '0.35';
      item.innerHTML = owned
        ? `<img src="" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/><span class="count">×${coll[c.id].count}</span>`
        : `<div style="width:100%; aspect-ratio:5/7; background:var(--panel-2); border:1px dashed var(--edge); border-radius:8px; display:flex; align-items:center; justify-content:center; text-align:center; padding:6px; font-size:10.5px; color:var(--dim);">${c.name}</div>`;
      item.addEventListener('click', async ()=>{
        if(owned) showCardFullscreen(await ImgCache.get(coll[c.id].image), { id: c.id, ...coll[c.id] });
        else if(c.images?.small || c.images?.large) showMissingCardBuyPrompt(await ImgCache.get(c.images.large || c.images.small), c);
        else toast(`${c.name} — not yet in your collection`);
      });
      grid.appendChild(item);
      if(owned){
        ImgCache.get(coll[c.id].image).then(src => {
          const imgEl = item.querySelector('img');
          if(imgEl && src) imgEl.src = src;
        });
      }
    });
  } catch(e){
    grid.innerHTML = '';
    progressEl.textContent = "Couldn't load this set's card list — try again.";
  }
}

// Spoiler view: every card that CAN come out of this pack, full art,
// regardless of whether you own it — the opposite of renderSetChecklist
// above (which deliberately hides art for unowned cards so it can serve
// as a collection tracker). Reuses the same .collection-grid/.coll-item
// styling for visual consistency with the rest of the app.
async function renderPackContents(setMeta){
  const wrap = el('div');
  wrap.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; margin:22px 0 4px;">
      <button class="btn btn-secondary" id="contents-back-btn" style="padding:8px 12px; font-size:13px;">‹ Back</button>
      <div class="section-title" style="margin:0;">${setMeta.name} — All Cards</div>
    </div>
    <div class="hint" id="contents-progress" style="margin-bottom:14px;">Loading…</div>
    <div class="collection-grid" id="contents-grid"></div>
  `;
  app.appendChild(wrap);

  $('#contents-back-btn', wrap).addEventListener('click', () => render('set', { set: setMeta }));

  const grid = $('#contents-grid', wrap);
  const progressEl = $('#contents-progress', wrap);
  for(let i=0;i<10;i++){ const s = el('div','coll-item skeleton'); grid.appendChild(s); }

  try{
    setActiveGame(setMeta._game || 'pokemon');
    const rawCards = await getCardsForSet(setMeta.id);
    // Same fix as renderSetChecklist above: filter JP sets down to
    // genuine JP art so this "All Cards" spoiler view matches what an
    // actual pack from this set can pull, instead of showing the raw
    // pool (which includes English-art fallback cards).
    const cards = setMeta.id.startsWith('jp-') ? filterToGenuineArt(rawCards) : rawCards;
    progressEl.textContent = `${cards.length} card${cards.length===1?'':'s'} in ${setMeta.name}`;

    grid.replaceChildren();
    const placeholderSvg = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E";

    // Every card gets a real <img> immediately (unlike the checklist,
    // which withholds art for unowned cards on purpose) — src starts
    // blank/skeleton and is filled in as ImgCache resolves it below, so
    // cards that are already cached (e.g. just seen on the pack-art
    // screen or a previous visit) paint instantly and the rest fill in
    // as they resolve, instead of the whole grid blocking on the
    // slowest card.
    cards.forEach(c => {
      const item = el('div','coll-item');
      // Thumbnail uses the small image for the grid (fast — this is
      // what was making "View All Cards" feel slow: every card was
      // fetching/decoding its full-resolution `large` image just to
      // paint a tiny grid thumbnail). Fullscreen tap still resolves
      // the large version for a crisp zoomed-in view.
      const thumbUrl = c.images?.small || c.images?.large || '';
      const fullUrl = c.images?.large || c.images?.small || '';
      item.innerHTML = `<img src="" onerror="this.src='${placeholderSvg}'"/><span class="count" style="font-size:9.5px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</span>`;
      item.addEventListener('click', async ()=>{
        showCardFullscreen(await ImgCache.get(fullUrl), null);
      });
      grid.appendChild(item);
      if(thumbUrl){
        ImgCache.get(thumbUrl, true).then(src => {
          const imgEl = item.querySelector('img');
          if(imgEl && src) imgEl.src = src;
        });
      }
    });
  } catch(e){
    grid.innerHTML = '';
    progressEl.textContent = /zero cards/.test(e?.message || '')
      ? `This set has no cards available yet.`
      : `Couldn't load this set's card list — try again.`;
  }
}

/* ============================================================
   Trading Hub
   ============================================================ */
// Brief celebratory overlay shown right after a trade successfully
// resolves server-side (this fires AFTER respond_trade's RPC call
// succeeds — it's a reaction to a confirmed state change, not something
// that itself grants the swap). Reuses the zoomIn/slideup keyframes
// already defined in the stylesheet for showCardFullscreen, so no new
// CSS is needed. Resolves once the overlay is dismissed (tap or
// auto-dismiss) so callers can await it before refreshing the list.
function celebrateTradeComplete(gotCard, gaveCard){
  return new Promise(async (resolve) => {
    const overlay = el('div','overlay');
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '300';
    overlay.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:14px; animation: slideup 0.3s ease;">
        <div style="font-family:var(--font-display); font-weight:700; font-size:20px; color:var(--gold);">🔄 Trade Complete!</div>
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
            <img class="celebrate-got" style="width:110px; aspect-ratio:5/7; object-fit:cover; border-radius:12px; box-shadow:0 20px 40px rgba(0,0,0,0.6); animation: zoomIn 0.35s cubic-bezier(0.2,0.8,0.2,1);" onerror="this.style.opacity=0.3"/>
            <span class="hint" style="color:var(--cyan);">You got</span>
          </div>
          <span style="font-size:22px; color:var(--dim);">⇄</span>
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
            <img class="celebrate-gave" style="width:110px; aspect-ratio:5/7; object-fit:cover; border-radius:12px; box-shadow:0 20px 40px rgba(0,0,0,0.6); animation: zoomIn 0.35s cubic-bezier(0.2,0.8,0.2,1) 0.08s backwards;" onerror="this.style.opacity=0.3"/>
            <span class="hint">You gave</span>
          </div>
        </div>
        <button class="btn btn-secondary" id="celebrate-dismiss" style="padding:8px 20px; font-size:13px;">Nice!</button>
      </div>
    `;
    document.body.appendChild(overlay);
    if(gotCard?.image) ImgCache.get(gotCard.image, true).then(src => { const im = overlay.querySelector('.celebrate-got'); if(im && src) im.src = src; });
    if(gaveCard?.image) ImgCache.get(gaveCard.image, true).then(src => { const im = overlay.querySelector('.celebrate-gave'); if(im && src) im.src = src; });

    let done = false;
    const finish = () => { if(done) return; done = true; overlay.remove(); resolve(); };
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) finish(); });
    $('#celebrate-dismiss', overlay).addEventListener('click', finish);
    setTimeout(finish, 2600); // auto-dismiss so a distracted tapper doesn't get stuck behind it
  });
}

function renderTrade(){
  const wrap = el('div');
  // Matches the same guest-gate pattern renderBattleHome() already uses.
  // Before this, a guest could search for a user, pick a card, and tap
  // "Send Trade Offer" — only then hitting a raw propose_trade RLS/auth
  // error, since trading was never actually possible without a real
  // account. That's a dead end after real effort, at exactly the moment
  // someone has shown the most intent to create an account — worth
  // catching up front instead of after a wasted flow.
  if (guestMode || !session?.user) {
    wrap.innerHTML = `
      <div class="section-title">Trade Hub</div>
      <div class="hint" style="margin-bottom:14px;">Create a free account to trade cards and challenge other collectors to Pack Duels.</div>
      <button class="btn btn-primary" id="trade-login-btn" style="width:100%;">Sign up / Log in</button>`;
    app.appendChild(wrap);
    $('#trade-login-btn', wrap).addEventListener('click', () => openAuthModal());
    return;
  }
  wrap.innerHTML = `
    <div class="section-title">Trade Hub</div>
    <div class="hint" style="margin:-4px 0 10px;">Find a collector to trade with</div>
    <input type="text" id="trade-username-search" placeholder="Search by username..." class="auth-form" style="width:100%; margin-bottom:8px;" />
    <div id="trade-username-results" style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;"></div>
    <div id="trade-list"></div>

    <div style="display:flex; align-items:center; justify-content:space-between; margin:26px 0 4px;">
      <div class="section-title" style="margin:0;">⚔️ Pack Duel</div>
      <button class="btn btn-primary" id="start-duel-btn" style="padding:8px 14px; font-size:12.5px;">Start a Duel</button>
    </div>
    <div class="hint" style="margin-bottom:10px;">Both players open a pack from the same set — highest total value wins the other's pull. Ties are a draw.</div>
    <div id="duel-list"></div>
  `;
  app.appendChild(wrap);
  const list = $('#trade-list', wrap);

  wireUsernameSearch($('#trade-username-search', wrap), $('#trade-username-results', wrap));

  $('#start-duel-btn', wrap).addEventListener('click', () => openDuelProposer(() => loadDuels()));
  const duelList = $('#duel-list', wrap);
  duelList.innerHTML = '<div class="hint">Loading duels…</div>';
  loadDuels();

  async function loadDuels(){
    try{
      const { data, error } = await sb.rpc('my_pending_duels');
      if(error) throw error;
      if(!data || !data.length){
        duelList.innerHTML = '<div class="account-card"><p class="hint">No active duels. Tap "Start a Duel" to challenge a collector.</p></div>';
        return;
      }
      duelList.innerHTML = '';
      data.forEach(d => duelList.appendChild(renderDuelCard(d, loadDuels)));
    }catch(e){
      duelList.innerHTML = `<div class="hint" style="color:var(--danger)">Couldn't load duels. <button class="btn btn-secondary" id="retry-duels" style="margin-top:8px;">Retry</button></div>`;
      $('#retry-duels', duelList)?.addEventListener('click', loadDuels);
    }
  }

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
        // Both <img> tags start blank (skeleton bg from .account-card /
        // browser default) and get their real src filled in via
        // ImgCache below — same "resolve through the cache, never hit
        // the raw URL directly" rule the rest of the app follows, so
        // these paint from the already-warm blob cache instead of
        // re-fetching from the network every time the trade list loads.
        card.innerHTML = `
          <div style="font-size:12px; color:var(--dim); margin-bottom:6px;">${incoming ? 'Offer to you' : 'Your pending offer'}</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <img class="trade-offer-img" src="" style="width:48px;height:67px;object-fit:cover;border-radius:6px;background:var(--panel-2);" onerror="this.style.opacity=0.3"/>
            <span style="color:var(--dim); font-size:18px;">⇄</span>
            <img class="trade-request-img" src="" style="width:48px;height:67px;object-fit:cover;border-radius:6px;background:var(--panel-2);" onerror="this.style.opacity=0.3"/>
            <div style="flex:1; font-size:12.5px; color:var(--dim);">
              ${incoming ? `Gives you <b style="color:var(--text)">${escapeHtml(offer?.name)}</b> for your <b style="color:var(--text)">${escapeHtml(request?.name)}</b>` : `You offered <b style="color:var(--text)">${escapeHtml(offer?.name)}</b> for their <b style="color:var(--text)">${escapeHtml(request?.name)}</b>`}
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            ${incoming ? `<button class="btn btn-primary accept-btn" style="flex:1;">Accept</button><button class="btn btn-secondary decline-btn" style="flex:1;">Decline</button>`
                       : `<button class="btn btn-secondary cancel-btn" style="flex:1;">Cancel Offer</button>`}
          </div>
        `;
        if(offer?.image) ImgCache.get(offer.image, true).then(src => { const im = card.querySelector('.trade-offer-img'); if(im && src) im.src = src; });
        if(request?.image) ImgCache.get(request.image, true).then(src => { const im = card.querySelector('.trade-request-img'); if(im && src) im.src = src; });
        if(incoming){
          card.querySelector('.accept-btn').addEventListener('click', async (e)=>{
            e.target.disabled = true; e.target.textContent = '...';
            try{
              const { error } = await sb.rpc('respond_trade', { p_trade_id: t.id, p_accept: true });
              if(error) throw error;
              await celebrateTradeComplete(offer, request);
              syncAchievementsQuiet();
              loadTrades();
            }
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

/* ============================================================
   Pack Duel
   ------------------------------------------------------------
   Both players pay a set's pack cost up front (charged atomically
   when the opponent accepts — see respond_duel), then each opens a
   pack from that set independently. Whoever's pull totals more
   credit value (via getCardSellValue, same pricing used for selling)
   wins the other's cards; a tie is a draw and nobody's cards move.

   Cards pulled always land in the opener's own local collection the
   moment they open their duel pack, same as any normal pack (packCost
   was already paid, same as a real purchase). Winning/losing a duel
   only affects collections at the CLAIM step afterward: the winner's
   client adds a copy of the loser's pulled cards into their own local
   collection, and the loser's client removes their duel pack's cards
   from theirs. Both sides need to actually open the app and view
   Trade Hub to claim — that's an inherent consequence of collections
   living in local storage rather than a server-authoritative ledger
   (see persistToActiveCollection/getCollectionsMap).
   ============================================================ */
async function openDuelProposer(onDone){
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });

  let selectedOpponent = null;

  function renderStep1(){
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h2>Start a Pack Duel</h2>
      <div class="sub">Step 1 — who are you challenging?</div>
      <input type="text" id="duel-opp-search" placeholder="Search by username..." class="auth-form" style="width:100%; margin-top:12px;" />
      <div id="duel-opp-results" style="display:flex; flex-direction:column; gap:8px; margin-top:10px;"></div>
    `;
    wireUsernameSearch($('#duel-opp-search', sheet), $('#duel-opp-results', sheet), (u) => {
      selectedOpponent = u;
      renderStep2();
    });
  }

  function renderStep2(){
    const pickerTabs = [
      { id: 'pkmn_en', label: 'Pokémon (EN)', game: 'pokemon' },
      { id: 'pkmn_jp', label: 'Pokémon (JP)', game: 'pokemon' },
      { id: 'onepiece', label: 'One Piece', game: 'onepiece' }
    ];
    let activeTab = pickerTabs[0];

    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h2>Start a Pack Duel</h2>
      <div class="sub">Step 2 — pick a set to duel over, against <b style="color:var(--text)">${escapeHtml(selectedOpponent.username)}</b></div>
      <button class="btn btn-secondary" id="duel-change-opp" style="margin-top:8px; padding:6px 12px; font-size:11.5px;">‹ Change opponent</button>
      <div id="duel-set-tabs" style="display:flex; gap:8px; overflow-x:auto; margin:12px 0 10px; padding-bottom:4px;"></div>
      <input type="text" id="duel-set-search" placeholder="Search sets..." class="auth-form" style="width:100%; margin-bottom:10px;" />
      <div id="duel-set-list" style="display:flex; flex-direction:column; gap:8px; max-height:42vh; overflow-y:auto;"><div class="hint">Loading sets…</div></div>
    `;
    $('#duel-change-opp', sheet).addEventListener('click', renderStep1);

    const tabsWrap = $('#duel-set-tabs', sheet);
    const listWrap = $('#duel-set-list', sheet);
    const searchInput = $('#duel-set-search', sheet);
    let allSetsForTab = [];

    function renderTabButtons(){
      tabsWrap.replaceChildren();
      pickerTabs.forEach(t => {
        const btn = el('button', t.id === activeTab.id ? 'btn btn-primary' : 'btn btn-secondary');
        btn.textContent = t.label;
        btn.style.flexShrink = '0';
        btn.addEventListener('click', () => { activeTab = t; renderTabButtons(); loadSetsForTab(); });
        tabsWrap.appendChild(btn);
      });
    }

    function drawList(){
      const query = searchInput.value.trim().toLowerCase();
      const filtered = query ? allSetsForTab.filter(s => s.name.toLowerCase().includes(query)) : allSetsForTab;
      listWrap.replaceChildren();
      if(!filtered.length){ listWrap.innerHTML = '<div class="hint">No sets match your search.</div>'; return; }
      filtered.forEach(s => {
        const row = el('div','refer-box');
        row.style.cssText = 'display:flex; align-items:center; cursor:pointer;';
        row.innerHTML = `
          <div style="flex:1;">
            <div style="font-weight:bold; font-size:14px; margin-bottom:2px;">${s.name}</div>
            <div class="hint" style="color:var(--dim);">${s.packCost || 150} cr per pack</div>
          </div>
          <span style="font-size:18px; color:var(--dim);">›</span>
        `;
        row.addEventListener('click', async () => {
          row.style.opacity = '0.5';
          try{
            const { error } = await sb.rpc('propose_duel', {
              p_opponent_id: selectedOpponent.id,
              p_set_id: s.id,
              p_set_name: s.name,
              p_game: activeTab.game,
              p_pack_cost: s.packCost || 150
            });
            if(error) throw error;
            toast(`Duel proposed to ${selectedOpponent.username}!`);
            overlay.remove();
            if(onDone) onDone();
          } catch(e){
            toast(e.message || 'Could not propose duel');
            row.style.opacity = '1';
          }
        });
        listWrap.appendChild(row);
      });
    }

    async function loadSetsForTab(){
      listWrap.innerHTML = '<div class="hint">Loading sets…</div>';
      try{
        setActiveGame(activeTab.game);
        const sets = await getSets();
        allSetsForTab = activeTab.id === 'pkmn_jp'
          ? sets.filter(s => s.id.startsWith('jp-'))
          : activeTab.id === 'pkmn_en'
            ? sets.filter(s => !s.id.startsWith('jp-'))
            : sets;
        drawList();
      } catch(e){
        listWrap.innerHTML = '<div class="hint" style="color:var(--danger)">Could not load sets — try again.</div>';
      }
    }

    searchInput.addEventListener('input', drawList);
    renderTabButtons();
    loadSetsForTab();
  }

  renderStep1();
}

// Pulls the current server-side truth for specific card ids into local
// storage — used after a duel resolves, since the actual transfer now
// happens server-side (see submit_duel_pull) the instant both players
// submit. This just catches this device's local cache up to match.
async function syncCollectionCardsFromServer(collectionName, cardIds){
  if(!session || guestMode || !cardIds.length) return;
  const { data, error } = await sb.rpc('get_collection_cards', { p_collection_name: collectionName });
  if(error) throw error;
  const serverMap = {};
  (data || []).forEach(row => { serverMap[row.card_id] = row; });
  const map = getCollectionsMap();
  const coll = map[collectionName] = map[collectionName] || {};
  cardIds.forEach(id => {
    const row = serverMap[id];
    if(row && row.count > 0){
      coll[id] = { name: row.name, image: row.image, rarity: row.rarity, game: row.game, count: row.count };
    } else {
      delete coll[id];
    }
  });
  store.set(scopedKey('user_collections'), map);
}

function renderDuelCard(d, onChange){
  const mine = session.user.id;
  const card = el('div','account-card'); card.style.marginBottom = '10px';
  const isChallenger = d.challenger_id === mine;
  const opponentLabel = isChallenger ? 'them' : 'you';

  if(d.status === 'pending_accept'){
    if(isChallenger){
      card.innerHTML = `
        <div style="font-size:12px; color:var(--dim); margin-bottom:6px;">⚔️ Duel proposed — waiting on their response</div>
        <div style="font-size:13.5px;">${d.set_name} · ${d.pack_cost.toLocaleString()} cr each</div>
        <button class="btn btn-secondary cancel-duel-btn" style="width:100%; margin-top:10px;">Cancel Duel</button>
      `;
      card.querySelector('.cancel-duel-btn').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try{ await sb.rpc('cancel_duel', { p_duel_id: d.id }); onChange(); }
        catch(err){ toast('Could not cancel'); e.target.disabled = false; }
      });
    } else {
      card.innerHTML = `
        <div style="font-size:12px; color:var(--dim); margin-bottom:6px;">⚔️ Duel challenge — ${d.set_name}, ${d.pack_cost.toLocaleString()} cr each</div>
        <div class="hint">If you accept, ${d.pack_cost.toLocaleString()} credits will be charged to both of you right away.</div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn btn-primary accept-duel-btn" style="flex:1;">Accept</button>
          <button class="btn btn-secondary decline-duel-btn" style="flex:1;">Decline</button>
        </div>
      `;
      card.querySelector('.accept-duel-btn').addEventListener('click', async (e) => {
        e.target.disabled = true; e.target.textContent = '...';
        try{ const { error } = await sb.rpc('respond_duel', { p_duel_id: d.id, p_accept: true }); if(error) throw error; toast('Duel on! Open your pack when ready.'); onChange(); }
        catch(err){ toast(err.message || 'Could not accept'); e.target.disabled = false; e.target.textContent = 'Accept'; }
      });
      card.querySelector('.decline-duel-btn').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try{ await sb.rpc('respond_duel', { p_duel_id: d.id, p_accept: false }); onChange(); }
        catch(err){ toast('Could not decline'); e.target.disabled = false; }
      });
    }
    return card;
  }

  if(d.status === 'pending_packs'){
    const myCards = isChallenger ? d.challenger_cards : d.opponent_cards;
    const iSubmitted = !!myCards;
    card.innerHTML = `
      <div style="font-size:12px; color:var(--dim); margin-bottom:6px;">⚔️ ${d.set_name} · ${d.pack_cost.toLocaleString()} cr duel</div>
      ${iSubmitted
        ? `<div class="hint">Your pack is opened — waiting on ${opponentLabel === 'them' ? 'them' : 'your opponent'} to open theirs.</div>`
        : `<button class="btn btn-primary open-duel-pack-btn" style="width:100%;">🎁 Open Your Duel Pack</button>`}
    `;
    if(!iSubmitted){
      card.querySelector('.open-duel-pack-btn').addEventListener('click', (e) => {
        e.target.disabled = true; e.target.textContent = 'Opening…';
        openDuelPack(d, onChange).catch(err => { toast(err.message || 'Could not open pack'); e.target.disabled = false; e.target.textContent = '🎁 Open Your Duel Pack'; });
      });
    }
    return card;
  }

  if(d.status === 'completed'){
    const iWon = d.winner_id === mine;
    const isTie = !d.winner_id;
    const myValue = isChallenger ? d.challenger_value : d.opponent_value;
    const theirValue = isChallenger ? d.opponent_value : d.challenger_value;
    card.innerHTML = `
      <div style="font-size:12px; color:var(--dim); margin-bottom:6px;">⚔️ ${d.set_name} — Result</div>
      <div style="font-size:15px; font-weight:bold; color:${isTie ? 'var(--text)' : iWon ? 'var(--cyan)' : 'var(--danger)'};">
        ${isTie ? "It's a tie — no cards changed hands" : iWon ? '🏆 You won!' : 'You lost this duel'}
      </div>
      <div class="hint" style="margin-top:4px;">Your pull: ${(myValue||0).toLocaleString()} cr · Their pull: ${(theirValue||0).toLocaleString()} cr</div>
      <button class="btn btn-primary claim-duel-btn" style="width:100%; margin-top:10px;">${isTie ? 'Dismiss' : 'Claim Result'}</button>
    `;
    card.querySelector('.claim-duel-btn').addEventListener('click', async (e) => {
      e.target.disabled = true; e.target.textContent = '...';
      try{
        if(!isTie){
          // The actual card transfer already happened server-side the
          // instant both players submitted their pulls (see
          // submit_duel_pull) — this just catches this device's local
          // cache up to match, using whichever collection is currently
          // active locally. (Edge case: if you switched active
          // collections between opening your duel pack and claiming,
          // this syncs into your CURRENT active collection, which may
          // differ from the one actually credited server-side — a rare
          // mismatch worth knowing about, not a data-loss risk.)
          const theirCards = isChallenger ? d.opponent_cards : d.challenger_cards;
          const myCards = isChallenger ? d.challenger_cards : d.opponent_cards;
          const activeName = getActiveCollectionName();
          const idsToSync = [...new Set([...(theirCards||[]).map(c=>c.id), ...(myCards||[]).map(c=>c.id)])];
          await syncCollectionCardsFromServer(activeName, idsToSync);
        }
        await sb.rpc('claim_duel_result', { p_duel_id: d.id });
        syncAchievementsQuiet();
        onChange();
      } catch(err){
        toast('Could not claim result — try again.');
        e.target.disabled = false; e.target.textContent = isTie ? 'Dismiss' : 'Claim Result';
      }
    });
    return card;
  }

  card.innerHTML = `<div class="hint">Duel ${d.status}.</div>`;
  return card;
}

async function openDuelPack(duel, onDone){
  // The pack itself is generated entirely server-side now (see
  // generate_duel_pack / submit_duel_pull in Supabase) — this call just
  // asks for the result and renders it. Nothing about which cards come
  // out, their value, or who wins is computed or reported by the client
  // anymore.
  const { data, error } = await sb.rpc('submit_duel_pull', { p_duel_id: duel.id });
  if(error){
    if(String(error.message||'').startsWith('set_not_available_for_duels')){
      throw new Error("This set isn't available for duels yet — try a different set.");
    }
    throw error;
  }
  const pack = { cards: data.cards, godPack: data.godPack };
  const totalValue = data.value;

  // Duel pack cards join the opener's own local collection immediately,
  // same as any normal pack — packCost was already paid on accept.
  // Server sync is skipped here specifically: submit_duel_pull already
  // mirrors this exact pull server-side as part of resolving the duel,
  // so syncing it again here would double-count it.
  persistToActiveCollection(pack.cards, { skipServerSync: true });

  showDuelPullResult(duel, pack, totalValue);
  if(onDone) onDone();
}

function showDuelPullResult(duel, pack, totalValue){
  const overlay = el('div','overlay');
  const sheet = el('div','sheet');
  sheet.style.maxWidth = '550px';
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>Your Duel Pull</h2>
    <div class="sub">Total value: <b style="color:var(--cyan)">${totalValue.toLocaleString()} cr</b> — added to your collection. Waiting on your opponent to open theirs.</div>
    <div class="summary-grid" id="duel-pull-grid" style="max-height:40vh; overflow-y:auto; padding:4px; margin-top:10px;"></div>
    <button class="btn btn-primary" id="duel-pull-close" style="width:100%; margin-top:14px;">Done</button>
  `;
  overlay.appendChild(sheet); document.body.appendChild(overlay);
  const grid = $('#duel-pull-grid', sheet);
  pack.cards.forEach(p => {
    const tier = classifyForCard(p.card);
    const mini = el('div','mini'+(tier.id>=4?' hit':''));
    mini.innerHTML = `<img src="${ImgCache.sync(p.card.images.small)}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e293b%22/%3E%3C/svg%3E'"/>`;
    mini.addEventListener('click', ()=> showCardFullscreen(ImgCache.sync(p.card.images.large || p.card.images.small), p.card));
    grid.appendChild(mini);
  });
  $('#duel-pull-close', sheet).addEventListener('click', () => { overlay.remove(); render('trade'); });
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay){ overlay.remove(); render('trade'); } });
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
    `;
    overlay.appendChild(sheet); document.body.appendChild(overlay);
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
    $('#guest-signup-btn', sheet).addEventListener('click', ()=>{ overlay.remove(); exitGuestMode(); });
    return;
  }

  const refLink = `${location.origin}${location.pathname}?ref=${profile?.referral_code || ''}`;
  const refBonus = CONFIG.ECONOMY.REFERRAL_BONUS;
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>${lowBalance ? 'Out of credits' : 'Get more credits'}</h2>
    <div class="sub">Refer a friend for free credits.</div>
    <div class="refer-box">
      <code id="ref-link">${refLink}</code>
      <button class="btn btn-secondary" id="copy-ref">Copy</button>
    </div>
    <div class="promo-pack-strip" id="referral-promo-strip"></div>
    <div class="hint" style="margin-bottom:18px;">You both get +${refBonus.toLocaleString()} credits when they sign up, plus a free Base Set &amp; Base Set 2 pack ticket each.</div>
  `;
  overlay.appendChild(sheet); document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
  const referralPromoStrip = $('#referral-promo-strip', sheet);
  if (referralPromoStrip) renderPromoPackStrip(referralPromoStrip, ['base1', 'base2']);
  $('#copy-ref', sheet).addEventListener('click', ()=>{
    navigator.clipboard?.writeText(refLink); SFX.coin(); toast('Referral link copied');
    track('referral_link_copied');
  });
}

/* ============================================================
   Boot
   ============================================================ */
initAuth();
