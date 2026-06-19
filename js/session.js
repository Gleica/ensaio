import { MODEL_DEFAULT, STORAGE_KEYS, PROXY_URL } from "./config.js";

// Modo compartilhado: proxy disponível (PROXY_URL injetado).
// Localmente PROXY_URL = "__PROXY_URL__" → isSharedMode() = false → gear button visível.
export function isSharedMode() {
  return !!PROXY_URL && !PROXY_URL.startsWith("__");
}

export function getKey() {
  return sessionStorage.getItem(STORAGE_KEYS.apiKey) || "";
}

export function getModel() {
  return sessionStorage.getItem(STORAGE_KEYS.model) || MODEL_DEFAULT;
}
