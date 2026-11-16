/* ============================ КАРТОЧКА ЗДОРОВЬЯ ============================ */
function ensureHealthCard() {
  const child = getActiveChild();
  if (!child.healthCard) {
    child.healthCard = { visits: [], vaccines: [], notes: [], growth: [] };
    save();
  }
  return child.healthCard;
}

function openHealthCard() {
  ensureHealthCard();
  document.getElementById('healthCardView').classList.add('show');
  syncBodyScroll();
  renderHealthCard();
}

function closeHealthCard() {
  document.getElementById('healthCardView').classList.remove('show');
  syncBodyScroll();
}

function renderHealthCard() {
  const hc = ensureHealthCard();
  const childName = getActiveChild().name || 'ребёнка';

  document.getElementById('hcTitle').innerHTML = `Карточка здоровья <br><span style="color:var(--muted); font-size:0.75em; font-weight:600">${esc(childName)}</span>`;

  document.getElementById('hcVisitCount').textContent = `${hc.visits.length} записей`;
  document.getElementById('hcVaccineCount').textContent = `${hc.vaccines.length} записей`;
  document.getElementById('hcNoteCount').textContent = `${hc.notes.length} записей`;
  document.getElementById('hcGrowthCount').textContent = hc.growth.length ? `${hc.growth.length} замеров` : 'Нет данных';

  const allRecords = [
    ...hc.visits.map(v => ({...v, type: 'visit', label: v.doctor})),
    ...hc.vaccines.map(v => ({...v, type: 'vaccine', label: v.name})),
    ...hc.notes.map(v => ({...v, type: 'note', label: v.text})),
    ...hc.growth.map(v => ({...v, type: 'growth', label: `Рост: ${v.height} см, Вес: ${v.weight} кг`}))
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const recentListEl = document.getElementById('hcRecentList');
  if (allRecords.length) {
    recentListEl.innerHTML = allRecords.map(r => `
      <div class="hc-recent-item">
        <div class="hc-recent-dot"></div>
        <div><div class="hc-recent-date">${fmtDateShort(r.date)} · ${r.label || 'Запись'}</div><div class="hc-recent-text">${esc(r.notes || r.text || '')}</div></div>
      </div>
    `).join('');
  } else {
    recentListEl.innerHTML = '<p class="muted small">Пока нет записей. Нажми на любую карточку выше, чтобы добавить.</p>';
  }

  renderGrowthChart(hc.growth);
}

function renderGrowthChart(growth) {
  const chartWrap = document.getElementById('hcGrowthChartWrap');
  if (!growth || growth.length < 2) { chartWrap.innerHTML = ''; return; }
  const sorted = growth.slice().sort((a,b) => a.date.localeCompare(b.date));
  const W = 340, H = 160; const padL = 30, padR = 10, padT = 20, padB = 30; const chartW = W - padL - padR; const chartH = H - padT - padB;
  const maxH = Math.max(...sorted.map(g => g.height)) + 5; const minH = Math.min(...sorted.map(g => g.height)) - 5;
  const maxW = Math.max(...sorted.map(g => g.weight)) + 2; const minW = Math.min(...sorted.map(g => g.weight)) - 2;
  const xStep = chartW / (sorted.length - 1);
  let pathH = ''; let pathW = ''; let dotsH = ''; let dotsW = '';
  sorted.forEach((g, i) => {
    const x = padL + i * xStep; const yH = padT + chartH - ((g.height - minH) / (maxH - minH)) * chartH; const yW = padT + chartH - ((g.weight - minW) / (maxW - minW)) * chartH;
    if (i === 0) { pathH = `M ${x} ${yH}`; pathW = `M ${x} ${yW}`; } else { pathH += ` L ${x} ${yH}`; pathW += ` L ${x} ${yW}`; }
    dotsH += `<circle cx="${x}" cy="${yH}" r="4" fill="var(--sage)"/>`; dotsW += `<circle cx="${x}" cy="${yW}" r="4" fill="var(--coral)"/>`;
  });
  let labels = '';
  sorted.forEach((g, i) => { if (i === 0 || i === sorted.length - 1) { const x = padL + i * xStep; labels += `<text x="${x}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--muted)">${fmtDateShort(g.date)}</text>`; } });
  chartWrap.innerHTML = `<div class="hc-chart-title">Динамика роста и веса</div><svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block; margin-top:10px;"><path d="${pathH}" fill="none" stroke="var(--sage)" stroke-width="2.5" stroke-linejoin="round"/>${dotsH}<path d="${pathW}" fill="none" stroke="var(--coral)" stroke-width="2.5" stroke-linejoin="round"/>${dotsW}${labels}</svg><div class="hc-chart-legend"><span><i style="background:var(--sage)"></i> Рост (см)</span><span><i style="background:var(--coral)"></i> Вес (кг)</span></div>`;
}

function openHealthForm(type) {
  const modal = document.getElementById('healthFormModal'); const title = document.getElementById('hfTitle'); const fields = document.getElementById('hfFields');
  document.getElementById('hfType').value = type; document.getElementById('hfDate').value = keyOf(new Date()); fields.innerHTML = '';
  if (type === 'visit') { title.textContent = 'Добавить осмотр'; fields.innerHTML = `<div class="section-label" style="margin-top:0">Врач / Специальность</div><input class="inp" id="hfDoctor" placeholder="Например, Педиатр" required><div class="section-label">Заметки</div><textarea class="inp" id="hfNotes" rows="2" placeholder="Что сказал врач"></textarea>`; }
  else if (type === 'vaccine') { title.textContent = 'Добавить прививку'; fields.innerHTML = `<div class="section-label" style="margin-top:0">Название вакцины</div><input class="inp" id="hfName" placeholder="Например, Пентаксим" required><div class="section-label">Заметки</div><textarea class="inp" id="hfNotes" rows="2" placeholder="Реакция, серия вакцины"></textarea>`; }
  else if (type === 'note') { title.textContent = 'Добавить заметку'; fields.innerHTML = `<div class="section-label" style="margin-top:0">Текст заметки</div><textarea class="inp" id="hfText" rows="3" placeholder="Например: Аллергия на цитрусовые" required></textarea>`; }
  else if (type === 'growth') { title.textContent = 'Добавить рост и вес'; fields.innerHTML = `<div class="row"><div style="flex:1"><div class="section-label" style="margin-top:0">Рост (см)</div><input class="inp" type="number" step="0.1" id="hfHeight" placeholder="95.5" required></div><div style="flex:1"><div class="section-label" style="margin-top:0">Вес (кг)</div><input class="inp" type="number" step="0.1" id="hfWeight" placeholder="14.2" required></div></div>`; }
  modal.classList.add('show'); syncBodyScroll();
}

function closeHealthForm() { document.getElementById('healthFormModal').classList.remove('show'); if (!document.getElementById('healthCardView').classList.contains('show')) syncBodyScroll(); }

document.getElementById('hfSave').addEventListener('click', () => {
  const type = document.getElementById('hfType').value; const date = document.getElementById('hfDate').value;
  if (!date) { alert('Укажи дату'); return; }
  const hc = ensureHealthCard();
  if (type === 'visit') { const doctor = document.getElementById('hfDoctor').value.trim(); if (!doctor) { alert('Укажи врача'); return; } hc.visits.push({ id: uid(), date, doctor, notes: document.getElementById('hfNotes').value.trim() }); }
  else if (type === 'vaccine') { const name = document.getElementById('hfName').value.trim(); if (!name) { alert('Укажи название'); return; } hc.vaccines.push({ id: uid(), date, name, notes: document.getElementById('hfNotes').value.trim() }); }
  else if (type === 'note') { const text = document.getElementById('hfText').value.trim(); if (!text) { alert('Введи текст'); return; } hc.notes.push({ id: uid(), date, text }); }
  else if (type === 'growth') { const height = parseFloat(document.getElementById('hfHeight').value); const weight = parseFloat(document.getElementById('hfWeight').value); if (isNaN(height) || isNaN(weight)) { alert('Введи корректные числа'); return; } hc.growth.push({ id: uid(), date, height, weight }); }
  save(); closeHealthForm(); renderHealthCard();
});

document.getElementById('openHealthCardBtn').addEventListener('click', openHealthCard);
document.getElementById('hcBackBtn').addEventListener('click', closeHealthCard);
document.getElementById('hfCancel').addEventListener('click', closeHealthForm);
document.getElementById('healthFormModal').addEventListener('click', (e) => { if (e.target === document.getElementById('healthFormModal')) closeHealthForm(); });
document.querySelectorAll('[data-hc-add]').forEach(btn => { btn.addEventListener('click', () => openHealthForm(btn.dataset.hcAdd)); });
