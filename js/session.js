import { MODEL_DEFAULT, STORAGE_KEYS, PROXY_URL } from "./config.js";

// Modo compartilhado: proxy disponível (PROXY_URL injetado) E usuário sem chave própria.
// Localmente PROXY_URL = "__PROXY_URL__" → isSharedMode() = false → gear button visível.
export function isSharedMode() {
  const proxyReady = !!PROXY_URL && !PROXY_URL.startsWith("__");
  const userHasKey = !!sessionStorage.getItem(STORAGE_KEYS.apiKey);
  return proxyReady && !userHasKey;
}

export function getKey() {
  return sessionStorage.getItem(STORAGE_KEYS.apiKey) || "";
}

export function getModel() {
  return sessionStorage.getItem(STORAGE_KEYS.model) || MODEL_DEFAULT;
}
