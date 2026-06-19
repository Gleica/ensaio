/* ============================================================
   app.js — estado, UI, setup, simulador, demo
   Depende de claude.js (carregado antes no HTML)
   ============================================================ */

const $ = id => document.getElementById(id);

const LIMITS = { msgsPerSession: 8, sessionsPerDay: 3 };

function isSharedMode(){ return !!SHARED_KEY; }

function getUsage(){
  const today = new Date().toISOString().slice(0, 10);
  try{
    const d = JSON.parse(localStorage.getItem("ensaio_usage") || "{}");
    return d.date === today ? d : { date: today, sessions: 0 };
  }catch(e){ return { date: new Date().toISOString().slice(0, 10), sessions: 0 }; }
}
function saveUsage(d){ localStorage.setItem("ensaio_usage", JSON.stringify(d)); }

function updateMsgCounter(){
  const el = $("msgCounter");
  if(!el) return;
  if(!isSharedMode() || state.demo){ el.classList.add("hide"); return; }
  const used = state.msgCount;
  const max = LIMITS.msgsPerSession;
  el.textContent = `💬 ${used}/${max}`;
  el.style.color = used >= max - 2 ? "var(--warn)" : "var(--muted)";
  el.classList.remove("hide");
  if(used >= max){
    $("input").disabled = true;
    $("sendBtn").disabled = true;
    el.style.color = "var(--bad)";
  }
}

let state = {
  who: "", rel: "", traits: [], goal: "", tone: "firme",
  mood: 50, history: [], moodHistory: [], msgCount: 0, difficulty: "normal", demo: false, demoStep: 0
};

/* ---------- chips ---------- */
document.querySelectorAll("#traits .chip").forEach(c => {
  c.onclick = () => c.classList.toggle("on");
});
["#tones", "#difficulties"].forEach(sel => {
  document.querySelectorAll(sel + " .chip").forEach(c => {
    c.onclick = () => {
      document.querySelectorAll(sel + " .chip").forEach(x => x.classList.remove("on"));
      c.classList.add("on");
    };
  });
});

/* ---------- chave / modal ---------- */
$("gearBtn").onclick = () => {
  $("apiKey").value = getKey();
  $("model").value = getModel();
  $("keyModal").classList.add("on");
};
$("keyClose").onclick = () => $("keyModal").classList.remove("on");
$("keySave").onclick = () => {
  sessionStorage.setItem("ensaio_key", $("apiKey").value.trim());
  sessionStorage.setItem("ensaio_model", $("model").value.trim() || "claude-sonnet-4-6");
  $("keyModal").classList.remove("on");
};

/* ---------- coleta do setup ---------- */
function readSetup(){
  state.who    = $("who").value.trim() || "a outra pessoa";
  state.rel    = $("rel").value;
  state.traits = [...document.querySelectorAll("#traits .chip.on")].map(c => c.dataset.v);
  state.goal   = $("goal").value.trim();
  state.tone       = (document.querySelector("#tones .chip.on")       || { dataset: { v: "firme"  } }).dataset.v;
  state.difficulty = (document.querySelector("#difficulties .chip.on") || { dataset: { v: "normal" } }).dataset.v;
}

/* ---------- render ---------- */
function addBubble(text, cls){
  const d = document.createElement("div");
  d.className = "msg " + cls;
  d.textContent = text;
  $("chat").appendChild(d);
  scrollChat();
  return d;
}

function addThought(text){
  const d = document.createElement("div");
  d.className = "think";
  d.innerHTML = "<b>💭 pensando:</b> ";
  d.appendChild(document.createTextNode(text));
  if(!$("thoughtToggle").checked) d.classList.add("hide");
  d.dataset.think = "1";
  $("chat").appendChild(d);
  scrollChat();
}

function scrollChat(){ const c = $("chat"); c.scrollTop = c.scrollHeight; }

function setMood(v){
  state.mood = Math.max(0, Math.min(100, v));
  $("meterFill").style.width = state.mood + "%";
  let e = "😐", l = "Neutro";
  if(state.mood < 20)     { e = "😡"; l = "Furiosa"; }
  else if(state.mood < 40){ e = "😒"; l = "Irritada"; }
  else if(state.mood < 60){ e = "😐"; l = "Neutra"; }
  else if(state.mood < 80){ e = "🙂"; l = "Abrindo"; }
  else                    { e = "😄"; l = "Convencida"; }
  $("moodEmoji").textContent = e;
  $("moodLabel").textContent = l;
}

$("thoughtToggle").onchange = () => {
  document.querySelectorAll(".think").forEach(t => {
    t.classList.toggle("hide", !$("thoughtToggle").checked);
  });
};

/* ---------- iniciar simulador ---------- */
function openSim(){
  $("setup").classList.add("hide");
  $("sim").classList.remove("hide");
  $("simWho").textContent = state.who;
  $("simRel").textContent = state.rel;
  $("demoTag").classList.toggle("hide", !state.demo);
  const diffLabels = { facil: "😌 Fácil", normal: "😐 Normal", pesadelo: "🔥 Pesadelo" };
  const diffColors = { facil: "var(--ok)", normal: "var(--muted)", pesadelo: "var(--bad)" };
  $("diffTag").textContent = diffLabels[state.difficulty] || "";
  $("diffTag").style.color = diffColors[state.difficulty] || "";
  $("diffTag").classList.toggle("hide", state.demo);
  $("chat").innerHTML = "";
  $("coachBox").innerHTML = "";
  $("moodChart").innerHTML = "";
  $("moodChart").classList.add("hide");
  state.moodHistory = [];
  setMood(50);
}

$("startBtn").onclick = () => {
  readSetup();
  if(!getKey()){
    alert("Para o ensaio ao vivo você precisa conectar sua chave do Claude (botão ⚙︎ Chave no topo). Ou clique em \"Ver demonstração\" para experimentar sem chave.");
    $("gearBtn").click();
    return;
  }
  if(isSharedMode()){
    const usage = getUsage();
    if(usage.sessions >= LIMITS.sessionsPerDay){
      alert(`Você já usou suas ${LIMITS.sessionsPerDay} sessões gratuitas de hoje. Volte amanhã ou conecte sua própria chave (⚙︎ Chave).`);
      return;
    }
    usage.sessions++;
    saveUsage(usage);
  }
  state.demo = false; state.history = []; state.msgCount = 0;
  openSim();
  updateMsgCounter();
  addBubble("Tudo pronto. Mande sua primeira fala para " + state.who + " — eu reajo como ela reagiria.", "them");
};

$("suggestBtn").onclick = async () => {
  readSetup();
  if(!getKey()){ alert("Conecte sua chave do Claude (⚙︎ Chave) para gerar sugestões."); $("gearBtn").click(); return; }
  $("suggestBtn").disabled = true; $("suggestBtn").textContent = "Gerando...";
  try{
    const sys = `Você ajuda alguém a abrir uma conversa difícil com ${state.who} (${state.rel}). Objetivo: ${state.goal}. Tom desejado: ${state.tone}. Escreva APENAS a primeira fala que a pessoa poderia dizer para começar bem — 1 a 3 frases, em português do Brasil, sem aspas, sem explicação.`;
    const out = await callClaude(sys, [{ role: "user", content: "Escreva a primeira fala." }], 250);
    if(!$("sim").classList.contains("hide")){ $("input").value = out.trim(); }
    else { alert("Sugestão de abertura:\n\n" + out.trim() + "\n\n(Clique em Começar o ensaio para usá-la.)"); }
  }catch(e){ alert("Erro ao gerar: " + e.message); }
  $("suggestBtn").disabled = false; $("suggestBtn").textContent = "💡 Sugerir minha 1ª fala";
};

/* ---------- enviar ---------- */
$("sendBtn").onclick = send;
$("input").addEventListener("keydown", e => {
  if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send(); }
});

async function send(){
  const text = $("input").value.trim();
  if(!text) return;
  if(!state.demo && isSharedMode() && state.msgCount >= LIMITS.msgsPerSession) return;
  addBubble(text, "me");
  $("input").value = "";

  if(state.demo){ return demoReply(); }

  state.history.push({ role: "user", content: text });
  state.msgCount++;
  updateMsgCounter();
  $("sendBtn").disabled = true;

  const bubble = document.createElement("div");
  bubble.className = "msg them streaming";
  $("chat").appendChild(bubble);
  scrollChat();

  try{
    const raw = await callClaudeStream(personaSystem(state), state.history, 600, (_delta, accumulated) => {
      const partial = extractPartialFala(accumulated);
      if(partial) bubble.textContent = partial;
      scrollChat();
    });
    bubble.classList.remove("streaming");
    const j = parseJSON(raw) || { fala: raw, humor: state.mood, pensamento: "" };
    bubble.textContent = j.fala || "...";
    if(j.pensamento) addThought(j.pensamento);
    if(typeof j.humor === "number"){
      setMood(j.humor);
      state.moodHistory.push(j.humor);
      renderMoodChart();
    }
    state.history.push({ role: "assistant", content: raw });
  }catch(e){
    bubble.classList.remove("streaming");
    if(e.message === "NO_KEY"){
      bubble.remove();
      alert("Conecte sua chave do Claude (⚙︎ Chave)."); $("gearBtn").click();
    } else {
      bubble.textContent = "[erro: " + e.message + "]";
    }
  }
  $("sendBtn").disabled = false;
}

/* ---------- coach ---------- */
$("coachBtn").onclick = async () => {
  if(state.demo){ return demoCoach(); }
  if(!state.history.length){ alert("Mande pelo menos uma fala antes de pedir feedback."); return; }
  $("coachBtn").disabled = true; $("coachBtn").textContent = "Analisando...";
  const transcript = state.history
    .map(m => (m.role === "user" ? "VOCÊ: " : "OUTRO: ") + (typeof m.content === "string" ? m.content : ""))
    .join("\n");
  try{
    const raw = await callClaude(coachSystem(state), [{ role: "user", content: "Conversa até agora:\n" + transcript }], 500);
    const j = parseJSON(raw) || { analise: raw, sugestao: "" };
    renderCoach(j);
  }catch(e){ alert("Erro: " + e.message); }
  $("coachBtn").disabled = false; $("coachBtn").textContent = "🎯 Como fui?";
};

function renderCoach(j){
  const box = $("coachBox");
  box.innerHTML = `<div class="coach">
    <h3>🎯 Feedback do coach</h3>
    <p>${escapeHtml(j.analise || "")}</p>
    ${j.sugestao ? `<div class="sug"><b>Tente assim:</b> "${escapeHtml(j.sugestao)}" <button class="btn ghost" id="useSug" style="margin-left:8px;padding:6px 10px;font-size:12.5px">Usar</button></div>` : ""}
  </div>`;
  if(j.sugestao){ $("useSug").onclick = () => { $("input").value = j.sugestao; $("input").focus(); }; }
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function escapeHtml(s){
  return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---------- relatório final ---------- */
$("reportBtn").onclick = async () => {
  if(state.demo){ alert("O relatório está disponível apenas em ensaios ao vivo."); return; }
  const userTurns = state.history.filter(m => m.role === "user").length;
  if(userTurns < 2){ alert("Troque pelo menos 2 falas antes de gerar o relatório."); return; }
  $("reportContent").innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted)">⏳ Analisando sua conversa…</div>`;
  $("reportModal").classList.add("on");
  const transcript = state.history
    .map(m => (m.role === "user" ? "VOCÊ: " : "OUTRO: ") + (typeof m.content === "string" ? m.content : ""))
    .join("\n");
  try{
    const raw = await callClaude(reportSystem(state), [{ role: "user", content: "Transcrição:\n" + transcript }], 750);
    const j = parseJSON(raw);
    if(j) renderReport(j);
    else $("reportContent").innerHTML = `<p style="white-space:pre-wrap;font-size:14px">${escapeHtml(raw)}</p>`;
  }catch(e){
    $("reportContent").innerHTML = `<p style="color:var(--bad)">Erro ao gerar relatório: ${escapeHtml(e.message)}</p>`;
  }
};

$("reportClose").onclick = () => $("reportModal").classList.remove("on");

function renderReport(j){
  const nota = Math.max(0, Math.min(10, parseFloat(j.nota) || 0));
  const scoreColor = nota < 4 ? "var(--bad)" : nota < 7 ? "var(--warn)" : "var(--ok)";

  const fortes = (j.pontos_fortes || []).map(p =>
    `<div class="report-item"><span>✅</span>${escapeHtml(p)}</div>`
  ).join("");

  const erros = (j.erros_recorrentes || []).map(e =>
    `<div class="report-item"><span>⚠️</span>${escapeHtml(e)}</div>`
  ).join("");

  $("reportContent").innerHTML = `
    <h2 style="margin:0 0 18px;font-size:18px">📋 Relatório da sessão</h2>
    <div class="report-score">
      <div class="score-circle" style="color:${scoreColor};border-color:${scoreColor};background:${scoreColor}1a">
        ${nota.toFixed(1)}
      </div>
      <div class="score-title">${escapeHtml(j.titulo || "")}</div>
    </div>
    ${fortes ? `<div class="report-section"><h4>Pontos fortes</h4>${fortes}</div>` : ""}
    ${erros ? `<div class="report-section"><h4>O que melhorar</h4>${erros}</div>` : ""}
    ${j.melhor_fala ? `<div class="report-section"><h4>⭐ Sua melhor fala</h4><div class="report-best">"${escapeHtml(j.melhor_fala)}"</div></div>` : ""}
    ${j.proximo_passo ? `<div class="report-section"><h4>🎯 Próximo passo</h4><div class="report-next">${escapeHtml(j.proximo_passo)}</div></div>` : ""}
    ${j.arco ? `<div class="report-section"><h4>📈 Arco emocional</h4><p class="report-arc">${escapeHtml(j.arco)}</p></div>` : ""}
  `;
}

/* ---------- reset ---------- */
$("resetBtn").onclick = () => {
  state.history = []; state.demo = false; state.demoStep = 0; state.msgCount = 0;
  $("input").disabled = false;
  $("sendBtn").disabled = false;
  $("sim").classList.add("hide"); $("setup").classList.remove("hide");
};

/* ============================================================
   MODO DEMONSTRAÇÃO — roda sem chave de API.
   Cena: pedir aumento ao chefe (Ricardo), que é defensivo.
   ============================================================ */
const DEMO = {
  who: "Ricardo (seu gestor)", rel: "Gestor(a) / liderança",
  opening: "Oi! Pode falar. Mas já adianto que o orçamento desse trimestre tá bem apertado, viu?",
  openMood: 45, openThink: "Lá vem... espero que não seja pedido de aumento de novo.",
  suggestions: [
    "Ricardo, queria 15 minutos seu pra falar do meu crescimento aqui. Topa?",
    "Faz dois anos sem reajuste e eu assumi a coordenação de dois projetos. Acho justo revermos meu salário.",
    "Entendo o orçamento. Posso te trazer um resumo do impacto que gerei pra gente conversar com números na próxima semana?"
  ],
  turns: [
    { fala: "Crescimento? Você tá indo bem, mas todo mundo aqui tá puxando o carro. Não sei se é o momento.",
      humor: 38, pensamento: "Não quero perder essa pessoa, mas se eu abrir pra um, abro pra todos." },
    { fala: "Dois projetos é verdade... eu reconheço. Mas reajuste agora, com esse orçamento, é complicado de aprovar lá em cima.",
      humor: 55, pensamento: "Ela tem razão na real. O problema sou eu que vou ter que brigar com o financeiro." },
    { fala: "Sabe que assim fica difícil eu dizer não? Me manda esse resumo que eu levo pessoalmente pro diretor na quinta.",
      humor: 78, pensamento: "Gostei. Veio com dado, sem drama. Assim eu consigo defender lá em cima." }
  ],
  coach: {
    analise: "Você ancorou no valor que entrega (dois projetos, coordenação) em vez de pedir por tempo de casa — isso é forte. O risco era soar exigente; você equilibrou reconhecendo o orçamento dele.",
    sugestao: "Perfeito. Eu te mando o resumo até quarta com os números dos dois projetos. Obrigada por levar pessoalmente."
  }
};

$("demoBtn").onclick = () => {
  state = { who: DEMO.who, rel: DEMO.rel, traits: ["defensiva"], goal: "pedir um aumento para o gestor", tone: "firme",
            mood: DEMO.openMood, history: [], moodHistory: [], demo: true, demoStep: 0 };
  openSim();
  addBubble(DEMO.opening, "them");
  addThought(DEMO.openThink);
  setMood(DEMO.openMood);
  $("input").value = DEMO.suggestions[0];
  addBubble("👋 Modo demonstração: as respostas já estão roteirizadas. É só clicar em Enviar (a fala sugerida já está no campo) e ver o humor do Ricardo mudar.", "them");
};

function demoReply(){
  const t = DEMO.turns[state.demoStep];
  if(!t){
    addBubble("Fim da demonstração 🎬 Conecte sua chave (⚙︎) para ensaiar a SUA conversa de verdade.", "them");
    return;
  }
  const typing = document.createElement("div");
  typing.className = "typing"; typing.textContent = state.who + " está digitando…";
  $("chat").appendChild(typing); scrollChat();
  setTimeout(() => {
    typing.remove();
    addBubble(t.fala, "them");
    addThought(t.pensamento);
    setMood(t.humor);
    state.moodHistory.push(t.humor);
    renderMoodChart();
    state.demoStep++;
    const next = DEMO.suggestions[state.demoStep];
    if(next) $("input").value = next;
  }, 700);
}

function demoCoach(){ renderCoach(DEMO.coach); }

/* ---------- gráfico de humor ---------- */
function renderMoodChart(){
  const container = $("moodChart");
  if(!container) return;
  const h = state.moodHistory;
  if(h.length < 2){ container.classList.add("hide"); return; }
  container.classList.remove("hide");

  const W = 400, H = 90;
  const pad = { top: 14, right: 18, bottom: 20, left: 30 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const mapY = v => (pad.top + iH - (Math.max(0, Math.min(100, v)) / 100) * iH).toFixed(1);
  const mapX = i => (pad.left + (h.length < 2 ? iW / 2 : (i / (h.length - 1)) * iW)).toFixed(1);

  const last = h[h.length - 1];
  const col = last < 35 ? "var(--bad)" : last < 65 ? "var(--warn)" : "var(--ok)";

  const pts = h.map((v, i) => `${mapX(i)},${mapY(v)}`).join(" ");

  const n = h.length - 1;
  const baseline = (pad.top + iH).toFixed(1);
  const area = [
    `M ${mapX(0)},${mapY(h[0])}`,
    ...h.slice(1).map((v, i) => `L ${mapX(i + 1)},${mapY(v)}`),
    `L ${mapX(n)},${baseline} L ${mapX(0)},${baseline} Z`
  ].join(" ");

  const x0 = pad.left.toFixed(1), x1 = (pad.left + iW).toFixed(1);
  const grid = [
    `<line x1="${x0}" y1="${mapY(100)}" x2="${x1}" y2="${mapY(100)}" stroke="var(--line)" stroke-width="0.5"/>`,
    `<line x1="${x0}" y1="${mapY(50)}" x2="${x1}" y2="${mapY(50)}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="4,3"/>`,
    `<line x1="${x0}" y1="${baseline}" x2="${x1}" y2="${baseline}" stroke="var(--line)" stroke-width="0.5"/>`,
  ].join("");

  const yLabels = [[100,"😄"],[50,"😐"],[0,"😡"]].map(([v, em]) =>
    `<text x="${(pad.left - 5).toFixed(1)}" y="${parseFloat(mapY(v)) + 4}" text-anchor="end" font-size="11">${em}</text>`
  ).join("");

  const xLabels = h.map((_, i) =>
    `<text x="${mapX(i)}" y="${H - 3}" text-anchor="middle" fill="var(--muted)" font-size="9">${i + 1}</text>`
  ).join("");

  const dots = h.map((v, i) => {
    const c = v < 35 ? "var(--bad)" : v < 65 ? "var(--warn)" : "var(--ok)";
    const r = i === h.length - 1 ? 5 : 3.5;
    return `<circle cx="${mapX(i)}" cy="${mapY(v)}" r="${r}" fill="${c}" stroke="var(--card)" stroke-width="1.5"/>`;
  }).join("");

  container.innerHTML = `<p class="mood-chart-label">📈 Arco emocional da conversa</p>
<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${col}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  ${grid}${yLabels}${xLabels}
  <path d="${area}" fill="url(#cg)"/>
  <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${dots}
</svg>`;
}

/* ---------- biblioteca de cenas ---------- */
function loadScene(scene){
  $("who").value = scene.who;
  [...$("rel").options].forEach(o => { o.selected = o.text === scene.rel; });
  document.querySelectorAll("#traits .chip").forEach(c => {
    c.classList.toggle("on", scene.traits.includes(c.dataset.v));
  });
  $("goal").value = scene.goal;
  document.querySelectorAll("#tones .chip").forEach(c => {
    c.classList.toggle("on", c.dataset.v === scene.tone);
  });
  document.querySelectorAll(".scene-card").forEach(c => {
    c.classList.toggle("on", c.dataset.id === scene.id);
  });
  $("who").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderSceneGallery(){
  const gallery = $("scenesGallery");
  SCENES.forEach(s => {
    const card = document.createElement("div");
    card.className = "scene-card";
    card.dataset.id = s.id;
    card.innerHTML = `<div class="scene-emoji">${s.emoji}</div><div class="scene-title">${s.title}</div><div class="scene-sub">${s.subtitle}</div>`;
    card.onclick = () => loadScene(s);
    gallery.appendChild(card);
  });
}

renderSceneGallery();
