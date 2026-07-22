# Referência de API — EnsaIA

**Versão:** 1.0  
**Data:** Junho 2026

---

## 1. Anthropic Messages API

**Endpoint:** `POST https://api.anthropic.com/v1/messages`  
**Versão pinada:** `anthropic-version: 2023-06-01`  
**Modelo padrão:** `claude-sonnet-4-6`

### Headers comuns

```
content-type: application/json
anthropic-version: 2023-06-01

# Apenas no modo BYOK:
x-api-key: <chave do usuário>
anthropic-dangerous-direct-browser-access: true
```

---

## 2. Chamadas por papel da IA

### 2.1 Persona (streaming)

**Função:** `callClaudeStream(key, model, personaSystem(state), history, 600, onChunk)`

**Request body:**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 600,
  "stream": true,
  "system": "<personaSystem prompt>",
  "messages": [
    { "role": "user", "content": "texto do usuário" },
    { "role": "assistant", "content": "{\"fala\":\"...\",\"humor\":65,\"pensamento\":\"...\"}" }
  ]
}
```

**Response (JSON dentro do streaming):**
```json
{
  "fala": "texto que a persona diz em voz alta (1-4 frases)",
  "humor": 72,
  "pensamento": "o que a persona pensa mas não diz"
}
```

| Campo | Tipo | Range | Descrição |
|---|---|---|---|
| `fala` | string | — | Resposta em voz da persona |
| `humor` | number | 0-100 | 0 = hostil, 50 = neutro, 100 = aberto |
| `pensamento` | string | — | Monólogo interno (não verbalizado) |

**Streaming parcial:** `extractPartialFala(accumulated)` em `lib/parse.js` extrai o campo `fala` de JSON incompleto para atualizar a bolha em tempo real.

---

### 2.2 Coach (não-streaming)

**Função:** `callClaude(key, model, coachSystem(state), history, 500)`

**Response:**
```json
{
  "analise": "2-3 frases sobre o que funcionou e o principal risco da última fala",
  "sugestao": "uma frase pronta que o usuário poderia dizer agora"
}
```

---

### 2.3 Relatório (streaming, JSON parseado ao final)

**Função:** `callClaudeStream(key, model, reportSystem(state), transcript, 750, onChunk)`

**Response:**
```json
{
  "nota": 7.5,
  "titulo": "Comunicação sólida com oportunidade de escuta ativa",
  "pontos_fortes": [
    "Abertura direta e sem rodeios",
    "Manteve a calma quando pressionado",
    "Trouxe dados concretos"
  ],
  "erros_recorrentes": [
    "Interrompeu antes de ouvir a objeção completa",
    "Tom ficou defensivo na terceira fala"
  ],
  "melhor_fala": "Entendo sua preocupação, e por isso trouxe os números dos últimos dois projetos.",
  "proximo_passo": "Na próxima sessão, pratique fazer uma pergunta aberta antes de apresentar argumentos.",
  "arco": "A persona iniciou defensiva (humor 40) e foi abrindo gradualmente à medida que o usuário trouxe evidências."
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `nota` | number (0-10, 1 decimal) | Nota geral de desempenho |
| `titulo` | string (até 12 palavras) | Resumo do desempenho |
| `pontos_fortes` | string[3] | O que o usuário fez bem |
| `erros_recorrentes` | string[2] | Padrões negativos identificados |
| `melhor_fala` | string | Citação literal da melhor fala do usuário |
| `proximo_passo` | string | Ação prática para a próxima sessão |
| `arco` | string (2 frases) | Evolução emocional da persona |

---

### 2.4 Sugestão de abertura (não-streaming)

**Função:** `callClaude(key, model, suggestSystem(state), [], 250)`

**Response:** texto plain — 1-3 frases em português, sem aspas, sem prefixo.

---

## 3. Cloudflare Worker Proxy

**URL base:** `https://ensaio-proxy.gleica-tech.workers.dev`  
**Rotas aceitas:** `POST /v1/messages` (proxy Anthropic) e `POST /v1/track` (telemetria de uso, seção 3.1)

### Headers aceitos

| Header | Obrigatório | Valor |
|---|---|---|
| `Origin` | Sim | Deve estar na whitelist |
| `Content-Type` | Sim | `application/json` |
| `anthropic-version` | Não | Default: `2023-06-01` |

### Códigos de resposta

| Status | Situação |
|---|---|
| 200 | Sucesso — body é streaming SSE da Anthropic |
| 204 | Preflight CORS (OPTIONS) |
| 403 | Origin não está na whitelist |
| 404 | Rota ou método não reconhecido |
| 429 | Rate limit diário atingido (30 req/IP/dia) |

### Body do erro 429

```json
{
  "error": {
    "type": "rate_limit_error",
    "message": "Limite diário atingido. Tente novamente amanhã ou use sua própria chave da Anthropic (botão ⚙︎)."
  }
}
```

---

### 3.1 Rota de telemetria — `POST /v1/track`

Telemetria de uso agregada e privacy-first (sem PII, sem texto de conversa, sem identificador de sessão/usuário). Cada chamada incrementa um contador em `RATE_LIMIT_KV` — não guarda eventos individuais, só somas por dia. Só é chamada pelo frontend quando `isSharedMode()` é `true` (produção); em dev local não existe endpoint disponível e `track()` é um no-op.

**Função no frontend:** `track(event, meta)` em `js/lib/analytics.js`

**Request body:**
```json
{ "event": "msg_reached", "meta": "3" }
```

`meta` é opcional — ausente para eventos binários (`coach_clicked`, `report_generated`, `guardrail_triggered`).

**Eventos aceitos e validação do `meta`:**

| Evento | `meta` | Validação server-side |
|---|---|---|
| `session_start` | `"demo"` \| `"byok"` \| `"shared"` | enum fixo |
| `scene_selected` | id da cena (`js/data/scenes.js`) ou `"custom"` | `/^[a-z0-9_-]{1,24}$/` |
| `difficulty_selected` | `"facil"` \| `"normal"` \| `"pesadelo"` | enum fixo |
| `msg_reached` | nº da mensagem na sessão, como string | `/^([1-9]|[1-4][0-9])$/` (1–49) |
| `coach_clicked` | — | deve estar ausente |
| `report_generated` | — | deve estar ausente |
| `guardrail_triggered` | — | deve estar ausente |

Eventos ou metadados fora dessa lista retornam `400` — não é possível gravar chaves arbitrárias no KV.

**Armazenamento:** chave `an:{YYYY-MM-DD}:{event}` ou `an:{YYYY-MM-DD}:{event}:{meta}` → contador string, sem expiração (ao contrário das chaves `rl:*` de rate limiting, que expiram em 24h). `get`+`put` não é atômico — sob concorrência alta um punhado de eventos pode se perder; aceitável para métricas aproximadas de produto, não para billing.

**Códigos de resposta:**

| Status | Situação |
|---|---|
| 204 | Evento registrado |
| 400 | `event` ou `meta` fora da lista/validador aceito |
| 403 | Origin não está na whitelist |

---

## 4. Origens autorizadas (Worker whitelist)

```js
"https://gleica.github.io"   // produção
"http://localhost:9000"       // dev local
"http://127.0.0.1:9000"      // dev local alternativo
"http://localhost:8080"       // dev local alternativo
```

---

## 5. Formato SSE (Server-Sent Events)

A Anthropic retorna eventos `content_block_delta`:

```
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"{"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"\"fala\""}}

event: message_stop
data: {"type":"message_stop"}
```

`callClaudeStream` acumula `delta.text` e chama `onChunk(delta, accumulated)` por chunk. O controller decide como usar o texto acumulado (atualizar bolha, extrair campo parcial, aguardar fim para parsear JSON completo).
