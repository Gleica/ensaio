export function createState() {
  return {
    who: "", rel: "", traits: [], goal: "", tone: "firme",
    mood: 50, history: [], moodHistory: [], msgCount: 0,
    difficulty: "normal", demo: false, demoStep: 0, sceneId: null,
    lastReport: null,
  };
}

export function resetSession(state) {
  state.demo        = false;
  state.history     = [];
  state.msgCount    = 0;
  state.moodHistory = [];
  state.demoStep    = 0;
  state.mood        = 50;
  state.sceneId     = null;
  state.lastReport  = null;
}
