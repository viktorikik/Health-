/* ============================ ПАНЕЛЬ ДНЯ ============================ */
const panelEl = document.getElementById('panel');
let symptomsExpanded = false;

function nextDoseHtml(temps, key){
  const list = temps.filter(t => medInterval(t.med) > 0); if (!list.length) return '';
  const last = list[list.length - 1]; const med = MEDS.find(x => x.id === last.med); const d = parseK(key);
  const [h, mi] = last.time.split(':').map(Number); const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
  const next = new Date(at.getTime() + med.interval * 60000); const diff = next - new Date();
  const hhmm = pad(next.getHours()) + ':' + pad(next.getMinutes());
  const tomorrow = next.getDate() !== at.getDate() || next.getMonth() !== at.getMonth();
  let cls, text;
  if (diff > 0){ cls = 'wait'; text = `следующая доза не раньше <strong>${hhmm}</strong>${tomorrow ? ' (завтра)' : ''} · через <strong>${dur(diff)}</strong>`; }
  else { cls = 'ready'; text = `интервал между дозами выдержан: прошло <strong>${dur(-diff)}</strong>`; }
  return `<div class="nextdose ${cls}" id="nextdose"><div class="nd-top">Последнее: <strong>${med.label}</strong> в ${last.time}${last.value ? ' · ' + fmtT(last.value) + '°' : ''}</div><div class="nd-main">${text}</div></div>`;
}

function tempRow(t){
  const med = MEDS.find(x => x.id === t.med); const help = HELP.find(x => x.id === t.helped);
  return `<div class="trow"><span class="ttime">${t.time}</span><span class="tval">${fmtT(t.value)}°</span><span class="tmed">${med && med.id ? med.label : ''}</span>${help && help.id ? `<span class="thelp ${t.helped}">${help.label.toLowerCase()}</span>` : ''}<button class="iconbtn tiny" type="button" data-act="deltemp" data-id="${t.id}" title="Удалить">×</button></div>`;
}

function medRow(m){
  const displayName = medDisplayName(m); const showNote = m.note && m.note.trim() && m.med !== 'other' && !m.customName;
  const courseIcon = m.courseId ? '<span class="mcourse" title="приём из курса">💊</span>' : '';
  return `<div class="mrow"><span class="mtime">${m.time}</span>${courseIcon}<span class="mname">${esc(displayName)}</span>${m.dose ? `<span class="mdose">${esc(m.dose)}</span>` : ''}${showNote ? `<span class="mnote">${esc(m.note)}</span>` : ''}<button class="iconbtn tiny" type="button" data-act="delmed" data-id="${m.id}" title="Удалить">×</button></div>`;
}

function renderCoursesToday(k){
  const courses = getCoursesForDay(k);
  if (!courses.length) return `<div class="courses-today"><p class="muted small courses-empty">Нет активных курсов на этот день.</p><button class="btn courses-manage-btn" type="button" data-act="open-courses">⚙ Управление курсами</button></div>`;
  let rows = '';
  courses.forEach(course => {
    const times = (course.times || []).slice().sort();
    times.forEach(time => {
      const intake = getCourseIntake(course.id, time, k); const checked = !!intake;
      rows += `<label class="course-check ${checked ? 'checked' : ''}"><input type="checkbox" data-act="course-check" data-course-id="${course.id}" data-time="${time}" ${checked ? 'checked' : ''}><span class="cc-time">${time}</span><span class="cc-name">${esc(course.name)}</span>${course.dose ? `<span class="cc-dose">${esc(course.dose)}</span>` : ''}</label>`;
    });
  });
  return `<div class="courses-today">${rows}<button class="btn courses-manage-btn" type="button" data-act="open-courses">⚙ Управление курсами</button></div>`;
}

function sectionOpen(key, autoDefault){ return sectionIsOpen(key, autoDefault) ? 'open' : ''; }
function sectionHeadHtml(key, label, count){
  const badge = (count > 0) ? `<span class="section-count">${count}</span>` : ''; return `<summary><span>${label}</span>${badge}</summary>`;
}

function renderPanel(){
  if (!selected){ panelEl.innerHTML = `<h3>Выбери день</h3><p class="muted small">Нажми на любую дату в календаре.</p>`; return; }
  const k = selected; const d = parseK(k); const days = getActiveChild().days; const rec = days[k] || {};
  const status = rec.status || ''; const syms = rec.symptoms || [];
  const temps = (rec.temps || []).slice().sort((a,b) => a.time.localeCompare(b.time));
  const meds = (rec.meds  || []).slice().sort((a,b) => a.time.localeCompare(b.time));
  const isToday = k === keyOf(new Date()); const nowTime = pad(new Date().getHours()) + ':' + pad(new Date().getMinutes());
  const diags = allDiagnoses(); const uncheckedCourses = countUncheckedCourses(k);
  const openDiag = sectionOpen('diagnosis', false); const openSyms = sectionOpen('symptoms', true);
  const openTemps = sectionOpen('temps', temps.length > 0); const openCourses = sectionOpen('courses', uncheckedCourses > 0);
  const openMeds = sectionOpen('meds', false); const openNote = sectionOpen('note', false);
  const diagCount = (rec.diagnosis && rec.diagnosis.trim()) ? 1 : 0; const noteCount = (rec.note && rec.note.trim()) ? 1 : 0;

  let visibleSymptoms;
  if (symptomsExpanded) visibleSymptoms = SYMPTOMS;
  else { const top5 = getTopSymptoms(5).map(s => s.id); const visibleIds = new Set([...top5, ...syms]); visibleSymptoms = SYMPTOMS.filter(s => visibleIds.has(s.id)); }
  const hiddenCount = SYMPTOMS.length - visibleSymptoms.length;
  let toggleBtn = '';
  if (symptomsExpanded) toggleBtn = `<button type="button" class="chip-more" data-act="sym-less">← Свернуть</button>`;
  else if (hiddenCount > 0) toggleBtn = `<button type="button" class="chip-more" data-act="sym-more">Другие симптомы (${hiddenCount}) →</button>`;

  const medOptions = MEDS.slice(1).map(x => `<option value="${x.id}">${x.label}</option>`).join('');

  panelEl.innerHTML = `
    <div class="panel-head"><div><div class="eyebrow">${WD_FULL[d.getDay()]}</div><div class="panel-date">${d.getDate()} ${MONTHS_G[d.getMonth()]}</div></div><div class="panel-head-right">${isToday ? '<span class="tag lime">сегодня</span>' : ''}</div></div>
    <div class="seg" role="group" aria-label="Состояние"><button type="button" data-act="status" data-v="ok"   class="${status === 'ok' ? 'on ok' : ''}">Здоров</button><button type="button" data-act="status" data-v="sick" class="${status === 'sick' ? 'on sick' : ''}">Болеет</button></div>
    <label class="check"><input type="checkbox" data-act="garden" ${rec.garden ? 'checked' : ''}><span>Был в садике</span></label>
    <label class="check"><input type="checkbox" data-act="home" ${rec.home ? 'checked' : ''}><span>Остался дома</span></label>

    <details class="day-section" data-section="diagnosis" ${openDiag}>
      ${sectionHeadHtml('diagnosis', 'Диагноз', diagCount)}
      <div class="section-body"><input class="inp" list="diagList" data-act="diagnosis" value="${esc(rec.diagnosis || '')}" placeholder="Например, ОРВИ, ангина…"><datalist id="diagList">${diags.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
    </details>

    <details class="day-section" data-section="symptoms" ${openSyms}>
      ${sectionHeadHtml('symptoms', 'Симптомы', syms.length)}
      <div class="section-body"><div class="chips">${visibleSymptoms.map(s => `<button type="button" class="chip ${syms.includes(s.id) ? 'on' : ''}" data-act="sym" data-id="${s.id}" style="--dotc:${CAT_DOT[s.cat]}">${s.label}</button>`).join('')}${toggleBtn}</div></div>
    </details>

    <details class="day-section" data-section="temps" ${openTemps}>
      ${sectionHeadHtml('temps', 'Температура', temps.length)}
      <div class="section-body">
        <div class="addform">
          <div class="row"><input class="inp" type="time" id="tTime" value="${isToday ? nowTime : '09:00'}" aria-label="Время"><input class="inp" type="text" inputmode="decimal" id="tVal" placeholder="38,5" autocomplete="off" aria-label="Температура"><button class="btn primary btn-add" type="button" data-act="addtemp" aria-label="Добавить замер">+</button></div>
          <div class="row"><select class="inp" id="tMed" aria-label="Лекарство">${MEDS.map(x => `<option value="${x.id}">${x.label}</option>`).join('')}</select><select class="inp" id="tHelp" aria-label="Помогло ли">${HELP.map(x => `<option value="${x.id}">${x.label}</option>`).join('')}</select></div>
        </div>
        <div class="err" id="tErr" hidden></div>
        ${nextDoseHtml(temps, k)}
        <div class="tlist">${temps.length ? temps.map(tempRow).join('') : '<p class="muted small" style="margin:8px 0 0">Пока нет замеров.</p>'}</div>
      </div>
    </details>

    <details class="day-section" data-section="courses" ${openCourses}>
      ${sectionHeadHtml('courses', 'Курсы на сегодня', uncheckedCourses)}
      <div class="section-body">${renderCoursesToday(k)}</div>
    </details>

    <details class="day-section" data-section="meds" ${openMeds}>
      ${sectionHeadHtml('meds', 'Препараты', meds.length)}
      <div class="section-body">
        <div class="addform">
          <div class="row"><input class="inp" type="time" id="mTime" value="${isToday ? nowTime : '09:00'}" aria-label="Время"><select class="inp" id="mMed" aria-label="Препарат">${medOptions}</select><button class="btn primary btn-add" type="button" data-act="addmed" aria-label="Добавить препарат">+</button></div>
          <div class="row"><input class="inp" type="text" id="mDose" placeholder="Доза (напр. 5 мл)" autocomplete="off" aria-label="Доза"><input class="inp" type="text" id="mNote" placeholder="Заметка" autocomplete="off" aria-label="Заметка"></div>
        </div>
        <div class="err" id="mErr" hidden></div>
        <div class="mlist">${meds.length ? meds.map(medRow).join('') : '<p class="muted small" style="margin:8px 0 0">Пока нет записей.</p>'}</div>
      </div>
    </details>

    <details class="day-section" data-section="note" ${openNote}>
      ${sectionHeadHtml('note', 'Заметка', noteCount)}
      <div class="section-body"><textarea class="inp" data-act="note" rows="2" placeholder="Что помогло, настроение, аппетит…">${esc(rec.note || '')}</textarea></div>
    </details>

    <div class="panel-footer"><div style="display:flex; gap:8px; flex-wrap:wrap"><button class="btn" type="button" data-act="copyto">📋 Скопировать</button><button class="btn" type="button" data-act="print">🖨 Печать</button></div><button class="link danger" type="button" data-act="clear">Очистить</button></div>
  `;
}

panelEl.addEventListener('toggle', e => {
  const det = e.target; if (!det || det.tagName !== 'DETAILS') return;
  const key = det.dataset.section; if (!key) return;
  sectionsState[key] = !!det.open; saveSections();
}, true);

panelEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if (!btn || !selected) return;
  const act = btn.dataset.act;
  if (act === 'sym-more'){ symptomsExpanded = true; renderPanel(); return; }
  if (act === 'sym-less'){ symptomsExpanded = false; renderPanel(); return; }
  if (act === 'open-courses'){ openCoursesModal(); return; }
  if (act === 'status'){ const rec = getDay(selected, true); const v = btn.dataset.v; rec.status = rec.status === v ? null : v; commit(); }
  if (act === 'sym'){
    const rec = getDay(selected, true); const id = btn.dataset.id; const i = rec.symptoms.indexOf(id);
    if (i >= 0) rec.symptoms.splice(i, 1); else rec.symptoms.push(id);
    if (rec.symptoms.length && !rec.status) rec.status = 'sick'; commit();
  }
  if (act === 'addtemp') addTemp();
  if (act === 'deltemp'){ const rec = getDay(selected, true); rec.temps = rec.temps.filter(t => t.id !== btn.dataset.id); commit(); }
  if (act === 'addmed') addMed();
  if (act === 'delmed'){ const rec = getDay(selected, true); rec.meds = rec.meds.filter(m => m.id !== btn.dataset.id); commit(); }
  if (act === 'clear'){ if (confirm('Очистить все отметки за этот день?')){ delete getActiveChild().days[selected]; commit(); } }
  if (act === 'copyto') showCopyOptionsDialog(selected);
  if (act === 'print') printDayCard(selected);
});

panelEl.addEventListener('change', e => {
  const act = e.target.dataset.act;
  if (act === 'garden' && selected){ const rec = getDay(selected, true); rec.garden = e.target.checked; if (rec.garden) rec.home = false; commit(); }
  if (act === 'home' && selected){ const rec = getDay(selected, true); rec.home = e.target.checked; if (rec.home) rec.garden = false; commit(); }
  if (act === 'course-check' && selected){
    const courseId = e.target.dataset.courseId; const time = e.target.dataset.time; const checked = e.target.checked;
    const rec = getDay(selected, true);
    if (checked){
      const course = (getActiveChild().courses || []).find(c => c.id === courseId);
      if (course){
        const exists = rec.meds.some(m => m.courseId === courseId && m.time === time);
        if (!exists){
          rec.meds.push({ id: uid(), time: time, med: 'other', dose: course.dose || '', note: course.note || '', courseId: course.id, customName: course.name });
          rec.meds.sort((a,b) => a.time.localeCompare(b.time)); if (!rec.status) rec.status = 'sick';
        }
      }
    } else { rec.meds = rec.meds.filter(m => !(m.courseId === courseId && m.time === time)); }
    commit();
  }
});

panelEl.addEventListener('input', e => {
  const act = e.target.dataset.act; if (!selected) return;
  if (act === 'note'){ const rec = getDay(selected, true); rec.note = e.target.value; save(); }
  if (act === 'diagnosis'){ const rec = getDay(selected, true); rec.diagnosis = e.target.value; save(); }
});

function addTemp(){
  const timeEl = document.getElementById('tTime'); const valEl = document.getElementById('tVal');
  const medEl = document.getElementById('tMed'); const helpEl = document.getElementById('tHelp'); const errEl = document.getElementById('tErr');
  if (!timeEl || !valEl) return;
  const raw = (valEl.value || '').replace(',', '.').trim(); const val = parseFloat(raw);
  if (!raw || isNaN(val) || val < 30 || val > 43){ errEl.hidden = false; errEl.textContent = 'Введи температуру числом от 30 до 43, например 38,5'; valEl.focus(); return; }
  const rec = getDay(selected, true);
  rec.temps.push({ id: uid(), time: timeEl.value || (pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())), value: Math.round(val * 10) / 10, med: medEl ? medEl.value : '', helped: helpEl ? helpEl.value : '' });
  rec.temps.sort((a,b) => a.time.localeCompare(b.time));
  if (val >= 37.5){ if (!rec.status) rec.status = 'sick'; if (!rec.symptoms.includes('fever')) rec.symptoms.push('fever'); }
  commit();
}

function addMed(){
  const timeEl = document.getElementById('mTime'); const medEl = document.getElementById('mMed'); const doseEl = document.getElementById('mDose'); const noteEl = document.getElementById('mNote'); const errEl = document.getElementById('mErr');
  if (!medEl || !medEl.value){ if (errEl){ errEl.hidden = false; errEl.textContent = 'Выбери препарат'; } return; }
  const rec = getDay(selected, true);
  rec.meds.push({ id: uid(), time: timeEl && timeEl.value ? timeEl.value : (pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())), med: medEl.value, dose: doseEl ? doseEl.value.trim() : '', note: noteEl ? noteEl.value.trim() : '' });
  rec.meds.sort((a,b) => a.time.localeCompare(b.time)); if (!rec.status) rec.status = 'sick'; commit();
}

/* ============================ ПЕЧАТЬ ДНЯ ============================ */
function printDayCard(key){
  const rec = getActiveChild().days[key];
  if (!rec || !hasAnyData(rec)){ toast('В этом дне нет данных для печати'); return; }
  const d = parseK(key); const dateStr = `${WD_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_G[d.getMonth()]} ${d.getFullYear()}`;
  const statusLabel = rec.status === 'sick' ? 'Болеет' : rec.status === 'ok' ? 'Здоров' : '—';
  const statusColor = rec.status === 'sick' ? '#F27691' : rec.status === 'ok' ? '#687B59' : '#a49c90';
  const syms = (rec.symptoms || []).map(id => SYMPTOMS.find(s => s.id === id)).filter(Boolean);
  const symsText = syms.length ? syms.map(s => s.label).join(', ') : '—';
  const temps = (rec.temps || []).slice().sort((a,b) => a.time.localeCompare(b.time)); const meds = (rec.meds || []).slice().sort((a,b) => a.time.localeCompare(b.time));

  let tempsHtml = ''; if (temps.length){
    tempsHtml = `<table class="card-table"><thead><tr><th>Время</th><th>Темп.</th><th>Лекарство</th><th>Помогло</th></tr></thead><tbody>${temps.map(t => {
        const med = MEDS.find(m => m.id === t.med); const help = HELP.find(h => h.id === t.helped);
        return `<tr><td>${t.time}</td><td><strong>${fmtT(t.value)}°</strong></td><td>${med && med.id ? esc(med.label) : '—'}</td><td>${help && help.id ? esc(help.label.toLowerCase()) : '—'}</td></tr>`;
      }).join('')}</tbody></table>`;
  }
  let medsHtml = ''; if (meds.length){
    medsHtml = `<table class="card-table"><thead><tr><th>Время</th><th>Препарат</th><th>Доза</th><th>Заметка</th></tr></thead><tbody>${meds.map(m => {
        const displayName = medDisplayName(m); const showNote = m.note && m.note.trim() && m.med !== 'other' && !m.customName;
        return `<tr><td>${m.time}</td><td><strong>${esc(displayName)}</strong></td><td>${m.dose ? esc(m.dose) : '—'}</td><td>${showNote ? esc(m.note) : '—'}</td></tr>`;
      }).join('')}</tbody></table>`;
  }

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Карточка дня · ${fmtDateShort(key)}</title><style>
  * { box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #292724; background: #fff; margin: 0; padding: 12mm; line-height: 1.5; font-size: 11pt; }
  .card { max-width: 148mm; margin: 0 auto; border: 1.5pt solid #292724; border-radius: 12pt; padding: 12pt 14pt 10pt; position: relative; } .card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4pt; background: #DCEB32; border-radius: 12pt 0 0 12pt; }
  .brand { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.12em; color: #756f65; font-weight: 800; } .date { font-size: 16pt; font-weight: 800; letter-spacing: -0.02em; margin: 2pt 0 6pt; text-transform: capitalize; }
  .status-row { display: flex; flex-wrap: wrap; gap: 6pt; align-items: center; margin-bottom: 8pt; } .status-badge { display: inline-block; padding: 3pt 10pt; border-radius: 999pt; font-weight: 700; font-size: 10pt; border: 1pt solid currentColor; }
  .mark-badge { display: inline-block; padding: 3pt 10pt; border-radius: 999pt; font-weight: 700; font-size: 9pt; } .mark-badge.garden { background: #DCEB32; color: #292724; } .mark-badge.home { background: #F27691; color: #fff; }
  .section { margin-bottom: 8pt; } .section-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; color: #756f65; margin-bottom: 3pt; } .section-text { font-size: 10.5pt; }
  .note-block { padding: 6pt 10pt; background: #F4EBDD; border-radius: 6pt; border-left: 3pt solid #DCEB32; font-size: 10pt; white-space: pre-wrap; }
  table.card-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; border: 0.5pt solid #dfd4c4; border-radius: 4pt; overflow: hidden; } table.card-table th { background: #fffaf1; padding: 4pt 6pt; text-align: left; border-bottom: 0.5pt solid #dfd4c4; font-weight: 700; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; color: #756f65; } table.card-table td { padding: 4pt 6pt; border-bottom: 0.5pt solid #ece0d0; } table.card-table tr:last-child td { border-bottom: 0; }
  .footer { margin-top: 10pt; padding-top: 6pt; border-top: 0.5pt solid #dfd4c4; color: #a49c90; font-size: 8pt; text-align: center; } @media print { body { padding: 0; } @page { size: A5; margin: 8mm; } }
</style></head><body><div class="card">
  <div class="brand">«Ещё одна галочка» · Адаптация к садику</div><div class="date">${dateStr}</div>
  <div class="status-row"><span class="status-badge" style="color:${statusColor}">${statusLabel}</span>${rec.garden ? '<span class="mark-badge garden">🏫 был в садике</span>' : ''}${rec.home ? '<span class="mark-badge home">🏠 остался дома</span>' : ''}</div>
  <div class="section"><div class="section-label">Диагноз</div><div class="section-text">${rec.diagnosis ? esc(rec.diagnosis) : '—'}</div></div>
  <div class="section"><div class="section-label">Симптомы</div><div class="section-text">${symsText}</div></div>
  ${temps.length ? `<div class="section"><div class="section-label">Температура</div>${tempsHtml}</div>` : ''}
  ${meds.length ? `<div class="section"><div class="section-label">Препараты</div>${medsHtml}</div>` : ''}
  ${rec.note && rec.note.trim() ? `<div class="section"><div class="section-label">Заметка</div><div class="note-block">${esc(rec.note).replace(/\n/g, '<br>')}</div></div>` : ''}
  <div class="footer">Сформировано ${new Date().toLocaleDateString('ru-RU')} · «Ещё одна галочка»</div>
</div><script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 300); });<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (!win){ const blob = new Blob([html], { type: 'text/html' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'day-' + key + '.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Браузер заблокировал окно — файл сохранён'); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ============================ СВОДКА ЗА ДЕНЬ ============================ */
function renderDaySummary(){
  const titleEl = document.getElementById('dsTitle'); const bodyEl = document.getElementById('dsBody');
  if (!titleEl || !bodyEl) return;
  const d = parseK(summaryKey); const todayKey = keyOf(new Date()); const isToday = summaryKey === todayKey;
  titleEl.innerHTML = `${isToday ? '<span class="ds-today">сегодня</span>' : ''}${WD_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  const rec = getActiveChild().days[summaryKey];
  if (!rec || !hasAnyData(rec)){ bodyEl.innerHTML = `<div class="ds-empty">Нет отметок за этот день</div><button class="btn primary ds-open" type="button" data-ds-open>Открыть день →</button>`; return; }
  const name = getActiveChild().name ? `<b>${esc(getActiveChild().name)}</b>` : 'ребёнок'; let datePrefix = isToday ? 'Сегодня' : fmtDate(summaryKey);
  const statusLabel = rec.status === 'sick' ? 'болеет' : rec.status === 'ok' ? 'здоров' : '';
  let locParts = []; if (rec.garden) locParts.push('в садике'); if (rec.home) locParts.push('дома'); let locStr = locParts.join(' и ');
  let mainParts = []; if (locStr) mainParts.push(locStr); if (statusLabel) mainParts.push(statusLabel);
  let sentence = mainParts.length ? `<b>${datePrefix}</b> ${name} <b>${mainParts.join(', ')}</b>.` : `<b>${datePrefix}</b> у ${name} есть отметки.`;
  let detailsHtml = '';
  const syms = (rec.symptoms || []).map(id => SYMPTOMS.find(s => s.id === id)).filter(Boolean); if (syms.length) detailsHtml += `<div><b>Симптомы:</b> ${syms.map(s => s.label).join(', ')}.</div>`;
  const temps = rec.temps || []; if (temps.length){ const maxT = Math.max(...temps.map(t => t.value)); detailsHtml += `<div><b>Температура:</b> до ${fmtT(maxT)}° (${temps.length} ${plural(temps.length, 'замер', 'замера', 'замеров')}).</div>`; }
  if (rec.meds && rec.meds.length){ const medsStr = rec.meds.map(m => `${esc(medDisplayName(m))}${m.dose ? ' ' + m.dose : ''} (${m.time})`).join(', '); detailsHtml += `<div><b>Препараты:</b> ${medsStr}.</div>`; }
  if (rec.diagnosis && rec.diagnosis.trim()) detailsHtml += `<div><b>Диагноз:</b> ${esc(rec.diagnosis)}.</div>`;
  bodyEl.innerHTML = `<div class="ds-narrative"><p class="ds-sentence">${sentence}</p>${detailsHtml ? `<div class="ds-details">${detailsHtml}</div>` : ''}</div><button class="btn primary ds-open" type="button" data-ds-open>Открыть день →</button>`;
}
function shiftSummary(dir){ const d = parseK(summaryKey); d.setDate(d.getDate() + dir); summaryKey = keyOf(d); renderDaySummary(); if (summaryKey === selected) renderTempChart(); }
document.getElementById('dsPrev').addEventListener('click', () => shiftSummary(-1));
document.getElementById('dsNext').addEventListener('click', () => shiftSummary(1));
document.getElementById('dsBody').addEventListener('click', e => {
  if (!e.target.closest('[data-ds-open]')) return;
  selected = summaryKey; weekAnchor = selected; const dd = parseK(selected); view = { y: dd.getFullYear(), m: dd.getMonth() };
  if (viewMode === 'month') renderCalendar(); else renderWeekView();
  renderTempChart(); renderPanel(); if (isMobile()) openSheet();
});

/* ============================ КОПИРОВАНИЕ ДНЯ ============================ */
let copyOptsSourceKey = null;
function showCopyOptionsDialog(fromKey){
  if (!fromKey) return;
  if (!hasAnyData(getActiveChild().days[fromKey])){ toast('В этом дне нет данных для копирования'); return; }
  copyOptsSourceKey = fromKey; const d = parseK(fromKey);
  document.getElementById('copyOptsDate').textContent = `${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
  const opts = getActiveChild().copyOptions || defaultCopyOptions();
  document.querySelectorAll('#copyOpts input[data-key]').forEach(cb => { cb.checked = !!opts[cb.dataset.key]; });
  document.getElementById('copyOpts').classList.add('show'); syncBodyScroll();
}
function hideCopyOptionsDialog(){ document.getElementById('copyOpts').classList.remove('show'); syncBodyScroll(); copyOptsSourceKey = null; }
document.getElementById('copyOptsCancel').addEventListener('click', hideCopyOptionsDialog);
document.getElementById('copyOpts').addEventListener('click', e => { if (e.target === document.getElementById('copyOpts')) hideCopyOptionsDialog(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('copyOpts').classList.contains('show')) hideCopyOptionsDialog(); });

document.getElementById('copyOptsNext').addEventListener('click', () => {
  const fromKey = copyOptsSourceKey; if (!fromKey) return;
  const opts = {}; document.querySelectorAll('#copyOpts input[data-key]').forEach(cb => { opts[cb.dataset.key] = cb.checked; });
  if (!Object.values(opts).some(v => v)){ toast('Выбери хотя бы один параметр'); return; }
  getActiveChild().copyOptions = { ...DEFAULT_COPY_OPTIONS, ...opts }; save(); hideCopyOptionsDialog(); closeSheet();
  copyMode = { fromKey, options: opts }; updateCopyBanner(); renderCalendar(); if (viewMode === 'week') renderWeekView(); toast('Тапни целевой день');
});

function defaultCopyOptions(){ return { ...DEFAULT_COPY_OPTIONS }; }
function exitCopyMode(){ copyMode = null; updateCopyBanner(); renderCalendar(); if (viewMode === 'week') renderWeekView(); }
function updateCopyBanner(){
  let banner = document.getElementById('copyBanner');
  if (!banner){ banner = document.createElement('div'); banner.id = 'copyBanner'; document.body.appendChild(banner); }
  if (copyMode){
    const labels = Object.keys(copyMode.options).filter(k => copyMode.options[k]).map(k => COPY_OPT_LABELS[k]).join(' · ');
    banner.innerHTML = `<span class="cb-txt">Куда скопировать <strong>${fmtDate(copyMode.fromKey)}</strong>?<br><span style="font-weight:600; opacity:.7; font-size:.78rem">${labels || '—'}</span></span><button type="button" id="copyCancel">Отмена</button>`;
    banner.classList.add('show'); document.getElementById('copyCancel').onclick = () => { exitCopyMode(); toast('Отменено'); };
  } else { banner.classList.remove('show'); banner.innerHTML = ''; }
}

function copyDayDataToKeys(fromKey, targetKeys, options){
  const targets = (targetKeys || []).filter(k => k && k !== fromKey); if (!targets.length) return;
  const days = getActiveChild().days; const src = days[fromKey];
  if (!hasAnyData(src)){ toast('В этом дне нет данных для копирования'); return; }
  const opts = options || state.copyOptions || defaultCopyOptions();
  if (!Object.keys(opts).some(k => opts[k])){ toast('Не выбрано ни одного параметра'); return; }

  const conflictsList = []; targets.forEach(tk => { const c = conflictFields(days[tk], opts); if (c.length) conflictsList.push({ key: tk, conflicts: c }); });
  if (conflictsList.length){
    const first = conflictsList.slice(0, 5).map(c => `${fmtDateShort(c.key)}: ${c.conflicts.join(', ')}`).join('\n');
    const extra = conflictsList.length > 5 ? `\n… и ещё ${conflictsList.length - 5}` : '';
    if (!confirm(`Перезапишутся данные в ${conflictsList.length} ${plural(conflictsList.length, 'дне', 'днях', 'днях')}:\n\n${first}${extra}\n\nПродолжить?`)) return;
  }

  const prevStates = targets.map(tk => ({ key: tk, data: days[tk] ? JSON.parse(JSON.stringify(days[tk])) : null }));
  targets.forEach(tk => {
    const dst = days[tk]; const base = dst ? JSON.parse(JSON.stringify(dst)) : { status:null, symptoms:[], temps:[], meds:[], note:'', diagnosis:'', garden:false, home:false };
    base.meds = base.meds || [];
    if (opts.status) base.status = src.status || null; if (opts.garden) base.garden = !!src.garden; if (opts.home) base.home = !!src.home;
    if (opts.diagnosis) base.diagnosis = src.diagnosis || ''; if (opts.symptoms) base.symptoms = (src.symptoms || []).slice();
    if (opts.temps) base.temps = (src.temps || []).map(t => ({...t, id: uid()}));
    if (opts.meds) base.meds = (src.meds || []).map(m => {
      const copy = { ...m, id: uid() };
      if (copy.courseId){ if (copy.customName && copy.med === 'other' && (!copy.note || !copy.note.trim())) copy.note = copy.customName; delete copy.courseId; delete copy.customName; }
      return copy;
    });
    if (opts.note) base.note = src.note || '';
    if (hasAnyData(base)) days[tk] = base; else delete days[tk];
  });

  lastCopyUndo = { prevStates }; save(); render();
  const label = targets.length === 1 ? fmtDateShort(targets[0]) : `${targets.length} ${plural(targets.length, 'день', 'дня', 'дней')}`;
  toast(`Скопировано ${fmtDateShort(fromKey)} → ${label}`, () => undoLastCopy());
}
function copyDayData(fromKey, toKey, options){ copyDayDataToKeys(fromKey, [toKey], options); }
function undoLastCopy(){
  if (!lastCopyUndo) return;
  const days = getActiveChild().days;
  if (lastCopyUndo.prevStates){ lastCopyUndo.prevStates.forEach(({ key, data }) => { if (data === null) delete days[key]; else days[key] = data; }); }
  lastCopyUndo = null; save(); render(); toast('Копирование отменено');
}
function conflictFields(dst, options){
  if (!dst) return []; const c = [];
  if (options.status && dst.status) c.push('статус'); if (options.garden && dst.garden) c.push('«был в садике»');
  if (options.home && dst.home) c.push('«остался дома»'); if (options.diagnosis && dst.diagnosis && dst.diagnosis.trim()) c.push('диагноз');
  if (options.symptoms && dst.symptoms && dst.symptoms.length) c.push('симптомы'); if (options.temps && dst.temps && dst.temps.length) c.push('температура');
  if (options.meds && dst.meds && dst.meds.length) c.push('препараты'); if (options.note && dst.note && dst.note.trim()) c.push('заметка');
  return c;
}
