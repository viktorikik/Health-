/* ============================ СТАТИСТИКА И АНАЛИТИКА ============================ */
const statsEl = document.getElementById('stats');
const analyticsEl = document.getElementById('analytics');
let currentPeriod = 'month';

function renderStats(){
  const { y, m } = view; const total = new Date(y, m+1, 0).getDate();
  let sick = 0, healthy = 0, garden = 0, feverDays = 0, maxT = 0, entries = 0, medsCount = 0; const sym = {}; const days = getActiveChild().days;
  for (let d = 1; d <= total; d++){
    const k = `${y}-${pad(m+1)}-${pad(d)}`; const r = days[k]; if (!r) continue;
    if (r.status === 'sick') sick++; if (r.status === 'ok') healthy++; if (r.garden) garden++;
    medsCount += (r.meds || []).length; const ts = r.temps || [];
    if (ts.length){ entries += ts.length; const mx = Math.max(...ts.map(t => t.value)); if (mx > maxT) maxT = mx; if (mx >= 37.5) feverDays++; }
    (r.symptoms || []).forEach(id => { if (id !== 'fever') sym[id] = (sym[id] || 0) + 1; });
  }
  const top = Object.entries(sym).sort((a,b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => { const s = SYMPTOMS.find(x => x.id === id); return s ? `${s.label.toLowerCase()} · ${n}` : ''; }).filter(Boolean);
  statsEl.innerHTML = `
    <div class="stat"><span class="sval" style="color:var(--coral)">${sick}</span><span class="slab">дней болел</span></div>
    <div class="stat"><span class="sval" style="color:var(--sage)">${garden}</span><span class="slab">дней в садике</span></div>
    <div class="stat"><span class="sval" style="color:#8aa63a">${healthy}</span><span class="slab">дней здоров</span></div>
    <div class="stat"><span class="sval">${feverDays}</span><span class="slab">дней с температурой</span></div>
    <div class="stat"><span class="sval">${medsCount}</span><span class="slab">препаратов</span></div>
    <div class="stat"><span class="sval">${maxT ? fmtT(maxT) + '°' : '—'}</span><span class="slab">максимум</span></div>
    <div class="stat wide"><div class="bar"><i style="width:${total ? Math.min(100, sick/total*100) : 0}%"></i></div><div class="slab" style="margin-top:8px">${MONTHS[m]}: болел <strong>${sick}</strong> из ${total} дней${total ? ` · ${Math.round(sick/total*100)}%` : ''}${entries ? ` · ${entries} замер(ов)` : ''}</div></div>
    <div class="stat wide"><div class="slab" style="margin-bottom:8px">Частые симптомы</div>${top.length ? `<div class="chips">${top.map(t => `<span class="pill">${t}</span>`).join('')}</div>` : '<span class="muted small">Пока нет данных</span>'}</div>
  `;
}

function updateHeroMeta(){
  const { y, m } = view; const total = new Date(y, m+1, 0).getDate(); let sick = 0, garden = 0; const days = getActiveChild().days;
  for (let d = 1; d <= total; d++){ const k = `${y}-${pad(m+1)}-${pad(d)}`; const r = days[k]; if (!r) continue; if (r.status === 'sick') sick++; if (r.garden) garden++; }
  let html = `<span class="meta-pill">${MONTHS[m]} ${y}</span>`;
  if (sick) html += `<span class="meta-pill meta-coral">${sick} ${plural(sick, 'день', 'дня', 'дней')} болезни</span>`;
  if (garden) html += `<span class="meta-pill meta-sage">${garden} ${plural(garden, 'день', 'дня', 'дней')} в садике</span>`;
  if (!sick && !garden) html += `<span class="meta-pill meta-muted">пока без отметок</span>`;
  document.getElementById('heroMeta').innerHTML = html;
}

function renderBarChart(labels, values, color){
  const W = 340, H = 150; const padL = 8, padR = 8, padT = 14, padB = 24;
  const plotW = W - padL - padR; const plotH = H - padT - padB; const maxV = Math.max(1, ...values);
  const rawBarW = plotW / Math.max(1, labels.length); const barW = Math.min(52, rawBarW * 0.82);
  const totalW = barW * labels.length; const startX = padL + (plotW - totalW) / 2;
  const step = labels.length > 1 ? totalW / (labels.length - 1) : 0;
  const cx = i => labels.length === 1 ? padL + plotW / 2 : startX + i * step;
  let grid = ''; for (let g = 0; g <= 4; g++){ const val = Math.round(maxV * g / 4); const yy = padT + plotH - (val / maxV) * plotH; grid += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W-padR}" y2="${yy.toFixed(1)}" stroke="currentColor" stroke-width="0.5" opacity="0.1"/>`; }
  let bars = '';
  labels.forEach((lbl, i) => {
    const v = values[i]; const x = cx(i) - barW / 2; const h = (v / maxV) * plotH; const y = padT + plotH - h;
    if (v > 0){ bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${color}" opacity="0.85"/>`; bars += `<text x="${cx(i).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.8" font-weight="700">${v}</text>`; }
    else { bars += `<rect x="${x.toFixed(1)}" y="${(padT + plotH - 2).toFixed(1)}" width="${barW.toFixed(1)}" height="2" rx="1" fill="${color}" opacity="0.2"/>`; }
    if (labels.length <= 12){ bars += `<text x="${cx(i).toFixed(1)}" y="${H - padB + 13}" font-size="8" text-anchor="middle" fill="currentColor" opacity="0.6">${lbl}</text>`; }
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img">${grid}${bars}</svg>`;
}

function renderSymptomBars(list, color, maxItems){
  if (!list.length) return ''; const items = list.slice(0, maxItems || 8); const W = 340, rowH = 22;
  const padL = 110, padR = 32, padT = 4, padB = 4; const H = items.length * rowH + padT + padB; const plotW = W - padL - padR;
  const maxV = Math.max(...items.map(([, n]) => n)); let rows = '';
  items.forEach(([id, n], i) => {
    const s = SYMPTOMS.find(x => x.id === id); if (!s) return;
    const y = padT + i * rowH; const barW = (n / maxV) * plotW; const label = s.label.length > 14 ? s.label.slice(0, 13) + '…' : s.label;
    rows += `<text x="${padL - 6}" y="${y + rowH / 2 + 3}" font-size="10" text-anchor="end" fill="currentColor" opacity="0.85">${esc(label)}</text>`;
    rows += `<rect x="${padL}" y="${y + 4}" width="${plotW}" height="${rowH - 10}" rx="4" fill="currentColor" opacity="0.06"/>`;
    rows += `<rect x="${padL}" y="${y + 4}" width="${barW.toFixed(1)}" height="${rowH - 10}" rx="4" fill="${color}" opacity="0.8"/>`;
    rows += `<text x="${padL + plotW + 6}" y="${y + rowH / 2 + 3}" font-size="10" fill="currentColor" opacity="0.8" font-weight="700">${n}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" style="display:block;width:100%;height:auto">${rows}</svg>`;
}

function computeSickDaysSeries(mode){
  const labels = [], values = []; const days = getActiveChild().days; const anchor = safeParseK(getActiveChild().chartAnchor || keyOf(new Date()));
  if (mode === 'week'){
    const dow = (anchor.getDay() + 6) % 7; const monday = new Date(anchor); monday.setDate(anchor.getDate() - dow);
    for (let i = 0; i < 7; i++){ const d = new Date(monday); d.setDate(monday.getDate() + i); const k = keyOf(d); const rec = days[k]; labels.push(WD_SHORT[i]); values.push(rec && rec.status === 'sick' ? 1 : 0); }
  } else if (mode === 'month'){
    const y = anchor.getFullYear(), m = anchor.getMonth(); const total = new Date(y, m+1, 0).getDate(); const weeks = Math.ceil(total / 7);
    for (let w = 0; w < weeks; w++){
      const start = w * 7 + 1; const end = Math.min((w + 1) * 7, total); let count = 0;
      for (let d = start; d <= end; d++){ const k = `${y}-${pad(m+1)}-${pad(d)}`; if (days[k] && days[k].status === 'sick') count++; }
      labels.push(`${start}–${end}`); values.push(count);
    }
  } else {
    const y = anchor.getFullYear();
    for (let m = 0; m < 12; m++){
      let count = 0; const total = new Date(y, m+1, 0).getDate();
      for (let d = 1; d <= total; d++){ const k = `${y}-${pad(m+1)}-${pad(d)}`; if (days[k] && days[k].status === 'sick') count++; }
      labels.push(MONTHS_G_SHORT[m]); values.push(count);
    }
  }
  return { labels, values };
}

function chartTitle(mode){
  const anchor = safeParseK(getActiveChild().chartAnchor || keyOf(new Date()));
  if (mode === 'week'){
    const dow = (anchor.getDay() + 6) % 7; const monday = new Date(anchor); monday.setDate(anchor.getDate() - dow);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    if (monday.getMonth() === sunday.getMonth()) return `Неделя ${monday.getDate()}–${sunday.getDate()} ${MONTHS_G_SHORT[monday.getMonth()]}`;
    return `Неделя ${monday.getDate()} ${MONTHS_G_SHORT[monday.getMonth()]} — ${sunday.getDate()} ${MONTHS_G_SHORT[sunday.getMonth()]}`;
  }
  if (mode === 'month') return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  return `Год ${anchor.getFullYear()}`;
}
function chartSubtitle(mode){
  if (mode === 'week') return 'Дни болезни по дням недели (Пн–Вс)';
  if (mode === 'month') return 'Сколько дней болезни в каждой неделе месяца (1–7, 8–14, …)';
  return 'Сколько дней болезни в каждом месяце года';
}
function shiftChart(dir){
  const anchor = safeParseK(getActiveChild().chartAnchor || keyOf(new Date()));
  if (chartMode === 'week') anchor.setDate(anchor.getDate() + 7 * dir); else if (chartMode === 'month') anchor.setMonth(anchor.getMonth() + dir); else anchor.setFullYear(anchor.getFullYear() + dir);
  getActiveChild().chartAnchor = keyOf(anchor); save(); renderAnalytics();
}
function filterSymptomList(list){
  const filter = getActiveChild().symptomFilter || 'all'; if (filter === 'all') return list;
  return list.filter(([id]) => { const s = SYMPTOMS.find(x => x.id === id); return s && s.cat === filter; });
}
function buildSymFilterChips(targetEl, currentValue, onChange){
  targetEl.innerHTML = SYM_CATS.map(c => `<button type="button" data-cat="${c.id}" class="${c.id === currentValue ? 'on' : ''}">${c.label}</button>`).join('');
  targetEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { targetEl.querySelectorAll('button').forEach(b => b.classList.remove('on')); btn.classList.add('on'); onChange(btn.dataset.cat); });
  });
}
function buildChartViewToggle(containerEl){
  containerEl.innerHTML = `<button type="button" data-m="week" class="${chartMode === 'week' ? 'on' : ''}">Неделя</button><button type="button" data-m="month" class="${chartMode === 'month' ? 'on' : ''}">Месяц</button><button type="button" data-m="year" class="${chartMode === 'year' ? 'on' : ''}">Год</button>`;
  containerEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => { chartMode = btn.dataset.m; getActiveChild().chartMode = chartMode; save(); renderAnalytics(); });
  });
}

analyticsEl.addEventListener('click', e => { const btn = e.target.closest('[data-chart-nav]'); if (!btn) return; shiftChart(parseInt(btn.dataset.chartNav, 10)); });

function renderAnalytics(){
  const period = currentPeriod; let startK, endK, label;
  if (period === 'month'){ const total = new Date(view.y, view.m+1, 0).getDate(); startK = `${view.y}-${pad(view.m+1)}-01`; endK = `${view.y}-${pad(view.m+1)}-${pad(total)}`; label = MONTHS[view.m] + ' ' + view.y; }
  else if (period === 'year'){ startK = `${view.y}-01-01`; endK = `${view.y}-12-31`; label = String(view.y); }
  else { const keys = Object.keys(getActiveChild().days).sort(); startK = keys[0] || keyOf(new Date()); endK = keys[keys.length-1] || keyOf(new Date()); label = 'Всё время'; }

  const filtered = {}; const days = getActiveChild().days; Object.keys(days).forEach(k => { if (k >= startK && k <= endK) filtered[k] = days[k]; });
  const episodes = getEpisodes(filtered); const sickDays = Object.values(filtered).filter(r => r.status === 'sick').length; const healthyDays = Object.values(filtered).filter(r => r.status === 'ok').length;
  const avgLen = episodes.length ? episodes.reduce((s,e) => s + e.days, 0) / episodes.length : 0;
  const diagCount = {}; episodes.forEach(ep => { ep.diagnoses.forEach(d => { diagCount[d] = (diagCount[d] || 0) + 1; }); });
  const diagList = Object.entries(diagCount).sort((a,b) => b[1] - a[1]); const noDiag = episodes.filter(ep => ep.diagnoses.length === 0).length;
  const symCount = {}; Object.values(filtered).forEach(r => { (r.symptoms || []).forEach(id => { if (id !== 'fever') symCount[id] = (symCount[id] || 0) + 1; }); });
  const symList = filterSymptomList(Object.entries(symCount).sort((a,b) => b[1] - a[1]));
  const periodLabel = period === 'month' ? 'за месяц' : (period === 'year' ? 'за год' : 'за всё время');
  const sickSeries = computeSickDaysSeries(chartMode);
  const sickChartHtml = sickSeries.labels.length ? renderBarChart(sickSeries.labels, sickSeries.values, '#F27691') : '<p class="muted small" style="margin:8px 0">Нет данных за период</p>';
  const symChartHtml = symList.length ? renderSymptomBars(symList, '#687B59') : '<p class="muted small" style="margin:8px 0">Симптомов по этому фильтру пока нет</p>';

  analyticsEl.innerHTML = `
    <div class="stat wide" style="margin-bottom:12px"><span class="sval" style="color:var(--coral)">${episodes.length}</span><span class="slab">эпизодов болезни ${periodLabel} · ${label}</span></div>
    <div class="stats-wrap" style="margin-top:0">
      <div class="stat"><span class="sval">${sickDays}</span><span class="slab">дней болезни</span></div>
      <div class="stat"><span class="sval" style="color:#8aa63a">${healthyDays}</span><span class="slab">дней здоров</span></div>
      <div class="stat"><span class="sval">${avgLen ? avgLen.toFixed(1).replace('.', ',') : '—'}</span><span class="slab">средняя длительность</span></div>
      <div class="stat"><span class="sval">${episodes.length ? Math.max(...episodes.map(e=>e.days)) : 0}</span><span class="slab">макс. длительность</span></div>
      <div class="stat"><span class="sval">${noDiag}</span><span class="slab">без диагноза</span></div>
    </div>
    <div class="section-label" style="margin-top:18px">График болезней</div>
    <div class="chart-box">
      <div class="chart-nav"><button class="chart-nav-btn" type="button" data-chart-nav="-1" aria-label="Предыдущий период">←</button><div class="chart-nav-title" id="chartTitle">${chartTitle(chartMode)}</div><button class="chart-nav-btn" type="button" data-chart-nav="1" aria-label="Следующий период">→</button></div>
      <div class="chart-sub" id="chartSub">${chartSubtitle(chartMode)}</div><div class="chart-view-toggle" id="chartViewToggle"></div>${sickChartHtml}
    </div>
    <div class="section-label">Частота симптомов</div><div class="symptom-filter" id="symFilter"></div>
    <div class="chart-box"><div class="chart-title">Топ симптомов ${periodLabel}</div>${symChartHtml}</div>
    <div class="section-label">Болезни</div>${diagList.length ? `<div class="chips">${diagList.map(([d, n]) => `<span class="pill coral">${esc(d)} · ${n}</span>`).join('')}</div>` : '<p class="muted small" style="margin:6px 0">Диагнозов пока нет.</p>'}
    <div class="section-label">Список эпизодов</div>${episodes.length ? `<div class="ep-list">${episodes.slice().reverse().map(ep => `<div class="ep-item"><div class="ep-main"><div class="ep-dates">${fmtDate(ep.start)}${ep.start !== ep.end ? ' — ' + fmtDate(ep.end) : ''}</div><div class="ep-diag">${ep.diagnoses.length ? esc(ep.diagnoses.join(', ')) : '<span class="muted">без диагноза</span>'}</div></div><span class="ep-len">${ep.days} дн.</span></div>`).join('')}</div>` : '<p class="muted small" style="margin:6px 0">Эпизодов пока нет</p>'}
  `;

  const symFilterEl = document.getElementById('symFilter');
  buildSymFilterChips(symFilterEl, getActiveChild().symptomFilter || 'all', cat => { getActiveChild().symptomFilter = cat; save(); renderAnalytics(); });
  const chartToggleEl = document.getElementById('chartViewToggle'); buildChartViewToggle(chartToggleEl);
}

/* ============================ PDF ЭКСПОРТ ============================ */
let pdfPeriodMode = 'month'; let pdfSymptomFilter = 'all'; let pdfOptions = { ...DEFAULT_PDF_OPTIONS };

function openPdfOpts(){
  pdfPeriodMode = currentPeriod;
  document.querySelectorAll('#pdfPeriod button').forEach(b => b.classList.toggle('on', b.dataset.v === pdfPeriodMode));
  document.getElementById('pdfCustom').classList.toggle('hidden', pdfPeriodMode !== 'custom');
  if (!document.getElementById('pdfDateFrom').value){
    const m = view.m + 1; document.getElementById('pdfDateFrom').value = `${view.y}-${pad(m)}-01`;
    const total = new Date(view.y, view.m+1, 0).getDate(); document.getElementById('pdfDateTo').value = `${view.y}-${pad(m)}-${pad(total)}`;
  }
  document.querySelectorAll('#pdfOpts input[data-pdf]').forEach(cb => { cb.checked = !!pdfOptions[cb.dataset.pdf]; });
  pdfSymptomFilter = getActiveChild().symptomFilter || 'all';
  buildSymFilterChips(document.getElementById('pdfSymFilter'), pdfSymptomFilter, cat => { pdfSymptomFilter = cat; });
  document.getElementById('pdfOpts').classList.add('show'); syncBodyScroll();
}
function hidePdfOpts(){ document.getElementById('pdfOpts').classList.remove('show'); syncBodyScroll(); }
document.getElementById('pdfBtn').addEventListener('click', openPdfOpts);
document.getElementById('pdfCancel').addEventListener('click', hidePdfOpts);
document.getElementById('pdfOpts').addEventListener('click', e => { if (e.target === document.getElementById('pdfOpts')) hidePdfOpts(); });

document.querySelectorAll('#pdfPeriod button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#pdfPeriod button').forEach(b => b.classList.remove('on')); btn.classList.add('on');
    pdfPeriodMode = btn.dataset.v; document.getElementById('pdfCustom').classList.toggle('hidden', pdfPeriodMode !== 'custom');
  });
});

document.getElementById('pdfGenerate').addEventListener('click', () => {
  const opts = {}; document.querySelectorAll('#pdfOpts input[data-pdf]').forEach(cb => { opts[cb.dataset.pdf] = cb.checked; });
  if (!Object.values(opts).some(v => v)){ toast('Выбери хотя бы один раздел'); return; }
  pdfOptions = { ...DEFAULT_PDF_OPTIONS, ...opts };
  let startK, endK, label;
  if (pdfPeriodMode === 'month'){ const total = new Date(view.y, view.m+1, 0).getDate(); startK = `${view.y}-${pad(view.m+1)}-01`; endK = `${view.y}-${pad(view.m+1)}-${pad(total)}`; label = MONTHS[view.m] + ' ' + view.y; }
  else if (pdfPeriodMode === 'year'){ startK = `${view.y}-01-01`; endK = `${view.y}-12-31`; label = String(view.y); }
  else if (pdfPeriodMode === 'all'){ const keys = Object.keys(getActiveChild().days).sort(); startK = keys[0] || keyOf(new Date()); endK = keys[keys.length-1] || keyOf(new Date()); label = 'Всё время'; }
  else { const from = document.getElementById('pdfDateFrom').value; const to = document.getElementById('pdfDateTo').value; if (!from || !to){ toast('Укажи обе даты'); return; } startK = from <= to ? from : to; endK = from <= to ? to : from; label = `${fmtDateShort(startK)} — ${fmtDateShort(endK)}`; }
  hidePdfOpts(); generatePdf(startK, endK, label);
});

function generatePdf(startK, endK, periodLabel){
  const filtered = {}; const days = getActiveChild().days; Object.keys(days).forEach(k => { if (k >= startK && k <= endK) filtered[k] = days[k]; });
  const episodes = getEpisodes(filtered); const sickDays = Object.values(filtered).filter(r => r.status === 'sick').length; const healthyDays = Object.values(filtered).filter(r => r.status === 'ok').length; const gardenDays = Object.values(filtered).filter(r => r.garden).length;
  const avgLen = episodes.length ? episodes.reduce((s,e) => s + e.days, 0) / episodes.length : 0;
  const diagCount = {}; episodes.forEach(ep => { ep.diagnoses.forEach(d => { diagCount[d] = (diagCount[d] || 0) + 1; }); });
  const diagList = Object.entries(diagCount).sort((a,b) => b[1] - a[1]); const noDiag = episodes.filter(ep => ep.diagnoses.length === 0).length;
  const symCount = {}; Object.values(filtered).forEach(r => { (r.symptoms || []).forEach(id => { if (id !== 'fever') symCount[id] = (symCount[id] || 0) + 1; }); });
  let symList = Object.entries(symCount).sort((a,b) => b[1] - a[1]);
  if (pdfSymptomFilter !== 'all'){ symList = symList.filter(([id]) => { const s = SYMPTOMS.find(x => x.id === id); return s && s.cat === pdfSymptomFilter; }); }
  const sickSeries = (function(){
    const startD = parseK(startK), endD = parseK(endK); const daysDiff = Math.round((endD - startD) / 86400000) + 1;
    if (daysDiff <= 62){
      const labels = [], values = []; const weeks = Math.ceil(daysDiff / 7);
      for (let w = 0; w < weeks; w++){ let count = 0; let sDay = w * 7 + 1; let eDay = Math.min((w + 1) * 7, daysDiff);
        for (let i = 0; i < 7; i++){ const d = new Date(startD); d.setDate(startD.getDate() + w * 7 + i); if (d > endD) break; const k = keyOf(d); if (filtered[k] && filtered[k].status === 'sick') count++; }
        labels.push(`${sDay}–${eDay}`); values.push(count); }
      return { labels, values };
    }
    const monthMap = {}; Object.keys(filtered).forEach(k => { if (filtered[k].status === 'sick'){ const mk = k.slice(0, 7); monthMap[mk] = (monthMap[mk] || 0) + 1; } });
    const labels = [], values = []; Object.keys(monthMap).sort().forEach(mk => { const [y, m] = mk.split('-').map(Number); labels.push(MONTHS_G_SHORT[m-1] + ' ' + String(y).slice(2)); values.push(monthMap[mk]); });
    return { labels, values };
  })();

  const allTemps = []; Object.keys(filtered).sort().forEach(k => { (filtered[k].temps || []).forEach(t => { allTemps.push({ date: k, time: t.time, value: t.value, med: t.med, helped: t.helped }); }); });
  const allMeds = []; Object.keys(filtered).sort().forEach(k => { (filtered[k].meds || []).forEach(m => { allMeds.push({ date: k, time: m.time, med: m.med, dose: m.dose, note: m.note, customName: m.customName, courseId: m.courseId }); }); });
  const notes = []; Object.keys(filtered).sort().forEach(k => { if (filtered[k].note && filtered[k].note.trim()) notes.push({ date: k, note: filtered[k].note.trim(), diag: filtered[k].diagnosis || '' }); });

  const parts = [];
  parts.push(`<header class="pdf-header"><div class="pdf-brand">«Ещё одна галочка»</div><h1>Адаптация к садику · ${esc(getActiveChild().name || 'Без имени')}</h1><p class="pdf-sub">Период: <strong>${periodLabel}</strong> · сформировано ${new Date().toLocaleDateString('ru-RU')}</p></header>`);
  if (pdfOptions.summary){ parts.push(`<section class="pdf-section"><h2>Сводка</h2><div class="pdf-stats"><div class="pdf-stat"><span class="pdf-sv">${episodes.length}</span><span class="pdf-sl">эпизодов</span></div><div class="pdf-stat"><span class="pdf-sv">${sickDays}</span><span class="pdf-sl">дней болезни</span></div><div class="pdf-stat"><span class="pdf-sv">${healthyDays}</span><span class="pdf-sl">дней здоров</span></div><div class="pdf-stat"><span class="pdf-sv">${gardenDays}</span><span class="pdf-sl">дней в садике</span></div><div class="pdf-stat"><span class="pdf-sv">${avgLen ? avgLen.toFixed(1).replace('.', ',') : '—'}</span><span class="pdf-sl">ср. длит., дн.</span></div><div class="pdf-stat"><span class="pdf-sv">${episodes.length ? Math.max(...episodes.map(e => e.days)) : 0}</span><span class="pdf-sl">макс. длит.</span></div><div class="pdf-stat"><span class="pdf-sv">${noDiag}</span><span class="pdf-sl">без диагноза</span></div><div class="pdf-stat"><span class="pdf-sv">${allMeds.length}</span><span class="pdf-sl">препаратов</span></div></div></section>`); }
  if (pdfOptions.sickChart && sickSeries.labels.length){ parts.push(`<section class="pdf-section"><h2>График болезней</h2><p class="pdf-muted" style="margin:0 0 8pt">Дни болезни по неделям месяца (1–7, 8–14, …) или по месяцам</p>${renderBarChart(sickSeries.labels, sickSeries.values, '#F27691')}</section>`); }
  if (pdfOptions.symChart && symList.length){ parts.push(`<section class="pdf-section"><h2>Частота симптомов${pdfSymptomFilter !== 'all' ? ' · ' + (SYM_CATS.find(c => c.id === pdfSymptomFilter)?.label || '') : ''}</h2>${renderSymptomBars(symList, '#687B59', 15)}</section>`); }
  if (pdfOptions.diagnoses){ parts.push(`<section class="pdf-section"><h2>Болезни</h2>${diagList.length ? `<ul class="pdf-diag-list">${diagList.map(([d, n]) => `<li><strong>${esc(d)}</strong> — ${n} ${plural(n, 'эпизод', 'эпизода', 'эпизодов')}</li>`).join('')}</ul>` : '<p class="pdf-muted">Диагнозов за период нет.</p>'}</section>`); }
  if (pdfOptions.episodes){ parts.push(`<section class="pdf-section"><h2>Список эпизодов</h2>${episodes.length ? `<table class="pdf-table"><thead><tr><th>Начало</th><th>Конец</th><th>Дней</th><th>Диагнозы</th></tr></thead><tbody>${episodes.slice().reverse().map(ep => `<tr><td>${fmtDateShort(ep.start)}</td><td>${ep.start !== ep.end ? fmtDateShort(ep.end) : '—'}</td><td>${ep.days}</td><td>${ep.diagnoses.length ? esc(ep.diagnoses.join(', ')) : '<span class="pdf-muted">без диагноза</span>'}</td></tr>`).join('')}</tbody></table>` : '<p class="pdf-muted">Эпизодов за период нет.</p>'}</section>`); }
  if (pdfOptions.temps && allTemps.length){ parts.push(`<section class="pdf-section"><h2>Замеры температуры</h2><table class="pdf-table"><thead><tr><th>Дата</th><th>Время</th><th>Темп.</th><th>Лекарство</th><th>Помогло</th></tr></thead><tbody>${allTemps.map(t => { const med = MEDS.find(m => m.id === t.med); const help = HELP.find(h => h.id === t.helped); return `<tr><td>${fmtDateShort(t.date)}</td><td>${t.time}</td><td><strong>${fmtT(t.value)}°</strong></td><td>${med && med.id ? esc(med.label) : '—'}</td><td>${help && help.id ? esc(help.label.toLowerCase()) : '—'}</td></tr>`; }).join('')}</tbody></table></section>`); }
  if (pdfOptions.meds && allMeds.length){ parts.push(`<section class="pdf-section"><h2>Журнал препаратов</h2><table class="pdf-table"><thead><tr><th>Дата</th><th>Время</th><th>Препарат</th><th>Доза</th><th>Заметка</th></tr></thead><tbody>${allMeds.map(m => { const displayName = medDisplayName(m); const showNote = m.note && m.note.trim() && m.med !== 'other' && !m.customName; return `<tr><td>${fmtDateShort(m.date)}</td><td>${m.time}</td><td><strong>${esc(displayName)}</strong></td><td>${m.dose ? esc(m.dose) : '—'}</td><td>${showNote ? esc(m.note) : '—'}</td></tr>`; }).join('')}</tbody></table></section>`); }
  if (pdfOptions.notes && notes.length){ parts.push(`<section class="pdf-section"><h2>Заметки по дням</h2>${notes.map(n => `<div class="pdf-note-item"><div class="pdf-note-date">${fmtDate(n.date)}${n.diag ? ' · ' + esc(n.diag) : ''}</div><div class="pdf-note-text">${esc(n.note).replace(/\n/g, '<br>')}</div></div>`).join('')}</section>`); }

  const fullHtml = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Аналитика · ${periodLabel}</title><style>
  * { box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #292724; background: #fff; margin: 0; padding: 24px; line-height: 1.5; font-size: 12pt; }
  .pdf-page { max-width: 720px; margin: 0 auto; } .pdf-header { border-bottom: 2pt solid #DCEB32; padding-bottom: 12pt; margin-bottom: 18pt; }
  .pdf-brand { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.12em; color: #756f65; font-weight: 800; } .pdf-header h1 { font-size: 22pt; margin: 4pt 0 6pt; letter-spacing: -0.02em; } .pdf-sub { color: #756f65; font-size: 10pt; margin: 0; }
  .pdf-section { margin-bottom: 18pt; page-break-inside: avoid; } .pdf-section h2 { font-size: 14pt; margin: 0 0 8pt; padding-left: 10pt; position: relative; letter-spacing: -0.01em; } .pdf-section h2::before { content: ''; position: absolute; left: 0; top: 3pt; bottom: 3pt; width: 4pt; background: #DCEB32; border-radius: 2pt; }
  .pdf-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt; } .pdf-stat { padding: 8pt 10pt; border: 0.5pt solid #dfd4c4; border-radius: 6pt; background: #fffaf1; }
  .pdf-sv { display: block; font-size: 18pt; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; color: #292724; } .pdf-sl { font-size: 8.5pt; color: #756f65; }
  .pdf-table { width: 100%; border-collapse: collapse; font-size: 10pt; border: 0.5pt solid #dfd4c4; border-radius: 6pt; overflow: hidden; } .pdf-table th { background: #fffaf1; padding: 6pt 8pt; text-align: left; border-bottom: 0.5pt solid #dfd4c4; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; color: #756f65; } .pdf-table td { padding: 6pt 8pt; border-bottom: 0.5pt solid #ece0d0; vertical-align: top; } .pdf-table tr:last-child td { border-bottom: 0; }
  .pdf-diag-list { padding-left: 16pt; margin: 0; } .pdf-diag-list li { margin-bottom: 3pt; } .pdf-muted { color: #a49c90; font-style: italic; }
  .pdf-note-item { padding: 6pt 10pt; border-left: 3pt solid #DCEB32; background: #fffaf1; margin-bottom: 6pt; border-radius: 0 4pt 4pt 0; page-break-inside: avoid; } .pdf-note-date { font-weight: 700; font-size: 10pt; margin-bottom: 2pt; } .pdf-note-text { font-size: 10pt; color: #4a4139; }
  svg { display: block; width: 100%; height: auto; max-width: 480px; } .pdf-footer { margin-top: 24pt; padding-top: 12pt; border-top: 0.5pt solid #dfd4c4; color: #a49c90; font-size: 9pt; text-align: center; }
  @media print { body { padding: 0; font-size: 11pt; } .pdf-page { max-width: 100%; } .pdf-section { page-break-inside: avoid; } .pdf-table { page-break-inside: auto; } tr { page-break-inside: avoid; } @page { size: A4; margin: 15mm 12mm; } }
</style></head><body><div class="pdf-page">${parts.join('')}<div class="pdf-footer">«Ещё одна галочка» · Трекер адаптации к садику · ${new Date().toLocaleDateString('ru-RU')}</div></div><script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });<\/script></body></html>`;
  const win = window.open('', '_blank');
  if (!win){ const blob = new Blob([fullHtml], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'analytics-' + startK + '_' + endK + '.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Браузер заблокировал окно — файл сохранён'); return; }
  win.document.open(); win.document.write(fullHtml); win.document.close();
}
