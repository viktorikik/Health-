/* ============================================================
   meds.js · v1.0 · СОЗДАТЬ НОВЫЙ (или заменить целиком)
   Волна 17. Четыре возможности:
   1) Выделил название в осмотре → кнопка «＋ В назначения» с датой.
   2) Плитка «препаратов» → база: группировка, дубликаты, объединение,
      переименование, удаление с отменой, CSV, словарь названий.
   3) Курсы дня → «Отметить все» / «Снять все» одной операцией.
   4) Пустой график температуры → «＋ Добавить замер» и быстрый ввод.
   Данные: обычные Med и Temp в getActiveChild().days — схема не меняется.
   Словарь: служебный ключ eog-meds-dict (вне state).
   Подключать ПОСЛЕ app.js (и после growth.js, если он есть).
   ============================================================ */
(function(){
  'use strict';
  if (window.EOGMeds) return;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DICT_KEY = 'eog-meds-dict';

  /* ===== утилиты ===== */
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function pad(n){ return String(n).padStart(2,'0'); }
  function uid(){ try{ if(typeof window.uid==='function') return window.uid(); }catch(e){} return 'm'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function keyOf(d){ try{ if(typeof window.keyOf==='function') return window.keyOf(d); }catch(e){} return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parseK(k){ try{ if(typeof window.parseK==='function') return window.parseK(k); }catch(e){} var p=String(k||'').split('-'); return new Date(+p[0],(+p[1]||1)-1,+p[2]||1); }
  function nowTime(){ var d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
  function norm(s){ return String(s||'').trim().toLowerCase().replace(/ё/g,'е').replace(/[^\wа-я0-9 ]/gi,'').replace(/\s+/g,' ').trim(); }
  function plural(n,a,b,c){ n=Math.abs(n)%100; var n1=n%10; if(n>10&&n<20)return c; if(n1>1&&n1<5)return b; if(n1===1)return a; return c; }
  var MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  function fmtDate(k){ var d=parseK(k); return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear(); }
  function fmtShort(k){ var d=parseK(k); return pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2); }
  function hap(p){ try{ if(window.EOGMotion&&EOGMotion.haptic)EOGMotion.haptic(p); else if(navigator.vibrate)navigator.vibrate(p||8); }catch(e){} }
  function sfx(n){ try{ if(window.EOGMotion&&EOGMotion.sfx)EOGMotion.sfx(n); }catch(e){} }
  function $(s,r){ return (r||document).querySelector(s); }
  function $$(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
  function num(v){ var n=parseFloat(String(v==null?'':v).replace(',','.')); return isFinite(n)?n:NaN; }
  function fmtT(v){ return (Math.round(v*10)/10).toFixed(1).replace('.',','); }

  function child(){ try{ if(typeof getActiveChild==='function')return getActiveChild(); }catch(e){} try{ if(window.state&&window.state.children)return window.state.children.find(function(c){return c.id===window.state.activeChildId;})||window.state.children[0]; }catch(e){} return null; }
  function days(){ var c=child(); return c&&c.days?c.days:{}; }
  function selKey(){ return window.selected || keyOf(new Date()); }
  function getDay(k,create){ try{ if(typeof window.getDay==='function')return window.getDay(k,create); }catch(e){} var ds=days(); if(!ds[k]&&create)ds[k]={status:null,symptoms:[],temps:[],meds:[],note:'',diagnosis:'',garden:false,home:false}; return ds[k]; }
  function persist(){ try{ if(typeof save==='function')save(); }catch(e){} try{ if(typeof render==='function')render(); }catch(e){} scheduleHooks(); }
  function medName(m){ if(!m)return ''; if(m.customName)return m.customName; try{ if(typeof medLabel==='function')return medLabel(m.med)||m.med||''; }catch(e){} return m.med||''; }
  function medList(){ try{ if(Array.isArray(window.MEDS))return window.MEDS; }catch(e){} return []; }
  function helpList(){ try{ if(Array.isArray(window.HELP))return window.HELP; }catch(e){} return [{id:'',label:'Помогло?'},{id:'yes',label:'Да'},{id:'no',label:'Нет'}]; }

  /* ===== словарь названий (служебный ключ) ===== */
  function dictAll(){ try{ return JSON.parse(localStorage.getItem(DICT_KEY)||'{}')||{}; }catch(e){ return {}; } }
  function dictFor(){ var c=child(); var id=c?c.id:'default'; var all=dictAll(); return Array.isArray(all[id])?all[id]:[]; }
  function dictAdd(name){
    var n=String(name||'').trim(); if(!n)return;
    var c=child(), id=c?c.id:'default', all=dictAll(), arr=Array.isArray(all[id])?all[id]:[];
    if(!arr.some(function(x){return norm(x)===norm(n);})){ arr.push(n); all[id]=arr; try{ localStorage.setItem(DICT_KEY,JSON.stringify(all)); }catch(e){} }
  }
  function knownNames(){
    var set={}, out=[];
    medList().forEach(function(m){ if(m.id&&m.label&&!set[norm(m.label)]){set[norm(m.label)]=1;out.push(m.label);} });
    dictFor().forEach(function(n){ if(n&&!set[norm(n)]){set[norm(n)]=1;out.push(n);} });
    collect().forEach(function(e){ if(e.name&&!set[norm(e.name)]){set[norm(e.name)]=1;out.push(e.name);} });
    return out.sort(function(a,b){return a.localeCompare(b,'ru');});
  }

  /* ===== сбор всех записей препаратов ===== */
  function collect(){
    var ds=days(), out=[];
    Object.keys(ds).forEach(function(k){
      var r=ds[k]; if(!r||!Array.isArray(r.meds))return;
      r.meds.forEach(function(m){ out.push({key:k,id:m.id,time:m.time||'',name:medName(m),dose:m.dose||'',note:m.note||'',courseId:m.courseId||'',med:m.med||'',raw:m}); });
    });
    out.sort(function(a,b){ return a.key<b.key?1:a.key>b.key?-1:(a.time<b.time?1:-1); });
    return out;
  }
  function groups(){
    var map={};
    collect().forEach(function(e){
      var n=norm(e.name)||'без названия';
      if(!map[n])map[n]={norm:n,name:e.name||'Без названия',entries:[],doses:{},days:{},course:false,known:false};
      var g=map[n]; g.entries.push(e);
      if(e.dose)g.doses[e.dose]=1;
      g.days[e.key]=1;
      if(e.courseId)g.course=true;
      if(medList().some(function(m){return m.id&&norm(m.label)===n;}))g.known=true;
    });
    var arr=Object.keys(map).map(function(k){
      var g=map[k];
      g.count=g.entries.length; g.dayCount=Object.keys(g.days).length;
      g.doseList=Object.keys(g.doses);
      var ks=Object.keys(g.days).sort(); g.first=ks[0]; g.last=ks[ks.length-1];
      var counts={}; g.entries.forEach(function(e){counts[e.name]=(counts[e.name]||0)+1;});
      g.name=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0]||g.name;
      g.inDict=dictFor().some(function(x){return norm(x)===g.norm;});
      return g;
    });
    arr.forEach(function(a){
      a.dup=arr.some(function(b){
        if(b===a||a.norm.length<4||b.norm.length<4)return false;
        return a.norm.indexOf(b.norm)>=0||b.norm.indexOf(a.norm)>=0;
      });
    });
    return arr;
  }

  /* ===== тосты ===== */
  var toastsEl;
  function toast(msg,type,undo){
    build();
    while(toastsEl.children.length>=3)toastsEl.firstChild.remove();
    var t=document.createElement('div'); t.className='m-toast '+(type||'ok');
    var d=document.createElement('span'); d.className='d';
    var s=document.createElement('span'); s.textContent=msg;
    t.appendChild(d); t.appendChild(s);
    var killed=false;
    function kill(){ if(killed)return; killed=true; t.classList.remove('show'); setTimeout(function(){t.remove();},340); }
    if(undo){ var u=document.createElement('button'); u.className='u'; u.textContent='Отменить'; u.onclick=function(){undo();kill();}; t.appendChild(u); }
    toastsEl.appendChild(t);
    requestAnimationFrame(function(){requestAnimationFrame(function(){t.classList.add('show');});});
    setTimeout(kill, undo?8000:3200);
    sfx(type==='err'?'del':'ok'); hap(type==='err'?[25,40,25]:10);
  }
  function snapshot(){ var c=child(); return c?JSON.parse(JSON.stringify(c.days)):null; }
  function restore(snap){ var c=child(); if(c&&snap){ c.days=snap; persist(); } }

  /* ===== DOM модуля ===== */
  var view,sheet,selBar;
  function build(){
    if(view)return;
    view=document.createElement('div'); view.id='eogMedsView'; view.setAttribute('role','dialog'); view.setAttribute('aria-modal','true'); view.setAttribute('aria-label','База препаратов');
    view.innerHTML='<div class="mv-head"><button class="mv-back" data-mv="close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>Назад</button><div class="mv-htitle"><div class="t">База препаратов</div><div class="s" id="mvSub">—</div></div></div><div class="mv-body"><div class="mv-wrap" id="mvWrap"></div></div>';
    document.body.appendChild(view);
    sheet=document.createElement('div'); sheet.id='eogMedsSheet'; sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true');
    sheet.innerHTML='<div class="ms-sheet"><div class="ms-grip"></div><div class="ms-body" id="msBody"></div></div>';
    document.body.appendChild(sheet);
    toastsEl=document.createElement('div'); toastsEl.id='eogMedsToasts'; document.body.appendChild(toastsEl);
    selBar=document.createElement('div'); selBar.id='eogSelBar';
    selBar.innerHTML='<span class="sb-name" id="sbName"></span><input type="date" id="sbDate" aria-label="Дата назначения"><button class="sb-add" id="sbAdd">＋ В назначения</button><button class="sb-x" id="sbX" aria-label="Скрыть">×</button>';
    document.body.appendChild(selBar);
    view.addEventListener('click',onViewClick);
    sheet.addEventListener('click',onSheetClick);
    sheet.addEventListener('input',onSheetInput);
    $('#sbAdd').addEventListener('click',addFromSelection);
    $('#sbX').addEventListener('click',hideSel);
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape')return;
      if(sheet.classList.contains('open')){closeSheet();return;}
      if(view.classList.contains('open')){closeView();return;}
      hideSel();
    });
    document.addEventListener('pointerdown',function(e){
      var b=e.target.closest('.mv-btn,.mv-back,.m-cb,.m-add-temp,#sbAdd'); if(!b||RM||b.disabled)return;
      var r=document.createElement('span'); r.className='m-rip';
      var rc=b.getBoundingClientRect(), s=Math.max(rc.width,rc.height);
      r.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-rc.left-s/2)+'px;top:'+(e.clientY-rc.top-s/2)+'px';
      b.appendChild(r); setTimeout(function(){r.remove();},600);
    },{passive:true});
    window.addEventListener('scroll',hideSel,{passive:true});
    window.addEventListener('resize',function(){hideSel();if(view.classList.contains('open'))renderView();});
  }

  /* ===== 1. ВЫДЕЛЕНИЕ → НАЗНАЧЕНИЕ ===== */
  var selText='', selTimer=null;
  function onSelection(){ clearTimeout(selTimer); selTimer=setTimeout(checkSelection,140); }
  function checkSelection(){
    var s=window.getSelection?window.getSelection():null;
    if(!s||s.isCollapsed||!s.rangeCount){hideSel();return;}
    var text=String(s.toString()||'').replace(/\s+/g,' ').trim();
    if(text.length<2||text.length>60||/\n/.test(text)){hideSel();return;}
    var node=s.anchorNode, el=node?(node.nodeType===1?node:node.parentElement):null;
    if(!el||!el.closest||!el.closest('#healthListModal, #healthCardView, #healthFormModal, .exam')){hideSel();return;}
    if(el.closest('#eogSelBar'))return;
    var r;
    try{ r=s.getRangeAt(0).getBoundingClientRect(); }catch(e){ hideSel();return; }
    if(!r||(!r.width&&!r.height)){hideSel();return;}
    selText=text;
    build();
    $('#sbName').textContent=text;
    $('#sbDate').value=selKey();
    selBar.classList.add('show');
    var bw=selBar.offsetWidth, bh=selBar.offsetHeight;
    var left=Math.max(8,Math.min(r.left+r.width/2-bw/2, window.innerWidth-bw-8));
    var top=r.top-bh-10;
    if(top<8) top=Math.min(r.bottom+10, window.innerHeight-bh-8);
    selBar.style.left=left+'px'; selBar.style.top=Math.max(8,top)+'px';
  }
  function hideSel(){ if(selBar)selBar.classList.remove('show'); selText=''; }
  function addFromSelection(){
    var name=selText||$('#sbName').textContent;
    var k=$('#sbDate').value||selKey();
    if(!name){hideSel();return;}
    var c=child(); if(!c){toast('Профиль ребёнка не найден','err');return;}
    var rec=getDay(k,true); if(!rec){toast('День не найден','err');return;}
    rec.meds=rec.meds||[];
    var known=medList().find(function(m){return m.id&&norm(m.label)===norm(name);});
    var entry={id:uid(),time:nowTime(),med:known?known.id:'other',dose:'',note:'из осмотра'};
    if(!known)entry.customName=name;
    rec.meds.push(entry);
    rec.meds.sort(function(a,b){return String(a.time).localeCompare(String(b.time));});
    if(!rec.status)rec.status='sick';
    dictAdd(name);
    var snapEntry={key:k,id:entry.id};
    persist(); hideSel();
    try{ window.getSelection().removeAllRanges(); }catch(e){}
    toast('«'+name+'» → '+fmtShort(k),'ok',function(){
      var r=getDay(snapEntry.key); if(!r)return;
      r.meds=(r.meds||[]).filter(function(m){return m.id!==snapEntry.id;});
      persist(); toast('Назначение убрано');
    });
  }
  document.addEventListener('selectionchange',onSelection);
  document.addEventListener('mouseup',onSelection);
  document.addEventListener('touchend',onSelection,{passive:true});

  /* ===== 2. БАЗА ПРЕПАРАТОВ ===== */
  var MV={q:'',sort:'count',filter:'all',sel:{},open:{}};
  function openView(){ build(); MV.sel={}; view.classList.add('open'); document.body.style.overflow='hidden'; try{if(typeof syncBodyScroll==='function')syncBodyScroll();}catch(e){} renderView(); $('.mv-body',view).scrollTop=0; sfx('open'); hap(10); }
  function closeView(){ if(!view)return; view.classList.remove('open'); closeSheet(); document.body.style.overflow=''; try{if(typeof syncBodyScroll==='function')syncBodyScroll();}catch(e){} sfx('tap'); hap(6); }
  function visibleGroups(){
    var arr=groups(), q=norm(MV.q);
    if(q)arr=arr.filter(function(g){return g.norm.indexOf(q)>=0||g.doseList.join(' ').toLowerCase().indexOf(q)>=0;});
    if(MV.filter==='dup')arr=arr.filter(function(g){return g.dup;});
    if(MV.filter==='course')arr=arr.filter(function(g){return g.course;});
    if(MV.filter==='multi')arr=arr.filter(function(g){return g.count>1;});
    if(MV.sort==='name')arr.sort(function(a,b){return a.name.localeCompare(b.name,'ru');});
    else if(MV.sort==='last')arr.sort(function(a,b){return (b.last||'').localeCompare(a.last||'');});
    else arr.sort(function(a,b){return b.count-a.count||a.name.localeCompare(b.name,'ru');});
    return arr;
  }
  function renderView(){
    var all=groups(), entries=collect(), vis=visibleGroups();
    var dupCount=all.filter(function(g){return g.dup;}).length;
    $('#mvSub').textContent=all.length+' '+plural(all.length,'название','названия','названий')+' · '+entries.length+' '+plural(entries.length,'запись','записи','записей');
    var selNames=Object.keys(MV.sel).filter(function(k){return MV.sel[k];});
    var wrap=$('#mvWrap');
    wrap.innerHTML=
      '<div class="mv-sum"><div class="c a"><div class="v">'+all.length+'</div><div class="l">названий в базе</div></div><div class="c b"><div class="v">'+entries.length+'</div><div class="l">записей всего</div></div><div class="c c2"><div class="v">'+dupCount+'</div><div class="l">похожих на дубли</div></div></div>'+
      '<div class="mv-card"><div class="mv-tools"><input id="mvQ" placeholder="Поиск по названию или дозе…" value="'+esc(MV.q)+'"><select id="mvSort"><option value="count"'+(MV.sort==='count'?' selected':'')+'>Больше записей</option><option value="name"'+(MV.sort==='name'?' selected':'')+'>По алфавиту</option><option value="last"'+(MV.sort==='last'?' selected':'')+'>Свежие</option></select></div>'+
      '<div class="mv-tools" style="margin-top:9px"><button class="mv-chip'+(MV.filter==='all'?' on':'')+'" data-mv="filter" data-f="all">Все</button><button class="mv-chip'+(MV.filter==='dup'?' on':'')+'" data-mv="filter" data-f="dup">Похожие</button><button class="mv-chip'+(MV.filter==='multi'?' on':'')+'" data-mv="filter" data-f="multi">Повторяются</button><button class="mv-chip'+(MV.filter==='course'?' on':'')+'" data-mv="filter" data-f="course">Из курсов</button></div></div>'+
      '<div class="mv-merge'+(selNames.length>=1?' show':'')+'" id="mvMerge"><div class="t">'+(selNames.length>=2?('Объединить '+selNames.length+' '+plural(selNames.length,'название','названия','названий')+' в одно'):'Переименовать название')+'</div><div class="r"><input id="mvNewName" placeholder="Итоговое название, например Нурофен" value="'+esc(selNames.length===1?selNames[0]:'')+'"><button class="mv-btn violet" data-mv="merge">'+(selNames.length>=2?'Объединить':'Переименовать')+'</button><button class="mv-btn out" data-mv="unsel">Сбросить</button></div>'+
      '<div class="mv-note" style="margin-top:10px"><b>Как это работает.</b> Все записи выбранных названий получат одно имя. Если итоговое название есть в справочнике лекарств — вернётся его интервал дозы. Отмена доступна сразу после действия.</div></div>'+
      '<div id="mvList"></div>'+
      '<div class="mv-card"><div class="mv-tools"><button class="mv-btn lime" data-mv="adddict">＋ Название в базу</button><button class="mv-btn out" data-mv="csv">⬇ CSV базы</button><button class="mv-btn out" data-mv="copy">Скопировать список</button></div>'+
      '<div class="mv-note" style="margin-top:10px"><b>База копится сама.</b> Каждое название из назначений, курсов и выделений в осмотре попадает сюда. Словарь хранится отдельно от данных дня, поэтому объединение не ломает бэкапы.</div></div>';
    var list=$('#mvList');
    if(!vis.length){ list.innerHTML='<div class="mv-card"><div class="mv-empty"><div class="em">💊</div><div>Ничего не найдено. Измени поиск или фильтр.</div></div></div>'; }
    else{
      list.innerHTML=vis.map(function(g){
        var isOpen=!!MV.open[g.norm], isSel=!!MV.sel[g.norm];
        var badges='';
        if(g.dup)badges+='<span class="mg-b dup">похоже на дубль</span>';
        if(g.course)badges+='<span class="mg-b course">из курса</span>';
        if(g.known)badges+='<span class="mg-b dict">в справочнике</span>';
        var rows=isOpen?g.entries.slice(0,80).map(function(e){
          return '<div class="mg-e"><span class="d">'+fmtShort(e.key)+'</span><span class="i"><b>'+esc(e.time||'—')+'</b>'+(e.dose?' · '+esc(e.dose):'')+(e.note?' · '+esc(e.note):'')+(e.name!==g.name?' · <i>'+esc(e.name)+'</i>':'')+'</span><button class="x" data-mv="delentry" data-k="'+esc(e.key)+'" data-id="'+esc(e.id)+'" aria-label="Удалить запись">×</button></div>';
        }).join(''):'';
        return '<div class="mg'+(isSel?' sel':'')+(isOpen?' open':'')+'" data-norm="'+esc(g.norm)+'">'+
          '<div class="mg-h"><button class="mg-cb" data-mv="sel" data-n="'+esc(g.norm)+'" aria-label="Выбрать">✓</button>'+
          '<button class="mg-n" data-mv="toggle" data-n="'+esc(g.norm)+'"><span class="nm">'+esc(g.name)+'</span><div class="mt">'+g.dayCount+' '+plural(g.dayCount,'день','дня','дней')+(g.doseList.length?' · дозы: '+esc(g.doseList.join(', ')):'')+(g.last?' · до '+fmtShort(g.last):'')+'</div>'+(badges?'<div class="mg-badges">'+badges+'</div>':'')+'</button>'+
          '<span class="mg-cnt">'+g.count+'</span><button class="mg-chev" data-mv="toggle" data-n="'+esc(g.norm)+'" aria-label="Раскрыть"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button></div>'+
          '<div class="mg-body"><div class="mg-acts"><button class="mv-btn out sm" data-mv="rename" data-n="'+esc(g.norm)+'">✎ Переименовать</button><button class="mv-btn out sm" data-mv="delgroup" data-n="'+esc(g.norm)+'">Удалить все записи</button></div>'+
          (rows||'<div class="mv-empty" style="padding:12px">Записей нет</div>')+
          (g.entries.length>80?'<div class="mv-empty" style="padding:10px">Показаны первые 80 из '+g.entries.length+'</div>':'')+
          '</div></div>';
      }).join('');
    }
    var q=$('#mvQ');
    if(q){ q.addEventListener('input',function(){ MV.q=q.value; var pos=q.selectionStart; renderView(); var nq=$('#mvQ'); if(nq){nq.focus();try{nq.setSelectionRange(pos,pos);}catch(e){}} }); }
    var so=$('#mvSort'); if(so)so.addEventListener('change',function(){MV.sort=so.value;renderView();});
  }
  function applyName(targetName, norms){
    var c=child(); if(!c)return;
    var snap=snapshot();
    var known=medList().find(function(m){return m.id&&norm(m.label)===norm(targetName);});
    var changed=0, ds=days();
    Object.keys(ds).forEach(function(k){
      var r=ds[k]; if(!r||!Array.isArray(r.meds))return;
      r.meds.forEach(function(m){
        if(norms.indexOf(norm(medName(m)))<0)return;
        if(known){ m.med=known.id; delete m.customName; }
        else { m.med='other'; m.customName=targetName; }
        changed++;
      });
    });
    dictAdd(targetName);
    persist(); MV.sel={}; renderView();
    toast(changed+' '+plural(changed,'запись','записи','записей')+' → «'+targetName+'»','ok',function(){ restore(snap); renderView(); toast('Объединение отменено'); });
  }
  function onViewClick(e){
    var b=e.target.closest('[data-mv]'); if(!b)return;
    var a=b.dataset.mv, n=b.dataset.n;
    if(a==='close')return closeView();
    if(a==='filter'){ MV.filter=b.dataset.f; renderView(); sfx('tap'); return; }
    if(a==='sel'){ MV.sel[n]=!MV.sel[n]; renderView(); sfx('pop'); hap(6); return; }
    if(a==='toggle'){ MV.open[n]=!MV.open[n]; renderView(); sfx('tap'); return; }
    if(a==='unsel'){ MV.sel={}; renderView(); return; }
    if(a==='rename'){ MV.sel={}; MV.sel[n]=true; renderView(); var i=$('#mvNewName'); if(i){i.focus();i.select();} return; }
    if(a==='merge'){
      var names=Object.keys(MV.sel).filter(function(k){return MV.sel[k];});
      if(!names.length){toast('Выбери хотя бы одно название','err');return;}
      var target=($('#mvNewName').value||'').trim();
      if(!target){toast('Впиши итоговое название','err');return;}
      if(names.length>1&&!confirm('Объединить '+names.length+' названий в «'+target+'»?\n\nВсе их записи получат это имя. Действие можно отменить.'))return;
      applyName(target,names); return;
    }
    if(a==='delgroup'){
      var g=groups().find(function(x){return x.norm===n;}); if(!g)return;
      if(!confirm('Удалить все '+g.count+' записей «'+g.name+'»?\n\nКурсы и приёмы тоже будут удалены. Действие можно отменить.'))return;
      var snap=snapshot(), ds=days(), removed=0;
      Object.keys(ds).forEach(function(k){ var r=ds[k]; if(!r||!Array.isArray(r.meds))return; var before=r.meds.length; r.meds=r.meds.filter(function(m){return norm(medName(m))!==n;}); removed+=before-r.meds.length; });
      persist(); renderView();
      toast(removed+' '+plural(removed,'запись','записи','записей')+' удалено','info',function(){restore(snap);renderView();toast('Записи возвращены ✓');});
      return;
    }
    if(a==='delentry'){
      var k=b.dataset.k, id=b.dataset.id, r=getDay(k); if(!r)return;
      var idx=(r.meds||[]).findIndex(function(m){return m.id===id;}); if(idx<0)return;
      var snapE=r.meds[idx];
      r.meds.splice(idx,1); persist(); renderView();
      toast('Запись удалена','info',function(){ var rr=getDay(k,true); rr.meds=rr.meds||[]; rr.meds.splice(Math.min(idx,rr.meds.length),0,snapE); persist(); renderView(); toast('Запись возвращена ✓'); });
      return;
    }
    if(a==='adddict'){ openDictSheet(); return; }
    if(a==='csv'){ exportCSV(); return; }
    if(a==='copy'){ copyList(); return; }
  }
  function exportCSV(){
    var gs=groups(); if(!gs.length)return toast('База пуста','err');
    var rows=[['Название','Записей','Дней','Дозы','Первая','Последняя','Из курса','В справочнике'].join(';')];
    gs.forEach(function(g){ rows.push([g.name,g.count,g.dayCount,g.doseList.join(' / '),g.first||'',g.last||'',g.course?'да':'нет',g.known?'да':'нет'].join(';')); });
    dl('baza-preparatov-'+keyOf(new Date())+'.csv','\uFEFF'+rows.join('\r\n'),'text/csv');
    toast('CSV базы скачан ✓');
  }
  function copyList(){
    var gs=groups();
    var txt=gs.map(function(g){return g.name+' — '+g.count+' '+plural(g.count,'запись','записи','записей')+(g.doseList.length?' ('+g.doseList.join(', ')+')':'');}).join('\n');
    copy(txt,'Список скопирован ✓');
  }
  function dl(name,text,mime){ try{ var b=new Blob([text],{type:(mime||'text/plain')+';charset=utf-8'}); var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u;a.download=name;a.rel='noopener'; document.body.appendChild(a);a.click();a.remove(); setTimeout(function(){URL.revokeObjectURL(u);},4000); return true; }catch(e){ return false; } }
  function fbCopy(t){ try{ var ta=document.createElement('textarea'); ta.value=t; ta.style.cssText='position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,t.length); var ok=document.execCommand('copy'); ta.remove(); return ok; }catch(e){ return false; } }
  function copy(t,msg){ var d=function(){toast(msg||'Скопировано ✓');},f=function(){toast('Не вышло скопировать','err');}; if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(d).catch(function(){fbCopy(t)?d():f();});}else{fbCopy(t)?d():f();} }

  /* ===== шторки ===== */
  function openDictSheet(){
    build();
    $('#msBody').innerHTML='<h3>Название в базу</h3><div class="sub">Добавится в словарь — будет подсказкой при вводе</div><div class="ms-err" id="msErr"></div><div class="ms-f"><label>Название препарата</label><input id="msName" placeholder="например Мирамистин" autocomplete="off"></div><div class="ms-foot"><button class="mv-btn out" data-ms="cancel">Отмена</button><button class="mv-btn lime" data-ms="savedict">Добавить</button></div>';
    sheet.classList.add('open'); sfx('open'); hap(8);
    setTimeout(function(){var i=$('#msName');if(i)i.focus();},240);
  }
  function openTempSheet(){
    build();
    var k=selKey();
    var opts=medList().map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.label)+'</option>';}).join('');
    var extra=knownNames().filter(function(n){return !medList().some(function(m){return norm(m.label)===norm(n);});}).map(function(n){return '<option value="other::'+esc(n)+'">'+esc(n)+'</option>';}).join('');
    var hopts=helpList().map(function(h){return '<option value="'+esc(h.id)+'">'+esc(h.label)+'</option>';}).join('');
    $('#msBody').innerHTML='<h3>Замер температуры</h3><div class="sub">'+esc((child()||{}).name||'Ребёнок')+' · '+fmtDate(k)+'</div><div class="ms-err" id="msErr"></div>'+
      '<div class="ms-two"><div class="ms-f"><label>Время</label><input type="time" id="msTime" value="'+nowTime()+'"></div><div class="ms-f"><label>Температура</label><input type="text" inputmode="decimal" id="msVal" placeholder="38,5" autocomplete="off"></div></div>'+
      '<div class="ms-f"><label>Препарат</label><select id="msMed">'+opts+extra+'</select></div>'+
      '<div class="ms-f"><label>Помогло?</label><select id="msHelp">'+hopts+'</select></div>'+
      '<div class="ms-foot"><button class="mv-btn out" data-ms="cancel">Отмена</button><button class="mv-btn lime" data-ms="savetemp">Сохранить замер</button></div>';
    sheet.classList.add('open'); sfx('open'); hap(8);
    setTimeout(function(){var i=$('#msVal');if(i)i.focus();},240);
  }
  function closeSheet(){ if(sheet)sheet.classList.remove('open'); }
  function msErr(m){ var e=$('#msErr'); if(e){e.textContent=m;e.classList.add('show');} sfx('del'); hap([25,40,25]); }
  function onSheetClick(e){
    if(e.target===sheet)return closeSheet();
    var b=e.target.closest('[data-ms]'); if(!b)return;
    var a=b.dataset.ms;
    if(a==='cancel')return closeSheet();
    if(a==='savedict'){
      var n=($('#msName').value||'').trim();
      if(n.length<2)return msErr('Впиши название (минимум 2 символа)');
      dictAdd(n); closeSheet(); if(view.classList.contains('open'))renderView();
      toast('«'+n+'» в базе ✓'); return;
    }
    if(a==='savetemp'){
      var k=selKey(), t=($('#msTime').value||nowTime()), v=num($('#msVal').value);
      if(!isFinite(v)||v<30||v>43)return msErr('Температура — число от 30 до 43, например 38,5');
      var rec=getDay(k,true); if(!rec)return msErr('День не найден');
      rec.temps=rec.temps||[];
      var mv=$('#msMed').value, medId=mv, custom='';
      if(mv.indexOf('other::')===0){ medId='other'; custom=mv.slice(7); }
      var entry={id:uid(),time:t,value:Math.round(v*10)/10,med:medId,helped:$('#msHelp').value||''};
      if(custom)entry.customName=custom;
      rec.temps.push(entry);
      rec.temps.sort(function(x,y){return String(x.time).localeCompare(String(y.time));});
      if(v>=37.5){ if(!rec.status)rec.status='sick'; rec.symptoms=rec.symptoms||[]; if(rec.symptoms.indexOf('fever')<0)rec.symptoms.push('fever'); }
      if(custom)dictAdd(custom);
      persist(); closeSheet();
      toast(fmtT(entry.value)+'° в '+t+' ✓','ok',function(){
        var r=getDay(k); if(!r)return; r.temps=(r.temps||[]).filter(function(x){return x.id!==entry.id;}); persist(); toast('Замер убран');
      });
      return;
    }
  }
  function onSheetInput(e){ if(e.target.id==='msVal'){ var el=$('#msErr'); if(el)el.classList.remove('show'); } }

  /* ===== 3. КУРСЫ: ОТМЕТИТЬ ВСЕ ===== */
  function hookCourses(){
    var det=document.querySelector('#panel details[data-section="courses"]');
    if(!det)return;
    var body=det.querySelector('.section-body')||det;
    var boxes=$$('input[data-act="course-check"]',body);
    var bar=body.querySelector('.m-course-bar');
    if(!boxes.length){ if(bar)bar.remove(); return; }
    if(!bar){
      bar=document.createElement('div'); bar.className='m-course-bar';
      bar.innerHTML='<span class="cb-count"></span><span class="cb-btns"><button class="m-cb" data-mc="all">✓ Отметить все</button><button class="m-cb ghost" data-mc="none">Снять все</button></span>';
      body.insertBefore(bar,body.firstChild);
      bar.addEventListener('click',onCourseBar);
    }
    var checked=boxes.filter(function(b){return b.checked;}).length;
    bar.querySelector('.cb-count').innerHTML='Отмечено <b>'+checked+'</b> из <b>'+boxes.length+'</b>';
    bar.querySelector('[data-mc="all"]').disabled=checked===boxes.length;
    bar.querySelector('[data-mc="none"]').disabled=checked===0;
  }
  function onCourseBar(e){
    var b=e.target.closest('[data-mc]'); if(!b||b.disabled)return;
    var mark=b.dataset.mc==='all';
    var k=selKey(), rec=getDay(k,true), c=child();
    if(!rec||!c)return;
    var courses=[];
    try{ if(typeof getCoursesForDay==='function')courses=getCoursesForDay(k)||[]; }catch(err){}
    if(!courses.length)courses=(c.courses||[]).filter(function(x){return x.startKey<=k&&k<=x.endKey&&!x.archived;});
    if(!courses.length)return toast('На этот день курсов нет','err');
    var snap=snapshot();
    rec.meds=rec.meds||[];
    if(mark){
      var added=0;
      courses.forEach(function(co){
        (co.times||[]).forEach(function(t){
          if(rec.meds.some(function(m){return m.courseId===co.id&&m.time===t;}))return;
          rec.meds.push({id:uid(),time:t,med:'other',dose:co.dose||'',note:co.note||'',courseId:co.id,customName:co.name});
          dictAdd(co.name); added++;
        });
      });
      if(!added)return toast('Всё уже отмечено','info');
      rec.meds.sort(function(a,b2){return String(a.time).localeCompare(String(b2.time));});
      if(!rec.status)rec.status='sick';
      persist();
      toast('Отмечено '+added+' '+plural(added,'приём','приёма','приёмов')+' ✓','ok',function(){restore(snap);toast('Отметки сняты');});
    }else{
      var before=rec.meds.length;
      rec.meds=rec.meds.filter(function(m){return !m.courseId;});
      var removed=before-rec.meds.length;
      if(!removed)return toast('Отмеченных приёмов нет','info');
      if(removed>3&&!confirm('Снять все отметки курсов за этот день ('+removed+')?'))return;
      persist();
      toast('Снято '+removed+' '+plural(removed,'отметка','отметки','отметок'),'info',function(){restore(snap);toast('Отметки возвращены ✓');});
    }
  }

  /* ===== 4. «+» НА ПУСТОМ ГРАФИКЕ ===== */
  function hookChart(){
    var box=document.getElementById('tempChart'); if(!box)return;
    var empty=box.querySelector('.temp-empty'); if(!empty)return;
    if(empty.querySelector('.m-add-temp'))return;
    var b=document.createElement('button');
    b.type='button'; b.className='m-add-temp'; b.innerHTML='＋ Добавить замер';
    b.addEventListener('click',function(ev){ ev.stopPropagation(); openTempSheet(); });
    empty.appendChild(b);
  }

  /* ===== плитка «препаратов» ===== */
  function hookStats(){
    var box=document.getElementById('stats'); if(!box)return;
    var leaves=$$('*',box).filter(function(e){return !e.children.length&&/препарат/i.test(e.textContent||'');});
    leaves.forEach(function(leaf){
      var tile=leaf.parentElement;
      while(tile&&tile!==box&&!/\d/.test(tile.textContent||''))tile=tile.parentElement;
      if(!tile||tile===box)return;
      if(tile.dataset.eogMedsHooked)return;
      tile.dataset.eogMedsHooked='1';
      tile.classList.add('m-stat-open');
      tile.setAttribute('role','button'); tile.setAttribute('tabindex','0');
      tile.title='Открыть базу препаратов';
      tile.addEventListener('click',function(){ openView(); });
      tile.addEventListener('keydown',function(ev){ if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openView();} });
    });
  }

  /* ===== наблюдатель ===== */
  var hookQueued=false;
  function scheduleHooks(){ if(hookQueued)return; hookQueued=true; requestAnimationFrame(function(){ hookQueued=false; try{hookStats();hookCourses();hookChart();}catch(e){} }); }
  function watch(){
    if(!('MutationObserver' in window))return;
    var mo=new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var t=muts[i].target;
        if(t&&t.closest&&t.closest('#eogMedsView, #eogMedsSheet, #eogMedsToasts, #eogSelBar'))continue;
        scheduleHooks(); return;
      }
    });
    ['#stats','#panel','#tempChart'].forEach(function(sel){
      var el=document.querySelector(sel);
      if(el)mo.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    });
    mo.observe(document.body,{childList:true});
  }

  function init(){ build(); scheduleHooks(); watch(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();

  window.EOGMeds={
    version:'1.0',
    open:openView, close:closeView,
    addTemp:openTempSheet,
    refresh:function(){ scheduleHooks(); if(view&&view.classList.contains('open'))renderView(); },
    groups:groups, names:knownNames,
    markAll:function(){ var b=document.querySelector('.m-course-bar [data-mc="all"]'); if(b&&!b.disabled)b.click(); }
  };
})();
