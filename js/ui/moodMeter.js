import { moodScale } from "../lib/mood.js";

const $ = id => document.getElementById(id);

export function setMood(state, value) {
  state.mood = Math.max(0, Math.min(100, value));
  const { emoji, label } = moodScale(state.mood);
  $("meterFill").style.width = state.mood + "%";
  $("moodEmoji").textContent = emoji;
  $("moodLabel").textContent = label;
}
