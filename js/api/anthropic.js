import { API_URL, PROXY_URL } from "../config.js";

function endpoint(key) {
  // Sem chave do usuário → proxy server-side (chave nunca chega ao browser).
  // Com chave do usuário → direto para Anthropic (BYOK).
  return key ? API_URL : PROXY_URL;
}

function buildHeaders(key) {
  if (key) {
    return {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }
  return {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
  };
}

function throwApiError(status) {
  console.error("Anthropic API error: status", status);
  if (status === 429) throw new Error("RATE_LIMITED");
  throw new Error(`Erro na API (${status}). Verifique sua chave.`);
}

function proxyReady() {
  return !!PROXY_URL && !PROXY_URL.startsWith("__");
}

export async function callClaude(key, model, system, messages, maxTokens = 700) {
  if (!key && !proxyReady()) throw new Error("NO_KEY");
  const res = await fetch(endpoint(key), {
    method: "POST",
    headers: buildHeaders(key),
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throwApiError(res.status);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export async function callClaudeStream(key, model, system, messages, maxTokens, onChunk) {
  if (!key && !proxyReady()) throw new Error("NO_KEY");
  const res = await fetch(endpoint(key), {
    method: "POST",
    headers: buildHeaders(key),
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages, stream: true }),
  });
  if (!res.ok) throwApiError(res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
          accumulated += ev.delta.text;
          onChunk(ev.delta.text, accumulated);
        }
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
  return accumulated;
}
