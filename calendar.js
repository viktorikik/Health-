/* ============================ КАЛЕНДАРЬ ============================ */
const daysEl = document.getElementById('days');
const daysWrap = document.getElementById('daysWrap');
const weekDaysEl = document.getElementById('weekDays');
const weekDaysWrap = document.getElementById('weekDaysWrap');
const monthViewEl = document.getElementById('calendarMonthView');
const weekViewEl = document.getElementById('calendarWeekView');
const monthTitle = document.getElementById('monthTitle');
const chartMonth = document.getElementById('chartMonth');
const chartEl = document.getElementById('tempChart');
const doseBar = document.getElementById('doseBar');

const now0 = new Date();
let view = { y: now0.getFullYear(), m: now0.getMonth() };
let selected = keyOf(now0);
let summaryKey = keyOf(now0);
let viewMode = 'month';
let weekAnchor = keyOf(now0);
let chartMode = getActiveChild().chartMode || 'month';

let suppressClick = false;
let dragState = null;
let dragBadgeEl = null;
let copyMode = null; // управляется из panel.js, здесь только для чтения

function dayCats(rec){
  const s = new Set();
  (rec.symptoms || []).forEach(id => { const x = SYMPTOMS.find(v => v.id === id); if (x) s.add(x.cat); });
  if ((rec.temps || []).some(t => t.value >= 37.5)) s.add('fever');
  return [...s];
}

function renderCalendar(){
  const { y, m } = view;
  monthTitle.textContent = MONTHS[m] + ' ' + y;
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const total = new Date(y, m+1, 0).getDate();
  const todayKey = keyOf(new Date());
  const days = getActiveChild().days;
  let html = '';
  for (let i = 0; i < offset; i++) html += '<div class="day blank"></div>';
  for (let d = 1; d <= total; d++){
    const k = `${y}-${pad(m+1)}-${pad(d)}`;
    const rec = days[k];
    const cats = rec ? dayCats(rec) : [];
    const temps = rec && rec.temps && rec.temps.length ? rec.temps.map(t => t.value) : [];
    const maxT = temps.length ? Math.max(...temps) : null;
    const cls = ['day'];
    if (rec && rec.status === 'sick') cls.push('sick');
    else if (rec && rec.status === 'ok') cls.push('ok');
    if (k === todayKey) cls.push('today');
    if (k === selected) cls.push('sel');
    if (copyMode && k === copyMode.fromKey) cls.push('copy-source');
    const hasCourse = hasAnyCourseOnDay(k);
    const marks = (rec && rec.garden ? '<i class="gdot" title="был в садике"></i>' : '')
                + (rec && rec.home   ? '<i class="hdot" title="остался дома"></i>' : '')
                + (hasCourse ? '<span class="cmark" title="есть курс">💊</span>' : '');
    html += `<button type="button" class="${cls.join(' ')}" data-key="${k}" aria-label="${d} ${MONTHS_G[m]}">
      <span class="day-top"><span class="dnum">${d}</span>${maxT !== null ? `<span class="dtemp">${fmtT(maxT)}°</span>` : ''}</span>
      <span class="dots">${cats.map(c => `<i class="dot ${c}"></i>`).join('')}</span>
      ${marks ? `<span class="day-marks">${marks}</span>` : ''}
    </button>`;
  }
  daysEl.innerHTML = html;
}

function renderWeekView(){
  if (!weekAnchor) weekAnchor = selected || keyOf(new Date());
  const anchor = parseK(weekAnchor);
  const dow = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor); monday.setDate(anchor.getDate() - dow);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  monthTitle.textContent = `${monday.getDate()} ${MONTHS_G_SHORT[monday.getMonth()]} — ${sunday.getDate()} ${MONTHS_G_SHORT[sunday.getMonth()]} ${sunday.getFullYear()}`;
  const todayKey = keyOf(new Date());
  const days = getActiveChild().days;
  let html = '';
  for (let i = 0; i < 7; i++){
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const k = keyOf(d); const rec = days[k];
    const temps = rec && rec.temps ? rec.temps.map(t => t.value) : [];
    const maxT = temps.length ? Math.max(...temps) : null;
    const status = rec ? rec.status : null;
    const diag = rec ? rec.diagnosis : '';
    const garden = rec && rec.garden; const home = rec && rec.home;
    const hasCourse = hasAnyCourseOnDay(k);
    const isToday = k === todayKey; const isSel = k === selected;
    const statusCls = status === 'sick' ? 'sick' : status === 'ok' ? 'ok' : 'none';
    const statusLabel = status === 'sick' ? 'Болеет' : status === 'ok' ? 'Здоров' : 'Не отмечено';
    const cls = ['week-day', statusCls];
    if (isToday) cls.push('today'); if (isSel) cls.push('sel');
    if (copyMode && k === copyMode.fromKey) cls.push('copy-source');

    const symLabels = (rec && rec.symptoms ? rec.symptoms.map(id => { const s = SYMPTOMS.find(x => x.id === id); return s ? s.label : ''; }).filter(Boolean) : []);
    let symsText = ''; if (symLabels.length){ symsText = symLabels.slice(0, 3).join(', '); if (symLabels.length > 3) symsText += '…'; }

    html += `<button type="button" class="${cls.join(' ')}" data-key="${k}">
      <div class="wday-date"><span class="wday-name">${WD_SHORT[i]}</span><span class="wday-num">${d.getDate()}</span></div>
      <div class="wday-main"><div class="wday-status">${statusLabel}${diag ? `<span class="wday-diag">· ${esc(diag)}</span>` : ''}</div>
        ${symsText || maxT !== null ? `<div class="wday-meta">${symsText ? `<span class="wday-syms">${esc(symsText)}</span>` : ''}${maxT !== null ? `<span class="wday-temp">${fmtT(maxT)}°</span>` : ''}</div>` : ''}
      </div>
      ${garden || home || hasCourse ? `<div class="wday-badges">${garden ? '<span class="wday-garden">сад</span>' : ''}${home ? '<span class="wday-home">дома</span>' : ''}${hasCourse ? '<span class="wday-course">💊 курс</span>' : ''}</div>` : ''}
    </button>`;
  }
  weekDaysEl.innerHTML = html;
}

/* ============================ КЛИК ПО ДНЮ ============================ */
daysEl.addEventListener('click', e => {
  if (suppressClick) return;
  const btn = e.target.closest('.day');
  if (!btn || btn.classList.contains('blank')) return;
  if (copyMode){
    const { fromKey, options } = copyMode; const toKey = btn.dataset.key;
    exitCopyMode(); if (toKey !== fromKey) copyDayData(fromKey, toKey, options); else toast('Отменено');
    return;
  }
  selected = btn.dataset.key;
  renderCalendar(); renderTempChart(); renderPanel();
  if (isMobile()) openSheet();
});

weekDaysEl.addEventListener('click', e => {
  if (suppressClick) return;
  const btn = e.target.closest('.week-day'); if (!btn) return;
  if (copyMode){
    const { fromKey, options } = copyMode; const toKey = btn.dataset.key;
    exitCopyMode(); if (toKey !== fromKey) copyDayData(fromKey, toKey, options); else toast('Отменено');
    return;
  }
  selected = btn.dataset.key; weekAnchor = selected;
  renderWeekView(); renderTempChart(); renderPanel();
  if (isMobile()) openSheet();
});

/* ============================ DRAG-КОПИРОВАНИЕ ============================ */
const LONG_PRESS_MS = 500; const MOVE_CANCEL_PX = 10;

function onDayPointerDown(e){
  if (copyMode || viewMode !== 'month') return;
  const day = e.target.closest('.day:not(.blank)'); if (!day) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  dragState = {
    fromKey: day.dataset.key, startX: e.clientX, startY: e.clientY, sourceEl: day, pointerId: e.pointerId,
    lastTargetKey: null, rangeKeys: [], active: false, timer: setTimeout(() => beginDrag(), LONG_PRESS_MS)
  };
}
function beginDrag(){
  if (!dragState || dragState.active) return;
  dragState.active = true;
  dragState.sourceEl.classList.add('dragging'); dragState.sourceEl.style.touchAction = 'none';
  if (daysEl) daysEl.style.touchAction = 'none';
  document.body.classList.add('is-dragging');
  try { dragState.sourceEl.setPointerCapture(dragState.pointerId); } catch(err){}
  if (navigator.vibrate){ try { navigator.vibrate(20); } catch(e){} }
}
function onDayPointerMove(e){
  if (!dragState) return;
  const dx = e.clientX - dragState.startX; const dy = e.clientY - dragState.startY;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (!dragState.active){
    if (dist > MOVE_CANCEL_PX){ clearTimeout(dragState.timer); dragState = null; }
    return;
  }
  if (e.cancelable) e.preventDefault();
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const day = el && el.closest('.day:not(.blank)');
  const newKey = day ? day.dataset.key : null;
  if (newKey === dragState.lastTargetKey) return;
  dragState.lastTargetKey = newKey;
  document.querySelectorAll('.day.drag-over').forEach(el => el.classList.remove('drag-over'));
  if (!newKey){ dragState.rangeKeys = []; if (dragBadgeEl) dragBadgeEl.classList.remove('show'); return; }
  const range = datesBetween(dragState.fromKey, newKey);
  dragState.rangeKeys = range;
  range.forEach(k => { if (k === dragState.fromKey) return; const el2 = daysEl.querySelector(`.day[data-key="${k}"]`); if (el2) el2.classList.add('drag-over'); });
  const nTargets = range.length - 1;
  if (nTargets > 0){
    const badge = ensureDragBadge();
    badge.textContent = `→ ${nTargets} ${plural(nTargets, 'день', 'дня', 'дней')}`;
    badge.style.left = e.clientX + 'px'; badge.style.top = e.clientY + 'px'; badge.classList.add('show');
  } else { if (dragBadgeEl) dragBadgeEl.classList.remove('show'); }
}
function onDayPointerUp(e){
  if (!dragState) return; clearTimeout(dragState.timer);
  if (dragState.active){
    if (e.cancelable) e.preventDefault();
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 300);
    const fromKey = dragState.fromKey; const range = dragState.rangeKeys || [];
    const targets = range.filter(k => k !== fromKey);
    endDrag();
    if (targets.length > 0) copyDayDataToKeys(fromKey, targets, getActiveChild().copyOptions || defaultCopyOptions());
    else toast('Отменено');
  }
  dragState = null;
}
function onDayPointerCancel(){ if (!dragState) return; clearTimeout(dragState.timer); endDrag(); dragState = null; }
function endDrag(){
  if (!dragState) return;
  if (dragState.sourceEl){ dragState.sourceEl.classList.remove('dragging'); dragState.sourceEl.style.touchAction = ''; }
  if (daysEl) daysEl.style.touchAction = '';
  document.querySelectorAll('.day.drag-over, .week-day.drag-over').forEach(el => el.classList.remove('drag-over'));
  document.body.classList.remove('is-dragging');
  if (dragBadgeEl) dragBadgeEl.classList.remove('show');
}
daysEl.addEventListener('pointerdown', onDayPointerDown); daysEl.addEventListener('pointermove', onDayPointerMove);
daysEl.addEventListener('pointerup', onDayPointerUp); daysEl.addEventListener('pointercancel', onDayPointerCancel);
daysEl.addEventListener('contextmenu', e => e.preventDefault());

function ensureDragBadge(){
  if (!dragBadgeEl){ dragBadgeEl = document.createElement('div'); dragBadgeEl.className = 'drag-badge'; document.body.appendChild(dragBadgeEl); }
  return dragBadgeEl;
}

/* ============================ СВАЙП ============================ */
function makeSwipeable(el, onSwipeLeft, onSwipeRight, ignoreSelector){
  let track = null;
  el.addEventListener('pointerdown', e => {
    if (ignoreSelector && e.target.closest(ignoreSelector)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    track = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, horizontal: false };
  });
  el.addEventListener('pointermove', e => {
    if (!track || e.pointerId !== track.id) return;
    const dx = e.clientX - track.x; const dy = e.clientY - track.y;
    if (!track.moved && Math.hypot(dx, dy) > 15){
      track.moved = true; track.horizontal = Math.abs(dx) > Math.abs(dy) * 1.3;
      if (track.horizontal && dragState && !dragState.active){ clearTimeout(dragState.timer); dragState = null; }
    }
  });
  el.addEventListener('pointerup', e => {
    if (!track || e.pointerId !== track.id) { track = null; return; }
    const dx = e.clientX - track.x; const dy = e.clientY - track.y;
    if (track.horizontal && Math.abs(dx) > 60){
      if (dx < 0) onSwipeLeft(); else onSwipeRight();
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 300);
    }
    track = null;
  });
  el.addEventListener('pointercancel', () => { track = null; });
}

makeSwipeable(daysWrap, () => shiftPeriod(1, 'right'), () => shiftPeriod(-1, 'left'));
makeSwipeable(weekDaysWrap, () => shiftPeriod(1, 'right'), () => shiftPeriod(-1, 'left'));
makeSwipeable(document.querySelector('main'), () => switchChild(1), () => switchChild(-1), '.days-wrap, #weekDaysWrap, .chart-box, .menu-panel, .copy-opts-backdrop, .pdf-custom, .menu-backdrop');

// НОВЫЙ СВАЙП: листает дни на графике температуры
makeSwipeable(document.querySelector('.chart-box'), () => shiftSelectedDay(1), () => shiftSelectedDay(-1));

function shiftPeriod(dir, slideFrom){
  if (viewMode === 'month'){
    view.m += dir; if (view.m > 11){ view.m = 0; view.y++; } if (view.m < 0) { view.m = 11; view.y--; }
    renderCalendar(); slideAnim(daysEl, slideFrom);
  } else {
    const anchor = weekAnchor ? parseK(weekAnchor) : new Date();
    anchor.setDate(anchor.getDate() + 7 * dir); weekAnchor = keyOf(anchor);
    view = { y: anchor.getFullYear(), m: anchor.getMonth() };
    renderWeekView(); slideAnim(weekDaysEl, slideFrom);
  }
  renderTempChart(); renderStats(); renderAnalytics(); updateHeroMeta();
}

function shiftSelectedDay(dir) {
  if (!selected) return;
  const d = parseK(selected); d.setDate(d.getDate() + dir);
  selected = keyOf(d);
  view = { y: d.getFullYear(), m: d.getMonth() };
  weekAnchor = selected; summaryKey = selected;
  
  if (viewMode === 'month') renderCalendar(); else renderWeekView();
  renderTempChart(); renderPanel(); renderDaySummary();
}

function slideAnim(el, from){
  if (!el) return; el.classList.remove('slide-from-right','slide-from-left'); void el.offsetWidth;
  el.classList.add(from === 'right' ? 'slide-from-right' : 'slide-from-left');
}

/* ============================ ГРАФИК ТЕМПЕРАТУРЫ ============================ */
function renderTempChart(){
  const k = selected; const d = parseK(k);
  chartMonth.textContent = `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  const rec = getActiveChild().days[k];
  const temps = (rec && rec.temps) ? rec.temps.slice().sort((a,b) => a.time.localeCompare(b.time)) : [];

  if (!temps.length){
    chartEl.innerHTML = `<div class="temp-empty"><div class="temp-empty-ico">🌡️</div><div class="temp-empty-txt">В этот день замеров температуры нет</div><div class="temp-empty-sub">Добавь замер в карточке дня, чтобы увидеть график</div></div>`;
    return;
  }

  const vals = temps.map(t => t.value); const minV = Math.min(...vals); const maxV = Math.max(...vals);
  const avgV = vals.reduce((a,b) => a+b, 0) / vals.length;
  const minItem = temps.find(t => t.value === minV); const maxItem = temps.find(t => t.value === maxV);
  const yMin = Math.min(36, minV - 0.2); const yMax = Math.max(39, maxV + 0.2);
  const W = 400, H = 260; const padLeft = 40, padRight = 20, padTop = 20, padBottom = 30;
  const chartW = W - padLeft - padRight; const chartH = H - padTop - padBottom;
  const getM = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  let minM = Math.min(...temps.map(t => getM(t.time))); let maxM = Math.max(...temps.map(t => getM(t.time)));
  let xMin = minM - 60; let xMax = maxM + 60; const MIN_SPAN = 240;
  if (xMax - xMin < MIN_SPAN) { const mid = (xMin + xMax) / 2; xMin = mid - MIN_SPAN / 2; xMax = mid + MIN_SPAN / 2; }
  xMin = Math.max(0, Math.floor(xMin / 60) * 60); xMax = Math.min(24 * 60, Math.ceil(xMax / 60) * 60);

  function tempToY(t) { return padTop + chartH - ((t - yMin) / (yMax - yMin)) * chartH; }
  function timeToX(m) { return padLeft + ((m - xMin) / (xMax - xMin)) * chartW; }
  function getSmoothPath(pts) {
    if (!pts.length) return ''; if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6; const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6; const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  let zonesHtml = '';
  const zones = [
    { from: yMin, to: 37, color: '#4CAF50', label: 'Норма' }, { from: 37, to: 37.5, color: '#FF9800', label: 'Субфебрильная' },
    { from: 37.5, to: 38, color: '#FF5722', label: 'Высокая' }, { from: 38, to: yMax, color: '#F44336', label: 'Опасная' }
  ];
  zones.forEach(z => {
    const f = Math.max(z.from, yMin); const t = Math.min(z.to, yMax); if (f >= t) return;
    const y1 = tempToY(t); const y2 = tempToY(f);
    zonesHtml += `<rect x="${padLeft}" y="${y1}" width="${chartW}" height="${y2 - y1}" fill="${z.color}" opacity="0.06"/>`;
    zonesHtml += `<text x="${padLeft + 6}" y="${y1 + 12}" class="temp-zone-label" fill="${z.color}">${z.label}</text>`;
  });

  let gridHtml = '';
  for (let t = Math.ceil(yMin); t <= yMax; t++) {
    const y = tempToY(t);
    gridHtml += `<line x1="${padLeft}" y1="${y}" x2="${W - padRight}" y2="${y}" class="temp-grid-line"/>`;
    gridHtml += `<text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" class="temp-time-label">${t}</text>`;
  }

  let xLabels = ''; let span = xMax - xMin; let stepMin = 60;
  if (span > 8 * 60) stepMin = 120; if (span > 16 * 60) stepMin = 240;
  for (let m = Math.ceil(xMin / stepMin) * stepMin; m <= xMax; m += stepMin) {
    const x = timeToX(m); const hh = pad(Math.floor(m / 60)); const mm = pad(m % 60);
    xLabels += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="temp-time-label">${hh}:${mm}</text>`;
  }

  let threshHtml = '';
  if (37.5 >= yMin && 37.5 <= yMax) {
    const threshY = tempToY(37.5);
    threshHtml = `<line x1="${padLeft}" y1="${threshY}" x2="${W - padRight}" y2="${threshY}" class="temp-threshold-line"/>`;
  }

  const pts = temps.map(t => ({ x: timeToX(getM(t.time)), y: tempToY(t.value) }));
  const pathD = getSmoothPath(pts);
  const areaD = pathD + ` L ${pts[pts.length-1].x} ${padTop + chartH} L ${pts[0].x} ${padTop + chartH} Z`;

  let dotsHtml = '';
  temps.forEach((t, i) => {
    const x = pts[i].x; const y = pts[i].y; const isHot = t.value >= 37.5;
    const color = isHot ? '#e96478' : (t.value >= 37 ? '#FF9800' : '#4CAF50');
    let pulse = ''; if (isHot) pulse = `<circle cx="${x}" cy="${y}" r="12" fill="${color}" class="temp-point-pulse"/>`;
    dotsHtml += `<g class="temp-data-point" data-i="${i}">${pulse}<circle cx="${x}" cy="${y}" r="10" fill="#fff" stroke="${color}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="5" fill="${color}"/><text x="${x}" y="${y - 16}" text-anchor="middle" class="temp-val-label" fill="${color}">${fmtT(t.value)}</text></g>`;
  });

  chartEl.innerHTML = `
    <div class="temp-stats">
      <div class="temp-stat-card"><div class="temp-stat-label">Мин</div><div class="temp-stat-val" style="color:#4CAF50">${fmtT(minV)}</div><div class="temp-stat-sub">${minItem.time}</div></div>
      <div class="temp-stat-card"><div class="temp-stat-label">Макс</div><div class="temp-stat-val" style="color:#e96478">${fmtT(maxV)}</div><div class="temp-stat-sub">${maxItem.time}</div></div>
      <div class="temp-stat-card"><div class="temp-stat-label">Средняя</div><div class="temp-stat-val" style="color:#FF9800">${fmtT(avgV)}</div><div class="temp-stat-sub">за день</div></div>
    </div>
    <div class="temp-chart-wrap" id="tempChartWrap">
      <svg class="temp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#e96478"/><stop offset="100%" stop-color="#f093a0"/></linearGradient>
          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#e96478" stop-opacity="0.15"/><stop offset="100%" stop-color="#e96478" stop-opacity="0"/></linearGradient>
        </defs>
        ${zonesHtml}${gridHtml}${xLabels}${threshHtml}
        <path d="${areaD}" fill="url(#areaGrad)" style="opacity:0; animation: fadeIn 1s ease 0.5s forwards;"/>
        <path d="${pathD}" class="temp-line-path" stroke="url(#lineGrad)"/>
        ${dotsHtml}
      </svg>
      <div class="temp-tooltip" id="tempTooltip">
        <div class="temp-tooltip-temp" id="ttTemp"></div><div class="temp-tooltip-time" id="ttTime"></div>
        <div class="temp-tooltip-status" id="ttStatus"></div><div class="temp-tooltip-note" id="ttNote"></div>
      </div>
      <button class="temp-add-btn" type="button" data-act="scroll-temp" title="Добавить замер">+</button>
    </div>
  `;

  const wrap = document.getElementById('tempChartWrap'); const tooltip = document.getElementById('tempTooltip');
  wrap.addEventListener('click', e => {
    const point = e.target.closest('.temp-data-point');
    if (!point) { tooltip.classList.remove('show'); return; }
    const i = parseInt(point.dataset.i, 10); const t = temps[i];
    const status = t.value < 37.0 ? { label: 'Норма', cls: 'normal', color: '#4CAF50' } : t.value < 37.5 ? { label: 'Субфебрильная', cls: 'elevated', color: '#FF9800' } : { label: 'Жар', cls: 'high', color: '#e96478' };
    document.getElementById('ttTemp').textContent = fmtT(t.value) + '°C';
    document.getElementById('ttTemp').style.color = status.color;
    document.getElementById('ttTime').textContent = t.time;
    const stEl = document.getElementById('ttStatus'); stEl.textContent = status.label; stEl.className = 'temp-tooltip-status ' + status.cls;
    const noteEl = document.getElementById('ttNote'); const extra = [t.med ? medLabel(t.med) : '', t.helped ? HELP.find(h => h.id === t.helped)?.label : ''].filter(Boolean).join(' · ');
    if (extra) { noteEl.textContent = extra; noteEl.style.display = 'block'; } else { noteEl.style.display = 'none'; }
    const svgRect = wrap.getBoundingClientRect(); const scaleX = svgRect.width / W; const scaleY = svgRect.height / H;
    const xPos = parseFloat(point.querySelector('circle').getAttribute('cx')) * scaleX;
    const yPos = parseFloat(point.querySelector('circle').getAttribute('cy')) * scaleY;
    let tooltipX = xPos; if (tooltipX < 70) tooltipX = 70; if (tooltipX > svgRect.width - 70) tooltipX = svgRect.width - 70;
    tooltip.style.left = tooltipX + 'px'; tooltip.style.top = (yPos - 20) + 'px'; tooltip.classList.add('show');
  });

  const addBtn = wrap.querySelector('[data-act="scroll-temp"]');
  if (addBtn) {
    addBtn.onclick = (e) => {
      e.stopPropagation(); if (isMobile()) openSheet();
      setTimeout(() => { const tempSec = document.getElementById('panel').querySelector('details[data-section="temps"]'); if (tempSec) { tempSec.open = true; tempSec.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 300);
    };
  }
}

/* ============================ ДОЗА ============================ */
function todayDoseInfo(){
  const k = keyOf(new Date()); const rec = getActiveChild().days[k];
  if (!rec || !rec.temps || !rec.temps.length) return null;
  const list = rec.temps.filter(t => medInterval(t.med) > 0).slice().sort((a,b) => a.time.localeCompare(b.time));
  if (!list.length) return null;
  const last = list[list.length - 1]; const med = MEDS.find(x => x.id === last.med); const d = parseK(k);
  const [h, mi] = last.time.split(':').map(Number);
  const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
  const next = new Date(at.getTime() + med.interval * 60000); const diff = next - Date.now();
  if (diff < -30 * 60000) return null; return { med, last, next, diff };
}
function renderDoseBar(){
  const info = todayDoseInfo();
  if (!info){ doseBar.classList.remove('show','wait','ready'); doseBar.innerHTML=''; return; }
  const hhmm = pad(info.next.getHours()) + ':' + pad(info.next.getMinutes());
  let text, cls;
  if (info.diff > 0){ cls = 'wait'; text = `<strong>${info.med.label}</strong> · следующая доза не раньше <strong>${hhmm}</strong> · через <strong>${dur(info.diff)}</strong>`; }
  else { cls = 'ready'; text = `<strong>${info.med.label}</strong> · интервал выдержан, можно давать`; }
  doseBar.className = 'dose-bar show ' + cls; doseBar.innerHTML = `<span class="dose-ico">💊</span><span class="dose-text">${text}</span>`;
}
doseBar.addEventListener('click', () => { selected = keyOf(new Date()); weekAnchor = selected; render(); if (isMobile()) openSheet(); });
