import { MODEL_DEFAULT, STORAGE_KEYS } from "./config.js";

// Placeholder replaced at deploy time by GitHub Actions (see .github/workflows/deploy.yml).
// Locally this stays as "__SHARED_KEY__" so isSharedMode() returns false and BYOK is used.
const SHARED_KEY = "__SHARED_KEY__";

export function isSharedMode() {
  return !!SHARED_KEY && !SHARED_KEY.startsWith("__");
}

export function getKey() {
  return isSharedMode() ? SHARED_KEY : (sessionStorage.getItem(STORAGE_KEYS.apiKey) || "");
}

export function getModel() {
  return isSharedMode()
    ? MODEL_DEFAULT
    : (sessionStorage.getItem(STORAGE_KEYS.model) || MODEL_DEFAULT);
}
