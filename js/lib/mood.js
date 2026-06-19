import { MOOD } from "../config.js";

const MOOD_LEVELS = [
  { max: 20,       emoji: "😡", label: "Furiosa"    },
  { max: 40,       emoji: "😒", label: "Irritada"   },
  { max: 60,       emoji: "😐", label: "Neutra"     },
  { max: 80,       emoji: "🙂", label: "Abrindo"    },
  { max: Infinity, emoji: "😄", label: "Convencida" },
];

export function moodScale(value) {
  const v = Math.max(0, Math.min(100, value));
  const level = MOOD_LEVELS.find(l => v < l.max);
  const color = v < MOOD.chartBad ? "var(--bad)" : v < MOOD.chartOk ? "var(--warn)" : "var(--ok)";
  return { emoji: level.emoji, label: level.label, color };
}
