import { getKey, getModel, isSharedMode } from "../session.js";
import { MAX_TOKENS } from "../config.js";
import { callClaude, callClaudeStream } from "../api/anthropic.js";
import { personaSystem, suggestSystem, GUARDRAIL_REFUSAL_FALA } from "../prompts.js";
import { parseJSON, extractPartialFala } from "../lib/parse.js";
import { track } from "../lib/analytics.js";
import { resetSession } from "../state.js";
import { guardSessionStart, consumeSession } from "../rateLimit.js";
import { readSetup } from "../ui/setupForm.js";
import { showSim } from "../ui/screens.js";
import { addBubble, addThought, scrollChat } from "../ui/chat.js";
import { setMood } from "../ui/moodMeter.js";
import { renderMoodChart } from "../ui/moodChart.js";
import { updateMsgCounter } from "../ui/msgCounter.js";

const $ = id => document.getElementById(id);

// Infere pronome pelo artigo definido que precede o nome/descrição em PT-BR.
// "a Ana", "minha chefe" → "ela" | "o Pedro", "meu gestor", nome sem artigo → "ele"
function inferPronoun(who) {
  return /^(a |minha )/i.test(who.trim()) ? "ela" : "ele";
}

function trackSessionStart(state) {
  track("session_start", getKey() ? "byok" : "shared");
  track("scene_selected", state.sceneId || "custom");
  track("difficulty_selected", state.difficulty);
}

export async function startRehearsal(state) {
  readSetup(state);
  if (!getKey() && !isSharedMode()) {
    alert("Para o ensaio ao vivo você precisa conectar sua chave do Claude (botão ⚙︎ Chave no topo). Ou clique em \"Ver demonstração\" para experimentar sem chave.");
    $("gearBtn").click();
    return;
  }
  const guard = guardSessionStart();
  if (!guard.ok) { alert(guard.message); return; }
  if (guard.usage) consumeSession(guard.usage);

  trackSessionStart(state);
  resetSession(state);
  showSim(state);
  setMood(state, 50);
  updateMsgCounter(state);
  addBubble("Tudo pronto. Mande sua primeira fala para " + state.who + " — eu reajo como " + inferPronoun(state.who) + " reagiria.", "them");
}

export async function suggestOpening(state) {
  readSetup(state);
  if (!getKey() && !isSharedMode()) {
    alert("Conecte sua chave do Claude (⚙︎ Chave) para gerar sugestões.");
    $("gearBtn").click();
    return;
  }
  const guard = guardSessionStart();
  if (!guard.ok) { alert(guard.message); return; }
  if (guard.usage) consumeSession(guard.usage);

  trackSessionStart(state);
  resetSession(state);
  showSim(state);
  setMood(state, 50);
  updateMsgCounter(state);

  $("sendBtn").disabled = true;
  $("input").placeholder = "Gerando sua primeira fala…";
  try {
    const suggestion = await callClaude(
      getKey(), getModel(),
      suggestSystem(state),
      [{ role: "user", content: "Escreva a primeira fala." }],
      MAX_TOKENS.suggest
    );
    if (suggestion.includes(GUARDRAIL_REFUSAL_FALA)) track("guardrail_triggered");
    $("input").value = suggestion.trim();
    $("input").placeholder = "Escreva o que você diria...";
    addBubble("Sua primeira fala está pronta no campo abaixo. Edite se quiser e clique em Enviar para começar.", "them");
  } catch (e) {
    $("input").placeholder = "Escreva o que você diria...";
    alert("Erro ao gerar sugestão. Tente novamente.");
    console.error(e);
  }
  $("sendBtn").disabled = false;
}

// Called from main.js after the user bubble is already added and input is cleared.
export async function sendMessage(state, text) {
  state.history.push({ role: "user", content: text });
  state.msgCount++;
  track("msg_reached", String(state.msgCount));
  updateMsgCounter(state);
  $("sendBtn").disabled = true;

  const bubble = document.createElement("div");
  bubble.className = "msg them streaming";
  $("chat").appendChild(bubble);
  scrollChat();

  try {
    const raw = await callClaudeStream(
      getKey(), getModel(),
      personaSystem(state), state.history, MAX_TOKENS.persona,
      (_delta, accumulated) => {
        const partial = extractPartialFala(accumulated);
        if (partial) bubble.textContent = partial;
        scrollChat();
      }
    );
    bubble.classList.remove("streaming");
    const parsed = parseJSON(raw) || { fala: raw, humor: state.mood, pensamento: "" };
    if (parsed.fala === GUARDRAIL_REFUSAL_FALA) track("guardrail_triggered");
    bubble.textContent = parsed.fala || "...";
    if (parsed.pensamento) addThought(parsed.pensamento);
    if (typeof parsed.humor === "number") {
      setMood(state, parsed.humor);
      state.moodHistory.push(parsed.humor);
      renderMoodChart(state.moodHistory);
    }
    state.history.push({ role: "assistant", content: raw });
  } catch (e) {
    bubble.classList.remove("streaming");
    if (e.message === "NO_KEY") {
      bubble.remove();
      alert("Conecte sua chave do Claude (⚙︎ Chave).");
      $("gearBtn").click();
    } else if (e.message === "RATE_LIMITED") {
      bubble.textContent = "[Limite diário atingido. Tente novamente amanhã.]";
    } else {
      bubble.textContent = "[erro ao obter resposta]";
      console.error(e);
    }
  }
  $("sendBtn").disabled = false;
}
