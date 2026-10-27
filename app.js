/* ============================ ДАННЫЕ ============================ */
const STORE_V3 = 'eog-sad-v3';
const STORE_V2 = 'eog-sad-v2';

const SYMPTOMS = [
  {id:'runny',      label:'Жидкие сопли',        cat:'nose'},
  {id:'stuffy',     label:'Нос не дышит',        cat:'nose'},
  {id:'thick',      label:'Густые сопли',        cat:'nose'},
  {id:'green',      label:'Зелёные сопли',       cat:'nose'},
  {id:'sorethroat', label:'Боль в горле',        cat:'throat'},
  {id:'redthroat',  label:'Красное горло',       cat:'throat'},
  {id:'dry',        label:'Сухой кашель',        cat:'cough'},
  {id:'wet',        label:'Влажный кашель',      cat:'cough'},
  {id:'hoarse',     label:'Осиплость',           cat:'cough'},
  {id:'stenosis',   label:'Стеноз',              cat:'cough'},
  {id:'earpain',    label:'Боль в ухе',          cat:'ear'},
  {id:'conjunct',   label:'Конъюнктивит',        cat:'eyes'},
  {id:'watery',     label:'Слезящиеся глаза',    cat:'eyes'},
  {id:'rash',       label:'Сыпь',                cat:'rash'},
  {id:'vomit',      label:'Рвота',               cat:'tummy'},
  {id:'tummy',      label:'Болит живот',         cat:'tummy'},
  {id:'loose',      label:'Жидкий стул',         cat:'tummy'},
  {id:'constip',    label:'Запор',               cat:'tummy'},
  {id:'fever',      label:'Температура',         cat:'fever'},
  {id:'lethargy',   label:'Вялость / капризы',   cat:'general'},
  {id:'appetite',   label:'Плохой аппетит',      cat:'general'},
  {id:'badsleep',   label:'Плохо спит',          cat:'general'},
  {id:'headache',   label:'Головная боль',       cat:'general'},
  {id:'stomatitis', label:'Стоматит',            cat:'other'},
  {id:'herpes',     label:'Герпес на губе',      cat:'other'},
  {id:'other',      label:'Другое',              cat:'other'}
];

const MEDS = [
  {id:'',            label:'— выбери препарат —', interval:0},
  {id:'paracetamol', label:'Парацетамол',         interval:360},
  {id:'nurofen',     label:'Нурофен',             interval:360},
  {id:'ibuklin',     label:'Ибуклин',             interval:360},
  {id:'cefecon',     label:'Цефекон',             interval:240},
  {id:'rub',         label:'Обтирания',           interval:0},
  {id:'antibiotic',  label:'Антибиотик',          interval:0},
  {id:'probiotic',   label:'Пробиотик',           interval:0},
  {id:'antiviral',   label:'Противовирусное',     interval:0},
  {id:'other',       label:'Другое',              interval:0}
];

const COURSE_CATS = [
  {id:'',            label:'— не указана —'},
  {id:'vitamins',    label:'Витамины / БАДы'},
  {id:'probiotics',  label:'Пробиотики'},
  {id:'antibiotics', label:'Антибиотики'},
  {id:'antiviral',   label:'Противовирусные'},
  {id:'other',       label:'Другое'}
];

const HELP = [
  {id:'',       label:'Помогло?'},
  {id:'yes',    label:'Помогло'},
  {id:'partly', label:'Частично'},
  {id:'no',     label:'Не помогло'}
];

const CAT_DOT = {
  nose:'var(--dot-nose)', throat:'var(--dot-throat)',
  cough:'var(--dot-cough)', ear:'var(--dot-ear)', eyes:'var(--dot-eyes)',
  fever:'var(--dot-fever)', tummy:'var(--dot-tummy)', rash:'var(--dot-rash)',
  general:'var(--dot-general)', other:'var(--dot-other)'
};

const SYM_CATS = [
  {id:'all',     label:'Все'},
  {id:'nose',    label:'Нос'},
  {id:'throat',  label:'Горло'},
  {id:'cough',   label:'Кашель'},
  {id:'ear',     label:'Уши'},
  {id:'eyes',    label:'Глаза'},
  {id:'tummy',   label:'Живот'},
  {id:'rash',    label:'Сыпь'},
  {id:'fever',   label:'Температура'},
  {id:'general', label:'Общее'},
  {id:'other',   label:'Другое'}
];

const DEFAULT_COPY_OPTIONS = {
  status: true, garden: true, home: true, diagnosis: true,
  symptoms: true, temps: true, meds: true, note: true
};
const COPY_OPT_LABELS = {
  status:'статус', garden:'садик', home:'дома', diagnosis:'диагноз',
  symptoms:'симптомы', temps:'температура', meds:'препараты', note:'заметка'
};

const DEFAULT_PDF_OPTIONS = {
  summary: true, sickChart: true, symChart: true,
  diagnoses: true, episodes: true, temps: true, meds: true, notes: false
};

const MONTHS      = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_G    = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_G_SHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const WD_FULL     = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const WD_SHORT    = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];

/* ============================ УТИЛИТЫ ============================ */
const pad    = n => String(n).padStart(2,'0');
const keyOf  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseK = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const fmtT   = v => (Math.round(v*10)/10).toFixed(1).replace('.', ',');
const uid    = () => Math.random().toString(36).slice(2,9);
const esc    = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isMobile = () => matchMedia('(max-width: 879px)').matches;

function safeParseK(k){
  try {
    const d = parseK(k);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch(e){ return new Date(); }
}

function dur(ms){
  const total = Math.max(0, Math.round(ms/60000));
  const h = Math.floor(total/60), m = total % 60;
  return h ? `${h} ч ${pad(m)} мин` : `${m} мин`;
}
function medInterval(medId){ const m = MEDS.find(x => x.id === medId); return m ? m.interval : 0; }
function medLabel(medId){ const m = MEDS.find(x => x.id === medId); return m ? m.label : ''; }

function medDisplayName(m){
  if (!m) return '';
  if (m.customName) return m.customName;
  if (m.med === 'other' && m.note && m.note.trim()) return m.note.trim();
  return medLabel(m.med);
}

function courseCatLabel(id){
  const c = COURSE_CATS.find(x => x.id === id);
  return c ? c.label : '';
}

function fmtDate(k){ const d = parseK(k); return `${d.getDate()} ${MONTHS_G[d.getMonth()]}`; }
function fmtDateShort(k){ const d = parseK(k); return `${pad(d.getDate())}.${pad(d.getMonth()+1)}`; }
function plural(n, one, few, many){
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
function datesBetween(k1, k2){
  const a = k1 <= k2 ? k1 : k2;
  const b = k1 <= k2 ? k2 : k1;
  const result = [];
  const d = parseK(a);
  const end = parseK(b);
  while (d <= end){ result.push(keyOf(d)); d.setDate(d.getDate() + 1); }
  return result;
}

/* ============================ СОСТОЯНИЕ ============================ */
function loadState(){
  try {
    const raw = localStorage.getItem(STORE_V3);
    if (raw){
      const s = JSON.parse(raw);
      return {
        version: 3,
        theme: s.theme || null,
        activeChildId: s.activeChildId,
        children: (s.children || []).map(c => ({
          ...c,
          courses: (c.courses || []).map(course => ({
            ...course,
            category: course.category || ''
          }))
        }))
      };
    }
    const raw2 = localStorage.getItem(STORE_V2);
    if (raw2){
      const s2 = JSON.parse(raw2);
      const childId = 'child_' + uid();
      const v3 = {
        version: 3,
        theme: s2.theme || null,
        activeChildId: childId,
        children: [{
          id: childId,
          name: s2.childName || '',
          days: s2.days || {},
          courses: [],
          copyOptions: s2.copyOptions || null,
          symptomFilter: s2.symptomFilter || 'all',
          chartMode: s2.chartMode || null,
          chartAnchor: s2.chartAnchor || null
        }]
      };
      localStorage.setItem(STORE_V3, JSON.stringify(v3));
      return v3;
    }
  } catch(e){}
  const childId = 'child_' + uid();
  return {
    version: 3,
    theme: null,
    activeChildId: childId,
    children: [{
      id: childId,
      name: '',
      days: {},
      courses: [],
      copyOptions: null,
      symptomFilter: 'all',
      chartMode: null,
      chartAnchor: null
    }]
  };
}

const state = loadState();
if (!state.theme) state.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function getActiveChild() {
  if (!state.children || !state.children.length) {
    const id = 'child_' + uid();
    state.children = [{ id, name: '', days: {}, courses: [], copyOptions: { ...DEFAULT_COPY_OPTIONS }, symptomFilter: 'all', chartMode: 'month', chartAnchor: keyOf(new Date()) }];
    state.activeChildId = id;
  }
  let child = state.children.find(c => c.id === state.activeChildId);
  if (!child) {
    child = state.children[0];
    state.activeChildId = child.id;
  }
  if (!child.courses) child.courses = [];
  return child;
}

function save(){ try { localStorage.setItem(STORE_V3, JSON.stringify(state)); } catch(e){} }

function getDay(k, create){
  const days = getActiveChild().days;
  if (!days[k]){
    if (!create) return null;
    days[k] = {status:null, symptoms:[], temps:[], meds:[], note:'', diagnosis:'', garden:false, home:false};
  }
  const r = days[k];
  r.symptoms  = r.symptoms  || [];
  r.temps     = r.temps     || [];
  r.meds      = r.meds      || [];
  r.note      = r.note      || '';
  r.diagnosis = r.diagnosis || '';
  r.garden    = !!r.garden;
  r.home      = !!r.home;
  return r;
}

function prune(k){
  const days = getActiveChild().days;
  const r = days[k];
  if (!r) return;
  const empty = !r.status &&
    !(r.symptoms && r.symptoms.length) &&
    !(r.temps && r.temps.length) &&
    !(r.meds && r.meds.length) &&
    !(r.note && r.note.trim()) &&
    !(r.diagnosis && r.diagnosis.trim()) &&
    !r.garden &&
    !r.home;
  if (empty) delete days[k];
}

function allDiagnoses(){
  const days = getActiveChild().days;
  const s = new Set();
  Object.values(days).forEach(r => {
    if (r.diagnosis && r.diagnosis.trim()) s.add(r.diagnosis.trim());
  });
  return [...s].sort();
}

function hasAnyData(r){
  return !!(r && (
    r.status ||
    (r.symptoms && r.symptoms.length) ||
    (r.temps && r.temps.length) ||
    (r.meds && r.meds.length) ||
    (r.note && r.note.trim()) ||
    (r.diagnosis && r.diagnosis.trim()) ||
    r.garden ||
    r.home
  ));
}

function getTopSymptoms(count){
  const days = getActiveChild().days;
  const freq = {};
  Object.values(days).forEach(r => {
    (r.symptoms || []).forEach(id => freq[id] = (freq[id] || 0) + 1);
  });
  return SYMPTOMS
    .map((s, i) => ({...s, freq: freq[s.id] || 0, _i: i}))
    .sort((a, b) => b.freq - a.freq || a._i - b._i)
    .slice(0, count);
}

/* ============================ КУРСЫ ============================ */
function courseEndKey(course){
  if (!course || !course.startKey) return course && course.endKey || '';
  const days = Math.max(1, parseInt(course.days, 10) || 1);
  const d = parseK(course.startKey);
  d.setDate(d.getDate() + days - 1);
  return keyOf(d);
}

function isCourseActiveOn(course, k){
  if (!course || course.archived) return false;
  const end = course.endKey || courseEndKey(course);
  return course.startKey <= k && k <= end;
}

function getCoursesForDay(k){
  return (getActiveChild().courses || []).filter(c => isCourseActiveOn(c, k));
}

function getCourseIntake(courseId, time, k){
  const rec = getActiveChild().days[k];
  if (!rec || !rec.meds) return null;
  return rec.meds.find(m => m.courseId === courseId && m.time === time) || null;
}

function hasAnyCourseOnDay(k){
  return getCoursesForDay(k).length > 0;
}

function countUncheckedCourses(k){
  const courses = getCoursesForDay(k);
  let n = 0;
  courses.forEach(c => {
    (c.times || []).forEach(time => {
      if (!getCourseIntake(c.id, time, k)) n++;
    });
  });
  return n;
}

function courseRangeText(course){
  const end = course.endKey || courseEndKey(course);
  if (!course.startKey || !end) return '—';
  const days = Math.max(1, parseInt(course.days, 10) || 1);
  return `${fmtDateShort(course.startKey)} — ${fmtDateShort(end)} · ${days} ${plural(days, 'день', 'дня', 'дней')}`;
}

/* ============================ v3.2: СЕКЦИИ ДНЯ ============================ */
const SECTIONS_KEY = 'eog-sad-sections';
let sectionsState = loadSections();

function loadSections(){
  try {
    const raw = localStorage.getItem(SECTIONS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
  } catch(e){ return {}; }
}
function saveSections(){
  try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(sectionsState)); } catch(e){}
}
// Возвращает: user preference, если она есть; иначе autoDefault
function sectionIsOpen(key, autoDefault){
  if (Object.prototype.hasOwnProperty.call(sectionsState, key)) {
    return !!sectionsState[key];
  }
  return !!autoDefault;
}

/* ============================ ЭПИЗОДЫ ============================ */
function getEpisodes(daysObj){
  const sickKeys = Object.keys(daysObj)
    .filter(k => daysObj[k].status === 'sick')
    .sort();
  const episodes = [];
  let current = null;
  for (const k of sickKeys){
    if (current){
      const last = parseK(current.end);
      const d    = parseK(k);
      const gap  = Math.round((d - last) / 86400000);
      if (gap <= 2){ current.end = k; continue; }
    }
    if (current) episodes.push(current);
    current = { start: k, end: k, diagnoses: new Set(), days: 0 };
  }
  if (current) episodes.push(current);
  episodes.forEach(ep => {
    const s = parseK(ep.start), e = parseK(ep.end);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)){
      const rec = daysObj[keyOf(d)];
      if (rec && rec.diagnosis && rec.diagnosis.trim()) ep.diagnoses.add(rec.diagnosis.trim());
    }
    ep.days = Math.round((e - s) / 86400000) + 1;
    ep.diagnoses = [...ep.diagnoses].filter(Boolean);
  });
  return episodes;
}

/* ============================ ЭЛЕМЕНТЫ ============================ */
const daysEl        = document.getElementById('days');
const daysWrap      = document.getElementById('daysWrap');
const weekDaysEl    = document.getElementById('weekDays');
const weekDaysWrap  = document.getElementById('weekDaysWrap');
const monthViewEl   = document.getElementById('calendarMonthView');
const weekViewEl    = document.getElementById('calendarWeekView');
const panelEl       = document.getElementById('panel');
const statsEl       = document.getElementById('stats');
const analyticsEl   = document.getElementById('analytics');
const monthTitle    = document.getElementById('monthTitle');
const chartMonth    = document.getElementById('chartMonth');
const chartEl       = document.getElementById('tempChart');
const heroMetaEl    = document.getElementById('heroMeta');
const doseBar       = document.getElementById('doseBar');
const sheet         = document.getElementById('sheet');
const backdrop      = document.getElementById('backdrop');
const sheetClose    = document.getElementById('sheetClose');
const grip          = document.getElementById('grip');
const copyOptsModal = document.getElementById('copyOpts');
const pdfOptsModal  = document.getElementById('pdfOpts');

/* ============================ ВИД ============================ */
const now0 = new Date();
let view = { y: now0.getFullYear(), m: now0.getMonth() };
let selected = keyOf(now0);
let summaryKey = keyOf(now0);
let currentPeriod = 'month';
let viewMode = 'month';
let weekAnchor = keyOf(now0);
let symptomsExpanded = false;
let chartMode = getActiveChild().chartMode || 'month';

/* ============================ ТЕМА ============================ */
function applyTheme(){
  document.documentElement.dataset.theme = state.theme;
}

function updateHeaderChild() {
  const child = getActiveChild();
  const label = document.getElementById('activeChildLabel');
  if (label) {
    label.innerHTML = `Трекер здоровья <b>${esc(child.name || 'Без имени')}</b>`;
  }
}

/* ============================ МЕНЮ ============================ */
const menuBtn         = document.getElementById('menuBtn');
const menuPanel       = document.getElementById('menuPanel');
const menuBackdrop    = document.getElementById('menuBackdrop');
const menuClose       = document.getElementById('menuClose');
const menuNameInput   = document.getElementById('menuName');
const menuThemeToggle = document.getElementById('menuThemeToggle');
const menuThemeIcon   = document.getElementById('menuThemeIcon');
const menuThemeLabel  = document.getElementById('menuThemeLabel');
const menuChildrenList = document.getElementById('menuChildrenList');
const menuAddChildBtn = document.getElementById('menuAddChildBtn');

function updateMenuThemeLabel(){
  if (state.theme === 'dark'){
    menuThemeIcon.textContent  = '☀️';
    menuThemeLabel.textContent = 'Светлая тема';
  } else {
    menuThemeIcon.textContent  = '🌙';
    menuThemeLabel.textContent = 'Тёмная тема';
  }
}

function renderMenuChildren() {
  menuChildrenList.innerHTML = state.children.map(child => `
    <div class="menu-child-item ${child.id === state.activeChildId ? 'active' : ''}" data-id="${child.id}">
      <span class="menu-child-name">${esc(child.name) || 'Без имени'}</span>
      ${state.children.length > 1 ? `<button class="menu-child-del" data-id="${child.id}">✕</button>` : ''}
    </div>
  `).join('');
}

menuChildrenList.addEventListener('click', e => {
  const delBtn = e.target.closest('.menu-child-del');
  if (delBtn) {
    e.stopPropagation();
    const id = delBtn.dataset.id;
    if (!confirm('Удалить профиль этого ребёнка? Данные будут потеряны.')) return;
    state.children = state.children.filter(c => c.id !== id);
    if (state.activeChildId === id) {
      state.activeChildId = state.children[0].id;
    }
    save();
    render();
    renderMenuChildren();
    menuNameInput.value = getActiveChild().name || '';
    return;
  }
  const item = e.target.closest('.menu-child-item');
  if (item) {
    state.activeChildId = item.dataset.id;
    save();
    render();
    renderMenuChildren();
    menuNameInput.value = getActiveChild().name || '';
  }
});

menuAddChildBtn.addEventListener('click', () => {
  const name = prompt('Как зовут нового ребёнка?');
  if (!name || !name.trim()) return;
  const newId = 'child_' + uid();
  state.children.push({
    id: newId,
    name: name.trim(),
    days: {},
    courses: [],
    copyOptions: { ...DEFAULT_COPY_OPTIONS },
    symptomFilter: 'all',
    chartMode: 'month',
    chartAnchor: keyOf(new Date())
  });
  state.activeChildId = newId;
  save();
  render();
  renderMenuChildren();
  menuNameInput.value = name.trim();
});

function openMenu(){
  const rect = menuBtn.getBoundingClientRect();
  const menuWidth = Math.min(300, window.innerWidth - 24);
  const leftPos = Math.max(
    12,
    Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth)
  );
  menuPanel.style.top  = (rect.bottom + 8) + 'px';
  menuPanel.style.left = leftPos + 'px';
  menuNameInput.value = getActiveChild().name || '';
  updateMenuThemeLabel();
  renderMenuChildren();
  menuPanel.classList.add('show');
  menuBackdrop.classList.add('show');
  menuBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('no-scroll');
}
function closeMenu(){
  menuPanel.classList.remove('show');
  menuBackdrop.classList.remove('show');
  menuBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('no-scroll');
}
menuBtn.addEventListener('click', () => {
  if (menuPanel.classList.contains('show')) closeMenu();
  else openMenu();
});
menuClose.addEventListener('click', closeMenu);
menuBackdrop.addEventListener('click', closeMenu);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menuPanel.classList.contains('show')) closeMenu();
});
menuNameInput.addEventListener('input', e => {
  getActiveChild().name = e.target.value.trim();
  save();
  updateHeaderChild();
  renderDaySummary();
  renderMenuChildren();
});
menuThemeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  save();
  applyTheme();
  updateMenuThemeLabel();
});

function switchChild(dir) {
  if (state.children.length < 2) return;
  const idx = state.children.findIndex(c => c.id === state.activeChildId);
  if (idx === -1) return;
  const nextIdx = (idx + dir + state.children.length) % state.children.length;
  state.activeChildId = state.children[nextIdx].id;
  save();
  render();
  if (menuPanel.classList.contains('show')) {
    renderMenuChildren();
    menuNameInput.value = getActiveChild().name || '';
  }
  toast(`Профиль: ${getActiveChild().name || 'Без имени'}`);
}

/* ============================ ТОСТ ============================ */
let toastTimer = null;
function toast(msg, undoFn){
  let el = document.getElementById('toast');
  if (!el){
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.innerHTML = '';
  const span = document.createElement('span');
  span.className = 'tst-text';
  span.textContent = msg;
  el.appendChild(span);
  if (undoFn){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Отменить';
    btn.onclick = () => { hideToast(); undoFn(); };
    el.appendChild(btn);
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undoFn ? 8000 : 2600);
}
function hideToast(){
  const el = document.getElementById('toast');
  if (el) el.classList.remove('show');
  clearTimeout(toastTimer);
}

/* ============================ КОПИРОВАНИЕ ============================ */
let copyMode = null;
let lastCopyUndo = null;

function defaultCopyOptions(){ return { ...DEFAULT_COPY_OPTIONS }; }

function conflictFields(dst, options){
  if (!dst) return [];
  const c = [];
  if (options.status    && dst.status)                            c.push('статус');
  if (options.garden    && dst.garden)                            c.push('«был в садике»');
  if (options.home      && dst.home)                              c.push('«остался дома»');
  if (options.diagnosis && dst.diagnosis && dst.diagnosis.trim()) c.push('диагноз');
  if (options.symptoms  && dst.symptoms  && dst.symptoms.length)  c.push('симптомы');
  if (options.temps     && dst.temps     && dst.temps.length)     c.push('температура');
  if (options.meds      && dst.meds      && dst.meds.length)      c.push('препараты');
  if (options.note      && dst.note      && dst.note.trim())      c.push('заметка');
  return c;
}

function copyDayDataToKeys(fromKey, targetKeys, options){
  const targets = (targetKeys || []).filter(k => k && k !== fromKey);
  if (!targets.length) return;
  const days = getActiveChild().days;
  const src = days[fromKey];
  if (!hasAnyData(src)){ toast('В этом дне нет данных для копирования'); return; }
  const opts = options || state.copyOptions || defaultCopyOptions();
  const keys = Object.keys(opts).filter(k => opts[k]);
  if (!keys.length){ toast('Не выбрано ни одного параметра'); return; }

  const conflictsList = [];
  targets.forEach(tk => {
    const c = conflictFields(days[tk], opts);
    if (c.length) conflictsList.push({ key: tk, conflicts: c });
  });
  if (conflictsList.length){
    const first = conflictsList.slice(0, 5).map(c =>
      `${fmtDateShort(c.key)}: ${c.conflicts.join(', ')}`).join('\n');
    const extra = conflictsList.length > 5 ? `\n… и ещё ${conflictsList.length - 5}` : '';
    if (!confirm(`Перезапишутся данные в ${conflictsList.length} ${plural(conflictsList.length, 'дне', 'днях', 'днях')}:\n\n${first}${extra}\n\nПродолжить?`)) return;
  }

  const prevStates = targets.map(tk => ({
    key: tk,
    data: days[tk] ? JSON.parse(JSON.stringify(days[tk])) : null
  }));

  targets.forEach(tk => {
    const dst = days[tk];
    const base = dst
      ? JSON.parse(JSON.stringify(dst))
      : { status:null, symptoms:[], temps:[], meds:[], note:'', diagnosis:'', garden:false, home:false };
    base.meds = base.meds || [];

    if (opts.status)    base.status    = src.status || null;
    if (opts.garden)    base.garden    = !!src.garden;
    if (opts.home)      base.home      = !!src.home;
    if (opts.diagnosis) base.diagnosis = src.diagnosis || '';
    if (opts.symptoms)  base.symptoms  = (src.symptoms || []).slice();
    if (opts.temps)     base.temps     = (src.temps || []).map(t => ({...t, id: uid()}));
    if (opts.meds)      base.meds      = (src.meds || []).map(m => {
      const copy = { ...m, id: uid() };
      if (copy.courseId){
        if (copy.customName && copy.med === 'other' && (!copy.note || !copy.note.trim())){
          copy.note = copy.customName;
        }
        delete copy.courseId;
        delete copy.customName;
      }
      return copy;
    });
    if (opts.note)      base.note      = src.note || '';

    if (hasAnyData(base)) days[tk] = base;
    else delete days[tk];
  });

  lastCopyUndo = { prevStates };
  save();
  render();
  const label = targets.length === 1
    ? fmtDateShort(targets[0])
    : `${targets.length} ${plural(targets.length, 'день', 'дня', 'дней')}`;
  toast(`Скопировано ${fmtDateShort(fromKey)} → ${label}`, () => undoLastCopy());
}
function copyDayData(fromKey, toKey, options){ copyDayDataToKeys(fromKey, [toKey], options); }

function undoLastCopy(){
  if (!lastCopyUndo) return;
  const days = getActiveChild().days;
  if (lastCopyUndo.prevStates){
    lastCopyUndo.prevStates.forEach(({ key, data }) => {
      if (data === null) delete days[key];
      else days[key] = data;
    });
  }
  lastCopyUndo = null;
  save();
  render();
  toast('Копирование отменено');
}

let copyOptsSourceKey = null;
function showCopyOptionsDialog(fromKey){
  if (!fromKey) return;
  if (!hasAnyData(getActiveChild().days[fromKey])){ toast('В этом дне нет данных для копирования'); return; }
  copyOptsSourceKey = fromKey;
  const d = parseK(fromKey);
 
