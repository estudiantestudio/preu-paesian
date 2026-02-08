// app.js — Demo local: guarda datos en localStorage.
// Incluye: diagnóstico, rutas, active recall (preguntas), spaced repetition (repasos), ensayos, dashboard, motivación, vocacional, tutor UI.

const LS_KEY = "preu_state_v1";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = loadState();

initTheme();
renderNav();
renderHome();
renderStudy();
renderPractice();
renderProgress();
renderTutor();
wireGlobalSearch();
wireContinueButtons();
wireModals();
wireMotivation();

function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  const base = {
    theme: "dark",
    lastRoute: null, // { page, subjectId, topicId }
    streak: 0,
    level: 1,
    weeklyGoals: { total: 0, done: 0 },
    attempts: [], // { id, date, mode, subjectId, scorePct, timeUsedMin }
    mastery: {},  // topicId -> 0..100
    reviews: []   // { topicId, dueISO, intervalDays }
  };
  try{
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  }catch{
    return base;
  }
}
function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function initTheme(){
  document.documentElement.dataset.theme = state.theme === "light" ? "light" : "dark";
  $("#themeIcon").textContent = state.theme === "light" ? "☀️" : "🌙";
  $("#themeBtn").addEventListener("click", () => {
    state.theme = (state.theme === "light") ? "dark" : "light";
    saveState();
    initTheme();
  });
}

function renderNav(){
  $$(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => openPage(btn.dataset.page));
  });
  $("#openTutorBtn").addEventListener("click", () => openPage("tutor"));
}

function openPage(page){
  $$(".page").forEach(p => p.classList.add("hidden"));
  $(`#page-${page}`).classList.remove("hidden");

  $$(".nav-item").forEach(b => b.classList.remove("active"));
  const active = $(`.nav-item[data-page="${page}"]`);
  if(active) active.classList.add("active");

  state.lastRoute = state.lastRoute || {};
  state.lastRoute.page = page;
  saveState();

  if(page === "progress") renderProgress();
  if(page === "home") renderHome();
}

function renderHome(){
  $("#streakPill").textContent = `🔥 Racha: ${state.streak}`;
  $("#levelPill").textContent = `🏆 Nivel: ${state.level}`;
  $("#kpiScore").textContent = estimateScore();
  $("#kpiGoals").textContent = `${state.weeklyGoals.done}/${state.weeklyGoals.total}`;

  const next = nextReviewDue();
  $("#nextReviewPill").textContent = `⏱ Próximo repaso: ${next ? prettyDate(next.dueISO) : "—"}`;

  renderSparkline();
  renderTodayPlan();
  renderContinueCard();

  $("#runDiagnosticBtn").onclick = () => openDiagnosticModal();
  $("#setWeeklyGoalsBtn").onclick = () => openWeeklyGoalsModal();
  $("#openVocationalBtn").onclick = () => openVocationalModal();
  $("#startPlanBtn").onclick = () => {
    const plan = buildPlan();
    if(plan[0]) jumpToItem(plan[0]);
  };
}

function renderSparkline(){
  const el = $("#sparkline");
  el.innerHTML = "";
  const last = state.attempts.slice(-7);
  const values = last.length ? last.map(a => a.scorePct) : [30, 35, 40, 45, 40, 50, 55]; // demo
  const max = Math.max(...values, 1);
  values.forEach(v => {
    const bar = document.createElement("div");
    bar.className = "spark-bar";
    bar.style.height = `${Math.max(8, Math.round((v / max) * 70))}px`;
    el.appendChild(bar);
  });
}

function renderContinueCard(){
  const title = $("#continueTitle");
  const sub = $("#continueSubtitle");

  if(state.lastRoute?.topicId){
    const t = PREU_DATA.topics.find(x => x.id === state.lastRoute.topicId);
    title.textContent = `Último: ${t?.title || "Tema"}`;
    sub.textContent = `Continúa en ${t ? subjectName(t.subject) : "tu ruta"}.`;
  }else{
    title.textContent = "Aún no has comenzado.";
    sub.textContent = "Haz un diagnóstico o empieza una ruta.";
  }

  $("#continueNowBtn").onclick = () => {
    if(state.lastRoute?.page) openPage(state.lastRoute.page);
    else openPage("home");
  };
}

function wireContinueButtons(){
  $("#continueBtn").addEventListener("click", () => {
    if(state.lastRoute?.page) openPage(state.lastRoute.page);
    else openPage("home");
  });
}

function renderTodayPlan(){
  const wrap = $("#todayPlan");
  wrap.innerHTML = "";

  const plan = buildPlan(); // [items]
  plan.slice(0, 4).forEach(item => {
    const card = document.createElement("div");
    card.className = "list-item";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
        <div>
          <div style="font-weight:700;">${item.title}</div>
          <div class="muted small">${item.subtitle}</div>
        </div>
        <span class="pill">${item.tag}</span>
      </div>
    `;
    card.onclick = () => jumpToItem(item);
    wrap.appendChild(card);
  });

  if(plan.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "Haz diagnóstico para generar tu ruta personalizada.";
    wrap.appendChild(empty);
  }
}

function buildPlan(){
  // Prioridad: repasos vencidos (Spaced Repetition) -> debilidades -> avanzar ruta
  const due = dueReviews();
  const plan = [];

  due.slice(0,2).forEach(r => {
    const t = PREU_DATA.topics.find(x => x.id === r.topicId);
    if(!t) return;
    plan.push({
      kind: "review",
      title: `Repaso: ${t.title}`,
      subtitle: `Spaced repetition • ${subjectName(t.subject)} • vence ${prettyDate(r.dueISO)}`,
      tag: "Repaso",
      page: "study",
      topicId: t.id,
      subjectId: t.subject
    });
  });

  const weaknesses = weakestTopics().slice(0,2);
  weaknesses.forEach(t => {
    plan.push({
      kind: "reinforce",
      title: `Refuerzo: ${t.title}`,
      subtitle: `Debilidad detectada • ${subjectName(t.subject)} • explicaciones alternativas`,
      tag: "Refuerzo",
      page: "study",
      topicId: t.id,
      subjectId: t.subject
    });
  });

  // Si no hay nada, sugerimos empezar por un tema base de cada track
  if(plan.length === 0){
    const starter = PREU_DATA.topics.slice(0,3);
    starter.forEach(t => plan.push({
      kind: "start",
      title: `Comienza: ${t.title}`,
      subtitle: `Miniclases + práctica • ${subjectName(t.subject)}`,
      tag: "Inicio",
      page: "study",
      topicId: t.id,
      subjectId: t.subject
    }));
  }

  return plan;
}

function jumpToItem(item){
  state.lastRoute = { page: item.page, subjectId: item.subjectId, topicId: item.topicId };
  saveState();
  openPage(item.page);
  // En study, auto abrir el tema
  openStudyTopic(item.subjectId, item.topicId);
}

function renderStudy(){
  const list = $("#subjectsList");
  list.innerHTML = "";
  PREU_DATA.subjects.forEach(s => {
    const el = document.createElement("div");
    el.className = "list-item";
    el.innerHTML = `<div style="font-weight:700;">${s.name}</div><div class="muted small">${s.track}</div>`;
    el.onclick = () => openStudySubject(s.id);
    list.appendChild(el);
  });
}

function openStudySubject(subjectId){
  const subj = PREU_DATA.subjects.find(s => s.id === subjectId);
  $("#studyTitle").textContent = subj ? subj.name : "Materia";
  $("#studySubtitle").textContent = "Temas, videos curados, rutas y práctica (sin PDFs).";

  const panel = $("#studyPanel");
  panel.classList.remove("empty-state");
  panel.innerHTML = "";

  const topics = PREU_DATA.topics.filter(t => t.subject === subjectId);

  if(topics.length === 0){
    panel.classList.add("empty-state");
    panel.innerHTML = `<div class="empty-emoji">🧩</div><div class="empty-title">Aún no hay temas aquí</div><div class="muted">Agrega temas en data.js</div>`;
    return;
  }

  topics.forEach(t => panel.appendChild(topicCard(t)));
}

function openStudyTopic(subjectId, topicId){
  // Abre materia y resalta un tema (simple)
  openStudySubject(subjectId);
  const t = PREU_DATA.topics.find(x => x.id === topicId);
  if(!t) return;
  // scroll a tema (aprox)
  setTimeout(() => {
    const node = document.querySelector(`[data-topic="${topicId}"]`);
    if(node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

function topicCard(t){
  const mastery = Math.round(state.mastery[t.id] ?? 0);
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.topic = t.id;
  el.innerHTML = `
    <div class="card-header">
      <div>
        <h2>${t.title}</h2>
        <div class="muted small">${t.axis} • Nivel: ${t.level} • Dominio: ${mastery}%</div>
      </div>
      <span class="pill">${subjectName(t.subject)}</span>
    </div>

    <div class="stack">
      <div class="mini-card">
        <div class="mini-title">Miniclases (5–15 min)</div>
        ${t.learn.miniClasses.map(v => linkRow(v.title, `${v.minutes} min`, v.url)).join("")}
      </div>

      <div class="mini-card">
        <div class="mini-title">Profundización</div>
        ${t.learn.deepClasses.map(v => linkRow(v.title, `${v.minutes} min`, v.url)).join("")}
      </div>

      <div class="mini-card">
        <div class="mini-title">Si esto no te funcionó, prueba esto</div>
        ${t.learn.altStyles.map(v => linkRow(v.title, "otro estilo", v.url)).join("")}
      </div>

      <div class="mini-card">
        <div class="mini-title">Practicar (PAES/IB)</div>
        <div class="mini-text">Ejercicios explicados paso a paso + errores comunes.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
          <button class="btn primary" data-action="practice">Practicar este tema</button>
          <button class="btn ghost" data-action="recall">Active Recall (preguntas rápidas)</button>
          <button class="btn ghost" data-action="schedule">Agendar repaso</button>
        </div>
      </div>
    </div>
  `;

  el.querySelector(`[data-action="practice"]`).onclick = () => {
    openPage("practice");
    $("#practiceSubject").value = t.subject;
    startPractice("drill", t.subject, t.practice.questionIds);
    state.lastRoute = { page: "practice", subjectId: t.subject, topicId: t.id };
    saveState();
  };

  el.querySelector(`[data-action="recall"]`).onclick = () => openRecallModal(t);

  el.querySelector(`[data-action="schedule"]`).onclick = () => {
    scheduleReview(t.id, 1); // 1 día
    toast(`Repaso agendado: ${t.title} (mañana).`);
    renderHome();
    renderProgress();
  };

  return el;
}

function linkRow(title, meta, url){
  return `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:8px;">
      <a class="link" href="${url}" target="_blank" rel="noreferrer">${title}</a>
      <span class="muted small">${meta}</span>
    </div>
  `;
}

function subjectName(id){
  return PREU_DATA.subjects.find(s => s.id === id)?.name ?? id;
}

/* PRACTICE */
let practiceMode = "drill";
let timer = null;
let endAt = null;

function renderPractice(){
  const sel = $("#practiceSubject");
  sel.innerHTML = PREU_DATA.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

  $$(".segmented .seg").forEach(b => {
    b.onclick = () => {
      $$(".segmented .seg").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      practiceMode = b.dataset.mode;
    };
  });

  $("#startPracticeBtn").onclick = () => {
    const subjectId = $("#practiceSubject").value;
    const time = Number($("#practiceTime").value);

    const qIds = PREU_DATA.questions
      .filter(q => q.subject === subjectId)
      .slice(0, practiceMode === "exam" ? 3 : 1)
      .map(q => q.id);

    startPractice(practiceMode, subjectId, qIds, time);
    state.lastRoute = { page: "practice", subjectId };
    saveState();
  };
}

function startPractice(mode, subjectId, questionIds, timeLimitMin = 0){
  const panel = $("#practicePanel");
  panel.classList.remove("empty-state");
  panel.innerHTML = "";

  const questions = questionIds.map(id => PREU_DATA.questions.find(q => q.id === id)).filter(Boolean);
  const sessionId = crypto.randomUUID();

  let current = 0;
  let answers = new Array(questions.length).fill(null);

  if(timeLimitMin > 0){
    startTimer(timeLimitMin);
  }else{
    stopTimer();
    $("#timerLabel").textContent = "Sin tiempo";
  }

  renderQuestion();

  function renderQuestion(){
    const q = questions[current];
    panel.innerHTML = `
      <div class="pill-row" style="justify-content:flex-start;margin-bottom:8px;">
        <span class="pill">${mode === "exam" ? "Ensayo" : "Ejercicios"}</span>
        <span class="pill">${subjectName(subjectId)}</span>
        <span class="pill">Pregunta ${current+1}/${questions.length}</span>
      </div>

      <div class="card">
        <div style="font-weight:800; font-size:16px; margin-bottom:10px;">${q.stem}</div>
        <div class="stack">
          ${q.options.map((opt, i) => `
            <label class="list-item" style="display:flex;gap:10px;align-items:flex-start;">
              <input type="radio" name="opt" ${answers[current]===i ? "checked":""} />
              <div>
                <div style="font-weight:650;">${String.fromCharCode(65+i)}.</div>
                <div class="muted">${opt}</div>
              </div>
            </label>
          `).join("")}
        </div>

        <div class="card-actions">
          <button class="btn ghost" id="prevBtn" ${current===0?"disabled":""}>← Anterior</button>
          <button class="btn ghost" id="hintBtn">Ver pista (sin spoiler)</button>
          <button class="btn primary" id="nextBtn">${current===questions.length-1?"Finalizar":"Siguiente →"}</button>
        </div>

        <div id="hintBox" class="mini-card hidden" style="margin-top:10px;">
          <div class="mini-title">Pista</div>
          <div class="mini-text">Piensa en: <b>${q.commonMistakes?.[0] ? "error común a evitar" : "pasos ordenados"}</b>. No te apures.</div>
        </div>
      </div>
    `;

    // capture answer
    panel.querySelectorAll(`input[type="radio"]`).forEach((r,i) => {
      r.addEventListener("change", () => answers[current] = i);
    });

    $("#prevBtn").onclick = () => { current--; renderQuestion(); };
    $("#hintBtn").onclick = () => $("#hintBox").classList.toggle("hidden");

    $("#nextBtn").onclick = () => {
      if(current < questions.length-1){
        current++;
        renderQuestion();
      }else{
        finish();
      }
    };
  }

  function finish(){
    const timeUsedMin = endAt ? Math.max(0, Math.round((timeLimitMin*60 - (endAt - Date.now())/1000)/60)) : 0;

    const correct = answers.reduce((acc, ans, i) => acc + (ans === questions[i].answerIndex ? 1 : 0), 0);
    const scorePct = Math.round((correct / questions.length) * 100);

    // Actualiza mastery y agenda repaso según resultado (spaced repetition básico)
    questions.forEach((q, i) => {
      const ok = answers[i] === q.answerIndex;
      bumpMasteryByQuestion(q, ok);
      scheduleReviewFromResult(findTopicForQuestion(q.id), ok);
    });

    // Motivación + racha + nivel
    updateStreakAndLevel(scorePct);

    state.attempts.push({
      id: sessionId,
      date: new Date().toISOString(),
      mode,
      subjectId,
      scorePct,
      timeUsedMin
    });
    saveState();

    stopTimer();
    renderResults();

    renderHome();
    renderProgress();
  }

  function renderResults(){
    const last = state.attempts[state.attempts.length - 1];
    const avg = averageScore();
    const msg = scoreMessage(last.scorePct, avg);

    panel.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-weight:900;font-size:18px;">Resultado: ${last.scorePct}%</div>
            <div class="muted">Promedio personal: ${avg}% • ${msg}</div>
          </div>
          <span class="pill">✅ Corrección automática</span>
        </div>

        <div class="divider"></div>

        <div class="stack">
          ${questions.map((q, i) => {
            const ok = answers[i] === q.answerIndex;
            return `
              <div class="mini-card" style="border-color:${ok ? "rgba(43,213,118,0.35)" : "rgba(255,92,122,0.35)"};">
                <div class="mini-title">${ok ? "Correcta" : "Incorrecta"} • Pregunta ${i+1}</div>
                <div class="mini-text"><b>${q.stem}</b></div>
                <div class="mini-text" style="margin-top:8px;">
                  Tu respuesta: ${answers[i] == null ? "—" : String.fromCharCode(65+answers[i])}
                  • Correcta: ${String.fromCharCode(65+q.answerIndex)}
                </div>
                <div class="mini-text" style="margin-top:8px;">
                  <b>Explicación paso a paso:</b>
                  <ol style="margin:8px 0 0 18px;">
                    ${q.explanation.map(line => `<li>${line}</li>`).join("")}
                  </ol>
                </div>
                ${q.commonMistakes?.length ? `
                  <div class="mini-text" style="margin-top:8px;">
                    <b>Errores comunes:</b> ${q.commonMistakes.join(" • ")}
                  </div>
                ` : ""}
              </div>
            `;
          }).join("")}
        </div>

        <div class="card-actions">
          <button class="btn primary" id="practiceAgainBtn">Practicar otra vez</button>
          <button class="btn ghost" id="goProgressBtn">Ver progreso</button>
        </div>
      </div>
    `;

    $("#practiceAgainBtn").onclick = () => startPractice(mode, subjectId, questionIds, timeLimitMin);
    $("#goProgressBtn").onclick = () => openPage("progress");
  }
}

function startTimer(minutes){
  stopTimer();
  endAt = Date.now() + minutes * 60 * 1000;
  timer = setInterval(() => {
    const s = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    const mm = String(Math.floor(s/60)).padStart(2,"0");
    const ss = String(s%60).padStart(2,"0");
    $("#timerLabel").textContent = `⏲ ${mm}:${ss}`;
    if(s <= 0){
      stopTimer();
      toast("Tiempo terminado. Finaliza y revisa tus respuestas.");
    }
  }, 250);
}
function stopTimer(){
  if(timer) clearInterval(timer);
  timer = null;
  endAt = null;
}

/* PROGRESS */
function renderProgress(){
  renderProgressChart();
  renderRecommendations();
  renderAttemptsTable();
}

function renderProgressChart(){
  const el = $("#progressChart");
  el.innerHTML = "";
  const last = state.attempts.slice(-10);
  const values = last.length ? last.map(a => a.scorePct) : [35, 40, 42, 45, 50];

  const max = Math.max(...values, 1);
  values.forEach((v, i) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${Math.max(10, Math.round((v / max) * 130))}px`;
    el.appendChild(bar);
  });
}

function renderRecommendations(){
  const el = $("#recommendations");
  el.innerHTML = "";

  const due = dueReviews();
  const weak = weakestTopics();

  const items = [
    due[0] ? `Hoy toca repasar: <b>${topicName(due[0].topicId)}</b>.` : "No tienes repasos vencidos. Vas bien.",
    weak[0] ? `Refuerza: <b>${weak[0].title}</b> (te está costando).` : "No hay debilidades claras. Mantén la constancia.",
    `Siguiente paso recomendado: <b>${nextStepText()}</b>.`
  ];

  items.forEach(t => {
    const box = document.createElement("div");
    box.className = "mini-card";
    box.innerHTML = `<div class="mini-title">Recomendación</div><div class="mini-text">${t}</div>`;
    el.appendChild(box);
  });

  $("#scheduleReviewsBtn").onclick = () => {
    // Programa repasos de las 2 peores debilidades
    weak.slice(0,2).forEach(t => scheduleReview(t.id, 1));
    toast("Repasos programados (mañana) para tus debilidades principales.");
    saveState();
    renderHome();
    renderProgress();
  };

  $("#resetDataBtn").onclick = () => {
    openConfirmModal(
      "Reset local",
      "Esto borra tu progreso SOLO en este dispositivo (localStorage).",
      "Borrar",
      () => {
        localStorage.removeItem(LS_KEY);
        location.reload();
      }
    );
  };
}

function renderAttemptsTable(){
  const el = $("#attemptsTable");
  const rows = state.attempts.slice().reverse();

  el.innerHTML = `
    <div class="row header">
      <div>Fecha</div><div>Modo</div><div>Materia</div><div>Puntaje</div>
    </div>
    ${rows.length ? rows.map(a => `
      <div class="row">
        <div>${new Date(a.date).toLocaleString()}</div>
        <div>${a.mode === "exam" ? "Ensayo" : "Ejercicios"}</div>
        <div>${subjectName(a.subjectId)}</div>
        <div><b>${a.scorePct}%</b></div>
      </div>
    `).join("") : `
      <div class="row"><div class="muted">Aún no hay ensayos. Haz uno para ver tu evolución.</div><div></div><div></div><div></div></div>
    `}
  `;
}

/* TUTOR (mock) */
function renderTutor(){
  $("#sendChatBtn").onclick = () => sendChat();
  $("#chatInput").addEventListener("keydown", (e) => {
    if(e.key === "Enter") sendChat();
  });

  $$("[data-quick]").forEach(btn => {
    btn.onclick = () => quickTutor(btn.dataset.quick);
  });

  $("#openVocationalBtn2").onclick = () => openVocationalModal();
}

function sendChat(){
  const input = $("#chatInput");
  const text = input.value.trim();
  if(!text) return;
  const mode = $("#tutorMode").value;

  appendChat("user", `(${mode}) ${text}`);
  input.value = "";

  // Respuesta demo. Reemplaza por llamada real a tu backend/API.
  const reply = mockTutorReply(mode, text);
  setTimeout(() => appendChat("assistant", reply), 240);
}

function appendChat(role, text){
  const log = $("#chatLog");
  const msg = document.createElement("div");
  msg.className = `chat-msg ${role === "user" ? "user" : ""}`;
  msg.innerHTML = `<div class="role">${role === "user" ? "Tú" : "Tutor IA"}</div><div>${escapeHtml(text)}</div>`;
  log.appendChild(msg);
  log.scrollTop = log.scrollHeight;
}

function mockTutorReply(mode, text){
  const calm = "Vas bien. Esto es normal. Si te equivocas, aprendemos. 🙌";
  if(mode === "como12"){
    return `${calm}<br><br>Te lo explico fácil: imagina que el concepto es una receta. Primero entiendes qué ingredientes tienes (datos), luego eliges la fórmula correcta, y recién ahí calculas paso a paso. ¿Qué tema es: M1/M2, Lenguaje, Ciencias, Historia o IB?`;
  }
  if(mode === "plan"){
    return `${calm}<br><br>Plan rápido para hoy (60–90 min):<br>1) 10 min repaso (spaced repetition).<br>2) 25 min aprender un tema (miniclase).<br>3) 25 min práctica con 3 preguntas.<br>4) 10 min corregir y anotar errores comunes.<br><br>Dime tu materia + cuánto tiempo tienes.`;
  }
  if(mode === "simulacion"){
    return `${calm}<br><br>Simulación: te haré 3 preguntas tipo PAES/IB y te explicaré cada una. Dime materia y nivel (básico/medio/alto).`;
  }
  if(mode === "errores"){
    return `${calm}<br><br>Vamos a detectar errores típicos: 1) fórmula incorrecta, 2) reemplazo de datos, 3) signo/unidades, 4) interpretación de enunciado.<br>Envíame tu ejercicio o describe tu procedimiento y lo reviso.`;
  }
  // pasoapaso default
  return `${calm}<br><br>Paso a paso: 1) ¿Qué te piden? 2) ¿Qué datos hay? 3) ¿Qué concepto aplica? 4) Resuelvo con orden y reviso.<br>Envíame el enunciado completo o una foto del ejercicio.`;
}

function quickTutor(kind){
  openPage("tutor");
  const map = {
    diagnostico: "Quiero hacer un diagnóstico inicial de 5 minutos.",
    ruta: "Genera una ruta personalizada según mi nivel.",
    repaso: "¿Qué debería repasar hoy según spaced repetition?",
    ansiedad: "Me siento ansiosa/o estudiando. Necesito que me ordenes el plan y me calmes."
  };
  $("#chatInput").value = map[kind] || "";
  sendChat();
}

/* SEARCH */
function wireGlobalSearch(){
  const input = $("#globalSearch");
  const box = $("#searchResults");

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if(!q){ box.classList.add("hidden"); box.innerHTML = ""; return; }

    const hits = [];

    PREU_DATA.subjects.forEach(s => {
      if(s.name.toLowerCase().includes(q)) hits.push({ type:"subject", title:s.name, meta:s.track, subjectId:s.id });
    });

    PREU_DATA.topics.forEach(t => {
      const hay = `${t.title} ${t.axis} ${subjectName(t.subject)} ${t.level}`.toLowerCase();
      if(hay.includes(q)) hits.push({ type:"topic", title:t.title, meta:`${subjectName(t.subject)} • ${t.axis} • ${t.level}`, subjectId:t.subject, topicId:t.id });
    });

    PREU_DATA.questions.forEach(qq => {
      if(qq.stem.toLowerCase().includes(q)) hits.push({ type:"question", title:qq.stem.slice(0,60)+"…", meta:subjectName(qq.subject), subjectId:qq.subject, questionId:qq.id });
    });

    const top = hits.slice(0, 8);
    box.innerHTML = top.map(h => `
      <div class="search-item" data-type="${h.type}" data-subject="${h.subjectId || ""}" data-topic="${h.topicId || ""}" data-q="${h.questionId || ""}">
        <div><b>${escapeHtml(h.title)}</b></div>
        <span class="small">${escapeHtml(h.meta)}</span>
      </div>
    `).join("");

    box.classList.remove("hidden");

    box.querySelectorAll(".search-item").forEach(item => {
      item.onclick = () => {
        const type = item.dataset.type;
        const subjectId = item.dataset.subject;
        const topicId = item.dataset.topic;
        const qid = item.dataset.q;

        box.classList.add("hidden");
        input.value = "";

        if(type === "subject"){
          openPage("study");
          openStudySubject(subjectId);
        }else if(type === "topic"){
          openPage("study");
          openStudyTopic(subjectId, topicId);
        }else if(type === "question"){
          openPage("practice");
          $("#practiceSubject").value = subjectId;
          startPractice("drill", subjectId, [qid]);
        }
      };
    });
  });

  document.addEventListener("click", (e) => {
    if(!e.target.closest(".search-wrap")) box.classList.add("hidden");
  });
}

/* DIAGNOSTIC + WEEKLY GOALS + VOCATIONAL (MODALS) */
function wireModals(){
  $("#closeModalBtn").onclick = closeModal;
  $("#modalBackdrop").onclick = closeModal;
}

function openModal(title, bodyHtml, actions = []){
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;

  const act = $("#modalActions");
  act.innerHTML = "";
  actions.forEach(a => {
    const b = document.createElement("button");
    b.className = `btn ${a.kind || "ghost"}`;
    b.textContent = a.label;
    b.onclick = () => a.onClick?.();
    act.appendChild(b);
  });

  $("#modalBackdrop").classList.remove("hidden");
  $("#modal").classList.remove("hidden");
}
function closeModal(){
  $("#modalBackdrop").classList.add("hidden");
  $("#modal").classList.add("hidden");
}

function openConfirmModal(title, body, confirmText, onConfirm){
  openModal(title, `<div class="muted">${body}</div>`, [
    { label: "Cancelar", kind: "ghost", onClick: closeModal },
    { label: confirmText, kind: "danger", onClick: () => { closeModal(); onConfirm(); } }
  ]);
}

function openDiagnosticModal(){
  openModal("Diagnóstico inicial (5 min)", `
    <div class="stack">
      <div class="mini-card">
        <div class="mini-title">¿Cómo funciona?</div>
        <div class="mini-text">
          Respondes 3 preguntas rápidas (demo). Con eso generamos una ruta inicial y detectamos debilidades.
          <br><br><b>Importante:</b> Esto no te juzga. Solo te orienta.
        </div>
      </div>

      <div class="mini-card">
        <div class="mini-title">Tu foco principal</div>
        <select id="diagTrack" class="select">
          <option value="PAES">PAES (Lenguaje/M1/M2/Ciencias/Historia)</option>
          <option value="IB">IB (SL/HL)</option>
          <option value="MIX">PAES + IB</option>
        </select>

        <div style="margin-top:10px;">
          <div class="mini-title">Nivel percibido</div>
          <select id="diagLevel" class="select">
            <option value="basico">Básico (me cuesta)</option>
            <option value="medio">Medio (voy bien pero me trabo)</option>
            <option value="alto">Alto (quiero subir puntaje)</option>
          </select>
        </div>
      </div>
    </div>
  `, [
    { label: "Cancelar", kind:"ghost", onClick: closeModal },
    { label: "Generar ruta", kind:"primary", onClick: () => {
      const track = $("#diagTrack").value;
      const lvl = $("#diagLevel").value;
      applyDiagnostic(track, lvl);
      closeModal();
      toast("Ruta inicial creada. Vas bien.");
      renderHome(); renderProgress();
    }}
  ]);
}

function applyDiagnostic(track, lvl){
  // Demo: seteamos mastery inicial bajo/medio/alto en temas existentes
  PREU_DATA.topics.forEach(t => {
    const isPAES = PREU_DATA.subjects.find(s => s.id === t.subject)?.track === "PAES";
    const isIB = PREU_DATA.subjects.find(s => s.id === t.subject)?.track === "IB";
    if(track === "PAES" && !isPAES) return;
    if(track === "IB" && !isIB) return;

    const base = lvl === "basico" ? 20 : (lvl === "medio" ? 45 : 70);
    state.mastery[t.id] = Math.max(0, Math.min(100, base + Math.round(Math.random()*10 - 5)));
  });

  // Agendamos 1 repaso suave para mañana
  const first = PREU_DATA.topics[0];
  if(first) scheduleReview(first.id, 1);

  state.lastRoute = { page:"home" };
  saveState();
}

function openWeeklyGoalsModal(){
  openModal("Metas semanales", `
    <div class="stack">
      <div class="mini-card">
        <div class="mini-title">Metas realistas (cero humo)</div>
        <div class="mini-text">Define cuántas sesiones harás esta semana (miniclase + práctica).</div>
      </div>
      <div class="mini-card">
        <div class="mini-title">Cantidad</div>
        <input id="goalsTotal" class="input" type="number" min="0" max="40" value="${state.weeklyGoals.total}" />
      </div>
    </div>
  `, [
    { label:"Cancelar", kind:"ghost", onClick: closeModal },
    { label:"Guardar", kind:"primary", onClick: () => {
      const total = Math.max(0, Math.min(40, Number($("#goalsTotal").value || 0)));
      state.weeklyGoals.total = total;
      state.weeklyGoals.done = Math.min(state.weeklyGoals.done, total);
      saveState();
      closeModal();
      renderHome(); renderProgress();
      toast("Metas guardadas. Vas bien.");
    }}
  ]);
}

function openVocationalModal(){
  openModal("Orientación vocacional (base)", `
    <div class="stack">
      <div class="mini-card">
        <div class="mini-title">Simulador de puntaje ponderado</div>
        <div class="mini-text">Ingresa puntajes estimados (0–1000). Te mostramos carreras demo y su ponderación.</div>
      </div>

      <div class="grid" style="grid-template-columns:repeat(2,1fr); gap:10px;">
        ${inputScore("leng","Lenguaje")}
        ${inputScore("m1","M1")}
        ${inputScore("m2","M2")}
        ${inputScore("ciencias","Ciencias")}
        ${inputScore("historia","Historia")}
      </div>

      <div class="mini-card">
        <div class="mini-title">Resultados</div>
        <div id="vocResults" class="mini-text muted">Completa valores y presiona “Calcular”.</div>
      </div>
    </div>
  `, [
    { label:"Cerrar", kind:"ghost", onClick: closeModal },
    { label:"Calcular", kind:"primary", onClick: () => {
      const scores = {
        leng: numVal("score_leng"),
        m1: numVal("score_m1"),
        m2: numVal("score_m2"),
        ciencias: numVal("score_ciencias"),
        historia: numVal("score_historia")
      };
      $("#vocResults").innerHTML = vocationalCalc(scores);
    }}
  ]);
}

function inputScore(id, label){
  return `
    <div class="mini-card">
      <div class="mini-title">${label}</div>
      <input id="score_${id}" class="input" type="number" min="0" max="1000" value="0"/>
    </div>
  `;
}
function numVal(id){ return Math.max(0, Math.min(1000, Number(document.getElementById(id).value || 0))); }

function vocationalCalc(scores){
  const rows = PREU_DATA.vocational.careers.map(c => {
    const w = c.weight;
    let total = 0;
    Object.entries(w).forEach(([k, wk]) => {
      const val = scores[k] ?? 0;
      total += val * wk;
    });
    total = Math.round(total);
    return { name: c.name, total, w };
  }).sort((a,b) => b.total - a.total);

  return rows.map(r => `
    <div style="margin-bottom:10px;">
      <b>${r.name}</b>: ${r.total} pts (aprox.)
      <div class="muted small">Pondera: ${Object.entries(r.w).map(([k,w]) => `${k.toUpperCase()} ${Math.round(w*100)}%`).join(" • ")}</div>
    </div>
  `).join("");
}

/* Active Recall */
function openRecallModal(topic){
  const qIds = topic.practice.questionIds || [];
  const qs = qIds.map(id => PREU_DATA.questions.find(q => q.id === id)).filter(Boolean);

  if(!qs.length){
    toast("Este tema aún no tiene preguntas de recall.");
    return;
  }

  const q = qs[0];
  openModal("Active Recall (pregunta rápida)", `
    <div class="stack">
      <div class="mini-card">
        <div class="mini-title">${topic.title}</div>
        <div class="mini-text"><b>${q.stem}</b></div>
      </div>

      <div class="mini-card">
        <div class="mini-title">Tu respuesta (elige)</div>
        ${q.options.map((opt,i)=>`
          <label class="list-item" style="display:flex;gap:10px;align-items:flex-start;">
            <input type="radio" name="recall" value="${i}" />
            <div><b>${String.fromCharCode(65+i)}.</b> <span class="muted">${opt}</span></div>
          </label>
        `).join("")}
      </div>

      <div id="recallFeedback" class="mini-card hidden"></div>
    </div>
  `, [
    { label:"Cerrar", kind:"ghost", onClick: closeModal },
    { label:"Revisar", kind:"primary", onClick: () => {
      const sel = document.querySelector('input[name="recall"]:checked');
      const fb = $("#recallFeedback");
      if(!sel){
        fb.classList.remove("hidden");
        fb.innerHTML = `<div class="mini-title">Falta respuesta</div><div class="mini-text">Tranquila/o: elige una opción y revisamos.</div>`;
        return;
      }
      const ans = Number(sel.value);
      const ok = ans === q.answerIndex;

      bumpMasteryByQuestion(q, ok);
      scheduleReviewFromResult(topic.id, ok);
      updateStreakAndLevel(ok ? 100 : 40);

      fb.classList.remove("hidden");
      fb.style.borderColor = ok ? "rgba(43,213,118,0.35)" : "rgba(255,92,122,0.35)";
      fb.innerHTML = `
        <div class="mini-title">${ok ? "Correcto ✅" : "No pasa nada ❗"}</div>
        <div class="mini-text">${ok ? "Vas bien. Estás mejorando." : "Un error = aprendizaje. Mira la explicación:"}</div>
        <div class="mini-text" style="margin-top:8px;">
          Correcta: <b>${String.fromCharCode(65+q.answerIndex)}</b>
          <ol style="margin:8px 0 0 18px;">
            ${q.explanation.map(x=>`<li>${x}</li>`).join("")}
          </ol>
        </div>
      `;
      saveState();
      renderHome(); renderProgress();
    }}
  ]);
}

/* Spaced Repetition */
function scheduleReview(topicId, days){
  const due = new Date(Date.now() + days*24*60*60*1000).toISOString();
  // evita duplicados: si ya existe, actualiza al más cercano
  const ex = state.reviews.find(r => r.topicId === topicId);
  if(ex){
    ex.dueISO = due;
    ex.intervalDays = days;
  }else{
    state.reviews.push({ topicId, dueISO: due, intervalDays: days });
  }
  saveState();
}

function scheduleReviewFromResult(topicId, ok){
  if(!topicId) return;
  // Si correcto: expandimos intervalo. Si incorrecto: repaso pronto.
  const ex = state.reviews.find(r => r.topicId === topicId);
  const prev = ex?.intervalDays ?? 1;
  const next = ok ? Math.min(14, Math.max(2, prev * 2)) : 1;
  scheduleReview(topicId, next);
}

function dueReviews(){
  const now = Date.now();
  return state.reviews
    .filter(r => new Date(r.dueISO).getTime() <= now)
    .sort((a,b) => new Date(a.dueISO) - new Date(b.dueISO));
}
function nextReviewDue(){
  return state.reviews
    .slice()
    .sort((a,b)=> new Date(a.dueISO) - new Date(b.dueISO))[0] || null;
}

/* Mastery & scoring */
function bumpMasteryByQuestion(question, ok){
  const topicId = findTopicForQuestion(question.id);
  if(!topicId) return;

  const cur = state.mastery[topicId] ?? 0;
  const delta = ok ? 8 : -4;
  state.mastery[topicId] = clamp(cur + delta, 0, 100);
  saveState();
}

function findTopicForQuestion(qid){
  const t = PREU_DATA.topics.find(tp => (tp.practice.questionIds || []).includes(qid));
  return t?.id || null;
}

function weakestTopics(){
  const topics = PREU_DATA.topics.slice();
  const scored = topics.map(t => ({
    ...t,
    score: state.mastery[t.id] ?? 0
  }));
  return scored.sort((a,b) => a.score - b.score);
}

function estimateScore(){
  // Demo: traduce mastery promedio a “puntaje estimado” (no real)
  const vals = Object.values(state.mastery);
  if(!vals.length) return "—";
  const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
  const est = Math.round(350 + (avg/100)*350); // 350–700 demo
  return `${est}`;
}
function averageScore(){
  if(!state.attempts.length) return 0;
  const avg = state.attempts.reduce((a,b)=>a+b.scorePct,0)/state.attempts.length;
  return Math.round(avg);
}

function scoreMessage(scorePct, avg){
  if(scorePct >= avg) return "Vas bien. Se nota avance.";
  if(scorePct >= avg - 10) return "Normal. La consistencia te sube.";
  return "Tranquila/o: esto es parte del proceso.";
}

function updateStreakAndLevel(scorePct){
  // Demo: si haces práctica, sube racha (sin calendario real).
  state.streak = Math.min(99, state.streak + 1);
  if(scorePct >= 70) state.level = Math.min(50, state.level + 1);
  // metas semanales
  if(state.weeklyGoals.total > 0){
    state.weeklyGoals.done = Math.min(state.weeklyGoals.total, state.weeklyGoals.done + 1);
  }
  saveState();
}

function nextStepText(){
  const due = dueReviews();
  if(due[0]) return `repasar "${topicName(due[0].topicId)}"`;
  const weak = weakestTopics()[0];
  if(weak) return `reforzar "${weak.title}" con miniclase + práctica`;
  return "hacer un ensayo corto para medir avance";
}

function topicName(topicId){
  return PREU_DATA.topics.find(t => t.id === topicId)?.title ?? "Tema";
}

/* Motivación */
function wireMotivation(){
  $("#motivationBtn").onclick = () => rotateMotivation();
  rotateMotivation();
}
function rotateMotivation(){
  const i = Math.floor(Math.random() * PREU_DATA.motivationalMessages.length);
  $("#calmMessage").textContent = PREU_DATA.motivationalMessages[i];
}

/* Utils */
function prettyDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
  }catch{
    return iso;
  }
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function toast(text){
  // Toast simple sin librerías
  const t = document.createElement("div");
  t.style.position = "fixed";
  t.style.left = "50%";
  t.style.bottom = "18px";
  t.style.transform = "translateX(-50%)";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "999px";
  t.style.border = "1px solid var(--border)";
  t.style.background = "rgba(0,0,0,0.35)";
  t.style.backdropFilter = "blur(10px)";
  t.style.boxShadow = "var(--shadow)";
  t.style.zIndex = "999";
  t.innerHTML = `<span style="color:var(--text)">${escapeHtml(text)}</span>`;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 1800);
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
