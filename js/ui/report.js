import { escapeHtml } from "../lib/escape.js";
import { buildReportMarkdown } from "../lib/reportExport.js";

const $ = id => document.getElementById(id);

export function downloadReportMarkdown(report, state) {
  if (!report) return;
  const markdown = buildReportMarkdown(report, state);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ensaio-relatorio-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function renderReport(report) {
  const nota = Math.max(0, Math.min(10, Number.parseFloat(report.nota) || 0));
  const scoreColor = nota < 4 ? "var(--bad)" : nota < 7 ? "var(--warn)" : "var(--ok)";

  const strengths = (report.pontos_fortes || [])
    .map(p => `<div class="report-item"><span>✅</span>${escapeHtml(p)}</div>`)
    .join("");

  const errors = (report.erros_recorrentes || [])
    .map(e => `<div class="report-item"><span>⚠️</span>${escapeHtml(e)}</div>`)
    .join("");

  $("reportContent").innerHTML = `
    <h2 style="margin:0 0 18px;font-size:18px">📋 Relatório da sessão</h2>
    <div class="report-score">
      <div class="score-circle" style="color:${scoreColor};border-color:${scoreColor};background:${scoreColor}1a">
        ${nota.toFixed(1)}
      </div>
      <div class="score-title">${escapeHtml(report.titulo || "")}</div>
    </div>
    ${strengths ? `<div class="report-section"><h4>Pontos fortes</h4>${strengths}</div>` : ""}
    ${errors   ? `<div class="report-section"><h4>O que melhorar</h4>${errors}</div>` : ""}
    ${report.melhor_fala   ? `<div class="report-section"><h4>⭐ Sua melhor fala</h4><div class="report-best">"${escapeHtml(report.melhor_fala)}"</div></div>` : ""}
    ${report.proximo_passo ? `<div class="report-section"><h4>🎯 Próximo passo</h4><div class="report-next">${escapeHtml(report.proximo_passo)}</div></div>` : ""}
    ${report.arco ? `<div class="report-section"><h4>📈 Arco emocional</h4><p class="report-arc">${escapeHtml(report.arco)}</p></div>` : ""}
  `;
  $("reportActions").classList.remove("hide");
}
