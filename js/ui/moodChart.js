import { moodScale } from "../lib/mood.js";

const $ = id => document.getElementById(id);

export function buildMoodChartSvg(history) {
  const W = 400, H = 90;
  const pad = { top: 14, right: 18, bottom: 20, left: 30 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const mapY = v => (pad.top + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH).toFixed(1);
  const mapX = i => (pad.left + (history.length < 2 ? innerW / 2 : (i / (history.length - 1)) * innerW)).toFixed(1);

  const lastValue = history.at(-1);
  const lineColor = moodScale(lastValue).color;

  const points = history.map((v, i) => `${mapX(i)},${mapY(v)}`).join(" ");

  const lastIndex = history.length - 1;
  const baseline = (pad.top + innerH).toFixed(1);
  const areaPath = [
    `M ${mapX(0)},${mapY(history[0])}`,
    ...history.slice(1).map((v, i) => `L ${mapX(i + 1)},${mapY(v)}`),
    `L ${mapX(lastIndex)},${baseline} L ${mapX(0)},${baseline} Z`,
  ].join(" ");

  const x0 = pad.left.toFixed(1);
  const x1 = (pad.left + innerW).toFixed(1);
  const grid = [
    `<line x1="${x0}" y1="${mapY(100)}" x2="${x1}" y2="${mapY(100)}" stroke="var(--line)" stroke-width="0.5"/>`,
    `<line x1="${x0}" y1="${mapY(50)}"  x2="${x1}" y2="${mapY(50)}"  stroke="var(--line)" stroke-width="0.5" stroke-dasharray="4,3"/>`,
    `<line x1="${x0}" y1="${baseline}"  x2="${x1}" y2="${baseline}"  stroke="var(--line)" stroke-width="0.5"/>`,
  ].join("");

  const yLabels = [[100, "😄"], [50, "😐"], [0, "😡"]]
    .map(([v, em]) =>
      `<text x="${(pad.left - 5).toFixed(1)}" y="${(Number.parseFloat(mapY(v)) + 4).toFixed(1)}" text-anchor="end" font-size="11">${em}</text>`
    ).join("");

  const xLabels = history
    .map((_, i) =>
      `<text x="${mapX(i)}" y="${H - 3}" text-anchor="middle" fill="var(--muted)" font-size="9">${i + 1}</text>`
    ).join("");

  const dots = history
    .map((v, i) => {
      const dotColor = moodScale(v).color;
      const radius = i === history.length - 1 ? 5 : 3.5;
      return `<circle cx="${mapX(i)}" cy="${mapY(v)}" r="${radius}" fill="${dotColor}" stroke="var(--card)" stroke-width="1.5"/>`;
    }).join("");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${lineColor}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  ${grid}${yLabels}${xLabels}
  <path d="${areaPath}" fill="url(#cg)"/>
  <polyline points="${points}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${dots}
</svg>`;
}

export function renderMoodChart(history) {
  const container = $("moodChart");
  if (!container) return;
  if (history.length < 2) { container.classList.add("hide"); return; }
  container.classList.remove("hide");
  container.innerHTML = `<p class="mood-chart-label">📈 Arco emocional da conversa</p>${buildMoodChartSvg(history)}`;
}
