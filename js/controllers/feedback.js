import { getKey, getModel } from "../session.js";
import { MAX_TOKENS } from "../config.js";
import { callClaude, callClaudeStream } from "../api/anthropic.js";
import { coachSystem, reportSystem } from "../prompts.js";
import { parseJSON } from "../lib/parse.js";
import { buildTranscript } from "../lib/transcript.js";
import { renderCoach } from "../ui/coach.js";
import { renderReport } from "../ui/report.js";
import { track } from "../lib/analytics.js";

const $ = id => document.getElementById(id);

export async function requestCoach(state) {
  if (!state.history.length) { alert("Mande pelo menos uma fala antes de pedir feedback."); return; }
  track("coach_clicked");
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
      ? "Limite diário atingido. Tente novamente amanhã."
      : "Erro ao gerar feedback. Tente novamente.";
    alert(msg);
    console.error(e);
  }
  $("coachBtn").disabled = false;
  $("coachBtn").textContent = "🎯 Como fui?";
}

const REPORT_STEPS = [
  "🔍 Lendo a conversa…",
  "📊 Avaliando suas falas…",
  "✍️ Calculando sua nota…",
  "📋 Escrevendo o relatório…",
];

export async function generateReport(state) {
  const userTurns = state.history.filter(m => m.role === "user").length;
  if (userTurns < 2) { alert("Troque pelo menos 2 falas antes de gerar o relatório."); return; }

  $("reportContent").innerHTML = `<div class="report-loading"><span id="reportStep">${REPORT_STEPS[0]}</span></div>`;
  $("reportActions").classList.add("hide");
  $("reportModal").classList.add("on");

  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    stepIdx = Math.min(stepIdx + 1, REPORT_STEPS.length - 1);
    const el = document.getElementById("reportStep");
    if (el) el.textContent = REPORT_STEPS[stepIdx];
  }, 1500);

  const transcript = buildTranscript(state.history);
  try {
    const raw = await callClaudeStream(
      getKey(), getModel(),
      reportSystem(state),
      [{ role: "user", content: "Transcrição:\n" + transcript }],
      MAX_TOKENS.report,
      () => {}
    );
    clearInterval(stepTimer);
    const report = parseJSON(raw);
    if (report) {
      state.lastReport = report;
      renderReport(report);
      track("report_generated");
    } else {
      $("reportContent").innerHTML = `<p style="color:var(--bad)">Não foi possível gerar o relatório completo. Tente novamente.</p>`;
      console.error("Report JSON parse failed — raw response:", raw);
    }
  } catch (e) {
    clearInterval(stepTimer);
    const msg = e.message === "RATE_LIMITED"
      ? "Limite diário atingido. Tente novamente amanhã."
      : "Erro ao gerar relatório. Tente novamente.";
    $("reportContent").innerHTML = `<p style="color:var(--bad)">${msg}</p>`;
    console.error(e);
  }
}
