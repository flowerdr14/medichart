(function(){
  var DEPTS=['가정의학과','내과','신경과','정신건강의학과','외과','정형외과','신경외과','흉부외과','성형외과','마취통증의학과','산부인과','소아청소년과','안과','이비인후과','피부과','비뇨의학과','영상의학과','방사선종양학과','병리과','진단검사의학과','결핵과','재활의학과','핵의학과','직업환경의학과','예방의학과','응급의학과','치과'];
  var BLOODS=['','A+','A-','B+','B-','O+','O-','AB+','AB-'];
  var TIMES=[];for(var h=9;h<18;h++){TIMES.push(p2(h)+':00');TIMES.push(p2(h)+':30')}
  function p2(n){return String(n).padStart(2,'0')}
  function ymd(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
  function nowStr(){var n=new Date();return ymd(n)+' '+p2(n.getHours())+':'+p2(n.getMinutes())}
  function nowLocal(){var n=new Date();return ymd(n)+'T'+p2(n.getHours())+':'+p2(n.getMinutes())}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function $(id){return document.getElementById(id)}
  function fillSel(sel,arr,blank){sel.innerHTML='';arr.forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;sel.appendChild(o)})}
  var today=new Date(),TODAY=ymd(today);

  var S={patients:[],visits:[],appts:[],notes:{},nextVisit:1,er:[],surg:[],imaging:[],nextId:1};
  try{var raw=localStorage.getItem('emr-outpatient-v2');if(raw){var o=JSON.parse(raw);if(o&&o.patients){S=o}}}catch(e){}
  ['patients','visits','appts','er','surg','imaging'].forEach(function(k){if(!S[k])S[k]=[]});if(!S.notes)S.notes={};if(!S.nextVisit)S.nextVisit=1;if(!S.nextId)S.nextId=1;
  function persist(){try{localStorage.setItem('emr-outpatient-v2',JSON.stringify(S));return true}catch(e){return false}}
  var pTimer=null;function persistSoon(){clearTimeout(pTimer);pTimer=setTimeout(persist,300)}

  var cur=null,curVisit=null,pickDate=TODAY,calY=today.getFullYear(),calM=today.getMonth(),filter='전체',delArm=false;
  function pt(c){return S.patients.filter(function(p){return p.chart===c})[0]}
  function age(b){if(!b)return '';var d=new Date(b),a=today.getFullYear()-d.getFullYear(),m=today.getMonth()-d.getMonth();if(m<0||(m===0&&today.getDate()<d.getDate()))a--;return a}
  function toast(t){var el=$('toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){el.classList.remove('on')},2000)}

  /* ---------- 공통: 팝업 ---------- */
  function showDlg(id){var d=$(id);d.hidden=false;d.parentNode.hidden=false}
  function hideDlg(id){var d=$(id);d.hidden=true;var p=d.parentNode,any=false;Array.prototype.forEach.call(p.children,function(c){if(!c.hidden)any=true});if(!any)p.hidden=true}
  document.querySelectorAll('[data-close]').forEach(function(b){b.onclick=function(){hideDlg(b.getAttribute('data-close'))}});
  document.querySelectorAll('.ov').forEach(function(ov){ov.addEventListener('mousedown',function(e){if(e.target===ov){Array.prototype.forEach.call(ov.children,function(c){c.hidden=true});ov.hidden=true}})});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.ov').forEach(function(ov){if(!ov.hidden){Array.prototype.forEach.call(ov.children,function(c){c.hidden=true});ov.hidden=true}})});

  /* ---------- 공통: 환자 선택/검색 ---------- */
  function hitsFor(q,box,cb){
    box.innerHTML='';q=q.trim();if(!q)return;
    var r=S.patients.filter(function(p){return p.name.indexOf(q)>-1||p.chart.indexOf(q)>-1}).slice(0,10);
    if(!r.length){box.innerHTML='<span style="color:var(--muted)">검색 결과가 없습니다. 상단의 + 환자등록으로 등록하세요.</span>';return}
    r.forEach(function(p){var b=document.createElement('button');b.type='button';b.textContent=p.name+' · '+p.chart+' · '+p.sex+'/'+age(p.birth);b.onclick=function(){cb(p);box.innerHTML=''};box.appendChild(b)});
  }
  function nextChart(){var m=0;S.patients.forEach(function(p){m=Math.max(m,parseInt(p.chart.slice(-4),10)||0)});return today.getFullYear()+String(m+1).padStart(4,'0')}
  function afterPatient(){renderErAll();renderOpHead();renderOpImg();renderOpList()}

  /* ---------- 모듈 전환 ---------- */
  var mod='opd';
  function showMod(m){
    mod=m;['er','opd','op'].forEach(function(k){$('mod-'+k).hidden=k!==m});
    document.querySelectorAll('.nt').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-mod')===m))});
    if(m==='er')renderErAll();if(m==='op'){renderOpList();renderOpHead();renderOpImg()}
  }
  document.querySelectorAll('.nt').forEach(function(b){b.onclick=function(){showMod(b.getAttribute('data-mod'))}});

  /* ---------- 환자등록 ---------- */
  fillSel($('p-blood'),BLOODS);fillSel($('f-blood'),BLOODS);fillSel($('er-blood'),BLOODS);
  $('btn-reg').onclick=function(){$('p-name').value='';$('p-birth').value='';$('p-tel').value='';$('p-sex').value='여';$('p-blood').value='';$('p-ins').value='건강보험';$('p-q').value='';$('p-hits').innerHTML='';showDlg('dlg-pt');$('p-name').focus()};
  $('p-find').onclick=function(){hitsFor($('p-q').value,$('p-hits'),function(p){hideDlg('dlg-pt');pickPatient(p.chart);toast(p.name+' 선택')})};
  $('p-q').addEventListener('keydown',function(e){if(e.key==='Enter')$('p-find').onclick()});
  $('p-ok').onclick=function(){
    var name=$('p-name').value.trim();if(!name){toast('성명을 입력하세요');$('p-name').focus();return}
    if(!$('p-birth').value){toast('생년월일을 입력하세요');$('p-birth').focus();return}
    var p={chart:nextChart(),name:name,birth:$('p-birth').value,sex:$('p-sex').value,tel:$('p-tel').value.trim(),ins:$('p-ins').value,mail:'',mailok:false,smsok:false,agree:false,addr:'',alg:'',memo:'',blood:$('p-blood').value};
    S.patients.push(p);persist();hideDlg('dlg-pt');pickPatient(p.chart);
    if(mod==='er'){addEpisode(TODAY,true)}
    toast('신규 등록: '+p.chart);
  };
  function pickPatient(c){curVisit=null;disarm();setPatient(c);renderQueue();loadNote()}

  /* ---------- 외래: 환자 ---------- */
  function fillForm(p){
    $('f-chart').value=p?p.chart:'(저장 시 자동 부여)';
    $('f-name').value=p?p.name:'';$('f-birth').value=p?p.birth:'';$('f-sex').value=p?p.sex:'여';
    $('f-tel').value=p?p.tel:'';$('f-ins').value=p?p.ins:'건강보험';$('f-mail').value=p?p.mail||'':'';
    $('f-mailok').checked=!!(p&&p.mailok);$('f-smsok').checked=!!(p&&p.smsok);$('f-agree').checked=!!(p&&p.agree);
    $('f-addr').value=p?p.addr:'';$('f-alg').value=p?p.alg:'';$('f-memo').value=p?p.memo:'';$('f-blood').value=p?p.blood||'':'';
    $('age-info').textContent=p?('만 '+age(p.birth)+'세'):'';
    $('rx-who').textContent=p?(p.name+' · '+p.chart):'환자를 선택하세요';
  }
  function setPatient(c){cur=c?pt(c):null;fillForm(cur);renderHist();afterPatient()}
  function disarm(){delArm=false;$('del-note').textContent='';$('btn-del').textContent='삭제'}
  $('btn-new').onclick=function(){cur=null;curVisit=null;disarm();fillForm(null);renderHist();renderQueue();loadNote();afterPatient();$('f-name').focus()};
  $('btn-save').onclick=function(){
    var name=$('f-name').value.trim();if(!name){toast('성명을 입력하세요');$('f-name').focus();return}
    if(!$('f-birth').value){toast('생년월일을 입력하세요');$('f-birth').focus();return}
    var data={name:name,birth:$('f-birth').value,sex:$('f-sex').value,tel:$('f-tel').value.trim(),ins:$('f-ins').value,mail:$('f-mail').value.trim(),mailok:$('f-mailok').checked,smsok:$('f-smsok').checked,agree:$('f-agree').checked,addr:$('f-addr').value.trim(),alg:$('f-alg').value.trim(),memo:$('f-memo').value.trim(),blood:$('f-blood').value};
    if(cur){Object.assign(cur,data);toast('환자 정보를 수정했습니다')}
    else{cur=Object.assign({chart:nextChart()},data);S.patients.push(cur);toast('신규 등록: '+cur.chart)}
    persist();fillForm(cur);renderQueue();renderSched();afterPatient();
  };
  $('btn-del').onclick=function(){
    if(!cur){toast('삭제할 환자를 선택하세요');return}
    if(!delArm){delArm=true;$('btn-del').textContent='한 번 더 누르면 삭제';$('del-note').textContent=cur.name+' 환자와 접수·예약·기록이 모두 삭제됩니다';return}
    var c=cur.chart,ids=S.visits.filter(function(v){return v.chart===c}).map(function(v){return v.id});
    S.patients=S.patients.filter(function(p){return p.chart!==c});S.visits=S.visits.filter(function(v){return v.chart!==c});S.appts=S.appts.filter(function(a){return a.chart!==c});
    S.er=S.er.filter(function(e){return e.chart!==c});S.surg=S.surg.filter(function(s){return s.chart!==c});S.imaging=S.imaging.filter(function(i){return i.chart!==c});
    ids.forEach(function(i){delete S.notes[i]});
    cur=null;curVisit=null;erCur=null;opSel=null;disarm();persist();fillForm(null);renderAll();renderHist();loadNote();afterPatient();toast('환자를 삭제했습니다');
  };
  $('btn-search').onclick=function(){hitsFor($('q').value,$('hits'),function(p){pickPatient(p.chart)})};
  $('q').addEventListener('keydown',function(e){if(e.key==='Enter')$('btn-search').onclick()});

  /* ---------- 외래: 접수 ---------- */
  fillSel($('r-dept'),DEPTS);$('r-dept').value='내과';$('r-date').value=TODAY;
  function docList(){var s={};S.visits.forEach(function(v){if(v.doc)s[v.doc]=1});S.appts.forEach(function(a){if(a.doc)s[a.doc]=1});S.surg.forEach(function(x){if(x.surgeon)s[x.surgeon]=1});S.er.forEach(function(e){(e.rx||[]).forEach(function(r){if(r.by)s[r.by]=1})});$('doc-list').innerHTML=Object.keys(s).map(function(n){return '<option value="'+esc(n)+'">'}).join('')}
  function kinds(){return Array.prototype.slice.call(document.querySelectorAll('.kind:checked')).map(function(c){return c.value}).join(', ')||'일반'}
  $('btn-rx').onclick=function(){
    if(!cur){toast('먼저 환자를 검색하거나 저장하세요');return}
    var doc=$('r-doc').value.trim();if(!doc){toast('담당의를 입력하세요');$('r-doc').focus();return}
    var date=$('r-date').value||TODAY,dept=$('r-dept').value;
    if(S.visits.some(function(v){return v.chart===cur.chart&&v.date===date&&v.dept===dept&&v.status!=='수납'})){toast('같은 진료과에 이미 접수되어 있습니다');return}
    var n=new Date(),v={id:S.nextVisit++,date:date,time:p2(n.getHours())+':'+p2(n.getMinutes()),chart:cur.chart,dept:dept,doc:doc,type:$('r-type').value,kind:kinds(),memo:$('r-memo').value.trim(),status:'대기'};
    S.visits.push(v);curVisit=v;pickDate=date;var d=new Date(date);calY=d.getFullYear();calM=d.getMonth();$('r-memo').value='';
    persist();renderAll();loadNote();toast(cur.name+' 접수 완료');
  };

  /* ---------- 외래: 접수 현황 ---------- */
  var STAT=['전체','대기','진료중','완료','수납'];
  function dayVisits(){return S.visits.filter(function(v){return v.date===pickDate})}
  function renderChips(){
    var c=$('chips');c.innerHTML='';
    STAT.forEach(function(s){var b=document.createElement('button');b.type='button';b.className='chip';b.setAttribute('aria-pressed',String(filter===s));
      var n=dayVisits().filter(function(v){return s==='전체'||v.status===s}).length;b.textContent=s+' '+n;b.onclick=function(){filter=s;renderChips();renderQueue()};c.appendChild(b)});
    var dv=dayVisits();$('st-total').textContent='전체 '+dv.length;
    ['대기','진료중','완료'].forEach(function(s,i){$(['st-wait','st-busy','st-done'][i]).textContent=s+' '+dv.filter(function(v){return v.status===s}).length});
  }
  function renderQueue(){
    var rows=dayVisits().filter(function(v){return filter==='전체'||v.status===filter}).sort(function(a,b){return a.time<b.time?-1:a.time>b.time?1:a.id-b.id});
    var tb=$('queue');tb.innerHTML='';
    rows.forEach(function(v,i){
      var p=pt(v.chart)||{name:'?',sex:'',birth:''},tr=document.createElement('tr');tr.tabIndex=0;if(curVisit&&curVisit.id===v.id)tr.className='sel';
      tr.innerHTML='<td><span class="badge s-'+v.status+'">'+v.status+'</span></td><td class="num">'+(i+1)+'</td><td class="num">'+v.time+'</td><td class="num">'+v.chart+'</td><td>'+esc(p.name)+'</td><td>'+p.sex+'/'+age(p.birth)+'</td><td>'+esc(v.dept)+'</td><td>'+esc(v.doc)+'</td><td>'+v.type+'</td><td>'+esc(v.kind||'일반')+'</td>';
      var pick=function(){curVisit=v;disarm();setPatient(v.chart);renderQueue();loadNote()};
      tr.onclick=pick;tr.onkeydown=function(e){if(e.key==='Enter')pick()};tb.appendChild(tr);
    });
    $('q-empty').hidden=rows.length>0;$('q-date').textContent=pickDate+(pickDate===TODAY?' (오늘)':'');
    docList();
  }
  document.querySelectorAll('[data-st]').forEach(function(b){b.onclick=function(){
    if(!curVisit){toast('접수현황에서 환자를 선택하세요');return}
    curVisit.status=b.getAttribute('data-st');persist();renderChips();renderQueue();toast(pt(curVisit.chart).name+' → '+curVisit.status)}});
  $('btn-cancel').onclick=function(){
    if(!curVisit){toast('접수현황에서 환자를 선택하세요');return}
    var id=curVisit.id;S.visits=S.visits.filter(function(v){return v.id!==id});delete S.notes[id];curVisit=null;persist();renderAll();loadNote();toast('접수를 취소했습니다')};

  document.querySelectorAll('.tab').forEach(function(t){t.onclick=function(){
    document.querySelectorAll('.tab').forEach(function(x){x.setAttribute('aria-selected',String(x===t))});
    $('tab-note').hidden=t.getAttribute('data-tab')!=='note';$('tab-hist').hidden=t.getAttribute('data-tab')!=='hist'}});
  function loadNote(){
    var n=curVisit&&S.notes[curVisit.id]||{};
    ['bp','hr','bt','wt'].forEach(function(k){$('v-'+k).value=n[k]||''});
    ['s','o','a','p'].forEach(function(k){$('n-'+k).value=n[k]||''});
    $('note-who').textContent=curVisit?(pt(curVisit.chart).name+' · '+curVisit.date+' '+curVisit.dept+' · '+curVisit.doc):'접수현황에서 환자를 선택하세요';
  }
  $('btn-note').onclick=function(){
    if(!curVisit){toast('접수현황에서 환자를 선택하세요');return}
    var n={};['bp','hr','bt','wt'].forEach(function(k){n[k]=$('v-'+k).value.trim()});['s','o','a','p'].forEach(function(k){n[k]=$('n-'+k).value.trim()});
    S.notes[curVisit.id]=n;persist();renderHist();toast('진료 기록을 저장했습니다')};
  function renderHist(){
    var ul=$('hist');ul.innerHTML='';
    if(!cur){ul.innerHTML='<li style="color:var(--muted)">환자를 선택하면 표시됩니다.</li>';return}
    var vs=S.visits.filter(function(v){return v.chart===cur.chart&&S.notes[v.id]}).sort(function(a,b){return a.date<b.date?1:-1});
    if(!vs.length){ul.innerHTML='<li style="color:var(--muted)">저장된 진료 기록이 없습니다.</li>';return}
    vs.forEach(function(v){var n=S.notes[v.id],li=document.createElement('li');li.innerHTML='<span class="d">'+v.date+'</span>'+esc(v.dept)+' · '+esc(v.doc)+' · '+esc(n.a||'진단 미입력')+(n.p?' · '+esc(n.p):'');ul.appendChild(li)});
  }

  function renderCal(){
    var c=$('cal');c.innerHTML='';['일','월','화','수','목','금','토'].forEach(function(d){var e=document.createElement('div');e.className='dow';e.textContent=d;c.appendChild(e)});
    $('cal-title').textContent=calY+' '+p2(calM+1);
    var start=new Date(calY,calM,1-new Date(calY,calM,1).getDay());
    for(var i=0;i<42;i++){
      var d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),k=ymd(d),e=document.createElement('div');
      e.className='d'+(d.getMonth()!==calM?' out':'')+(d.getDay()===0?' sun':'')+(k===TODAY?' today':'')+(k===pickDate?' pick':'');
      e.textContent=p2(d.getDate());e.tabIndex=0;
      if(S.visits.some(function(v){return v.date===k})||S.appts.some(function(a){return a.date===k})){var dot=document.createElement('span');dot.className='dot';e.appendChild(dot)}
      (function(k,d){var go=function(){pickDate=k;calY=d.getFullYear();calM=d.getMonth();$('r-date').value=k;curVisit=null;renderAll();loadNote()};e.onclick=go;e.onkeydown=function(ev){if(ev.key==='Enter')go()}})(k,d);
      c.appendChild(e);
    }
  }
  $('cal-prev').onclick=function(){calM--;if(calM<0){calM=11;calY--}renderCal()};
  $('cal-next').onclick=function(){calM++;if(calM>11){calM=0;calY++}renderCal()};
  $('cal-today').onclick=function(){pickDate=TODAY;calY=today.getFullYear();calM=today.getMonth();$('r-date').value=TODAY;curVisit=null;renderAll();loadNote()};

  function renderSched(){
    var g=$('sched');g.innerHTML='';
    function ap(t){var e=document.createElement('div');e.className='ap';e.textContent=t;g.appendChild(e)}
    TIMES.forEach(function(t){
      if(t==='09:00')ap('AM');if(t==='12:00')ap('PM');
      var t0=document.createElement('div');t0.className='t';t0.textContent=t;g.appendChild(t0);
      var a=S.appts.filter(function(x){return x.date===pickDate&&x.time===t})[0],cell=document.createElement('div');
      if(a){var p=pt(a.chart);cell.className='bk';cell.innerHTML='<span>'+esc(p?p.name:'?')+' · '+esc(a.dept)+' · '+esc(a.doc)+'</span>';
        var x=document.createElement('button');x.type='button';x.setAttribute('aria-label','예약 취소');x.textContent='×';
        x.onclick=function(ev){ev.stopPropagation();S.appts=S.appts.filter(function(y){return y!==a});persist();renderCal();renderSched();toast('예약을 취소했습니다')};cell.appendChild(x);
        cell.onclick=function(){curVisit=null;disarm();setPatient(a.chart);renderQueue();loadNote()};
      }else{cell.className='free';cell.setAttribute('role','button');cell.tabIndex=0;cell.textContent='예약하기';
        var book=function(){
          if(!cur){toast('먼저 환자를 선택하세요');return}
          var doc=$('r-doc').value.trim();if(!doc){toast('접수정보의 담당의를 입력하세요');$('r-doc').focus();return}
          S.appts.push({date:pickDate,time:t,doc:doc,dept:$('r-dept').value,chart:cur.chart});persist();renderCal();renderSched();docList();toast(cur.name+' '+t+' 예약')};
        cell.onclick=book;cell.onkeydown=function(e){if(e.key==='Enter')book()}}
      g.appendChild(cell);
    });
    $('sc-date').textContent=pickDate;
  }
  function renderAll(){renderChips();renderQueue();renderCal();renderSched()}

  /* =================== 응급기록 =================== */
  var erCur=null,erTab='img';
  fillSel($('er-dept'),DEPTS);
  function epsOf(){return cur?S.er.filter(function(e){return e.chart===cur.chart}).sort(function(a,b){return (a.date+a.time)<(b.date+b.time)?1:-1}):[]}
  function newEp(date){var n=new Date(),labs=[];for(var i=0;i<10;i++)labs.push({});
    return {id:S.nextId++,chart:cur.chart,date:date,time:p2(n.getHours())+':'+p2(n.getMinutes()),arrive:'',dept:'응급의학과',labs:labs,labExtra:'',rx:[],vs:{},proc:'',final:'',finalNote:'',exam:'',gcs:{},hx:{alg:cur.alg||''},pain:[],death:null}}
  function addEpisode(date,silent){
    if(!cur){toast('먼저 환자를 선택하세요');return}
    var e=newEp(date);S.er.push(e);erCur=e;persist();renderErAll();if(!silent)toast('접수이력을 추가했습니다');
  }
  $('er-find').onclick=function(){hitsFor($('er-q').value,$('er-hits'),function(p){erCur=null;pickPatient(p.chart)})};
  $('er-q').addEventListener('keydown',function(e){if(e.key==='Enter')$('er-find').onclick()});
  $('er-add').onclick=function(){if(!cur){toast('먼저 환자를 검색하세요');return}$('er-adddate').value=TODAY;$('er-addrow').hidden=false;$('er-adddate').focus()};
  $('er-addok').onclick=function(){var d=$('er-adddate').value||TODAY;$('er-addrow').hidden=true;addEpisode(d)};
  document.querySelectorAll('.st').forEach(function(b){b.onclick=function(){erTab=b.getAttribute('data-er');renderErAll()}});

  function bPath(ep,path){var a=path.split('.'),o=ep;for(var i=0;i<a.length-1;i++){o=o[a[i]]=o[a[i]]||{}}return {o:o,k:a[a.length-1]}}
  var binds=document.querySelectorAll('#mod-er [data-b]');
  binds.forEach(function(el){el.addEventListener('input',function(){if(!erCur)return;var r=bPath(erCur,el.getAttribute('data-b'));r.o[r.k]=el.value;persistSoon();if(el.getAttribute('data-b')==='arrive')renderErList()});el.addEventListener('change',function(){if(!erCur)return;var r=bPath(erCur,el.getAttribute('data-b'));r.o[r.k]=el.value;persistSoon()})});
  $('er-blood').onchange=function(){if(cur){cur.blood=$('er-blood').value;persistSoon();$('f-blood').value=cur.blood}};

  function renderErList(){
    var box=$('er-list');box.innerHTML='';
    if(!cur){box.innerHTML='<div class="empty">환자를 검색하거나 + 환자등록으로 등록하세요.</div>';return}
    var eps=epsOf();if(!eps.length){box.innerHTML='<div class="empty">접수이력이 없습니다.</div>';return}
    eps.forEach(function(e){var b=document.createElement('button');b.type='button';b.className='ep';b.setAttribute('aria-pressed',String(!!erCur&&erCur.id===e.id));
      b.textContent=e.date+' '+e.time+(e.arrive?' · '+e.arrive:'')+(e.final?' · '+e.final:'');b.onclick=function(){erCur=e;renderErAll()};box.appendChild(b)});
  }
  function renderErAll(){
    if(mod!=='er')return;
    if(erCur&&(!cur||erCur.chart!==cur.chart))erCur=null;
    if(cur&&!erCur){var eps=epsOf();erCur=eps[0]||null}
    document.querySelectorAll('.st').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-er')===erTab))});
    ['img','lab','rx','rec'].forEach(function(k){$('er-p-'+k).hidden=k!==erTab});
    renderErList();
    $('er-name').value=cur?cur.name:'';$('er-chart').value=cur?cur.chart:'';$('er-age').value=cur?age(cur.birth):'';
    $('er-blood').value=cur?cur.blood||'':'';$('er-blood').disabled=!cur;
    document.querySelectorAll('input[name=er-sex]').forEach(function(r){r.checked=!!cur&&r.value===cur.sex});
    binds.forEach(function(el){el.disabled=!erCur;var ep=erCur;if(!ep){el.value='';return}var r=bPath(ep,el.getAttribute('data-b'));el.value=r.o[r.k]==null?'':r.o[r.k]});
    $('er-add').disabled=!cur;
    var note=$('er-note');
    if(!cur){note.hidden=false;note.textContent='환자를 검색하거나 상단 + 환자등록으로 등록하면 기록을 작성할 수 있습니다.'}
    else if(!erCur&&erTab!=='img'){note.hidden=false;note.textContent='접수이력이 없습니다. 왼쪽의 달력추가로 응급 접수를 먼저 추가하세요.'}
    else note.hidden=true;
    $('img-add').disabled=!cur;
    renderErImg();renderLab();renderRx();renderGcs();renderPainSum();
    $('er-death').textContent=erCur&&erCur.death?'사망진단서 (작성됨)':'사망진단서';
  }

  /* 영상검사 (환자 단위, 수술기록과 공유) */
  function imgsOf(){return cur?S.imaging.filter(function(i){return i.chart===cur.chart}).sort(function(a,b){return a.dt<b.dt?1:-1}):[]}
  function viewImg(i){
    $('v-title').textContent=(i.kind||'')+' · '+i.name+' · '+i.dt.replace('T',' ');
    $('v-body').innerHTML=i.img?'<img class="pv" alt="'+esc(i.name)+'" src="'+i.img+'">':'<div class="empty">첨부된 이미지가 없습니다.</div>';showDlg('dlg-view');
  }
  function renderErImg(){
    var tb=$('er-img-body');tb.innerHTML='';var list=imgsOf();
    if(!list.length){tb.innerHTML='<tr><td colspan="3" style="color:var(--muted);text-align:center;cursor:default">'+(cur?'등록된 영상검사가 없습니다. 오른쪽 위 추가 버튼으로 등록하세요.':'환자를 선택하세요.')+'</td></tr>';return}
    list.forEach(function(i){var tr=document.createElement('tr');
      tr.innerHTML='<td class="num">'+esc(i.dt.replace('T',' '))+'</td><td>'+esc((i.kind?i.kind+' · ':'')+i.name)+'</td><td style="text-align:center"></td>';
      var v=document.createElement('button');v.type='button';v.className='btn sm';v.textContent=i.img?'보기':'없음';v.onclick=function(e){e.stopPropagation();viewImg(i)};
      var x=document.createElement('button');x.type='button';x.className='btn sm';x.textContent='×';x.setAttribute('aria-label','영상검사 삭제');x.style.marginLeft='4px';x.onclick=function(e){e.stopPropagation();S.imaging=S.imaging.filter(function(y){return y!==i});persist();renderErImg();renderOpImg();toast('영상검사를 삭제했습니다')};
      tr.lastChild.appendChild(v);tr.lastChild.appendChild(x);tr.onclick=function(){viewImg(i)};tb.appendChild(tr)});
  }
  $('img-add').onclick=function(){if(!cur){toast('환자를 선택하세요');return}$('i-dt').value=nowLocal();$('i-name').value='';$('i-file').value='';$('i-kind').value='X-Ray';showDlg('dlg-img');$('i-name').focus()};
  function downscale(file,cb){
    var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){var m=900,s=Math.min(1,m/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',0.72))};im.onerror=function(){cb(null)};im.src=fr.result};fr.onerror=function(){cb(null)};fr.readAsDataURL(file)}
  $('i-ok').onclick=function(){
    var name=$('i-name').value.trim();if(!name){toast('영상검사명을 입력하세요');$('i-name').focus();return}
    var f=$('i-file').files[0];
    function done(data){
      var it={id:S.nextId++,chart:cur.chart,kind:$('i-kind').value,name:name,dt:$('i-dt').value||nowLocal(),img:data||''};
      S.imaging.push(it);if(!persist()){it.img='';persist();toast('저장 공간이 부족해 이미지 없이 등록했습니다')}else toast('영상검사를 추가했습니다');
      hideDlg('dlg-img');renderErImg();renderOpImg();
    }
    if(f){downscale(f,done)}else done('');
  };

  /* 검사결과 */
  var LABC=[['d','검사일자'],['cbc','CBC'],['ua','UA'],['inf','감염'],['lft','LFT'],['pft','PFT'],['tum','TUMOR'],['abga','ABGA'],['crp','CRP'],['esr','ESR'],['sp','특수혈액'],['etc','기타']];
  $('lab-head').innerHTML='<tr>'+LABC.map(function(c){return '<th>'+c[1]+'</th>'}).join('')+'</tr>';
  function renderLab(){
    var tb=$('lab-body');tb.innerHTML='';
    for(var r=0;r<10;r++){var tr=document.createElement('tr');
      LABC.forEach(function(c){var td=document.createElement('td'),inp=document.createElement('input');inp.setAttribute('aria-label',c[1]+' '+(r+1)+'행');
        if(c[0]==='d')inp.placeholder='YY-MM-DD';
        inp.value=erCur&&erCur.labs[r]&&erCur.labs[r][c[0]]||'';inp.disabled=!erCur;
        (function(r,k){inp.oninput=function(){if(!erCur)return;(erCur.labs[r]=erCur.labs[r]||{})[k]=inp.value;persistSoon()}})(r,c[0]);
        td.appendChild(inp);tr.appendChild(td)});
      tb.appendChild(tr)}
  }

  /* 처방내역 */
  var RXST=['처방','수행완료','취소'],rxKind='';
  document.querySelectorAll('[data-rx]').forEach(function(b){b.onclick=function(){
    if(!erCur){toast('접수이력을 먼저 추가하세요');return}
    rxKind=b.getAttribute('data-rx');$('rx-title').textContent='처방 추가 · '+rxKind;$('x-content').value='';$('x-caution').value='';
    var last=erCur.rx.length?erCur.rx[erCur.rx.length-1].by:'';$('x-by').value=last;showDlg('dlg-rx');($('x-by').value?$('x-content'):$('x-by')).focus()}});
  $('x-ok').onclick=function(){
    var by=$('x-by').value.trim(),c=$('x-content').value.trim();
    if(!by){toast('처방자를 입력하세요');$('x-by').focus();return}if(!c){toast('내용을 입력하세요');$('x-content').focus();return}
    erCur.rx.push({id:S.nextId++,kind:rxKind,date:nowStr(),by:by,content:c,caution:$('x-caution').value.trim(),status:'처방'});
    persist();hideDlg('dlg-rx');renderRx();docList();toast(rxKind+' 처방을 추가했습니다');
  };
  function renderRx(){
    var tb=$('rx-body');tb.innerHTML='';var list=erCur?erCur.rx:[];
    if(!list.length){tb.innerHTML='<tr><td colspan="7" style="color:var(--muted);text-align:center;cursor:default">처방 내역이 없습니다.</td></tr>';return}
    list.forEach(function(r,i){var tr=document.createElement('tr');
      tr.innerHTML='<td class="num">'+(i+1)+'</td><td>'+esc(r.kind)+'</td><td class="num">'+esc(r.date)+'</td><td>'+esc(r.by)+'</td><td style="white-space:normal">'+esc(r.content)+'</td><td style="white-space:normal">'+esc(r.caution)+'</td><td></td>';
      var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent=r.status;b.title='누르면 상태가 바뀝니다';
      b.onclick=function(){r.status=RXST[(RXST.indexOf(r.status)+1)%RXST.length];persist();renderRx()};tr.lastChild.appendChild(b);tb.appendChild(tr)});
  }

  /* GCS */
  var GCS={e:[['4','자발적 개안'],['3','호명 시'],['2','통증 시'],['1','없음']],v:[['5','지남력 정상'],['4','혼돈'],['3','부적절한 단어'],['2','이해불능 소리'],['1','없음']],m:[['6','명령 수행'],['5','통증 위치 파악'],['4','통증 회피'],['3','비정상 굴곡'],['2','신전'],['1','없음']]};
  var GN={e:'Eye Opening',v:'Verbal Response',m:'Motor Response'};
  function renderGcs(){
    var g=$('gcs');g.innerHTML='';
    ['e','v','m'].forEach(function(k){
      var l=document.createElement('label');l.textContent=GN[k];l.setAttribute('for','gcs-'+k);var s=document.createElement('select');s.id='gcs-'+k;
      s.innerHTML='<option value="">-</option>'+GCS[k].map(function(o){return '<option value="'+o[0]+'">'+o[0]+' · '+o[1]+'</option>'}).join('');
      s.value=erCur&&erCur.gcs&&erCur.gcs[k]||'';s.disabled=!erCur;
      s.onchange=function(){if(!erCur)return;erCur.gcs=erCur.gcs||{};erCur.gcs[k]=s.value;persist();gcsTot()};
      g.appendChild(l);g.appendChild(s)});
    var t=document.createElement('div');t.className='tot';t.innerHTML='<span>총점</span><span id="gcs-tot">0</span>';g.appendChild(t);gcsTot();
  }
  function gcsTot(){var t=0,g=erCur&&erCur.gcs||{};['e','v','m'].forEach(function(k){t+=parseInt(g[k]||0,10)||0});$('gcs-tot').textContent=t}

  /* 통증평가도구: NRS / FLACC */
  function face(i){var m=['M13 30 Q24 43 35 30','M15 33 Q24 40 33 33','M16 36 Q24 38 32 36','M16 38 L32 38','M16 40 Q24 34 32 40','M14 41 Q24 31 34 41'][i];
    return '<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="#fff" stroke="#333" stroke-width="2"/><circle cx="17" cy="20" r="2.2" fill="#333"/><circle cx="31" cy="20" r="2.2" fill="#333"/><path d="'+m+'" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round"/></svg>'}
  var nrsVal=null;
  function buildNrs(){
    var s=$('nrs-scale');s.innerHTML='<div class="tr"></div>';
    for(var i=0;i<=10;i++){
      if(i%2===0){var f=document.createElement('div');f.className='f';f.style.gridColumn=String(i+1);f.innerHTML=face(i/2);s.appendChild(f)}
      var d=document.createElement('button');d.type='button';d.className='dt';d.style.gridColumn=String(i+1);d.setAttribute('aria-label','NRS '+i);d.setAttribute('data-v',i);
      d.onclick=(function(i){return function(){nrsVal=i;paintNrs()}})(i);s.appendChild(d);
      var n=document.createElement('div');n.className='nm';n.style.gridColumn=String(i+1);n.textContent=i;s.appendChild(n)}
    [['No Pain',1],['Mild Pain',3],['Moderate Pain',6],['Severe Pain',8],['Extreme Pain',11]].forEach(function(l){var e=document.createElement('div');e.className='lbl';e.style.gridColumn=String(l[1]);e.textContent=l[0];if(l[1]===1)e.style.justifySelf='start';if(l[1]===11)e.style.justifySelf='end';s.appendChild(e)});
  }
  function paintNrs(){document.querySelectorAll('#nrs-scale .dt').forEach(function(d){d.classList.toggle('on',parseInt(d.getAttribute('data-v'),10)===nrsVal)});$('nrs-val').textContent=nrsVal==null?'점수를 선택하세요':'선택 점수: '+nrsVal+' / 10'}
  buildNrs();
  var FL=[['Face','0 특별한 표정 없음/미소 · 1 가끔 찡그림, 위축 · 2 턱 떨림, 이를 악뭄'],['Legs','0 정상/이완 · 1 불안, 긴장 · 2 발길질, 다리 오므림'],['Activity','0 조용히 누움 · 1 몸을 뒤척임, 긴장 · 2 활처럼 휨, 경직, 경련'],['Cry','0 울음 없음 · 1 신음, 가끔 호소 · 2 계속 울음, 자주 호소'],['Consolability','0 편안함 · 1 접촉·말로 안심 · 2 달래기 어려움']];
  var fl={};
  function buildFlacc(){
    var t=$('flacc-t');t.innerHTML='';
    FL.forEach(function(r,ri){var tr=document.createElement('tr'),th=document.createElement('th');th.textContent=r[0];th.title=r[1];tr.appendChild(th);
      for(var v=0;v<3;v++){var td=document.createElement('td'),b=document.createElement('button');b.type='button';b.textContent=v;b.setAttribute('aria-label',r[0]+' '+v+'점');
        b.className=fl[ri]===v?'on':'';b.onclick=(function(ri,v){return function(){fl[ri]=v;buildFlacc()}})(ri,v);td.appendChild(b);tr.appendChild(td)}
      t.appendChild(tr)});
    var n=Object.keys(fl).length,sum=0;Object.keys(fl).forEach(function(k){sum+=fl[k]});$('flacc-val').textContent=n?('합계 '+sum+' / 10 ('+n+'/5 항목)'):'항목별 점수를 선택하세요';
  }
  buildFlacc();
  $('pain-nrs').onclick=function(){if(!erCur){toast('접수이력을 먼저 추가하세요');return}nrsVal=null;$('nrs-note').value='';paintNrs();showDlg('win-nrs')};
  $('pain-flacc').onclick=function(){if(!erCur){toast('접수이력을 먼저 추가하세요');return}fl={};$('flacc-note').value='';buildFlacc();showDlg('win-flacc')};
  $('nrs-ok').onclick=function(){if(nrsVal==null){toast('점수를 선택하세요');return}erCur.pain.push({type:'NRS',score:nrsVal,note:$('nrs-note').value.trim(),time:nowStr()});persist();renderPainSum();hideDlg('win-nrs');toast('NRS '+nrsVal+'점을 저장했습니다')};
  $('flacc-ok').onclick=function(){if(Object.keys(fl).length<5){toast('다섯 항목을 모두 선택하세요');return}var s=0;Object.keys(fl).forEach(function(k){s+=fl[k]});erCur.pain.push({type:'FLACC',score:s,note:$('flacc-note').value.trim(),time:nowStr()});persist();renderPainSum();hideDlg('win-flacc');toast('FLACC '+s+'점을 저장했습니다')};
  function renderPainSum(){['NRS','FLACC'].forEach(function(t){var l=erCur&&erCur.pain.filter(function(x){return x.type===t}).pop();$('pn-'+t.toLowerCase()).textContent=l?(l.score+'점 · '+l.time.slice(11)):''})}

  /* 사망진단서 */
  $('er-death').onclick=function(){
    if(!erCur){toast('접수이력을 먼저 추가하세요');return}
    var d=erCur.death||{};$('d-dt').value=d.dt||'';$('d-kind').value=d.kind||'';$('d-c1').value=d.c1||'';$('d-c2').value=d.c2||'';$('d-c3').value=d.c3||'';$('d-by').value=d.by||'';$('d-memo').value=d.memo||'';showDlg('dlg-death')};
  $('d-ok').onclick=function(){erCur.death={dt:$('d-dt').value,kind:$('d-kind').value,c1:$('d-c1').value.trim(),c2:$('d-c2').value.trim(),c3:$('d-c3').value.trim(),by:$('d-by').value.trim(),memo:$('d-memo').value.trim()};persist();hideDlg('dlg-death');$('er-death').textContent='사망진단서 (작성됨)';toast('사망진단서를 저장했습니다')};
  $('d-clear').onclick=function(){if(erCur){erCur.death=null;persist()}hideDlg('dlg-death');$('er-death').textContent='사망진단서';toast('서식을 삭제했습니다')};

  /* =================== 수술기록 =================== */
  var opSel=null,opDelArm=false;
  var dOpts=[''].concat(DEPTS);
  $('opf-dept').innerHTML='<option value="">전체 진료과</option>'+DEPTS.map(function(d){return '<option>'+d+'</option>'}).join('');
  fillSel($('op-dept'),DEPTS);$('op-dept').value='외과';
  function val(id){return $(id).value.trim()}
  function opFiltered(){
    var n=val('opf-name'),c=val('opf-chart'),dept=$('opf-dept').value,from=$('opf-from').value,to=$('opf-to').value;
    var mode=(document.querySelector('input[name=opf-mode]:checked')||{}).value,sort=(document.querySelector('input[name=opf-sort]:checked')||{}).value;
    var sp=Array.prototype.slice.call(document.querySelectorAll('.opf-sp:checked')).map(function(x){return x.value});
    function inR(v){return (!from||v>=from)&&(!to||v<=to)}
    var r=S.surg.filter(function(s){var p=pt(s.chart);if(!p)return false;
      if(n&&p.name.indexOf(n)<0)return false;if(c&&s.chart.indexOf(c)<0)return false;if(dept&&s.dept!==dept)return false;
      if(mode==='today'&&s.date!==TODAY)return false;if(mode==='recv'&&!inR(s.rdate))return false;if(mode==='rep'&&!inR(s.wdate))return false;
      if(sp.length&&sp.indexOf(s.spec)<0)return false;return true});
    r.sort(function(a,b){if(sort==='code')return (a.name||'').localeCompare(b.name||'','ko');if(sort==='class')return (a.surgeon||'').localeCompare(b.surgeon||'','ko');return a.date<b.date?1:-1});
    return r;
  }
  function renderOpList(){
    if(mod!=='op')return;
    var tb=$('op-body');tb.innerHTML='';var rows=opFiltered();
    rows.forEach(function(s,i){var p=pt(s.chart),tr=document.createElement('tr');tr.tabIndex=0;if(opSel===s.id)tr.className='sel';
      tr.innerHTML='<td class="num">'+(i+1)+(s.fav?' ★':'')+(s.bm?' ▪':'')+'</td><td>'+esc(p.name)+'</td><td class="num">'+s.chart+'</td><td>'+p.sex+'</td><td>'+age(p.birth)+'</td><td>'+esc(s.surgeon)+'</td><td>'+esc(s.name)+'</td>';
      var pick=function(){opSel=s.id;opDelArm=false;$('op-del').textContent='삭 제';cur=p;fillForm(p);renderHist();loadOp(s);renderOpList();renderOpHead();renderOpImg()};
      tr.onclick=pick;tr.onkeydown=function(e){if(e.key==='Enter')pick()};tb.appendChild(tr)});
    $('op-empty').hidden=rows.length>0;
  }
  function loadOp(s){
    $('op-date').value=s?s.date:'';$('op-dept').value=s?s.dept:'외과';$('op-surgeon').value=s?s.surgeon:'';$('op-assist').value=s?s.assist:'';$('op-anes').value=s?s.anes:'';$('op-spec').value=s?s.spec:'';
    $('op-pre').value=s?s.pre:'';$('op-post').value=s?s.post:'';$('op-name').value=s?s.name:'';$('op-special').value=s?s.special:'';$('op-process').value=s?s.process:'';
    $('op-fav').checked=!!(s&&s.fav);$('op-bm').checked=!!(s&&s.bm);$('op-wdate').value=s?s.wdate:TODAY;
  }
  function renderOpHead(){
    if(mod!=='op')return;
    var s=opSel&&S.surg.filter(function(x){return x.id===opSel})[0];
    $('op-title').textContent='수술기록 '+(s?s.dept:$('op-dept').value)+' - '+(s&&s.name?s.name:'수술명');
    $('op-pt').textContent='대상 환자: '+(cur?cur.name+' ('+cur.chart+')':'선택 안 됨 · 상단 + 환자등록에서 검색')
  }
  ['op-dept','op-name'].forEach(function(id){$(id).addEventListener('input',function(){if(!opSel){$('op-title').textContent='수술기록 '+$('op-dept').value+' - '+($('op-name').value||'수술명')}})});
  $('op-dept').addEventListener('change',function(){if(!opSel)$('op-title').textContent='수술기록 '+$('op-dept').value+' - '+($('op-name').value||'수술명')});
  $('op-newrec').onclick=function(){opSel=null;opDelArm=false;$('op-del').textContent='삭 제';loadOp(null);renderOpList();renderOpHead()};
  $('op-save').onclick=function(){
    if(!cur){toast('먼저 환자를 선택하세요 (상단 + 환자등록)');return}
    if(!val('op-name')){toast('수술명을 입력하세요');$('op-name').focus();return}
    if(!$('op-date').value){toast('수술일을 입력하세요');$('op-date').focus();return}
    var d={date:$('op-date').value,dept:$('op-dept').value,surgeon:val('op-surgeon'),assist:val('op-assist'),anes:$('op-anes').value,spec:$('op-spec').value,pre:val('op-pre'),post:val('op-post'),name:val('op-name'),special:val('op-special'),process:val('op-process'),fav:$('op-fav').checked,bm:$('op-bm').checked,wdate:$('op-wdate').value||TODAY};
    var s=opSel&&S.surg.filter(function(x){return x.id===opSel})[0];
    if(s){Object.assign(s,d);toast('수술기록을 수정했습니다')}else{s=Object.assign({id:S.nextId++,chart:cur.chart,rdate:TODAY},d);S.surg.push(s);opSel=s.id;toast('수술기록을 작성했습니다')}
    persist();docList();renderOpList();renderOpHead();
  };
  function delOp(btn){
    if(!opSel){toast('삭제할 수술기록을 선택하세요');return}
    if(!opDelArm){opDelArm=true;$('op-del').textContent='한 번 더';toast('한 번 더 누르면 삭제됩니다');return}
    S.surg=S.surg.filter(function(x){return x.id!==opSel});opSel=null;opDelArm=false;$('op-del').textContent='삭 제';persist();loadOp(null);renderOpList();renderOpHead();toast('수술기록을 삭제했습니다');
  }
  $('op-del').onclick=delOp;$('op-trash').onclick=delOp;
  $('opf-go').onclick=renderOpList;
  ['opf-name','opf-chart'].forEach(function(id){$(id).addEventListener('keydown',function(e){if(e.key==='Enter')renderOpList()})});
  $('opf-reset').onclick=function(){['opf-name','opf-chart','opf-from','opf-to'].forEach(function(id){$(id).value=''});$('opf-dept').value='';document.querySelectorAll('input[name=opf-mode],input[name=opf-sort],.opf-sp').forEach(function(x){x.checked=false});renderOpList()};
  document.querySelectorAll('.yr').forEach(function(b){b.onclick=function(){var y=parseInt(b.getAttribute('data-yr'),10),d=new Date(today.getFullYear()-y,today.getMonth(),today.getDate());$('opf-from').value=ymd(d);$('opf-to').value=TODAY;var m=document.querySelector('input[name=opf-mode][value=recv]');m.checked=true;renderOpList()}});

  function renderOpImg(){
    if(mod!=='op')return;
    var tb=$('opi-body');tb.innerHTML='';
    if(!cur){$('opi-empty').hidden=false;$('opi-empty').textContent='환자를 선택하면 영상검사가 표시됩니다.';return}
    var kinds=Array.prototype.slice.call(document.querySelectorAll('.opi-k:checked')).map(function(x){return x.value}),q=val('opi-q').toLowerCase();
    var list=imgsOf().filter(function(i){return (!kinds.length||kinds.indexOf(i.kind)>-1)&&(!q||i.name.toLowerCase().indexOf(q)>-1)});
    $('opi-empty').hidden=list.length>0;$('opi-empty').textContent='조건에 맞는 영상검사가 없습니다. 응급기록 > 영상검사에서 추가할 수 있습니다.';
    list.forEach(function(i){var tr=document.createElement('tr');tr.innerHTML='<td class="num" title="'+esc(i.name)+'">'+esc(i.dt.slice(0,10))+' '+esc(i.kind)+'</td><td style="text-align:center"></td>';
      var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent=i.img?'보기':'없음';b.onclick=function(e){e.stopPropagation();viewImg(i)};tr.lastChild.appendChild(b);tr.onclick=function(){viewImg(i)};tb.appendChild(tr)});
  }
  document.querySelectorAll('.opi-k').forEach(function(c){c.onchange=renderOpImg});$('opi-q').addEventListener('input',renderOpImg);

  function tick(){var n=new Date();$('clock').textContent=n.getFullYear()+'.'+p2(n.getMonth()+1)+'.'+p2(n.getDate())+' '+['일','월','화','수','목','금','토'][n.getDay()]+' '+p2(n.getHours())+':'+p2(n.getMinutes())}
  tick();setInterval(tick,30000);
  fillForm(null);renderHist();renderAll();loadNote();loadOp(null);
})();