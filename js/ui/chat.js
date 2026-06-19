const $ = id => document.getElementById(id);

export function addBubble(text, cssClass) {
  const el = document.createElement("div");
  el.className = "msg " + cssClass;
  el.textContent = text;
  $("chat").appendChild(el);
  scrollChat();
  return el;
}

export function addThought(text) {
  const el = document.createElement("div");
  el.className = "think";
  el.innerHTML = "<b>💭 pensando:</b> ";
  el.appendChild(document.createTextNode(text));
  if (!$("thoughtToggle").checked) el.classList.add("hide");
  el.dataset.think = "1";
  $("chat").appendChild(el);
  scrollChat();
}

export function scrollChat() {
  const chat = $("chat");
  chat.scrollTop = chat.scrollHeight;
}
