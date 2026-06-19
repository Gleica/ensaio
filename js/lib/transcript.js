export function buildTranscript(history) {
  return history
    .map(m => (m.role === "user" ? "VOCÊ: " : "OUTRO: ") + (typeof m.content === "string" ? m.content : ""))
    .join("\n");
}
