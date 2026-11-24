/* ============================================================
   meds.js · v1.1 · ЗАМЕНИТЬ ЦЕЛИКОМ
   Волна 18:
   1) Замер температуры: только жаропонижающие, по умолчанию
      «Без препарата», подсказка интервала, свой вариант.
   2) Рост / вес / ИМТ — три отдельных графика со своими шкалами.
   3) Диагноз на период болезни: эпизод, вперёд, свой диапазон,
      предпросмотр конфликтов, отмена.
   4) Назначение: разово или сразу курсом с расписанием.
   Плюс v1.0: база препаратов с объединением, «отметить все»,
   «+» на пустом графике. Схема state не меняется.
   Подключать ПОСЛЕ app.js и growth.js.
   ============================================================ */
(function(){
'use strict';
if(window.EOGMeds&&window.EOGMeds.version==='1.1')return;
try{delete window.EOGMeds;}catch(e){window.EOGMeds=null;}
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches,DK='eog-meds-dict',GK='eog-meds-gm';
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function p2(n){return String(n).padStart(2,'0');}
function uid(){try{if(typeof window.uid==='function')return window.uid();}catch(e){}return 'm'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function kOf(d){try{if(typeof window.keyOf==='function')return window.keyOf(d);}catch(e){}return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}
function pK(k){try{if(typeof window.parseK==='function')return window.parseK(k);}catch(e){}var p=String(k||'').split('-');return new Date(+p[0],(+p[1]||1)-1,+p[2]||1);}
function nowT(){var d=new Date();return p2(d.getHours())+':'+p2(d.getMinutes());}
function nm(s){return String(s||'').trim().toLowerCase().replace(/ё/g,'е').replace(/[^\wа-я0-9 ]/gi,'').replace(/\s+/g,' ').trim();}
function pl(n,a,b,c){n=Math.abs(n)%100;var x=n%10;if(n>10&&n<20)return c;if(x>1&&x<5)return b;if(x===1)return a;return c;}
var MO=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
function fD(k){var d=pK(k);return d.getDate()+' '+MO[d.getMonth()]+' '+d.getFullYear();}
function fS(k){var d=pK(k);return p2(d.getDate())+'.'+p2(d.getMonth()+1)+'.'+String(d.getFullYear()).slice(2);}
function durT(ms){try{if(typeof window.dur==='function')return window.dur(ms);}catch(e){}var m=Math.round(ms/60000),h=Math.floor(m/60);return h?h+' ч '+(m%60)+' мин':m+' мин';}
function hap(p){try{if(window.EOGMotion&&EOGMotion.haptic)EOGMotion.haptic(p);else if(navigator.vibrate)navigator.vibrate(p||8);}catch(e){}}
function sfx(n){try{if(window.EOGMotion&&EOGMotion.sfx)EOGMotion.sfx(n);}catch(e){}}
function Q(s,r){return (r||document).querySelector(s);}
function QA(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function nv(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:NaN;}
function f1(v){return (Math.round(v*10)/10).toFixed(1).replace('.',',');}
function kid(){try{if(typeof getActiveChild==='function')return getActiveChild();}catch(e){}try{if(window.state&&window.state.children)return window.state.children.find(function(c){return c.id===window.state.activeChildId;})||window.state.children[0];}catch(e){}return null;}
function dys(){var c=kid();return c&&c.days?c.days:{};}
function selK(){return window.selected||kOf(new Date());}
function gD(k,cr){try{if(typeof window.getDay==='function')return window.getDay(k,cr);}catch(e){}var d=dys();if(!d[k]&&cr)d[k]={status:null,symptoms:[],temps:[],meds:[],note:'',diagnosis:'',garden:false,home:false};return d[k];}
function go(){try{if(typeof save==='function')save();}catch(e){}try{if(typeof render==='function')render();}catch(e){}queue();}
function mName(m){if(!m)return '';if(m.customName)return m.customName;try{if(typeof medLabel==='function')return medLabel(m.med)||m.med||'';}catch(e){}return m.med||'';}
function mL(){try{if(Array.isArray(window.MEDS))return window.MEDS;}catch(e){}return [];}
function hL(){try{if(Array.isArray(window.HELP))return window.HELP;}catch(e){}return [{id:'',label:'Помогло?'},{id:'yes',label:'Да'},{id:'no',label:'Нет'}];}
function cL(){try{if(Array.isArray(window.COURSE_CATS))return window.COURSE_CATS;}catch(e){}return [];}
function ivl(i){try{if(typeof medInterval==='function')return Number(medInterval(i))||0;}catch(e){}var m=mL().find(function(x){return x.id===i;});return m?Number(m.interval)||0:0;}
function snap(){var c=kid();return c?{d:JSON.parse(JSON.stringify(c.days||{})),c:JSON.parse(JSON.stringify(c.courses||[]))}:null;}
function undoS(s){var c=kid();if(c&&s){c.days=s.d;c.courses=s.c;go();}}
var FRE=/нурофен|парацетамол|ибупрофен|цефекон|панадол|калпол|эффералган/i;
function anti(){return mL().filter(function(m){return m.id&&m.id!=='other'&&(Number(m.interval)>0||FRE.test(String(m.label||'')));});}
function hint(id,k){
if(!id)return null;var v=ivl(id);if(!v)return null;
var r=gD(k),l=((r&&r.temps)||[]).filter(function(t){return t.med===id;}).slice().sort(function(a,b){return String(a.time).localeCompare(String(b.time));});
if(!l.length)return {c:'ok',t:'Интервал '+v+' ч · в этот день ещё не давали'};
var L=l[l.length-1],d=pK(k),p=String(L.time||'00:00').split(':');
var at=new Date(d.getFullYear(),d.getMonth(),d.getDate(),+p[0]||0,+p[1]||0),nx=new Date(at.getTime()+v*3600000),df=nx-Date.now();
return df>0?{c:'wa',t:'Не раньше '+p2(nx.getHours())+':'+p2(nx.getMinutes())+' · через '+durT(df)}:{c:'ok',t:'Интервал выдержан · последняя доза в '+L.time};}
function dAll(){try{return JSON.parse(localStorage.getItem(DK)||'{}')||{};}catch(e){return {};}}
function dFor(){var c=kid(),i=c?c.id:'def',a=dAll();return Array.isArray(a[i])?a[i]:[];}
function dAdd(n){n=String(n||'').trim();if(!n)return;var c=kid(),i=c?c.id:'def',a=dAll(),r=Array.isArray(a[i])?a[i]:[];if(!r.some(function(x){return nm(x)===nm(n);})){r.push(n);a[i]=r;try{localStorage.setItem(DK,JSON.stringify(a));}catch(e){}}}
function names(){var s={},o=[];mL().forEach(function(m){if(m.id&&m.label&&!s[nm(m.label)]){s[nm(m.label)]=1;o.push(m.label);}});dFor().forEach(function(n){if(n&&!s[nm(n)]){s[nm(n)]=1;o.push(n);}});coll().forEach(function(e){if(e.name&&!s[nm(e.name)]){s[nm(e.name)]=1;o.push(e.name);}});return o.sort(function(a,b){return a.localeCompare(b,'ru');});}
function coll(){var d=dys(),o=[];Object.keys(d).forEach(function(k){var r=d[k];if(!r||!Array.isArray(r.meds))return;r.meds.forEach(function(m){o.push({key:k,id:m.id,time:m.time||'',name:mName(m),dose:m.dose||'',note:m.note||'',co:m.courseId||''});});});o.sort(function(a,b){return a.key<b.key?1:a.key>b.key?-1:(a.time<b.time?1:-1);});return o;}
function groups(){
var mp={};coll().forEach(function(e){var n=nm(e.name)||'без названия';if(!mp[n])mp[n]={norm:n,name:e.name,ent:[],ds:{},dy:{},co:false,kn:false};var g=mp[n];g.ent.push(e);if(e.dose)g.ds[e.dose]=1;g.dy[e.key]=1;if(e.co)g.co=true;if(mL().some(function(m){return m.id&&nm(m.label)===n;}))g.kn=true;});
var a=Object.keys(mp).map(function(k){var g=mp[k];g.count=g.ent.length;g.dc=Object.keys(g.dy).length;g.dl=Object.keys(g.ds);var ks=Object.keys(g.dy).sort();g.last=ks[ks.length-1];var c={};g.ent.forEach(function(e){c[e.name]=(c[e.name]||0)+1;});g.name=Object.keys(c).sort(function(x,y){return c[y]-c[x];})[0]||g.name;return g;});
a.forEach(function(x){x.dup=a.some(function(y){return y!==x&&x.norm.length>=4&&y.norm.length>=4&&(x.norm.indexOf(y.norm)>=0||y.norm.indexOf(x.norm)>=0);});});
return a;}
var tE;
function toast(msg,ty,un){
build();while(tE.children.length>=3)tE.firstChild.remove();
var t=document.createElement('div');t.className='tst '+(ty||'ok');
var d=document.createElement('span');d.className='d';var s=document.createElement('span');s.textContent=msg;
t.appendChild(d);t.appendChild(s);var kd=false;
function kill(){if(kd)return;kd=true;t.classList.remove('show');setTimeout(function(){t.remove();},340);}
if(un){var u=document.createElement('button');u.className='u';u.textContent='Отменить';u.onclick=function(){un();kill();};t.appendChild(u);}
tE.appendChild(t);requestAnimationFrame(function(){requestAnimationFrame(function(){t.classList.add('show');});});
setTimeout(kill,un?8000:3200);sfx(ty==='err'?'del':'ok');hap(ty==='err'?[25,40,25]:10);}
var V,S,B;
function build(){
if(V)return;
V=document.createElement('div');V.id='eogMedsView';V.setAttribute('role','dialog');V.setAttribute('aria-modal','true');
V.innerHTML='<div class="vh"><button class="vbk" data-v="close">‹ Назад</button><div class="vtt"><div class="t">База препаратов</div><div class="s" id="vSub">—</div></div></div><div class="vbd"><div class="vwr" id="vW"></div></div>';
document.body.appendChild(V);
S=document.createElement('div');S.id='eogMedsSheet';S.setAttribute('role','dialog');S.setAttribute('aria-modal','true');
S.innerHTML='<div class="sht"><div class="grp"></div><div class="sbd" id="sB"></div></div>';
document.body.appendChild(S);
tE=document.createElement('div');tE.id='eogMedsToasts';document.body.appendChild(tE);
B=document.createElement('div');B.id='eogSelBar';
B.innerHTML='<span class="n" id="sbN"></span><button class="a" id="sbA">＋ Назначение</button><button class="x" id="sbX" aria-label="Скрыть">×</button>';
document.body.appendChild(B);
V.addEventListener('click',vClick);S.addEventListener('click',sClick);S.addEventListener('input',sInp);S.addEventListener('change',sInp);
Q('#sbA').addEventListener('click',function(){var n=selT||Q('#sbN').textContent;hideB();try{window.getSelection().removeAllRanges();}catch(e){}openAssign(n);});
Q('#sbX').addEventListener('click',hideB);
document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;if(S.classList.contains('open')){closeS();return;}if(V.classList.contains('open')){closeV();return;}hideB();});
document.addEventListener('pointerdown',function(e){var b=e.target.closest('.mb,.vbk,.m-cb,.m-add-temp,#sbA,.m-exam-per');if(!b||RM||b.disabled)return;var r=document.createElement('span');r.className='m-rip';var rc=b.getBoundingClientRect(),sz=Math.max(rc.width,rc.height);r.style.cssText='width:'+sz+'px;height:'+sz+'px;left:'+(e.clientX-rc.left-sz/2)+'px;top:'+(e.clientY-rc.top-sz/2)+'px';b.appendChild(r);setTimeout(function(){r.remove();},600);},{passive:true});
window.addEventListener('scroll',hideB,{passive:true});
window.addEventListener('resize',function(){hideB();if(V&&V.classList.contains('open'))vRender();drawG(false);});}
var selT='',sTm=null;
function onSel(){clearTimeout(sTm);sTm=setTimeout(chk,140);}
function chk(){
var s=window.getSelection?window.getSelection():null;
if(!s||s.isCollapsed||!s.rangeCount){hideB();return;}
var t=String(s.toString()||'').replace(/\s+/g,' ').trim();
if(t.length<2||t.length>60||/\n/.test(t)){hideB();return;}
var nd=s.anchorNode,el=nd?(nd.nodeType===1?nd:nd.parentElement):null;
if(!el||!el.closest||!el.closest('#healthListModal,#healthCardView,#healthFormModal,.exam')){hideB();return;}
if(el.closest('#eogSelBar'))return;
var r;try{r=s.getRangeAt(0).getBoundingClientRect();}catch(e){hideB();return;}
if(!r||(!r.width&&!r.height)){hideB();return;}
selT=t;build();Q('#sbN').textContent=t;B.classList.add('show');
var w=B.offsetWidth,h=B.offsetHeight,l=Math.max(8,Math.min(r.left+r.width/2-w/2,window.innerWidth-w-8)),tp=r.top-h-10;
if(tp<8)tp=Math.min(r.bottom+10,window.innerHeight-h-8);
B.style.left=l+'px';B.style.top=Math.max(8,tp)+'px';}
function hideB(){if(B)B.classList.remove('show');selT='';}
document.addEventListener('selectionchange',onSel);
document.addEventListener('mouseup',onSel);
document.addEventListener('touchend',onSel,{passive:true});
function dT(n){return n===1?['09:00']:n===2?['09:00','21:00']:n===3?['07:00','13:00','20:00']:['07:00','12:00','17:00','22:00'];}
var A=null;
function openAssign(name){
build();var k=selK();
A={mode:'course',name:String(name||'').trim(),dose:'',cat:'',note:'',start:k,days:7,per:3,times:dT(3),oD:k,oT:nowT(),mark:true};
var kn=mL().find(function(m){return m.id&&nm(m.label)===nm(A.name);});
if(kn&&ivl(kn.id)>0)A.cat='fever';
aRender();S.classList.add('open');sfx('open');hap(8);}
function aRead(){
var x;
if((x=Q('#aN')))A.name=x.value.trim();
if((x=Q('#aD')))A.dose=x.value.trim();
if((x=Q('#aC')))A.cat=x.value;
if((x=Q('#aNt')))A.note=x.value.trim();
if((x=Q('#aS')))A.start=x.value||A.start;
if((x=Q('#aDy')))A.days=Math.max(1,Math.min(365,parseInt(x.value,10)||A.days));
if((x=Q('#aMk')))A.mark=x.checked;
if((x=Q('#aOD')))A.oD=x.value||A.oD;
if((x=Q('#aOT')))A.oT=x.value||A.oT;
var ts=QA('#sB [data-ti]');if(ts.length)A.times=ts.map(function(i){return i.value||'09:00';});}
function aRender(){
var cs=cL(),co=cs.length?cs.map(function(c){return '<option value="'+esc(c.id)+'"'+(A.cat===c.id?' selected':'')+'>'+esc(c.label)+'</option>';}).join(''):'<option value="">— категория</option>';
var dl=names().map(function(n){return '<option value="'+esc(n)+'">';}).join('');
var cb='<div class="f2"><div class="ff"><label>Начало</label><input type="date" id="aS" value="'+esc(A.start)+'"></div><div class="ff"><label>Дней</label><input type="number" id="aDy" min="1" max="365" value="'+A.days+'"></div></div>'+
'<div class="ff"><label>Раз в день</label><div class="mode" style="margin-bottom:9px">'+[1,2,3,4].map(function(n){return '<button data-a="per" data-n="'+n+'" class="'+(A.per===n?'on':'')+'">'+n+'</button>';}).join('')+'</div>'+
'<div class="tms">'+A.times.map(function(t,i){return '<span class="ti"><input type="time" data-ti="'+i+'" value="'+esc(t)+'">'+(A.times.length>1?'<button class="tx" data-a="delt" data-i="'+i+'">×</button>':'')+'</span>';}).join('')+'<button class="mb o s" data-a="addt">＋ время</button></div></div>'+
'<label class="ckk"><input type="checkbox" id="aMk"'+(A.mark?' checked':'')+'>Отметить приёмы за день начала</label>';
var ob='<div class="f2"><div class="ff"><label>Дата</label><input type="date" id="aOD" value="'+esc(A.oD)+'"></div><div class="ff"><label>Время</label><input type="time" id="aOT" value="'+esc(A.oT)+'"></div></div>';
Q('#sB').innerHTML='<h3>Назначение</h3><div class="su">'+esc((kid()||{}).name||'Ребёнок')+' · из осмотра или вручную</div><div class="err" id="sE"></div>'+
'<div class="ff"><label>Препарат</label><input id="aN" list="aNs" value="'+esc(A.name)+'" placeholder="например Изофра" autocomplete="off"><datalist id="aNs">'+dl+'</datalist></div>'+
'<div class="f2"><div class="ff"><label>Доза</label><input id="aD" value="'+esc(A.dose)+'" placeholder="1 впрыск / 5 мл"></div><div class="ff"><label>Категория</label><select id="aC">'+co+'</select></div></div>'+
'<div class="mode"><button data-a="mode" data-m="once" class="'+(A.mode==='once'?'on':'')+'">Разово</button><button data-a="mode" data-m="course" class="'+(A.mode==='course'?'on':'')+'">Курсом</button></div>'+
(A.mode==='course'?cb:ob)+
'<div class="ff"><label>Заметка</label><input id="aNt" value="'+esc(A.note)+'" placeholder="например после еды"></div>'+
'<div class="prev" id="aP"></div><div class="sft"><button class="mb o" data-a="cancel">Отмена</button><button class="mb l" data-a="save">'+(A.mode==='course'?'Создать курс':'Добавить приём')+'</button></div>';
aPrev();}
function aPrev(){
var p=Q('#aP');if(!p)return;
if(A.mode==='course'){
var st=pK(A.start),en=new Date(st);en.setDate(st.getDate()+A.days-1);
p.innerHTML='<b>Курс «'+esc(A.name||'…')+'»</b> · '+fS(A.start)+' → '+fS(kOf(en))+' · '+A.days+' '+pl(A.days,'день','дня','дней')+' · '+A.times.length+' '+pl(A.times.length,'раз','раза','раз')+' в день'+(A.dose?' · '+esc(A.dose):'')+'<div class="pl"><span class="pd hit">'+(A.days*A.times.length)+' приёмов всего</span>'+A.times.map(function(t){return '<span class="pd">'+esc(t)+'</span>';}).join('')+'</div>';
}else p.innerHTML='<b>Разовый приём</b> · '+esc(A.name||'…')+' · '+fS(A.oD)+' в '+esc(A.oT)+(A.dose?' · '+esc(A.dose):'');}
function aSave(){
aRead();var c=kid();if(!c)return sErr('Профиль ребёнка не найден');
if(!A.name||A.name.length<2)return sErr('Впиши название препарата');
var sn=snap(),kn=mL().find(function(m){return m.id&&nm(m.label)===nm(A.name);});
dAdd(A.name);
if(A.mode==='once'){
var r=gD(A.oD,true);if(!r)return sErr('День не найден');
r.meds=r.meds||[];var e={id:uid(),time:A.oT,med:kn?kn.id:'other',dose:A.dose,note:A.note||'из осмотра'};
if(!kn)e.customName=A.name;
r.meds.push(e);r.meds.sort(function(a,b){return String(a.time).localeCompare(String(b.time));});
if(!r.status)r.status='sick';
go();closeS();toast('«'+A.name+'» → '+fS(A.oD),'ok',function(){undoS(sn);toast('Приём убран');});
}else{
var st=pK(A.start),en=new Date(st);en.setDate(st.getDate()+A.days-1);
var ts=A.times.slice().filter(Boolean).sort();
if(!ts.length)return sErr('Добавь хотя бы одно время приёма');
var id='course_'+uid();c.courses=c.courses||[];
c.courses.push({id:id,name:A.name,category:A.cat||'',dose:A.dose,startKey:A.start,endKey:kOf(en),days:A.days,times:ts,note:A.note,archived:false,createdAt:new Date().toISOString()});
var mk=0;
if(A.mark){var r2=gD(A.start,true);if(r2){r2.meds=r2.meds||[];ts.forEach(function(t){if(r2.meds.some(function(m){return m.courseId===id&&m.time===t;}))return;r2.meds.push({id:uid(),time:t,med:'other',dose:A.dose,note:A.note,courseId:id,customName:A.name});mk++;});r2.meds.sort(function(a,b){return String(a.time).localeCompare(String(b.time));});if(!r2.status)r2.status='sick';}}
go();closeS();toast('Курс «'+A.name+'» создан'+(mk?' · '+mk+' отмечено':'')+' ✓','ok',function(){undoS(sn);toast('Курс удалён');});}}
var D=null;
function keys(a,b){var o=[],d=pK(a),e=pK(b),g=0;while(d<=e&&g<800){o.push(kOf(d));d.setDate(d.getDate()+1);g++;}return o;}
function episode(k){
var ds=dys(),s=k,e=k,d,g=0;
function ok(r){return r&&(r.status==='sick'||(r.diagnosis&&String(r.diagnosis).trim()));}
d=pK(k);while(g++<400){d.setDate(d.getDate()-1);var x=kOf(d);if(ok(ds[x]))s=x;else break;}
d=pK(k);g=0;while(g++<400){d.setDate(d.getDate()+1);var y=kOf(d);if(ok(ds[y]))e=y;else break;}
return {s:s,e:e};}
function openDiag(text,key){
build();var k=key||selK(),ep=episode(k);
D={key:k,text:String(text||((gD(k)||{}).diagnosis)||'').trim(),mode:'ep',from:ep.s,to:ep.e,create:false,ep:ep};
dRender();S.classList.add('open');sfx('open');hap(8);}
function dKeys(){
if(D.mode==='ep')return keys(D.ep.s,D.ep.e);
if(D.mode==='fwd')return keys(D.key,D.ep.e>=D.key?D.ep.e:D.key);
return keys(D.from,D.to);}
function dRender(){
var e=D.ep,ms=[['ep','Весь эпизод болезни',e.s===e.e?'Найден 1 день':fS(e.s)+' → '+fS(e.e)],['fwd','С этого дня до конца эпизода',fS(D.key)+' → '+fS(e.e>=D.key?e.e:D.key)],['own','Свой диапазон','выбери даты сама']];
Q('#sB').innerHTML='<h3>Диагноз на период</h3><div class="su">'+esc((kid()||{}).name||'Ребёнок')+' · один диагноз на весь больничный</div><div class="err" id="sE"></div>'+
'<div class="ff"><label>Текст диагноза</label><textarea id="dT" placeholder="[J06.9] ОРЗ…">'+esc(D.text)+'</textarea></div>'+
'<div class="rad">'+ms.map(function(m){return '<label class="'+(D.mode===m[0]?'on':'')+'"><input type="radio" name="dm" data-d="mode" data-m="'+m[0]+'"'+(D.mode===m[0]?' checked':'')+'><span><span class="rt">'+m[1]+'</span><span class="rr">'+m[2]+'</span></span></label>';}).join('')+'</div>'+
(D.mode==='own'?'<div class="f2"><div class="ff"><label>С</label><input type="date" id="dF" value="'+esc(D.from)+'"></div><div class="ff"><label>По</label><input type="date" id="dTo" value="'+esc(D.to)+'"></div></div>':'')+
'<label class="ckk"><input type="checkbox" id="dC"'+(D.create?' checked':'')+'>Создать недостающие дни как «болеет»</label>'+
'<div class="prev" id="dP"></div><div class="sft"><button class="mb o" data-d="cancel">Отмена</button><button class="mb v" data-d="apply">Применить</button></div>';
dPrev();}
function dRead(){var x;if((x=Q('#dT')))D.text=x.value.trim();if((x=Q('#dF')))D.from=x.value||D.from;if((x=Q('#dTo')))D.to=x.value||D.to;if((x=Q('#dC')))D.create=x.checked;}
function dPrev(){
var p=Q('#dP');if(!p)return;var ds=dys(),ks=dKeys(),hit=0,miss=0,cf=0;
ks.forEach(function(k){var r=ds[k];if(!r){miss++;return;}hit++;if(r.diagnosis&&r.diagnosis.trim()&&r.diagnosis.trim()!==D.text)cf++;});
p.innerHTML='<b>'+hit+'</b> '+pl(hit,'день','дня','дней')+' получат диагноз'+(miss?' · <b>'+miss+'</b> нет в календаре'+(D.create?' (создадим)':' (пропустим)'):'')+(cf?' · <b>'+cf+'</b> с другим диагнозом — перезапишем':'')+'<div class="pl">'+ks.slice(0,60).map(function(k){var r=ds[k],c=!r?'':(r.diagnosis&&r.diagnosis.trim()&&r.diagnosis.trim()!==D.text?'cf':'hit');return '<span class="pd '+c+'">'+fS(k)+'</span>';}).join('')+(ks.length>60?'<span class="pd">+'+(ks.length-60)+'</span>':'')+'</div>';}
function dApply(){
dRead();if(!D.text)return sErr('Впиши текст диагноза');
var ks=dKeys(),ds=dys(),sn=snap(),n=0,cr=0;
ks.forEach(function(k){var r=ds[k];if(!r){if(!D.create)return;r=gD(k,true);if(!r)return;r.status='sick';cr++;}r.diagnosis=D.text;n++;});
if(!n)return sErr('В диапазоне нет дней. Включи создание недостающих.');
go();closeS();toast('Диагноз на '+n+' '+pl(n,'день','дня','дней')+(cr?' · создано '+cr:'')+' ✓','ok',function(){undoS(sn);toast('Диагнозы возвращены как были');});}
var T=null;
function openTemp(k){
build();T=k||selK();
var o='<option value="">Без препарата</option>'+anti().map(function(m){var v=ivl(m.id);return '<option value="'+esc(m.id)+'">'+esc(m.label)+(v?' · '+v+' ч':'')+'</option>';}).join('')+'<option value="__c">Другое жаропонижающее…</option>';
Q('#sB').innerHTML='<h3>Замер температуры</h3><div class="su">'+esc((kid()||{}).name||'Ребёнок')+' · '+fD(T)+'</div><div class="err" id="sE"></div>'+
'<div class="f2"><div class="ff"><label>Время</label><input type="time" id="tT" value="'+nowT()+'"></div><div class="ff"><label>Температура</label><input type="text" inputmode="decimal" id="tV" placeholder="38,5" autocomplete="off"></div></div>'+
'<div class="ff"><label>Жаропонижающее</label><select id="tM">'+o+'</select></div>'+
'<div class="ff" id="tCW" style="display:none"><label>Название</label><input id="tC" placeholder="например Нурофен форте" list="tCs"><datalist id="tCs">'+names().map(function(n){return '<option value="'+esc(n)+'">';}).join('')+'</datalist></div>'+
'<div id="tH"></div><div class="ff"><label>Помогло?</label><select id="tHp">'+hL().map(function(h){return '<option value="'+esc(h.id)+'">'+esc(h.label)+'</option>';}).join('')+'</select></div>'+
'<div class="sft"><button class="mb o" data-t="cancel">Отмена</button><button class="mb l" data-t="save">Сохранить замер</button></div>';
S.classList.add('open');sfx('open');hap(8);tHint();
setTimeout(function(){var i=Q('#tV');if(i)i.focus();},240);}
function tHint(){
var w=Q('#tH'),s=Q('#tM');if(!w||!s)return;
if(!s.value){w.innerHTML='<div class="hint ok">Замер без препарата — просто фиксируем температуру</div>';return;}
if(s.value==='__c'){w.innerHTML='';return;}
var h=hint(s.value,T);w.innerHTML=h?'<div class="hint '+h.c+'">'+esc(h.t)+'</div>':'';}
function tSave(){
var t=(Q('#tT').value||nowT()),v=nv(Q('#tV').value),mv=Q('#tM').value,cn=(Q('#tC')||{}).value||'';
if(!isFinite(v)||v<30||v>43)return sErr('Температура — число от 30 до 43, например 38,5');
if(mv==='__c'&&cn.trim().length<2)return sErr('Впиши название жаропонижающего');
var r=gD(T,true);if(!r)return sErr('День не найден');
r.temps=r.temps||[];
var e={id:uid(),time:t,value:Math.round(v*10)/10,med:mv==='__c'?'other':mv,helped:Q('#tHp').value||''};
if(mv==='__c'){e.customName=cn.trim();dAdd(cn.trim());}
r.temps.push(e);r.temps.sort(function(a,b){return String(a.time).localeCompare(String(b.time));});
if(v>=37.5){if(!r.status)r.status='sick';r.symptoms=r.symptoms||[];if(r.symptoms.indexOf('fever')<0)r.symptoms.push('fever');}
go();closeS();
toast(f1(e.value)+'° в '+t+(e.med?' · '+(e.customName||mName({med:e.med})):' · без препарата')+' ✓','ok',function(){var rr=gD(T);if(!rr)return;rr.temps=(rr.temps||[]).filter(function(x){return x.id!==e.id;});go();toast('Замер убран');});}
function openDict(){
build();
Q('#sB').innerHTML='<h3>Название в базу</h3><div class="su">Станет подсказкой при вводе назначений</div><div class="err" id="sE"></div><div class="ff"><label>Название</label><input id="dcN" placeholder="например Мирамистин" autocomplete="off"></div><div class="sft"><button class="mb o" data-c="cancel">Отмена</button><button class="mb l" data-c="save">Добавить</button></div>';
S.classList.add('open');sfx('open');setTimeout(function(){var i=Q('#dcN');if(i)i.focus();},240);}
function sErr(m){var e=Q('#sE');if(e){e.textContent=m;e.classList.add('show');}sfx('del');hap([25,40,25]);}
function closeS(){if(S)S.classList.remove('open');A=null;D=null;T=null;}
function sClick(e){
if(e.target===S)return closeS();
var a=e.target.closest('[data-a]'),d=e.target.closest('[data-d]'),t=e.target.closest('[data-t]'),c=e.target.closest('[data-c]');
if(a){var k=a.dataset.a;
if(k==='cancel')return closeS();
if(k==='save')return aSave();
aRead();
if(k==='mode'){A.mode=a.dataset.m;aRender();sfx('tap');return;}
if(k==='per'){A.per=+a.dataset.n;A.times=dT(A.per);aRender();sfx('tap');return;}
if(k==='addt'){var L=A.times[A.times.length-1]||'09:00',p=L.split(':');A.times.push(p2((+p[0]+3)%24)+':'+p[1]);A.per=A.times.length;aRender();return;}
if(k==='delt'){A.times.splice(+a.dataset.i,1);A.per=A.times.length;aRender();return;}
return;}
if(d){var k2=d.dataset.d;
if(k2==='cancel')return closeS();
if(k2==='apply')return dApply();
if(k2==='mode'){dRead();D.mode=d.dataset.m;dRender();sfx('tap');return;}
return;}
if(t){if(t.dataset.t==='cancel')return closeS();return tSave();}
if(c){if(c.dataset.c==='cancel')return closeS();
var n2=(Q('#dcN').value||'').trim();if(n2.length<2)return sErr('Минимум 2 символа');
dAdd(n2);closeS();if(V.classList.contains('open'))vRender();toast('«'+n2+'» в базе ✓');}}
function sInp(e){
var i=e.target.id;
if(i==='tM'){var w=Q('#tCW');if(w)w.style.display=e.target.value==='__c'?'block':'none';tHint();return;}
if(i==='tV'){var er=Q('#sE');if(er)er.classList.remove('show');return;}
if(A&&(i==='aN'||i==='aD'||i==='aS'||i==='aDy'||i==='aOD'||i==='aOT'||i==='aNt'||i==='aMk'||e.target.hasAttribute('data-ti'))){aRead();aPrev();return;}
if(D&&(i==='dT'||i==='dF'||i==='dTo'||i==='dC')){dRead();dPrev();}}
var MV={q:'',sort:'count',f:'all',sel:{},op:{}};
function openV(){build();MV.sel={};V.classList.add('open');document.body.style.overflow='hidden';try{if(typeof syncBodyScroll==='function')syncBodyScroll();}catch(e){}vRender();var bd=Q('.vbd',V);if(bd)bd.scrollTop=0;sfx('open');hap(10);}
function closeV(){if(!V)return;V.classList.remove('open');closeS();document.body.style.overflow='';try{if(typeof syncBodyScroll==='function')syncBodyScroll();}catch(e){}sfx('tap');}
function vis(){
var a=groups(),q=nm(MV.q);
if(q)a=a.filter(function(g){return g.norm.indexOf(q)>=0||g.dl.join(' ').toLowerCase().indexOf(q)>=0;});
if(MV.f==='dup')a=a.filter(function(g){return g.dup;});
if(MV.f==='co')a=a.filter(function(g){return g.co;});
if(MV.f==='multi')a=a.filter(function(g){return g.count>1;});
if(MV.sort==='name')a.sort(function(x,y){return x.name.localeCompare(y.name,'ru');});
else if(MV.sort==='last')a.sort(function(x,y){return (y.last||'').localeCompare(x.last||'');});
else a.sort(function(x,y){return y.count-x.count||x.name.localeCompare(y.name,'ru');});
return a;}
function vRender(){
var all=groups(),ent=coll(),v=vis(),dc=all.filter(function(g){return g.dup;}).length;
var sub=Q('#vSub');if(sub)sub.textContent=all.length+' '+pl(all.length,'название','названия','названий')+' · '+ent.length+' '+pl(ent.length,'запись','записи','записей');
var sl=Object.keys(MV.sel).filter(function(k){return MV.sel[k];});
Q('#vW').innerHTML='<div class="sum"><div class="c a"><div class="v">'+all.length+'</div><div class="l">названий в базе</div></div><div class="c b"><div class="v">'+ent.length+'</div><div class="l">записей всего</div></div><div class="c c2"><div class="v">'+dc+'</div><div class="l">похожих на дубли</div></div></div>'+
'<div class="vcd"><div class="vrw"><input id="vQ" placeholder="Поиск по названию или дозе…" value="'+esc(MV.q)+'"><select id="vS"><option value="count"'+(MV.sort==='count'?' selected':'')+'>Больше записей</option><option value="name"'+(MV.sort==='name'?' selected':'')+'>По алфавиту</option><option value="last"'+(MV.sort==='last'?' selected':'')+'>Свежие</option></select></div>'+
'<div class="vrw" style="margin-top:8px">'+[['all','Все'],['dup','Похожие'],['multi','Повторяются'],['co','Из курсов']].map(function(x){return '<button class="chip'+(MV.f===x[0]?' on':'')+'" data-v="f" data-f="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div></div>'+
'<div class="mrg'+(sl.length?' show':'')+'"><div class="t">'+(sl.length>1?'Объединить '+sl.length+' '+pl(sl.length,'название','названия','названий'):'Переименовать название')+'</div><div class="r"><input id="vN" placeholder="Итоговое название" value="'+esc(sl.length===1?sl[0]:'')+'"><button class="mb v" data-v="merge">'+(sl.length>1?'Объединить':'Переименовать')+'</button><button class="mb o" data-v="unsel">Сбросить</button></div><div class="vn" style="margin-top:9px"><b>Интервал сохраняется,</b> если итоговое название есть в справочнике лекарств. Отмена доступна сразу после действия.</div></div>'+
'<div id="vL"></div>'+
'<div class="vcd"><div class="vrw"><button class="mb l" data-v="dict">＋ Название в базу</button><button class="mb o" data-v="csv">⬇ CSV базы</button><button class="mb o" data-v="copy">Скопировать список</button></div><div class="vn" style="margin-top:9px"><b>База копится сама</b> — из назначений, курсов и выделений в осмотре. Словарь лежит отдельно от данных дня.</div></div>';
var L=Q('#vL');
L.innerHTML=v.length?v.map(function(g){
var op=!!MV.op[g.norm],s=!!MV.sel[g.norm],bd='';
if(g.dup)bd+='<span class="dup">похоже на дубль</span>';
if(g.co)bd+='<span class="co">из курса</span>';
if(g.kn)bd+='<span class="kn">в справочнике</span>';
var rows=op?g.ent.slice(0,80).map(function(e){return '<div class="mge"><span class="d">'+fS(e.key)+'</span><span class="i"><b>'+esc(e.time||'—')+'</b>'+(e.dose?' · '+esc(e.dose):'')+(e.note?' · '+esc(e.note):'')+'</span><button class="x" data-v="dele" data-k="'+esc(e.key)+'" data-id="'+esc(e.id)+'">×</button></div>';}).join(''):'';
return '<div class="mg'+(s?' sel':'')+(op?' open':'')+'"><div class="mgh"><button class="mgc" data-v="sel" data-n="'+esc(g.norm)+'">✓</button><button class="mgn" data-v="tg" data-n="'+esc(g.norm)+'"><span class="nm">'+esc(g.name)+'</span><div class="mt2">'+g.dc+' '+pl(g.dc,'день','дня','дней')+(g.dl.length?' · '+esc(g.dl.join(', ')):'')+(g.last?' · до '+fS(g.last):'')+'</div>'+(bd?'<div class="mgb">'+bd+'</div>':'')+'</button><span class="mgn2">'+g.count+'</span><button class="mgv" data-v="tg" data-n="'+esc(g.norm)+'">▾</button></div><div class="mgbd"><div class="mga"><button class="mb o s" data-v="ren" data-n="'+esc(g.norm)+'">✎ Переименовать</button><button class="mb o s" data-v="delg" data-n="'+esc(g.norm)+'">Удалить все записи</button></div>'+(rows||'<div class="ve" style="padding:12px">Записей нет</div>')+(g.ent.length>80?'<div class="ve" style="padding:9px">Первые 80 из '+g.ent.length+'</div>':'')+'</div></div>';
}).join(''):'<div class="vcd"><div class="ve"><div class="em">💊</div>Ничего не найдено. Измени поиск или фильтр.</div></div>';
var q=Q('#vQ');if(q)q.addEventListener('input',function(){MV.q=q.value;var p=q.selectionStart;vRender();var n3=Q('#vQ');if(n3){n3.focus();try{n3.setSelectionRange(p,p);}catch(e){}}});
var s2=Q('#vS');if(s2)s2.addEventListener('change',function(){MV.sort=s2.value;vRender();});}
function applyName(t,ns){
var c=kid();if(!c)return;var sn=snap(),kn=mL().find(function(m){return m.id&&nm(m.label)===nm(t);}),n=0,ds=dys();
Object.keys(ds).forEach(function(k){var r=ds[k];if(!r||!Array.isArray(r.meds))return;r.meds.forEach(function(m){if(ns.indexOf(nm(mName(m)))<0)return;if(kn){m.med=kn.id;delete m.customName;}else{m.med='other';m.customName=t;}n++;});});
dAdd(t);go();MV.sel={};vRender();
toast(n+' '+pl(n,'запись','записи','записей')+' → «'+t+'»','ok',function(){undoS(sn);vRender();toast('Объединение отменено');});}
function vClick(e){
var b=e.target.closest('[data-v]');if(!b)return;var a=b.dataset.v,n=b.dataset.n;
if(a==='close')return closeV();
if(a==='f'){MV.f=b.dataset.f;vRender();sfx('tap');return;}
if(a==='sel'){MV.sel[n]=!MV.sel[n];vRender();sfx('tap');hap(6);return;}
if(a==='tg'){MV.op[n]=!MV.op[n];vRender();sfx('tap');return;}
if(a==='unsel'){MV.sel={};vRender();return;}
if(a==='ren'){MV.sel={};MV.sel[n]=true;vRender();var i=Q('#vN');if(i){i.focus();i.select();}return;}
if(a==='merge'){var ns=Object.keys(MV.sel).filter(function(k){return MV.sel[k];});if(!ns.length)return toast('Выбери название','err');
var t=(Q('#vN').value||'').trim();if(!t)return toast('Впиши итоговое название','err');
if(ns.length>1&&!confirm('Объединить '+ns.length+' названий в «'+t+'»?'))return;
applyName(t,ns);return;}
if(a==='delg'){var g=groups().find(function(x){return x.norm===n;});if(!g)return;
if(!confirm('Удалить все '+g.count+' записей «'+g.name+'»?'))return;
var sn=snap(),ds=dys(),rm=0;
Object.keys(ds).forEach(function(k){var r=ds[k];if(!r||!Array.isArray(r.meds))return;var bf=r.meds.length;r.meds=r.meds.filter(function(m){return nm(mName(m))!==n;});rm+=bf-r.meds.length;});
go();vRender();toast(rm+' '+pl(rm,'запись','записи','записей')+' удалено','info',function(){undoS(sn);vRender();toast('Записи возвращены ✓');});return;}
if(a==='dele'){var k=b.dataset.k,id=b.dataset.id,r=gD(k);if(!r)return;
var ix=(r.meds||[]).findIndex(function(m){return m.id===id;});if(ix<0)return;var sv=r.meds[ix];
r.meds.splice(ix,1);go();vRender();
toast('Запись удалена','info',function(){var rr=gD(k,true);rr.meds=rr.meds||[];rr.meds.splice(Math.min(ix,rr.meds.length),0,sv);go();vRender();toast('Запись возвращена ✓');});return;}
if(a==='dict')return openDict();
if(a==='csv'){var gs=groups();if(!gs.length)return toast('База пуста','err');
var rows=[['Название','Записей','Дней','Дозы','Последняя','Из курса'].join(';')];
gs.forEach(function(g){rows.push([g.name,g.count,g.dc,g.dl.join(' / '),g.last||'',g.co?'да':'нет'].join(';'));});
dlf('baza-preparatov-'+kOf(new Date())+'.csv','\uFEFF'+rows.join('\r\n'),'text/csv');toast('CSV базы скачан ✓');return;}
if(a==='copy')cpT(groups().map(function(g){return g.name+' — '+g.count+' '+pl(g.count,'запись','записи','записей')+(g.dl.length?' ('+g.dl.join(', ')+')':'');}).join('\n'),'Список скопирован ✓');}
function dlf(n,t,m){try{var b=new Blob([t],{type:(m||'text/plain')+';charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},4000);return true;}catch(e){return false;}}
function fbC(t){try{var a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(a);a.select();a.setSelectionRange(0,t.length);var o=document.execCommand('copy');a.remove();return o;}catch(e){return false;}}
function cpT(t,m){var d=function(){toast(m||'Скопировано ✓');},f=function(){toast('Не вышло скопировать','err');};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(d).catch(function(){fbC(t)?d():f();});else fbC(t)?d():f();}
var GM='height',gSig='';
try{GM=localStorage.getItem(GK)||'height';}catch(e){}
if(['height','weight','bmi'].indexOf(GM)<0)GM='height';
var GC={height:{l:'Рост',u:'см',c:'var(--mk,#2C74B3)'},weight:{l:'Вес',u:'кг',c:'var(--mo,#E05A78)'},bmi:{l:'ИМТ',u:'',c:'var(--mv,#6F4CB8)'}};
function gRows(){
var c=kid(),g=(c&&c.healthCard&&Array.isArray(c.healthCard.growth))?c.healthCard.growth.slice():[];
return g.filter(function(r){return r&&r.date;}).sort(function(a,b){return a.date<b.date?-1:1;}).map(function(r){var h=nv(r.height),w=nv(r.weight);return {date:r.date,h:h,w:w,b:(h>0&&w>0)?w/Math.pow(h/100,2):NaN};});}
function stp(r,n){var raw=r/Math.max(1,n),mg=Math.pow(10,Math.floor(Math.log10(raw||1))),x=raw/mg;return (x<=1?1:x<=2?2:x<=5?5:10)*mg;}
function drawG(force){
var w=document.getElementById('hcGrowthChartWrap');if(!w)return;
var rows=gRows(),cf=GC[GM],key=GM==='height'?'h':GM==='weight'?'w':'b';
var pts=rows.filter(function(r){return isFinite(r[key]);}).map(function(r){return {x:pK(r.date).getTime(),y:r[key],d:r.date};});
var sig=GM+'|'+pts.length+'|'+(pts.length?pts[pts.length-1].d+':'+pts[pts.length-1].y:'');
if(!force&&sig===gSig&&w.querySelector('.m-growth'))return;
gSig=sig;
var tabs='<div class="m-gtabs">'+['height','weight','bmi'].map(function(k){return '<button data-g="'+k+'" class="'+(GM===k?'on':'')+'">'+GC[k].l+'</button>';}).join('')+'</div>';
if(!pts.length){w.innerHTML='<div class="m-growth"><div class="gt">Динамика</div>'+tabs+'<div class="m-gempty">Нет замеров для этой метрики. Добавь их в разделе «Рост и вес».</div></div>';bindG(w);return;}
var L=pts[pts.length-1],P=pts.length>1?pts[pts.length-2]:null,dlt=P?L.y-P.y:null,dd=P?Math.round((L.x-P.x)/86400000):0;
var ys=pts.map(function(p){return p.y;}),mn=Math.min.apply(null,ys),mx=Math.max.apply(null,ys);
var py=(mx-mn)*.18||Math.max(.5,mx*.04),y0=mn-py,y1=mx+py;
var xs=pts.map(function(p){return p.x;}),x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs);
if(x1===x0){x0-=86400000*30;x1+=86400000*30;}
var W=640,H=230,PL=44,PR=18,PT=16,PB=28;
var X=function(v){return PL+(v-x0)/(x1-x0)*(W-PL-PR);},Y=function(v){return PT+(y1-v)/(y1-y0)*(H-PT-PB);};
var b='',st=stp(y1-y0,4),vv;
for(vv=Math.ceil(y0/st)*st;vv<=y1;vv+=st)b+='<line x1="'+PL+'" y1="'+Y(vv).toFixed(1)+'" x2="'+(W-PR)+'" y2="'+Y(vv).toFixed(1)+'" stroke="var(--ml,#DED3BE)" stroke-width="1" stroke-dasharray="2 5"/><text x="'+(PL-7)+'" y="'+(Y(vv)+4).toFixed(1)+'" text-anchor="end" font-size="10" font-weight="700" fill="var(--mm2,#9A917E)">'+f1(vv).replace(',0','')+'</text>';
var nT=Math.min(pts.length,5),i2;
for(i2=0;i2<nT;i2++){var ix=Math.round(i2*(pts.length-1)/Math.max(1,nT-1));b+='<text x="'+X(pts[ix].x).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--mm2,#9A917E)">'+fS(pts[ix].d)+'</text>';}
var d='M'+X(pts[0].x).toFixed(1)+','+Y(pts[0].y).toFixed(1),j;
for(j=0;j<pts.length-1;j++){var a0=pts[j-1]||pts[j],a1=pts[j],a2=pts[j+1],a3=pts[j+2]||a2;
d+=' C'+(X(a1.x)+(X(a2.x)-X(a0.x))/6).toFixed(1)+','+(Y(a1.y)+(Y(a2.y)-Y(a0.y))/6).toFixed(1)+' '+(X(a2.x)-(X(a3.x)-X(a1.x))/6).toFixed(1)+','+(Y(a2.y)-(Y(a3.y)-Y(a1.y))/6).toFixed(1)+' '+X(a2.x).toFixed(1)+','+Y(a2.y).toFixed(1);}
var gid='mg'+GM+Math.random().toString(36).slice(2,7);
b+='<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+cf.c+'" stop-opacity=".24"/><stop offset="1" stop-color="'+cf.c+'" stop-opacity="0"/></linearGradient></defs>';
if(pts.length>1)b+='<path d="'+d+' L'+X(L.x).toFixed(1)+','+(H-PB)+' L'+X(pts[0].x).toFixed(1)+','+(H-PB)+' Z" fill="url(#'+gid+')"/>';
b+='<path d="'+d+'" fill="none" stroke="'+cf.c+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
pts.forEach(function(p,i3){var cx=X(p.x).toFixed(1),cy=Y(p.y).toFixed(1),last=i3===pts.length-1;
b+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(last?9:6)+'" fill="'+cf.c+'" opacity="'+(last?.2:.14)+'"/><circle cx="'+cx+'" cy="'+cy+'" r="'+(last?4.6:3.2)+'" fill="'+cf.c+'"/>';});
b+='<text x="'+Math.min(X(L.x)+10,W-40).toFixed(1)+'" y="'+(Y(L.y)-9).toFixed(1)+'" font-size="12" font-weight="800" fill="'+cf.c+'">'+f1(L.y)+'</text>';
var dc=dlt===null?'<span class="d eq">первый замер</span>':'<span class="d '+(dlt>.049?'up':dlt<-.049?'dn':'eq')+'">'+(dlt>.049?'▲':dlt<-.049?'▼':'＝')+' '+(dlt>0?'+':'')+f1(dlt)+(cf.u?' '+cf.u:'')+'</span>';
w.innerHTML='<div class="m-growth"><div class="gt">Динамика · '+cf.l.toLowerCase()+'</div>'+tabs+
'<div class="m-now"><span class="v">'+f1(L.y)+(cf.u?'<small>'+cf.u+'</small>':'')+'</span>'+dc+'<span class="w">'+fD(L.d)+(dd?'<br>+'+dd+' '+pl(dd,'день','дня','дней'):'')+'</span></div>'+
'<div class="m-gchart"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+cf.l+'">'+b+'</svg></div>'+
'<div class="m-gfoot"><span>замеров: <b>'+pts.length+'</b></span><span>мин: <b>'+f1(mn)+'</b></span><span>макс: <b>'+f1(mx)+'</b></span><span>всего: <b>'+(mx-mn>0?'+':'')+f1(mx-mn)+(cf.u?' '+cf.u:'')+'</b></span></div></div>';
bindG(w);}
function bindG(w){QA('.m-gtabs button',w).forEach(function(b){b.addEventListener('click',function(){GM=b.dataset.g;try{localStorage.setItem(GK,GM);}catch(e){}drawG(true);sfx('tap');hap(6);});});}
function hookCourses(){
var det=document.querySelector('#panel details[data-section="courses"]');if(!det)return;
var body=det.querySelector('.section-body')||det,bs=QA('input[data-act="course-check"]',body),bar=body.querySelector('.m-bar[data-kind="co"]');
if(!bs.length){if(bar)bar.remove();return;}
if(!bar){bar=document.createElement('div');bar.className='m-bar';bar.dataset.kind='co';
bar.innerHTML='<span class="c"></span><span class="bs"><button class="m-cb" data-mc="all">✓ Отметить все</button><button class="m-cb gh" data-mc="none">Снять все</button></span>';
body.insertBefore(bar,body.firstChild);bar.addEventListener('click',courseBar);}
var ch=bs.filter(function(b){return b.checked;}).length;
bar.querySelector('.c').innerHTML='Отмечено <b>'+ch+'</b> из <b>'+bs.length+'</b>';
bar.querySelector('[data-mc="all"]').disabled=ch===bs.length;
bar.querySelector('[data-mc="none"]').disabled=ch===0;}
function courseBar(e){
var b=e.target.closest('[data-mc]');if(!b||b.disabled)return;
var mark=b.dataset.mc==='all',k=selK(),r=gD(k,true),c=kid();if(!r||!c)return;
var cs=[];try{if(typeof getCoursesForDay==='function')cs=getCoursesForDay(k)||[];}catch(x){}
if(!cs.length)cs=(c.courses||[]).filter(function(x){return x.startKey<=k&&k<=x.endKey&&!x.archived;});
if(!cs.length)return toast('На этот день курсов нет','err');
var sn=snap();r.meds=r.meds||[];
if(mark){var ad=0;cs.forEach(function(co){(co.times||[]).forEach(function(t){if(r.meds.some(function(m){return m.courseId===co.id&&m.time===t;}))return;r.meds.push({id:uid(),time:t,med:'other',dose:co.dose||'',note:co.note||'',courseId:co.id,customName:co.name});dAdd(co.name);ad++;});});
if(!ad)return toast('Всё уже отмечено','info');
r.meds.sort(function(a,b2){return String(a.time).localeCompare(String(b2.time));});if(!r.status)r.status='sick';
go();toast('Отмечено '+ad+' '+pl(ad,'приём','приёма','приёмов')+' ✓','ok',function(){undoS(sn);toast('Отметки сняты');});
}else{var bf=r.meds.length;r.meds=r.meds.filter(function(m){return !m.courseId;});var rm=bf-r.meds.length;
if(!rm)return toast('Отмеченных приёмов нет','info');
if(rm>3&&!confirm('Снять все отметки курсов за этот день ('+rm+')?'))return;
go();toast('Снято '+rm+' '+pl(rm,'отметка','отметки','отметок'),'info',function(){undoS(sn);toast('Отметки возвращены ✓');});}}
function hookPanel(){
var db=document.querySelector('#panel details[data-section="diagnosis"] .section-body');
if(db&&!db.querySelector('.m-bar[data-kind="dg"]')){
var b=document.createElement('div');b.className='m-bar';b.dataset.kind='dg';
b.innerHTML='<span class="c">Диагноз действует весь больничный</span><span class="bs"><button class="m-cb vi" data-dg="1">📅 На период</button></span>';
db.insertBefore(b,db.firstChild);
b.addEventListener('click',function(e){if(!e.target.closest('[data-dg]'))return;var i2=document.querySelector('#panel [data-act="diagnosis"]');openDiag(i2?i2.value:'',selK());});}
var mb=document.querySelector('#panel details[data-section="meds"] .section-body');
if(mb&&!mb.querySelector('.m-bar[data-kind="as"]')){
var b2=document.createElement('div');b2.className='m-bar';b2.dataset.kind='as';
b2.innerHTML='<span class="c">Из осмотра или вручную</span><span class="bs"><button class="m-cb" data-as="1">＋ Назначение</button></span>';
mb.insertBefore(b2,mb.firstChild);
b2.addEventListener('click',function(e){if(e.target.closest('[data-as]'))openAssign('');});}}
function hookExam(){
QA('.btn-to-cal').forEach(function(b){
if(b.dataset.eogPer)return;b.dataset.eogPer='1';
var p=document.createElement('button');p.type='button';p.className='m-exam-per';p.innerHTML='📅 На период болезни';
p.addEventListener('click',function(ev){
ev.stopPropagation();
var box=b.closest('[data-date]')||b.closest('.exam')||b.parentElement;
var k=(box&&box.dataset&&box.dataset.date)||selK(),txt=(box&&box.innerText)||'',dg='';
try{if(typeof extractDiagnosisFromNotes==='function')dg=extractDiagnosisFromNotes(txt)||'';}catch(x){}
if(!dg){var m=txt.match(/Диагноз\s*:?\s*([\s\S]*?)(?=(Лечение|Рекомендации|Назначения)|$)/i);dg=m?m[1].replace(/\s+/g,' ').trim():'';}
openDiag(dg,k);});
if(b.parentNode)b.parentNode.insertBefore(p,b.nextSibling);});}
function hookChart(){
var box=document.getElementById('tempChart');if(!box)return;
var em=box.querySelector('.temp-empty,.te');if(!em||em.querySelector('.m-add-temp'))return;
var b=document.createElement('button');b.type='button';b.className='m-add-temp';b.innerHTML='＋ Добавить замер';
b.addEventListener('click',function(ev){ev.stopPropagation();openTemp(box.dataset.day||window.selected||kOf(new Date()));});
em.appendChild(b);}
function hookStats(){
var box=document.getElementById('stats');if(!box)return;
QA('*',box).filter(function(e){return !e.children.length&&/препарат/i.test(e.textContent||'');}).forEach(function(lf){
var t=lf.parentElement;while(t&&t!==box&&!/\d/.test(t.textContent||''))t=t.parentElement;
if(!t||t===box||t.dataset.eogMeds)return;t.dataset.eogMeds='1';
t.classList.add('m-stat-open');t.setAttribute('role','button');t.setAttribute('tabindex','0');t.title='Открыть базу препаратов';
t.addEventListener('click',openV);
t.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openV();}});});}
var qd=false;
function queue(){if(qd)return;qd=true;requestAnimationFrame(function(){qd=false;try{hookStats();hookCourses();hookPanel();hookExam();hookChart();drawG(false);}catch(e){}});}
function watch(){
if(!('MutationObserver' in window))return;
var mo=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var t=ms[i].target;if(t&&t.closest&&t.closest('#eogMedsView,#eogMedsSheet,#eogMedsToasts,#eogSelBar,.m-growth'))continue;queue();return;}});
['#stats','#panel','#tempChart','#healthListModal','#hcGrowthChartWrap'].forEach(function(s){var e=document.querySelector(s);if(e)mo.observe(e,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});});
mo.observe(document.body,{childList:true});}
function init(){build();queue();watch();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.EOGMeds={version:'1.1',open:openV,close:closeV,addTemp:openTemp,assign:openAssign,diagnose:openDiag,refresh:function(){queue();if(V&&V.classList.contains('open'))vRender();drawG(true);},groups:groups,names:names};
})();
