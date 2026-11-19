/* ============================================================
   ФАЙЛ 2 из 3 · growth.js · СОЗДАТЬ НОВЫЙ
   GitHub → Add file → Create new file → имя growth.js →
   вставить весь текст → Commit changes.

   ЧТО ДЕЛАЕТ:
   • Перехватывает плитку «Рост и вес» и открывает свой экран:
     сводка, три графика, спарклайны, полная таблица истории,
     добавление / правка / удаление с отменой, экспорт CSV.
   • Читает и пишет те же данные: getActiveChild().healthCard.growth
     Схема { id, date, height, weight } не меняется.
   • Чинит прокрутку списков карточки здоровья (страховка к CSS).

   ПОДКЛЮЧАТЬ ПОСЛЕ health.js и app.js.
   ============================================================ */
(function () {
  'use strict';
  if (window.EOGGrowth) return;

  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===== УТИЛИТЫ (работают и без core.js) ===== */
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function pad(n){ return String(n).padStart(2,'0'); }
  function uid(){ return 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function keyOf(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function parseK(k){ var p = String(k||'').split('-'); return new Date(+p[0], (+p[1]||1)-1, +p[2]||1); }
  function num(v){ var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : NaN; }
  function fmt(v, d){ return (Math.round(v * Math.pow(10,d||0)) / Math.pow(10,d||0)).toFixed(d||0).replace('.', ','); }
  function plural(n, a, b, c){ n = Math.abs(n) % 100; var n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; }
  var MON = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  function fmtDate(k){ var d = parseK(k); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtShort(k){ var d = parseK(k); return pad(d.getDate()) + '.' + pad(d.getMonth()+1) + '.' + String(d.getFullYear()).slice(2); }
  function ageAt(dob, k){
    if (!dob) return '';
    var b = parseK(dob), t = parseK(k);
    var m = (t.getFullYear()-b.getFullYear())*12 + t.getMonth()-b.getMonth();
    if (t.getDate() < b.getDate()) m--;
    if (m < 0) return '';
    var y = Math.floor(m/12), mm = m % 12, s = '';
    if (y) s += y + ' ' + plural(y,'год','года','лет');
    if (mm) s += (s ? ' ' : '') + mm + ' ' + plural(mm,'месяц','месяца','месяцев');
    return s || '0 месяцев';
  }
  function hap(p){ try { if (window.EOGMotion && EOGMotion.haptic) EOGMotion.haptic(p); else if (navigator.vibrate) navigator.vibrate(p || 8); } catch(e){} }
  function sfx(n){ try { if (window.EOGMotion && EOGMotion.sfx) EOGMotion.sfx(n); } catch(e){} }
  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ===== ДОСТУП К ДАННЫМ ===== */
  function child(){
    try { if (typeof getActiveChild === 'function') return getActiveChild(); } catch(e){}
    try { if (window.state && window.state.children) return window.state.children.find(function(c){ return c.id === window.state.activeChildId; }) || window.state.children[0]; } catch(e){}
    return null;
  }
  function ensure(){
    var c = child(); if (!c) return null;
    if (!c.healthCard || typeof c.healthCard !== 'object') c.healthCard = {};
    ['visits','vaccines','notes','growth'].forEach(function(f){ if (!Array.isArray(c.healthCard[f])) c.healthCard[f] = []; });
    return c;
  }
  function raw(){ var c = ensure(); return c ? c.healthCard.growth : []; }
  function persist(){
    try { if (typeof save === 'function') save(); } catch(e){}
    try { if (typeof render === 'function') render(); } catch(e){}
    try { if (typeof renderHealthCard === 'function') renderHealthCard(); } catch(e){}
    try { if (typeof updateHealthCardTiles === 'function') updateHealthCardTiles(); } catch(e){}
  }
  function rows(){
    var list = raw().map(function(r){
      var h = num(r.height), w = num(r.weight);
      var bmi = (h > 0 && w > 0) ? w / Math.pow(h/100, 2) : NaN;
      return { id: r.id, date: r.date || '', height: h, weight: w, bmi: bmi, src: r };
    }).filter(function(r){ return r.date; });
    list.sort(function(a,b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    list.forEach(function(r, i){
      var p = i > 0 ? list[i-1] : null;
      r.dH = p && isFinite(r.height) && isFinite(p.height) ? r.height - p.height : null;
      r.dW = p && isFinite(r.weight) && isFinite(p.weight) ? r.weight - p.weight : null;
      r.dB = p && isFinite(r.bmi) && isFinite(p.bmi) ? r.bmi - p.bmi : null;
      r.days = p ? Math.round((parseK(r.date) - parseK(p.date)) / 86400000) : null;
    });
    return list;
  }

  /* ===== СОСТОЯНИЕ ЭКРАНА ===== */
  var S = { metric:'height', period:'all', grid:true, dots:true, labels:true, trend:false, sort:'new', open:false };
  var METRICS = {
    height:{ key:'height', label:'Рост', unit:'см', dec:1, color:'--g-sky', delta:'dH', icon:'📏' },
    weight:{ key:'weight', label:'Вес', unit:'кг', dec:1, color:'--g-coral', delta:'dW', icon:'⚖️' },
    bmi:{ key:'bmi', label:'ИМТ', unit:'', dec:1, color:'--g-violet', delta:'dB', icon:'📐' }
  };
  var PERIODS = { all:'Всё время', y:'Год', m6:'6 мес', m3:'3 мес' };

  function filtered(){
    var list = rows();
    if (S.period === 'all') return list;
    var days = S.period === 'y' ? 365 : S.period === 'm6' ? 183 : 92;
    var last = list.length ? parseK(list[list.length-1].date) : new Date();
    var from = new Date(last); from.setDate(from.getDate() - days);
    var cut = keyOf(from);
    var out = list.filter(function(r){ return r.date >= cut; });
    return out.length ? out : list.slice(-1);
  }

  /* ===== ПОСТРОЕНИЕ DOM ===== */
  var view, sheet, toasts;
  function build(){
    if (view) return;
    view = document.createElement('div');
    view.id = 'eogGrowthView';
    view.setAttribute('role','dialog');
    view.setAttribute('aria-modal','true');
    view.setAttribute('aria-label','Рост и вес');
    view.innerHTML =
      '<div class="g-head">' +
        '<button class="g-back" data-g="close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Назад</button>' +
        '<div class="g-htitle"><div class="t">Рост и вес</div><div class="s" id="gSub">—</div></div>' +
      '</div>' +
      '<div class="g-body"><div class="g-wrap" id="gWrap"></div></div>' +
      '<button class="g-fab" data-g="add" aria-label="Добавить замер"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>';
    document.body.appendChild(view);

    sheet = document.createElement('div');
    sheet.id = 'eogGrowthSheet';
    sheet.setAttribute('role','dialog');
    sheet.setAttribute('aria-modal','true');
    sheet.innerHTML = '<div class="g-sheet"><div class="g-grip"></div><div class="g-sheet-body" id="gSheetBody"></div></div>';
    document.body.appendChild(sheet);

    toasts = document.createElement('div');
    toasts.id = 'eogGrowthToasts';
    document.body.appendChild(toasts);

    view.addEventListener('click', onViewClick);
    sheet.addEventListener('click', onSheetClick);
    sheet.addEventListener('input', onSheetInput);
    document.addEventListener('keydown', function(e){
      if (e.key !== 'Escape') return;
      if (sheet.classList.contains('open')) { closeSheet(); return; }
      if (S.open) close();
    });
    view.addEventListener('pointerdown', function(e){
      var b = e.target.closest('.g-btn,.g-back,.g-fab,.g-ibtn'); if (!b || RM) return;
      var r = document.createElement('span'); r.className = 'g-rip';
      var rc = b.getBoundingClientRect(), s = Math.max(rc.width, rc.height);
      r.style.cssText = 'width:'+s+'px;height:'+s+'px;left:'+(e.clientX-rc.left-s/2)+'px;top:'+(e.clientY-rc.top-s/2)+'px';
      b.appendChild(r); setTimeout(function(){ r.remove(); }, 600);
    }, { passive:true });
    window.addEventListener('resize', function(){ if (S.open) { placeSegs(); fitModals(); } });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fitModals);
  }

  /* ===== ТОСТЫ ===== */
  function toast(msg, type, undo){
    build();
    while (toasts.children.length >= 3) toasts.firstChild.remove();
    var t = document.createElement('div');
    t.className = 'g-toast ' + (type || 'ok');
    var d = document.createElement('span'); d.className = 'd';
    var s = document.createElement('span'); s.textContent = msg;
    t.appendChild(d); t.appendChild(s);
    var killed = false;
    function kill(){ if (killed) return; killed = true; t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 340); }
    if (undo){
      var u = document.createElement('button'); u.className = 'u'; u.textContent = 'Отменить';
      u.onclick = function(){ undo(); kill(); };
      t.appendChild(u);
    }
    toasts.appendChild(t);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ t.classList.add('show'); }); });
    setTimeout(kill, undo ? 7000 : 3000);
    sfx(type === 'err' ? 'del' : 'ok'); hap(type === 'err' ? [25,40,25] : 10);
  }

  /* ===== ОТКРЫТИЕ / ЗАКРЫТИЕ ===== */
  var prevOverflow = '';
  function open(){
    build();
    S.open = true;
    prevOverflow = document.body.style.overflow;
    view.classList.add('open');
    document.body.style.overflow = 'hidden';
    try { if (typeof syncBodyScroll === 'function') syncBodyScroll(); } catch(e){}
    renderAll();
    $('.g-body', view).scrollTop = 0;
    sfx('open'); hap(10);
    setTimeout(function(){ var b = $('.g-back', view); if (b) b.focus({ preventScroll:true }); }, 60);
  }
  function close(){
    if (!view) return;
    S.open = false;
    closeSheet();
    view.classList.remove('open');
    document.body.style.overflow = prevOverflow;
    try { if (typeof syncBodyScroll === 'function') syncBodyScroll(); } catch(e){}
    sfx('tap'); hap(6);
  }

  /* ===== РЕНДЕР ===== */
  function renderAll(){
    var c = ensure();
    var all = rows();
    var last = all.length ? all[all.length-1] : null;
    var name = c && c.name ? c.name : 'Ребёнок';
    var age = c && c.birthDate && last ? ageAt(c.birthDate, last.date) : (c && c.birthDate ? ageAt(c.birthDate, keyOf(new Date())) : '');
    $('#gSub', view).textContent = name + (age ? ' · ' + age : '') + ' · ' + all.length + ' ' + plural(all.length,'замер','замера','замеров');

    var wrap = $('#gWrap', view);
    if (!all.length){ wrap.innerHTML = emptyHtml(c); bindSegs(); return; }

    wrap.innerHTML =
      metricsHtml(all) +
      ctrlHtml() +
      '<div class="g-card acc"><div class="g-h"><span class="t" id="gChartTitle">График</span><span class="m" id="gChartMeta"></span></div><div id="gChartHost"></div><div class="g-sparks" id="gSparks"></div></div>' +
      tableHtml(all) +
      '<div class="g-card"><div class="g-h"><span class="t">Действия</span></div><div class="g-btn-row">' +
        '<button class="g-btn g-btn-lime" data-g="add">＋ Добавить замер</button>' +
        '<button class="g-btn g-btn-out" data-g="csv">⬇ Экспорт CSV</button>' +
        '<button class="g-btn g-btn-out" data-g="copy">Скопировать таблицу</button>' +
      '</div><div class="g-note" style="margin-top:12px"><b>Важно.</b> ИМТ у детей оценивается по центильным таблицам с учётом возраста и пола — это делает врач. Трекер показывает только динамику и не ставит диагнозов.</div></div>';

    bindSegs();
    drawMain();
    drawSparks(all);
    renderTable(all);
  }

  function emptyHtml(c){
    var counts = c && c.healthCard ? {
      v: (c.healthCard.visits||[]).length,
      p: (c.healthCard.vaccines||[]).length,
      n: (c.healthCard.notes||[]).length
    } : { v:0, p:0, n:0 };
    var others = counts.v + counts.p + counts.n;
    return '<div class="g-card acc"><div class="g-empty">' +
      '<div class="em">📈</div><h4>Замеров роста и веса пока нет</h4>' +
      '<p>Добавь первый — и здесь появятся графики динамики, таблица всех замеров и изменения между визитами.</p>' +
      '<button class="g-btn g-btn-lime" data-g="add">＋ Добавить первый замер</button>' +
      '<div class="g-diag"><b>Если ты уже вносила замеры, а их не видно:</b>' +
        '<div class="row"><span>Активный профиль</span><b>' + esc(c && c.name ? c.name : '—') + '</b></div>' +
        '<div class="row"><span>Осмотры / прививки / заметки</span><b>' + counts.v + ' / ' + counts.p + ' / ' + counts.n + '</b></div>' +
        '<div class="row"><span>Замеры роста и веса</span><b>0</b></div>' +
        '<div style="margin-top:8px">' + (others > 0
          ? 'Другие записи в этом профиле есть — значит профиль верный, а замеры роста не сохранились. Проверь, не открыт ли второй ребёнок в меню, и внеси замеры заново.'
          : 'В этом профиле пусто вообще. Скорее всего открыт не тот ребёнок — переключи профиль в меню приложения. Либо восстанови данные из бэкапа через «Экспорт / Импорт JSON» или rescue.html.') + '</div>' +
      '</div></div></div>';
  }

  function metricsHtml(all){
    var last = all[all.length-1];
    return '<div class="g-metrics">' + Object.keys(METRICS).map(function(k){
      var M = METRICS[k], v = last[M.key], d = last[M.delta];
      var cls = k === 'height' ? 'h' : k === 'weight' ? 'w' : 'b';
      var dl = '<span class="dl eq">первый замер</span>';
      if (d !== null && isFinite(d)){
        var sign = d > 0.049 ? 'up' : d < -0.049 ? 'dn' : 'eq';
        var arrow = sign === 'up' ? '▲' : sign === 'dn' ? '▼' : '＝';
        dl = '<span class="dl ' + sign + '">' + arrow + ' ' + (d > 0 ? '+' : '') + fmt(d, M.dec) + (M.unit ? ' ' + M.unit : '') + '</span>';
      }
      return '<button class="g-metric ' + cls + (S.metric === k ? ' on' : '') + '" data-g="metric" data-m="' + k + '">' +
        '<div class="lb">' + M.icon + ' ' + M.label + '</div>' +
        '<div class="vl">' + (isFinite(v) ? fmt(v, M.dec) : '—') + (M.unit ? '<small>' + M.unit + '</small>' : '') + '</div>' +
        dl +
        '<div class="sb">' + fmtDate(last.date) + (last.days ? ' · +' + last.days + ' ' + plural(last.days,'день','дня','дней') : '') + '</div>' +
      '</button>';
    }).join('') + '</div>';
  }

  function ctrlHtml(){
    return '<div class="g-card"><div class="g-h"><span class="t">Настройки графиков</span></div><div class="g-ctrl">' +
      '<div class="g-seg" id="gSegMetric"><span class="g-seg-ind"></span>' +
        Object.keys(METRICS).map(function(k){ return '<button data-g="metric" data-m="' + k + '" class="' + (S.metric === k ? 'on' : '') + '">' + METRICS[k].label + '</button>'; }).join('') +
      '</div>' +
      '<div class="g-seg sm" id="gSegPeriod"><span class="g-seg-ind"></span>' +
        Object.keys(PERIODS).map(function(k){ return '<button data-g="period" data-p="' + k + '" class="' + (S.period === k ? 'on' : '') + '">' + PERIODS[k] + '</button>'; }).join('') +
      '</div>' +
      '<div class="g-toggles">' +
        tg('grid','Сетка') + tg('dots','Точки') + tg('labels','Значения') + tg('trend','Линия тренда') +
      '</div>' +
    '</div></div>';
  }
  function tg(k, label){ return '<button class="g-tg' + (S[k] ? ' on' : '') + '" data-g="toggle" data-k="' + k + '"><span class="dot"></span>' + label + '</button>'; }

  /* ===== ГРАФИКИ ===== */
  function seriesFor(list, key){
    return list.filter(function(r){ return isFinite(r[key]); }).map(function(r){ return { x: parseK(r.date).getTime(), y: r[key], r: r }; });
  }
  function niceStep(range, target){
    var raw = range / Math.max(1, target);
    var mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    var norm = raw / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return step * mag;
  }
  function buildChart(list, key, opts){
    var M = METRICS[key], pts = seriesFor(list, key);
    var W = 640, H = opts.mini ? 120 : 300;
    var pL = opts.mini ? 8 : 46, pR = opts.mini ? 8 : 18, pT = opts.mini ? 10 : 22, pB = opts.mini ? 10 : 34;
    if (!pts.length) return { html:'', pts:[], W:W, H:H };
    var ys = pts.map(function(p){ return p.y; });
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var padY = (maxY - minY) * 0.22 || Math.max(0.6, maxY * 0.04);
    var y0 = minY - padY, y1 = maxY + padY;
    var xs = pts.map(function(p){ return p.x; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    if (maxX === minX){ minX -= 86400000 * 15; maxX += 86400000 * 15; }
    var X = function(v){ return pL + (v - minX) / (maxX - minX) * (W - pL - pR); };
    var Y = function(v){ return pT + (y1 - v) / (y1 - y0) * (H - pT - pB); };

    var body = '';
    if (!opts.mini && S.grid){
      var step = niceStep(y1 - y0, 4);
      for (var v = Math.ceil(y0/step)*step; v <= y1; v += step){
        body += '<line x1="'+pL+'" y1="'+Y(v).toFixed(1)+'" x2="'+(W-pR)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--g-line)" stroke-width="1" stroke-dasharray="2 5"/>' +
                '<text x="'+(pL-8)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--g-mut2)">'+fmt(v, step < 1 ? 1 : 0)+'</text>';
      }
      var nT = Math.min(pts.length, 6);
      for (var i = 0; i < nT; i++){
        var idx = Math.round(i * (pts.length - 1) / Math.max(1, nT - 1));
        var px = X(pts[idx].x);
        body += '<text x="'+px.toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--g-mut2)">'+fmtShort(pts[idx].r.date)+'</text>';
      }
    }

    var line = '';
    if (pts.length > 1){
      var d = 'M' + X(pts[0].x).toFixed(1) + ',' + Y(pts[0].y).toFixed(1);
      for (var j = 0; j < pts.length - 1; j++){
        var p0 = pts[j-1] || pts[j], p1 = pts[j], p2 = pts[j+1], p3 = pts[j+2] || p2;
        var c1x = X(p1.x) + (X(p2.x)-X(p0.x))/6, c1y = Y(p1.y) + (Y(p2.y)-Y(p0.y))/6;
        var c2x = X(p2.x) - (X(p3.x)-X(p1.x))/6, c2y = Y(p2.y) - (Y(p3.y)-Y(p1.y))/6;
        d += ' C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+X(p2.x).toFixed(1)+','+Y(p2.y).toFixed(1);
      }
      line = d;
      if (!opts.mini){
        body += '<path d="'+d+' L'+X(pts[pts.length-1].x).toFixed(1)+','+(H-pB)+' L'+X(pts[0].x).toFixed(1)+','+(H-pB)+' Z" fill="url(#gArea_'+key+')" opacity=".9"/>';
      }
      body += '<path class="g-line" d="'+d+'" fill="none" stroke="var('+M.color+')" stroke-width="'+(opts.mini?2:3)+'" stroke-linecap="round" stroke-linejoin="round"/>';
    }

    if (!opts.mini && S.trend && pts.length > 2){
      var n = pts.length, sx = 0, sy = 0, sxy = 0, sxx = 0;
      pts.forEach(function(p){ var t = (p.x - minX)/86400000; sx += t; sy += p.y; sxy += t*p.y; sxx += t*t; });
      var den = n*sxx - sx*sx;
      if (Math.abs(den) > 1e-6){
        var a = (n*sxy - sx*sy)/den, b = (sy - a*sx)/n;
        var t0 = (pts[0].x - minX)/86400000, t1 = (pts[n-1].x - minX)/86400000;
        body += '<line x1="'+X(pts[0].x).toFixed(1)+'" y1="'+Y(a*t0+b).toFixed(1)+'" x2="'+X(pts[n-1].x).toFixed(1)+'" y2="'+Y(a*t1+b).toFixed(1)+'" stroke="var(--g-amber)" stroke-width="2" stroke-dasharray="7 5" opacity=".85"/>';
      }
    }

    if (opts.mini || S.dots){
      pts.forEach(function(p, i){
        var cx = X(p.x).toFixed(1), cy = Y(p.y).toFixed(1);
        if (opts.mini){
          body += '<circle cx="'+cx+'" cy="'+cy+'" r="2.6" fill="var('+M.color+')"/>';
        } else {
          body += '<g class="g-pt" data-i="'+i+'" style="cursor:pointer">' +
            '<circle cx="'+cx+'" cy="'+cy+'" r="13" fill="var('+M.color+')" opacity=".14"/>' +
            '<circle cx="'+cx+'" cy="'+cy+'" r="6.5" fill="var(--g-card)" stroke="var('+M.color+')" stroke-width="2.6"/>' +
            '<circle cx="'+cx+'" cy="'+cy+'" r="3" fill="var('+M.color+')"/>' +
            (S.labels ? '<text x="'+cx+'" y="'+(Y(p.y)-15).toFixed(1)+'" text-anchor="middle" font-size="10.5" font-weight="800" fill="var('+M.color+')">'+fmt(p.y, M.dec)+'</text>' : '') +
          '</g>';
        }
      });
    }

    var defs = '<defs><linearGradient id="gArea_'+key+'" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="var('+M.color+')" stop-opacity=".22"/>' +
      '<stop offset="1" stop-color="var('+M.color+')" stop-opacity="0"/></linearGradient></defs>';

    var html = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+M.label+'">' + defs + body + '</svg>';
    return { html: html, pts: pts, W: W, H: H, X: X, Y: Y };
  }

  var mainChart = null;
  function drawMain(){
    var host = $('#gChartHost', view); if (!host) return;
    var list = filtered(), M = METRICS[S.metric];
    var pts = seriesFor(list, S.metric);
    $('#gChartTitle', view).textContent = M.label + ' · динамика';
    $('#gChartMeta', view).textContent = pts.length + ' ' + plural(pts.length,'точка','точки','точек') + ' · ' + PERIODS[S.period].toLowerCase();
    if (!pts.length){
      host.innerHTML = '<div class="g-chartbox"><div class="g-empty-chart"><div class="em">📉</div><p>Нет данных для этой метрики в выбранном периоде.</p></div></div>';
      mainChart = null; return;
    }
    var ch = buildChart(list, S.metric, { mini:false });
    mainChart = ch;
    host.innerHTML = '<div class="g-chartbox" id="gBox">' + ch.html + '<div class="g-tip" id="gTip"></div></div>' +
      '<div class="g-legend">' +
        '<span><i style="background:var('+M.color+')"></i>' + M.label.toLowerCase() + (M.unit ? ', ' + M.unit : '') + '</span>' +
        (S.trend ? '<span><i style="background:repeating-linear-gradient(90deg,var(--g-amber) 0 5px,transparent 5px 9px)"></i>тренд</span>' : '') +
        '<span style="margin-left:auto;color:var(--g-mut2)">нажми на точку — подробности</span>' +
      '</div>';
    var box = $('#gBox', host);
    box.addEventListener('click', function(e){
      var g = e.target.closest('.g-pt');
      var tip = $('#gTip', box);
      if (!g){ tip.classList.remove('show'); return; }
      var p = ch.pts[+g.dataset.i]; if (!p) return;
      var r = p.r;
      tip.innerHTML = '<b>' + fmt(p.y, M.dec) + (M.unit ? ' ' + M.unit : '') + '</b> · ' + fmtShort(r.date) +
        '<div class="sub">' + (ageAt((child()||{}).birthDate, r.date) || 'возраст не указан') + '</div>' +
        (isFinite(r.height) && isFinite(r.weight) ? '<div class="sub">' + fmt(r.height,1) + ' см · ' + fmt(r.weight,1) + ' кг · ИМТ ' + fmt(r.bmi,1) + '</div>' : '');
      var svg = box.querySelector('svg'), sr = svg.getBoundingClientRect(), br = box.getBoundingClientRect();
      var scale = sr.width / ch.W;
      var px = ch.X(p.x) * scale + (sr.left - br.left);
      var py = ch.Y(p.y) * scale + (sr.top - br.top);
      tip.classList.add('show');
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.max(6, Math.min(px - tw/2, br.width - tw - 6)) + 'px';
      tip.style.top = (py - th - 14 < 4 ? py + 16 : py - th - 14) + 'px';
      sfx('pop'); hap(6);
    });
    if (!RM){
      var path = box.querySelector('.g-line');
      if (path && path.getTotalLength){
        try {
          var len = path.getTotalLength();
          path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
          path.getBoundingClientRect();
          path.style.transition = 'stroke-dashoffset .95s cubic-bezier(.22,1,.36,1)';
          path.style.strokeDashoffset = '0';
          setTimeout(function(){ path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; path.style.transition = ''; }, 1100);
        } catch(err){}
      }
      $$('.g-pt', box).forEach(function(g, i){
        try {
          g.style.transformBox = 'fill-box'; g.style.transformOrigin = 'center';
          g.animate([{ opacity:0, transform:'scale(.3)' }, { opacity:1, transform:'scale(1)' }],
            { duration:340, delay:220 + i*55, easing:'cubic-bezier(.34,1.56,.64,1)', fill:'backwards' });
        } catch(err){}
      });
    }
  }

  function drawSparks(all){
    var host = $('#gSparks', view); if (!host) return;
    host.innerHTML = Object.keys(METRICS).map(function(k){
      var M = METRICS[k], ch = buildChart(all, k, { mini:true });
      var pts = seriesFor(all, k);
      var v = pts.length ? pts[pts.length-1].y : NaN;
      return '<div class="g-sparkcard"><div class="lb">' + M.label + (isFinite(v) ? ' · ' + fmt(v, M.dec) + (M.unit ? ' ' + M.unit : '') : '') + '</div>' +
        (ch.html || '<div style="height:38px;display:grid;place-items:center;color:var(--g-mut2);font-size:12px">нет данных</div>') + '</div>';
    }).join('');
  }

  /* ===== ТАБЛИЦА ===== */
  function tableHtml(all){
    return '<div class="g-card"><div class="g-h"><span class="t">История замеров</span>' +
      '<button class="g-btn g-btn-out g-btn-sm" data-g="sort" style="margin-left:auto">' + (S.sort === 'new' ? '↓ Сначала новые' : '↑ Сначала старые') + '</button></div>' +
      '<div class="g-tablewrap"><table class="g-table"><thead><tr>' +
        '<th>Дата</th><th>Возраст</th><th>Рост, см</th><th>Δ</th><th>Вес, кг</th><th>Δ</th><th>ИМТ</th><th></th>' +
      '</tr></thead><tbody id="gTbody"></tbody></table></div></div>';
  }
  function renderTable(all){
    var tb = $('#gTbody', view); if (!tb) return;
    var list = all.slice();
    if (S.sort === 'new') list.reverse();
    var dob = (child()||{}).birthDate;
    function delta(v, dec, unit){
      if (v === null || !isFinite(v)) return '<span class="d-eq">—</span>';
      var c = v > 0.049 ? 'd-up' : v < -0.049 ? 'd-dn' : 'd-eq';
      return '<span class="'+c+'">' + (v > 0 ? '+' : '') + fmt(v, dec) + '</span>';
    }
    tb.innerHTML = list.map(function(r){
      return '<tr>' +
        '<td class="date" data-l="Дата">' + fmtDate(r.date) + '</td>' +
        '<td data-l="Возраст">' + esc(ageAt(dob, r.date) || '—') + '</td>' +
        '<td class="num" data-l="Рост">' + (isFinite(r.height) ? fmt(r.height,1) : '—') + '</td>' +
        '<td data-l="Δ рост">' + delta(r.dH,1) + '</td>' +
        '<td class="num" data-l="Вес">' + (isFinite(r.weight) ? fmt(r.weight,1) : '—') + '</td>' +
        '<td data-l="Δ вес">' + delta(r.dW,1) + '</td>' +
        '<td class="num" data-l="ИМТ">' + (isFinite(r.bmi) ? fmt(r.bmi,1) : '—') + '</td>' +
        '<td class="acts-cell"><div class="acts">' +
          '<button class="g-ibtn" data-g="edit" data-id="'+esc(r.id)+'" aria-label="Изменить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4z"/></svg></button>' +
          '<button class="g-ibtn del" data-g="del" data-id="'+esc(r.id)+'" aria-label="Удалить"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  /* ===== СЕГМЕНТЫ ===== */
  function placeSeg(el){
    if (!el || !el.offsetParent) return;
    var on = el.querySelector('button.on'), ind = el.querySelector('.g-seg-ind');
    if (on && ind){ ind.style.width = on.offsetWidth + 'px'; ind.style.transform = 'translateX(' + (on.offsetLeft - 4) + 'px)'; }
  }
  function placeSegs(){ placeSeg($('#gSegMetric', view)); placeSeg($('#gSegPeriod', view)); }
  function bindSegs(){ requestAnimationFrame(placeSegs); if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeSegs); }

  /* ===== ОБРАБОТЧИКИ ЭКРАНА ===== */
  function onViewClick(e){
    var b = e.target.closest('[data-g]'); if (!b) return;
    var a = b.dataset.g;
    if (a === 'close') return close();
    if (a === 'add') return openSheet(null);
    if (a === 'edit') return openSheet(b.dataset.id);
    if (a === 'del') return removeRow(b.dataset.id);
    if (a === 'metric'){ S.metric = b.dataset.m; renderAll(); sfx('tap'); hap(6); return; }
    if (a === 'period'){ S.period = b.dataset.p; renderAll(); sfx('tap'); hap(6); return; }
    if (a === 'toggle'){ S[b.dataset.k] = !S[b.dataset.k]; renderAll(); sfx('pop'); hap(6); return; }
    if (a === 'sort'){ S.sort = S.sort === 'new' ? 'old' : 'new'; renderAll(); sfx('tap'); return; }
    if (a === 'csv') return exportCSV();
    if (a === 'copy') return copyTable();
  }

  /* ===== ФОРМА ===== */
  var editId = null;
  function openSheet(id){
    build();
    editId = id || null;
    var rec = id ? raw().find(function(r){ return r.id === id; }) : null;
    var today = keyOf(new Date());
    $('#gSheetBody', sheet).innerHTML =
      '<h3>' + (rec ? 'Изменить замер' : 'Новый замер') + '</h3>' +
      '<div class="sub">' + esc((child()||{}).name || 'Ребёнок') + ' · данные сохранятся в карточку здоровья</div>' +
      '<div class="g-err" id="gErr"></div>' +
      '<div class="g-field"><label>Дата замера</label><input type="date" id="gFDate" value="' + esc(rec ? rec.date : today) + '"></div>' +
      '<div class="g-two">' +
        '<div class="g-field"><label>Рост, см</label><input type="text" inputmode="decimal" id="gFH" placeholder="92" value="' + (rec && rec.height != null ? esc(String(rec.height).replace('.',',')) : '') + '"></div>' +
        '<div class="g-field"><label>Вес, кг</label><input type="text" inputmode="decimal" id="gFW" placeholder="13,4" value="' + (rec && rec.weight != null ? esc(String(rec.weight).replace('.',',')) : '') + '"></div>' +
      '</div>' +
      '<div class="g-live" id="gLive"><div class="t">Индекс массы тела</div><div class="v" id="gLiveV">—</div><div class="h" id="gLiveH">Введи рост и вес</div></div>' +
      '<div class="g-sheet-foot">' +
        '<button class="g-btn g-btn-out" data-gs="cancel">Отмена</button>' +
        '<button class="g-btn g-btn-lime" data-gs="save">' + (rec ? 'Сохранить' : 'Добавить') + '</button>' +
      '</div>';
    sheet.classList.add('open');
    updateLive();
    setTimeout(function(){ var f = $('#gFDate', sheet); if (f && !rec) { var h = $('#gFH', sheet); if (h) h.focus({ preventScroll:true }); } }, 260);
    sfx('open'); hap(8);
  }
  function closeSheet(){ if (sheet) sheet.classList.remove('open'); editId = null; }
  function onSheetClick(e){
    if (e.target === sheet) return closeSheet();
    var b = e.target.closest('[data-gs]'); if (!b) return;
    if (b.dataset.gs === 'cancel') return closeSheet();
    if (b.dataset.gs === 'save') return saveForm();
  }
  function onSheetInput(e){
    if (e.target.id === 'gFH' || e.target.id === 'gFW' || e.target.id === 'gFDate') updateLive();
  }
  function updateLive(){
    var h = num(($('#gFH', sheet)||{}).value), w = num(($('#gFW', sheet)||{}).value);
    var v = $('#gLiveV', sheet), t = $('#gLiveH', sheet);
    if (!v) return;
    if (h > 0 && w > 0){
      var bmi = w / Math.pow(h/100, 2);
      v.textContent = fmt(bmi, 1);
      var d = ($('#gFDate', sheet)||{}).value;
      var age = ageAt((child()||{}).birthDate, d);
      t.textContent = (age ? age + ' · ' : '') + 'оценку по центилям делает врач';
    } else { v.textContent = '—'; t.textContent = 'Введи рост и вес'; }
  }
  function showErr(msg){
    var e = $('#gErr', sheet); if (!e) return;
    e.textContent = msg; e.classList.remove('show'); void e.offsetWidth; e.classList.add('show');
    sfx('del'); hap([25,40,25]);
  }
  function saveForm(){
    var c = ensure(); if (!c) return showErr('Профиль ребёнка не найден');
    var date = ($('#gFDate', sheet)||{}).value;
    var h = num(($('#gFH', sheet)||{}).value);
    var w = num(($('#gFW', sheet)||{}).value);
    if (!date) return showErr('Укажи дату замера');
    if (!isFinite(h) && !isFinite(w)) return showErr('Введи хотя бы рост или вес');
    if (isFinite(h) && (h < 30 || h > 220)) return showErr('Рост должен быть от 30 до 220 см');
    if (isFinite(w) && (w < 1 || w > 150)) return showErr('Вес должен быть от 1 до 150 кг');
    var arr = c.healthCard.growth;
    if (editId){
      var r = arr.find(function(x){ return x.id === editId; });
      if (!r) return showErr('Запись не найдена');
      r.date = date;
      if (isFinite(h)) r.height = Math.round(h*10)/10; else delete r.height;
      if (isFinite(w)) r.weight = Math.round(w*10)/10; else delete r.weight;
    } else {
      var dup = arr.find(function(x){ return x.date === date; });
      if (dup){
        dup.date = date;
        if (isFinite(h)) dup.height = Math.round(h*10)/10;
        if (isFinite(w)) dup.weight = Math.round(w*10)/10;
        toast('Замер за эту дату обновлён ✓', 'info');
      } else {
        var rec = { id: uid(), date: date };
        if (isFinite(h)) rec.height = Math.round(h*10)/10;
        if (isFinite(w)) rec.weight = Math.round(w*10)/10;
        arr.push(rec);
      }
    }
    persist(); closeSheet(); renderAll();
    if (!editId) toast('Замер добавлен ✓'); else toast('Замер обновлён ✓');
    try { if (window.EOGMotion && EOGMotion.confetti && !editId) EOGMotion.confetti(); } catch(e){}
  }
  function removeRow(id){
    var c = ensure(); if (!c) return;
    var arr = c.healthCard.growth;
    var i = arr.findIndex(function(r){ return r.id === id; });
    if (i < 0) return;
    var snap = arr[i], pos = i;
    if (!confirm('Удалить замер от ' + fmtDate(snap.date) + '?')) return;
    arr.splice(i, 1);
    persist(); renderAll();
    toast('Замер удалён', 'info', function(){
      var cc = ensure(); if (!cc) return;
      cc.healthCard.growth.splice(Math.min(pos, cc.healthCard.growth.length), 0, snap);
      persist(); renderAll(); toast('Замер возвращён ✓');
    });
  }

  /* ===== ЭКСПОРТ ===== */
  function tableText(){
    var all = rows(), dob = (child()||{}).birthDate;
    var head = ['Дата','Возраст','Рост, см','Вес, кг','ИМТ','Δ рост','Δ вес'];
    var lines = [head.join('\t')];
    all.forEach(function(r){
      lines.push([
        fmtDate(r.date),
        ageAt(dob, r.date) || '',
        isFinite(r.height) ? fmt(r.height,1) : '',
        isFinite(r.weight) ? fmt(r.weight,1) : '',
        isFinite(r.bmi) ? fmt(r.bmi,1) : '',
        r.dH !== null && isFinite(r.dH) ? fmt(r.dH,1) : '',
        r.dW !== null && isFinite(r.dW) ? fmt(r.dW,1) : ''
      ].join('\t'));
    });
    return lines.join('\n');
  }
  function exportCSV(){
    var all = rows();
    if (!all.length) return toast('Нет замеров для экспорта', 'err');
    var dob = (child()||{}).birthDate;
    var rowsCsv = [['Дата','Возраст','Рост (см)','Вес (кг)','ИМТ','Изменение роста','Изменение веса'].join(';')];
    all.forEach(function(r){
      rowsCsv.push([
        r.date, ageAt(dob, r.date) || '',
        isFinite(r.height) ? fmt(r.height,1) : '',
        isFinite(r.weight) ? fmt(r.weight,1) : '',
        isFinite(r.bmi) ? fmt(r.bmi,1) : '',
        r.dH !== null && isFinite(r.dH) ? fmt(r.dH,1) : '',
        r.dW !== null && isFinite(r.dW) ? fmt(r.dW,1) : ''
      ].join(';'));
    });
    var blob = new Blob(['\uFEFF' + rowsCsv.join('\r\n')], { type:'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rost-ves-' + ((child()||{}).name || 'rebenok') + '-' + keyOf(new Date()) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2500);
    toast('CSV скачан ✓');
  }
  function copyTable(){
    var txt = tableText();
    function ok(){ toast('Таблица скопирована ✓'); }
    function fail(){ toast('Не вышло скопировать', 'err'); }
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(ok).catch(function(){ fb() ? ok() : fail(); });
    } else { fb() ? ok() : fail(); }
    function fb(){
      try {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.readOnly = true; ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
        var r = document.execCommand('copy'); ta.remove(); return r;
      } catch(e){ return false; }
    }
  }

  /* ===== ФИКС ПРОКРУТКИ СПИСКОВ ЗДОРОВЬЯ (страховка к CSS) ===== */
  function fitModals(){
    var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    ['#healthListModal','#healthFormModal'].forEach(function(sel){
      var m = document.querySelector(sel);
      if (!m || !m.classList.contains('show')) return;
      var card = m.querySelector('.copy-opts-card');
      if (card){
        card.style.maxHeight = Math.round(vh * 0.88) + 'px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.overflow = 'hidden';
      }
      var list = m.querySelector('.hc-list') || m.querySelector('#hlList');
      if (list){
        list.style.flex = '1 1 auto';
        list.style.minHeight = '0';
        list.style.overflowY = 'auto';
        list.style.webkitOverflowScrolling = 'touch';
        list.style.touchAction = 'pan-y';
      }
    });
  }
  function watchModals(){
    var mo = new MutationObserver(function(muts){
      var need = false;
      muts.forEach(function(m){
        if (m.type === 'attributes' && m.attributeName === 'class'){
          var t = m.target;
          if (t.id === 'healthListModal' || t.id === 'healthFormModal') need = true;
        }
        if (m.type === 'childList'){
          var t2 = m.target;
          if (t2.closest && (t2.closest('#healthListModal') || t2.closest('#healthFormModal'))) need = true;
        }
      });
      if (need) requestAnimationFrame(fitModals);
    });
    ['#healthListModal','#healthFormModal'].forEach(function(sel){
      var m = document.querySelector(sel);
      if (m) mo.observe(m, { attributes:true, childList:true, subtree:true });
    });
    document.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('#healthListModal, #healthFormModal')) setTimeout(fitModals, 60);
    }, true);
  }

  /* ===== ПЕРЕХВАТ ПЛИТКИ «РОСТ И ВЕС» ===== */
  function intercept(){
    document.addEventListener('click', function(e){
      var tile = e.target.closest && e.target.closest('[data-hc-add="growth"], [data-hc-type="growth"], [data-growth-open]');
      if (!tile) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      open();
    }, true);
  }

  /* ===== СТАРТ ===== */
  function init(){
    build();
    intercept();
    watchModals();
    fitModals();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.EOGGrowth = {
    version: '1.0',
    open: open,
    close: close,
    refresh: function(){ if (S.open) renderAll(); fitModals(); },
    exportCSV: exportCSV,
    count: function(){ return rows().length; }
  };
})();
