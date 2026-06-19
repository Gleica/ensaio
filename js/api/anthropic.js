import { API_URL } from "../config.js";

export async function callClaude(key, model, system, messages, maxTokens = 700) {
  if (!key) throw new Error("NO_KEY");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("Anthropic API error:", detail);
    throw new Error(`Erro na API (${res.status}). Verifique sua chave.`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export async function callClaudeStream(key, model, system, messages, maxTokens, onChunk) {
  if (!key) throw new Error("NO_KEY");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages, stream: true }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("Anthropic API error:", detail);
    throw new Error(`Erro na API (${res.status}). Verifique sua chave.`);
  }
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
