(() => {
  "use strict"; 
  /************ HELPERS ************/
  const $  = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const clone=(o)=> (window.structuredClone? structuredClone(o): JSON.parse(JSON.stringify(o)));
  const safeForEach=(arr,fn)=> Array.isArray(arr) ? arr.forEach(fn) : void 0;

  // Toasts
  function ensureToasts(){
    let box=$("#toasts");
    if(!box){
      box=document.createElement("div");
      box.id="toasts";
      box.setAttribute("aria-live","polite");
      box.setAttribute("aria-atomic","true");
      document.body.appendChild(box);
    }
    return box;
  }
  const toast = (msg,type="ok",ms=2200)=>{
    const box=ensureToasts();
    const t=document.createElement("div");
    t.className="toast "+(type==="err"?"err":"ok");
    t.textContent=msg; box.appendChild(t);
    const fadeStart=Math.max(0, ms-320);
    setTimeout(()=>{ t.style.opacity="0"; t.style.transform="translateY(-6px)"; }, fadeStart);
    setTimeout(()=>t.remove(), ms);
  };
  const confettiBurst = ()=>{ if(window.confetti){ confetti({particleCount:120, spread:70, origin:{y:0.6}}); } };

  /************ DEMO AUTH ************/
  const DEMO_USERS={
    "ana.perez":   {pass:"123456", role:"parents",  name:"Ana Pérez"},
    "prof.mateo":  {pass:"123456", role:"teachers", name:"Prof. Mateo"},
    "col.stelar":  {pass:"123456", role:"school",   name:"Colegio Estelar"},
    "nico.kid":    {pass:"123456", role:"children", name:"Nicolás"}
  };

  const LS_AUTH="libro_auth_v1";
  const SS_AUTH="libro_auth_sess_v1";

  const getAuth = ()=>{
    try{ const ss=sessionStorage.getItem(SS_AUTH); if(ss) return JSON.parse(ss);}catch(_){}
    try{ const ls=localStorage.getItem(LS_AUTH); if(ls) return JSON.parse(ls);}catch(_){}
    return null;
  };
  const setAuth = (u,{remember=false}={})=>{
    try{
      if(remember){ localStorage.setItem(LS_AUTH, JSON.stringify(u)); sessionStorage.removeItem(SS_AUTH); }
      else{ sessionStorage.setItem(SS_AUTH, JSON.stringify(u)); }
    }catch(_){}
  };
  const clearAuth = ()=>{ try{localStorage.removeItem(LS_AUTH);}catch(_){} try{sessionStorage.removeItem(SS_AUTH);}catch(_){} };

  /************ ESTADO ************/
  const LS_KEY="libronautas_stats_v12";
  const DEFAULT_STATE={
    minutes:[12,22,26,35,30,41,34],
    acts:{silabas:2,sopa:1,trivia:3},
    achievements:["Primera partida","3 respuestas correctas","Sopa completada"],
    badges:[{name:"Explorador",color:"gold"},{name:"Cometa Rápido",color:"pink"}],
    students:{
      "Ana":  {nivel:"Tierra",prog:82,last:"Sopa de letras"},
      "Luis": {nivel:"Despegue",prog:63,last:"Sílabas"},
      "Marta":{nivel:"Galáctica",prog:91,last:"Trivia"}
    },
    rubric:{
      "Ana":[3,3,2,2,3,3,2,3],
      "Luis":[2,2,2,1,2,2,2,2],
      "Marta":[3,3,3,3,3,3,3,3]
    },
    kpis:{active:120,avg:75,today:230},
    tasks:[
      {name:"Sílabas", done:false},
      {name:"Sopa de Letras", done:false},
      {name:"Trivia", done:false},
      {name:"Leer un cuento", done:false}
    ],
    groups:[],
    points:0,
    subscription:"free"
  };
  const getStats=()=>{ try{const raw=localStorage.getItem(LS_KEY); if(raw) return JSON.parse(raw);}catch(_){} return clone(DEFAULT_STATE); };
  const setStats=(s)=>{ try{localStorage.setItem(LS_KEY,JSON.stringify(s));}catch(_){} };
  let stats=getStats();

  /************ ROLES / RUTAS ************/
  const ROLE_HOME={children:"missions",parents:"parents",teachers:"teachers",school:"school"};
  const ROLE_ALLOWED={
    children:new Set(["home","about","subscriptions","missions","children","library","game-syllables","game-wordsearch","game-trivia"]),
    parents:new Set(["home","about","subscriptions","parents","library"]),
    teachers:new Set(["home","about","subscriptions","teachers"]),
    school:new Set(["home","about","subscriptions","school"])
  };
  const PUBLIC_PAGES=new Set(["home","about","subscriptions","register","login"]);
  const canAccess=(role,pageId)=>{ if(PUBLIC_PAGES.has(pageId)) return true; if(!role) return false; return ROLE_ALLOWED[role]?.has(pageId); };

  /************ MENÚ / HEADER ************/
  function initMenu(){
    const toggle=$(".menu-toggle"); const nav=$(".main-nav");
    toggle?.addEventListener("click",()=>nav?.classList.toggle("show"));
    document.addEventListener("click",(e)=>{ if(!nav?.classList.contains("show")) return; if(e.target===toggle||nav.contains(e.target)) return; nav.classList.remove("show");});
    $(".logout-btn")?.addEventListener("click",()=>{ clearAuth(); toast("Sesión cerrada","ok"); updateRoleVisibility(null); showPage("home"); });

    const header=$(".app-header");
    const onScroll=()=>{ if(window.scrollY>8) header?.classList.add("scrolled"); else header?.classList.remove("scrolled"); };
    window.addEventListener("scroll", onScroll); onScroll();
  }
  function updateRoleVisibility(role){
    $$(".role-only").forEach(el=>{
      const r=el.getAttribute("data-role");
      el.style.display=(role&&r===role)?"inline-flex":"none";
    });
    const isLogged=!!role;
    const loginBtn=$("[data-go='login']"), registerBtn=$("[data-go='register']"), logoutBtn=$(".logout-btn");
    if(loginBtn) loginBtn.style.display=isLogged?"none":"inline-flex";
    if(registerBtn) registerBtn.style.display=isLogged?"none":"inline-flex";
    if(logoutBtn) logoutBtn.style.display=isLogged?"inline-flex":"none";
  }

  /************ PARTICLES + ESTRELLAS ************/
  function ensureParticles(){
    const el=$("#particles-js"); if(!el) return;
    const boot=()=>{ 
      if(typeof window.particlesJS!=="function"){ setTimeout(boot,120); return; }
      if(el.dataset.booted==="yes") return;
      window.particlesJS("particles-js",{
        particles:{
          number:{value:110,density:{enable:true,value_area:900}},
          color:{value:["#ffffff","#da0b61","#354ca1"]},
          size:{value:2.5,random:true},
          opacity:{value:.7,random:true},
          line_linked:{enable:true,distance:120,color:"#ffffff",opacity:.16,width:1},
          move:{enable:true,speed:1.1,random:true}
        },
        interactivity:{events:{onhover:{enable:true,mode:"repulse"}}},
        retina_detect:true
      });
      // ⭐ Twinkle overlay
      el.classList.add("with-stars");
      el.dataset.booted="yes";
    };
    boot();
  }
  function hideParticles(){ const el=$("#particles-js"); if(!el) return; el.innerHTML=""; el.removeAttribute("data-booted"); el.style.display="none"; el.classList.remove("with-stars"); }
  /************ INSIGNIAS / TAREAS ************/
  function renderBadges(){
    const wrap=$("#childBadges"); if(!wrap) return; wrap.innerHTML="";
    safeForEach(stats.badges,b=>{
      const el=document.createElement("span");
      el.className="medal "+(b.color||"gold");
      el.textContent="🏅 "+(b.name||b);
      wrap.appendChild(el);
    });
  }
  function addBadge(name,color="gold"){
    stats.badges=stats.badges||[];
    if(!stats.badges.find(b=>(b.name||b)===name)){
      stats.badges.push({name,color});
      confettiBurst();
    }
    setStats(stats); renderBadges(); renderTasks();
  }
  function addAchieve(text){
    stats.achievements=stats.achievements||[];
    stats.achievements.push(text);
    setStats(stats);
  }
  function renderTasks(){
    const list=$("#childTasks");
    if(list){
      list.innerHTML="";
      safeForEach(stats.tasks,t=>{
        const li=document.createElement("li");
        li.textContent=t.name+(t.done?" • Completada ✅":" • Pendiente ⏳");
        li.className=t.done?"done":"pending";
        list.appendChild(li);
      });
    }
    const plist=$("#parentTasks");
    if(plist){ plist.innerHTML=$("#childTasks")?.innerHTML||""; }
    const pM=$("#parentMissions");
    if(pM){
      pM.innerHTML="";
      (stats.tasks||[]).filter(t=>t.done).forEach(t=>{
        const li=document.createElement("li"); li.textContent="• "+t.name; pM.appendChild(li);
      });
      if(!(stats.tasks||[]).some(t=>t.done)){
        const li=document.createElement("li"); li.textContent="• Aún no hay misiones completadas"; pM.appendChild(li);
      }
    }
  }
  function setTaskDone(name){
    const t=(stats.tasks||[]).find(x=>x.name===name);
    if(t){ t.done=true; setStats(stats); renderTasks(); }
  }

  /************ BIBLIOTECA ************/
  const BOOKS_BY_LEVEL={
    despegue:[
      {t:"El cohete curioso",a:"L. Vega",img:"https://i.ibb.co/LzRR1zJ0/1.jpg",premium:false},
      {t:"Palabras viajeras",a:"S. Lira",img:"https://i.ibb.co/j996sVhP/2.jpg",premium:false},
      {t:"Amigos del bosque",a:"M. Tilo",img:"https://i.ibb.co/FbFmBDqH/3.jpg",premium:false}
    ],
    tierra:[
      {t:"Sílabas espaciales",a:"C. Nova",img:"https://i.ibb.co/DDxw9pfr/4.jpg",premium:false},
      {t:"Cuentos azules",a:"R. Cielo",img:"https://i.ibb.co/k6qNDdxK/5.jpg.jpg",premium:true},
      {t:"Planeta palabras",a:"M. Terra",img:"https://i.ibb.co/B5kXx5Mv/6.jpg.jpg",premium:false}
    ],
    galactica:[
      {t:"Crónicas galácticas",a:"A. Orión",img:"https://i.ibb.co/zh46FFfD/7.jpg",premium:true},
      {t:"Debates estelares",a:"E. Cosmos",img:"https://i.ibb.co/CKRHXxpn/8.jpg",premium:true},
      {t:"Retos de constelación",a:"V. Draco",img:"https://i.ibb.co/zVXRwWhj/9.jpg",premium:true}
    ]
  };

  let LIB_CUR="despegue", LIB_QUERY="";
  function renderLibrary(level="despegue", query=""){
    LIB_CUR=level; LIB_QUERY=(query||"").toLowerCase();
    const grid=$("#libraryGrid"); if(!grid) return; grid.innerHTML="";
    const subEl=$("#subStatus");
    if(subEl){
      subEl.textContent="Plan: "+(stats.subscription==="premium"?"Premium ⭐":"Gratis");
      subEl.classList.toggle("is-premium",stats.subscription==="premium");
      subEl.classList.toggle("is-free",stats.subscription!=="premium");
    }
    (BOOKS_BY_LEVEL[level]||[])
      .filter(b=> !LIB_QUERY || b.t.toLowerCase().includes(LIB_QUERY) || b.a.toLowerCase().includes(LIB_QUERY))
      .forEach(b=>{
        const card=document.createElement("article");
        card.className="card lift";
        const locked=b.premium&&stats.subscription!=="premium";
        card.innerHTML=`
          <img src="${b.img}" alt="" class="book-img">
          <h3 style="margin:10px 0 6px">${b.t} ${locked?" 🔒":""}</h3>
          <p style="margin:0 0 10px;opacity:.9">Autor: ${b.a}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="chip act-main">${locked?"Desbloquear Premium":"Abrir"}</button>
            <button class="ghost act-ficha">Ficha</button>
            <button class="ghost act-leido">Marcar leído</button>
          </div>`;
        card.querySelector(".act-main")?.addEventListener("click",()=>{
          if(locked){ toast("🔒 Contenido Premium. Ve a Suscripciones.","err"); showPage("subscriptions"); return; }
          stats.points+=5; stats.minutes[stats.minutes.length-1]+=2;
          addAchieve(`Leyó: ${b.t} (+5 pts)`); setStats(stats);
          toast(`📖 ¡Sumaste +5 puntos por leer "${b.t}"!`,"ok");
        });
        card.querySelector(".act-ficha")?.addEventListener("click",()=>downloadFichaPNG(b.t));
        card.querySelector(".act-leido")?.addEventListener("click",()=>{ addAchieve(`Marcado como leído: ${b.t}`); setStats(stats); toast("✅ Marcado como leído","ok"); });
        grid.appendChild(card);
      });
  }
  function initLibraryFilters(){
    $("#libraryFilters")?.addEventListener("click",(e)=>{
      const level=e.target?.dataset?.filter; if(!level) return; renderLibrary(level, LIB_QUERY);
    });
    $("#librarySearch")?.addEventListener("input",(e)=>{
      renderLibrary(LIB_CUR, e.target.value||"");
    });
  }
  function downloadFichaPNG(title){
    const cnv=document.createElement("canvas"); cnv.width=1000; cnv.height=700; const ctx=cnv.getContext("2d");
    const grad=ctx.createLinearGradient(0,0,1000,700); grad.addColorStop(0,"#354ca1"); grad.addColorStop(1,"#da0b61");
    ctx.fillStyle=grad; ctx.fillRect(0,0,1000,700);
    ctx.strokeStyle="rgba(255,255,255,.7)"; ctx.lineWidth=10; ctx.strokeRect(30,30,940,640);
    ctx.fillStyle="#fff"; ctx.font="bold 54px Poppins"; ctx.fillText("Ficha de Lectura",320,160);
    ctx.font="28px Poppins"; ctx.fillText("Título:",220,260);
    ctx.font="bold 36px Poppins"; ctx.fillText(title,300,260);
    ctx.font="24px Poppins"; ctx.fillText("Resumen:",220,330);
    ctx.font="20px Poppins";
    ctx.fillText("_______________________________",220,360);
    ctx.fillText("_______________________________",220,390);
    ctx.fillText("_______________________________",220,420);
    ctx.fillText("Opinión:",220,480);
    ctx.fillText("_______________________________",220,510);
    ctx.fillText("_______________________________",220,540);
    const a=document.createElement("a"); a.download=`Ficha_${title}.png`; a.href=cnv.toDataURL("image/png"); a.click();
    toast("📝 Ficha descargada","ok");
  }

  /************ SUSCRIPCIONES ************/
  function initSubscriptions(){
    const pick=async(planName)=>{
      const el=$("#payMsg");
      if(el) el.textContent=`Procesando suscripción a "${planName}" (demo)...`;
      await sleep(800);
      stats.subscription="premium"; setStats(stats);
      if(el) el.textContent=`✅ ¡${planName} activado! Biblioteca y retos premium desbloqueados.`;
      toast("🎉 ¡Suscripción activada!","ok"); confettiBurst();
      renderLibrary(LIB_CUR, LIB_QUERY);
      addBadge("Miembro Premium","silver");
    };
    $("#btnPlanIndividual")?.addEventListener("click",()=>pick("Club Libronautas Individual"));
    $("#btnPlanColegios")?.addEventListener("click",()=>pick("Club Libronautas para Colegios"));
    $("#btnPlanSalas")?.addEventListener("click",()=>pick("Club Libronautas Salas de tarea"));
  }
  /************ CHARTS MANAGER (FIXES) ************/
  let __chartsDefaultsApplied=false;
  const ChartRegistry = new Map(); // canvasEl -> chartInstance
  const ChartConfigs = new Map();  // canvasId  -> {type, dataFn, optionsFn}
  let io=null, ro=null;

  function applyChartDefaults(){
    if(__chartsDefaultsApplied || !window.Chart) return;
    try{
      Chart.defaults.color = "#fff";
      Chart.defaults.font.family = "'Poppins','Segoe UI',Arial,sans-serif";
      Chart.defaults.maintainAspectRatio = false;
      Chart.defaults.responsive = true;
      __chartsDefaultsApplied = true;
    }catch(_){}
  }

  function ensureCanvasSize(canvas){
    if(!canvas) return;
    const style=getComputedStyle(canvas);
    const givenH=parseInt(style.height)||0;
    if(givenH<200) canvas.style.height="320px";
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 600;
    const h = canvas.clientHeight || parseInt(getComputedStyle(canvas).height) || 320;
    if(w>0) canvas.setAttribute("width", String(w));
    if(h>0) canvas.setAttribute("height", String(h));
  }

  function destroyChart(canvas){
    const inst = ChartRegistry.get(canvas);
    if(inst){
      try{ inst.destroy(); }catch(_){}
      ChartRegistry.delete(canvas);
    }
  }

  function buildChart(canvas, config){
    if(!canvas || !window.Chart) return;
    applyChartDefaults();
    try{ destroyChart(canvas); }catch(_){}
    ensureCanvasSize(canvas);
    const type = config.type;
    const data = typeof config.dataFn === "function" ? config.dataFn() : (config.data||{});
    const options = typeof config.optionsFn === "function" ? config.optionsFn() : (config.options||{});

    // Radar 0–100 sin fondo opaco
    if(type==="radar"){
      options.scales = Object.assign({
        r:{
          min:0, max:100,
          grid:{ color:"#445" },
          angleLines:{ color:"#445" },
          pointLabels:{ color:"#fff" },
          ticks:{
            stepSize:20,
            display:true,
            color:"#9aa2b1",
            backdropColor:"rgba(0,0,0,0)",
            showLabelBackdrop:false
          }
        }
      }, options.scales||{});
    }

    try{
      const chart = new Chart(canvas, { type, data, options });
      ChartRegistry.set(canvas, chart);
    }catch(_){}
  }

  function observeCanvas(canvas, cfg){
    if(!canvas) return;
    ChartConfigs.set(canvas.id, cfg);

    if(!io){
      io = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          const el = entry.target;
          const cfg = ChartConfigs.get(el.id);
          if(!cfg) return;
          if(entry.isIntersecting){
            buildChart(el, cfg);
          }
        });
      }, {root:null, threshold:0.15});
    }
    io.observe(canvas);

    if(!ro){
      ro = new ResizeObserver((entries)=>{
        entries.forEach(e=>{
          const el=e.target;
          if(!(el instanceof HTMLCanvasElement)) return;
          const inst=ChartRegistry.get(el);
          if(inst){
            ensureCanvasSize(el);
            try{ inst.resize(); }catch(_){}
          }
        });
      });
    }
    ro.observe(canvas);
  }

  function safeChart(canvas, type, dataFnOrObj, optionsFnOrObj){
    if(!canvas) return;
    const dataFn = (typeof dataFnOrObj==="function") ? dataFnOrObj : ()=>dataFnOrObj;
    const optionsFn = (typeof optionsFnOrObj==="function") ? optionsFnOrObj : ()=>optionsFnOrObj;
    observeCanvas(canvas, {type, dataFn, optionsFn});
    if(canvas.offsetParent !== null){
      buildChart(canvas, {type, dataFn, optionsFn});
    }
  }

  function destroyChartsInPage(pageId){
    const page = $("#"+pageId);
    if(!page) return;
    ChartRegistry.forEach((inst, canvas)=>{
      if(page.contains(canvas)){
        try{ inst.destroy(); }catch(_){}
        ChartRegistry.delete(canvas);
      }
    });
  }

  /************ UTILIDADES DE DATOS PARA CHARTS ************/
  const rubricValToPct = (v)=> v<=1 ? 33.34 : (v===2 ? 66.67 : 100);
  function calcRubricAveragesPct(){
    const names=Object.keys(stats.students||{});
    const sums=new Array(8).fill(0);
    names.forEach(n=>{
      const row=(stats.rubric && stats.rubric[n])?stats.rubric[n]:[1,1,1,1,1,1,1,1];
      row.forEach((v,i)=>sums[i]+=rubricValToPct(v));
    });
    return sums.map(s=> names.length? +(s/names.length).toFixed(2) : 0);
  }
  function levelDistribution(){
    const dist = {Despegue:0, Tierra:0, Galáctica:0};
    Object.values(stats.students||{}).forEach(s=>{
      const n=(s?.nivel||"").toLowerCase();
      if(n.includes("despegue")) dist.Despegue++;
      else if(n.includes("tierra")) dist.Tierra++;
      else dist.Galáctica++;
    });
    return dist;
  }

  /************ DRAW POR ROL ************/
  function drawChildren(){
    const canvas=$("#childChart");
    safeChart(canvas,"line",()=>({
      labels:["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],
      datasets:[{
        label:"Progreso",
        data:[40,52,58,63,67,71,73],
        borderColor:"#ffcc33",
        backgroundColor:"rgba(255,204,51,.25)",
        fill:true,
        tension:.35
      }]
    }),()=>({
      plugins:{legend:{labels:{color:"#fff"}}},
      scales:{x:{ticks:{color:"#fff"}},y:{ticks:{color:"#fff"}}}
    }));

    renderBadges(); renderTasks();
  }

  function drawParents(){
    $("#pName")&&( $("#pName").textContent = "Nicolás");
    $("#pLevel")&&( $("#pLevel").textContent = "Misión Tierra");
    $("#pLast")&&( $("#pLast").textContent = (stats.achievements||[]).slice(-1)[0] || "—");
    const totalMin=(stats.minutes||[]).reduce((a,b)=>a+b,0);
    $("#pTotalMin")&&( $("#pTotalMin").textContent = totalMin);
    const totalActs=(stats.acts?.silabas||0)+(stats.acts?.sopa||0)+(stats.acts?.trivia||0);
    $("#pActs")&&( $("#pActs").textContent = totalActs);
    $("#pProg")&&( $("#pProg").textContent = Math.min(100, Math.round(totalMin/5))+"%");

    const canvas=$("#progressChart");
    safeChart(canvas,"bar",()=>({
      labels:["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],
      datasets:[{label:"Minutos de lectura",data:stats.minutes||[],backgroundColor:"#ffcc33"}]
    }),()=>({
      plugins:{legend:{labels:{color:"#fff"}}},
      scales:{x:{ticks:{color:"#fff"}},y:{ticks:{color:"#fff"}}}
    }));

    const ul=$("#parentAchievements");
    if(ul){
      ul.innerHTML="";
      (stats.achievements||[]).slice(-6).reverse().forEach(a=>{
        const li=document.createElement("li"); li.textContent="• "+a; ul.appendChild(li);
      });
    }
    const list=$("#parentTasks");
    if(list){
      list.innerHTML="";
      (stats.tasks||[]).forEach(t=>{
        const li=document.createElement("li");
        li.className=t.done?"done":"pending";
        li.textContent=t.name + (t.done?" • Completada ✅":" • Pendiente ⏳");
        list.appendChild(li);
      });
    }
    const pM=$("#parentMissions");
    if(pM){
      pM.innerHTML="";
      (stats.tasks||[]).filter(t=>t.done).forEach(t=>{
        const li=document.createElement("li"); li.textContent="• "+t.name; pM.appendChild(li);
      });
      if(!(stats.tasks||[]).some(t=>t.done)){
        const li=document.createElement("li"); li.textContent="• Aún no hay misiones completadas"; pM.appendChild(li);
      }
    }
  }

  function drawTeachers(){
    const totalStudents = Object.keys(stats.students||{}).length;
    const avg = Math.round( Object.values(stats.students||{}).reduce((a,s)=>a+(s?.prog||0),0) / (totalStudents||1) );
    $("#tStudents")&&( $("#tStudents").textContent = totalStudents);
    $("#tAvg")&&( $("#tAvg").textContent = (isFinite(avg)?avg:0)+"%");
    $("#tCompleted")&&( $("#tCompleted").textContent = ((stats.acts?.silabas||0)+(stats.acts?.sopa||0)+(stats.acts?.trivia||0)));

    const tb=$("#teacherTable");
    if(tb){
      tb.innerHTML="";
      Object.entries(stats.students||{}).forEach(([n,s])=>{
        tb.innerHTML += `<tr><td>${n}</td><td>${s.nivel}</td><td>${s.prog}%</td><td>${s.last}</td></tr>`;
      });
    }

    const radar=$("#teacherRadar");
    safeChart(radar,"radar",()=>({
      labels:["Sílabas","Palabras","Lectura grupal","Escritura","Comprensión","Tareas","Lectura casa","Disposición"],
      datasets:[{
        label:"Promedio de rúbrica (0–100)",
        data:calcRubricAveragesPct(),
        borderColor:"#46d5ff",
        backgroundColor:"rgba(70,213,255,.25)"
      }]
    }),()=>({
      plugins:{legend:{labels:{color:"#fff"}}}
    }));

    renderRubricTable();

    $("#btnExportClass")?.addEventListener("click",exportClassCSV,{once:true});
    $("#btnRubricExport")?.addEventListener("click",exportRubricCSV);
  }

  function drawSchool(){
    $("#kidsActive") && ($("#kidsActive").textContent = stats.kpis?.active ?? 0);
    $("#avgProgress") && ($("#avgProgress").textContent = (stats.kpis?.avg ?? 0) + "%");
    $("#todayActs") && ($("#todayActs").textContent = stats.kpis?.today ?? 0);

    const dist = levelDistribution();
    safeChart($("#schoolChart"),"doughnut",()=>({
      labels:["Despegue","Tierra","Galáctica"],
      datasets:[{data:[dist.Despegue, dist.Tierra, dist.Galáctica],backgroundColor:["#da0b61","#354ca1","#ffcc33"]}]
    }),()=>({
      plugins:{legend:{labels:{color:"#fff"}}}
    }));

    safeChart($("#schoolBars"),"bar",()=>({
      labels:["Sílabas","Sopa","Trivia"],
      datasets:[{
        label:"Total hoy",
        data:[stats.acts?.silabas||0,stats.acts?.sopa||0,stats.acts?.trivia||0],
        backgroundColor:["#da0b61","#354ca1","#6dd47e"]
      }]
    }),()=>({
      plugins:{legend:{labels:{color:"#fff"}}},
      scales:{x:{ticks:{color:"#fff"}},y:{ticks:{color:"#fff"}}}
    }));

    const sum=$("#schoolSummary");
    if(sum){
      sum.innerHTML="";
      [
        `Total de estudiantes activos: ${stats.kpis?.active ?? 0}`,
        `Promedio general de progreso: ${stats.kpis?.avg ?? 0}%`,
        `Actividades completadas hoy: ${stats.kpis?.today ?? 0}`
      ].forEach(t=>{
        const li=document.createElement("li"); li.textContent="• "+t; sum.appendChild(li);
      });
    }
  }

  /************ RÚBRICA DOCENTE ************/
  const RUBRIC_LABELS=["Recon. sílabas","Palabras simples","Lectura grupal","Escritura","Comprensión","Tareas","Lectura en casa","Disposición"];
  function statusToEmoji(v){ return v===3?"✅":(v===2?"➖":"❌"); }
  function cycleStatus(v){ return v===1?2:(v===2?3:1); }
  function renderRubricTable(){
    const tbody=$("#rubricTable"); if(!tbody) return;
    tbody.innerHTML="";
    const studs = Object.keys(stats.students||{});
    studs.forEach(name=>{
      const tr=document.createElement("tr");
      const tdName=document.createElement("td"); tdName.textContent=name; tr.appendChild(tdName);
      const row=(stats.rubric && stats.rubric[name])?stats.rubric[name]:[1,1,1,1,1,1,1,1];
      if(!stats.rubric) stats.rubric={}; stats.rubric[name]=row;
      row.forEach((v,idx)=>{
        const td=document.createElement("td"); td.className="rubric-cell";
        const btn=document.createElement("button");
        btn.textContent=statusToEmoji(v);
        btn.style.background = v===3 ? "#7ff1b2" : (v===2 ? "#ffe07a" : "#ffb3b3");
        btn.addEventListener("click",()=>{
          const newV=cycleStatus(stats.rubric[name][idx]);
          stats.rubric[name][idx]=newV; setStats(stats);
          btn.textContent=statusToEmoji(newV);
          btn.style.background = newV===3 ? "#7ff1b2" : (newV===2 ? "#ffe07a" : "#ffb3b3");
          const radar=$("#teacherRadar");
          if(radar) buildChart(radar, ChartConfigs.get("teacherRadar"));
        });
        td.appendChild(btn); tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
  function exportClassCSV(){
    let csv="Estudiante,Nivel,Progreso,Ultima actividad\n";
    Object.entries(stats.students||{}).forEach(([n,s])=>{
      csv+=`${n},${s.nivel},${s.prog}%,${s.last}\n`;
    });
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="reporte_clase.csv"; a.click();
    toast("📥 Reporte descargado","ok");
  }
  function exportRubricCSV(){
    let header=["Estudiante",...RUBRIC_LABELS].join(",")+"\n"; let rows="";
    Object.keys(stats.students||{}).forEach(name=>{
      const row=(stats.rubric && stats.rubric[name])?stats.rubric[name]:[1,1,1,1,1,1,1,1];
      rows += [name, ...row].join(",") + "\n";
    });
    const blob=new Blob([header+rows],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="rubrica_libronautas.csv"; a.click();
    toast("📥 Rúbrica exportada","ok");
  }

  /************ FUNCIONES POR ROL ************/
  function downloadDiplomaPNG(){
    const cnv=document.createElement("canvas"); cnv.width=900; cnv.height=600; const ctx=cnv.getContext("2d");
    ctx.fillStyle="#fffacd"; ctx.fillRect(0,0,900,600);
    ctx.fillStyle="#000"; ctx.font="bold 42px Poppins"; ctx.fillText("Diploma Libronautas",280,150);
    ctx.font="28px Poppins"; ctx.fillText("Otorgado a:",150,260);
    ctx.fillText(getAuth()?.name || "Estudiante",350,260);
    ctx.fillText("Por completar misiones y lecturas",180,320);
    const a=document.createElement("a"); a.download="Diploma.png"; a.href=cnv.toDataURL(); a.click();
    toast("📜 Diploma descargado");
  }
  function downloadResourcesPDF(){
    const blob=new Blob(["Material de apoyo Libronautas"],{type:"application/pdf"});
    const a=document.createElement("a"); a.download="Recursos.pdf"; a.href=URL.createObjectURL(blob); a.click();
    toast("📥 Recursos descargados");
  }
  function addGroup(name){ stats.groups.push(name); setStats(stats); renderGroups(); }
  function renderGroups(){
    const ul=$("#groupList"); if(!ul) return;
    ul.innerHTML="";
    (stats.groups||[]).forEach(g=>{
      const li=document.createElement("li"); li.textContent=g; ul.appendChild(li);
    });
  }
  function exportSchoolReport(){
    let csv="Métrica,Valor\n";
    csv+=`Estudiantes activos,${stats.kpis.active}\n`;
    csv+=`Progreso promedio,${stats.kpis.avg}%\n`;
    csv+=`Actividades hoy,${stats.kpis.today}\n`;
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="reporte_colegio.csv"; a.click();
    toast("📊 Reporte colegio descargado");
  }

  /************ JUEGO: SÍLABAS ************/
  const SYLL_POOL=["BA","BE","BI","BO","BU","LA","LE","LI","LO","LU","MA","ME","MI","MO","MU","NA","NE","NI","NO","NU","RA","RE","RI","RO","RU"];
  let sLevel=1,sRound=1,sLives=3,sScore=0,sStreak=0,sTime=15,sTimer=null,sTarget="";
  const baseTime=()=>Math.max(7, 16 - sLevel*2);
  const optionsCount=()=>Math.min(7, 4 + sLevel);
  function updSyllHUD(){
    $("#syllLevel") && ($("#syllLevel").textContent=sLevel);
    $("#syllRound") && ($("#syllRound").textContent=sRound);
    $("#syllLives") && ($("#syllLives").textContent=sLives);
    $("#syllStreak") && ($("#syllStreak").textContent=sStreak);
    $("#syllTime")  && ($("#syllTime").textContent=sTime);
    $("#syllScore") && ($("#syllScore").textContent=sScore);
    $("#syllTarget")&& ($("#syllTarget").textContent=sTarget);
  }
  function startSyllables(){ sLevel=1; resetSyll(); nextSyll(); }
  function resetSyll(){ sRound=1;sLives=3;sScore=0;sStreak=0;sTime=baseTime(); updSyllHUD(); }
  function nextSyll(){
    clearInterval(sTimer); sTime=baseTime(); sTarget = SYLL_POOL[Math.floor(Math.random()*SYLL_POOL.length)]; updSyllHUD();
    const box=$("#syllOptions"); if(!box) return; box.innerHTML="";
    const opts=[...SYLL_POOL].sort(()=>Math.random()-0.5).slice(0,optionsCount());
    if(!opts.includes(sTarget)) opts[0]=sTarget; opts.sort(()=>Math.random()-0.5);
    opts.forEach(s=>{
      const b=document.createElement("button"); b.className="quiz-opt ghost"; b.textContent=s; b.onclick=()=>pickSyll(b,s); box.appendChild(b);
    });
    sTimer=setInterval(()=>{
      sTime--; $("#syllTime") && ($("#syllTime").textContent=sTime);
      if(sTime<=0){ clearInterval(sTimer); loseSyllLife(); }
    },1000);
  }
  function pickSyll(btn,val){
    if(val===sTarget){
      btn.classList.add("correct");
      sScore+=10; sStreak++; updSyllHUD();
      toast("✅ ¡Correcto! +10 pts","ok"); confettiBurst();
      setTimeout(()=>{ sRound++; (sRound>6)?levelUpSyll():nextSyll(); },700);
    } else {
      btn.classList.add("wrong");
      sStreak=0; updSyllHUD(); toast("❌ Ups, te equivocaste. ¡Intenta de nuevo!","err");
      loseSyllLife();
    }
  }
  function loseSyllLife(){ sLives--; updSyllHUD(); if(sLives<=0){ endSyll(false);} else { sRound++; (sRound>6)?levelUpSyll():nextSyll(); } }
  function levelUpSyll(){
    sLevel++; addAchieve("Nivel subido en Sílabas 🚀");
    stats.acts.silabas++; stats.kpis.today++; addBadge("Piloto Silábico","blue"); setTaskDone("Sílabas"); setStats(stats);
    endSyll(true);
  }
  function endSyll(win){
    clearInterval(sTimer);
    alert(win?`¡Nivel ${sLevel-1} completado! Puntos: ${sScore}`:`Fin del juego. Puntos: ${sScore}`);
    showPage("children");
  }

  /************ JUEGO: SOPA DE LETRAS ************/
  const WS_SIZE=12, ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const WS_BANK=[["SOL","LUNA","MAR","COMETA","ESTRELLA"],["NAVE","ASTRO","GALAXIA","ROCA","NEBULOSA"],["LIBRO","LETRA","PALABRA","CUENTO","POEMA"]];
  let WS_WORDS=[], grid=[], placed=[], found=0, sel=null;
  function initWordSearch(){ pickWords(); buildWS(); renderWS(); renderWSWords(); }
  function pickWords(){ const set=WS_BANK[Math.floor(Math.random()*WS_BANK.length)]; WS_WORDS=[...set].sort(()=>Math.random()-0.5).slice(0,5); }
  function buildWS(){
    grid=Array.from({length:WS_SIZE},()=>Array(WS_SIZE).fill("")); placed=[]; found=0; sel=null;
    const dirs=[[1,0],[0,1],[1,1],[-1,1],[1,-1],[0,-1],[-1,0],[-1,-1]];
    const can=(w,r,c,dr,dc)=>{
      for(let i=0;i<w.length;i++){
        const nr=r+dr*i,nc=c+dc*i;
        if(nr<0||nc<0||nr>=WS_SIZE||nc>=WS_SIZE) return false;
        if(grid[nr][nc] && grid[nr][nc]!==w[i]) return false;
      }
      return true;
    };
    const place=(w)=>{
      for(let t=0;t<250;t++){
        const [dr,dc]=dirs[Math.floor(Math.random()*dirs.length)],
              r=Math.floor(Math.random()*WS_SIZE),
              c=Math.floor(Math.random()*WS_SIZE);
        if(can(w,r,c,dr,dc)){
          for(let i=0;i<w.length;i++) grid[r+dr*i][c+dc*i]=w[i];
          placed.push({word:w,row:r,col:c,dr,dc});
          return true;
        }
      }
      return false;
    };
    WS_WORDS.forEach(w=>place(w));
    for(let r=0;r<WS_SIZE;r++) for(let c=0;c<WS_SIZE;c++) if(!grid[r][c]) grid[r][c]=ABC[Math.floor(Math.random()*ABC.length)];
  }
  function renderWS(){
    const g=$("#wordGrid"); if(!g) return; g.innerHTML="";
    for(let r=0;r<WS_SIZE;r++) for(let c=0;c<WS_SIZE;c++){
      const d=document.createElement("div"); d.className="cell"; d.textContent=grid[r][c];
      d.dataset.r=r; d.dataset.c=c; d.onclick=onCell; g.appendChild(d);
    }
    $("#foundWords") && ($("#foundWords").textContent=found);
    $("#totalWords") && ($("#totalWords").textContent=WS_WORDS.length);
    $("#wsReset") && ($("#wsReset").onclick=()=>initWordSearch());
  }
  function renderWSWords(){
    const cont=$("#wsWords"); if(!cont) return; cont.innerHTML="";
    WS_WORDS.forEach(w=>{
      const b=document.createElement("span"); b.className="badge"; b.dataset.word=w; b.textContent=w; cont.appendChild(b);
    });
  }
  function onCell(e){
    const r=+e.currentTarget.dataset.r,c=+e.currentTarget.dataset.c;
    if(!sel){ sel={r,c}; e.currentTarget.classList.add("sel"); }
    else { const r0=sel.r,c0=sel.c; $$(".cell.sel").forEach(x=>x.classList.remove("sel")); checkSel(r0,c0,r,c); sel=null; }
  }
  function pathLine(r0,c0,r1,c1){
    const dr=Math.sign(r1-r0),dc=Math.sign(c1-c0),
      len=Math.max(Math.abs(r1-r0),Math.abs(c1-c0))+1;
    if(!(r0===r1||c0===c1||Math.abs(r1-r0)===Math.abs(c1-c0))) return null;
    const cells=[]; for(let i=0;i<len;i++) cells.push([r0+dr*i,c0+dc*i]); return {cells,dr,dc};
  }
  function checkSel(r0,c0,r1,c1){
    const p=pathLine(r0,c0,r1,c1); if(!p) return;
    const letters=p.cells.map(([r,c])=>grid[r][c]).join(""), rev=[...letters].reverse().join("");
    const ok=placed.find(q=> q.word===letters || q.word===rev );
    if(ok){
      p.cells.forEach(([r,c])=>{
        const el=$(`.cell[data-r="${r}"][data-c="${c}"]`); el && el.classList.add("found");
      });
      const badge = $(`#wsWords .badge[data-word="${ok.word}"]`); badge && badge.classList.add("found");
      found++; $("#foundWords") && ($("#foundWords").textContent=found);
      toast(`✅ ¡Encontraste "${ok.word}"!`,"ok"); confettiBurst();
      if(found===WS_WORDS.length){
        addAchieve("Sopa completada 🧩");
        stats.acts.sopa++; stats.kpis.today++; addBadge("Cazador de Palabras","green"); setTaskDone("Sopa de Letras"); setStats(stats);
        setTimeout(()=>{ toast("🔁 Nueva sopa lista","ok"); initWordSearch(); },650);
      }
    } else { toast("❌ No forma una palabra válida","err"); }
  }

  /************ TRIVIA ************/
  const BANK=[
    {q:"¿Qué planeta es conocido como el planeta rojo?",opts:["Marte","Venus","Júpiter"],a:0},
    {q:"“Ga-lax-ia” tiene cuántas sílabas?",opts:["3","4","5"],a:1},
    {q:"¿Qué astro nos da luz y calor?",opts:["La Luna","El Sol","Un cometa"],a:1},
    {q:"¿Quién escribió 'El Principito'?",opts:["Antoine de Saint-Exupéry","García Márquez","J.K. Rowling"],a:0},
    {q:"“Co-me-ta” tiene cuántas sílabas?",opts:["2","3","4"],a:1}
  ];
  let QUIZ=[], qi=0, qScore=0, qTime=15, qInt=null;
  function startTrivia(){
    const end=$("#quizEnd"), card=$("#triviaCard"); if(!end || !card) return;
    QUIZ=[...BANK].sort(()=>Math.random()-0.5).slice(0,4); qi=0; qScore=0;
    $("#finalScore") && ($("#finalScore").textContent=0);
    end.style.display="none"; card.style.display="block"; renderQ();
  }
  function renderQ(){
    clearInterval(qInt);
    const q=QUIZ[qi]; if(!q) return;
    $("#qIdx") && ($("#qIdx").textContent=qi+1); $("#qTotal") && ($("#qTotal").textContent=QUIZ.length);
    qTime=15; $("#qTime") && ($("#qTime").textContent=qTime);
    $("#quizQ") && ($("#quizQ").textContent=q.q);
    const box=$("#quizOpts"); if(!box) return; box.innerHTML="";
    q.opts.forEach((t,i)=>{
      const b=document.createElement("button"); b.className="quiz-opt ghost"; b.textContent=t; b.onclick=()=>selectOpt(b,i); box.appendChild(b);
    });
    qInt=setInterval(()=>{
      qTime--; $("#qTime") && ($("#qTime").textContent=qTime);
      if(qTime<=0){ toast("⌛ Tiempo agotado","err"); lockQ(); setTimeout(nextQ,650); }
    },1000);
    $("#triviaScore") && ($("#triviaScore").textContent=qScore);
  }
  function selectOpt(btn,i){
    const correct=QUIZ[qi].a; lockQ();
    if(i===correct){ btn.classList.add("correct"); qScore+=10; toast("✅ ¡Correcto! +10 pts","ok"); confettiBurst(); }
    else { btn.classList.add("wrong"); toast("❌ Respuesta incorrecta","err"); }
    $("#triviaScore") && ($("#triviaScore").textContent=qScore); setTimeout(nextQ,700);
  }
  function lockQ(){ $$(".quiz-opt").forEach(b=>b.disabled=true); clearInterval(qInt); }
  function nextQ(){ qi++; if(qi>=QUIZ.length) endQuiz(); else renderQ(); }
  function endQuiz(){
    const end=$("#quizEnd"), card=$("#triviaCard"); if(!end || !card) return;
    card.style.display="none"; end.style.display="block"; $("#finalScore") && ($("#finalScore").textContent=qScore);
    addAchieve("Trivia completada ❓"); stats.acts.trivia++; stats.kpis.today++; addBadge("Mente Galáctica","pink"); setTaskDone("Trivia"); setStats(stats);
  }

  /************ DRAW / ROUTER ************/
  function drawSectionCharts(id){
    if(id==="children") drawChildren();
    if(id==="parents")  drawParents();
    if(id==="teachers") drawTeachers();
    if(id==="school")   drawSchool();
  }

  function showPage(id){
    const auth=getAuth(); const role=auth?.role||null;
    if(!canAccess(role,id)){
      if(!role){ openModal("loginModal"); return; }
      id = ROLE_HOME[role] || "home";
    }
    const current=$(".page.active")?.id;
    if(current && current!==id){ destroyChartsInPage(current); }

    $$(".page").forEach(p=>{ p.classList.remove("active"); p.style.display="none"; });
    const page=$("#"+id); if(page){ page.classList.add("active"); page.style.display="block"; }

    $$(".main-nav .nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.go===id));

    const part=$("#particles-js");
    if(id==="home"){ ensureParticles(); if(part) part.style.display="block"; document.body.classList.add("home-active"); }
    else { hideParticles(); document.body.classList.remove("home-active"); }

    if(id==="library") renderLibrary(LIB_CUR, LIB_QUERY);
    drawSectionCharts(id);

    if(id==="children"){
      $("#btnDiploma")?.removeEventListener("click",downloadDiplomaPNG);
      $("#btnDiploma")?.addEventListener("click",downloadDiplomaPNG);
    }
    if(id==="parents"){
      $("#btnResources")?.removeEventListener("click",downloadResourcesPDF);
      $("#btnResources")?.addEventListener("click",downloadResourcesPDF);
    }
    if(id==="teachers"){
      renderGroups();
      const form=$("#groupForm");
      if(form){
        form.onsubmit=null;
        form.addEventListener("submit",(e)=>{
          e.preventDefault();
          const name=$("#groupName")?.value.trim();
          if(!name) return;
          addGroup(name);
          $("#groupName").value="";
          toast("👥 Grupo añadido","ok");
        });
      }
    }
    if(id==="school"){
      $("#btnSchoolExport")?.removeEventListener("click",exportSchoolReport);
      $("#btnSchoolExport")?.addEventListener("click",exportSchoolReport);
    }
    if(id==="game-syllables")  startSyllables();
    if(id==="game-wordsearch") initWordSearch();
    if(id==="game-trivia")     startTrivia();
  }

  /************ LOGIN / REGISTER ************/
  function openModal(id){ const m=$("#"+id); if(!m) return; m.classList.add("show"); m.setAttribute("aria-hidden","false"); }
  function closeModal(m){ if(!m) return; m.classList.remove("show"); m.setAttribute("aria-hidden","true"); }

  // 🔧 FIX AVATARES IMGBB (radio + grid) → sin deformación, tamaño consistente y selección circular
  function ensureAvatarGridStyles(){
    if(document.getElementById("avatarFixStyles")) return;
    const css = `
      .avatar-label{margin-top:6px; font-weight:700}
      .avatar-grid{display:grid; grid-template-columns:repeat(auto-fit, minmax(84px, 1fr)); gap:10px; margin:6px 0 2px}
      .avatar-grid label{position:relative; display:block; cursor:pointer; border-radius:50%; width:84px; height:84px; overflow:hidden; margin:auto; transition:transform .2s ease, box-shadow .2s ease}
      .avatar-grid input[type="radio"]{position:absolute; opacity:0; inset:0}
      .avatar-grid img{width:100%; height:100%; object-fit:cover; display:block; border-radius:50%}
      .avatar-grid label:hover{transform:translateY(-2px); box-shadow:0 10px 20px rgba(0,0,0,.35)}
      .avatar-grid label.selected{outline:3px solid #ffcc33; box-shadow:0 0 0 6px rgba(255,204,51,.25)}
    `;
    const style = document.createElement("style");
    style.id="avatarFixStyles";
    style.textContent=css;
    document.head.appendChild(style);
  }
  function initAvatarRadios(){
    ensureAvatarGridStyles();
    const grid = $(".avatar-grid");
    if(!grid) return;
    const labels = Array.from(grid.querySelectorAll("label"));
    const radios  = Array.from(grid.querySelectorAll('input[type="radio"][name="avatar"]'));
    // Marca selección visual al cambiar
    radios.forEach(r=>{
      r.addEventListener("change",()=>{
        labels.forEach(l=>l.classList.remove("selected"));
        const lab = r.closest("label");
        lab && lab.classList.add("selected");
      });
    });
    // Si hay alguno checked por HTML, reflejarlo
    const pre = grid.querySelector('input[type="radio"][name="avatar"]:checked');
    if(pre){ pre.dispatchEvent(new Event("change", {bubbles:false})); }
  }

  function initAuth(){
    $("[data-go='login']")?.addEventListener("click",()=>openModal("loginModal"));
    $("[data-go='register']")?.addEventListener("click",()=>openModal("registerModal"));
    $$(".login-close").forEach(btn=>btn.addEventListener("click",()=>closeModal(btn.closest(".modal"))));
    $$(".modal").forEach(m=>m.addEventListener("click",(e)=>{ if(e.target===m) closeModal(m); }));
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape"){ closeModal($("#loginModal")); closeModal($("#registerModal")); } });

    $("#loginForm")?.addEventListener("submit",async (e)=>{
      e.preventDefault();
      const u=$("#username")?.value.trim().toLowerCase();
      const p=$("#password")?.value;
      const role=$("#role")?.value;
      const remember=$("#remember")?.checked;
      const msg=$("#loginMsg");
      if(msg) msg.style.color="#ff8ea8";
      if(!u||!p){ msg && (msg.textContent="Completa usuario y contraseña."); return; }
      const reg=DEMO_USERS[u];
      if(!reg||reg.pass!==p||reg.role!==role){ msg && (msg.textContent="Credenciales inválidas (revisa usuario, contraseña o rol)."); return; }
      msg && (msg.style.color="#6dd47e", msg.textContent="¡Bienvenido! Redirigiendo…");
      setAuth({user:u, role, name:reg.name},{remember:!!remember});
      updateRoleVisibility(role);
      await sleep(420);
      closeModal($("#loginModal"));
      const home = ROLE_HOME[role] || "home";
      showPage(home);
      toast("Sesión iniciada","ok");
    });

    // Registro con avatares por imgbb (radio)
    initAvatarRadios();
    $("#registerForm")?.addEventListener("submit",(e)=>{
      e.preventDefault();
      const user=$("#regUser")?.value.trim().toLowerCase();
      const pass=$("#regPass")?.value;
      const role=$("#regRole")?.value;
      const name=$("#regName")?.value;
      const msg=$("#regMsg");
      const chosen = (document.querySelector('input[name="avatar"]:checked')?.value)||"astronauta1";
      if(!user||!pass||!name||!role){
        if(msg){ msg.textContent="Completa todos los campos."; msg.style.color="#ff8ea8"; }
        return;
      }
      DEMO_USERS[user]={pass,role,name,avatar:chosen};
      if(msg){ msg.textContent="¡Registro exitoso! Ahora puedes iniciar sesión."; msg.style.color="#6dd47e"; }
      setTimeout(()=>closeModal($("#registerModal")),900);
    });

    const auth=getAuth();
    updateRoleVisibility(auth?.role || null);
  }

  /************ INIT ************/
  function init(){
    initMenu();

    // Router por data-go (incluye "Conocer más" → about)
    document.addEventListener("click",(e)=>{
      const trg = e.target?.closest?.("[data-go]");
      const go = trg?.dataset?.go;
      if(!go) return;
      if(go==="logout"){ return; }
      if(go==="login"||go==="register"){
        if(go==="login") openModal("loginModal"); else openModal("registerModal");
        return;
      }
      const auth=getAuth();
      if(!canAccess(auth?.role || null, go)){
        if(!auth){ openModal("loginModal"); return; }
        const home = ROLE_HOME[auth.role] || "home";
        showPage(home);
        return;
      }
      showPage(go);
    });

    // efecto tecleo en home
    const sub=$("#typed");
    if(sub){
      const full=sub.textContent.trim(); sub.textContent="";
      let i=0; (function tick(){ sub.textContent = full.slice(0,i++); if(i<=full.length) setTimeout(tick,18); })();
    }

    initLibraryFilters();
    initSubscriptions();
    initAuth();
    renderBadges(); renderTasks();

    // Start page
    const auth = getAuth();
    const start = auth?.role ? (ROLE_HOME[auth.role] || "home") : "home";
    showPage(start);

    // Reajuste global al redimensionar
    window.addEventListener("resize", ()=>{
      ChartRegistry.forEach((inst, canvas)=>{
        ensureCanvasSize(canvas);
        try{ inst.resize(); }catch(_){}
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// Evita warnings de ResizeObserver en Chrome
const resizeObserverErr = (e) => {
  if (e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
  }
};
window.addEventListener('error', resizeObserverErr);
window.addEventListener('unhandledrejection', resizeObserverErr);

// 🔧 Silenciar sólo los warnings de RO, mantener otros errores visibles
const roErrFix = (err) => {
  if (err.message && err.message.includes("ResizeObserver loop")) {
    return;
  }
  console.error(err);
};
window.addEventListener("error", roErrFix);
window.addEventListener("unhandledrejection", roErrFix);