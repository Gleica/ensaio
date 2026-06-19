export const API_URL = "https://api.anthropic.com/v1/messages";
export const MODEL_DEFAULT = "claude-sonnet-4-6";

export const STORAGE_KEYS = {
  apiKey: "ensaio_key",
  model:  "ensaio_model",
  usage:  "ensaio_usage",
};

export const LIMITS = {
  msgsPerSession: 8,
  sessionsPerDay: 3,
  warnBeforeEnd:  2,
};

export const MAX_TOKENS = {
  persona: 600,
  coach:   500,
  report:  750,
  suggest: 250,
};

export const MOOD = {
  chartBad: 35,
  chartOk:  65,
};

export const DEMO_TYPING_MS = 700;
