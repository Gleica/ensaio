export function parseJSON(text) {
  try { return JSON.parse(text); } catch { /* fall through to extraction below */ }
  const clean = text.replaceAll("```json", "").replaceAll("```", "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)); } catch { /* unparseable */ }
  }
  return null;
}

export function extractPartialFala(accumulated) {
  const match = accumulated.match(/"fala"\s*:\s*"/);
  if (!match) return "";
  const start = match.index + match[0].length;
  let result = "";
  for (let i = start; i < accumulated.length; i++) {
    if (accumulated[i] === "\\" && i + 1 < accumulated.length) {
      const c = accumulated[++i];
      result += c === '"' ? '"' : c === "n" ? "\n" : c === "t" ? "\t" : c;
    } else if (accumulated[i] === '"') {
      break;
    } else {
      result += accumulated[i];
    }
  }
  return result;
}
