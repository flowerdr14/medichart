(function(){
  var SUBJECTS=["국어","수학","사회","과학","도덕","영어","음악","미술","체육","실과","창체"];
  var DAYS=["월","화","수","목","금"], DAYS7=["일","월","화","수","목","금","토"];
  var TITLES={timetable:"시간표",weekly:"주별 일정",monthly:"월별 일정",academic:"학사일정",trip:"수학여행",graduation:"졸업",students:"학생관리",traits:"학생특성",admin:"행정"};
  var store={};
  try{ store=JSON.parse(localStorage.getItem("portal6")||"{}")||{}; }catch(e){ store={}; }
  var ACCOUNTS={};
  (function(){
    function add(id,name){ ACCOUNTS[id.toLowerCase()]={id:id,name:name,office:/^cwoffice/i.test(id)}; }
    for(var g=1;g<=6;g++) for(var c=1;c<=2;c++) add("Cw2026"+g+c,g+"학년 "+c+"반");
    for(var n=1;n<=10;n++) add("Cwoffice"+n,"교무실 "+n);
    add("Cwrector","교장선생님"); add("Cwrector2","교감선생님");
  })();
  var session=null;
  try{ session=sessionStorage.getItem("portal6user"); }catch(e){}
  if(session&&!ACCOUNTS[session]) session=null;
  function persist(){ try{ localStorage.setItem("portal6",JSON.stringify(store)); }catch(e){} }
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var toastT;
  function toast(m){ var t=$("#toast"); t.textContent=m; t.classList.add("on"); clearTimeout(toastT); toastT=setTimeout(function(){t.classList.remove("on")},1800); }

  /* ----- build pages ----- */
  // timetable
  (function(){
    var h='<thead><tr><th style="width:15.8%"></th>'+DAYS.map(function(d){return '<th>'+d+'</th>'}).join("")+'</tr></thead><tbody>';
    for(var p=1;p<=6;p++){
      h+='<tr><td class="p">'+p+'교시</td>';
      DAYS.forEach(function(d,i){
        h+='<td><select data-k="tt_'+p+'_'+i+'" aria-label="'+d+'요일 '+p+'교시"><option value="">교과 선택</option>'+SUBJECTS.map(function(s){return '<option>'+s+'</option>'}).join("")+'</select></td>';
      });
      h+='</tr>';
    }
    $("#ttable").innerHTML=h+'</tbody>';
    $("#ttable").addEventListener("change",function(e){ if(e.target.tagName==="SELECT") e.target.classList.toggle("set",!!e.target.value); });
  })();
  // weekly
  (function(){
    var h=DAYS7.map(function(d){return '<div class="h">'+d+'</div>'}).join("");
    h+=DAYS7.map(function(d,i){return '<textarea data-k="wk_'+i+'" aria-label="'+d+'요일 일정"></textarea>'}).join("");
    $("#wk").innerHTML=h;
  })();
  // monthly
  var now=new Date();
  (function(){
    var m=now.getMonth()+1, days=new Date(now.getFullYear(),m,0).getDate();
    $("#moTitle").textContent=m+"월";
    var h="";
    for(var i=1;i<=35;i++){
      if(i<=days){ h+='<div class="d'+(i===now.getDate()?' today':'')+'"><span>'+i+'</span><textarea data-k="mo_'+m+'_'+i+'" aria-label="'+m+'월 '+i+'일 일정"></textarea></div>'; }
      else h+='<div class="d blank"></div>';
    }
    $("#moGrid").innerHTML=h;
  })();
  // school group inputs (graduation)
  (function(){
    var sch=$(".row.sch");
    var h="";
    for(var i=1;i<=12;i++){
      h+='<div style="flex-direction:column;padding:0;align-items:stretch;border-bottom:'+(i<=6?'1px solid #6b7686':'0')+';border-right:1px solid #6b7686"><div style="font-size:14px;text-align:center;padding:4px 0;border-bottom:1px solid #6b7686">'+i+'희망교</div><input type="text" data-k="g_s'+i+'" aria-label="'+i+'희망교" style="height:26px;border:0;background:transparent;text-align:center;font-size:15px"></div>';
    }
    sch.innerHTML=h;
    sch.style.gridTemplateColumns="repeat(6,1fr)";
    sch.style.alignItems="stretch";
    var f2=sch.parentNode;
    // admission row
    var add=document.createElement("div");
    add.className="f f2"; add.style.borderTop="0";
    add.innerHTML='<div class="L C" style="min-height:120px;line-height:1.35;font-size:18px">입학/<br>전입사항</div>'+
      '<div class="L" style="grid-column:2;font-size:18px">18. 입학(전입)일자</div>'+
      '<div class="row three V" style="grid-column:3;display:grid;grid-template-columns:1fr 1.15fr 1fr;padding:0">'+
        '<div><input type="text" data-k="g_enter" aria-label="입학(전입)일자"></div>'+
        '<div class="L" style="flex-direction:column;line-height:1.45;font-size:17px;border-right:1px solid #6b7686"><span>19. 전 재적교명</span><span>(전입 전 초등학교명</span><span>2025. 1. 1. 이후</span><span>전입자만 기재)</span></div>'+
        '<div><input type="text" data-k="g_prevschool" aria-label="전 재적교명"></div>'+
      '</div>';
    f2.parentNode.insertBefore(add,f2.nextSibling);
    $("#printBtn").onclick=function(){ window.print(); };
  })();
  // subject
  (function(){
    var pubs=["국어<br>(가/나)","수학<br>(수학익힘)","사회<br>(사회과부도)","과학<br>(실험관찰)","도덕","영어","음악","미술","체육","실과"];
    var pk=["kor","math","soc","sci","eth","eng","mus","art","pe","prac"];
    $("#pub").innerHTML=pubs.map(function(t){return '<div class="th">'+t+'</div>'}).join("")+pk.map(function(k,i){return '<div class="td"><input type="text" data-k="pub_'+k+'" aria-label="'+pubs[i].replace("<br>"," ")+' 출판사"></div>'}).join("");
    var e1=[["국어<br>(가/나)","kor"],["수학<br>(수학익힘)","math"],["사회<br>(사회과부도)","soc"],["과학<br>(실험관찰)","sci"],["도덕","eth"]];
    var e2=[["영어","eng"],["음악","mus"],["미술","art"],["체육","pe"],["실과","prac"]];
    function fill(el,arr){ el.innerHTML=arr.map(function(a){return '<div class="th">'+a[0]+'</div>'}).join("")+arr.map(function(a){return '<div class="td tall"><textarea data-k="ev_'+a[1]+'" aria-label="'+a[0].replace("<br>"," ")+' 수행평가"></textarea></div>'}).join(""); }
    fill($("#ev1"),e1); fill($("#ev2"),e2);
  })();

  /* ----- data fill/save ----- */
  function load(){
    $$("[data-k]").forEach(function(el){
      var v=store[el.getAttribute("data-k")];
      if(v===undefined) return;
      if(el.type==="checkbox") el.checked=!!v; else el.value=v;
      if(el.tagName==="SELECT") el.classList.toggle("set",!!el.value);
    });
  }
  function collect(root){
    $$("[data-k]",root).forEach(function(el){
      var k=el.getAttribute("data-k");
      var v=el.type==="checkbox"?el.checked:el.value;
      if(v===""||v===false) delete store[k]; else store[k]=v;
    });
    persist();
  }
  load();
  $$("[data-save]").forEach(function(b){ b.addEventListener("click",function(){ collect(b.closest("[data-page]")); toast("저장되었습니다."); }); });

  /* ----- favorites ----- */
  function favs(){ return store._fav||[]; }
  function renderFav(){
    var f=favs(), h="";
    for(var i=0;i<5;i++){
      h+='<div>'+(f[i]?'<a href="#'+f[i]+'">'+TITLES[f[i]]+'</a>':'')+'</div>';
    }
    $("#favCells").innerHTML=h;
    $$("#tiles .tile").forEach(function(t){
      var on=f.indexOf(t.getAttribute("data-id"))>-1, p=$(".pin",t);
      p.textContent=on?"★":"☆"; p.classList.toggle("on",on);
      p.setAttribute("aria-label",on?"즐겨찾기 해제":"즐겨찾기 추가");
    });
  }
  $("#tiles").addEventListener("click",function(e){
    var p=e.target.closest(".pin"); if(!p) return;
    e.preventDefault(); e.stopPropagation();
    var id=p.closest(".tile").getAttribute("data-id"), f=favs().slice(), i=f.indexOf(id);
    if(i>-1) f.splice(i,1); else if(f.length<5) f.push(id); else { toast("즐겨찾기는 5개까지 추가할 수 있습니다."); return; }
    store._fav=f; persist(); renderFav();
  });

  /* ----- login ----- */
  function setUser(id){
    var t=$("#userTxt");
    var a=id&&ACCOUNTS[id];
    if(a){ t.className="nm"; t.innerHTML='<span></span><small></small>'; $("span",t).textContent=a.name+(/님$/.test(a.name)?"":" 님"); $("small",t).textContent=a.id; }
    else { t.className="guest"; t.textContent="로그인 하세요."; }
  }
  setUser(session);
  $("#loginForm").addEventListener("submit",function(e){
    e.preventDefault();
    var id=$("#uid").value.trim(), pw=$("#upw").value;
    if(!id||!pw){ $("#loginErr").textContent="아이디와 비밀번호를 입력해 주세요."; return; }
    $("#loginErr").textContent="";
    var key=id.toLowerCase(), acct=ACCOUNTS[key];
    if(!acct||pw.toLowerCase()!==key){ $("#loginErr").textContent="아이디 또는 비밀번호가 올바르지 않습니다."; $("#upw").value=""; $("#upw").focus(); return; }
    session=key; try{ sessionStorage.setItem("portal6user",key); }catch(x){}
    setUser(key); $("#upw").value=""; location.hash="#home"; route();
  });
  $("#user").addEventListener("click",function(e){
    if(!session) return;
    var m=$("#umenu"); m.hidden=!m.hidden; e.stopPropagation();
  });
  $("#logout").addEventListener("click",function(e){
    e.stopPropagation(); session=null; try{ sessionStorage.removeItem("portal6user"); }catch(x){}
    $("#umenu").hidden=true; setUser(null); location.hash="#login"; route();
  });
  document.addEventListener("click",function(){ $("#umenu").hidden=true; });

  /* ----- sidebar / bottom tabs / search ----- */
  var GROUPS=[
    {cat:"home", label:"학년별 업무", items:[["home","학년별 업무 홈"],["timetable","시간표"],["weekly","주별 일정"],["monthly","월별 일정"],["academic","학사일정"],["trip","수학여행"],["graduation","졸업"],["students","학생관리"],["traits","학생특성"],["admin","행정"]]},
    {cat:"subject", label:"교과 업무", items:[["subject","교과 업무"],["subject-eval","수행평가"]]}
  ];
  var sideMode="menu";
  function catOf(h){ return (h==="subject"||h==="subject-eval")?"subject":"home"; }
  function renderSide(h){
    var g=GROUPS[catOf(h)==="subject"?1:0];
    $("#sideHead").textContent=g.label;
    var tree=$("#sideTree"); tree.innerHTML="";
    if(sideMode==="fav"){
      var f=favs();
      if(!f.length){ tree.innerHTML='<li class="empty">즐겨찾기가 없습니다.</li>'; return; }
      f.forEach(function(id){
        var li=document.createElement("li"); li.textContent=TITLES[id]||id;
        if(id===h) li.className="cur";
        li.tabIndex=0;
        li.addEventListener("click",function(){ location.hash="#"+id; });
        tree.appendChild(li);
      });
      return;
    }
    g.items.forEach(function(it){
      var li=document.createElement("li"); li.textContent=it[1];
      if(it[0]===h) li.className="cur";
      li.tabIndex=0;
      li.addEventListener("click",function(){ location.hash="#"+it[0]; });
      tree.appendChild(li);
    });
  }
  $("#stabMenu").addEventListener("click",function(){ sideMode="menu"; this.classList.add("on"); $("#stabFav").classList.remove("on"); renderSide(curHash()); });
  $("#stabFav").addEventListener("click",function(){ sideMode="fav"; this.classList.add("on"); $("#stabMenu").classList.remove("on"); renderSide(curHash()); });
  function curHash(){ return (location.hash||"").replace("#","")||"home"; }
  function renderBottomTabs(page){
    var bt=$("#bottomtabs"); bt.innerHTML="";
    var home=document.createElement("button"); home.type="button"; home.textContent="홈";
    if(page==="home") home.className="on";
    home.addEventListener("click",function(){ location.hash="#home"; });
    bt.appendChild(home);
    if(page!=="home"){
      var b=document.createElement("button"); b.type="button"; b.className="on";
      b.innerHTML=(TITLES[page]||(page==="subject"?"교과 업무":page))+' <x>\u2715</x>';
      b.addEventListener("click",function(e){ if(e.target.tagName==="X") location.hash="#home"; });
      bt.appendChild(b);
    }
  }
  $("#gsearchForm").addEventListener("submit",function(e){
    e.preventDefault();
    var q=$("#gsearch").value.trim(); if(!q) return;
    var all=GROUPS[0].items.concat(GROUPS[1].items);
    var hit=all.filter(function(it){ return it[1].indexOf(q)>-1; })[0];
    if(hit){ $("#gsearch").value=""; location.hash="#"+hit[0]; }
    else toast("검색 결과가 없습니다.");
  });

  /* ----- router ----- */
  function route(){
    var h=(location.hash||"").replace("#","")||"login";
    var page=h==="subject-eval"?"subject":h;
    if(!session) page="login";
    else if(page==="login") page="home";
    if(!$('[data-page="'+page+'"]')) page=session?"home":"login";
    $$("[data-page]").forEach(function(s){ s.hidden=s.getAttribute("data-page")!==page; });
    $$(".catbar a").forEach(function(a){ a.classList.toggle("on",session&&a.getAttribute("data-cat")===catOf(page==="subject"?h:page)); });
    $("#side").hidden=!session; $("#bottomtabs").hidden=!session;
    if(session){ renderSide(page==="subject"?h:page); renderBottomTabs(page); }
    if(page==="home") renderFav();
    if(page==="admin") renderNotices();
    window.scrollTo(0,0);
    if(h==="subject-eval") setTimeout(function(){ var b=$("#evalBox"); if(b) b.scrollIntoView({behavior:"smooth",block:"start"}); },30);
  }
  window.addEventListener("hashchange",route);

  /* ----- students ----- */
  var SEED=[["김하준","1","1","남"],["이서연","1","2","여"],["박지호","1","3","남"],["최유나","1","4","여"],["정민준","1","5","남"],["한소윤","1","6","여"],["강도윤","2","1","남"],["윤하린","2","2","여"],["조시우","2","3","남"],["임채원","2","4","여"],["오지안","2","5","여"],["신예준","2","6","남"]];
  if(!store._stu){ store._stu={}; SEED.forEach(function(r){ store._stu[r[0]]={name:r[0],grade:"6",cls:r[1],no:r[2],sex:r[3],memo:"예시 학생입니다."}; }); }
  function students(){ return store._stu||{}; }
  function n0(v){ return parseInt(v,10)||0; }
  function stuLabel(r){ return [r.grade&&r.grade+"학년",r.cls&&r.cls+"반",r.no&&r.no+"번"].filter(Boolean).join(" "); }
  function matchStudents(q){
    var toks=q.trim().split(/\s+/).filter(Boolean), all=students();
    return Object.keys(all).map(function(k){ return all[k]; }).filter(function(r){
      var label=r.name+" "+stuLabel(r);
      return toks.every(function(t){ return label.indexOf(t)>-1; });
    }).sort(function(a,b){ return n0(a.grade)-n0(b.grade)||n0(a.cls)-n0(b.cls)||n0(a.no)-n0(b.no)||(a.name<b.name?-1:1); });
  }
  function bindSearch(inp,res,pick){
    function render(){
      var list=matchStudents(inp.value); res.innerHTML=""; res.hidden=false;
      if(!list.length){ var p=document.createElement("p"); p.textContent="찾는 학생이 없습니다."; res.appendChild(p); return; }
      list.forEach(function(r){
        var b=document.createElement("button"); b.type="button";
        b.textContent=r.name+"  ("+stuLabel(r)+")";
        b.addEventListener("click",function(){ pick(r); inp.value=r.name; res.hidden=true; });
        res.appendChild(b);
      });
    }
    inp.addEventListener("input",render); inp.addEventListener("focus",render);
    document.addEventListener("click",function(e){ if(e.target!==inp&&!res.contains(e.target)) res.hidden=true; });
  }
  function stuFields(){ return $$("[data-s]"); }
  function fillStu(rec){ stuFields().forEach(function(el){ el.value=rec[el.getAttribute("data-s")]||""; }); }
  bindSearch($("#sq"),$("#sres"),fillStu);
  $("#saveStudent").addEventListener("click",function(){
    var rec={}; stuFields().forEach(function(el){ rec[el.getAttribute("data-s")]=el.value; });
    if(!rec.name.trim()){ toast("이름을 입력해 주세요."); return; }
    rec.name=rec.name.trim();
    var all=students(); all[rec.name]=rec; store._stu=all; persist(); toast("저장되었습니다.");
  });

  /* ----- student traits ----- */
  var curTrait=null;
  function traits(){ return store._traits||(store._traits={}); }
  function fillTrait(rec){
    curTrait=rec.name;
    $$("[data-t]").forEach(function(el){
      var k=el.getAttribute("data-t");
      if(k==="name") el.value=rec.name;
      else if(k==="cls") el.value=stuLabel(rec);
      else el.value=(traits()[rec.name]||{})[k]||"";
    });
  }
  bindSearch($("#tq"),$("#tres"),fillTrait);
  $("#saveTraits").addEventListener("click",function(){
    if(!curTrait){ toast("학생을 먼저 찾아 선택해 주세요."); return; }
    var o={}; $$("[data-t]").forEach(function(el){ var k=el.getAttribute("data-t"); if(k!=="name"&&k!=="cls") o[k]=el.value; });
    traits()[curTrait]=o; persist(); toast("저장되었습니다.");
  });

  /* ----- popups ----- */
  function pad(n){ return (n<10?"0":"")+n; }
  function openWin(id){
    var o=$("#"+id); if(!o) return; o.hidden=false;
    if(id==="w-misc"){ var ac=ACCOUNTS[session]; var eu=$("#efUser"); if(eu) eu.textContent=ac?ac.name+(/님$/.test(ac.name)?"":" 님"):""; }
    var f=o.querySelector("input:not([disabled]):not([readonly]):not([type=checkbox]):not([type=radio]),textarea");
    if(f&&id!=="w-misc"&&!f.closest(".pane:not(.on)")) setTimeout(function(){ try{ f.focus(); }catch(e){} },20);
  }
  function closeWin(o){ if(o) o.hidden=true; }
  document.addEventListener("click",function(e){
    var op=e.target.closest("[data-open]"); if(op){ openWin(op.getAttribute("data-open")); return; }
    var cl=e.target.closest("[data-close]"); if(cl){ closeWin(cl.closest(".ov")); return; }
    var t=e.target.closest(".tabs[data-tabs] span[data-pane]");
    if(t){
      $$("span",t.parentNode).forEach(function(s){ s.classList.toggle("on",s===t); });
      $$(".pane",t.closest(".dlg")).forEach(function(p){ p.classList.toggle("on",p.id===t.getAttribute("data-pane")); });
    }
  });
  $$(".ov").forEach(function(o){ o.addEventListener("mousedown",function(e){ if(e.target===o) closeWin(o); }); });
  document.addEventListener("keydown",function(e){
    if(e.key!=="Escape") return;
    var open=$$(".ov:not([hidden])"); if(open.length) closeWin(open[open.length-1]);
  });
  function showAlert(msg){ $("#alertMsg").textContent=msg; $("#w-alert").hidden=false; setTimeout(function(){ $("#alertOk").focus(); },20); }
  $$("[data-req]").forEach(function(b){ b.addEventListener("click",function(){ showAlert("요청이 완료되었습니다."); }); });
  $$(".dlg.mock").forEach(function(d){
    d.addEventListener("click",function(e){
      var m=e.target.closest(".ef-nav span:not(.on),.ef-tree li:not(.cur),.ef-stabs span:not(.on)");
      if(m){ toast("준비 중인 메뉴입니다."); return; }
      var b=e.target.closest("button");
      if(!b||b.hasAttribute("data-close")||b.hasAttribute("data-act")) return;
      toast("준비 중인 기능입니다.");
    });
  });

  /* budget popup: add / remove rows */
  function rowTool(btnId,bodyId,cols,onChange){
    var body=$("#"+bodyId), none=body.querySelector(".nr");
    function renumber(){
      var rows=$$("tr.r",body);
      rows.forEach(function(r,i){ r.firstChild.textContent=i+1; });
      none.hidden=rows.length>0;
      if(onChange) onChange();
    }
    $("#"+btnId).addEventListener("click",function(){
      var tr=document.createElement("tr"); tr.className="r"; var h="<td></td>";
      cols.forEach(function(c){ h+='<td><input type="text"'+(c.num?' inputmode="numeric" class="num"':'')+(c.sum?' data-sum="'+c.sum+'"':'')+' aria-label="'+c.label+'"></td>'; });
      h+='<td><button type="button" class="x" data-act aria-label="행 삭제">×</button></td>';
      tr.innerHTML=h; body.insertBefore(tr,none); renumber(); tr.querySelector("input").focus();
    });
    body.addEventListener("input",function(e){
      if(e.target.classList.contains("num")) e.target.value=e.target.value.replace(/\D/g,"");
      if(onChange) onChange();
    });
    body.addEventListener("click",function(e){ var b=e.target.closest(".x"); if(b){ b.closest("tr").remove(); renumber(); } });
  }
  function sumOf(body,k){ var t=0; $$('[data-sum="'+k+'"]',body).forEach(function(i){ t+=n0(i.value); }); return t; }
  rowTool("inAdd","inBody",[{label:"재원명"},{label:"세입목"},{label:"산출내역"},{label:"산출식"},{label:"세입예산 요구금액",num:true}]);
  rowTool("outAdd","outBody",[{label:"재원/세출항/세출목"},{label:"산출내역"},{label:"세입예산 요구금액",num:true,sum:"a"},{label:"산출식"},{label:"세출예산 요구금액",num:true,sum:"b"}],function(){
    var b=$("#outBody"); $("#sumA").textContent=sumOf(b,"a").toLocaleString("ko-KR"); $("#sumB").textContent=sumOf(b,"b").toLocaleString("ko-KR");
  });

  /* 통계 조회 popup */
  (function(){
    function ymd(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
    var d=new Date(), e=new Date(d.getTime()+30*864e5);
    $("#sD1").value=ymd(d); $("#sD2").value=ymd(e); $("#efD1").value=ymd(d); $("#efD2").value=ymd(e);
    function bytes(s){ var n=0; for(var i=0;i<s.length;i++) n+=s.charCodeAt(i)<128?1:2; return n; }
    $("#sTitle").addEventListener("input",function(){ $("#bT").textContent=bytes(this.value); });
    $("#sBody").addEventListener("input",function(){ $("#bB").textContent=bytes(this.value); });
    $("#efTitle").addEventListener("input",function(){ $("#efbT").textContent=bytes(this.value); });
    $("#efBody").addEventListener("input",function(){ $("#efbB").textContent=bytes(this.value); });
    $("#efbT").textContent=bytes($("#efTitle").value);
    var body=$("#itemBody"), none=body.querySelector(".nr");
    function calc(){
      var tot=0;
      $$("tr.r",body).forEach(function(r,i){
        r.querySelector(".sn").textContent=i+1;
        var amt=n0($(".q",r).value)*n0($(".p",r).value);
        $(".amt",r).textContent=amt.toLocaleString("ko-KR"); tot+=amt;
      });
      none.hidden=!!$("tr.r",body);
      $("#itemSum").textContent=tot.toLocaleString("ko-KR");
    }
    $("#itemAdd").addEventListener("click",function(){
      var tr=document.createElement("tr"); tr.className="r";
      tr.innerHTML='<td><input type="checkbox" class="rc" aria-label="행 선택"></td><td>신규</td><td class="sn"></td>'+
        '<td><input type="text" style="text-align:left" aria-label="내용"></td><td><input type="text" aria-label="규격"></td>'+
        '<td><input type="text" class="num q" inputmode="numeric" aria-label="수량"></td><td><input type="text" aria-label="단위"></td>'+
        '<td><input type="text" class="num p" inputmode="numeric" aria-label="예산단가"></td><td class="amt" style="text-align:right">0</td>';
      body.insertBefore(tr,none); calc(); tr.querySelector("input[type=text]").focus();
    });
    $("#itemDel").addEventListener("click",function(){
      var any=false; $$("tr.r",body).forEach(function(r){ if($(".rc",r).checked){ r.remove(); any=true; } });
      if(!any) toast("삭제할 행을 선택해 주세요.");
      $("#itemAll").checked=false; calc();
    });
    $("#itemAll").addEventListener("change",function(){ var c=this.checked; $$(".rc",body).forEach(function(x){ x.checked=c; }); });
    body.addEventListener("input",function(e){
      if(e.target.classList.contains("num")) e.target.value=e.target.value.replace(/\D/g,"");
      calc();
    });
  })();

  /* ----- notices ----- */
  var NT_DEFAULT=[
    {t:"2026학년도 학교 운영 계획 안내",a:"행정실",d:"2026.10.24",v:152},
    {t:"교육청 공문 발송 안내 (학생생활지도 관련)",a:"행정실",d:"2026.10.22",v:98},
    {t:"학교시설 점검 일정 안내",a:"행정실",d:"2026.10.20",v:87},
    {t:"예산 집행 관련 안내",a:"행정실",d:"2026.10.18",v:64},
    {t:"교직원 연수 신청 안내",a:"행정실",d:"2026.10.16",v:53}
  ];
  if(!Array.isArray(store._notices)) store._notices=NT_DEFAULT.map(function(n){ return {t:n.t,a:n.a,d:n.d,v:n.v}; });
  var ntPage=1, ntSize=10;
  function canWrite(){ var a=ACCOUNTS[session]; return !!(a&&a.office); }
  function updateNoticeBtn(){
    var b=$("#writeNotice"), ok=canWrite();
    b.classList.toggle("off",!ok); b.setAttribute("aria-disabled",ok?"false":"true");
    b.title=ok?"":"교무실 계정만 작성할 수 있습니다.";
  }
  function openNotice(n){
    n.v=(n.v||0)+1; persist();
    $("#vTitle").textContent=n.t;
    $("#vMeta").textContent="작성자 "+n.a+"  |  작성일 "+n.d+"  |  조회수 "+n.v;
    $("#vBody").textContent=n.b||"(본문이 없습니다.)";
    openWin("w-view"); renderNotices();
  }
  function renderNotices(){
    updateNoticeBtn();
    var list=store._notices, tb=$("#ntBody"); tb.innerHTML="";
    var pages=Math.max(1,Math.ceil(list.length/ntSize)); if(ntPage>pages) ntPage=pages;
    var start=(ntPage-1)*ntSize;
    list.slice(start,start+ntSize).forEach(function(n,i){
      var tr=document.createElement("tr"); tr.tabIndex=0;
      [start+i+1,n.t,n.a,n.d,n.v].forEach(function(c,j){ var td=document.createElement("td"); if(j===1) td.className="l"; td.textContent=c; tr.appendChild(td); });
      tr.addEventListener("click",function(){ openNotice(n); });
      tr.addEventListener("keydown",function(e){ if(e.key==="Enter") openNotice(n); });
      tb.appendChild(tr);
    });
    $("#ntTotal").textContent="총 "+list.length+"건";
    var nums=$("#ntNums"); nums.innerHTML="";
    function mk(txt,pg,cls,label){
      var b=document.createElement("button"); b.type="button"; b.textContent=txt; if(cls) b.className=cls; if(label) b.setAttribute("aria-label",label);
      b.addEventListener("click",function(){ if(pg<1||pg>pages) return; ntPage=pg; renderNotices(); });
      nums.appendChild(b);
    }
    mk("<",ntPage-1,"","이전");
    for(var p=1;p<=pages;p++) mk(String(p),p,p===ntPage?"cur":"");
    mk(">",ntPage+1,"","다음");
  }
  $("#ntSize").addEventListener("change",function(){ ntSize=parseInt(this.value,10)||10; ntPage=1; renderNotices(); });
  $("#writeNotice").addEventListener("click",function(){
    if(!canWrite()){ showAlert("공지사항은 교무실 계정만 작성할 수 있습니다."); return; }
    var a=ACCOUNTS[session]; $("#nAuthor").value=a?a.name:"";
    $("#nTitle").value=""; $("#nBody").value=""; openWin("w-write");
  });
  $("#noticeForm").addEventListener("submit",function(e){
    e.preventDefault();
    if(!canWrite()){ showAlert("공지사항은 교무실 계정만 작성할 수 있습니다."); return; }
    var t=$("#nTitle").value.trim();
    if(!t){ toast("제목을 입력해 주세요."); $("#nTitle").focus(); return; }
    var d=new Date();
    store._notices.unshift({t:t,a:$("#nAuthor").value,d:d.getFullYear()+"."+pad(d.getMonth()+1)+"."+pad(d.getDate()),v:0,b:$("#nBody").value});
    persist(); ntPage=1; renderNotices(); closeWin($("#w-write")); toast("공지사항이 등록되었습니다.");
  });

  route();
})();
