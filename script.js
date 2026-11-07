
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
  function afterPatient(){renderErAll();renderOpHead();renderOpImg();renderOpList();xRefresh()}

  /* ---------- 모듈 전환 ---------- */
  var mod='opd';
  function showMod(m){
    mod=m;$('mod-home').hidden=true;['er','opd','op'].concat(XMODS).forEach(function(k){$('mod-'+k).hidden=k!==m});document.querySelectorAll('.qt').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-q')===m))});
    document.querySelectorAll('.nt').forEach(function(b){b.setAttribute('aria-selected',String(b.getAttribute('data-mod')===m))});
    if(m==='er')renderErAll();if(m==='op'){renderOpList();renderOpHead();renderOpImg()}if(XMODS.indexOf(m)>-1)xRender(m);
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
  function setPatient(c){cur=c?pt(c):null;fillForm(cur);if(cur&&cur.rxInfo)rxFill(cur.rxInfo);else rxReset();rxMark();renderHist();afterPatient()}
  function disarm(){delArm=false;$('del-note').textContent='';$('btn-del').textContent='삭제'}
  $('btn-new').onclick=function(){cur=null;curVisit=null;disarm();fillForm(null);rxReset();rxMark();renderHist();renderQueue();loadNote();afterPatient();$('f-name').focus()};
  $('btn-save').onclick=function(){
    var name=$('f-name').value.trim();if(!name){toast('성명을 입력하세요');$('f-name').focus();return}
    if(!$('f-birth').value){toast('생년월일을 입력하세요');$('f-birth').focus();return}
    var data={name:name,birth:$('f-birth').value,sex:$('f-sex').value,tel:$('f-tel').value.trim(),ins:$('f-ins').value,mail:$('f-mail').value.trim(),mailok:$('f-mailok').checked,smsok:$('f-smsok').checked,agree:$('f-agree').checked,addr:$('f-addr').value.trim(),alg:$('f-alg').value.trim(),memo:$('f-memo').value.trim(),blood:$('f-blood').value};
    if(cur){Object.assign(cur,data);toast('환자 정보를 수정했습니다')}
    else{cur=Object.assign({chart:nextChart()},data);S.patients.push(cur);toast('신규 등록: '+cur.chart)}
    if($('r-doc').value.trim()||$('r-memo').value.trim())cur.rxInfo=rxRead();
    persist();fillForm(cur);rxMark();renderQueue();renderSched();afterPatient();
  };
  $('btn-del').onclick=function(){
    if(!cur){toast('삭제할 환자를 선택하세요');return}
    if(!delArm){delArm=true;$('btn-del').textContent='한 번 더 누르면 삭제';$('del-note').textContent=cur.name+' 환자와 접수·예약·기록이 모두 삭제됩니다';return}
    var c=cur.chart,ids=S.visits.filter(function(v){return v.chart===c}).map(function(v){return v.id});
    S.patients=S.patients.filter(function(p){return p.chart!==c});S.visits=S.visits.filter(function(v){return v.chart!==c});S.appts=S.appts.filter(function(a){return a.chart!==c});
    S.er=S.er.filter(function(e){return e.chart!==c});S.surg=S.surg.filter(function(s){return s.chart!==c});S.imaging=S.imaging.filter(function(i){return i.chart!==c});['admissions','nursing','vitals','labs','ltc','docs'].forEach(function(k){S[k]=(S[k]||[]).filter(function(x){return x.chart!==c})});
    ids.forEach(function(i){delete S.notes[i]});
    cur=null;curVisit=null;erCur=null;opSel=null;disarm();persist();fillForm(null);renderAll();renderHist();loadNote();afterPatient();toast('환자를 삭제했습니다');
  };
  $('btn-search').onclick=function(){hitsFor($('q').value,$('hits'),function(p){pickPatient(p.chart)})};
  $('q').addEventListener('keydown',function(e){if(e.key==='Enter')$('btn-search').onclick()});

  /* ---------- 외래: 접수 ---------- */
  fillSel($('r-dept'),DEPTS);$('r-dept').value='내과';$('r-date').value=TODAY;
  function docList(){var s={};(S.staff||[]).forEach(function(x){s[x.name]=1});S.visits.forEach(function(v){if(v.doc)s[v.doc]=1});S.appts.forEach(function(a){if(a.doc)s[a.doc]=1});S.surg.forEach(function(x){if(x.surgeon)s[x.surgeon]=1});S.er.forEach(function(e){(e.rx||[]).forEach(function(r){if(r.by)s[r.by]=1})});$('doc-list').innerHTML=Object.keys(s).map(function(n){return '<option value="'+esc(n)+'">'}).join('')}
  function kindArr(){return Array.prototype.slice.call(document.querySelectorAll('.kind:checked')).map(function(c){return c.value})}
  function kinds(){return kindArr().join(', ')||'일반'}
  function rxRead(){return {dept:$('r-dept').value,doc:$('r-doc').value.trim(),type:$('r-type').value,kinds:kindArr(),memo:$('r-memo').value.trim()}}
  function rxFill(i){if(!i)return;if(i.dept)$('r-dept').value=i.dept;$('r-doc').value=i.doc||'';if(i.type)$('r-type').value=i.type;$('r-memo').value=i.memo||'';
    var ks=i.kinds||['일반'];document.querySelectorAll('.kind').forEach(function(c){c.checked=ks.indexOf(c.value)>-1})}
  function rxMark(){var i=cur&&cur.rxInfo;$('rx-saved').textContent=i?('저장된 접수정보: '+(i.dept||'')+(i.doc?' · '+i.doc:'')):''}
  function lgDef(d){return (typeof LG!=='undefined'&&LG&&LG.dept)||d}
  function rxReset(){$('r-dept').value=lgDef('내과');$('r-doc').value='';$('r-type').value='재진';$('r-memo').value='';document.querySelectorAll('.kind').forEach(function(c){c.checked=c.value==='일반'})}
  if(S.rxDraft){delete S.rxDraft;persist()}
  $('btn-rxsave').onclick=function(){
    if(!cur){toast('먼저 환자를 검색하거나 환자 정보를 저장하세요');return}
    if(!$('r-doc').value.trim()){toast('담당의를 입력하세요');$('r-doc').focus();return}
    cur.rxInfo=rxRead();persist();rxMark();toast(cur.name+' 접수정보를 저장했습니다');
  };
  $('btn-rx').onclick=function(){
    if(!cur){toast('먼저 환자를 검색하거나 저장하세요');return}
    var doc=$('r-doc').value.trim();if(!doc){toast('담당의를 입력하세요');$('r-doc').focus();return}
    var date=$('r-date').value||TODAY,dept=$('r-dept').value;
    if(S.visits.some(function(v){return v.chart===cur.chart&&v.date===date&&v.dept===dept&&v.status!=='수납'})){toast('같은 진료과에 이미 접수되어 있습니다');return}
    cur.rxInfo=rxRead();var n=new Date(),v={id:S.nextVisit++,date:date,time:p2(n.getHours())+':'+p2(n.getMinutes()),chart:cur.chart,dept:dept,doc:doc,type:$('r-type').value,kind:kinds(),memo:$('r-memo').value.trim(),status:'대기'};
    S.visits.push(v);curVisit=v;pickDate=date;var d=new Date(date);calY=d.getFullYear();calM=d.getMonth();$('r-memo').value='';
    persist();rxMark();renderAll();loadNote();toast(cur.name+' 접수 완료');
  };

  $('btn-rx2').onclick=function(){$('btn-rx').onclick()};

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
  function newEp(date,tm){var n=new Date(),labs=[];for(var i=0;i<10;i++)labs.push({});
    return {id:S.nextId++,chart:cur.chart,date:date,time:tm||p2(n.getHours())+':'+p2(n.getMinutes()),arrive:'',dept:'응급의학과',labs:labs,labExtra:'',rx:[],vs:{},proc:'',final:'',finalNote:'',exam:'',gcs:{},hx:{alg:cur.alg||''},pain:[],death:null}}
  function addEpisode(date,silent,tm){
    if(!cur){toast('먼저 환자를 선택하세요');return}
    var e=newEp(date,tm);S.er.push(e);erCur=e;ecPick=date;var dd=new Date(date+'T00:00:00');ecY=dd.getFullYear();ecM=dd.getMonth();persist();renderErAll();if(!silent)toast(cur.name+' 응급 접수 ('+date+' '+e.time+')');
  }
  $('er-find').onclick=function(){hitsFor($('er-q').value,$('er-hits'),function(p){erCur=null;pickPatient(p.chart)})};
  $('er-q').addEventListener('keydown',function(e){if(e.key==='Enter')$('er-find').onclick()});
  $('er-add').onclick=function(){if(!cur){toast('먼저 환자를 검색하세요');return}var n=new Date();$('er-adddate').value=ecPick;$('er-addtime').value=p2(n.getHours())+':'+p2(n.getMinutes());$('er-addrow').hidden=false;$('er-addtime').focus()};
  $('er-addok').onclick=function(){var d=$('er-adddate').value||TODAY;$('er-addrow').hidden=true;addEpisode(d,false,$('er-addtime').value||'')};
  document.querySelectorAll('.st').forEach(function(b){b.onclick=function(){erTab=b.getAttribute('data-er');renderErAll()}});

  function bPath(ep,path){var a=path.split('.'),o=ep;for(var i=0;i<a.length-1;i++){o=o[a[i]]=o[a[i]]||{}}return {o:o,k:a[a.length-1]}}
  var binds=document.querySelectorAll('#mod-er [data-b]');
  binds.forEach(function(el){el.addEventListener('input',function(){if(!erCur)return;var r=bPath(erCur,el.getAttribute('data-b'));r.o[r.k]=el.value;persistSoon();if(el.getAttribute('data-b')==='arrive')renderErList()});el.addEventListener('change',function(){if(!erCur)return;var r=bPath(erCur,el.getAttribute('data-b'));r.o[r.k]=el.value;persistSoon()})});
  $('er-blood').onchange=function(){if(cur){cur.blood=$('er-blood').value;persistSoon();$('f-blood').value=cur.blood}};

  function renderErList(){ecRender();
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

  
  /* 응급 달력 · 날짜별 내원 현황 */
  var ecY=today.getFullYear(),ecM=today.getMonth(),ecPick=TODAY;
  function ecRender(){
    var c=$('ec-cal');if(!c)return;c.innerHTML='';
    ['일','월','화','수','목','금','토'].forEach(function(d){var e=document.createElement('div');e.className='dow';e.textContent=d;c.appendChild(e)});
    $('ec-title').textContent=ecY+' '+p2(ecM+1);
    var start=new Date(ecY,ecM,1-new Date(ecY,ecM,1).getDay()),cnt={};
    S.er.forEach(function(e){cnt[e.date]=(cnt[e.date]||0)+1});
    for(var i=0;i<42;i++){
      var d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),k=ymd(d),e=document.createElement('div');
      e.className='d'+(d.getMonth()!==ecM?' out':'')+(d.getDay()===0?' sun':'')+(k===TODAY?' today':'')+(k===ecPick?' pick':'');
      e.textContent=p2(d.getDate());e.tabIndex=0;if(cnt[k]){var dot=document.createElement('span');dot.className='dot';e.appendChild(dot);e.title='응급 내원 '+cnt[k]+'명'}
      (function(k,d){var go=function(){ecPick=k;ecY=d.getFullYear();ecM=d.getMonth();ecRender()};e.onclick=go;e.onkeydown=function(ev){if(ev.key==='Enter')go()}})(k,d);
      c.appendChild(e);
    }
    var eps=S.er.filter(function(e){return e.date===ecPick&&pt(e.chart)}).sort(function(a,b){return a.time<b.time?-1:a.time>b.time?1:a.id-b.id}),box=$('ec-day');
    $('ec-th').textContent='내원 현황 '+ecPick+' ('+eps.length+'명)';box.innerHTML='';
    eps.forEach(function(e){var p=pt(e.chart),b=document.createElement('button');b.type='button';b.className='ep';b.setAttribute('aria-pressed',String(!!erCur&&erCur.id===e.id));
      b.textContent=e.time+' '+p.name+' ('+p.sex+'/'+age(p.birth)+') '+p.chart+(e.arrive?' · '+e.arrive:'')+(e.final?' · '+e.final:'');
      b.onclick=function(){pickPatient(p.chart);erCur=e;renderErAll()};box.appendChild(b)});
    if(!eps.length)box.innerHTML='<div class="empty">이 날짜의 응급 내원이 없습니다.</div>';
  }
  $('ec-prev').onclick=function(){ecM--;if(ecM<0){ecM=11;ecY--}ecRender()};
  $('ec-next').onclick=function(){ecM++;if(ecM>11){ecM=0;ecY++}ecRender()};
  $('ec-today').onclick=function(){ecPick=TODAY;ecY=today.getFullYear();ecM=today.getMonth();ecRender()};

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
      tr.innerHTML='<td class="num">'+(i+1)+(s.fav?' ★':'')+(s.bm?' ▪':'')+'</td><td>'+esc(p.name)+'</td><td class="num">'+s.chart+'</td><td>'+p.sex+'</td><td>'+age(p.birth)+'</td><td>'+esc(s.surgeon)+'</td><td>'+(s.temp?'[임시] ':'')+esc(s.name)+'</td>';
      var pick=function(){opSel=s.id;opDelArm=false;$('op-del').textContent='삭 제';cur=p;fillForm(p);renderHist();loadOp(s);renderOpList();renderOpHead();renderOpImg()};
      tr.onclick=pick;tr.onkeydown=function(e){if(e.key==='Enter')pick()};tb.appendChild(tr)});
    $('op-empty').hidden=rows.length>0;
  }
  function loadOp(s){
    $('op-date').value=s?s.date:'';$('op-dept').value=s?s.dept:lgDef('외과');$('op-surgeon').value=s?s.surgeon:'';$('op-assist').value=s?s.assist:'';$('op-anes').value=s?s.anes:'';$('op-spec').value=s?s.spec:'';
    $('op-pre').value=s?s.pre:'';$('op-post').value=s?s.post:'';$('op-name').value=s?s.name:'';$('op-special').value=s?s.special:'';$('op-process').value=s?s.process:'';
    $('op-fav').checked=!!(s&&s.fav);$('op-bm').checked=!!(s&&s.bm);$('op-wdate').value=s?s.wdate:TODAY;skLoad(s?(s.sketch||{tpl:'',shapes:[]}):null);opFormLoad(s);
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
    if(!opTemp&&!val('op-name')){toast('수술명을 입력하세요');$('op-name').focus();return}
    if(!opTemp&&!$('op-date').value){toast('수술일을 입력하세요');$('op-date').focus();return}
    var d={date:$('op-date').value||TODAY,dept:$('op-dept').value,surgeon:val('op-surgeon'),assist:val('op-assist'),anes:$('op-anes').value,spec:$('op-spec').value,pre:val('op-pre'),post:val('op-post'),name:val('op-name')||(opTemp?'(임시저장)':''),special:val('op-special'),process:val('op-process'),sketch:skGet(),temp:opTemp,fav:$('op-fav').checked,bm:$('op-bm').checked,wdate:$('op-wdate').value||TODAY};
    Object.assign(d,opFormGet());
    var s=opSel&&S.surg.filter(function(x){return x.id===opSel})[0];
    if(s){Object.assign(s,d);toast(opTemp?'임시저장했습니다':'수술기록을 수정했습니다')}else{s=Object.assign({id:S.nextId++,chart:cur.chart,rdate:TODAY},d);S.surg.push(s);opSel=s.id;toast(opTemp?'임시저장했습니다':'수술기록을 작성했습니다')}
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

  /* ---------- 수술 서식 + 수술 참고 그림 (그림은 벡터로 저장: 되돌리기·지우개·이동 가능) ---------- */
  var SK_W=720,SK_H=440,sk={tpl:'',shapes:[]},skTool='pen',skColor='#111111',skUndo=[],skRedo=[],skDraft=null,skErasing=false,skErased=false,skTxtAt=null,skClrArm=false,skMoving=null,skZoom=1,opTemp=false,sutOk='';
  var skCv=$('sk-cv'),skCtx=skCv.getContext?skCv.getContext('2d'):null;
  function skSnap(){return JSON.stringify({tpl:sk.tpl,shapes:sk.shapes})}
  function skRestore(j){var o=JSON.parse(j);sk.tpl=o.tpl;sk.shapes=o.shapes;$('sk-tpl').value=sk.tpl;skRedraw()}
  function skBtns(){$('sk-undo').disabled=!skUndo.length;$('sk-redo').disabled=!skRedo.length}
  function skPush(){skUndo.push(skSnap());if(skUndo.length>60)skUndo.shift();skRedo=[];skBtns()}
  function skGet(){return JSON.parse(skSnap())}
  function skLoad(x){sk.tpl=x?(x.tpl||''):'uterus';sk.shapes=x&&x.shapes?JSON.parse(JSON.stringify(x.shapes)):[];skUndo=[];skRedo=[];skDraft=null;skMoving=null;skClrArm=false;$('sk-clear').textContent='전체 지우기';$('sk-tpl').value=sk.tpl;skCloseTxt();skBtns();skRedraw()}
  var SK_TPL={
    uterus:function(c){
      c.lineWidth=1.8;c.lineJoin='round';c.strokeStyle='#5f86b8';c.fillStyle='#5f86b8';
      c.beginPath();c.moveTo(360,105);c.bezierCurveTo(425,105,435,200,402,272);c.lineTo(390,332);c.lineTo(330,332);c.lineTo(318,272);c.bezierCurveTo(285,200,295,105,360,105);c.stroke();
      c.beginPath();c.moveTo(335,332);c.lineTo(335,392);c.quadraticCurveTo(360,404,385,392);c.lineTo(385,332);c.stroke();
      c.beginPath();c.moveTo(310,128);c.bezierCurveTo(262,98,214,108,184,160);c.bezierCurveTo(176,176,190,190,204,178);c.stroke();
      c.beginPath();c.moveTo(410,128);c.bezierCurveTo(458,98,506,108,536,160);c.bezierCurveTo(544,176,530,190,516,178);c.stroke();
      c.strokeStyle='#d9534f';
      c.beginPath();c.ellipse(168,214,34,24,-0.25,0,6.2832);c.stroke();
      c.beginPath();c.ellipse(552,214,34,24,0.25,0,6.2832);c.stroke();
      c.strokeStyle='#5f86b8';c.setLineDash([5,4]);c.beginPath();c.moveTo(335,140);c.lineTo(335,332);c.moveTo(385,140);c.lineTo(385,332);c.stroke();c.setLineDash([]);
      c.font='12px "Noto Sans KR",sans-serif';c.textBaseline='middle';c.textAlign='center';c.fillStyle='#7f94ab';
      c.fillText('자궁',360,200);c.fillText('난관',250,96);c.fillText('난관',470,96);c.fillText('난소',168,252);c.fillText('난소',552,252);c.fillText('경부',360,310);c.fillText('질',360,364);
      c.textAlign='start';c.textBaseline='alphabetic';
    },
    abdomen:function(c){
      c.strokeStyle='#8fa6bd';c.fillStyle='#8fa6bd';c.lineWidth=1.6;
      var x=150,y=24,w=420,h=392,r=46;
      c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.stroke();
      c.setLineDash([5,4]);c.beginPath();
      [1,2].forEach(function(i){c.moveTo(x+w*i/3,y);c.lineTo(x+w*i/3,y+h);c.moveTo(x,y+h*i/3);c.lineTo(x+w,y+h*i/3)});c.stroke();c.setLineDash([]);
      c.beginPath();c.arc(x+w/2,y+h/2,7,0,6.2832);c.stroke();
      c.font='12px "Noto Sans KR",sans-serif';c.textAlign='center';c.textBaseline='middle';
      var n=['우상복부','상복부','좌상복부','우측복부','배꼽 주위','좌측복부','우하복부','하복부','좌하복부'];
      n.forEach(function(t,i){var col=i%3,row=Math.floor(i/3);c.fillText(t,x+w*(col+.5)/3,y+h*(row+.5)/3+(i===4?22:0))});
      c.textAlign='start';c.textBaseline='alphabetic';
    },
    grid:function(c){c.strokeStyle='#dfe7f0';c.lineWidth=1;c.beginPath();for(var x=40;x<SK_W;x+=40){c.moveTo(x,0);c.lineTo(x,SK_H)}for(var y=40;y<SK_H;y+=40){c.moveTo(0,y);c.lineTo(SK_W,y)}c.stroke()}
  };
  function skDraw(c,s){
    var p=s.p,i;c.strokeStyle=s.c;c.fillStyle=s.c;c.lineWidth=s.w;c.lineCap='round';c.lineJoin='round';
    if(s.t==='pen'){
      if(p.length<4){c.beginPath();c.arc(p[0],p[1],s.w/2,0,6.2832);c.fill()}
      else{c.beginPath();c.moveTo(p[0],p[1]);for(i=2;i<p.length;i+=2)c.lineTo(p[i],p[i+1]);c.stroke()}
    }else if(s.t==='line'){c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[2],p[3]);c.stroke()}
    else if(s.t==='rect'){c.strokeRect(Math.min(p[0],p[2]),Math.min(p[1],p[3]),Math.abs(p[2]-p[0]),Math.abs(p[3]-p[1]))}
    else if(s.t==='ellipse'){c.beginPath();c.ellipse((p[0]+p[2])/2,(p[1]+p[3])/2,Math.abs(p[2]-p[0])/2,Math.abs(p[3]-p[1])/2,0,0,6.2832);c.stroke()}
    else if(s.t==='mark'){var mr=6+s.w*1.5;c.beginPath();c.moveTo(p[0]-mr,p[1]);c.lineTo(p[0]+mr,p[1]);c.moveTo(p[0],p[1]-mr);c.lineTo(p[0],p[1]+mr);c.stroke()}
    else if(s.t==='star'){var R=9+s.w*2,r2=R*0.42,k;c.beginPath();for(k=0;k<10;k++){var rr=k%2?r2:R,a=-1.5708+k*0.62832,px=p[0]+rr*Math.cos(a),py=p[1]+rr*Math.sin(a);if(k)c.lineTo(px,py);else c.moveTo(px,py)}c.closePath();c.fill()}
    else if(s.t==='text'){c.font='700 '+(11+s.w*2)+'px "Noto Sans KR",sans-serif';c.textBaseline='top';c.fillText(s.s,p[0],p[1]);c.textBaseline='alphabetic'}
  }
  function skRedraw(){
    if(!skCtx)return;var c=skCtx;c.clearRect(0,0,SK_W,SK_H);c.fillStyle='#ffffff';c.fillRect(0,0,SK_W,SK_H);
    if(sk.tpl&&SK_TPL[sk.tpl]){c.save();SK_TPL[sk.tpl](c);c.restore()}
    sk.shapes.forEach(function(s){skDraw(c,s)});if(skDraft)skDraw(c,skDraft);else skThumb();
  }
  function skSeg(px,py,x1,y1,x2,y2){var dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l)):0,cx=x1+t*dx,cy=y1+t*dy;return Math.sqrt((px-cx)*(px-cx)+(py-cy)*(py-cy))}
  function skDist(s,x,y){
    var p=s.p,i,m=1e9;
    if(s.t==='pen'){if(p.length<4)return Math.sqrt((x-p[0])*(x-p[0])+(y-p[1])*(y-p[1]));for(i=0;i+3<p.length;i+=2)m=Math.min(m,skSeg(x,y,p[i],p[i+1],p[i+2],p[i+3]));return m}
    if(s.t==='line')return skSeg(x,y,p[0],p[1],p[2],p[3]);
    if(s.t==='rect'){var a=Math.min(p[0],p[2]),b=Math.min(p[1],p[3]),c2=Math.max(p[0],p[2]),d=Math.max(p[1],p[3]);return Math.min(skSeg(x,y,a,b,c2,b),skSeg(x,y,c2,b,c2,d),skSeg(x,y,c2,d,a,d),skSeg(x,y,a,d,a,b))}
    if(s.t==='ellipse'){var rx=Math.abs(p[2]-p[0])/2||1,ry=Math.abs(p[3]-p[1])/2||1,cx=(p[0]+p[2])/2,cy=(p[1]+p[3])/2,k=Math.sqrt((x-cx)*(x-cx)/(rx*rx)+(y-cy)*(y-cy)/(ry*ry));return Math.abs(k-1)*Math.min(rx,ry)}
    if(s.t==='mark'||s.t==='star'){var rad=s.t==='star'?9+s.w*2:6+s.w*1.5;return Math.max(0,Math.sqrt((x-p[0])*(x-p[0])+(y-p[1])*(y-p[1]))-rad)}
    if(s.t==='text'){var fs=11+s.w*2,w=s.s.length*fs*0.9;if(skCtx){skCtx.font='700 '+fs+'px "Noto Sans KR",sans-serif';w=skCtx.measureText(s.s).width}
      return (x>=p[0]&&x<=p[0]+w&&y>=p[1]&&y<=p[1]+fs*1.2)?0:1e9}
    return m;
  }
  function skHit(p,extra){for(var i=sk.shapes.length-1;i>=0;i--){var s=sk.shapes[i];if(skDist(s,p[0],p[1])<=extra+(s.w||2)/2)return i}return -1}
  function skShift(s,dx,dy){for(var i=0;i+1<s.p.length;i+=2){s.p[i]+=dx;s.p[i+1]+=dy}}
  function skPt(e){var r=skCv.getBoundingClientRect(),sx=r.width?SK_W/r.width:1,sy=r.height?SK_H/r.height:1;return [Math.round((e.clientX-r.left)*sx),Math.round((e.clientY-r.top)*sy)]}
  function skEraseAt(p){var i=skHit(p,8);if(i<0)return;if(!skErased){skPush();skErased=true}sk.shapes.splice(i,1);skRedraw()}
  function skCloseTxt(){var t=$('sk-txt');t.style.display='none';t.value='';skTxtAt=null}
  function skCommitTxt(){var t=$('sk-txt'),v=t.value.trim(),at=skTxtAt;skCloseTxt();if(!v||!at)return;skPush();sk.shapes.push({t:'text',c:skColor,w:parseInt($('sk-w').value,10),p:at,s:v});skRedraw()}
  skCv.addEventListener('pointerdown',function(e){
    if(e.button>0)return;e.preventDefault();var p=skPt(e);
    if(skTool==='text'){if(skTxtAt)skCommitTxt();skTxtAt=p;var t=$('sk-txt'),r=skCv.getBoundingClientRect(),k=r.width?r.width/SK_W:1;t.style.left=Math.min(p[0]*k,Math.max(0,r.width-186))+'px';t.style.top=(p[1]*k)+'px';t.style.display='block';t.value='';setTimeout(function(){t.focus()},0);return}
    if(skTxtAt)skCommitTxt();
    var w=parseInt($('sk-w').value,10);
    if(skTool==='erase'){skErasing=true;skErased=false;skEraseAt(p);return}
    if(skTool==='mark'||skTool==='star'){skPush();sk.shapes.push({t:skTool,c:skColor,w:w,p:[p[0],p[1]]});skRedraw();return}
    if(skTool==='move'){var i=skHit(p,10);if(i>=0){skMoving={i:i,last:p,pushed:false};try{skCv.setPointerCapture(e.pointerId)}catch(x){}}return}
    try{skCv.setPointerCapture(e.pointerId)}catch(x){}
    skDraft={t:skTool,c:skColor,w:w,p:skTool==='pen'?[p[0],p[1]]:[p[0],p[1],p[0],p[1]]};skRedraw();
  });
  skCv.addEventListener('pointermove',function(e){
    var p=skPt(e);
    if(skErasing){skEraseAt(p);return}
    if(skMoving){var dx=p[0]-skMoving.last[0],dy=p[1]-skMoving.last[1];if(!dx&&!dy)return;if(!skMoving.pushed){skPush();skMoving.pushed=true}skShift(sk.shapes[skMoving.i],dx,dy);skMoving.last=p;skRedraw();return}
    if(!skDraft)return;
    if(skDraft.t==='pen'){var n=skDraft.p.length;if(Math.abs(p[0]-skDraft.p[n-2])+Math.abs(p[1]-skDraft.p[n-1])>=2)skDraft.p.push(p[0],p[1])}
    else{skDraft.p[2]=p[0];skDraft.p[3]=p[1]}
    skRedraw();
  });
  function skEnd(){
    if(skErasing){skErasing=false;skErased=false;return}
    if(skMoving){skMoving=null;return}
    if(!skDraft)return;var d=skDraft;skDraft=null;
    if(d.t!=='pen'&&Math.abs(d.p[2]-d.p[0])+Math.abs(d.p[3]-d.p[1])<4){skRedraw();return}
    skPush();sk.shapes.push(d);skRedraw();
  }
  skCv.addEventListener('pointerup',skEnd);skCv.addEventListener('pointercancel',skEnd);skCv.addEventListener('pointerleave',function(){if(skErasing||skMoving)skEnd()});
  $('sk-txt').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();skCommitTxt()}else if(e.key==='Escape'){skCloseTxt()}});
  $('sk-txt').addEventListener('blur',function(){if($('sk-txt').value.trim())skCommitTxt();else skCloseTxt()});
  var SK_CUR={erase:'cell',text:'text',move:'grab'};
  document.querySelectorAll('#sk-tools .tl').forEach(function(b){b.onclick=function(){skTool=b.getAttribute('data-tool');document.querySelectorAll('#sk-tools .tl').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});skCv.style.cursor=SK_CUR[skTool]||'crosshair'}});
  document.querySelectorAll('.sk-sw').forEach(function(b){b.onclick=function(){skColor=b.getAttribute('data-color');document.querySelectorAll('.sk-sw').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))})}});
  $('sk-tpl').onchange=function(){skPush();sk.tpl=$('sk-tpl').value;skRedraw()};
  $('sk-undo').onclick=function(){if(!skUndo.length)return;skRedo.push(skSnap());skRestore(skUndo.pop());skBtns()};
  $('sk-redo').onclick=function(){if(!skRedo.length)return;skUndo.push(skSnap());skRestore(skRedo.pop());skBtns()};
  $('sk-setbtn').onclick=function(){$('sk-set').hidden=!$('sk-set').hidden};
  $('sk-zoom-btn').onclick=function(){skZoom=skZoom>=2?1:skZoom+0.5;skCv.style.width=(skZoom*100)+'%';$('sk-zoom').textContent=Math.round(skZoom*100)+'%'};
  $('sk-clear').onclick=function(){
    if(!sk.shapes.length){toast('지울 그림이 없습니다');return}
    if(!skClrArm){skClrArm=true;$('sk-clear').textContent='한 번 더 누르면 삭제';return}
    skPush();sk.shapes=[];skClrArm=false;$('sk-clear').textContent='전체 지우기';skRedraw();toast('그림을 모두 지웠습니다 (되돌리기 가능)');
  };
  /* 서식 입력칸 */
  var OPF=[['organ','op-organ1'],['organ2','op-organ2'],['clamp','op-clamp'],['apply','op-apply'],['anesT','op-anes-t'],['cold1','op-cold1'],['bloodT','op-blood-t'],['cold2','op-cold2'],['loss','op-loss'],['sutMemo','op-sut-memo'],['resident','op-resident']];
  var SUT=['op-sut-n','op-sut-p','op-sut-l'];
  function opFormGet(){var o={};OPF.forEach(function(f){o[f[0]]=$(f[1]).value.trim()});o.suture=$('op-sut-n').checked?'normal':$('op-sut-p').checked?'plenty':$('op-sut-l').checked?'less':'';o.sutOk=sutOk;return o}
  function fmHead(){fmSum();var n=val('op-name');$('fm-name').textContent=n||'수술명 미입력';$('fm-name').className=n?'':'empty';$('fm-surgeon').textContent=val('op-surgeon')||'-';$('fm-resident').textContent=val('op-resident')||'-'}
  function opFormLoad(s){
    OPF.forEach(function(f){$(f[1]).value=s&&s[f[0]]||''});
    var sv=s?(s.suture||''):'normal';$('op-sut-n').checked=sv==='normal';$('op-sut-p').checked=sv==='plenty';$('op-sut-l').checked=sv==='less';
    sutOk=s&&s.sutOk||'';$('sut-ok-t').textContent=sutOk?'확인 '+sutOk.slice(11):'';fmHead();
  }
  ['op-name','op-surgeon','op-resident'].forEach(function(id){$(id).addEventListener('input',fmHead)});
  SUT.forEach(function(id){$(id).onchange=function(){if($(id).checked)SUT.forEach(function(o){if(o!==id)$(o).checked=false})}});
  $('op-sut-ok').onclick=function(){sutOk=nowStr();$('sut-ok-t').textContent='확인 '+sutOk.slice(11);toast('확인 시각을 기록했습니다 (작성을 눌러 저장)')};
  document.querySelectorAll('[data-fm]').forEach(function(b){b.onclick=function(){
    var a=b.getAttribute('data-fm');
    if(a==='form'){$('fm-fields').hidden=!$('fm-fields').hidden}
    else if(a==='memo'){$('fm-fields').hidden=false;$('op-sut-memo').focus()}
    else if(a==='draw'){skOpen()}
    else if(a==='temp'){opTemp=true;try{$('op-save').onclick()}finally{opTemp=false}}
    else if(a==='del'){delOp()}
  }});
  skRedraw();

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

  /* =================== 수술 그림 팝업 =================== */
  function skThumb(){
    var t=$('sk-thumb');if(!t||!t.getContext)return;var c=t.getContext('2d');if(!c)return;
    c.clearRect(0,0,t.width,t.height);c.drawImage(skCv,0,0,t.width,t.height);
    $('sk-thumb-note').textContent=sk.shapes.length?('그림 '+sk.shapes.length+'개 · 눌러서 편집'):'그림 없음 · 눌러서 그리기';
  }
  function skOpen(){showDlg('dlg-sk');skRedraw()}
  $('sk-open').onclick=skOpen;$('sk-thumb').onclick=skOpen;
  $('sk-save').onclick=function(){$('op-save').click()};
  skThumb();

  /* =================== 상단 메뉴 · 바로가기 화면 · 입원/검사/V-S/청구 =================== */
  var FEE_KEYS=['초진','재진','예약','응급','검사','약물','처치','진료','협진','퇴원','기타','X-Ray','CT','MRI','초음파','영상기타','수술','입원일'];
  var DEF_FEES={'초진':17000,'재진':12000,'예약':12000,'응급':30000,'검사':15000,'약물':5000,'처치':10000,'진료':0,'협진':20000,'퇴원':0,'기타':0,'X-Ray':20000,'CT':150000,'MRI':400000,'초음파':50000,'영상기타':30000,'수술':500000,'입원일':80000};
  var DEF_RATES={'건강보험':30,'의료급여':15,'산재':0,'자동차보험':0,'일반':100};
  var XMODS=['bill','adm','inp','lab','vit','tpr','doc'];
  var ST={bill:{from:TODAY.slice(0,8)+'01',to:TODAY,type:'',status:'',q:''},adm:{state:'현재입원',ward:'',q:'',sel:null},inp:{ward:'',q:'',sel:null},lab:{grp:'',item:'',sel:null},vit:{series:'bt'},tpr:{start:ymd(new Date(today.getFullYear(),today.getMonth(),today.getDate()-6))}};
  var menuOpen=false,BILL_ST=['미청구','청구','수납완료'];
  function normS(){
    ['patients','visits','appts','er','surg','imaging','admissions','nursing','vitals','labs','ltc','staff','wards','docs','users'].forEach(function(k){if(!Array.isArray(S[k]))S[k]=[]});
    if(!S.notes||typeof S.notes!=='object')S.notes={};if(!S.claims||typeof S.claims!=='object')S.claims={};
    if(!S.settings||typeof S.settings!=='object')S.settings={};
    if(!S.settings.fees)S.settings.fees={};if(!S.settings.rates)S.settings.rates={};if(!S.settings.hospital)S.settings.hospital={name:'',tel:'',addr:''};
    FEE_KEYS.forEach(function(k){if(typeof S.settings.fees[k]!=='number')S.settings.fees[k]=DEF_FEES[k]});
    Object.keys(DEF_RATES).forEach(function(k){if(typeof S.settings.rates[k]!=='number')S.settings.rates[k]=DEF_RATES[k]});
    if(typeof S.memo!=='string')S.memo='';
    if(!S.nextVisit)S.nextVisit=1;if(!S.nextId)S.nextId=1;
  }
  normS();

  /* ---------- 공통 도우미 ---------- */
  function fmt(n){return (Math.round(n)||0).toLocaleString('ko-KR')}
  function opt(list,sel){return list.map(function(a){var v=Array.isArray(a)?a[0]:a,t=Array.isArray(a)?a[1]:a;return '<option value="'+esc(v)+'"'+(String(v)===String(sel)?' selected':'')+'>'+esc(t)+'</option>'}).join('')}
  function daysBetween(a,b){return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000)}
  function addDays(d,n){var x=new Date(d+'T00:00:00');return ymd(new Date(x.getFullYear(),x.getMonth(),x.getDate()+n))}
  function inpOf(chart){return S.admissions.filter(function(a){return a.chart===chart&&a.status==='입원'})[0]}
  function curInps(){return S.admissions.filter(function(a){return a.status==='입원'&&pt(a.chart)})}
  function stay(a){var end=a.status==='퇴원'&&a.dDate?a.dDate:TODAY;return Math.max(1,daysBetween(a.date,end))}
  function lastVit(chart){return S.vitals.filter(function(v){return v.chart===chart}).sort(function(a,b){return a.dt<b.dt?1:-1})[0]}
  function ptLine(){var a=cur&&inpOf(cur.chart);return cur?'<b>'+esc(cur.name)+'</b> · '+cur.chart+' · '+cur.sex+'/'+age(cur.birth)+(a?' · 입원 '+esc(a.ward+' '+a.bed):''):'<span class="muted">환자를 선택하세요</span>'}
  function numOrNull(id){var v=$(id).value.trim();if(v==='')return null;var n=parseFloat(v);return isNaN(n)?NaN:n}
  function xwin(title,html,after,cls){
    $('win-title').textContent=title;$('win-body').innerHTML=html;$('dlg-win').className='dlg '+(cls||'xwide blue');showDlg('dlg-win');
    Array.prototype.forEach.call($('win-body').querySelectorAll('.xc'),function(b){b.onclick=xclose});
    if(after)after($('win-body'));
  }
  function xclose(){hideDlg('dlg-win')}
  function pickPt(cb,title){
    xwin(title||'환자 선택','<input id="pk-q" type="search" placeholder="성명 또는 차트번호 검색" autocomplete="off" aria-label="환자 검색"><div class="tbl-wrap" style="max-height:340px;margin-top:6px"><table style="min-width:0"><thead><tr><th>차트번호</th><th>성명</th><th>성/나이</th><th>보험</th><th>입원</th></tr></thead><tbody id="pk-body"></tbody></table></div><div class="empty" id="pk-empty" hidden></div>',function(){
      function draw(){
        var q=$('pk-q').value.trim(),r=S.patients.filter(function(p){return !q||p.name.indexOf(q)>-1||p.chart.indexOf(q)>-1}).slice(0,60),tb=$('pk-body');tb.innerHTML='';
        r.forEach(function(p){var a=inpOf(p.chart),tr=document.createElement('tr');tr.tabIndex=0;
          tr.innerHTML='<td class="num">'+p.chart+'</td><td>'+esc(p.name)+'</td><td>'+p.sex+'/'+age(p.birth)+'</td><td>'+esc(p.ins)+'</td><td>'+(a?esc(a.ward+' '+a.bed):'')+'</td>';
          var go=function(){xclose();cb(p)};tr.onclick=go;tr.onkeydown=function(e){if(e.key==='Enter')go()};tb.appendChild(tr)});
        $('pk-empty').hidden=r.length>0;$('pk-empty').textContent=S.patients.length?'검색 결과가 없습니다.':'등록된 환자가 없습니다. 상단의 + 환자등록으로 먼저 등록하세요.';
      }
      $('pk-q').addEventListener('input',draw);draw();$('pk-q').focus();
    },'wide blue');
  }
  function needPt(cb){if(cur){cb(cur)}else pickPt(function(p){pickPatient(p.chart);cb(p)})}
  function pickAdm(cb){
    var list=curInps();if(!list.length){toast('현재 입원 중인 환자가 없습니다');return}
    xwin('입원환자 선택','<div class="tbl-wrap" style="max-height:340px"><table style="min-width:0"><thead><tr><th>병동</th><th>병상</th><th>성명</th><th>차트번호</th><th>입원일</th></tr></thead><tbody id="pa-body"></tbody></table></div>',function(){
      list.forEach(function(a){var p=pt(a.chart),tr=document.createElement('tr');tr.tabIndex=0;tr.innerHTML='<td>'+esc(a.ward)+'</td><td>'+esc(a.bed)+'</td><td>'+esc(p.name)+'</td><td class="num">'+a.chart+'</td><td class="num">'+a.date+'</td>';
        var go=function(){xclose();cb(a)};tr.onclick=go;tr.onkeydown=function(e){if(e.key==='Enter')go()};$('pa-body').appendChild(tr)});
    },'wide blue');
  }
  function dlFile(name,text,mime){
    try{var b=new Blob([text],{type:mime||'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);return true}catch(e){return false}
  }
  function copyText(text,ta){
    function fb(){if(ta){ta.focus();ta.select()}toast('복사하지 못했습니다. 선택된 글자를 직접 복사하세요')}
    try{navigator.clipboard.writeText(text).then(function(){toast('복사했습니다')},fb)}catch(e){fb()}
  }
  function csvText(head,rows){return '﻿'+[head].concat(rows).map(function(r){return r.map(function(c){c=String(c==null?'':c);return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(',')}).join('\r\n')}
  function showCsv(name,text){
    xwin(name+' 내보내기','<textarea id="csv-t" readonly style="min-height:220px;font-family:var(--mono)"></textarea><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn" id="csv-copy" type="button">복사</button><button class="btn blue" id="csv-dl" type="button">CSV 파일로 저장</button></div>',function(){
      $('csv-t').value=text.replace(/^﻿/,'');
      $('csv-copy').onclick=function(){copyText(text.replace(/^﻿/,''),$('csv-t'))};
      $('csv-dl').onclick=function(){toast(dlFile(name+'.csv',text,'text/csv;charset=utf-8')?'저장을 요청했습니다. 저장되지 않으면 복사를 사용하세요':'저장하지 못했습니다. 복사를 사용하세요')};
    },'wide blue');
  }
  function lineSvg(series,labels,o){
    o=o||{};var W=o.w||680,H=o.h||210,L=46,R=14,T=14,B=30,n=labels.length,all=[];
    series.forEach(function(s){s.vals.forEach(function(v){if(v!=null)all.push(v)})});
    if(!all.length)return '<div class="empty">그래프로 그릴 값이 없습니다.</div>';
    var lo=Math.min.apply(null,all),hi=Math.max.apply(null,all);
    if(o.band){lo=Math.min(lo,o.band[0]);hi=Math.max(hi,o.band[1])}
    if(hi===lo){hi+=1;lo-=1}var pad=(hi-lo)*.12;lo-=pad;hi+=pad;
    function X(i){return n>1?L+(W-L-R)*i/(n-1):L+(W-L-R)/2}
    function Y(v){return T+(H-T-B)*(1-(v-lo)/(hi-lo))}
    var s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="'+esc(o.label||'추이 그래프')+'" style="min-width:420px;max-height:300px">';
    if(o.band)s+='<rect x="'+L+'" y="'+Y(o.band[1])+'" width="'+(W-L-R)+'" height="'+Math.max(0,Y(o.band[0])-Y(o.band[1]))+'" fill="#d8f0de" opacity=".7"/>';
    for(var k=0;k<=4;k++){var v=lo+(hi-lo)*k/4,y=Y(v);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="#d3dce7"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="#5a6b7e">'+(Math.round(v*10)/10)+'</text>'}
    var step=Math.max(1,Math.ceil(n/8));
    labels.forEach(function(l,i){if(i%step===0||i===n-1)s+='<text x="'+X(i)+'" y="'+(H-10)+'" text-anchor="middle" font-size="9" fill="#5a6b7e">'+esc(l)+'</text>'});
    series.forEach(function(se){
      var seg=[],pts='';
      se.vals.forEach(function(v,i){if(v==null){if(seg.length>1)pts+='<polyline fill="none" stroke="'+se.color+'" stroke-width="2" points="'+seg.join(' ')+'"/>';seg=[];return}seg.push(X(i)+','+Y(v))});
      if(seg.length>1)pts+='<polyline fill="none" stroke="'+se.color+'" stroke-width="2" points="'+seg.join(' ')+'"/>';
      s+=pts;se.vals.forEach(function(v,i){if(v!=null)s+='<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.5" fill="'+se.color+'"><title>'+esc(se.name+' '+v+' · '+labels[i])+'</title></circle>'});
    });
    return s+'</svg>';
  }
  function xsave(){persist();xRefresh()}

  /* ---------- 메뉴바 / 바로가기 탭 ---------- */
  var MENUS=[
    ['환경설정',[['병원 정보','set-hosp'],['수가·본인부담 설정','set-fee'],['화면 배율','set-zoom'],['비밀번호 변경','pw'],['-'],['데이터 백업 (내보내기)','backup'],['데이터 복원 (가져오기)','restore'],['-'],['전체 데이터 초기화','reset'],['-'],['로그아웃','logout']]],
    ['자료등록/관리',[['환자 등록','pt-new'],['환자 목록 관리','pt-list'],['-'],['의료진 관리','staff'],['병동·병상 관리','ward']]],
    ['진료/간호기록',[['외래기록','go-opd'],['응급기록','go-er'],['수술기록','go-op'],['-'],['간호기록','nursing'],['경과기록','progress'],['-'],['문서작성','go-doc']]],
    ['입원/퇴원기록',[['입원 등록','adm-new'],['퇴원 처리','adm-dis'],['병상 이동 (전실)','adm-move'],['-'],['입퇴원 이력','adm-hist']]],
    ['장기요양평가',[['일상생활동작 (Barthel)','ltc-B'],['욕창 위험도 (Braden)','ltc-R'],['낙상 위험도 (Morse)','ltc-M'],['-'],['평가 이력','ltc-H']]],
    ['자료조회',[['환자 종합조회','q-pt'],['외래 접수 조회','q-visit'],['진료 통계','q-stat'],['-'],['입퇴원 조회','go-adm'],['검사결과 조회','go-lab'],['청구자료 조회','go-bill']]],
    ['유틸리티',[['BMI·BSA 계산기','u-bmi'],['체중별 약물 용량 계산','u-dose'],['날짜·재원일수 계산','u-days'],['-'],['메모장','u-memo']]],
    ['도움말',[['사용 안내 (F1)','h-guide'],['단축키','h-key'],['프로그램 정보','h-about']]]
  ];
  var QT=[['청구자료','bill'],['입퇴원관리','adm'],['입원환자','inp'],['검사결과','lab'],['V I T A L','vit'],['T.P.R.','tpr'],['문서작성','doc'],['응급기록','er'],['외래기록','opd'],['수술기록','op']];
  function closeMenus(){document.querySelectorAll('.mn-dd').forEach(function(d){d.hidden=true});document.querySelectorAll('.mn-b').forEach(function(b){b.setAttribute('aria-expanded','false')});menuOpen=false}
  function openMenu(b,dd){closeMenus();dd.hidden=false;b.setAttribute('aria-expanded','true');menuOpen=true}
  function buildMenus(){
    var bar=$('menubar');bar.innerHTML='';
    MENUS.forEach(function(m){
      var wrap=document.createElement('div');wrap.className='mn';
      var b=document.createElement('button');b.type='button';b.className='mn-b';b.textContent=m[0];b.setAttribute('aria-haspopup','true');b.setAttribute('aria-expanded','false');
      var dd=document.createElement('div');dd.className='mn-dd';dd.setAttribute('role','menu');dd.hidden=true;
      m[1].forEach(function(it){
        if(it[0]==='-'){var sp=document.createElement('div');sp.className='mn-sep';dd.appendChild(sp);return}
        var i=document.createElement('button');i.type='button';i.className='mn-i';i.setAttribute('role','menuitem');i.setAttribute('data-cmd',it[1]);i.textContent=it[0];
        i.onclick=function(e){e.stopPropagation();closeMenus();cmd(it[1])};dd.appendChild(i);
      });
      b.onclick=function(e){e.stopPropagation();if(dd.hidden)openMenu(b,dd);else closeMenus()};
      b.onmouseenter=function(){if(menuOpen&&dd.hidden)openMenu(b,dd)};
      wrap.appendChild(b);wrap.appendChild(dd);bar.appendChild(wrap);
    });
    var q=$('qtabs');q.innerHTML='';
    QT.forEach(function(t){var b=document.createElement('button');b.type='button';b.className='qt';b.setAttribute('role','tab');b.setAttribute('data-q',t[1]);b.setAttribute('aria-selected','false');b.textContent=t[0];b.onclick=function(){showMod(t[1])};q.appendChild(b)});
    var rg=document.createElement('button');rg.type='button';rg.className='qt qt-reg';rg.textContent='+ 환자등록';rg.onclick=function(){$('btn-reg').click()};q.appendChild(rg);
  }
  document.addEventListener('click',closeMenus);
  document.addEventListener('keydown',function(e){
    if(document.body.classList.contains('locked'))return;
    if(e.key==='Escape')closeMenus();
    else if(e.key==='F1'){e.preventDefault();hGuide()}
    else if(e.key==='F2'){e.preventDefault();pickPt(function(p){pickPatient(p.chart)})}
  });

  function xRender(m){({bill:xBill,adm:xAdm,inp:xInp,lab:xLabMod,vit:xVit,tpr:xTpr,doc:xDocMod})[m]()}
  function xRefresh(){if(XMODS&&XMODS.indexOf(mod)>-1)xRender(mod)}

  function cmd(c){
    var go=function(m){return function(){showMod(m)}};
    var map={
      'set-hosp':xSetHosp,'set-fee':xSetFee,'set-zoom':xSetZoom,'backup':xBackup,'restore':xRestore,'reset':xReset,
      'pt-new':function(){$('btn-reg').click()},'pt-list':xPtList,'staff':xStaff,'ward':xWard,
      'go-opd':go('opd'),'go-doc':go('doc'),'pw':lgPw,'logout':lgLogout,'go-er':go('er'),'go-op':go('op'),'nursing':function(){xNursing('간호')},'progress':function(){xNursing('경과')},
      'adm-new':function(){admNew()},'adm-dis':function(){admDis()},'adm-move':function(){admMove()},'adm-hist':function(){ST.adm.state='전체';showMod('adm')},
      'ltc-B':function(){xLtc('B')},'ltc-R':function(){xLtc('R')},'ltc-M':function(){xLtc('M')},'ltc-H':function(){xLtc('H')},
      'q-pt':xQPatient,'q-visit':xQVisit,'q-stat':xQStat,'go-adm':go('adm'),'go-lab':go('lab'),'go-bill':go('bill'),
      'u-bmi':xBmi,'u-dose':xDose,'u-days':xDays,'u-memo':xMemo,'h-guide':hGuide,'h-key':hKey,'h-about':hAbout
    };
    if(map[c])map[c]();
  }

  /* ---------- 환경설정 ---------- */
  function applyBrand(){var h=S.settings.hospital;$('brand-hosp').textContent=h&&h.name?' · '+h.name:''}
  function applyZoom(){var z=S.settings.zoom||100;document.documentElement.style.zoom=z===100?'':(z/100)}
  function xSetHosp(){
    var h=S.settings.hospital;
    xwin('병원 정보','<div class="xf"><label>병원명<input id="sh-n" value="'+esc(h.name)+'" autocomplete="off"></label><label>전화번호<input id="sh-t" value="'+esc(h.tel)+'" inputmode="tel"></label><label style="grid-column:1/-1">주소<input id="sh-a" value="'+esc(h.addr)+'"></label></div><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn blue" id="sh-ok" type="button">저장</button></div>',function(){
      $('sh-ok').onclick=function(){S.settings.hospital={name:$('sh-n').value.trim(),tel:$('sh-t').value.trim(),addr:$('sh-a').value.trim()};persist();applyBrand();xclose();toast('병원 정보를 저장했습니다')};
    },'wide blue');
  }
  function xSetFee(){
    var F=S.settings.fees,R=S.settings.rates;
    xwin('수가·본인부담 설정','<p class="muted" style="margin:0">청구자료의 간이 정산에 쓰는 값입니다. 처음 들어 있는 금액은 예시이므로 병원 기준에 맞게 바꾸세요.</p><div class="two-col"><div><h4 class="x-h">항목별 금액 (원)</h4><table style="min-width:0"><tbody>'+FEE_KEYS.map(function(k){return '<tr><td>'+(k==='영상기타'?'영상(기타)':k==='입원일'?'입원료(1일)':esc(k))+'</td><td><input data-fee="'+esc(k)+'" inputmode="numeric" value="'+F[k]+'" style="text-align:right"></td></tr>'}).join('')+'</tbody></table></div><div><h4 class="x-h">보험별 본인부담률 (%)</h4><table style="min-width:0"><tbody>'+Object.keys(DEF_RATES).map(function(k){return '<tr><td>'+esc(k)+'</td><td><input data-rate="'+esc(k)+'" inputmode="decimal" value="'+R[k]+'" style="text-align:right"></td></tr>'}).join('')+'</tbody></table></div></div><div class="acts"><button class="btn" id="sf-def" type="button">기본값으로</button><button class="btn xc" type="button">닫기</button><button class="btn blue" id="sf-ok" type="button">저장</button></div>',function(b){
      $('sf-def').onclick=function(){FEE_KEYS.forEach(function(k){b.querySelector('[data-fee="'+k+'"]').value=DEF_FEES[k]});Object.keys(DEF_RATES).forEach(function(k){b.querySelector('[data-rate="'+k+'"]').value=DEF_RATES[k]})};
      $('sf-ok').onclick=function(){
        var nf={},nr={},bad=false;
        b.querySelectorAll('[data-fee]').forEach(function(i){var v=parseFloat(i.value);if(isNaN(v)||v<0)bad=true;nf[i.getAttribute('data-fee')]=v});
        b.querySelectorAll('[data-rate]').forEach(function(i){var v=parseFloat(i.value);if(isNaN(v)||v<0||v>100)bad=true;nr[i.getAttribute('data-rate')]=v});
        if(bad){toast('금액은 0 이상, 본인부담률은 0~100 사이 숫자로 입력하세요');return}
        S.settings.fees=nf;S.settings.rates=nr;persist();xclose();xRefresh();toast('수가와 본인부담률을 저장했습니다');
      };
    },'xwide blue');
  }
  function xSetZoom(){
    var z=S.settings.zoom||100;
    xwin('화면 배율','<div class="xf">'+[90,100,115,130].map(function(v){return '<label class="ck"><input type="radio" name="zm" value="'+v+'"'+(v===z?' checked':'')+'>'+v+'%</label>'}).join('')+'</div><div class="acts"><button class="btn xc" type="button">닫기</button></div>',function(b){
      b.querySelectorAll('[name=zm]').forEach(function(r){r.onchange=function(){S.settings.zoom=parseInt(r.value,10);applyZoom();persist()}});
    },'wide blue');
  }
  function xBackup(){
    var bk={};Object.keys(S).forEach(function(k){if(k!=='users')bk[k]=S[k]});var txt=JSON.stringify(bk);
    xwin('데이터 백업','<p class="muted" style="margin:0">모든 환자·기록·설정이 들어 있는 JSON입니다. 파일로 저장하거나 복사해서 보관하세요. 환자 정보가 들어 있으니 안전한 곳에만 두세요.</p><textarea id="bk-t" readonly style="min-height:180px;font-family:var(--mono)"></textarea><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn" id="bk-copy" type="button">복사</button><button class="btn blue" id="bk-dl" type="button">파일로 저장</button></div>',function(){
      $('bk-t').value=txt.length>300000?'(데이터가 커서 미리보기를 생략했습니다. 파일로 저장을 사용하세요)':txt;
      $('bk-copy').onclick=function(){copyText(txt,$('bk-t'))};
      $('bk-dl').onclick=function(){toast(dlFile('MediChart-backup-'+TODAY+'.json',txt,'application/json')?'저장을 요청했습니다. 저장되지 않으면 복사를 사용하세요':'저장하지 못했습니다. 복사를 사용하세요')};
    },'wide blue');
  }
  function applyState(o){
    S=o;normS();cur=null;curVisit=null;erCur=null;opSel=null;
    fillForm(null);rxReset();rxMark();loadNote();loadOp(null);renderAll();renderHist();applyBrand();applyZoom();docList();dcNewDoc();afterPatient();persist();
  }
  function xRestore(){
    var armed=false;
    xwin('데이터 복원','<p class="muted" style="margin:0">백업 JSON을 붙여넣거나 파일을 고르세요. 현재 데이터는 모두 교체됩니다.</p><input id="rs-f" type="file" accept=".json,application/json"><textarea id="rs-t" style="min-height:150px;font-family:var(--mono)" placeholder="여기에 백업 JSON을 붙여넣기"></textarea><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn red" id="rs-ok" type="button">복원</button></div>',function(){
      $('rs-f').onchange=function(){var f=$('rs-f').files[0];if(!f)return;var r=new FileReader();r.onload=function(){$('rs-t').value=r.result};r.readAsText(f)};
      $('rs-ok').onclick=function(){
        var o;try{o=JSON.parse($('rs-t').value)}catch(e){toast('JSON 형식이 올바르지 않습니다');return}
        if(!o||!Array.isArray(o.patients)){toast('MediChart 백업 파일이 아닙니다');return}
        if(!armed){armed=true;$('rs-ok').textContent='한 번 더 누르면 교체';return}
        o.users=S.users;applyState(o);xclose();toast('데이터를 복원했습니다 (환자 '+o.patients.length+'명)');
      };
    },'wide blue');
  }
  function xReset(){
    xwin('전체 데이터 초기화','<p style="margin:0;color:var(--red);font-weight:700">환자, 접수, 기록, 입원, 설정이 모두 삭제되며 되돌릴 수 없습니다.</p><p class="muted" style="margin:0">계속하려면 아래 칸에 <b>초기화</b>라고 입력하세요. 필요하면 먼저 백업하세요.</p><input id="rt-c" autocomplete="off"><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn red" id="rt-ok" type="button" disabled>모두 삭제</button></div>',function(){
      $('rt-c').oninput=function(){$('rt-ok').disabled=$('rt-c').value.trim()!=='초기화'};
      $('rt-ok').onclick=function(){applyState({patients:[],users:S.users});xclose();toast('모든 데이터를 삭제했습니다')};
    },'wide blue');
  }

  /* ---------- 자료등록/관리 ---------- */
  function deletePatient(c){
    var ids=S.visits.filter(function(v){return v.chart===c}).map(function(v){return v.id});
    S.patients=S.patients.filter(function(p){return p.chart!==c});
    ['visits','appts','er','surg','imaging','admissions','nursing','vitals','labs','ltc','docs'].forEach(function(k){S[k]=S[k].filter(function(x){return x.chart!==c})});
    ids.forEach(function(i){delete S.notes[i]});
    if(cur&&cur.chart===c){cur=null;curVisit=null;erCur=null;opSel=null;fillForm(null);rxReset();rxMark();loadNote();loadOp(null)}
    persist();renderAll();renderHist();afterPatient();
  }
  function xPtList(){
    xwin('환자 목록 관리','<input id="pl-q" type="search" placeholder="성명 또는 차트번호 검색" autocomplete="off" aria-label="환자 검색"><div class="tbl-wrap" style="max-height:360px;margin-top:6px"><table style="min-width:640px"><thead><tr><th>차트번호</th><th>성명</th><th>성별</th><th>나이</th><th>생년월일</th><th>연락처</th><th>보험</th><th>혈액형</th><th></th></tr></thead><tbody id="pl-body"></tbody></table></div><div class="empty" id="pl-empty" hidden>등록된 환자가 없습니다.</div>',function(){
      function draw(){
        var q=$('pl-q').value.trim(),tb=$('pl-body');tb.innerHTML='';
        var r=S.patients.filter(function(p){return !q||p.name.indexOf(q)>-1||p.chart.indexOf(q)>-1});
        r.forEach(function(p){var tr=document.createElement('tr');
          tr.innerHTML='<td class="num">'+p.chart+'</td><td>'+esc(p.name)+'</td><td>'+p.sex+'</td><td>'+age(p.birth)+'</td><td class="num">'+esc(p.birth)+'</td><td>'+esc(p.tel)+'</td><td>'+esc(p.ins)+'</td><td>'+esc(p.blood||'')+'</td><td></td>';
          var open=document.createElement('button');open.type='button';open.className='btn sm';open.textContent='열기';open.onclick=function(){xclose();pickPatient(p.chart);showMod('opd')};
          var del=document.createElement('button');del.type='button';del.className='btn sm';del.style.marginLeft='4px';del.textContent='삭제';
          var armed=false;del.onclick=function(){if(!armed){armed=true;del.textContent='한 번 더';return}deletePatient(p.chart);draw();toast(p.name+' 환자를 삭제했습니다')};
          tr.lastChild.appendChild(open);tr.lastChild.appendChild(del);tb.appendChild(tr)});
        $('pl-empty').hidden=r.length>0;
      }
      $('pl-q').addEventListener('input',draw);draw();
    },'xwide blue');
  }
  function xStaff(){
    xwin('의료진 관리','<div class="xf"><label>이름<input id="sf-n" autocomplete="off"></label><label>직책<select id="sf-r">'+opt(['의사','전공의','간호사','기타'],'의사')+'</select></label><label>진료과<select id="sf-d"><option value="">-</option>'+opt(DEPTS,'')+'</select></label></div><div class="acts"><button class="btn blue" id="sf-add" type="button">추가</button></div><table style="min-width:0"><thead><tr><th>이름</th><th>직책</th><th>진료과</th><th></th></tr></thead><tbody id="sf-body"></tbody></table><div class="empty" id="sf-empty" hidden>등록된 의료진이 없습니다. 추가하면 담당의·집도의·처방자 입력칸에서 자동완성됩니다.</div>',function(){
      function draw(){
        var tb=$('sf-body');tb.innerHTML='';
        S.staff.forEach(function(s,i){var tr=document.createElement('tr');tr.innerHTML='<td>'+esc(s.name)+'</td><td>'+esc(s.role)+'</td><td>'+esc(s.dept||'')+'</td><td></td>';
          var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent='삭제';b.onclick=function(){S.staff.splice(i,1);persist();docList();draw()};tr.lastChild.appendChild(b);tb.appendChild(tr)});
        $('sf-empty').hidden=S.staff.length>0;
      }
      $('sf-add').onclick=function(){var n=$('sf-n').value.trim();if(!n){toast('이름을 입력하세요');$('sf-n').focus();return}
        if(S.staff.some(function(s){return s.name===n})){toast('이미 등록된 이름입니다');return}
        S.staff.push({name:n,role:$('sf-r').value,dept:$('sf-d').value});persist();docList();$('sf-n').value='';draw();toast('의료진을 추가했습니다')};
      draw();
    },'wide blue');
  }
  function xWard(){
    xwin('병동·병상 관리','<div class="xf"><label>병동 이름<input id="wd-n" autocomplete="off" placeholder="예: 3병동"></label><label>병상 수<input id="wd-b" inputmode="numeric" value="10"></label></div><div class="acts"><button class="btn blue" id="wd-add" type="button">추가·수정</button></div><table style="min-width:0"><thead><tr><th>병동</th><th>병상 수</th><th>사용 중</th><th></th></tr></thead><tbody id="wd-body"></tbody></table><div class="empty" id="wd-empty" hidden>등록된 병동이 없습니다. 병동을 등록하지 않아도 입원 등록에서 병동 이름을 직접 입력할 수 있습니다.</div>',function(){
      function draw(){
        var tb=$('wd-body');tb.innerHTML='';
        S.wards.forEach(function(w,i){var used=curInps().filter(function(a){return a.ward===w.name}).length,tr=document.createElement('tr');tr.innerHTML='<td>'+esc(w.name)+'</td><td class="num">'+w.beds+'</td><td class="num">'+used+'</td><td></td>';
          var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent='삭제';b.onclick=function(){if(used){toast('입원 중인 환자가 있어 삭제할 수 없습니다');return}S.wards.splice(i,1);persist();draw();xRefresh()};tr.lastChild.appendChild(b);tb.appendChild(tr)});
        $('wd-empty').hidden=S.wards.length>0;
      }
      $('wd-add').onclick=function(){var n=$('wd-n').value.trim(),b=parseInt($('wd-b').value,10);
        if(!n){toast('병동 이름을 입력하세요');return}if(!(b>=1&&b<=200)){toast('병상 수는 1~200 사이로 입력하세요');return}
        var w=S.wards.filter(function(x){return x.name===n})[0];if(w)w.beds=b;else S.wards.push({name:n,beds:b});persist();$('wd-n').value='';draw();xRefresh();toast('병동을 저장했습니다')};
      draw();
    },'wide blue');
  }

  /* ---------- 입원 / 퇴원 / 전실 ---------- */
  function wardNames(){var s={};S.wards.forEach(function(w){s[w.name]=1});S.admissions.forEach(function(a){if(a.ward)s[a.ward]=1});return Object.keys(s)}
  function bedTaken(ward,bed,exceptId){return S.admissions.some(function(a){return a.status==='입원'&&a.ward===ward&&a.bed===bed&&a.id!==exceptId})}
  function admNew(pre){
    pre=pre||{};var p=pre.chart?pt(pre.chart):cur;
    if(!p){pickPt(function(q){pickPatient(q.chart);admNew(pre)});return}
    var ex=inpOf(p.chart);if(ex){toast(p.name+' 환자는 이미 입원 중입니다 ('+ex.ward+' '+ex.bed+')');return}
    var lastDoc=(S.visits.filter(function(v){return v.chart===p.chart}).pop()||{}).doc||'';
    xwin('입원 등록 · '+p.name+' ('+p.chart+')','<datalist id="ward-dl">'+wardNames().map(function(n){return '<option value="'+esc(n)+'">'}).join('')+'</datalist><div class="xf"><label>병동<input id="an-w" list="ward-dl" value="'+esc(pre.ward||'')+'" autocomplete="off"></label><label>병상<input id="an-b" value="'+esc(pre.bed||'')+'" autocomplete="off"></label><label>진료과<select id="an-d">'+opt(DEPTS,$('r-dept').value||'내과')+'</select></label><label>담당의<input id="an-doc" list="doc-list" value="'+esc(lastDoc)+'" autocomplete="off"></label><label>입원일<input id="an-date" type="date" value="'+TODAY+'"></label><label>입원경로<select id="an-route">'+opt(['외래','응급','전원','기타'],'외래')+'</select></label><label style="grid-column:1/-1">진단명<input id="an-dx" autocomplete="off"></label></div><div class="acts"><button class="btn" id="an-chg" type="button">환자 변경</button><button class="btn xc" type="button">닫기</button><button class="btn blue" id="an-ok" type="button">입원 등록</button></div>',function(){
      $('an-chg').onclick=function(){pickPt(function(q){pickPatient(q.chart);admNew({ward:pre.ward,bed:pre.bed})})};
      $('an-ok').onclick=function(){
        var w=$('an-w').value.trim(),b=$('an-b').value.trim();
        if(!w){toast('병동을 입력하세요');$('an-w').focus();return}if(!b){toast('병상을 입력하세요');$('an-b').focus();return}
        if(!$('an-date').value){toast('입원일을 입력하세요');return}
        if(bedTaken(w,b)){toast(w+' '+b+' 병상은 사용 중입니다');return}
        var a={id:S.nextId++,chart:p.chart,ward:w,bed:b,dept:$('an-d').value,doctor:$('an-doc').value.trim(),dx:$('an-dx').value.trim(),date:$('an-date').value,route:$('an-route').value,status:'입원',dDate:'',dType:'',dNote:'',moves:[]};
        S.admissions.push(a);ST.adm.sel=a.id;persist();docList();xclose();xRefresh();toast(p.name+' 입원 등록 ('+w+' '+b+')');
      };
    },'wide blue');
  }
  function selAdm(){var a=S.admissions.filter(function(x){return x.id===ST.adm.sel&&x.status==='입원'})[0]||(cur&&inpOf(cur.chart));return a}
  function admDis(a){
    a=a||(cur&&inpOf(cur.chart));
    if(!a){pickAdm(function(x){admDis(x)});return}
    var p=pt(a.chart),d=stay(a);
    xwin('퇴원 처리 · '+p.name+' ('+a.ward+' '+a.bed+')','<div class="xf"><label>퇴원일<input id="ad-d" type="date" value="'+TODAY+'"></label><label>퇴원 유형<select id="ad-t">'+opt(['퇴원','전원','자의퇴원','사망','도주'],'퇴원')+'</select></label><label style="grid-column:1/-1">퇴원 요약<textarea id="ad-n" style="min-height:110px">입원 '+esc(a.date)+' / 진단: '+esc(a.dx||'-')+' / 담당의: '+esc(a.doctor||'-')+'\n경과 및 퇴원 시 상태: </textarea></label></div><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn red" id="ad-ok" type="button">퇴원 처리</button></div>',function(){
      $('ad-ok').onclick=function(){
        var dd=$('ad-d').value;if(!dd){toast('퇴원일을 입력하세요');return}if(dd<a.date){toast('퇴원일이 입원일보다 빠릅니다');return}
        a.status='퇴원';a.dDate=dd;a.dType=$('ad-t').value;a.dNote=$('ad-n').value.trim();persist();xclose();xRefresh();toast(p.name+' '+a.dType+' 처리 (재원 '+Math.max(1,daysBetween(a.date,dd))+'일)');
      };
    },'wide blue');
  }
  function admMove(a){
    a=a||(cur&&inpOf(cur.chart));
    if(!a){pickAdm(function(x){admMove(x)});return}
    var p=pt(a.chart);
    xwin('병상 이동 · '+p.name,'<datalist id="ward-dl">'+wardNames().map(function(n){return '<option value="'+esc(n)+'">'}).join('')+'</datalist><p class="muted" style="margin:0">현재 위치: '+esc(a.ward+' '+a.bed)+'</p><div class="xf"><label>이동할 병동<input id="am-w" list="ward-dl" value="'+esc(a.ward)+'" autocomplete="off"></label><label>이동할 병상<input id="am-b" autocomplete="off"></label><label>이동일<input id="am-d" type="date" value="'+TODAY+'"></label></div><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn blue" id="am-ok" type="button">이동</button></div>',function(){
      $('am-ok').onclick=function(){
        var w=$('am-w').value.trim(),b=$('am-b').value.trim();if(!w||!b){toast('병동과 병상을 입력하세요');return}
        if(w===a.ward&&b===a.bed){toast('현재 병상과 같습니다');return}
        if(bedTaken(w,b,a.id)){toast(w+' '+b+' 병상은 사용 중입니다');return}
        a.moves=a.moves||[];a.moves.push({date:$('am-d').value||TODAY,from:a.ward+' '+a.bed,to:w+' '+b});a.ward=w;a.bed=b;persist();xclose();xRefresh();toast('병상을 이동했습니다 ('+w+' '+b+')');
      };
    },'wide blue');
  }

  /* ---------- 화면: 입퇴원관리 ---------- */
  function xAdm(){
    var st=ST.adm;
    $('mod-adm').innerHTML='<div class="pg-hd"><b>입퇴원관리</b><label>상태 <select id="ad-state">'+opt(['현재입원','퇴원','전체'],st.state)+'</select></label><label>병동 <select id="ad-ward"><option value="">전체</option>'+opt(wardNames(),st.ward)+'</select></label><input id="ad-q" type="search" placeholder="환자 검색" value="'+esc(st.q)+'" aria-label="환자 검색"><span class="sp"></span><button class="btn sm" id="ad-new" type="button">입원 등록</button><button class="btn sm" id="ad-dis" type="button">퇴원 처리</button><button class="btn sm" id="ad-move" type="button">병상 이동</button><button class="btn sm" id="ad-del" type="button">입원 취소</button></div><div class="pg-body"><div class="pg-main"><div class="tbl-wrap big"><table style="min-width:860px"><thead><tr><th>상태</th><th>병동</th><th>병상</th><th>차트번호</th><th>성명</th><th>성/나이</th><th>진료과</th><th>담당의</th><th>입원일</th><th>퇴원일</th><th>재원</th><th>진단명</th></tr></thead><tbody id="ad-body"></tbody></table></div><div class="empty" id="ad-empty" hidden>입퇴원 내역이 없습니다. 입원 등록 버튼으로 시작하세요.</div></div><aside class="beds" id="ad-beds" aria-label="병상 현황"></aside></div>';
    $('ad-state').onchange=function(){st.state=this.value;xAdmBody()};
    $('ad-ward').onchange=function(){st.ward=this.value;xAdmBody()};
    $('ad-q').oninput=function(){st.q=this.value.trim();xAdmBody()};
    $('ad-new').onclick=function(){admNew()};
    $('ad-dis').onclick=function(){admDis(selAdm())};
    $('ad-move').onclick=function(){admMove(selAdm())};
    var armed=false;
    $('ad-del').onclick=function(){
      var a=S.admissions.filter(function(x){return x.id===st.sel})[0];if(!a){toast('목록에서 입퇴원 내역을 선택하세요');return}
      if(!armed){armed=true;$('ad-del').textContent='한 번 더 누르면 삭제';return}
      S.admissions=S.admissions.filter(function(x){return x!==a});st.sel=null;persist();xRefresh();toast('입퇴원 내역을 삭제했습니다');
    };
    xAdmBody();
  }
  function xAdmBody(){
    var st=ST.adm,rows=S.admissions.filter(function(a){var p=pt(a.chart);if(!p)return false;
      if(st.state==='현재입원'&&a.status!=='입원')return false;if(st.state==='퇴원'&&a.status!=='퇴원')return false;
      if(st.ward&&a.ward!==st.ward)return false;if(st.q&&p.name.indexOf(st.q)<0&&p.chart.indexOf(st.q)<0)return false;return true})
      .sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:b.id-a.id});
    var tb=$('ad-body');tb.innerHTML='';
    rows.forEach(function(a){var p=pt(a.chart),tr=document.createElement('tr');tr.tabIndex=0;if(st.sel===a.id)tr.className='sel';
      tr.innerHTML='<td><span class="badge '+(a.status==='입원'?'s-진료중':'s-수납')+'">'+(a.status==='입원'?'입원':esc(a.dType||'퇴원'))+'</span></td><td>'+esc(a.ward)+'</td><td>'+esc(a.bed)+'</td><td class="num">'+a.chart+'</td><td>'+esc(p.name)+'</td><td>'+p.sex+'/'+age(p.birth)+'</td><td>'+esc(a.dept)+'</td><td>'+esc(a.doctor)+'</td><td class="num">'+a.date+'</td><td class="num">'+(a.dDate||'')+'</td><td class="num">'+stay(a)+'일</td><td>'+esc(a.dx)+'</td>';
      var pick=function(){st.sel=a.id;pickPatient(a.chart)};tr.onclick=pick;tr.onkeydown=function(e){if(e.key==='Enter')pick()};tb.appendChild(tr)});
    $('ad-empty').hidden=rows.length>0;
    var occ=curInps(),names=wardNames(),h='<h4 class="x-h" style="padding:6px 8px;margin:0;background:var(--blue-lt)">병상 현황</h4>';
    if(!names.length)h+='<div class="empty">병동이 없습니다. 입원 등록 시 병동 이름을 입력하면 여기에 표시됩니다.</div>';
    names.forEach(function(n){
      var w=S.wards.filter(function(x){return x.name===n})[0],o=occ.filter(function(a){return a.ward===n}),labels=[],i;
      for(i=1;w&&i<=w.beds;i++)labels.push(String(i));o.forEach(function(a){if(labels.indexOf(a.bed)<0)labels.push(a.bed)});
      h+='<div class="bw"><div class="bw-t">'+esc(n)+' <span class="muted">'+o.length+'/'+(w?Math.max(w.beds,labels.length):labels.length)+'</span></div><div class="bw-g">'+labels.map(function(l){
        var a=o.filter(function(x){return x.bed===l})[0],p=a&&pt(a.chart);
        return '<button type="button" class="bed'+(a?' on':'')+'" data-w="'+esc(n)+'" data-b="'+esc(l)+'" title="'+(a?esc(p.name):'빈 병상 · 눌러서 입원 등록')+'"><b>'+esc(l)+'</b><span>'+(a?esc(p.name):'비어 있음')+'</span></button>'}).join('')+'</div></div>';
    });
    $('ad-beds').innerHTML=h;
    $('ad-beds').querySelectorAll('.bed').forEach(function(b){b.onclick=function(){
      var w=b.getAttribute('data-w'),bd=b.getAttribute('data-b'),a=occ.filter(function(x){return x.ward===w&&x.bed===bd})[0];
      if(a){st.sel=a.id;pickPatient(a.chart)}else admNew({ward:w,bed:bd,chart:cur&&!inpOf(cur.chart)?cur.chart:''})}});
  }

  /* ---------- 화면: 입원환자 ---------- */
  function ltcLatest(chart,type){return S.ltc.filter(function(x){return x.chart===chart&&x.type===type}).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:b.id-a.id})[0]}
  function xInp(){
    var st=ST.inp;
    $('mod-inp').innerHTML='<div class="pg-hd"><b>입원환자</b><label>병동 <select id="ip-ward"><option value="">전체</option>'+opt(wardNames(),st.ward)+'</select></label><input id="ip-q" type="search" placeholder="환자 검색" value="'+esc(st.q)+'" aria-label="환자 검색"><span class="sp"></span><button class="btn sm" data-ip="nursing" type="button">간호기록</button><button class="btn sm" data-ip="vit" type="button">V I T A L</button><button class="btn sm" data-ip="tpr" type="button">T.P.R.</button><button class="btn sm" data-ip="lab" type="button">검사결과</button><button class="btn sm" data-ip="ltc" type="button">장기요양평가</button><button class="btn sm" data-ip="dis" type="button">퇴원 처리</button></div><div class="pg-body"><div class="pg-main" style="flex-basis:100%"><div class="tbl-wrap big"><table style="min-width:980px"><thead><tr><th>병동/병상</th><th>성명</th><th>성/나이</th><th>진료과</th><th>담당의</th><th>입원일</th><th>재원</th><th>진단명</th><th>최근 V/S</th><th>낙상</th><th>욕창</th></tr></thead><tbody id="ip-body"></tbody></table></div><div class="empty" id="ip-empty" hidden>입원 중인 환자가 없습니다. 입퇴원관리에서 입원 등록을 하세요.</div></div></div>';
    $('ip-ward').onchange=function(){st.ward=this.value;xInpBody()};
    $('ip-q').oninput=function(){st.q=this.value.trim();xInpBody()};
    $('mod-inp').querySelectorAll('[data-ip]').forEach(function(b){b.onclick=function(){
      var a=S.admissions.filter(function(x){return x.id===st.sel&&x.status==='입원'})[0]||(cur&&inpOf(cur.chart));
      if(!a){toast('목록에서 입원환자를 선택하세요');return}
      if(!cur||cur.chart!==a.chart)pickPatient(a.chart);
      var k=b.getAttribute('data-ip');
      if(k==='nursing')xNursing('간호');else if(k==='ltc')xLtc('B');else if(k==='dis')admDis(a);else showMod(k);
    }});
    xInpBody();
  }
  function xInpBody(){
    var st=ST.inp,rows=curInps().filter(function(a){var p=pt(a.chart);return (!st.ward||a.ward===st.ward)&&(!st.q||p.name.indexOf(st.q)>-1||p.chart.indexOf(st.q)>-1)}).sort(function(a,b){return (a.ward+a.bed)<(b.ward+b.bed)?-1:1});
    var tb=$('ip-body');tb.innerHTML='';
    rows.forEach(function(a){var p=pt(a.chart),v=lastVit(a.chart),m=ltcLatest(a.chart,'M'),r=ltcLatest(a.chart,'R'),tr=document.createElement('tr');tr.tabIndex=0;if(st.sel===a.id)tr.className='sel';
      var vs=v?((v.bt!=null?v.bt+'℃ ':'')+(v.sbp!=null?v.sbp+'/'+(v.dbp==null?'-':v.dbp)+' ':'')+(v.hr!=null?'P'+v.hr:'')):'';
      tr.innerHTML='<td>'+esc(a.ward+' '+a.bed)+'</td><td>'+esc(p.name)+'</td><td>'+p.sex+'/'+age(p.birth)+'</td><td>'+esc(a.dept)+'</td><td>'+esc(a.doctor)+'</td><td class="num">'+a.date+'</td><td class="num">'+stay(a)+'일</td><td>'+esc(a.dx)+'</td><td class="num">'+esc(vs)+'</td><td'+(m&&m.level==='높은 위험'?' class="abn"':'')+'>'+(m?esc(m.level):'')+'</td><td'+(r&&(r.level==='매우 높은 위험'||r.level==='높은 위험')?' class="abn"':'')+'>'+(r?esc(r.level):'')+'</td>';
      var pick=function(){st.sel=a.id;pickPatient(a.chart)};tr.onclick=pick;tr.onkeydown=function(e){if(e.key==='Enter')pick()};tb.appendChild(tr)});
    $('ip-empty').hidden=rows.length>0;
  }

  /* ---------- 화면: V I T A L ---------- */
  function vitAbn(k,v){if(v==null)return '';var bad=(k==='bt'&&(v>=38||v<36))||(k==='hr'&&(v>100||v<50))||(k==='sbp'&&(v>=180||v<90))||(k==='dbp'&&(v>=110||v<60))||(k==='rr'&&(v>24||v<10))||(k==='spo2'&&v<94);return bad?' abn':''}
  function vitForm(prefix,fields){
    return '<div class="pg-flt"><label>일시 <input id="'+prefix+'-dt" type="datetime-local" value="'+nowLocal()+'"></label>'+fields.map(function(f){return '<label>'+f[1]+' <input id="'+prefix+'-'+f[0]+'" inputmode="decimal" style="width:'+(f[2]||64)+'px"></label>'}).join('')+'<button class="btn blue sm" id="'+prefix+'-add" type="button">추가</button></div>';
  }
  function vitAdd(prefix,keys){
    var p=cur;if(!p){toast('환자를 선택하세요');return}
    var e={id:S.nextId++,chart:p.chart,dt:$(prefix+'-dt').value||nowLocal()},any=false,rng={sbp:[40,300],dbp:[20,200],hr:[20,300],rr:[4,80],bt:[30,45],spo2:[40,100],wt:[1,400]};
    for(var i=0;i<keys.length;i++){var k=keys[i],v=k==='by'?$(prefix+'-by').value.trim():numOrNull(prefix+'-'+k);
      if(k==='by'){e.by=v;continue}
      if(v!==null&&(isNaN(v)||v<rng[k][0]||v>rng[k][1])){toast('값이 올바르지 않습니다: '+k.toUpperCase()+' ('+rng[k][0]+'~'+rng[k][1]+')');$(prefix+'-'+k).focus();return}
      e[k]=v;if(v!==null)any=true}
    if(!any){toast('측정값을 하나 이상 입력하세요');return}
    S.vitals.push(e);persist();xRefresh();toast('활력징후를 기록했습니다');
  }
  function xVit(){
    var st=ST.vit,p=cur,h='<div class="pg-hd"><b>V I T A L</b><span>'+ptLine()+'</span><button class="btn sm" id="vt-pick" type="button">환자 선택</button><span class="sp"></span><label>그래프 <select id="vt-series">'+opt([['bt','체온'],['hr','맥박'],['bp','혈압'],['rr','호흡'],['spo2','SpO₂'],['wt','체중']],st.series)+'</select></label></div>';
    if(!p){$('mod-vit').innerHTML=h+'<div class="empty">환자를 선택하면 활력징후를 기록하고 추이를 볼 수 있습니다. 위의 환자 선택 버튼이나 F2를 누르세요.</div>';$('vt-pick').onclick=function(){pickPt(function(q){pickPatient(q.chart)})};$('vt-series').onchange=function(){st.series=this.value};return}
    var list=S.vitals.filter(function(v){return v.chart===p.chart}).sort(function(a,b){return a.dt<b.dt?-1:1});
    var asc=list.slice(-30),lb=asc.map(function(v){return v.dt.slice(5,16).replace('T',' ')});
    var SER={bt:[[{name:'체온',color:'#1c5fae',k:'bt'}],[36,37.5]],hr:[[{name:'맥박',color:'#d02a1b',k:'hr'}],[60,100]],bp:[[{name:'수축기',color:'#d02a1b',k:'sbp'},{name:'이완기',color:'#1c5fae',k:'dbp'}],[60,120]],rr:[[{name:'호흡',color:'#2e9d57',k:'rr'}],[12,20]],spo2:[[{name:'SpO₂',color:'#6a3fb5',k:'spo2'}],[95,100]],wt:[[{name:'체중',color:'#444',k:'wt'}],null]}[st.series];
    var chart=lineSvg(SER[0].map(function(s){return {name:s.name,color:s.color,vals:asc.map(function(v){return v[s.k]==null?null:v[s.k]})}}),lb,{band:SER[1],label:'활력징후 추이'});
    var legend=SER[0].map(function(s){return '<span style="color:'+s.color+'">● '+s.name+'</span>'}).join(' ')+(SER[1]?' <span class="muted">· 초록 띠: 일반적인 정상 범위(예시)</span>':'');
    $('mod-vit').innerHTML=h+vitForm('vt',[['sbp','수축기'],['dbp','이완기'],['hr','맥박'],['rr','호흡'],['bt','체온'],['spo2','SpO₂'],['wt','체중'],['by','측정자',80]])
      +'<div class="pg-body"><div class="pg-main"><div style="font-size:12px;margin-bottom:2px">'+legend+'</div>'+chart+'<div class="muted" style="font-size:11px;margin:4px 0">붉은 글씨: 체온 38.0↑/36.0↓, 맥박 100↑/50↓, 수축기 180↑/90↓, 이완기 110↑/60↓, 호흡 24↑/10↓, SpO₂ 94↓ (경고 표시 기준 예시)</div><div class="tbl-wrap" style="max-height:300px"><table style="min-width:760px"><thead><tr><th>일시</th><th>수축기</th><th>이완기</th><th>맥박</th><th>호흡</th><th>체온</th><th>SpO₂</th><th>체중</th><th>측정자</th><th></th></tr></thead><tbody id="vt-body"></tbody></table></div><div class="empty" id="vt-empty" hidden>기록이 없습니다.</div></div></div>';
    var tb=$('vt-body');
    list.slice().reverse().forEach(function(v){var tr=document.createElement('tr');
      function c(k){return '<td class="num'+vitAbn(k,v[k])+'">'+(v[k]==null?'':v[k])+'</td>'}
      tr.innerHTML='<td class="num">'+esc(v.dt.replace('T',' '))+'</td>'+c('sbp')+c('dbp')+c('hr')+c('rr')+c('bt')+c('spo2')+c('wt')+'<td>'+esc(v.by||'')+'</td><td></td>';
      var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent='×';b.setAttribute('aria-label','기록 삭제');b.onclick=function(){S.vitals=S.vitals.filter(function(x){return x!==v});persist();xRefresh()};tr.lastChild.appendChild(b);tb.appendChild(tr)});
    $('vt-empty').hidden=list.length>0;
    $('vt-pick').onclick=function(){pickPt(function(q){pickPatient(q.chart)})};
    $('vt-series').onchange=function(){st.series=this.value;xVit()};
    $('vt-add').onclick=function(){vitAdd('vt',['sbp','dbp','hr','rr','bt','spo2','wt','by'])};
  }

  /* ---------- 화면: T.P.R. ---------- */
  var TPR_H=[2,6,10,14,18,22];
  function tprSlot(dt){var h=parseInt(dt.slice(11,13),10)+(parseInt(dt.slice(14,16),10)||0)/60,best=0,bd=99;TPR_H.forEach(function(s,i){var d=Math.abs(h-s);if(d<bd){bd=d;best=i}});return best}
  function tprSvg(start,list){
    var W=960,H=330,L=40,R=40,T=40,B=12,cols=42,cw=(W-L-R)/cols,ph=H-T-B,DOW=['일','월','화','수','목','금','토'];
    function TY(v){return T+ph*(1-(v-35)/7)}function PY(v){return T+ph*(1-(v-40)/140)}
    var s='<svg viewBox="0 0 '+W+' '+H+'" width="100%" role="img" aria-label="T.P.R. 도표" style="min-width:760px">',t,c,d;
    for(t=35;t<=42;t++){var y=TY(t);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="'+(t===37?'#8fb4e6':'#d3dce7')+'" stroke-width="'+(t===37?1.8:1)+'"/><text x="'+(L-5)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="#1c5fae">'+t+'</text>'}
    for(var pv=40;pv<=180;pv+=20)s+='<text x="'+(W-R+5)+'" y="'+(PY(pv)+4)+'" font-size="10" fill="#d02a1b">'+pv+'</text>';
    for(c=0;c<=cols;c++){var x=L+cw*c;s+='<line x1="'+x+'" x2="'+x+'" y1="'+(T-12)+'" y2="'+(H-B)+'" stroke="'+(c%6===0?'#7f93aa':'#e3e9f1')+'"/>'}
    for(d=0;d<7;d++){var dd=addDays(start,d),dw=DOW[new Date(dd+'T00:00:00').getDay()];s+='<text x="'+(L+cw*(d*6+3))+'" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="'+(dw==='일'?'#d02a1b':'#14202e')+'">'+dd.slice(5).replace('-','/')+' ('+dw+')</text>'}
    for(c=0;c<cols;c++)s+='<text x="'+(L+cw*(c+.5))+'" y="'+(T-3)+'" text-anchor="middle" font-size="8" fill="#5a6b7e">'+p2(TPR_H[c%6])+'</text>';
    var cell={};list.forEach(function(v){var di=daysBetween(start,v.dt.slice(0,10));if(di<0||di>6)return;var k=di*6+tprSlot(v.dt);if(!cell[k]||cell[k].dt<v.dt)cell[k]=v});
    var keys=Object.keys(cell).map(Number).sort(function(a,b){return a-b}),tp=[],pp=[];
    keys.forEach(function(k){var v=cell[k],x=L+cw*(k+.5);if(v.bt!=null)tp.push([x,TY(Math.min(42,Math.max(35,v.bt))),v.bt,k]);if(v.hr!=null)pp.push([x,PY(Math.min(180,Math.max(40,v.hr))),v.hr,k])});
    function poly(a,col){return a.length>1?'<polyline fill="none" stroke="'+col+'" stroke-width="1.8" points="'+a.map(function(q){return q[0]+','+q[1]}).join(' ')+'"/>':''}
    s+=poly(pp,'#d02a1b')+poly(tp,'#1c5fae');
    pp.forEach(function(q){s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="3.6" fill="#fff" stroke="#d02a1b" stroke-width="1.8"><title>맥박 '+q[2]+'</title></circle>'});
    tp.forEach(function(q){s+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="3.8" fill="#1c5fae"><title>체온 '+q[2]+'</title></circle>'});
    return {svg:s+'</svg>',cell:cell};
  }
  function xTpr(){
    var st=ST.tpr,p=cur,h='<div class="pg-hd"><b>T.P.R.</b><span>'+ptLine()+'</span><button class="btn sm" id="tp-pick" type="button">환자 선택</button><span class="sp"></span><button class="btn sm" id="tp-prev" type="button">‹ 7일 전</button><label><input id="tp-start" type="date" value="'+st.start+'" aria-label="시작일"></label><button class="btn sm" id="tp-next" type="button">7일 후 ›</button><button class="btn sm" id="tp-today" type="button">최근 7일</button></div>';
    if(!p){$('mod-tpr').innerHTML=h+'<div class="empty">환자를 선택하면 체온·맥박·호흡 도표를 볼 수 있습니다. 위의 환자 선택 버튼이나 F2를 누르세요.</div>'}
    else{
      var list=S.vitals.filter(function(v){return v.chart===p.chart}),r=tprSvg(st.start,list),rows='';
      for(var d=0;d<7;d++){var dd=addDays(st.start,d);rows+='<tr><td class="num">'+dd.slice(5)+'</td>'+TPR_H.map(function(_,i){var v=r.cell[d*6+i];return '<td class="num">'+(v?((v.bt==null?'-':v.bt)+' / '+(v.hr==null?'-':v.hr)+' / '+(v.rr==null?'-':v.rr)):'')+'</td>'}).join('')+'</tr>'}
      $('mod-tpr').innerHTML=h+vitForm('tp',[['bt','체온(T)'],['hr','맥박(P)'],['rr','호흡(R)']])+'<div class="pg-body"><div class="pg-main"><div style="font-size:12px;margin-bottom:2px"><span style="color:#1c5fae">● 체온(T, 왼쪽 눈금)</span> <span style="color:#d02a1b">○ 맥박(P, 오른쪽 눈금)</span> <span class="muted">· 시간 칸에는 가장 가까운 2/6/10/14/18/22시 칸에 표시됩니다</span></div><div class="tbl-wrap" style="max-height:none">'+r.svg+'</div><h4 class="x-h">T / P / R 값</h4><div class="tbl-wrap" style="max-height:none"><table style="min-width:640px"><thead><tr><th>날짜</th>'+TPR_H.map(function(x){return '<th>'+p2(x)+'시</th>'}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
      $('tp-add').onclick=function(){vitAdd('tp',['bt','hr','rr'])};
    }
    $('tp-pick').onclick=function(){pickPt(function(q){pickPatient(q.chart)})};
    $('tp-start').onchange=function(){if(this.value){st.start=this.value;xTpr()}};
    $('tp-prev').onclick=function(){st.start=addDays(st.start,-7);xTpr()};
    $('tp-next').onclick=function(){st.start=addDays(st.start,7);xTpr()};
    $('tp-today').onclick=function(){st.start=addDays(TODAY,-6);xTpr()};
  }

  /* ---------- 화면: 검사결과 ---------- */
  var LABCAT=[
    {k:'WBC',g:'CBC',u:'10³/μL',lo:4,hi:10},{k:'Hb',g:'CBC',u:'g/dL',m:[13,17],f:[12,16]},{k:'Hct',g:'CBC',u:'%',m:[40,52],f:[36,46]},{k:'PLT',g:'CBC',u:'10³/μL',lo:150,hi:400},
    {k:'Na',g:'전해질',u:'mmol/L',lo:135,hi:145},{k:'K',g:'전해질',u:'mmol/L',lo:3.5,hi:5},{k:'Cl',g:'전해질',u:'mmol/L',lo:98,hi:107},
    {k:'AST',g:'간기능',u:'U/L',lo:0,hi:40},{k:'ALT',g:'간기능',u:'U/L',lo:0,hi:40},{k:'T.bil',g:'간기능',u:'mg/dL',lo:0.2,hi:1.2},{k:'Albumin',g:'간기능',u:'g/dL',lo:3.5,hi:5.2},
    {k:'BUN',g:'신기능',u:'mg/dL',lo:8,hi:23},{k:'Cr',g:'신기능',u:'mg/dL',m:[0.7,1.3],f:[0.6,1.1]},
    {k:'CRP',g:'염증',u:'mg/dL',lo:0,hi:0.5},{k:'ESR',g:'염증',u:'mm/h',m:[0,15],f:[0,20]},
    {k:'Glucose',g:'당·응고',u:'mg/dL',lo:70,hi:110},{k:'HbA1c',g:'당·응고',u:'%',lo:4,hi:5.6},{k:'PT(INR)',g:'당·응고',u:'',lo:0.9,hi:1.2},
    {k:'pH',g:'ABGA',u:'',lo:7.35,hi:7.45},{k:'pCO2',g:'ABGA',u:'mmHg',lo:35,hi:45},{k:'pO2',g:'ABGA',u:'mmHg',lo:80,hi:100},{k:'HCO3',g:'ABGA',u:'mmol/L',lo:22,hi:26},{k:'Lactate',g:'ABGA',u:'mmol/L',lo:0.5,hi:2.2}
  ];
  var LABGRP=['CBC','전해질','간기능','신기능','염증','당·응고','ABGA'];
  function labRef(item,sex){var c=LABCAT.filter(function(x){return x.k===item})[0];if(!c)return null;var r=sex==='남'&&c.m?c.m:sex==='여'&&c.f?c.f:[c.lo,c.hi];return {u:c.u,lo:r[0],hi:r[1],g:c.g}}
  function labFlag(item,val,sex){var r=labRef(item,sex),n=parseFloat(val);if(!r||isNaN(n))return '';return n<r.lo?'L':n>r.hi?'H':'N'}
  function xLabMod(){
    var st=ST.lab,p=cur,h='<div class="pg-hd"><b>검사결과</b><span>'+ptLine()+'</span><button class="btn sm" id="lb-pick" type="button">환자 선택</button><span class="sp"></span><button class="btn sm" id="lb-pan" type="button">묶음 입력</button></div>';
    if(!p){$('mod-lab').innerHTML=h+'<div class="empty">환자를 선택하면 검사결과를 입력하고 참고치와 비교해 볼 수 있습니다. 위의 환자 선택 버튼이나 F2를 누르세요.</div>';$('lb-pick').onclick=function(){pickPt(function(q){pickPatient(q.chart)})};$('lb-pan').onclick=function(){toast('먼저 환자를 선택하세요')};return}
    $('mod-lab').innerHTML=h+'<datalist id="lab-dl">'+LABCAT.map(function(c){return '<option value="'+esc(c.k)+'">'}).join('')+'</datalist><div class="pg-flt"><label>일시 <input id="lb-dt" type="datetime-local" value="'+nowLocal()+'"></label><label>항목 <input id="lb-item" list="lab-dl" style="width:120px" autocomplete="off" placeholder="WBC, Hb ..."></label><label>결과 <input id="lb-val" style="width:90px" autocomplete="off"></label><label>메모 <input id="lb-memo" style="width:150px" autocomplete="off"></label><button class="btn blue sm" id="lb-add" type="button">추가</button><span class="sp"></span><label>분류 <select id="lb-grp"><option value="">전체</option>'+opt(LABGRP,st.grp)+'</select></label></div><div class="pg-body"><div class="pg-main"><div class="tbl-wrap" style="max-height:340px"><table style="min-width:720px"><thead><tr><th>일시</th><th>검사</th><th>결과</th><th>단위</th><th>참고치</th><th>판정</th><th>메모</th><th></th></tr></thead><tbody id="lb-body"></tbody></table></div><div class="empty" id="lb-empty" hidden>검사결과가 없습니다.</div><p class="muted" style="font-size:11px;margin:4px 0">참고치는 일반 성인 기준 예시입니다. 실제 판독은 검사기관의 참고치를 따르세요. 목록에 없는 항목도 직접 입력할 수 있으며 이 경우 판정은 표시되지 않습니다.</p><div id="lb-chart"></div></div></div>';
    var rows=S.labs.filter(function(l){return l.chart===p.chart}).sort(function(a,b){return a.dt<b.dt?1:-1}),tb=$('lb-body');
    var shown=rows.filter(function(l){if(!st.grp)return true;var r=labRef(l.item,p.sex);return r&&r.g===st.grp});
    shown.forEach(function(l){var r=labRef(l.item,p.sex),f=labFlag(l.item,l.val,p.sex),tr=document.createElement('tr');if(st.sel===l.id)tr.className='sel';
      tr.innerHTML='<td class="num">'+esc(l.dt.replace('T',' '))+'</td><td>'+esc(l.item)+'</td><td class="num'+(f==='H'||f==='L'?' abn':'')+'">'+esc(l.val)+'</td><td>'+esc(r?r.u:'')+'</td><td class="num">'+(r?r.lo+' ~ '+r.hi:'')+'</td><td class="'+(f==='H'||f==='L'?'abn':'')+'">'+(f==='H'?'높음 ▲':f==='L'?'낮음 ▼':f==='N'?'정상':'')+'</td><td>'+esc(l.memo||'')+'</td><td></td>';
      var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent='×';b.setAttribute('aria-label','삭제');b.onclick=function(e){e.stopPropagation();S.labs=S.labs.filter(function(x){return x!==l});if(st.sel===l.id)st.sel=null;persist();xRefresh()};tr.lastChild.appendChild(b);
      tr.onclick=function(){st.sel=l.id;st.item=l.item;xRefresh()};tb.appendChild(tr)});
    $('lb-empty').hidden=shown.length>0;
    var item=st.item||(shown[0]&&shown[0].item),ser=S.labs.filter(function(l){return l.chart===p.chart&&l.item===item&&!isNaN(parseFloat(l.val))}).sort(function(a,b){return a.dt<b.dt?-1:1}).slice(-20),rf=labRef(item,p.sex);
    $('lb-chart').innerHTML=item&&ser.length>1?'<h4 class="x-h">'+esc(item)+' 추이'+(rf?' <span class="muted">(참고치 '+rf.lo+' ~ '+rf.hi+' '+esc(rf.u)+')</span>':'')+'</h4>'+lineSvg([{name:item,color:'#1c5fae',vals:ser.map(function(l){return parseFloat(l.val)})}],ser.map(function(l){return l.dt.slice(5,10)}),{band:rf?[rf.lo,rf.hi]:null,label:item+' 추이'}):(item?'<p class="muted" style="font-size:11px">'+esc(item)+' 추이 그래프는 같은 항목이 2회 이상 있을 때 표시됩니다.</p>':'');
    $('lb-pick').onclick=function(){pickPt(function(q){pickPatient(q.chart)})};
    $('lb-grp').onchange=function(){st.grp=this.value;xLabMod()};
    $('lb-add').onclick=function(){
      var item=$('lb-item').value.trim(),val=$('lb-val').value.trim();
      if(!item){toast('검사 항목을 입력하세요');$('lb-item').focus();return}if(!val){toast('결과를 입력하세요');$('lb-val').focus();return}
      S.labs.push({id:S.nextId++,chart:p.chart,dt:$('lb-dt').value||nowLocal(),item:item,val:val,memo:$('lb-memo').value.trim()});st.item=item;persist();xRefresh();toast('검사결과를 추가했습니다');
    };
    $('lb-pan').onclick=function(){
      xwin('검사 묶음 입력 · '+p.name,'<div class="xf"><label>묶음<select id="pn-g">'+opt(LABGRP,'CBC')+'</select></label><label>일시<input id="pn-dt" type="datetime-local" value="'+nowLocal()+'"></label></div><div id="pn-list" class="xf" style="margin-top:8px"></div><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn blue" id="pn-ok" type="button">저장</button></div>',function(){
        function draw(){var g=$('pn-g').value;$('pn-list').innerHTML=LABCAT.filter(function(c){return c.g===g}).map(function(c){var r=labRef(c.k,p.sex);return '<label>'+esc(c.k)+' <span class="muted">('+r.lo+' ~ '+r.hi+' '+esc(r.u)+')</span><input data-pi="'+esc(c.k)+'" inputmode="decimal" autocomplete="off"></label>'}).join('')}
        $('pn-g').onchange=draw;draw();
        $('pn-ok').onclick=function(){var n=0,dt=$('pn-dt').value||nowLocal();$('pn-list').querySelectorAll('[data-pi]').forEach(function(i){var v=i.value.trim();if(v){S.labs.push({id:S.nextId++,chart:p.chart,dt:dt,item:i.getAttribute('data-pi'),val:v,memo:''});n++}});
          if(!n){toast('입력된 결과가 없습니다');return}persist();xclose();xRefresh();toast(n+'건을 저장했습니다')};
      },'wide blue');
    };
  }

  /* ---------- 화면: 청구자료 ---------- */
  function xBillRows(){
    var st=ST.bill,F=S.settings.fees,R=S.settings.rates,rows=[];
    function add(type,date,chart,item,total,key){
      var p=pt(chart);if(!p)return;if(date<st.from||date>st.to)return;if(st.type&&st.type!==type)return;
      if(st.q&&p.name.indexOf(st.q)<0&&p.chart.indexOf(st.q)<0)return;
      var status=S.claims[key]||'미청구';if(st.status&&st.status!==status)return;
      var rate=R[p.ins]!=null?R[p.ins]:100,own=Math.round(total*rate/100/10)*10;
      rows.push({type:type,date:date,p:p,item:item,total:total,own:own,claim:total-own,key:key,status:status});
    }
    S.visits.forEach(function(v){add('외래',v.date,v.chart,v.dept+' · '+v.type+' 진찰료',F[v.type]||0,'v'+v.id)});
    S.er.forEach(function(e){var rx=(e.rx||[]).filter(function(r){return r.status!=='취소'}),sum=F['응급']||0;rx.forEach(function(r){sum+=F[r.kind]||0});add('응급',e.date,e.chart,'응급 진찰 + 처방 '+rx.length+'건',sum,'e'+e.id)});
    S.surg.forEach(function(s){add('수술',s.date,s.chart,(s.name||'수술')+(s.temp?' (임시)':''),F['수술']||0,'s'+s.id)});
    S.imaging.forEach(function(i){var fk=['X-Ray','CT','MRI','초음파'].indexOf(i.kind)>-1?i.kind:'영상기타';add('영상',i.dt.slice(0,10),i.chart,i.kind+' '+i.name,F[fk]||0,'i'+i.id)});
    S.admissions.forEach(function(a){var d=stay(a);add('입원',a.date,a.chart,'입원료 '+d+'일 ('+a.ward+' '+a.bed+')'+(a.status==='입원'?' · 진행 중':''),d*(F['입원일']||0),'a'+a.id)});
    rows.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0});
    return rows;
  }
  function xBill(){
    var st=ST.bill;
    $('mod-bill').innerHTML='<div class="pg-hd"><b>청구자료</b><span class="muted">간이 정산 · 금액과 본인부담률은 환경설정 > 수가·본인부담 설정에서 바꿉니다</span><span class="sp"></span><button class="btn sm" id="bl-csv" type="button">CSV 내보내기</button></div><div class="pg-flt"><label>기간 <input id="bl-from" type="date" value="'+st.from+'"> ~ <input id="bl-to" type="date" value="'+st.to+'"></label><label>구분 <select id="bl-type"><option value="">전체</option>'+opt(['외래','응급','수술','영상','입원'],st.type)+'</select></label><label>상태 <select id="bl-status"><option value="">전체</option>'+opt(BILL_ST,st.status)+'</select></label><input id="bl-q" type="search" placeholder="환자 검색" value="'+esc(st.q)+'" aria-label="환자 검색"></div><div class="pg-body"><div class="pg-main" style="flex-basis:100%"><div class="tbl-wrap big"><table style="min-width:900px"><thead><tr><th>일자</th><th>구분</th><th>차트번호</th><th>성명</th><th>보험</th><th>내용</th><th>총액</th><th>본인부담</th><th>청구액</th><th>상태</th></tr></thead><tbody id="bl-body"></tbody><tfoot id="bl-foot"></tfoot></table></div><div class="empty" id="bl-empty" hidden></div></div></div>';
    $('bl-from').onchange=function(){st.from=this.value||st.from;xBillBody()};
    $('bl-to').onchange=function(){st.to=this.value||st.to;xBillBody()};
    $('bl-type').onchange=function(){st.type=this.value;xBillBody()};
    $('bl-status').onchange=function(){st.status=this.value;xBillBody()};
    $('bl-q').oninput=function(){st.q=this.value.trim();xBillBody()};
    $('bl-csv').onclick=function(){var r=xBillRows();if(!r.length){toast('내보낼 내역이 없습니다');return}
      showCsv('청구자료_'+st.from+'_'+st.to,csvText(['일자','구분','차트번호','성명','보험','내용','총액','본인부담','청구액','상태'],r.map(function(x){return [x.date,x.type,x.p.chart,x.p.name,x.p.ins,x.item,x.total,x.own,x.claim,x.status]})))};
    xBillBody();
  }
  function xBillBody(){
    var rows=xBillRows(),tb=$('bl-body'),T={t:0,o:0,c:0};tb.innerHTML='';
    rows.forEach(function(r){T.t+=r.total;T.o+=r.own;T.c+=r.claim;var tr=document.createElement('tr');
      tr.innerHTML='<td class="num">'+r.date+'</td><td>'+r.type+'</td><td class="num">'+r.p.chart+'</td><td>'+esc(r.p.name)+'</td><td>'+esc(r.p.ins)+'</td><td>'+esc(r.item)+'</td><td class="num r">'+fmt(r.total)+'</td><td class="num r">'+fmt(r.own)+'</td><td class="num r">'+fmt(r.claim)+'</td><td></td>';
      var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent=r.status;b.title='누르면 상태가 바뀝니다 (미청구 → 청구 → 수납완료)';
      b.onclick=function(){S.claims[r.key]=BILL_ST[(BILL_ST.indexOf(r.status)+1)%BILL_ST.length];persist();xBillBody()};tr.lastChild.appendChild(b);tb.appendChild(tr)});
    $('bl-foot').innerHTML=rows.length?'<tr><td colspan="6">합계 ('+rows.length+'건)</td><td class="num r">'+fmt(T.t)+'</td><td class="num r">'+fmt(T.o)+'</td><td class="num r">'+fmt(T.c)+'</td><td></td></tr>':'';
    $('bl-empty').hidden=rows.length>0;$('bl-empty').textContent='조건에 맞는 청구 내역이 없습니다. 기간을 넓히거나 접수·처방·입원을 등록하세요.';
  }

  /* ---------- 간호기록 / 경과기록 ---------- */
  function shiftNow(){var h=new Date().getHours();return h>=7&&h<15?'D':h>=15&&h<23?'E':'N'}
  function xNursing(pre){
    needPt(function(p){
      var TY=['간호','경과','투약','처치','기타'];
      xwin('간호·경과기록 · '+p.name+' ('+p.chart+')','<div class="xf"><label>일시<input id="nr-dt" type="datetime-local" value="'+nowLocal()+'"></label><label>근무조<select id="nr-sh">'+opt(['D','E','N'],shiftNow())+'</select></label><label>구분<select id="nr-ty">'+opt(TY,pre||'간호')+'</select></label><label>작성자<input id="nr-by" list="doc-list" autocomplete="off"></label><label style="grid-column:1/-1">내용<textarea id="nr-c"></textarea></label></div><div class="acts"><button class="btn blue" id="nr-add" type="button">기록 추가</button></div><div class="xf" style="margin-top:8px"><label>보기<select id="nr-f"><option value="">전체</option>'+opt(TY,'')+'</select></label></div><div class="tbl-wrap" style="max-height:280px"><table style="min-width:620px"><thead><tr><th>일시</th><th>근무</th><th>구분</th><th>작성자</th><th>내용</th><th></th></tr></thead><tbody id="nr-body"></tbody></table></div><div class="empty" id="nr-empty" hidden>기록이 없습니다.</div>',function(){
        function draw(){
          var f=$('nr-f').value,rows=S.nursing.filter(function(n){return n.chart===p.chart&&(!f||n.type===f)}).sort(function(a,b){return a.dt<b.dt?1:-1}),tb=$('nr-body');tb.innerHTML='';
          rows.forEach(function(n){var tr=document.createElement('tr');tr.innerHTML='<td class="num">'+esc(n.dt.replace('T',' '))+'</td><td>'+esc(n.shift)+'</td><td>'+esc(n.type)+'</td><td>'+esc(n.by||'')+'</td><td style="white-space:pre-wrap;min-width:220px">'+esc(n.content)+'</td><td></td>';
            var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent='×';b.setAttribute('aria-label','삭제');b.onclick=function(){S.nursing=S.nursing.filter(function(x){return x!==n});persist();draw()};tr.lastChild.appendChild(b);tb.appendChild(tr)});
          $('nr-empty').hidden=rows.length>0;
        }
        $('nr-f').onchange=draw;
        $('nr-add').onclick=function(){var c=$('nr-c').value.trim();if(!c){toast('내용을 입력하세요');$('nr-c').focus();return}
          S.nursing.push({id:S.nextId++,chart:p.chart,dt:$('nr-dt').value||nowLocal(),shift:$('nr-sh').value,type:$('nr-ty').value,by:$('nr-by').value.trim(),content:c});persist();$('nr-c').value='';docList();draw();toast('기록을 추가했습니다')};
        draw();
      },'xwide blue');
    });
  }

  /* ---------- 장기요양평가 (자체 선별용) ---------- */
  var LTC={
    B:{name:'일상생활동작 (Barthel Index)',max:100,items:[['식사',[[0,'불가능'],[5,'도움 필요'],[10,'독립']]],['목욕',[[0,'도움 필요'],[5,'독립']]],['세면·양치·몸단장',[[0,'도움 필요'],[5,'독립']]],['옷 입기',[[0,'불가능'],[5,'도움 필요'],[10,'독립']]],['대변 조절',[[0,'실금'],[5,'가끔 실금'],[10,'조절 가능']]],['소변 조절',[[0,'실금·유치도뇨'],[5,'가끔 실금'],[10,'조절 가능']]],['화장실 사용',[[0,'불가능'],[5,'도움 필요'],[10,'독립']]],['의자↔침대 이동',[[0,'불가능'],[5,'많은 도움'],[10,'약간 도움'],[15,'독립']]],['보행',[[0,'불가능'],[5,'휠체어 독립'],[10,'도움 보행'],[15,'독립 보행']]],['계단 오르내리기',[[0,'불가능'],[5,'도움 필요'],[10,'독립']]]],
      level:function(t){return t<=20?'완전 의존':t<=60?'심한 의존':t<=90?'중등도 의존':t<100?'경미한 의존':'완전 독립'},note:'총점이 낮을수록 도움이 많이 필요합니다 (0~100점).'},
    R:{name:'욕창 위험도 (Braden Scale)',max:23,items:[['감각 인지',[[1,'완전 제한'],[2,'매우 제한'],[3,'약간 제한'],[4,'장애 없음']]],['습기',[[1,'항상 젖음'],[2,'자주 젖음'],[3,'가끔 젖음'],[4,'거의 안 젖음']]],['활동',[[1,'침상 안정'],[2,'의자 이용'],[3,'가끔 보행'],[4,'자주 보행']]],['가동성',[[1,'전혀 못 움직임'],[2,'매우 제한'],[3,'약간 제한'],[4,'제한 없음']]],['영양',[[1,'매우 불량'],[2,'부족'],[3,'적절'],[4,'우수']]],['마찰·전단력',[[1,'문제 있음'],[2,'잠재적 문제'],[3,'문제 없음']]]],
      level:function(t){return t<=9?'매우 높은 위험':t<=12?'높은 위험':t<=14?'중등도 위험':t<=18?'경미한 위험':'위험 낮음'},note:'총점이 낮을수록 욕창 위험이 높습니다 (6~23점).'},
    M:{name:'낙상 위험도 (Morse Fall Scale)',max:125,items:[['낙상 과거력(최근 3개월)',[[0,'없음'],[25,'있음']]],['2개 이상의 진단명',[[0,'아니오'],[15,'예']]],['보행 보조',[[0,'없음·침상안정·간호사 도움'],[15,'지팡이·목발·보행기'],[30,'가구를 짚고 걸음']]],['정맥주사·헤파린 록',[[0,'아니오'],[20,'예']]],['걸음걸이',[[0,'정상·침상안정·부동'],[10,'약함'],[20,'장애 있음']]],['정신 상태',[[0,'자신의 능력을 인지'],[15,'능력을 과대평가·잊음']]]],
      level:function(t){return t<25?'위험 없음':t<45?'낮은 위험':'높은 위험'},note:'총점이 높을수록 낙상 위험이 높습니다 (25점 미만 위험 없음, 25~44 낮음, 45 이상 높음).'}
  };
  function xLtc(tab){
    needPt(function(p){
      xwin('장기요양 평가 · '+p.name+' ('+p.chart+')','<div class="tabs" id="lt-tabs" role="tablist"></div><div id="lt-body" style="padding:8px 0"></div><p class="muted" style="font-size:11px;margin:0">병원 내부 선별용 점수표입니다. 국민건강보험공단의 장기요양 인정조사·등급 판정을 대신하지 않습니다.</p>',function(){
        var cur_t=tab||'B';
        function tabs(){
          $('lt-tabs').innerHTML='';
          [['B','일상생활(Barthel)'],['R','욕창(Braden)'],['M','낙상(Morse)'],['H','평가 이력']].forEach(function(t){var b=document.createElement('button');b.type='button';b.className='tab';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(cur_t===t[0]));b.textContent=t[1];b.onclick=function(){cur_t=t[0];tabs();body()};$('lt-tabs').appendChild(b)});
        }
        function body(){
          var el=$('lt-body');
          if(cur_t==='H'){
            var rows=S.ltc.filter(function(x){return x.chart===p.chart}).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:b.id-a.id});
            el.innerHTML='<div class="tbl-wrap" style="max-height:320px"><table style="min-width:560px"><thead><tr><th>평가일</th><th>도구</th><th>총점</th><th>판정</th><th>평가자</th><th>메모</th><th></th></tr></thead><tbody id="lt-h"></tbody></table></div><div class="empty" id="lt-he" hidden>평가 이력이 없습니다.</div>';
            rows.forEach(function(x){var tr=document.createElement('tr');tr.innerHTML='<td class="num">'+x.date+'</td><td>'+esc(LTC[x.type].name)+'</td><td class="num">'+x.total+'</td><td class="'+(x.level==='높은 위험'||x.level==='매우 높은 위험'||x.level==='완전 의존'||x.level==='심한 의존'?'abn':'')+'">'+esc(x.level)+'</td><td>'+esc(x.by||'')+'</td><td>'+esc(x.memo||'')+'</td><td></td>';
              var b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent='×';b.setAttribute('aria-label','삭제');b.onclick=function(){S.ltc=S.ltc.filter(function(y){return y!==x});persist();xRefresh();body()};tr.lastChild.appendChild(b);$('lt-h').appendChild(tr)});
            $('lt-he').hidden=rows.length>0;return;
          }
          var d=LTC[cur_t];
          el.innerHTML='<h4 class="x-h" style="margin-top:0">'+esc(d.name)+'</h4><div id="lt-items"></div><div class="lt-sum"><span>총점 <b id="lt-tot">0</b> / '+d.max+'</span><span>판정 <b id="lt-lv">-</b></span></div><div class="xf"><label>평가일<input id="lt-date" type="date" value="'+TODAY+'"></label><label>평가자<input id="lt-by" list="doc-list" autocomplete="off"></label><label style="grid-column:1/-1">메모<input id="lt-memo" autocomplete="off"></label></div><p class="muted" style="font-size:11px;margin:4px 0">'+esc(d.note)+'</p><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn blue" id="lt-ok" type="button">평가 저장</button></div>';
          Array.prototype.forEach.call(el.querySelectorAll('.xc'),function(b){b.onclick=xclose});
          var box=$('lt-items');
          d.items.forEach(function(it,i){var row=document.createElement('div');row.className='lt-row';row.innerHTML='<span class="lt-n">'+esc(it[0])+'</span><span class="lt-o">'+it[1].map(function(o){return '<label class="ck"><input type="radio" name="li'+i+'" value="'+o[0]+'">'+esc(o[1])+' <span class="muted">('+o[0]+')</span></label>'}).join('')+'</span>';box.appendChild(row)});
          function calc(){var t=0,n=0;d.items.forEach(function(it,i){var r=el.querySelector('[name=li'+i+']:checked');if(r){t+=parseInt(r.value,10);n++}});$('lt-tot').textContent=t;$('lt-lv').textContent=n===d.items.length?d.level(t):'(항목 '+n+'/'+d.items.length+' 선택)';return {t:t,n:n}}
          el.querySelectorAll('input[type=radio]').forEach(function(r){r.onchange=calc});
          $('lt-ok').onclick=function(){var c=calc();if(c.n<d.items.length){toast('모든 항목을 선택하세요 ('+c.n+'/'+d.items.length+')');return}
            S.ltc.push({id:S.nextId++,chart:p.chart,date:$('lt-date').value||TODAY,type:cur_t,total:c.t,level:d.level(c.t),by:$('lt-by').value.trim(),memo:$('lt-memo').value.trim()});persist();xRefresh();toast(d.name.split(' ')[0]+' 평가를 저장했습니다 ('+c.t+'점)');cur_t='H';tabs();body()};
        }
        tabs();body();
      },'xwide blue');
    });
  }

  /* ---------- 자료조회 ---------- */
  function xQPatient(){
    needPt(function(p){
      var vs=S.visits.filter(function(v){return v.chart===p.chart}).sort(function(a,b){return a.date<b.date?1:-1}),
          er=S.er.filter(function(e){return e.chart===p.chart}),su=S.surg.filter(function(s){return s.chart===p.chart}),ad=S.admissions.filter(function(a){return a.chart===p.chart}),
          lb=S.labs.filter(function(l){return l.chart===p.chart}).length,v=lastVit(p.chart),b=ltcLatest(p.chart,'B'),r=ltcLatest(p.chart,'R'),m=ltcLatest(p.chart,'M');
      function li(a,f){return a.length?'<ul class="qp-l">'+a.slice(0,8).map(function(x){return '<li>'+f(x)+'</li>'}).join('')+(a.length>8?'<li class="muted">외 '+(a.length-8)+'건</li>':'')+'</ul>':'<div class="muted">없음</div>'}
      xwin('환자 종합조회 · '+p.name,'<div class="qp"><div><h4 class="x-h">기본 정보</h4><div>'+esc(p.name)+' · '+p.chart+' · '+p.sex+'/'+age(p.birth)+'세 ('+esc(p.birth)+')</div><div>연락처 '+esc(p.tel||'-')+' · 보험 '+esc(p.ins)+' · 혈액형 '+esc(p.blood||'-')+'</div><div>알레르기 '+esc(p.alg||'-')+'</div><div>주소 '+esc(p.addr||'-')+'</div><div class="muted">'+esc(p.memo||'')+'</div></div><div><h4 class="x-h">외래 접수 ('+vs.length+')</h4>'+li(vs,function(x){return esc(x.date+' '+x.dept+' · '+x.doc+' · '+x.status)})+'</div><div><h4 class="x-h">응급 ('+er.length+')</h4>'+li(er,function(x){return esc(x.date+' '+x.time+(x.final?' · '+x.final:''))})+'</div><div><h4 class="x-h">수술 ('+su.length+')</h4>'+li(su,function(x){return esc(x.date+' '+x.name+(x.surgeon?' · '+x.surgeon:''))})+'</div><div><h4 class="x-h">입원 ('+ad.length+')</h4>'+li(ad,function(x){return esc(x.date+' ~ '+(x.dDate||'입원 중')+' · '+x.ward+' '+x.bed)})+'</div><div><h4 class="x-h">기타</h4><div>검사결과 '+lb+'건</div><div>최근 V/S '+(v?esc(v.dt.replace('T',' ')+' '+(v.bt!=null?v.bt+'℃ ':'')+(v.sbp!=null?v.sbp+'/'+v.dbp+' ':'')+(v.hr!=null?'P'+v.hr:'')):'-')+'</div><div>Barthel '+(b?b.total+'점 ('+esc(b.level)+')':'-')+' · Braden '+(r?r.total+'점 ('+esc(r.level)+')':'-')+' · Morse '+(m?m.total+'점 ('+esc(m.level)+')':'-')+'</div></div></div><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn" id="qp-go" type="button">외래기록 열기</button></div>',function(){$('qp-go').onclick=function(){xclose();showMod('opd')}},'xwide blue');
    });
  }
  function xQVisit(){
    var q={from:addDays(TODAY,-30),to:TODAY,dept:'',status:'',txt:''};
    xwin('외래 접수 조회','<div class="xf"><label>시작일<input id="qv-f" type="date" value="'+q.from+'"></label><label>종료일<input id="qv-t" type="date" value="'+q.to+'"></label><label>진료과<select id="qv-d"><option value="">전체</option>'+opt(DEPTS,'')+'</select></label><label>상태<select id="qv-s"><option value="">전체</option>'+opt(['대기','진료중','완료','수납'],'')+'</select></label><label>환자<input id="qv-q" placeholder="성명/차트번호" autocomplete="off"></label></div><div class="tbl-wrap" style="max-height:300px;margin-top:8px"><table style="min-width:760px"><thead><tr><th>접수일</th><th>시각</th><th>차트번호</th><th>성명</th><th>진료과</th><th>담당의</th><th>구분</th><th>주증상</th><th>상태</th></tr></thead><tbody id="qv-body"></tbody></table></div><div class="empty" id="qv-empty" hidden>조건에 맞는 접수가 없습니다.</div><div class="acts"><span class="muted" id="qv-n" style="margin-right:auto"></span><button class="btn xc" type="button">닫기</button><button class="btn" id="qv-csv" type="button">CSV 내보내기</button></div>',function(){
      function rows(){var f=$('qv-f').value,t=$('qv-t').value,d=$('qv-d').value,s=$('qv-s').value,x=$('qv-q').value.trim();
        return S.visits.filter(function(v){var p=pt(v.chart);return p&&(!f||v.date>=f)&&(!t||v.date<=t)&&(!d||v.dept===d)&&(!s||v.status===s)&&(!x||p.name.indexOf(x)>-1||p.chart.indexOf(x)>-1)}).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:(a.time<b.time?1:-1)})}
      function draw(){var r=rows(),tb=$('qv-body');tb.innerHTML='';r.forEach(function(v){var p=pt(v.chart),tr=document.createElement('tr');tr.innerHTML='<td class="num">'+v.date+'</td><td class="num">'+v.time+'</td><td class="num">'+v.chart+'</td><td>'+esc(p.name)+'</td><td>'+esc(v.dept)+'</td><td>'+esc(v.doc)+'</td><td>'+esc(v.type)+'</td><td>'+esc(v.memo||'')+'</td><td><span class="badge s-'+v.status+'">'+v.status+'</span></td>';tb.appendChild(tr)});$('qv-empty').hidden=r.length>0;$('qv-n').textContent=r.length+'건'}
      ['qv-f','qv-t','qv-d','qv-s'].forEach(function(id){$(id).onchange=draw});$('qv-q').oninput=draw;draw();
      $('qv-csv').onclick=function(){var r=rows();if(!r.length){toast('내보낼 내역이 없습니다');return}showCsv('외래접수',csvText(['접수일','시각','차트번호','성명','진료과','담당의','구분','주증상','상태'],r.map(function(v){return [v.date,v.time,v.chart,pt(v.chart).name,v.dept,v.doc,v.type,v.memo||'',v.status]})))};
    },'xwide blue');
  }
  function xQStat(){
    xwin('진료 통계','<div class="xf"><label>시작일<input id="qs-f" type="date" value="'+TODAY.slice(0,8)+'01"></label><label>종료일<input id="qs-t" type="date" value="'+TODAY+'"></label></div><div id="qs-out" style="margin-top:8px"></div><div class="acts"><button class="btn xc" type="button">닫기</button></div>',function(){
      function bars(title,m){var k=Object.keys(m).sort(function(a,b){return m[b]-m[a]}),mx=Math.max.apply(null,k.map(function(x){return m[x]}).concat([1]));
        return '<div><h4 class="x-h">'+title+'</h4>'+(k.length?k.map(function(x){return '<div class="bar-r"><span>'+esc(x)+'</span><i style="width:'+Math.round(m[x]/mx*100)+'%"></i><b>'+m[x]+'</b></div>'}).join(''):'<div class="muted">없음</div>')+'</div>'}
      function draw(){var f=$('qs-f').value,t=$('qs-t').value;function ok(d){return (!f||d>=f)&&(!t||d<=t)}
        var v=S.visits.filter(function(x){return ok(x.date)}),er=S.er.filter(function(x){return ok(x.date)}),su=S.surg.filter(function(x){return ok(x.date)}),ai=S.admissions.filter(function(x){return ok(x.date)}),ao=S.admissions.filter(function(x){return x.status==='퇴원'&&ok(x.dDate)});
        var bd={};v.forEach(function(x){bd[x.dept]=(bd[x.dept]||0)+1});var bt={};v.forEach(function(x){bt[x.type]=(bt[x.type]||0)+1});var bs={};su.forEach(function(x){bs[x.dept]=(bs[x.dept]||0)+1});
        $('qs-out').innerHTML='<div class="stat-k"><div><b>'+v.length+'</b>외래 접수</div><div><b>'+er.length+'</b>응급</div><div><b>'+su.length+'</b>수술</div><div><b>'+ai.length+'</b>입원</div><div><b>'+ao.length+'</b>퇴원</div></div><div class="qp">'+bars('진료과별 외래 접수',bd)+bars('초진·재진·예약',bt)+bars('진료과별 수술',bs)+'</div>'}
      $('qs-f').onchange=draw;$('qs-t').onchange=draw;draw();
    },'xwide blue');
  }

  /* ---------- 유틸리티 ---------- */
  function xBmi(){
    var v=cur&&lastVit(cur.chart);
    xwin('BMI·BSA 계산기','<div class="xf"><label>키 (cm)<input id="bm-h" inputmode="decimal" autocomplete="off"></label><label>몸무게 (kg)<input id="bm-w" inputmode="decimal" autocomplete="off" value="'+(v&&v.wt!=null?v.wt:'')+'"></label></div><div id="bm-out" class="calc-out">키와 몸무게를 입력하세요.</div><p class="muted" style="font-size:11px;margin:0">BMI 구분은 대한비만학회 아시아-태평양 기준(18.5 미만 저체중, 23 미만 정상, 25 미만 비만 전단계, 30 미만 1단계 비만, 35 미만 2단계, 35 이상 3단계)을 씁니다. BSA는 Mosteller 공식입니다.</p><div class="acts"><button class="btn xc" type="button">닫기</button></div>',function(){
      function calc(){var h=parseFloat($('bm-h').value),w=parseFloat($('bm-w').value);if(!(h>30&&h<260&&w>1&&w<500)){$('bm-out').textContent='키(30~260cm)와 몸무게(1~500kg)를 입력하세요.';return}
        var bmi=w/Math.pow(h/100,2),bsa=Math.sqrt(h*w/3600),c=bmi<18.5?'저체중':bmi<23?'정상':bmi<25?'비만 전단계(과체중)':bmi<30?'1단계 비만':bmi<35?'2단계 비만':'3단계 비만';
        $('bm-out').innerHTML='BMI <b>'+bmi.toFixed(1)+'</b> kg/m² · '+c+'<br>BSA <b>'+bsa.toFixed(2)+'</b> m²'}
      $('bm-h').oninput=calc;$('bm-w').oninput=calc;calc();$('bm-h').focus();
    },'wide blue');
  }
  function xDose(){
    var v=cur&&lastVit(cur.chart);
    xwin('체중별 약물 용량 계산','<div class="xf"><label>체중 (kg)<input id="ds-w" inputmode="decimal" value="'+(v&&v.wt!=null?v.wt:'')+'" autocomplete="off"></label><label>용량 (mg/kg/일)<input id="ds-d" inputmode="decimal" autocomplete="off"></label><label>하루 투여 횟수<input id="ds-n" inputmode="numeric" value="3"></label><label>1회 최대 용량 (mg, 선택)<input id="ds-m" inputmode="decimal" autocomplete="off"></label><label>약 농도 (mg/mL, 선택)<input id="ds-c" inputmode="decimal" autocomplete="off"></label></div><div id="ds-out" class="calc-out">값을 입력하세요.</div><p class="muted" style="font-size:11px;margin:0">단순 계산기입니다. 실제 처방 용량은 약품 허가사항과 처방 기준을 확인하세요.</p><div class="acts"><button class="btn xc" type="button">닫기</button></div>',function(){
      function calc(){var w=parseFloat($('ds-w').value),d=parseFloat($('ds-d').value),n=parseInt($('ds-n').value,10),mx=parseFloat($('ds-m').value),c=parseFloat($('ds-c').value);
        if(!(w>0&&d>0&&n>=1)){$('ds-out').textContent='체중, 용량, 투여 횟수를 입력하세요.';return}
        var day=w*d,one=day/n,cap=!isNaN(mx)&&mx>0&&one>mx;if(cap)one=mx;
        $('ds-out').innerHTML='하루 총량 <b>'+(Math.round(day*10)/10)+'</b> mg · 1회 <b>'+(Math.round(one*10)/10)+'</b> mg × '+n+'회'+(cap?' <span class="abn">(1회 최대 용량으로 제한됨 → 하루 '+(Math.round(one*n*10)/10)+' mg)</span>':'')+(c>0?'<br>1회 시럽·액상 용량 <b>'+(Math.round(one/c*10)/10)+'</b> mL':'')}
      ['ds-w','ds-d','ds-n','ds-m','ds-c'].forEach(function(id){$(id).oninput=calc});calc();
    },'wide blue');
  }
  function xDays(){
    xwin('날짜·재원일수 계산','<div class="xf"><label>시작일<input id="dy-a" type="date" value="'+TODAY+'"></label><label>종료일<input id="dy-b" type="date" value="'+TODAY+'"></label></div><div id="dy-o1" class="calc-out"></div><div class="xf"><label>기준일<input id="dy-c" type="date" value="'+TODAY+'"></label><label>더할 일수 (뺄 때는 음수)<input id="dy-n" inputmode="numeric" value="7"></label></div><div id="dy-o2" class="calc-out"></div><div class="acts"><button class="btn xc" type="button">닫기</button></div>',function(){
      function c1(){var a=$('dy-a').value,b=$('dy-b').value;if(!a||!b){$('dy-o1').textContent='';return}var d=daysBetween(a,b);$('dy-o1').innerHTML='두 날짜 사이 <b>'+d+'</b>일 ('+Math.floor(Math.abs(d)/7)+'주 '+Math.abs(d)%7+'일) · 양 끝 날짜를 모두 포함하면 <b>'+(Math.abs(d)+1)+'</b>일'}
      function c2(){var a=$('dy-c').value,n=parseInt($('dy-n').value,10);if(!a||isNaN(n)){$('dy-o2').textContent='';return}var r=addDays(a,n);$('dy-o2').innerHTML='결과 날짜 <b>'+r+'</b> ('+['일','월','화','수','목','금','토'][new Date(r+'T00:00:00').getDay()]+'요일)'}
      ['dy-a','dy-b'].forEach(function(id){$(id).onchange=c1});['dy-c','dy-n'].forEach(function(id){$(id).oninput=c2;$(id).onchange=c2});c1();c2();
    },'wide blue');
  }
  function xMemo(){
    xwin('메모장','<textarea id="mm-t" style="min-height:260px" placeholder="자유롭게 적어 두세요. 입력하면 자동으로 저장됩니다."></textarea><div class="muted" id="mm-s" style="font-size:11px"></div><div class="acts"><button class="btn xc" type="button">닫기</button></div>',function(){
      $('mm-t').value=S.memo;var t=null;$('mm-t').oninput=function(){S.memo=$('mm-t').value;$('mm-s').textContent='저장 중…';clearTimeout(t);t=setTimeout(function(){persist();$('mm-s').textContent='저장됨'},400)};$('mm-t').focus();
    },'xwide blue');
  }

  /* ---------- 도움말 ---------- */
  function hGuide(){
    xwin('사용 안내','<div class="help"><h4 class="x-h">기본 흐름</h4><ol><li>상단의 <b>+ 환자등록</b>으로 환자를 등록하거나 검색합니다.</li><li><b>외래기록</b>에서 접수정보를 입력하고 접수합니다. 접수현황에서 호출·진료완료·수납완료를 바꿉니다.</li><li><b>응급기록</b>에서 영상검사, 검사결과, 처방, 진료기록, 통증평가, 사망진단서를 작성합니다.</li><li><b>수술기록</b>에서 수술 서식을 쓰고 <b>수술그림</b> 창에서 참고 그림을 그린 뒤 <b>작 성</b>을 누릅니다.</li></ol><h4 class="x-h">입원 관련</h4><ol><li><b>입퇴원관리</b>에서 입원 등록, 퇴원 처리, 병상 이동을 합니다. 병상 현황의 빈 병상을 누르면 그 자리로 입원 등록 창이 열립니다.</li><li><b>입원환자</b>에서 입원 중인 환자를 한눈에 보고 간호기록, V I T A L, T.P.R., 검사결과, 장기요양평가로 바로 이동합니다.</li><li><b>V I T A L</b>은 혈압·맥박·호흡·체온·SpO₂·체중을 기록하고 추이를 그래프로 봅니다. <b>T.P.R.</b>은 같은 기록을 7일 도표로 보여 줍니다.</li></ol><h4 class="x-h">청구·설정</h4><ol><li><b>청구자료</b>는 접수·처방·수술·영상·입원료를 합산한 간이 정산입니다. 금액은 환경설정에서 바꿉니다.</li><li>데이터는 이 브라우저에만 저장됩니다. <b>환경설정 > 데이터 백업</b>으로 주기적으로 보관하세요.</li></ol></div><div class="acts"><button class="btn xc" type="button">닫기</button></div>',null,'xwide blue');
  }
  function hKey(){
    xwin('단축키','<table style="min-width:0"><tbody><tr><td><b>F1</b></td><td>사용 안내</td></tr><tr><td><b>F2</b></td><td>환자 선택 창 (성명·차트번호 검색)</td></tr><tr><td><b>Esc</b></td><td>열려 있는 창·메뉴 닫기</td></tr><tr><td><b>Enter</b></td><td>환자 검색창에서 조회, 글자 도구에서 입력 확정</td></tr></tbody></table><div class="acts"><button class="btn xc" type="button">닫기</button></div>',null,'wide blue');
  }
  function hAbout(){
    var h=S.settings.hospital;
    xwin('프로그램 정보','<div class="calc-out"><b>MediChart</b><br>외래·응급·수술·입원 기록 연습용 EMR<br>데이터 저장: 이 브라우저(localStorage)<br>환자 '+S.patients.length+'명 · 외래 접수 '+S.visits.length+'건 · 입원 '+S.admissions.length+'건'+(h&&h.name?'<br>병원: '+esc(h.name):'')+'</div><p class="muted" style="font-size:11px;margin:0">실제 진료 기록 보관용 시스템이 아닙니다. 개인정보와 의료정보를 다룰 때는 관련 법령에 맞는 시스템을 쓰세요.</p><div class="acts"><button class="btn xc" type="button">닫기</button></div>',null,'wide blue');
  }

  buildMenus();applyBrand();applyZoom();
  /* 처음에는 빈 화면: 탭을 고르면 열림 */
  ['er','opd','op'].concat(XMODS).forEach(function(k){$('mod-'+k).hidden=true});mod='';

  /* =================== 문서작성 탭 =================== */
  var DC_W=794,DC_H=1123;
  var DC={id:null,title:'',content:'',tpl:'',pages:[''],pi:0,zoom:100,tool:'select',pen:'#14202e',dirty:false,built:false,fitted:false,arm:null,armT:null,sel:null};
  var DC_FONTS=['맑은 고딕','바탕','돋움','굴림','나눔고딕','Arial','Times New Roman','Courier New'];
  var DC_SIZES=[10,12,14,16,18,20,24,28,32,40];
  var DC_TPLS=['진단서','소견서','입퇴원 확인서','진료확인서','수술 동의서','마취 동의서','처방 안내문','진료의뢰서'];
  var DC_CMD={b:'bold',i:'italic',u:'underline',s:'strikeThrough',sup:'superscript',sub:'subscript',ul:'insertUnorderedList',ol:'insertOrderedList',out:'outdent',ind:'indent',l:'justifyLeft',c:'justifyCenter',r:'justifyRight',j:'justifyFull',clr:'removeFormat'};
  var DC_ICON={
    select:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3l12 8-5.5 1.3L9.5 18z" fill="currentColor"/></svg>',
    note:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v11H9l-5 4z M12 7v5 M9.5 9.5h5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    hl:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 15l8-8 3 3-8 8H7z M4 21h16" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    pen:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20c3-1 5-3 8-7M14 5l5 5-9 9-5 1 1-5z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    box:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2"/><text x="12" y="17" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor">A</text></svg>',
    erase:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15l8-8 6 6-5 5H8z M11 20h9" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>'
  };
  var DC_TOOLS=[['select','선택·글 입력'],['note','메모 붙이기'],['hl','형광펜 (글자를 드래그)'],['pen','펜으로 그리기'],['box','텍스트 상자'],['erase','지우개 (그림·메모·상자를 클릭)']];

  function dcBlank(){return '<div class="dtxt"><div class="dtin" contenteditable="true" spellcheck="false"></div></div><svg class="dsvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+DC_W+' '+DC_H+'"></svg>'}
  function dcSan(h){
    var t=document.createElement('template');t.innerHTML=String(h||'');
    Array.prototype.forEach.call(t.content.querySelectorAll('script,iframe,object,embed,link,meta,style,form,base,frame'),function(e){e.parentNode.removeChild(e)});
    Array.prototype.forEach.call(t.content.querySelectorAll('*'),function(e){Array.prototype.slice.call(e.attributes).forEach(function(a){var n=a.name.toLowerCase();if(n.indexOf('on')===0||(/^(href|src|xlink:href|action|formaction)$/.test(n)&&/^\s*(javascript|data):/i.test(a.value)))e.removeAttribute(a.name)})});
    return t.innerHTML;
  }
  function dcRec(id){return S.docs.filter(function(d){return d.id===id})[0]}
  function dcIn(){return $('dp').querySelector('.dtin')}
  function dcDirty(on){DC.dirty=on!==false;if($('dc-dirty'))$('dc-dirty').hidden=!DC.dirty;dcOver()}
  function dcOver(){var t=$('dp')&&$('dp').querySelector('.dtxt');if($('dc-warn'))$('dc-warn').hidden=!(t&&t.scrollHeight>t.clientHeight+2)}
  function dcGuard(key,fn){
    if(DC.dirty&&DC.arm!==key){DC.arm=key;clearTimeout(DC.armT);DC.armT=setTimeout(function(){DC.arm=null},4000);toast('저장하지 않은 변경이 있습니다. 한 번 더 누르면 계속합니다');return}
    DC.arm=null;fn();
  }

  /* 선택 영역 기억 (글꼴 칸 등을 눌러도 서식이 적용되도록) */
  document.addEventListener('selectionchange',function(){
    if(!DC.built)return;var s=window.getSelection?window.getSelection():null;if(!s||!s.rangeCount)return;
    var n=s.anchorNode;n=n&&(n.nodeType===1?n:n.parentNode);
    if(n&&n.closest&&n.closest('[contenteditable=true]')&&$('dp').contains(n))DC.sel=s.getRangeAt(0).cloneRange();
  });
  function dcRestore(){
    var n=DC.sel&&DC.sel.startContainer,el=n&&(n.nodeType===1?n:n.parentNode),ed=el&&el.closest&&el.closest('[contenteditable=true]');
    if(!ed||!$('dp').contains(ed)){ed=dcIn();var r=document.createRange();r.selectNodeContents(ed);r.collapse(false);DC.sel=r}
    ed.focus();var s=window.getSelection();s.removeAllRanges();s.addRange(DC.sel);
  }
  function dcRun(c,v){
    try{dcRestore();document.execCommand('styleWithCSS',false,true);document.execCommand(c,false,v==null?null:v)}catch(e){toast('이 브라우저에서는 서식을 적용할 수 없습니다');return}
    dcDirty();
  }
  function dcSize(px){
    try{
      dcRestore();document.execCommand('styleWithCSS',false,false);document.execCommand('fontSize',false,'7');
      Array.prototype.slice.call($('dp').querySelectorAll('font[size="7"]')).forEach(function(f){var s=document.createElement('span');s.style.fontSize=px+'px';while(f.firstChild)s.appendChild(f.firstChild);f.parentNode.replaceChild(s,f)});
    }catch(e){toast('이 브라우저에서는 글자 크기를 바꿀 수 없습니다');return}
    dcDirty();
  }
  function dcStep(d){
    try{dcRestore()}catch(e){return}
    var s=window.getSelection(),n=s.anchorNode;n=n&&(n.nodeType===1?n:n.parentNode);
    var fz=n?parseFloat(getComputedStyle(n).fontSize):16;if(isNaN(fz))fz=16;
    dcSize(Math.max(8,Math.min(72,Math.round(fz)+d)));
  }
  function dcPage(k,v){
    var t=$('dp').querySelector('.dtxt'),i=dcIn();if(!t||!i)return;
    if(k==='ls')i.style.lineHeight=v;
    else if(k==='cols'){i.style.columnCount=v==='1'?'':v;i.style.columnGap=v==='1'?'':'24px'}
    else if(k==='wm'){i.style.writingMode=v==='h'?'':'vertical-rl';i.style.width=v==='h'?'':'auto';i.style.height=v==='h'?'':'100%'}
    else if(k==='va')t.style.justifyContent=v;
    dcDirty();
  }
  function dcSyncFmt(){
    var t=$('dp').querySelector('.dtxt'),i=dcIn();if(!t||!i)return;
    $('dc-ls').value=i.style.lineHeight||'1.6';$('dc-cols').value=i.style.columnCount||'1';$('dc-wm').value=i.style.writingMode?'v':'h';$('dc-va').value=t.style.justifyContent||'flex-start';
  }

  /* 도구 */
  function dcSetTool(t){
    DC.tool=t;$('dp').setAttribute('data-tool',t);
    Array.prototype.forEach.call(document.querySelectorAll('.dc-t'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-tool')===t))});
    if(t==='hl'){var s=window.getSelection();if(DC.sel&&!DC.sel.collapsed)dcRun('hiliteColor',$('dc-hc').value)}
  }
  function dcPt(e){
    var d=$('dp'),r=d.getBoundingClientRect(),k=r.width/(d.offsetWidth||DC_W);if(!k||!isFinite(k))k=1;
    return [(e.clientX-r.left)/k,(e.clientY-r.top)/k];
  }
  function dcPen(P0){
    var svg=$('dp').querySelector('.dsvg'),p=document.createElementNS('http://www.w3.org/2000/svg','path'),d='M'+P0[0].toFixed(1)+' '+P0[1].toFixed(1),n=1;
    p.setAttribute('fill','none');p.setAttribute('stroke',DC.pen);p.setAttribute('stroke-width','2.5');p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');p.setAttribute('d',d);svg.appendChild(p);
    function mv(e){var q=dcPt(e);d+=' L'+q[0].toFixed(1)+' '+q[1].toFixed(1);n++;p.setAttribute('d',d)}
    function up(){window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);if(n<2)p.setAttribute('d',d+' L'+(P0[0]+.1).toFixed(1)+' '+P0[1].toFixed(1));dcDirty()}
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  }
  function dcMove(o,e){
    var P=dcPt(e),l0=parseFloat(o.style.left)||0,t0=parseFloat(o.style.top)||0;
    function mv(ev){var Q=dcPt(ev);o.style.left=Math.max(0,Math.min(DC_W-40,l0+Q[0]-P[0]))+'px';o.style.top=Math.max(0,Math.min(DC_H-30,t0+Q[1]-P[1]))+'px'}
    function up(){window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);dcDirty()}
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);
  }
  function dcAddObj(kind,P){
    var d=document.createElement('div'),w=kind==='note'?170:200,h=kind==='note'?100:70;d.className='dobj '+(kind==='note'?'dnote':'dbox');
    d.style.left=Math.max(0,Math.min(DC_W-w,P[0]))+'px';d.style.top=Math.max(0,Math.min(DC_H-h,P[1]))+'px';d.style.width=w+'px';d.style.minHeight=h+'px';
    d.innerHTML='<span class="dgrip" contenteditable="false" title="끌어서 이동">⠿ '+(kind==='note'?'메모':'상자')+'</span><div class="dob" contenteditable="true"></div>';
    $('dp').appendChild(d);dcSetTool('select');dcDirty();var b=d.querySelector('.dob');if(b.focus)b.focus();
  }

  /* 쪽 */
  function dcLoadPage(){
    var h=dcSan(DC.pages[DC.pi]||'');$('dp').innerHTML=h;if(!dcIn())$('dp').innerHTML=dcBlank();
    $('dc-pg').value=DC.pi+1;$('dc-tot').textContent=DC.pages.length;DC.sel=null;dcSyncFmt();dcOver();
  }
  function dcGo(i){DC.pages[DC.pi]=$('dp').innerHTML;DC.pi=Math.max(0,Math.min(DC.pages.length-1,i));dcLoadPage()}
  function dcZoom(z){
    z=Math.max(30,Math.min(300,Math.round(z)||100));DC.zoom=z;var k=z/100;
    $('dc-sc').style.transform='scale('+k+')';$('dc-sizer').style.width=Math.round(DC_W*k)+'px';$('dc-sizer').style.height=Math.round(DC_H*k)+'px';$('dc-zv').value=z;
  }
  function dcArmBtn(key,btn,label,fn){
    if(DC.arm!==key){DC.arm=key;btn.textContent='한 번 더';clearTimeout(DC.armT);DC.armT=setTimeout(function(){DC.arm=null;btn.textContent=label},3000);return}
    DC.arm=null;btn.textContent=label;fn();
  }

  /* 문서 */
  function dcNewDoc(){
    DC.id=null;DC.title='';DC.content='';DC.tpl='';DC.pages=[''];DC.pi=0;DC.dirty=false;
    if(DC.built){$('dc-title').value='';$('dc-content').value='';dcLoadPage();dcList();$('dc-dirty').hidden=true}
  }
  function dcLoad(r){
    DC.id=r.id;DC.tpl=r.tpl||'';DC.pages=(r.pages&&r.pages.length?r.pages:['']).map(dcSan);DC.pi=0;DC.dirty=false;
    $('dc-title').value=r.title||'';$('dc-content').value=r.content||'';dcLoadPage();dcList();$('dc-dirty').hidden=true;
  }
  function dcList(){
    var el=$('dc-list');if(!el)return;el.innerHTML='';
    var rows=S.docs.filter(function(d){return !cur||!d.chart||d.chart===cur.chart}).sort(function(a,b){return a.dt<b.dt?1:-1});
    rows.forEach(function(r){var b=document.createElement('button');b.type='button';b.className='dc-li';if(r.id===DC.id)b.setAttribute('aria-current','true');
      b.innerHTML='<b></b><span></span>';b.firstChild.textContent=r.title;var pp=r.chart?pt(r.chart):null;b.lastChild.textContent=r.dt.slice(0,10).replace(/-/g,'.')+' · '+r.pages.length+'쪽 · '+(r.chart?(pp?pp.name:'(삭제된 환자)'):'환자 미지정');
      b.onclick=function(){dcGuard('load'+r.id,function(){dcLoad(r)})};el.appendChild(b)});
    if(!rows.length)el.innerHTML='<div class="muted" style="padding:4px">'+(cur?'이 환자의 저장된 문서가 없습니다.':'저장된 문서가 없습니다.')+'</div>';
  }
  function dcSave(asNew){
    var title=$('dc-title').value.trim();
    if(!title){toast('제목을 입력하세요');$('dc-title').focus();return}
    DC.pages[DC.pi]=$('dp').innerHTML;
    var r=!asNew&&DC.id?dcRec(DC.id):null;
    if(asNew&&DC.id){var o0=dcRec(DC.id);if(o0&&o0.title===title){title+=' (복사)';$('dc-title').value=title}}
    if(r&&r.title!==title)r=null;/* 제목을 바꾸면 별도의 새 문서로 저장 */
    if(r&&cur&&r.chart&&r.chart!==cur.chart)r=null;
    var chart=cur?cur.chart:(r?r.chart:'');
    var o={id:r?r.id:S.nextId++,chart:chart,title:title,content:$('dc-content').value.trim(),tpl:DC.tpl,pages:DC.pages.map(dcSan),dt:nowLocal()};
    if(r)S.docs[S.docs.indexOf(r)]=o;else S.docs.push(o);
    DC.id=o.id;persist()||toast('브라우저 저장 공간이 부족합니다. 백업을 받고 오래된 문서를 정리하세요');DC.dirty=false;$('dc-dirty').hidden=true;dcList();
    toast(chart?(pt(chart)?pt(chart).name+' 환자 문서로 ':'')+(r?'저장했습니다':'새로 저장했습니다'):'문서를 '+(r?'저장했습니다':'새로 저장했습니다')+' (환자 미지정)');
  }
  function dcDelDoc(){
    var r=DC.id&&dcRec(DC.id);
    if(DC.arm!=='del'){DC.arm='del';clearTimeout(DC.armT);DC.armT=setTimeout(function(){DC.arm=null;$('dc-del').textContent='삭제'},3000);$('dc-del').textContent='한 번 더';toast(r?'저장된 문서가 삭제됩니다. 한 번 더 누르세요':'작성 중인 내용이 비워집니다. 한 번 더 누르세요');return}
    DC.arm=null;$('dc-del').textContent='삭제';
    if(r){S.docs=S.docs.filter(function(d){return d!==r});persist()}
    dcNewDoc();toast(r?'문서를 삭제했습니다':'새 문서로 비웠습니다');
  }
  function dcPrint(){
    DC.pages[DC.pi]=$('dp').innerHTML;
    var a=document.createElement('div');a.id='print-area';
    a.innerHTML=DC.pages.map(function(h){return '<div class="dpage dprint">'+dcSan(h)+'</div>'}).join('');
    Array.prototype.forEach.call(a.querySelectorAll('[contenteditable]'),function(e){e.removeAttribute('contenteditable')});
    document.body.appendChild(a);document.body.classList.add('printing');
    function done(){document.body.classList.remove('printing');if(a.parentNode)a.parentNode.removeChild(a);window.removeEventListener('afterprint',done)}
    window.addEventListener('afterprint',done);
    var t0=Date.now();
    try{window.print()}catch(e){done();toast('이 화면에서는 인쇄가 막혀 있습니다. 내려받은 MediChart.html에서 사용하세요');return}
    if(Date.now()-t0<150){done();toast('이 화면에서는 인쇄가 막혀 있을 수 있습니다. 내려받은 MediChart.html에서 사용하세요')}
  }

  /* 문서 양식 (초안) */
  function dcTpl(k){
    var p=cur,h=S.settings.hospital||{},hn=esc(h.name||'(병원명)'),B='__________',nm=p?esc(p.name):B,bd=p?esc(p.birth):B,sx=p?esc(p.sex):'__',ch=p?esc(p.chart):B;
    var a=p&&(inpOf(p.chart)||S.admissions.filter(function(x){return x.chart===p.chart}).sort(function(x,y){return x.date<y.date?1:-1})[0]);
    var d=TODAY.slice(0,4)+'년 '+(+TODAY.slice(5,7))+'월 '+(+TODAY.slice(8,10))+'일';
    function ttl(t){return '<div style="text-align:center;font-size:30px;font-weight:700;letter-spacing:.3em;margin:30px 0 28px">'+t+'</div>'}
    function ln(l,v){return '<div style="margin:10px 0"><b>'+l+'</b> : '+(v||B)+'</div>'}
    function para(t){return '<div style="margin:18px 0;line-height:1.9">'+t+'</div>'}
    function ft(){return '<div style="text-align:center;margin-top:56px">'+d+'</div><div style="text-align:center;margin-top:24px;font-size:20px;font-weight:700">'+hn+'</div><div style="text-align:right;margin-top:26px">담당의 : ____________ (서명)</div>'}
    var who=ln('환자 성명',nm)+ln('생년월일 / 성별',bd+' / '+sx)+ln('차트번호',ch);
    switch(k){
      case '진단서':return ttl('진 단 서')+who+ln('병명',a&&a.dx?esc(a.dx):'')+ln('발병일','')+ln('진단일',d)+ln('향후 치료 의견','')+ln('용도','')+para('위와 같이 진단함.')+ft();
      case '소견서':return ttl('소 견 서')+who+ln('진단명',a&&a.dx?esc(a.dx):'')+'<div style="margin:16px 0"><b>소견</b> :</div><div style="min-height:300px"></div>'+ft();
      case '입퇴원 확인서':return ttl('입 퇴 원 확 인 서')+who+ln('병동 / 병상',a?esc(a.ward+' '+a.bed):'')+ln('입원일',a?esc(a.date):'')+ln('퇴원일',a&&a.dDate?esc(a.dDate):'')+ln('진단명',a&&a.dx?esc(a.dx):'')+para('위 환자는 위 기간 동안 본원에 입원(퇴원)하였음을 확인함.')+ft();
      case '진료확인서':return ttl('진 료 확 인 서')+who+ln('진료 기간','')+ln('진료과','')+ln('진료 내용','')+para('위와 같이 진료받았음을 확인함.')+ft();
      case '수술 동의서':return ttl('수 술 동 의 서')+who+ln('진단명',a&&a.dx?esc(a.dx):'')+ln('수술명','')+ln('예정일','')+ln('마취 방법','')+para('1. 수술의 필요성, 방법, 예상되는 경과와 합병증, 대체 가능한 치료에 대해 의료진에게 충분한 설명을 들었습니다.')+para('2. 설명 내용을 이해하였으며, 질문할 기회가 있었습니다.')+para('3. 위 수술에 동의합니다.')+'<div style="margin-top:50px">'+d+'</div><div style="margin-top:20px">환자(또는 법정대리인) : ____________ (서명)　관계 : ________</div><div style="margin-top:16px">설명 의사 : ____________ (서명)</div>';
      case '마취 동의서':return ttl('마 취 동 의 서')+who+ln('수술명','')+ln('마취 방법','')+ln('과거 마취 경험 / 알레르기',p&&p.alg?esc(p.alg):'')+para('마취의 방법, 위험성과 합병증, 금식 등 주의사항에 대해 설명을 듣고 이해하였으며 마취에 동의합니다.')+'<div style="margin-top:50px">'+d+'</div><div style="margin-top:20px">환자(또는 법정대리인) : ____________ (서명)</div><div style="margin-top:16px">마취 담당의 : ____________ (서명)</div>';
      case '처방 안내문':return ttl('처 방 안 내 문')+who+ln('진료일',d)+'<div style="margin:16px 0"><b>복약 안내</b></div><div style="min-height:150px">· 약 이름 / 용법 / 기간 :</div><div style="margin:16px 0"><b>주의사항</b></div><div style="min-height:100px">·</div><div style="margin:16px 0"><b>다음 진료</b> : ____________</div><div style="text-align:center;margin-top:30px;font-weight:700">'+hn+'</div>';
      case '진료의뢰서':return ttl('진 료 의 뢰 서')+ln('수신 (의뢰 기관·과)','')+who+ln('진단명',a&&a.dx?esc(a.dx):'')+'<div style="margin:16px 0"><b>의뢰 사유 및 경과</b> :</div><div style="min-height:260px"></div>'+ft();
    }
    return '';
  }
  function dcApplyTpl(k){
    var i=dcIn(),has=i.textContent.trim().length>0,html=dcTpl(k);
    function put(rep){if(rep)i.innerHTML=html;else i.insertAdjacentHTML('beforeend',html);DC.tpl=k;if(!$('dc-title').value.trim())$('dc-title').value=k+(cur?' - '+cur.name:'');dcDirty()}
    if(!has){put(true);return}
    xwin('문서양식 적용 · '+k,'<p style="margin:0">현재 쪽에 이미 내용이 있습니다. 어떻게 할까요?</p><div class="acts"><button class="btn xc" type="button">취소</button><button class="btn" id="tp-add" type="button">끝에 추가</button><button class="btn red" id="tp-rep" type="button">내용을 양식으로 교체</button></div>',function(){
      $('tp-add').onclick=function(){put(false);xclose()};$('tp-rep').onclick=function(){put(true);xclose()};
    },'wide blue');
  }

  /* 화면 만들기 */
  function dcBuild(){
    var fonts=DC_FONTS.map(function(f){return '<option value="'+f+'">'+f+'</option>'}).join('');
    var sizes=DC_SIZES.map(function(n){return '<option value="'+n+'"'+(n===16?' selected':'')+'>'+n+'</option>'}).join('');
    var tools=DC_TOOLS.map(function(t){return '<button type="button" class="dc-t" data-tool="'+t[0]+'" title="'+t[1]+'" aria-label="'+t[1]+'" aria-pressed="'+(t[0]==='select')+'">'+DC_ICON[t[0]]+'</button>'}).join('');
    var pc=[['#14202e','검정'],['#d02a1b','빨강'],['#1c5fae','파랑']].map(function(c){return '<button type="button" class="dc-pc" data-pc="'+c[0]+'" title="펜 색: '+c[1]+'" aria-label="펜 색 '+c[1]+'" style="background:'+c[0]+'"></button>'}).join('');
    $('mod-doc').innerHTML=
    '<div class="dc">'+
      '<aside class="dc-l"><div class="dc-hd">문서정보</div><div class="dc-lb">'+
        '<div class="muted" id="dc-pt" style="font-size:12px"></div>'+
        '<label class="dc-f">제목 :<input id="dc-title" autocomplete="off"></label>'+
        '<label class="dc-f">내용 :<textarea id="dc-content" style="min-height:90px" placeholder="문서 요약이나 메모"></textarea></label>'+
        '<div class="dc-st"><span id="dc-dirty" hidden>● 저장하지 않은 변경</span><span id="dc-warn" class="abn" hidden>내용이 쪽을 넘었습니다. 새 페이지를 추가하세요</span></div>'+
        '<h5 class="dc-h5">저장된 문서</h5><div id="dc-list" class="dc-list"></div>'+
        '<select id="dc-tplsel" class="dc-tpl" aria-label="문서양식"><option value="">문서양식 ▼</option>'+DC_TPLS.map(function(t){return '<option>'+t+'</option>'}).join('')+'</select>'+
        '<div class="muted" style="font-size:11px">양식은 초안입니다. 실제 발급 서류는 병원 양식과 규정을 따르세요.</div>'+
      '</div></aside>'+
      '<section class="dc-mid" id="dc-mid"><div class="dc-tools" id="dc-tools" role="toolbar" aria-label="문서 도구">'+tools+'<div class="dc-pcs">'+pc+'</div></div>'+
        '<div class="dc-area"><div class="dc-sizer" id="dc-sizer"><div class="dc-sc" id="dc-sc"><div class="dpage" id="dp" data-tool="select"></div></div></div></div></section>'+
      '<aside class="dc-r" id="dc-r"><div class="dc-hd">문서관리</div><div class="dc-rb">'+
        '<h5>글꼴</h5><div class="dc-row"><select id="dc-ff" aria-label="글꼴">'+fonts+'</select><select id="dc-fs" aria-label="글자 크기" style="width:58px">'+sizes+'</select><button type="button" data-dc="fs+" title="글자 크게">가˄</button><button type="button" data-dc="fs-" title="글자 작게">가˅</button></div>'+
        '<h5>글씨 편집</h5><div class="dc-row"><button type="button" data-dc="b" title="굵게"><b>가</b></button><button type="button" data-dc="i" title="기울임"><i>가</i></button><button type="button" data-dc="u" title="밑줄"><u>가</u></button><button type="button" data-dc="s" title="취소선"><s>가</s></button><button type="button" data-dc="sup" title="위 첨자">가²</button><button type="button" data-dc="sub" title="아래 첨자">가₂</button><button type="button" data-dc="clr" title="서식 지우기">Tx</button></div>'+
        '<div class="dc-row"><button type="button" data-dc="hl" title="형광펜 적용">형광</button><input type="color" id="dc-hc" value="#ffff00" aria-label="형광펜 색"><button type="button" data-dc="hl0" title="형광펜 해제">해제</button><button type="button" data-dc="fc" title="글자색 적용">글자색</button><input type="color" id="dc-tc" value="#000000" aria-label="글자 색"></div>'+
        '<h5>위치</h5><div class="dc-row"><button type="button" data-dc="ul" title="글머리 기호">• ≡</button><button type="button" data-dc="ol" title="번호 목록">1. ≡</button><button type="button" data-dc="out" title="내어쓰기">⇤</button><button type="button" data-dc="ind" title="들여쓰기">⇥</button><select id="dc-ls" aria-label="줄 간격" style="width:70px"><option value="1.2">1.2</option><option value="1.6" selected>1.6</option><option value="2">2.0</option><option value="2.5">2.5</option></select></div>'+
        '<div class="dc-row"><button type="button" data-dc="l" title="왼쪽 정렬">좌</button><button type="button" data-dc="c" title="가운데 정렬">중</button><button type="button" data-dc="r" title="오른쪽 정렬">우</button><button type="button" data-dc="j" title="양쪽 정렬">양</button><select id="dc-cols" aria-label="단" style="width:70px"><option value="1">1단</option><option value="2">2단</option><option value="3">3단</option></select></div>'+
        '<div class="dc-row"><span>텍스트 방향</span><select id="dc-wm" aria-label="텍스트 방향"><option value="h">가로</option><option value="v">세로</option></select></div>'+
        '<div class="dc-row"><span>텍스트 맞춤</span><select id="dc-va" aria-label="텍스트 맞춤"><option value="flex-start">위</option><option value="center">가운데</option><option value="flex-end">아래</option></select></div>'+
        '<button type="button" class="dcb dcb-g" id="dc-save">저장</button><button type="button" class="dcb dcb-r" id="dc-del">삭제</button><button type="button" class="dcb dcb-b" id="dc-print">인쇄</button><button type="button" class="dcb dcb-y" id="dc-new">새로작성</button><button type="button" class="dcb dcb-s" id="dc-saveas" title="지금 내용을 별도의 새 문서로 저장">다른 문서로 저장</button>'+
      '</div></aside>'+
    '</div>'+
    '<div class="dc-bar"><button type="button" class="dc-ar" id="dc-prev" aria-label="이전 쪽">◀</button><input id="dc-pg" inputmode="numeric" aria-label="쪽 번호" style="width:52px;text-align:center"><span>/ <b id="dc-tot">1</b></span><button type="button" class="dc-ar" id="dc-next" aria-label="다음 쪽">▶</button><button type="button" class="dc-ar" id="dc-refresh" title="저장된 상태로 다시 불러오기" aria-label="다시 불러오기">↻</button>'+
      '<button type="button" class="dcb dcb-y dcs" id="dc-addp">새 페이지</button><button type="button" class="dcb dcb-g dcs" id="dc-delp">페이지 삭제</button><button type="button" class="dcb dcb-r dcs" id="dc-dupp">페이지 복제</button><span class="sp"></span>'+
      '<button type="button" class="dc-ar" id="dc-zi" aria-label="확대">＋</button><input id="dc-zv" inputmode="numeric" aria-label="배율" style="width:56px;text-align:center"><span>%</span><button type="button" class="dc-ar" id="dc-zo" aria-label="축소">－</button></div>';

    var keep=function(e){if(e.target.closest&&e.target.closest('button'))e.preventDefault()};
    $('dc-r').addEventListener('mousedown',keep);$('dc-tools').addEventListener('mousedown',keep);
    Array.prototype.forEach.call($('dc-r').querySelectorAll('[data-dc]'),function(b){b.onclick=function(){
      var k=b.getAttribute('data-dc');
      if(DC_CMD[k])dcRun(DC_CMD[k]);else if(k==='fs+')dcStep(2);else if(k==='fs-')dcStep(-2);
      else if(k==='hl')dcRun('hiliteColor',$('dc-hc').value);else if(k==='hl0')dcRun('hiliteColor','transparent');else if(k==='fc')dcRun('foreColor',$('dc-tc').value);
    }});
    $('dc-ff').onchange=function(){dcRun('fontName',this.value)};
    $('dc-fs').onchange=function(){dcSize(parseInt(this.value,10))};
    $('dc-hc').onchange=function(){dcRun('hiliteColor',this.value)};
    $('dc-tc').onchange=function(){dcRun('foreColor',this.value)};
    ['ls','cols','wm','va'].forEach(function(k){$('dc-'+k).onchange=function(){dcPage(k,this.value)}});
    Array.prototype.forEach.call(document.querySelectorAll('.dc-t'),function(b){b.onclick=function(){dcSetTool(b.getAttribute('data-tool'))}});
    Array.prototype.forEach.call(document.querySelectorAll('.dc-pc'),function(b){b.onclick=function(){DC.pen=b.getAttribute('data-pc');dcSetTool('pen')}});
    $('dc-tplsel').onchange=function(){var v=this.value;this.value='';if(v)dcApplyTpl(v)};
    $('dc-title').oninput=$('dc-content').oninput=function(){dcDirty()};
    $('dc-save').onclick=function(){dcSave(false)};$('dc-saveas').onclick=function(){dcSave(true)};$('dc-del').onclick=dcDelDoc;$('dc-print').onclick=dcPrint;
    $('dc-new').onclick=function(){dcGuard('new',function(){dcNewDoc();toast('새 문서입니다')})};
    $('dc-refresh').onclick=function(){dcGuard('refresh',function(){var r=DC.id&&dcRec(DC.id);if(r)dcLoad(r);else dcNewDoc();toast('다시 불러왔습니다')})};
    $('dc-prev').onclick=function(){dcGo(DC.pi-1)};$('dc-next').onclick=function(){dcGo(DC.pi+1)};
    $('dc-pg').onchange=function(){var n=parseInt(this.value,10);if(isNaN(n)){this.value=DC.pi+1;return}dcGo(n-1)};
    $('dc-addp').onclick=function(){DC.pages[DC.pi]=$('dp').innerHTML;DC.pages.splice(DC.pi+1,0,'');DC.pi++;dcLoadPage();dcDirty()};
    $('dc-dupp').onclick=function(){var h=$('dp').innerHTML;DC.pages[DC.pi]=h;DC.pages.splice(DC.pi+1,0,h);DC.pi++;dcLoadPage();dcDirty();toast('쪽을 복제했습니다')};
    $('dc-delp').onclick=function(){dcArmBtn('delp',$('dc-delp'),'페이지 삭제',function(){
      if(DC.pages.length===1){DC.pages=[''];DC.pi=0}else{DC.pages.splice(DC.pi,1);DC.pi=Math.min(DC.pi,DC.pages.length-1)}dcLoadPage();dcDirty()})};
    $('dc-zi').onclick=function(){dcZoom(DC.zoom+10)};$('dc-zo').onclick=function(){dcZoom(DC.zoom-10)};
    $('dc-zv').onchange=function(){dcZoom(parseFloat(this.value))};
    var dp=$('dp');
    dp.addEventListener('input',function(){dcDirty()});
    dp.addEventListener('paste',function(e){var t=e.clipboardData||window.clipboardData;if(!t)return;e.preventDefault();try{document.execCommand('insertText',false,t.getData('text/plain'))}catch(x){}});
    dp.addEventListener('pointerdown',function(e){
      var t=DC.tool,grip=e.target.closest&&e.target.closest('.dgrip');
      if(grip&&t!=='erase'){e.preventDefault();dcMove(grip.parentNode,e);return}
      if(t==='erase'){var o=e.target.closest&&e.target.closest('.dobj,path');if(o&&dp.contains(o)){e.preventDefault();o.parentNode.removeChild(o);dcDirty()}return}
      if(t==='pen'){e.preventDefault();dcPen(dcPt(e));return}
      if((t==='note'||t==='box')&&!(e.target.closest&&e.target.closest('.dobj'))){e.preventDefault();dcAddObj(t,dcPt(e))}
    });
    dp.addEventListener('mouseup',function(){if(DC.tool!=='hl')return;setTimeout(function(){var s=window.getSelection();if(s&&s.rangeCount&&!s.isCollapsed&&dp.contains(s.anchorNode))dcRun('hiliteColor',$('dc-hc').value)},0)});
    DC.built=true;dcLoadPage();dcZoom(100);
  }
  function xDocMod(){
    if(!DC.built)dcBuild();
    if(DC.id){var r=dcRec(DC.id);if(!r||(cur&&r.chart&&r.chart!==cur.chart))DC.id=null}
    $('dc-pt').innerHTML=cur?ptLine():'<span class="muted">환자 미지정 · 선택하지 않아도 작성·저장할 수 있습니다</span>';dcList();
    if(!DC.fitted){var w=$('dc-mid').clientWidth;if(w>200){DC.fitted=true;dcZoom(Math.min(100,Math.floor((w-110)/DC_W*10)*10))}}
  }

  /* 수술 서식 팝업 */
  function fmSum(){
    var n=$('op-name')?$('op-name').value.trim():'',sg=$('op-surgeon')?$('op-surgeon').value.trim():'',el=$('fm-sum');if(!el)return;
    el.textContent=n?(n+(sg?' · 집도의 '+sg:'')+(sk&&sk.shapes&&sk.shapes.length?' · 그림 '+sk.shapes.length+'개':'')):'서식이 비어 있습니다. 열어서 작성하세요.';
  }
  function fmOpen(){showDlg('dlg-fm');fmSum()}
  $('fm-open').onclick=fmOpen;$('fm-save').onclick=function(){$('op-save').click()};
  ['op-name','op-surgeon'].forEach(function(id){$(id).addEventListener('input',fmSum)});
  fmSum();

  /* =================== 로그인 (이 브라우저 안에서만 확인) =================== */
  var LG={user:null,mode:'login',fail:0,until:0};
  var LG_ICON={
    logo:'<svg class="lg-logo" viewBox="0 0 100 112" aria-hidden="true"><path d="M50 6C50 6 17 46 17 72a33 33 0 0 0 66 0C83 46 50 6 50 6z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M44 62h12v12h12v12H56v12H44V86H32V74h12z" fill="#fff"/></svg>',
    user:'<svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="14" r="9" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M5 46c0-10 8-15 20-15s20 5 20 15z" fill="none" stroke="#fff" stroke-width="2.5"/></svg>',
    lock:'<svg viewBox="0 0 50 54" aria-hidden="true"><path d="M13 24V15a12 12 0 0 1 24 0v9" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="6" y="24" width="38" height="27" rx="2" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="25" cy="35" r="3.5" fill="#fff"/><path d="M25 38v6" stroke="#fff" stroke-width="3"/></svg>'
  };
  var LG_DEPT={'IM':['내과','내과'],'GI':['내과','소화기내과'],'CV':['내과','순환기내과'],'C':['내과','순환기내과'],'Neph':['내과','신장내과'],'Endo':['내과','내분비내과'],'Hem-Onc':['내과','혈액종양내과'],'Inf':['내과','감염내과'],'NR':['신경과','신경과'],'NE':['신경과','신경과'],'GS':['외과','일반외과'],'OS':['정형외과','정형외과'],'NS':['신경외과','신경외과'],'CS':['흉부외과','심장혈관흉부외과'],'PS':['성형외과','성형외과'],'OB&GY':['산부인과','산부인과'],'OBGY':['산부인과','산부인과'],'PED':['소아청소년과','소아청소년과'],'PD':['소아청소년과','소아청소년과'],'PSY':['정신건강의학과','정신건강의학과'],'NP':['정신건강의학과','정신건강의학과'],'OPH':['안과','안과'],'ENT':['이비인후과','이비인후과'],'DER':['피부과','피부과'],'URO':['비뇨의학과','비뇨의학과'],'AN':['마취통증의학과','마취통증의학과'],'REHAB':['재활의학과','재활의학과'],'DENT':['치과','치과']};
  function lgSetUser(id){
    LG.user=id;var m=null;Object.keys(LG_DEPT).forEach(function(k){if(k.toLowerCase()===String(id).toLowerCase())m=LG_DEPT[k]});
    LG.dept=m?m[0]:'';LG.label=m?m[1]:'';
    function put(i,v){var e=$(i);if(e&&v&&Array.prototype.some.call(e.options,function(o){return o.value===v}))e.value=v}
    put('r-dept',LG.dept);if(!opSel)put('op-dept',LG.dept);if(!erCur)put('er-dept',LG.dept);
  }
  function lgHex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return ('0'+x.toString(16)).slice(-2)}).join('')}
  function lgSalt(){var a=new Uint8Array(12);if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);else for(var i=0;i<12;i++)a[i]=Math.floor(Math.random()*256);return lgHex(a)}
  function lgFallback(s){
    var h1=0xdeadbeef,h2=0x41c6ce57,r,i,c;
    for(r=0;r<3000;r++)for(i=0;i<s.length;i++){c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}
    h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
    return (h2>>>0).toString(16)+(h1>>>0).toString(16);
  }
  /* alg: 's' = SHA-256, 'f' = 대체 방식. alg 를 비우면 가능한 방식을 고름. cb(hash, alg) — 확인할 수 없으면 cb(null) */
  function lgHash(pw,salt,alg,cb){
    var s=salt+':'+pw,sub=window.crypto&&crypto.subtle&&window.TextEncoder;
    if(alg==='f'||(!alg&&!sub)){cb(lgFallback(s),'f');return}
    if(!sub){cb(null);return}
    try{crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){cb(lgHex(b),'s')},function(){cb(alg?null:lgFallback(s),alg?null:'f')})}catch(e){cb(alg?null:lgFallback(s),alg?null:'f')}
  }
  function lgMsg(n,t){var b=$('lg-m'+n);if(b)b.textContent=t||''}
  function lgClear(){lgMsg(1);lgMsg(2);lgMsg(3)}
  function lgMode(m){
    LG.mode=m;var c=m==='create';
    $('lg-r3').hidden=!c;$('lg-m3').hidden=!c;
    $('lg-pw').setAttribute('autocomplete',c?'new-password':'current-password');
    $('lg-note').innerHTML=c?'처음 사용하는 브라우저입니다. 사용할 아이디와 비밀번호를 정하세요.':'';
    lgClear();
  }
  function lgShow(){
    var old=$('login');if(old)old.parentNode.removeChild(old);
    var el=document.createElement('div');el.id='login';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','로그인');
    el.innerHTML='<form class="lg-box" id="lg-form" novalidate><div class="lg-title">Medi Chart</div>'+LG_ICON.logo+
      '<div class="lg-row"><span class="lg-ic">'+LG_ICON.user+'</span><span class="lg-colon">:</span><input id="lg-id" autocomplete="username" aria-label="아이디" placeholder="아이디" spellcheck="false"></div><div class="lg-bar" id="lg-m1" role="alert"></div>'+
      '<div class="lg-row"><span class="lg-ic">'+LG_ICON.lock+'</span><span class="lg-colon">:</span><input id="lg-pw" type="password" autocomplete="current-password" aria-label="비밀번호" placeholder="비밀번호"></div><div class="lg-bar" id="lg-m2" role="alert"></div>'+
      '<div class="lg-note" id="lg-note"></div></form>';
    document.body.appendChild(el);document.body.classList.add('locked');
    var w=document.querySelector('.window');if(w)w.inert=true;
    Array.prototype.forEach.call(document.querySelectorAll('.ov'),function(o){o.hidden=true});closeMenus();
    $('lg-form').onsubmit=function(e){e.preventDefault();lgSubmit()};
    ['lg-id','lg-pw'].forEach(function(i){$(i).addEventListener('input',lgClear);$(i).addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();lgSubmit()}})});
    $('lg-id').focus();
  }
  function lgDone(id){
    lgSetUser(id);LG.fail=0;try{sessionStorage.setItem('mc-auth',id)}catch(e){}
    var el=$('login');if(el)el.parentNode.removeChild(el);document.body.classList.remove('locked');
    var w=document.querySelector('.window');if(w)w.inert=false;lgBar();
  }
  function lgBar(){
    var b=$('mn-out');if(!b){b=document.createElement('button');b.type='button';b.id='mn-out';b.className='mn-b mn-out';b.onclick=lgLogout;$('menubar').appendChild(b)}
    b.textContent=(LG.label?LG.label+' ('+LG.user+')':(LG.user||''))+' · 로그아웃';b.title='로그아웃';
  }
  function lgLogout(){try{sessionStorage.removeItem('mc-auth')}catch(e){}LG.user=null;lgShow()}
  function lgSubmit(){
    var id=$('lg-id').value.trim(),pw=$('lg-pw').value;lgClear();
    if(!id){lgMsg(1,'아이디를 입력하세요');$('lg-id').focus();return}
    if(!pw){lgMsg(2,'비밀번호를 입력하세요');$('lg-pw').focus();return}
    if(LG.mode==='create'){
      if(id.length<2){lgMsg(1,'아이디는 2자 이상으로 정하세요');return}
      if(pw.length<4){lgMsg(2,'비밀번호는 4자 이상으로 정하세요');return}
      if(pw!==$('lg-pw2').value){lgMsg(3,'비밀번호 확인이 다릅니다');$('lg-pw2').focus();return}
      var salt=lgSalt();lgHash(pw,salt,'',function(h,alg){
        S.users.push({id:id,salt:salt,hash:h,alg:alg});if(!persist()){S.users.pop();lgMsg(2,'브라우저 저장 공간에 쓸 수 없어 계정을 만들지 못했습니다');return}lgDone(id);toast('계정을 만들었습니다. 환영합니다');
      });return;
    }
    if(Date.now()<LG.until){lgMsg(2,'시도가 너무 많습니다. 잠시 후 다시 시도하세요');return}
    var u=S.users.filter(function(x){return x.id.toLowerCase()===id.toLowerCase()})[0];
    function bad(){LG.fail++;if(LG.fail>=5){LG.until=Date.now()+30000;LG.fail=0;lgMsg(2,'5회 실패했습니다. 30초 후 다시 시도하세요')}else lgMsg(2,'아이디 또는 비밀번호가 맞지 않습니다')}
    if(!u){lgHash(pw,'x','f',function(){bad()});return}
    lgHash(pw,u.salt,u.alg,function(h){if(h===null){lgMsg(2,'이 브라우저에서는 확인할 수 없는 계정입니다')}else if(h===u.hash)lgDone(u.id);else bad()});
  }
  function lgForgot(){
    $('lg-note').innerHTML='<div style="text-align:left;line-height:1.5">비밀번호는 복구할 수 없습니다. 저장된 <b>모든 데이터(환자·기록·계정)를 삭제</b>하면 새 계정을 만들 수 있습니다.</div><div class="lg-row" style="margin-top:6px"><input id="lg-rs" placeholder="초기화 라고 입력" aria-label="초기화 확인" style="height:38px;font-size:15px"><button type="button" id="lg-rsgo" class="lg-go" style="margin:0;height:38px;font-size:14px;padding:0 10px" disabled>모두 삭제</button></div>';
    $('lg-rs').oninput=function(){$('lg-rsgo').disabled=$('lg-rs').value.trim()!=='초기화'};
    $('lg-rsgo').onclick=function(){S={patients:[]};normS();persist();try{sessionStorage.removeItem('mc-auth')}catch(e){}location.reload()};
    $('lg-rs').focus();
  }
  function lgPw(){
    xwin('비밀번호 변경','<div class="xf"><label>현재 비밀번호<input id="pc-0" type="password" autocomplete="current-password"></label><label>새 비밀번호 (4자 이상)<input id="pc-1" type="password" autocomplete="new-password"></label><label>새 비밀번호 확인<input id="pc-2" type="password" autocomplete="new-password"></label></div><div class="acts"><button class="btn xc" type="button">닫기</button><button class="btn blue" id="pc-ok" type="button">변경</button></div>',function(){
      $('pc-ok').onclick=function(){
        var u=S.users.filter(function(x){return x.id===LG.user})[0],n=$('pc-1').value;if(!u){toast('로그인 정보를 찾을 수 없습니다');return}
        if(n.length<4){toast('새 비밀번호는 4자 이상이어야 합니다');return}if(n!==$('pc-2').value){toast('새 비밀번호 확인이 다릅니다');return}
        lgHash($('pc-0').value,u.salt,u.alg,function(h){
          if(h===null||h!==u.hash){toast('현재 비밀번호가 맞지 않습니다');return}
          var salt=lgSalt();lgHash(n,salt,'',function(h2,alg){u.salt=salt;u.hash=h2;u.alg=alg;persist();xclose();toast('비밀번호를 변경했습니다')});
        });
      };
    },'wide blue');
  }
  /* 진료과 약어 계정: 아이디 = 비밀번호 = 약어 (아이디는 대소문자 구분 없음, 비밀번호는 구분함) */
  var LG_ACC=['IM','GI','CV','C','Neph','Endo','Hem-Onc','Inf','NR','NE','GS','OS','NS','CS','PS','OB&GY','OBGY','PED','PD','PSY','NP','OPH','ENT','DER','URO','AN','REHAB','DENT'];
  function lgSeed(){
    if(S.seedV===2)return;
    var todo=LG_ACC.filter(function(a){return !S.users.some(function(x){return x.id.toLowerCase()===a.toLowerCase()})}),left=todo.length+1;
    function fin(){if(--left)return;S.seedV=2;persist()}
    var adm=S.users.filter(function(x){return x.id==='admin'})[0];
    if(adm)lgHash('1234',adm.salt,adm.alg,function(h){if(h!==null&&h===adm.hash)S.users=S.users.filter(function(x){return x!==adm});fin()});else fin();
    todo.forEach(function(a){var salt=lgSalt();lgHash(a,salt,'',function(h,alg){S.users.push({id:a,salt:salt,hash:h,alg:alg});fin()})});
  }
  (function(){var u=null;try{u=sessionStorage.getItem('mc-auth')}catch(e){}
    if(u&&S.users.some(function(x){return x.id===u})){lgSetUser(u);lgBar()}else lgShow();
    lgSeed()})();

  function tick(){var n=new Date();$('clock').textContent=n.getFullYear()+'.'+p2(n.getMonth()+1)+'.'+p2(n.getDate())+' '+['일','월','화','수','목','금','토'][n.getDay()]+' '+p2(n.getHours())+':'+p2(n.getMinutes())}
  tick();setInterval(tick,30000);
  fillForm(null);renderHist();renderAll();loadNote();loadOp(null);
})();
