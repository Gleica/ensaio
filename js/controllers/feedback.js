import { getKey, getModel } from "../session.js";
import { MAX_TOKENS } from "../config.js";
import { callClaude } from "../api/anthropic.js";
import { coachSystem, reportSystem } from "../prompts.js";
import { parseJSON } from "../lib/parse.js";
import { buildTranscript } from "../lib/transcript.js";
import { escapeHtml } from "../lib/escape.js";
import { renderCoach } from "../ui/coach.js";
import { renderReport } from "../ui/report.js";

const $ = id => document.getElementById(id);

export async function requestCoach(state) {
  if (!state.history.length) { alert("Mande pelo menos uma fala antes de pedir feedback."); return; }
  $("coachBtn").disabled = true;
  $("coachBtn").textContent = "Analisando...";
  const transcript = buildTranscript(state.history);
  try {
    const raw = await callClaude(
      getKey(), getModel(),
      coachSystem(state),
      [{ role: "user", content: "Conversa até agora:\n" + transcript }],
      MAX_TOKENS.coach
    );
    const coachData = parseJSON(raw) || { analise: raw, sugestao: "" };
    renderCoach(coachData);
  } catch (e) {
    const msg = e.message === "RATE_LIMITED"
      ? "Limite diário atingido. Tente novamente amanhã ou use sua própria chave (⚙︎)."
      : "Erro ao gerar feedback. Tente novamente.";
    alert(msg);
    console.error(e);
  }
  $("coachBtn").disabled = false;
  $("coachBtn").textContent = "🎯 Como fui?";
}

export async function generateReport(state) {
  const userTurns = state.history.filter(m => m.role === "user").length;
  if (userTurns < 2) { alert("Troque pelo menos 2 falas antes de gerar o relatório."); return; }
  $("reportContent").innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted)">⏳ Analisando sua conversa…</div>`;
  $("reportModal").classList.add("on");
  const transcript = buildTranscript(state.history);
  try {
    const raw = await callClaude(
      getKey(), getModel(),
      reportSystem(state),
      [{ role: "user", content: "Transcrição:\n" + transcript }],
      MAX_TOKENS.report
    );
    const report = parseJSON(raw);
    if (report) renderReport(report);
    else $("reportContent").innerHTML = `<p style="white-space:pre-wrap;font-size:14px">${escapeHtml(raw)}</p>`;
  } catch (e) {
    const msg = e.message === "RATE_LIMITED"
      ? "Limite diário atingido. Tente novamente amanhã ou use sua própria chave (⚙︎)."
      : "Erro ao gerar relatório. Tente novamente.";
    $("reportContent").innerHTML = `<p style="color:var(--bad)">${msg}</p>`;
    console.error(e);
  }
}
