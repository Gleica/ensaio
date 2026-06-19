/* ============================================================
   app.js — estado, UI, setup, simulador, demo
   Depende de claude.js (carregado antes no HTML)
   ============================================================ */

const $ = id => document.getElementById(id);

let state = {
  who: "", rel: "", traits: [], goal: "", tone: "firme",
  mood: 50, history: [], demo: false, demoStep: 0
};

/* ---------- chips ---------- */
document.querySelectorAll("#traits .chip").forEach(c => {
  c.onclick = () => c.classList.toggle("on");
});
document.querySelectorAll("#tones .chip").forEach(c => {
  c.onclick = () => {
    document.querySelectorAll("#tones .chip").forEach(x => x.classList.remove("on"));
    c.classList.add("on");
  };
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
  state.tone   = (document.querySelector("#tones .chip.on") || { dataset: { v: "firme" } }).dataset.v;
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
  $("chat").innerHTML = "";
  $("coachBox").innerHTML = "";
  setMood(50);
}

$("startBtn").onclick = () => {
  readSetup();
  if(!getKey()){
    alert("Para o ensaio ao vivo você precisa conectar sua chave do Claude (botão ⚙︎ Chave no topo). Ou clique em \"Ver demonstração\" para experimentar sem chave.");
    $("gearBtn").click();
    return;
  }
  state.demo = false; state.history = [];
  openSim();
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
  addBubble(text, "me");
  $("input").value = "";

  if(state.demo){ return demoReply(); }

  state.history.push({ role: "user", content: text });
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
    if(typeof j.humor === "number") setMood(j.humor);
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

/* ---------- reset ---------- */
$("resetBtn").onclick = () => {
  state.history = []; state.demo = false; state.demoStep = 0;
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
            mood: DEMO.openMood, history: [], demo: true, demoStep: 0 };
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
    state.demoStep++;
    const next = DEMO.suggestions[state.demoStep];
    if(next) $("input").value = next;
  }, 700);
}

function demoCoach(){ renderCoach(DEMO.coach); }
