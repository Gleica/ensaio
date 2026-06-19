const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function escapeHtml(s) {
  return (s || "").replace(/[&<>"]/g, c => ESCAPE_MAP[c]);
}
