import { DEMO } from "../data/demo.js";
import { DEMO_TYPING_MS } from "../config.js";
import { showSim } from "../ui/screens.js";
import { addBubble, addThought, scrollChat } from "../ui/chat.js";
import { setMood } from "../ui/moodMeter.js";
import { renderMoodChart } from "../ui/moodChart.js";
import { renderCoach } from "../ui/coach.js";

const $ = id => document.getElementById(id);

export function runDemo(state) {
  state.who         = DEMO.who;
  state.rel         = DEMO.rel;
  state.traits      = ["defensiva"];
  state.goal        = "pedir um aumento para o gestor";
  state.tone        = "firme";
  state.demo        = true;
  state.demoStep    = 0;
  state.history     = [];
  state.moodHistory = [];
  showSim(state);
  setMood(state, DEMO.openMood);
  addBubble(DEMO.opening, "them");
  addThought(DEMO.openThink);
  $("input").value = DEMO.suggestions[0];
  addBubble("👋 Modo demonstração: as respostas já estão roteirizadas. É só clicar em Enviar (a fala sugerida já está no campo) e ver o humor do Ricardo mudar.", "them");
}

export function demoReply(state) {
  const turn = DEMO.turns[state.demoStep];
  if (!turn) {
    addBubble("Fim da demonstração 🎬 Clique em ↺ Nova cena para montar a SUA conversa de verdade.", "them");
    return;
  }
  const typing = document.createElement("div");
  typing.className = "typing";
  typing.textContent = state.who + " está digitando…";
  $("chat").appendChild(typing);
  scrollChat();
  setTimeout(() => {
    typing.remove();
    addBubble(turn.fala, "them");
    addThought(turn.pensamento);
    setMood(state, turn.humor);
    state.moodHistory.push(turn.humor);
    renderMoodChart(state.moodHistory);
    state.demoStep++;
    const nextSuggestion = DEMO.suggestions[state.demoStep];
    if (nextSuggestion) $("input").value = nextSuggestion;
  }, DEMO_TYPING_MS);
}

export function demoCoach() {
  renderCoach(DEMO.coach);
}
