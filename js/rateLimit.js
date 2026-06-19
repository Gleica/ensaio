import { LIMITS, STORAGE_KEYS } from "./config.js";
import { isSharedMode } from "./session.js";

export function getUsage() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.usage) || "{}");
    return stored.date === today ? stored : { date: today, sessions: 0 };
  } catch {
    return { date: today, sessions: 0 };
  }
}

export function saveUsage(data) {
  localStorage.setItem(STORAGE_KEYS.usage, JSON.stringify(data));
}

// Returns { ok: true, usage } when the user can start a session,
// or { ok: false, message } when the daily limit has been reached.
export function guardSessionStart() {
  if (!isSharedMode()) return { ok: true };
  const usage = getUsage();
  if (usage.sessions >= LIMITS.sessionsPerDay) {
    return {
      ok: false,
      message: `Você já usou suas ${LIMITS.sessionsPerDay} sessões gratuitas de hoje. Volte amanhã ou conecte sua própria chave (⚙︎ Chave).`,
    };
  }
  return { ok: true, usage };
}

export function consumeSession(usage) {
  usage.sessions++;
  saveUsage(usage);
}

export function canSendMessage(state) {
  if (!isSharedMode() || state.demo) return true;
  return state.msgCount < LIMITS.msgsPerSession;
}
