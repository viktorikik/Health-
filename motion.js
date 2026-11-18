/* ============================================================
   ФАЙЛ 2 из 6 · motion.js · СОЗДАТЬ НОВЫЙ (или заменить целиком)
   GitHub: Add file → Create new file → имя motion.js → вставить
   весь этот текст → Commit changes.
   ============================================================ */

/* ===== motion.js · Волна 15 «Оживление» · v1.1 =====
   Слой поверх модулей core/calendar/panel/analytics/health/app.
   Подключается с defer ПОСЛЕ app.js. Ничего из state не читает. */
(function () {
  'use strict';
  if (window.EOGMotion) return; // защита от двойной загрузки

  /* ===== КОНФИГ ===== */
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LS = 'eog-motion';
  var NUM = { countDur: [200, 2000], confettiCount: [8, 80], tiltMax: [2, 14] };
  var DEFAULTS = {
    sound: true, haptic: true, ripple: true, press: true,
    counters: true, reveal: true, atmo: true, tilt: true,
    countDur: 750, confettiCount: 34, tiltMax: 6
  };
  var cfg = Object.assign({}, DEFAULTS);
  var lastSfx = 0;
  try {
    var saved = JSON.parse(localStorage.getItem(LS) || '{}');
    Object.keys(saved).forEach(function (k) { if (k in cfg) cfg[k] = saved[k]; });
  } catch (e) {}
  function persist() { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }
  function emit(name) { try { document.dispatchEvent(new CustomEvent('eog:change', { detail: { name: name, value: cfg[name] } })); } catch (e) {} }

  /* ===== ЗВУК ===== */
  var AC = null;
  function ensureAudio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (AC && AC.state === 'suspended') AC.resume();
  }
  function tone(f, dur, type, gain, delay, slide) {
    if (!AC) return;
    var t = AC.currentTime + (delay || 0);
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function sfx(name) {
    if (!cfg.sound || RM) return;
    ensureAudio(); if (!AC) return;
    lastSfx = Date.now();
    try {
      if (name === 'tap') tone(920, 0.05, 'sine', 0.035);
      else if (name === 'ok') { tone(660, 0.07, 'sine', 0.045); tone(990, 0.09, 'sine', 0.04, 0.07); }
      else if (name === 'del') tone(240, 0.1, 'triangle', 0.05);
      else if (name === 'open') tone(520, 0.09, 'sine', 0.035, 0, 760);
      else tone(1320, 0.04, 'sine', 0.03);
    } catch (e) {}
  }
  document.addEventListener('pointerdown', function once() {
    ensureAudio(); document.removeEventListener('pointerdown', once);
  }, { once: true });

  /* ===== ХАПТИКА ===== */
  function haptic(p) {
    if (!cfg.haptic) return;
    try { if (navigator.vibrate) navigator.vibrate(p || 10); } catch (e) {}
  }

  /* ===== RIPPLE + НАЖАТИЕ ===== */
  var BTN = 'button, .btn, [data-ripple]';
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest ? e.target.closest(BTN) : null;
    if (!el || el.hasAttribute('data-no-ripple') || el.disabled) return;
    if (cfg.press) el.classList.add('eog-press');
    if (!cfg.ripple || RM) return;
    el.classList.add('eog-rip');
    var r = el.getBoundingClientRect(), s = Math.max(r.width, r.height);
    var sp = document.createElement('span');
    sp.className = 'eog-ripple'; sp.setAttribute('data-eog', '1');
    sp.style.width = sp.style.height = s + 'px';
    sp.style.left = (e.clientX - r.left - s / 2) + 'px';
    sp.style.top = (e.clientY - r.top - s / 2) + 'px';
    el.appendChild(sp);
    setTimeout(function () { sp.remove(); }, 620);
  }, { passive: true });

  /* ===== СЧЁТЧИКИ ===== */
  function parseNum(s) { return parseFloat(String(s).replace(',', '.')) || 0; }
  function fmt(v, dec) { return dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v)); }
  function countUp(el, to, opts) {
    opts = opts || {};
    var dec = opts.dec || 0, suf = opts.suf || '', dur = opts.dur || cfg.countDur;
    var from = el._eogV || 0;
    el._eogV = to;
    if (RM || !cfg.counters || from === to) { el.textContent = fmt(to, dec) + suf; return; }
    if (el._eogRaf) cancelAnimationFrame(el._eogRaf);
    el._eogBusy = true;
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e, dec) + suf;
      if (p < 1) el._eogRaf = requestAnimationFrame(step);
      else el._eogBusy = false;
    })(t0);
  }
  function initCounter(el) {
    if (el.hasAttribute('data-eog-count')) return;
    el.setAttribute('data-eog-count', '1');
    var attr = el.getAttribute('data-count');
    var to = attr ? parseNum(attr) : parseNum(el.textContent);
    var dec = +(el.getAttribute('data-dec') || (String(to).indexOf('.') > -1 ? 1 : 0));
    var suf = el.getAttribute('data-suf') || '';
    el._eogDec = dec; el._eogSuf = suf; el._eogV = 0;
    countUp(el, to, { dec: dec, suf: suf });
  }
  function recount(el) {
    if (el._eogBusy) return;
    var attr = el.getAttribute('data-count');
    var to = attr ? parseNum(attr) : parseNum(el.textContent);
    if (to === el._eogV) return; // повторный render с тем же числом — не мигаем
    countUp(el, to, { dec: el._eogDec || 0, suf: el._eogSuf || '' });
  }

  /* ===== ПОЯВЛЕНИЕ СЕКЦИЙ ===== */
  var SKIP_MODAL = '.modal, .sheet, .bottom-sheet, dialog, [class*="modal"], [class*="sheet"], #healthCardView';
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('eog-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' }) : null;
  function initReveal(el) {
    if (el.hasAttribute('data-eog-rev') || el.hasAttribute('data-no-reveal')) return;
    if (el.closest(SKIP_MODAL)) return;
    el.setAttribute('data-eog-rev', '1');
    if (!cfg.reveal || RM || !io) { el.classList.add('eog-in'); return; }
    el.classList.add('eog-pre');
    io.observe(el);
  }

  /* ===== ОТРИСОВКА SVG-ЛИНИИ ===== */
  function drawPath(p) {
    if (RM || !p || p.hasAttribute('data-eog-drawn')) return;
    p.setAttribute('data-eog-drawn', '1');
    try {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)';
      p.style.strokeDashoffset = '0';
      setTimeout(function () {
        p.style.strokeDasharray = p.style.strokeDashoffset = p.style.transition = '';
      }, 1250);
    } catch (e) {}
  }

  /* ===== 3D-НАКЛОН (opt-in, только мышь) ===== */
  var HOVER = window.matchMedia && matchMedia('(hover: hover)').matches;
  function initTilt(el) {
    if (el.hasAttribute('data-eog-tilt') || !HOVER) return;
    el.setAttribute('data-eog-tilt', '1');
    el.addEventListener('pointermove', function (e) {
      if (!cfg.tilt || RM) { el.style.transform = ''; return; }
      var r = el.getBoundingClientRect(), m = cfg.tiltMax;
      var rx = ((e.clientY - r.top) / r.height - 0.5) * -2 * m;
      var ry = ((e.clientX - r.left) / r.width - 0.5) * 2 * m;
      el.style.transform = 'perspective(700px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  }

  /* ===== КОНФЕТТИ ===== */
  var cfHost = null;
  function confetti(x, y) {
    if (RM) return;
    if (!cfHost) {
      cfHost = document.createElement('div');
      cfHost.id = 'eogConfetti'; cfHost.setAttribute('data-eog', '1');
      document.body.appendChild(cfHost);
    }
    var cx = (x == null || x === 0) ? innerWidth / 2 : x;
    var cy = (y == null || y === 0) ? innerHeight * 0.32 : y;
    var cols = ['#D6F34C', '#F57E9C', '#6FC3FF', '#FFB454', '#8FD97A', '#B78CFF'];
    var n = Math.round(cfg.confettiCount);
    for (var i = 0; i < n; i++) {
      var p = document.createElement('div');
      p.className = 'eog-cf'; p.setAttribute('data-eog', '1');
      var s = 5 + Math.random() * 7;
      p.style.cssText = 'width:' + s + 'px;height:' + (s * (Math.random() > 0.5 ? 1 : 0.45)) + 'px;left:' + cx + 'px;top:' + cy + 'px;background:' + cols[i % 6] + ';border-radius:' + (Math.random() > 0.5 ? '50%' : '2px');
      cfHost.appendChild(p);
      if (!p.animate) { p.remove(); continue; }
      var ang = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
      var dx = Math.cos(ang) * v, dy = Math.sin(ang) * v * 0.6;
      var anim = p.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (Math.random() * 360) + 'deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(' + (dx * 1.4) + 'px,' + (innerHeight * 0.75) + 'px) rotate(' + (Math.random() * 720) + 'deg)', opacity: 0 }
      ], { duration: 1000 + Math.random() * 800, easing: 'cubic-bezier(.15,.6,.35,1)' });
      anim.onfinish = (function (node) { return function () { node.remove(); }; })(p);
      setTimeout((function (node) { return function () { if (node.parentNode) node.remove(); }; })(p), 2200);
    }
    sfx('ok'); haptic([12, 40, 12]);
  }
  document.addEventListener('eog:celebrate', function (e) {
    var d = e.detail || {}; confetti(d.x, d.y);
  });

  /* ===== АТМОСФЕРА ===== */
  function applyAtmo() {
    var el = document.getElementById('eogAtmo');
    if (cfg.atmo && !el) {
      el = document.createElement('div');
      el.id = 'eogAtmo'; el.setAttribute('data-eog', '1');
      document.body.appendChild(el);
    } else if (!cfg.atmo && el) el.remove();
  }

  /* ===== ОБЁРТКА ТОСТОВ ПРОЕКТА ===== */
  function wrapToasts() {
    ['showToast', 'toast'].forEach(function (name) {
      var fn = window[name];
      if (typeof fn !== 'function' || fn._eogWrapped) return;
      var wrapped = function () {
        var res = fn.apply(this, arguments);
        // если действие уже дало звук/вибро (panel/calendar) — не дублируем
        if (Date.now() - lastSfx > 250) {
          var type = 'ok';
          for (var i = 0; i < arguments.length; i++) {
            var a = String(arguments[i]).toLowerCase();
            if (a === 'err' || a === 'error' || a === 'danger') type = 'del';
            else if (a === 'info' || a === 'warn' || a === 'warning') type = 'pop';
          }
          sfx(type); haptic(type === 'del' ? [25, 40, 25] : 12);
        }
        return res;
      };
      wrapped._eogWrapped = true;
      window[name] = wrapped;
    });
  }

  /* ===== КНОПКА ЗВУКА (data-motion-sound) ===== */
  var VOL = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/></svg>';
  var VOLX = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6m0-6l6 6"/></svg>';
  function renderSoundButtons() {
    document.querySelectorAll('[data-motion-sound]').forEach(function (b) {
      b.innerHTML = cfg.sound ? VOL : VOLX;
      b.setAttribute('aria-pressed', String(cfg.sound));
      b.title = cfg.sound ? 'Звук включён' : 'Звук выключен';
    });
  }
  function setSound(v) { set('sound', v); if (cfg.sound) sfx('ok'); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-motion-sound]') : null;
    if (b) setSound(!cfg.sound);
  });

  /* ===== ПУЛЬТ: переключатели, слайдеры, действия ===== */
  function set(name, value) {
    if (!(name in cfg)) return;
    if (NUM[name]) {
      value = Math.round(Number(value) || DEFAULTS[name]);
      value = Math.min(NUM[name][1], Math.max(NUM[name][0], value));
    } else value = !!value;
    cfg[name] = value; persist();
    if (name === 'atmo') applyAtmo();
    if (name === 'sound') renderSoundButtons();
    if (name === 'reveal' && !value) {
      document.querySelectorAll('.eog-pre:not(.eog-in)').forEach(function (el) { el.classList.add('eog-in'); });
    }
    emit(name);
  }
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches && t.matches('input[data-motion-toggle]')) set(t.getAttribute('data-motion-toggle'), t.checked);
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches && t.matches('input[data-motion-range]')) set(t.getAttribute('data-motion-range'), t.value);
  });
  document.addEventListener('eog:change', function () {
    document.querySelectorAll('input[data-motion-toggle]').forEach(function (t) { t.checked = !!cfg[t.getAttribute('data-motion-toggle')]; });
    document.querySelectorAll('input[data-motion-range]').forEach(function (t) { t.value = cfg[t.getAttribute('data-motion-range')]; });
    document.querySelectorAll('[data-motion-out]').forEach(function (o) {
      var k = o.getAttribute('data-motion-out');
      o.textContent = cfg[k] + (o.getAttribute('data-unit') || '');
    });
  });
  function reset() { Object.keys(DEFAULTS).forEach(function (k) { set(k, DEFAULTS[k]); }); }
  function randomize() {
    Object.keys(DEFAULTS).forEach(function (k) {
      if (NUM[k]) set(k, NUM[k][0] + Math.random() * (NUM[k][1] - NUM[k][0]));
      else if (k !== 'sound') set(k, Math.random() > 0.35);
    });
  }
  function exportCfg() {
    try {
      var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'eog-motion.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-motion-action]') : null;
    if (!b) return;
    var a = b.getAttribute('data-motion-action');
    if (a === 'reset') reset();
    else if (a === 'randomize') randomize();
    else if (a === 'export') exportCfg();
  });

  /* ===== СКАНЕР + НАБЛЮДАТЕЛЬ (дружит с render()) ===== */
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.hasAttribute && root.hasAttribute('data-eog')) return;
    var all = function (sel) {
      var out = [];
      if (root.matches && root.matches(sel)) out.push(root);
      root.querySelectorAll(sel).forEach(function (el) { out.push(el); });
      return out;
    };
    all('[data-count], .stat-value').forEach(initCounter);
    all('[data-reveal], .card').forEach(initReveal);
    all('path[data-draw], #tempLine, .temp-line').forEach(drawPath);
    all('[data-tilt]').forEach(initTilt);
  }
  var queued = false, queue = [];
  function flush() {
    queued = false;
    var nodes = queue; queue = [];
    nodes.forEach(function (n) {
      if (n._eogCount) { recount(n); return; }
      scan(n);
    });
  }
  var mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 && !n.hasAttribute('data-eog') && !n.closest('#eogConfetti, #eogAtmo')) queue.push(n);
        });
        var t = m.target;
        if (t.nodeType === 1 && t.hasAttribute && t.hasAttribute('data-eog-count') && !t._eogBusy) {
          t._eogCount = true; queue.push(t);
        }
      }
    });
    if (queue.length && !queued) { queued = true; requestAnimationFrame(flush); }
  });

  /* ===== API + СТАРТ ===== */
  window.EOGMotion = {
    version: '1.1', cfg: cfg,
    haptic: haptic, sfx: sfx, confetti: confetti, countUp: countUp,
    drawPath: drawPath, set: set, setSound: setSound,
    reset: reset, randomize: randomize, exportCfg: exportCfg,
    refresh: function () { scan(document.body); }
  };
  function start() {
    applyAtmo();
    wrapToasts();
    renderSoundButtons();
    scan(document.body);
    document.dispatchEvent(new CustomEvent('eog:change', { detail: { name: '*', value: null } }));
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
