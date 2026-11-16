/* ============================ КАРТОЧКА ЗДОРОВЬЯ ============================ */

// Инициализация структуры данных для ребенка, если её нет
function ensureHealthCard() {
  const child = getActiveChild();
  if (!child.healthCard) {
    child.healthCard = {
      visits: [],    // Осмотры
      vaccines: [],  // Прививки
      notes: [],     // Заметки
      growth: []     // Рост и вес
    };
    save();
  }
  return child.healthCard;
}

// Открытие/закрытие полноэкранного вида
function openHealthCard() {
  ensureHealthCard();
  document.getElementById('healthCardView').classList.add('show');
  document.body.classList.add('no-scroll');
  renderHealthCard();
}

function closeHealthCard() {
  document.getElementById('healthCardView').classList.remove('show');
  document.body.classList.remove('no-scroll');
}

// Рендер главного экрана карточки
function renderHealthCard() {
  const hc = ensureHealthCard();
  const childName = getActiveChild().name || 'ребёнка';

  // Обновляем заголовок
  document.getElementById('hcTitle').innerHTML = `Карточка здоровья <br><span style="color:var(--text-2); font-size:0.8em">${esc(childName)}</span>`;

  // Считаем количество
  document.getElementById('hcVisitCount').textContent = `${hc.visits.length} записей`;
  document.getElementById('hcVaccineCount').textContent = `${hc.vaccines.length} записей`;
  document.getElementById('hcNoteCount').textContent = `${hc.notes.length} записей`;
  document.getElementById('hcGrowthCount').textContent = hc.growth.length ? `${hc.growth.length} замеров` : 'Нет данных';

  // Последние записи (сортируем все по дате)
  const allRecords = [
    ...hc.visits.map(v => ({...v, type: 'visit', icon: '🩺', label: 'Осмотр'})),
    ...hc.vaccines.map(v => ({...v, type: 'vaccine', icon: '💉', label: 'Прививка'})),
    ...hc.notes.map(v => ({...v, type: 'note', icon: '📝', label: 'Заметка'})),
    ...hc.growth.map(v => ({...v, type: 'growth', icon: '📈', label: 'Рост/вес'}))
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5); // Берем 5 последних

  const recentListEl = document.getElementById('hcRecentList');
  if (allRecords.length) {
    recentListEl.innerHTML = allRecords.map(r => {
      let title = '';
      if (r.type === 'visit') title = r.doctor || 'Плановый осмотр';
      if (r.type === 'vaccine') title = r.name || 'Вакцинация';
      if (r.type === 'note') title = r.text;
      if (r.type === 'growth') title = `Рост: ${r.height || '—'} см, Вес: ${r.weight || '—'} кг`;
      
      return `<div class="hc-recent-item">
        <div class="hc-recent-dot"></div>
        <div>
          <div class="hc-recent-date">${fmtDateShort(r.date)}</div>
          <div class="hc-recent-text">${esc(title)}</div>
        </div>
      </div>`;
    }).join('');
  } else {
    recentListEl.innerHTML = '<p class="muted small">Пока нет записей. Добавь первую!</p>';
  }
}

// Модалка добавления записи
function openHealthForm(type) {
  const modal = document.getElementById('healthFormModal');
  const title = document.getElementById('hfTitle');
  const fields = document.getElementById('hfFields');
  const typeInput = document.getElementById('hfType');
  const dateInput = document.getElementById('hfDate');
  
  typeInput.value = type;
  dateInput.value = keyOf(new Date());
  
  // Очищаем и строим поля в зависимости от типа
  fields.innerHTML = '';
  
  if (type === 'visit') {
    title.textContent = 'Добавить осмотр';
    fields.innerHTML = `
      <div class="section-label" style="margin-top:0">Врач / Специальность</div>
      <input class="inp" id="hfDoctor" placeholder="Например, Педиатр" required>
      <div class="section-label">Заметки</div>
      <input class="inp" id="hfNotes" placeholder="Что сказал врач">
    `;
  } else if (type === 'vaccine') {
    title.textContent = 'Добавить прививку';
    fields.innerHTML = `
      <div class="section-label" style="margin-top:0">Название вакцины</div>
      <input class="inp" id="hfName" placeholder="Например, Пентаксим" required>
      <div class="section-label">Заметки</div>
      <input class="inp" id="hfNotes" placeholder="Реакция, серия вакцины">
    `;
  } else if (type === 'note') {
    title.textContent = 'Добавить заметку';
    fields.innerHTML = `
      <div class="section-label" style="margin-top:0">Текст заметки</div>
      <textarea class="inp" id="hfText" rows="3" placeholder="Например: Аллергия на цитрусовые" required></textarea>
    `;
  } else if (type === 'growth') {
    title.textContent = 'Добавить рост и вес';
    fields.innerHTML = `
      <div class="row">
        <div style="flex:1">
          <div class="section-label" style="margin-top:0">Рост (см)</div>
          <input class="inp" type="number" step="0.1" id="hfHeight" placeholder="95.5" required>
        </div>
        <div style="flex:1">
          <div class="section-label" style="margin-top:0">Вес (кг)</div>
          <input class="inp" type="number" step="0.1" id="hfWeight" placeholder="14.2" required>
        </div>
      </div>
    `;
  }

  modal.classList.add('show');
}

function closeHealthForm() {
  document.getElementById('healthFormModal').classList.remove('show');
}

// Сохранение записи
document.getElementById('hfSave').addEventListener('click', () => {
  const type = document.getElementById('hfType').value;
  const date = document.getElementById('hfDate').value;
  if (!date) { alert('Укажи дату'); return; }

  const hc = ensureHealthCard();
  
  if (type === 'visit') {
    const doctor = document.getElementById('hfDoctor').value.trim();
    if (!doctor) { alert('Укажи врача'); return; }
    hc.visits.push({ id: uid(), date, doctor, notes: document.getElementById('hfNotes').value.trim() });
  } else if (type === 'vaccine') {
    const name = document.getElementById('hfName').value.trim();
    if (!name) { alert('Укажи название'); return; }
    hc.vaccines.push({ id: uid(), date, name, notes: document.getElementById('hfNotes').value.trim() });
  } else if (type === 'note') {
    const text = document.getElementById('hfText').value.trim();
    if (!text) { alert('Введи текст'); return; }
    hc.notes.push({ id: uid(), date, text });
  } else if (type === 'growth') {
    const height = parseFloat(document.getElementById('hfHeight').value);
    const weight = parseFloat(document.getElementById('hfWeight').value);
    if (isNaN(height) || isNaN(weight)) { alert('Введи корректные числа'); return; }
    hc.growth.push({ id: uid(), date, height, weight });
  }

  save();
  closeHealthForm();
  renderHealthCard();
});
