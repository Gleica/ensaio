import { escapeHtml } from "../lib/escape.js";

const $ = id => document.getElementById(id);

export function renderCoach(coachData) {
  const box = $("coachBox");
  const suggestionHtml = coachData.sugestao
    ? `<div class="sug"><b>Tente assim:</b> "${escapeHtml(coachData.sugestao)}" <button class="btn ghost" id="useSug" style="margin-left:8px;padding:6px 10px;font-size:12.5px">Usar</button></div>`
    : "";
  box.innerHTML = `<div class="coach">
    <h3>🎯 Feedback do coach</h3>
    <p>${escapeHtml(coachData.analise || "")}</p>
    ${suggestionHtml}
  </div>`;
  if (coachData.sugestao) {
    $("useSug").addEventListener("click", () => {
      $("input").value = coachData.sugestao;
      $("input").focus();
    });
  }
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
