import { getKey, getModel, isSharedMode } from "../session.js";
import { MAX_TOKENS } from "../config.js";
import { callClaude, callClaudeStream } from "../api/anthropic.js";
import { personaSystem, suggestSystem } from "../prompts.js";
import { parseJSON, extractPartialFala } from "../lib/parse.js";
import { resetSession } from "../state.js";
import { guardSessionStart, consumeSession } from "../rateLimit.js";
import { readSetup } from "../ui/setupForm.js";
import { showSim } from "../ui/screens.js";
import { addBubble, addThought, scrollChat } from "../ui/chat.js";
import { setMood } from "../ui/moodMeter.js";
import { renderMoodChart } from "../ui/moodChart.js";
import { updateMsgCounter } from "../ui/msgCounter.js";

const $ = id => document.getElementById(id);

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

  resetSession(state);
  showSim(state);
  setMood(state, 50);
  updateMsgCounter(state);
  addBubble("Tudo pronto. Mande sua primeira fala para " + state.who + " — eu reajo como ela reagiria.", "them");
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
      bubble.textContent = "[Limite diário atingido. Tente novamente amanhã ou use sua própria chave (⚙︎).]";
    } else {
      bubble.textContent = "[erro ao obter resposta]";
      console.error(e);
    }
  }
  $("sendBtn").disabled = false;
}
