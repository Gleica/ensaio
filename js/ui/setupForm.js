import { SCENES } from "../data/scenes.js";

const $ = id => document.getElementById(id);

export function readSetup(state) {
  state.who  = $("who").value.trim() || "a outra pessoa";
  state.rel  = $("rel").value === "Outro"
    ? ($("relOther").value.trim() || "Outro")
    : $("rel").value;
  state.traits     = [...document.querySelectorAll("#traits .chip.on")].map(c => c.dataset.v);
  state.goal       = $("goal").value.trim();
  state.tone       = (document.querySelector("#tones .chip.on")       || { dataset: { v: "firme"  } }).dataset.v;
  state.difficulty = (document.querySelector("#difficulties .chip.on") || { dataset: { v: "normal" } }).dataset.v;
}

export function loadScene(state, scene) {
  state.sceneId = scene.id;
  $("who").value = scene.who;
  [...$("rel").options].forEach(o => { o.selected = o.text === scene.rel; });
  $("relOther").classList.add("hide");
  $("relOther").value = "";
  document.querySelectorAll("#traits .chip").forEach(c => {
    c.classList.toggle("on", scene.traits.includes(c.dataset.v));
  });
  $("goal").value = scene.goal;
  document.querySelectorAll("#tones .chip").forEach(c => {
    c.classList.toggle("on", c.dataset.v === scene.tone);
  });
  document.querySelectorAll(".scene-card").forEach(c => {
    c.classList.toggle("on", c.dataset.id === scene.id);
  });
  $("who").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

export function renderSceneGallery(onSceneClick) {
  const gallery = $("scenesGallery");
  SCENES.forEach(scene => {
    const card = document.createElement("div");
    card.className = "scene-card";
    card.dataset.id = scene.id;
    card.innerHTML = `<div class="scene-emoji">${scene.emoji}</div><div class="scene-title">${scene.title}</div><div class="scene-sub">${scene.subtitle}</div>`;
    card.addEventListener("click", () => onSceneClick(scene));
    gallery.appendChild(card);
  });
}
