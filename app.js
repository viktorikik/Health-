/* ============================ ВКЛАДКИ ============================ */
const viewCalEl = document.getElementById('viewCal');
const viewStatsEl = document.getElementById('viewStats');
const tabCal = document.getElementById('tabCal');
const tabStats = document.getElementById('tabStats');

function switchView(name){
  if (name === 'stats'){
    viewCalEl.classList.add('hidden'); viewStatsEl.classList.remove('hidden');
    tabCal.classList.remove('on'); tabStats.classList.add('on');
    if (typeof closeSheet === 'function') closeSheet();
    renderAnalytics();
  } else {
    viewStatsEl.classList.add('hidden'); viewCalEl.classList.remove('hidden');
    tabStats.classList.remove('on'); tabCal.classList.add('on');
  }
}
tabCal.addEventListener('click', () => switchView('cal'));
tabStats.addEventListener('click', () => switchView('stats'));

document.querySelectorAll('.period-seg button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-seg button').forEach(b => b.classList.remove('on')); btn.classList.add('on');
    currentPeriod = btn.dataset.period;
    if (currentPeriod === 'month') chartMode = 'month'; else if (currentPeriod === 'year') chartMode = 'year'; else chartMode = 'year';
    getActiveChild().chartMode = chartMode; save(); renderAnalytics();
  });
});

document.querySelectorAll('.view-toggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.view; if (mode === viewMode) return;
    viewMode = mode; document.querySelectorAll('.view-toggle button').forEach(b => b.classList.toggle('on', b === btn));
    if (mode === 'week'){
      weekAnchor = selected || keyOf(new Date());
      document.getElementById('calendarMonthView').classList.add('hidden');
      document.getElementById('calendarWeekView').classList.remove('hidden');
      renderWeekView();
    } else {
      if (weekAnchor){ const d = parseK(weekAnchor); view = { y: d.getFullYear(), m: d.getMonth() }; }
      document.getElementById('calendarWeekView').classList.add('hidden');
      document.getElementById('calendarMonthView').classList.remove('hidden');
      renderCalendar();
    }
    renderTempChart(); renderStats(); renderAnalytics(); updateHeroMeta();
  });
});

document.getElementById('prevBtn').addEventListener('click', () => shiftPeriod(-1, 'left'));
document.getElementById('nextBtn').addEventListener('click', () => shiftPeriod(1, 'right'));
document.getElementById('todayBtn').addEventListener('click', () => {
  const n = new Date(); view = { y: n.getFullYear(), m: n.getMonth() }; selected = keyOf(n); weekAnchor = selected; summaryKey = selected; getActiveChild().chartAnchor = selected;
  save(); render(); switchView('cal'); if (isMobile()) openSheet();
});

/* ============================ BOTTOM SHEET ============================ */
function openSheet(){
  document.getElementById('sheet').classList.add('open');
  document.getElementById('backdrop').classList.add('open');
  syncBodyScroll();
  document.getElementById('sheet').scrollTop = 0;
}
function closeSheet(){
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('backdrop').classList.remove('open');
  syncBodyScroll();
  renderDoseBar();
}
document.getElementById('backdrop').addEventListener('click', closeSheet);
document.getElementById('sheetClose').addEventListener('click', closeSheet);
document.getElementById('grip').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('sheet').classList.contains('open')) closeSheet(); });

/* ============================ МОДАЛКИ КУРСОВ ============================ */
function openCoursesModal(){ renderCoursesList(); document.getElementById('coursesModal').classList.add('show'); syncBodyScroll(); }
function closeCoursesModal(){ document.getElementById('coursesModal').classList.remove('show'); syncBodyScroll(); }
function renderCoursesList(){
  const courses = (getActiveChild().courses || []).slice().sort((a,b) => (b.startKey || '').localeCompare(a.startKey || ''));
  const listEl = document.getElementById('coursesList');
  if (!courses.length){ listEl.innerHTML = '<p class="muted small">Пока нет курсов. Добавь первый — например, витамин D на 30 дней.</p>'; return; }
  const today = keyOf(new Date());
  listEl.innerHTML = courses.map(c => {
    const end = c.endKey || courseEndKey(c); let badge = 'завершён'; let badgeCls = '';
    if (c.startKey <= today && today <= end && !c.archived){ badge = 'активен'; badgeCls = 'active'; } else if (today < c.startKey){ badge = 'запланирован'; }
    const timesStr = (c.times || []).join(' · ') || '—'; const done = end < today || c.archived; const catLabel = c.category ? courseCatLabel(c.category) : '';
    return `<div class="course-item ${done ? 'done' : ''}"><div class="course-item-main"><div class="course-item-name">${esc(c.name || 'Без названия')} ${catLabel ? `<span class="course-cat-badge">${esc(catLabel)}</span>` : ''}<span class="course-badge ${badgeCls}">${badge}</span></div><div class="course-item-meta">${courseRangeText(c)}${c.dose ? ' · ' + esc(c.dose) : ''}<br>Время: ${timesStr}${c.note ? ' · ' + esc(c.note) : ''}</div></div><div class="course-item-actions"><button class="iconbtn tiny" type="button" data-course-edit="${c.id}" title="Редактировать">✎</button><button class="iconbtn tiny" type="button" data-course-del="${c.id}" title="Удалить">×</button></div></div>`;
  }).join('');
}
document.getElementById('coursesList').addEventListener('click', e => {
  const editBtn = e.target.closest('[data-course-edit]'); if (editBtn){ openCourseForm(editBtn.dataset.courseEdit); return; }
  const delBtn = e.target.closest('[data-course-del]'); if (delBtn){ deleteCourse(delBtn.dataset.courseDel); return; }
});
document.getElementById('coursesClose').addEventListener('click', closeCoursesModal);
document.getElementById('coursesAddBtn').addEventListener('click', () => openCourseForm(null));
document.getElementById('coursesModal').addEventListener('click', e => { if (e.target === document.getElementById('coursesModal')) closeCoursesModal(); });

function openCourseForm(courseId){
  const isEdit = !!courseId; const course = isEdit ? (getActiveChild().courses || []).find(c => c.id === courseId) : null;
  document.getElementById('courseFormTitle').textContent = isEdit ? 'Редактировать курс' : 'Новый курс';
  document.getElementById('courseFormSub').textContent = isEdit ? 'Изменения сохранятся для будущих дней' : 'Заполни поля — потом отмечай приём в карточке дня';
  document.getElementById('courseFormId').value = course ? course.id : ''; document.getElementById('courseName').value = course ? (course.name || '') : '';
  const catEl = document.getElementById('courseCategory');
  if (catEl) { catEl.innerHTML = COURSE_CATS.map(cat => `<option value="${cat.id}">${esc(cat.label)}</option>`).join(''); catEl.value = course ? (course.category || '') : ''; }
  document.getElementById('courseDose').value = course ? (course.dose || '') : ''; document.getElementById('courseStart').value = course ? (course.startKey || keyOf(new Date())) : keyOf(new Date());
  document.getElementById('courseDays').value = course ? (course.days || 7) : 7; document.getElementById('courseNote').value = course ? (course.note || '') : '';
  document.getElementById('courseFormErr').hidden = true; document.getElementById('courseFormErr').textContent = '';
  const times = course && course.times && course.times.length ? course.times.slice() : [pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())];
  renderCourseTimes(times); updateCourseEndHint(); document.getElementById('courseFormModal').classList.add('show'); syncBodyScroll(); setTimeout(() => document.getElementById('courseName').focus(), 50);
}
function closeCourseForm(){ document.getElementById('courseFormModal').classList.remove('show'); syncBodyScroll(); }
function renderCourseTimes(times){
  document.getElementById('courseTimesList').innerHTML = times.map((t, i) => `<div class="course-time-row"><input class="inp" type="time" value="${esc(t)}" data-time-input>${i > 0 ? `<button class="iconbtn tiny" type="button" data-time-del title="Убрать">×</button>` : '<span style="width:34px"></span>'}</div>`).join('');
}
function getCourseTimesFromForm(){ return [...document.getElementById('courseTimesList').querySelectorAll('[data-time-input]')].map(inp => (inp.value || '').trim()).filter(Boolean); }
document.getElementById('courseTimesList').addEventListener('click', e => { const btn = e.target.closest('[data-time-del]'); if (!btn) return; const row = btn.closest('.course-time-row'); if (row) row.remove(); });
document.getElementById('courseAddTimeBtn').addEventListener('click', () => { const current = getCourseTimesFromForm(); const used = new Set(current); const d = new Date(); for (let i = 0; i < 24; i++){ d.setHours(d.getHours() + (i === 0 ? 0 : 1)); const t = pad(d.getHours()) + ':' + pad(d.getMinutes()); if (!used.has(t)){ current.push(t); break; } } renderCourseTimes(current); });
document.getElementById('courseStart').addEventListener('change', updateCourseEndHint);
document.getElementById('courseDays').addEventListener('input', updateCourseEndHint);
function updateCourseEndHint(){
  const start = document.getElementById('courseStart').value; const days = Math.max(1, parseInt(document.getElementById('courseDays').value, 10) || 1);
  const hintEl = document.getElementById('courseEndHint'); if (!start){ hintEl.textContent = 'Дата окончания: —'; return; }
  const d = parseK(start); if (isNaN(d.getTime())){ hintEl.textContent = 'Дата окончания: —'; return; }
  d.setDate(d.getDate() + days - 1); hintEl.textContent = `Дата окончания: ${fmtDate(keyOf(d))} ${d.getFullYear()} (${days} ${plural(days, 'день', 'дня', 'дней')})`;
}
document.getElementById('courseFormCancel').addEventListener('click', closeCourseForm);
document.getElementById('courseFormModal').addEventListener('click', e => { if (e.target === document.getElementById('courseFormModal')) closeCourseForm(); });

document.getElementById('courseFormSave').addEventListener('click', () => {
  const id = document.getElementById('courseFormId').value; const isEdit = !!id;
  const name = (document.getElementById('courseName').value || '').trim(); const category = document.getElementById('courseCategory') ? (document.getElementById('courseCategory').value || '') : '';
  const dose = (document.getElementById('courseDose').value || '').trim(); const note = (document.getElementById('courseNote').value || '').trim();
  const startKey = document.getElementById('courseStart').value; const days = Math.max(1, Math.min(365, parseInt(document.getElementById('courseDays').value, 10) || 0)); const times = getCourseTimesFromForm();
  const err = (msg) => { const e = document.getElementById('courseFormErr'); e.hidden = false; e.textContent = msg; };
  if (!name) return err('Введи название курса'); if (!startKey) return err('Укажи дату начала'); if (!days || days < 1) return err('Количество дней — минимум 1');
  if (!times.length) return err('Добавь хотя бы одно время приёма'); if (times.some(t => !/^\d{2}:\d{2}$/.test(t))) return err('Проверь времена приёма');
  document.getElementById('courseFormErr').hidden = true;
  const startD = parseK(startKey); const endD = new Date(startD); endD.setDate(startD.getDate() + days - 1); const endKey = keyOf(endD);
  if (isEdit){
    const course = (getActiveChild().courses || []).find(c => c.id === id); if (!course) return err('Курс не найден');
    course.name = name; course.category = category; course.dose = dose; course.note = note; course.startKey = startKey; course.endKey = endKey; course.days = days; course.times = times.slice().sort();
  } else {
    const newCourse = { id: 'course_' + uid(), name, category, dose, note, startKey, endKey, days, times: times.slice().sort(), archived: false, createdAt: new Date().toISOString() };
    getActiveChild().courses = getActiveChild().courses || []; getActiveChild().courses.push(newCourse);
  }
  save(); closeCourseForm(); renderCoursesList(); render(); toast(isEdit ? 'Курс обновлён' : 'Курс добавлен');
});

function deleteCourse(courseId){
  if (!confirm('Удалить курс? Записи в журнале препаратов останутся как разовые.')) return;
  const child = getActiveChild(); child.courses = (child.courses || []).filter(c => c.id !== courseId);
  Object.values(child.days || {}).forEach(rec => { (rec.meds || []).forEach(m => { if (m.courseId === courseId){ if (m.customName && m.med === 'other' && (!m.note || !m.note.trim())) m.note = m.customName; delete m.courseId; delete m.customName; } }); });
  save(); renderCoursesList(); render(); toast('Курс удалён');
}

/* ============================ ОБЩИЙ РЕНДЕР ============================ */
function render(){
  applyTheme(); updateHeaderChild();
  if (viewMode === 'month') renderCalendar(); else renderWeekView();
  renderDoseBar(); renderTempChart(); renderPanel(); renderStats(); renderDaySummary(); renderAnalytics(); updateHeroMeta();
}
function commit(){ prune(selected); save(); render(); }

setInterval(() => {
  renderDoseBar();
  const el = document.getElementById('nextdose');
  if (el && selected){
    const rec = getActiveChild().days[selected];
    if (rec && rec.temps && rec.temps.length){
      const temps = rec.temps.slice().sort((a,b) => a.time.localeCompare(b.time)); const html = nextDoseHtml(temps, selected);
      if (html) el.outerHTML = html; else el.remove();
    }
  }
}, 30000);

/* ============================ ЭКСПОРТ / ИМПОРТ JSON ============================ */
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'galochka-sad-' + keyOf(new Date()) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
const fileInput = document.getElementById('fileInput');
document.getElementById('importBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const f = fileInput.files && fileInput.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.version === 3 && data.children) {
        data.children.forEach(c => { 
          if (!c.courses) c.courses = []; 
          if (!c.healthCard) c.healthCard = { visits: [], vaccines: [], notes: [], growth: [] }; 
          if (c.birthDate === undefined) c.birthDate = ''; // <-- ВАЖНОЕ ОБНОВЛЕНИЕ ДЛЯ ИМПОРТА
          c.courses.forEach(course => { if (course.category === undefined) course.category = ''; }); 
        });
        state = data; if (!state.activeChildId || !state.children.find(c => c.id === state.activeChildId)) state.activeChildId = state.children[0]?.id;
        if (state.theme) applyTheme(); save(); render(); renderMenuChildren(); closeMenu(); alert('Данные импортированы (все профили).');
      } else if (data.days && typeof data.days === 'object') {
        getActiveChild().days = data.days;
        if (data.theme) state.theme = data.theme; if (data.childName) getActiveChild().name = data.childName;
        if (data.birthDate) getActiveChild().birthDate = data.birthDate; // <-- ОБНОВЛЕНИЕ ДЛЯ СТАРОГО ФОРМАТА
        if (data.copyOptions) getActiveChild().copyOptions = { ...DEFAULT_COPY_OPTIONS, ...data.copyOptions }; if (data.symptomFilter) getActiveChild().symptomFilter = data.symptomFilter;
        if (data.chartMode) { getActiveChild().chartMode = data.chartMode; chartMode = data.chartMode; } if (data.chartAnchor) getActiveChild().chartAnchor = data.chartAnchor;
        save(); render(); renderMenuChildren(); closeMenu(); alert('Данные импортированы в текущий профиль.');
      } else throw new Error('bad file');
    } catch(e){ alert('Не получилось прочитать файл.'); }
    fileInput.value = '';
  };
  reader.readAsText(f);
});
document.getElementById('resetBtn').addEventListener('click', () => { if (!confirm('Удалить все отметки текущего ребёнка безвозвратно?')) return; getActiveChild().days = {}; save(); render(); });

/* ============================ PWA ============================ */
if ('serviceWorker' in navigator){ window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); }); }

render();
