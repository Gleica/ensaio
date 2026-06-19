import { LIMITS } from "../config.js";
import { isSharedMode } from "../session.js";

const $ = id => document.getElementById(id);

export function updateMsgCounter(state) {
  const el = $("msgCounter");
  if (!el) return;
  if (!isSharedMode() || state.demo) { el.classList.add("hide"); return; }
  const used = state.msgCount;
  const max  = LIMITS.msgsPerSession;
  el.textContent = `💬 ${used}/${max}`;
  el.style.color = used >= max - LIMITS.warnBeforeEnd ? "var(--warn)" : "var(--muted)";
  el.classList.remove("hide");
  if (used >= max) {
    $("input").disabled   = true;
    $("sendBtn").disabled = true;
    el.style.color = "var(--bad)";
  }
}
