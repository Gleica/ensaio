import { PROXY_URL } from "../config.js";
import { isSharedMode } from "../session.js";

function trackEndpoint() {
  return new URL(PROXY_URL).origin + "/v1/track";
}

// Fire-and-forget: nunca lança erro nem bloqueia a UI. Só envia quando o
// Worker de produção está disponível (isSharedMode()) — não existe endpoint
// de telemetria em dev local, onde PROXY_URL ainda é o placeholder.
// Nunca envia texto de conversa ou identificadores pessoais, só o nome do
// evento e um metadado curto (ex.: cena, dificuldade, nº de mensagens).
export function track(event, meta) {
  if (!isSharedMode()) return;
  try {
    fetch(trackEndpoint(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(meta !== undefined ? { event, meta } : { event }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // telemetria nunca deve quebrar a experiência do usuário
  }
}
