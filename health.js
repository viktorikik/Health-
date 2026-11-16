/* ============================ КАРТОЧКА ЗДОРОВЬЯ ============================ */
let currentHlType = '';

function ensureHealthCard() {
  const child = getActiveChild();
  if (!child.healthCard) {
    child.healthCard = { visits: [], vaccines: [], notes: [], growth: [] };
    save();
  }
  return child.healthCard;
}

function getAgeString(dobStr) {
  if (!dobStr) return '';
  const dob = parseK(dobStr);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) {
    years--; months += 12;
  }
  if (years > 0) return `${years} ${plural(years, 'год', 'года', 'лет')}`;
  if (months > 0) return `${months} ${plural(months, 'месяц', 'месяца', 'месяцев')}`;
  return 'Меньше месяца';
}

// Очистка HTML от опасных тегов (XSS)
function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove());
  const allowed = ['B', 'STRONG', 'I', 'EM', 'U', 'P', 'BR', 'DIV', 'SPAN'];
  const walk = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT, null, false);
  const nodesToRemove = [];
  let node = walk.nextNode();
  while (node) {
    if (!allowed.includes(node.tagName)) nodesToRemove.push(node);
    else Array.from(node.attributes).forEach(attr => node.removeAttribute(attr.name));
    node = walk.nextNode();
  }
  nodesToRemove.forEach(n => {
    const parent = n.parentNode;
    while (n.firstChild) parent.insertBefore(n.firstChild, n);
    parent.removeChild(n);
  });
  return div.innerHTML;
}

// Умный парсер текста: чистит звездочки, делает списки и выделяет ключевые слова
function formatMedicalText(html) {
  if (!html) return '';
  let text = html;

  // 1. Нормализуем переносы (заменяем div/p на br)
  text = text.replace(/<\/?(div|p|span)>/gi, '<br>');

  // 2. Конвертируем Markdown-жирный **текст** в <b>текст</b>
  text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // 3. Убираем оставшиеся звездочки (маркеры списков)
  text = text.replace(/\*/g, '');

  // 4. Выделяем ключевые слова и ставим отступы
  const keywords = ['диагноз', 'лечение', 'рекомендации', 'назначения'];
  keywords.forEach(kw => {
    const regex = new RegExp(`(^|<br>|\\s)(${kw})(:?)`, 'gi');
    text = text.replace(regex, (match, prefix, word, colon) => {
      // Если слово в начале или после br, не ставим лишние отступы
      const safePrefix = (prefix === '<br>' || prefix.trim() === '') ? '' : '<br><br>';
      // Принудительно делаем жирным
      return `${safePrefix}<b>${word}${colon}</b>`;
    });
  });

  // 5. Форматируем нумерованные списки (1., 2.) и маркированные (-)
  text = text.replace(/(<br>|^)\s*(\d+\.)\s+/g, '<br><br>$2 ');
  text = text.replace(/(<br>|^)\s*-\s+/g, '<br><br>• ');

  // 6. Чистим лишние переносы строк
  text = text.replace(/(<br>){3,}/gi, '<br><br>');
  text = text.replace(/^(<br>)+/i, '');

  return text;
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
  const child = getActiveChild();
  const childName = child.name || 'ребёнка';
  const age = getAgeString(child.birthDate);

  document.getElementById('hcTitle').innerHTML = `
    Карточка здоровья <br>
    <span style="color:var(--muted); font-size:0.75em; font-weight:600">
      ${esc(childName)} ${age ? `· ${age}` : ''}
    </span>
  `;

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
    recentListEl.innerHTML = allRecords.map(r => {
      let textHtml = esc(r.notes || r.text || '');
      if (r.type === 'visit' && r.notes) {
        // На лету причесываем старые записи, если в них остались звездочки
        const formatted = formatMedicalText(r.notes);
        textHtml = sanitizeHtml(formatted);
      }

      return `<div class="hc-recent-item">
        <div class="hc-recent-dot"></div>
        <div><div class="hc-recent-date">${fmtDateShort(r.date)} · ${r.label || 'Запись'}</div><div class="hc-recent-text">${textHtml}</div></div>
      </div>`;
    }).join('');
  } else {
    recentListEl.innerHTML = '<p class="muted small">Пока нет записей. Нажми на любую карточку выше, чтобы добавить.</p>';
  }

  renderGrowthChart(hc.growth);
}

function renderGrowthChart(growth) {
  const chartWrap = document.getElementById('hcGrowthChartWrap');
  if (!growth || growth.length < 2) { 
    chartWrap.innerHTML = ''; 
    chartWrap.style.display = 'none';
    return; 
  }
  chartWrap.style.display = 'block';
  
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

/* ============================ СПИСОК ЗАПИСЕЙ ============================ */
function openHealthList(type) {
  currentHlType = type;
  const titles = { visit: 'Осмотры', vaccine: 'Прививки', note: 'Заметки', growth: 'Рост и вес' };
  document.getElementById('hlTitle').textContent = titles[type];
  renderHealthList();
  document.getElementById('healthListModal').classList.add('show');
  syncBodyScroll();
}

function closeHealthList() {
  document.getElementById('healthListModal').classList.remove('show');
  if (!document.getElementById('healthCardView').classList.contains('show')) syncBodyScroll();
}

function renderHealthList() {
  const hc = ensureHealthCard();
  const type = currentHlType;
  const arrKey = type + 's';
  const arr = hc[arrKey] || [];
  const listEl = document.getElementById('hlList');
  
  if (!arr.length) {
    listEl.innerHTML = '<p class="muted small" style="padding:20px 0; text-align:center;">Пока нет записей.</p>';
    return;
  }
  
  const sorted = arr.slice().sort((a,b) => b.date.localeCompare(a.date));

  const groups = {};
  sorted.forEach(r => {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  });

  const dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  listEl.innerHTML = dateKeys.map(dateKey => {
    const items = groups[dateKey];
    const d = parseK(dateKey);
    const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    const dateLabel = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

    const itemsHtml = items.map(r => {
      let title = '';
      if (type === 'visit') title = r.doctor;
      else if (type === 'vaccine') title = r.name;
      else if (type === 'note') title = r.text;
      else if (type === 'growth') title = `${r.height} см, ${r.weight} кг`;

      let notesHtml = '';
      if (r.notes && type !== 'note') {
         // Пропускаем старые записи через парсер, чтобы убрать звездочки
         const formatted = formatMedicalText(r.notes);
         notesHtml = type === 'visit' ? sanitizeHtml(formatted) : esc(r.notes);
      }
      
      const hasMore = !!notesHtml;

      return `<div class="hc-list-item">
        <div class="hc-list-main" ${hasMore ? `data-hl-toggle="true"` : ''}>
          <div class="hc-list-title">${esc(title)}</div>
          ${notesHtml ? `<div class="hc-list-notes">${notesHtml}</div>` : ''}
        </div>
        <div class="hc-list-actions">
          <button class="iconbtn tiny" data-hl-edit="${r.id}" type="button" title="Редактировать">✎</button>
          <button class="iconbtn tiny" data-hl-del="${r.id}" type="button" title="Удалить">×</button>
        </div>
      </div>`;
    }).join('');

    return `<details class="hc-date-group" open>
      <summary class="hc-date-summary">
        <span>${dateLabel}</span>
        <span class="hc-date-badge">${items.length}</span>
      </summary>
      <div class="hc-date-items">
        ${itemsHtml}
      </div>
    </details>`;
  }).join('');
}

document.getElementById('hlList').addEventListener('click', e => {
  // Раскрытие текста внутри карточки
  const toggleBtn = e.target.closest('[data-hl-toggle]');
  if (toggleBtn) {
    const item = toggleBtn.closest('.hc-list-item');
    item.classList.toggle('expanded');
    return; 
  }

  // Редактирование
  const editBtn = e.target.closest('[data-hl-edit]');
  if (editBtn) {
    closeHealthList();
    openHealthForm(currentHlType, editBtn.dataset.hlEdit);
  }
  
  // Удаление
  const delBtn = e.target.closest('[data-hl-del]');
  if (delBtn) {
    if (!confirm('Удалить эту запись?')) return;
    const hc = ensureHealthCard();
    const arrKey = currentHlType + 's';
    hc[arrKey] = hc[arrKey].filter(x => x.id !== delBtn.dataset.hlDel);
    save();
    renderHealthList();
    renderHealthCard();
  }
});

document.getElementById('hlAddBtn').addEventListener('click', () => {
  closeHealthList();
  openHealthForm(currentHlType);
});
document.getElementById('hlClose').addEventListener('click', closeHealthList);
document.getElementById('healthListModal').addEventListener('click', e => { if (e.target === document.getElementById('healthListModal')) closeHealthList(); });

/* ============================ ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ ============================ */
function openHealthForm(type, editId = null) {
  const hc = ensureHealthCard();
  const record = editId ? (hc[type + 's'] || []).find(x => x.id === editId) : null;
  const isEdit = !!record;

  const title = document.getElementById('hfTitle'); 
  const fields = document.getElementById('hfFields');
  
  document.getElementById('hfType').value = type; 
  document.getElementById('hfId').value = editId || '';
  document.getElementById('hfDate').value = record ? record.date : keyOf(new Date()); 
  document.getElementById('hfSub').textContent = isEdit ? 'Редактирование записи' : 'Данные сохранятся в карточку текущего ребёнка';
  
  fields.innerHTML = '';
  
  if (type === 'visit') {
    title.textContent = isEdit ? 'Редактировать осмотр' : 'Добавить осмотр';
    // При редактировании тоже прогоняем через форматтер, чтобы очистить старые данные от звездочек
    const initialNotes = isEdit ? formatMedicalText(record.notes || '') : '';
    fields.innerHTML = `
      <div class="section-label" style="margin-top:0">Врач / Специальность</div>
      <input class="inp" id="hfDoctor" placeholder="Например, Педиатр" value="${isEdit ? esc(record.doctor) : ''}" required>
      
      <div class="section-label">Заметки (диагноз, лечение)</div>
      <div class="rich-editor-wrap">
        <div class="rich-toolbar">
          <button type="button" class="rich-btn" data-cmd="bold" title="Жирный"><b>Ж</b></button>
          <button type="button" class="rich-btn" data-cmd="underline" title="Подчеркнутый"><u>Ч</u></button>
        </div>
        <div class="rich-editor inp" id="hfNotesRich" contenteditable="true" placeholder="Введите текст...">${initialNotes}</div>
      </div>
    `;
    
    setTimeout(() => {
      const editor = document.getElementById('hfNotesRich');
      const toolbar = document.querySelector('.rich-toolbar');
      
      toolbar.addEventListener('click', e => {
        const btn = e.target.closest('.rich-btn');
        if (!btn) return;
        e.preventDefault();
        document.execCommand(btn.dataset.cmd, false, null);
        editor.focus();
      });

      editor.addEventListener('paste', e => {
        e.preventDefault();
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        let html = esc(text).replace(/\n/g, '<br>');
        html = formatMedicalText(html);
        document.execCommand('insertHTML', false, html);
      });
    }, 50);

  } else if (type === 'vaccine') {
    title.textContent = isEdit ? 'Редактировать прививку' : 'Добавить прививку';
    fields.innerHTML = `
      <div class="section-label" style="margin-top:0">Название вакцины</div>
      <input class="inp" id="hfName" placeholder="Например, Пентаксим" value="${isEdit ? esc(record.name) : ''}" required>
      <div class="section-label">Заметки</div>
      <textarea class="inp" id="hfNotes" rows="2" placeholder="Реакция, серия вакцины">${isEdit ? esc(record.notes || '') : ''}</textarea>
    `;
  } else if (type === 'note') {
    title.textContent = isEdit ? 'Редактировать заметку' : 'Добавить заметку';
    fields.innerHTML = `
      <div class="section-label" style="margin-top:0">Текст заметки</div>
      <textarea class="inp" id="hfText" rows="3" placeholder="Например: Аллергия на цитрусовые" required>${isEdit ? esc(record.text) : ''}</textarea>
    `;
  } else if (type === 'growth') {
    title.textContent = isEdit ? 'Редактировать рост и вес' : 'Добавить рост и вес';
    fields.innerHTML = `
      <div class="row">
        <div style="flex:1">
          <div class="section-label" style="margin-top:0">Рост (см)</div>
          <input class="inp" type="number" step="0.1" id="hfHeight" placeholder="95.5" value="${isEdit ? record.height : ''}" required>
        </div>
        <div style="flex:1">
          <div class="section-label" style="margin-top:0">Вес (кг)</div>
          <input class="inp" type="number" step="0.1" id="hfWeight" placeholder="14.2" value="${isEdit ? record.weight : ''}" required>
        </div>
      </div>
    `;
  }

  document.getElementById('healthFormModal').classList.add('show'); 
  syncBodyScroll();
}

function closeHealthForm() { 
  document.getElementById('healthFormModal').classList.remove('show'); 
  if (!document.getElementById('healthCardView').classList.contains('show') && !document.getElementById('healthListModal').classList.contains('show')) {
    syncBodyScroll(); 
  }
}

document.getElementById('hfSave').addEventListener('click', () => {
  const type = document.getElementById('hfType').value; 
  const editId = document.getElementById('hfId').value;
  const date = document.getElementById('hfDate').value;
  if (!date) { alert('Укажи дату'); return; }
  
  const hc = ensureHealthCard();
  const arrKey = type + 's';
  
  let record = editId ? hc[arrKey].find(x => x.id === editId) : null;
  if (!record) {
    record = { id: uid() };
    hc[arrKey].push(record);
  }
  
  record.date = date;

  if (type === 'visit') { 
    const doctor = document.getElementById('hfDoctor').value.trim(); 
    if (!doctor) { alert('Укажи врача'); return; } 
    record.doctor = doctor;
    const rawNotes = document.getElementById('hfNotesRich').innerHTML;
    let clean = formatMedicalText(rawNotes);
    clean = sanitizeHtml(clean);
    record.notes = clean;
  } else if (type === 'vaccine') { 
    const name = document.getElementById('hfName').value.trim(); 
    if (!name) { alert('Укажи название'); return; } 
    record.name = name;
    record.notes = document.getElementById('hfNotes').value.trim(); 
  } else if (type === 'note') { 
    const text = document.getElementById('hfText').value.trim(); 
    if (!text) { alert('Введи текст'); return; } 
    record.text = text; 
  } else if (type === 'growth') { 
    const height = parseFloat(document.getElementById('hfHeight').value); 
    const weight = parseFloat(document.getElementById('hfWeight').value); 
    if (isNaN(height) || isNaN(weight)) { alert('Введи корректные числа'); return; } 
    record.height = height;
    record.weight = weight; 
  }

  save(); 
  closeHealthForm(); 
  renderHealthCard();
  
  if (document.getElementById('healthListModal').classList.contains('show')) {
    renderHealthList();
  }
});

document.getElementById('openHealthCardBtn').addEventListener('click', openHealthCard);
document.getElementById('hcBackBtn').addEventListener('click', closeHealthCard);
document.getElementById('hfCancel').addEventListener('click', closeHealthForm);
document.getElementById('healthFormModal').addEventListener('click', (e) => { if (e.target === document.getElementById('healthFormModal')) closeHealthForm(); });

document.querySelectorAll('[data-hc-add]').forEach(btn => { 
  btn.addEventListener('click', () => openHealthList(btn.dataset.hcAdd)); 
});
