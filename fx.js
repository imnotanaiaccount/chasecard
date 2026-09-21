/* fx.js — dependency-free juice helpers for styles.css v2.
   Load with <script src="fx.js" defer></script>. Touches no app state.
     FX.float(anchorEl, '+50')      floating reward text over any element
     FX.bump(el)                    credits-pill pop (adds/removes .bump)
     FX.count(numEl, to, {from,ms}) tick a number up/down (numEl holds ONLY the number)
     FX.buzz(ms | [pattern])        haptics where supported (Android; iOS ignores it)
     FX.holo(faceEl)                holo glare that follows the finger on a revealed card (.face.front)
     FX.vt(update)                  morph between pages: FX.vt(() => render()). update runs on the NEXT frame
                                    (the browser snapshots first), so put post-render code inside it or in
                                    the returned promise: FX.vt(fn).then(after). Falls back to plain update().
     (auto)  spotlight glow         cards/bundles/quests/pack art catch light at the pointer; nothing to call
     FX.charge(tier)                rising build-up buzz while the card back glows (call when charging starts)
     FX.pull(tier)                  landing buzz, stronger the rarer the card (call when the flip lands)
     FX.haptics(true|false)         user opt-out, remembered in localStorage (no arg = read current)
   tier = 0-8 (common..hyper, same order as the data-tier names) or the name string.
   Everything is a no-op under reduced motion, and haptics also respect it. */
(function () {
  'use strict';
  var reduced = function () {
    return document.body.classList.contains('reduce-motion') ||
      (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  var KEY = 'fx-haptics';
  function haptics(on) {
    try {
      if (on === undefined) return localStorage.getItem(KEY) !== 'off';
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch (e) { return true; }
    return !!on;
  }
  var buzz = function (p) {
    try { if (!reduced() && haptics() && navigator.vibrate) navigator.vibrate(p); } catch (e) {}
  };

  /* index = tier 0..8. [on, off, on, ...] in ms. Common/uncommon stay silent so rare hits actually feel rare. */
  var NAMES = ['common','uncommon','rare','holo','double','ultra','illus','sillus','hyper'];
  var PULL = [
    0, 0,
    [15],
    [25],
    [30, 40, 30],
    [40, 50, 40, 50, 60],
    [50, 60, 50, 60, 90],
    [60, 50, 60, 50, 120, 80, 200],
    [80, 60, 80, 60, 120, 60, 120, 60, 300]
  ];
  /* build-up: pulses get longer and closer together, ~0.5-0.9s, then pull() lands */
  var CHARGE = [
    0, 0, 0, 0, 0,
    [10, 90, 14, 70, 18, 50, 24],
    [10, 90, 14, 70, 18, 50, 26, 40, 30],
    [10, 80, 14, 65, 18, 50, 24, 40, 30, 30, 36],
    [10, 80, 14, 60, 18, 45, 24, 35, 30, 28, 36, 22, 44]
  ];
  function idx(t) { return typeof t === 'number' ? t : NAMES.indexOf(String(t)); }
  function pull(t) { var p = PULL[idx(t)]; if (p) buzz(p); }
  function charge(t) { var p = CHARGE[idx(t)]; if (p) buzz(p); }

  function float(anchor, text) {
    if (reduced() || !anchor) return;
    var r = anchor.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'float-reward';
    el.textContent = text;
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top = (r.top + r.height / 2) + 'px';
    el.addEventListener('animationend', function () { el.remove(); });
    document.body.appendChild(el);
  }

  function bump(el) {
    if (reduced() || !el) return;
    el.classList.remove('bump');
    void el.offsetWidth; /* restart the animation */
    el.classList.add('bump');
    el.addEventListener('animationend', function h() {
      el.classList.remove('bump');
      el.removeEventListener('animationend', h);
    });
  }

  function count(el, to, opts) {
    if (!el) return;
    opts = opts || {};
    var from = opts.from != null ? opts.from : (parseFloat(String(el.textContent).replace(/[^\d.-]/g, '')) || 0);
    var fmt = opts.format || function (n) { return Math.round(n).toLocaleString(); };
    if (reduced() || from === to) { el.textContent = fmt(to); return; }
    var ms = opts.ms || 700, t0 = performance.now();
    (function tick(t) {
      var k = Math.min(1, (t - t0) / ms);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }


  /* holo glare: adds .holo to the card face and feeds --mx/--my/--holo to the CSS.
     Listens only; never stops propagation, so existing tilt/flip handlers keep working. */
  function holo(face) {
    if (!face || reduced() || face.__holo) return;
    face.__holo = true;
    face.classList.add('holo');
    function move(e) {
      var r = face.getBoundingClientRect();
      face.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      face.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      face.style.setProperty('--holo', 1);
    }
    function off() { face.style.setProperty('--holo', 0); }
    face.addEventListener('pointerdown', move, { passive: true });
    face.addEventListener('pointermove', move, { passive: true });
    face.addEventListener('pointerup', off, { passive: true });
    face.addEventListener('pointerleave', off, { passive: true });
    face.addEventListener('pointercancel', off, { passive: true });
  }

  /* View-transition wrapper. Returns a promise that resolves once the DOM is updated. */
  function vt(update) {
    if (!document.startViewTransition || reduced()) {
      update();
      return Promise.resolve();
    }
    try { return document.startViewTransition(update).updateCallbackDone; }
    catch (e) { update(); return Promise.resolve(); }
  }

  /* Spotlight: feeds --mx/--my (%) to the closest glow surface and toggles .lit.
     Mouse/pen follow the cursor; touch lights the card while pressed. One delegated listener, rAF-throttled. */
  var GLOW = '.set-card,.bundle,.ga-card,.quest,.account-card,.pack-art,[data-glow]';
  var cur = null, raf = 0, unlit = 0;
  function aim(e) {
    var t = e.target && e.target.closest ? e.target.closest(GLOW) : null;
    if (cur && cur !== t) cur.classList.remove('lit');
    cur = t;
    if (!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    t.classList.add('lit');
  }
  function release() {
    clearTimeout(unlit);
    unlit = setTimeout(function () { if (cur) { cur.classList.remove('lit'); cur = null; } }, 350);
  }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || raf) return;
    raf = requestAnimationFrame(function () { raf = 0; aim(e); });
  }, { passive: true });
  document.addEventListener('pointerdown', function (e) { clearTimeout(unlit); aim(e); }, { passive: true });
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });
  document.documentElement.addEventListener('mouseleave', release);

  /* light tick on every chunky press — pairs with the CSS button lip */
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.btn:not(:disabled), .tab')) buzz(6);
  }, { passive: true });

  window.FX = { float: float, bump: bump, count: count, buzz: buzz, holo: holo, vt: vt, pull: pull, charge: charge, haptics: haptics };
})();
