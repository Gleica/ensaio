/* ============================================================
   claude.js — camada de API (sem DOM, sem estado da app)
   Funções exportadas: getKey, getModel, callClaude,
   callClaudeStream, parseJSON, extractPartialFala,
   personaSystem, coachSystem
   ============================================================ */

const API_URL = "https://api.anthropic.com/v1/messages";

function getKey(){ return sessionStorage.getItem("ensaio_key") || ""; }
function getModel(){ return sessionStorage.getItem("ensaio_model") || "claude-sonnet-4-6"; }

/* chamada simples — coach, sugestão */
async function callClaude(system, messages, maxTokens = 700){
  const key = getKey();
  if(!key){ throw new Error("NO_KEY"); }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({ model: getModel(), max_tokens: maxTokens, system, messages })
  });
  if(!res.ok){
    const t = await res.text();
    throw new Error("API " + res.status + ": " + t);
  }
  const data = await res.json();
  return (data.content && data.content[0] && data.content[0].text) || "";
}

/* chamada com streaming — chama onChunk(delta, acumulado) a cada fragmento */
async function callClaudeStream(system, messages, maxTokens, onChunk){
  const key = getKey();
  if(!key){ throw new Error("NO_KEY"); }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({ model: getModel(), max_tokens: maxTokens, system, messages, stream: true })
  });
  if(!res.ok){
    const t = await res.text();
    throw new Error("API " + res.status + ": " + t);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";
  while(true){
    const { done, value } = await reader.read();
    if(done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for(const line of lines){
      if(!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if(data === "[DONE]") continue;
      try{
        const ev = JSON.parse(data);
        if(ev.type === "content_block_delta" && ev.delta?.type === "text_delta"){
          accumulated += ev.delta.text;
          onChunk(ev.delta.text, accumulated);
        }
      }catch(e){}
    }
  }
  return accumulated;
}

/* extrai o primeiro objeto JSON de um texto */
function parseJSON(txt){
  try{ return JSON.parse(txt); }catch(e){}
  let s = txt.replace(/```json/gi, "").replace(/```/g, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if(a >= 0 && b > a){ try{ return JSON.parse(s.slice(a, b + 1)); }catch(e){} }
  return null;
}

/* extrai o valor parcial de "fala" de um JSON ainda sendo acumulado */
function extractPartialFala(accumulated){
  const m = accumulated.match(/"fala"\s*:\s*"/);
  if(!m) return "";
  const start = m.index + m[0].length;
  let result = "";
  for(let i = start; i < accumulated.length; i++){
    if(accumulated[i] === "\\" && i + 1 < accumulated.length){
      const c = accumulated[++i];
      result += c === '"' ? '"' : c === 'n' ? '\n' : c === 't' ? '\t' : c;
    } else if(accumulated[i] === '"'){
      break;
    } else {
      result += accumulated[i];
    }
  }
  return result;
}

/* ---------- prompts ---------- */
function personaSystem(state){
  const traits = state.traits.length ? state.traits.join(", ") : "reações realistas e variadas";
  const diffNote = state.difficulty === "facil"
    ? "- DIFICULDADE FÁCIL: você está num dia receptivo. Ouve com abertura, cede com argumentos razoáveis e não pressiona demais."
    : state.difficulty === "pesadelo"
    ? "- DIFICULDADE PESADELO 🔥: interprete a personalidade no extremo. Questione cada argumento, use pressão emocional ou lógica fria, traga objeções inesperadas e não ceda com facilidade. Seja um desafio real — mas dentro da personalidade definida."
    : "- Seja realista, não fácil demais.";
  return `Você está num SIMULADOR DE CONVERSAS DIFÍCEIS. Seu papel é INTERPRETAR uma pessoa real numa conversa, para que o usuário possa treinar antes de tê-la na vida real.

QUEM VOCÊ INTERPRETA: ${state.who} (${state.rel}).
PERSONALIDADE / COMO ESSA PESSOA REAGE: ${traits}.
CONTEXTO (o que o usuário quer tratar): ${state.goal || "uma conversa delicada"}.

REGRAS:
- Você É essa pessoa. Nunca quebre o personagem. Nunca diga que é uma IA.
- Responda em português do Brasil, de forma curta e natural, como gente fala numa conversa real (1 a 4 frases). Nada de textão.
- Reaja de verdade ao que o usuário diz: se ele for desajeitado, agressivo ou inseguro, mostre isso (irritação, mágoa, defesa). Se ele for claro, empático e firme, deixe a pessoa abrir mais.
${diffNote}
- Mantenha coerência com a personalidade definida.

FORMATO DA RESPOSTA — responda SOMENTE com um JSON válido, sem texto fora dele:
{
  "fala": "o que a pessoa diz em voz alta",
  "humor": número de 0 a 100 (0 = furiosa/fechada, 50 = neutra, 100 = aberta/convencida) representando como ela está se sentindo AGORA depois desta fala do usuário,
  "pensamento": "o que essa pessoa está realmente pensando por dentro, mas não diz"
}`;
}

function reportSystem(state){
  return `Você é um coach especialista em comunicação. Analise a conversa de simulação completa abaixo e gere um relatório de desempenho detalhado.

CONTEXTO DA CENA:
- Interlocutor: ${state.who} (${state.rel})
- Objetivo do usuário: ${state.goal || "conduzir uma conversa difícil"}
- Tom desejado: ${state.tone}
- Dificuldade: ${state.difficulty}

Avalie exclusivamente as falas do usuário (linhas "VOCÊ:"). Seja honesto, específico e construtivo.

Responda SOMENTE com JSON válido:
{
  "nota": número de 0 a 10 com uma casa decimal,
  "titulo": "frase curta (até 12 palavras) que resume o desempenho geral",
  "pontos_fortes": ["ponto específico 1", "ponto específico 2", "ponto específico 3"],
  "erros_recorrentes": ["erro ou oportunidade perdida 1", "erro ou oportunidade perdida 2"],
  "melhor_fala": "copie literalmente a fala do usuário que foi mais eficaz",
  "proximo_passo": "uma ação prática e específica para melhorar na próxima tentativa",
  "arco": "2 frases descrevendo como o humor da outra pessoa evoluiu e por que isso aconteceu"
}`;
}

function coachSystem(state){
  return `Você é um COACH de comunicação observando uma simulação de conversa difícil entre o usuário e "${state.who}".
O objetivo do usuário: ${state.goal || "conduzir bem uma conversa delicada"}. Tom desejado: ${state.tone}.

Analise a ÚLTIMA fala do usuário no contexto da conversa. Seja específico, prático e gentil, mas honesto.

Responda SOMENTE com JSON válido:
{
  "analise": "2 a 3 frases: o que funcionou e o principal risco/erro da última fala do usuário",
  "sugestao": "uma frase pronta, melhor, que o usuário poderia dizer agora"
}`;
}
