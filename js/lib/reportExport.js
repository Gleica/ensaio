import { SCENES } from "../data/scenes.js";

function sceneLabel(sceneId) {
  const scene = SCENES.find(s => s.id === sceneId);
  return scene ? scene.title : "Cena personalizada";
}

// Pure — recebe o objeto de relatório já parseado e o state, retorna markdown.
// generatedAt é injetável para manter a função testável sem depender do relógio real.
export function buildReportMarkdown(report, state, generatedAt = new Date()) {
  const nota = Math.max(0, Math.min(10, Number.parseFloat(report.nota) || 0)).toFixed(1);
  const strengths = (report.pontos_fortes || []).map(p => `- ${p}`).join("\n") || "- —";
  const errors = (report.erros_recorrentes || []).map(e => `- ${e}`).join("\n") || "- —";

  const sections = [
    `# Relatório de ensaio — EnsaIA`,
    ``,
    `**Nota:** ${nota}/10 — ${report.titulo || ""}`,
    ``,
    `**Cena:** ${sceneLabel(state.sceneId)}`,
    `**Interlocutor:** ${state.who} (${state.rel})`,
    `**Dificuldade:** ${state.difficulty}`,
    ``,
    `## Pontos fortes`,
    strengths,
    ``,
    `## O que melhorar`,
    errors,
  ];

  if (report.melhor_fala) sections.push(``, `## ⭐ Sua melhor fala`, `> "${report.melhor_fala}"`);
  if (report.proximo_passo) sections.push(``, `## 🎯 Próximo passo`, report.proximo_passo);
  if (report.arco) sections.push(``, `## 📈 Arco emocional`, report.arco);

  sections.push(``, `---`, `Gerado por [EnsaIA](https://gleica.github.io/ensaio/) em ${generatedAt.toLocaleDateString("pt-BR")}`);

  return sections.join("\n") + "\n";
}
