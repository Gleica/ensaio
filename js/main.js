import { isSharedMode, getKey, getModel } from "./session.js";
import { STORAGE_KEYS } from "./config.js";
import { createState, resetSession } from "./state.js";
import { canSendMessage } from "./rateLimit.js";
import { renderSceneGallery, loadScene } from "./ui/setupForm.js";
import { showSetup } from "./ui/screens.js";
import { addBubble } from "./ui/chat.js";
import { startRehearsal, suggestOpening, sendMessage } from "./controllers/rehearsal.js";
import { requestCoach, generateReport } from "./controllers/feedback.js";
import { runDemo, demoReply, demoCoach } from "./controllers/demo.js";

const $ = id => document.getElementById(id);
const state = createState();

function onSend() {
  const text = $("input").value.trim();
  if (!text) return;
  if (!state.demo && !canSendMessage(state)) return;
  addBubble(text, "me");
  $("input").value = "";
  if (state.demo) demoReply(state);
  else sendMessage(state, text);
}

function init() {
  // Key button: hidden in shared mode
  if (isSharedMode()) $("gearBtn").classList.add("hide");

  // Chips: traits allow multi-select; tones/difficulties are single-select
  document.querySelectorAll("#traits .chip").forEach(chip => {
    chip.addEventListener("click", () => chip.classList.toggle("on"));
  });
  ["#tones", "#difficulties"].forEach(selector => {
    document.querySelectorAll(selector + " .chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(selector + " .chip").forEach(c => c.classList.remove("on"));
        chip.classList.add("on");
      });
    });
  });

  // Key modal
  $("gearBtn").addEventListener("click", () => {
    $("apiKey").value = getKey();
    $("model").value  = getModel();
    $("keyModal").classList.add("on");
  });
  $("keyClose").addEventListener("click", () => $("keyModal").classList.remove("on"));
  $("keySave").addEventListener("click", () => {
    sessionStorage.setItem(STORAGE_KEYS.apiKey, $("apiKey").value.trim());
    sessionStorage.setItem(STORAGE_KEYS.model,  $("model").value.trim() || "claude-sonnet-4-6");
    $("keyModal").classList.remove("on");
  });

  // Rel "Outro" free-text field
  $("rel").addEventListener("change", () => {
    $("relOther").classList.toggle("hide", $("rel").value !== "Outro");
  });

  // Scene gallery
  renderSceneGallery(scene => loadScene(state, scene));

  // Setup buttons
  $("startBtn").addEventListener("click",   () => startRehearsal(state));
  $("suggestBtn").addEventListener("click", () => suggestOpening(state));
  $("demoBtn").addEventListener("click",    () => runDemo(state));

  // Simulator: send message
  $("sendBtn").addEventListener("click", onSend);
  $("input").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  });

  // Thought toggle
  $("thoughtToggle").addEventListener("change", () => {
    document.querySelectorAll(".think").forEach(el => {
      el.classList.toggle("hide", !$("thoughtToggle").checked);
    });
  });

  // Tools
  $("coachBtn").addEventListener("click", () => {
    if (state.demo) demoCoach();
    else requestCoach(state);
  });
  $("reportBtn").addEventListener("click", () => {
    if (state.demo) { alert("O relatório está disponível apenas em ensaios ao vivo."); return; }
    generateReport(state);
  });
  $("reportClose").addEventListener("click", () => $("reportModal").classList.remove("on"));

  // Reset
  $("resetBtn").addEventListener("click", () => {
    resetSession(state);
    $("input").disabled   = false;
    $("sendBtn").disabled = false;
    showSetup();
  });
}

init();
