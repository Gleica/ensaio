const $ = id => document.getElementById(id);

const DIFF_LABELS = { facil: "😌 Fácil", normal: "😐 Normal", pesadelo: "🔥 Pesadelo" };
const DIFF_COLORS = { facil: "var(--ok)", normal: "var(--muted)", pesadelo: "var(--bad)" };

export function showSim(state) {
  $("setup").classList.add("hide");
  $("sim").classList.remove("hide");
  $("simWho").textContent = state.who;
  $("simRel").textContent = state.rel;
  $("demoTag").classList.toggle("hide", !state.demo);
  $("diffTag").textContent = DIFF_LABELS[state.difficulty] || "";
  $("diffTag").style.color = DIFF_COLORS[state.difficulty] || "";
  $("diffTag").classList.toggle("hide", state.demo);
  $("chat").innerHTML = "";
  $("coachBox").innerHTML = "";
  $("moodChart").innerHTML = "";
  $("moodChart").classList.add("hide");
}

export function showSetup() {
  $("sim").classList.add("hide");
  $("setup").classList.remove("hide");
}
