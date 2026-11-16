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
    if (labels.length <= 12){ bars += `<text x="${cx(i).toFixed(1)}" y="${H - padB + 13}" font-size="8
