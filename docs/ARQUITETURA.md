# Arquitetura do Sistema — EnsaIA

**Versão:** 1.0  
**Data:** Junho 2026

---

## Visão geral

EnsaIA é uma **Single Page Application estática** sem framework, sem bundler e sem backend próprio. Toda a lógica reside no browser (JavaScript modular via ES Modules). O único componente server-side é um **Cloudflare Worker** que atua como proxy para a API Anthropic no modo compartilhado.

```
┌─────────────────────────────────────────────────────┐
│                   Browser (SPA)                      │
│                                                      │
│  index.html → js/main.js (entry point)              │
│                    │                                 │
│         ┌──────────┼───────────────┐                │
│         ▼          ▼               ▼                │
│    controllers/  ui/           lib/ + data/         │
│    rehearsal.js  chat.js       parse.js             │
│    feedback.js   moodMeter.js  mood.js              │
│    demo.js       moodChart.js  transcript.js        │
│                  coach.js      escape.js            │
│                  report.js     scenes.js            │
│                  setupForm.js  demo.js              │
│                  screens.js                         │
│                  msgCounter.js                      │
│                                                      │
│         ┌──────────────────────────┐               │
│         │     api/anthropic.js     │               │
│         │   callClaude()           │               │
│         │   callClaudeStream()     │               │
│         └────────────┬─────────────┘               │
└─────────────────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │ Modo BYOK              │ Modo Compartilhado
          │ (key em sessionStorage) │ (key vazia)
          ▼                        ▼
   api.anthropic.com       Cloudflare Worker
                           (ensaio-proxy.gleica-tech.workers.dev)
                                   │
                                   ▼
                           api.anthropic.com
```

---

## Camadas da aplicação

### 1. Entry Point

**`js/main.js`** — inicializa o estado, registra todos os event listeners e chama `showSetup()`.

### 2. Controllers (orquestração de fluxo)

| Arquivo | Responsabilidade |
|---|---|
| `controllers/rehearsal.js` | `startRehearsal()`, `suggestOpening()`, `sendMessage()` |
| `controllers/feedback.js` | `requestCoach()`, `generateReport()` |
| `controllers/demo.js` | `runDemo()`, `demoReply()`, `demoCoach()` |

Os controllers consomem `api/anthropic.js` e acionam as funções de UI.

### 3. API Layer

**`js/api/anthropic.js`** — única camada que faz fetch. Decide o endpoint baseado em `isSharedMode()`:

- `key` vazio → `PROXY_URL` (modo compartilhado)
- `key` presente → `API_URL` (modo BYOK)

Funções públicas:

- `callClaude(key, model, system, messages, maxTokens)` — resposta completa
- `callClaudeStream(key, model, system, messages, maxTokens, onChunk)` — SSE incremental

### 4. Prompts

**`js/prompts.js`** — quatro funções que constroem system prompts a partir do `state`:

| Função | Resposta retornada | Max tokens |
|---|---|---|
| `personaSystem(state)` | `{fala, humor, pensamento}` | 600 |
| `coachSystem(state)` | `{analise, sugestao}` | 500 |
| `reportSystem(state)` | Objeto de relatório completo | 1200 |
| `suggestSystem(state)` | Texto plain (abertura sugerida) | 250 |

### 5. UI Layer

Funções imperativas puras que recebem dados e manipulam o DOM:

| Arquivo | Funções exportadas |
|---|---|
| `ui/chat.js` | `addBubble()`, `addThought()`, `scrollChat()` |
| `ui/moodMeter.js` | `setMood(state, value)` |
| `ui/moodChart.js` | `buildMoodChartSvg(history)`, `renderMoodChart(history)` |
| `ui/coach.js` | `renderCoach(coachData)` |
| `ui/report.js` | `renderReport(report)` |
| `ui/setupForm.js` | `readSetup(state)`, `loadScene(scene)`, `renderSceneGallery(cb)` |
| `ui/screens.js` | `showSim(state)`, `showSetup()` |
| `ui/msgCounter.js` | `updateMsgCounter(state)` |

### 6. State

**`js/state.js`** — objeto único passado por referência a todas as funções:

```js
{
  who: "",          // nome/descrição da outra pessoa
  rel: "",          // tipo de relação (select)
  traits: [],       // chips de personalidade selecionados
  goal: "",         // objetivo da conversa
  tone: "firme",    // tom desejado
  difficulty: "normal",  // "facil" | "normal" | "pesadelo"
  mood: 50,         // humor atual da persona (0-100)
  moodHistory: [],  // humor após cada turno da persona
  history: [],      // messages[] enviado à API [{role, content}]
  msgCount: 0,      // mensagens enviadas nesta sessão
  demo: false,      // flag de modo demo
  demoStep: 0,      // posição em DEMO.turns
}
```

### 7. Lib

Utilitários sem efeito colateral:

| Arquivo | Função |
|---|---|
| `lib/parse.js` | `parseJSON(txt)`, `extractPartialFala(accumulated)` |
| `lib/transcript.js` | `buildTranscript(history)` |
| `lib/mood.js` | `moodScale(value)` retorna `{emoji, label, color}` |
| `lib/escape.js` | `escapeHtml(s)` |

### 8. Data

| Arquivo | Conteúdo |
|---|---|
| `data/scenes.js` | Array `SCENES` com 6 cenas pré-configuradas |
| `data/demo.js` | Objeto `DEMO` com conversa roteirizada de 4 turnos |

---

## Fluxo de uma sessão completa

```
1. Usuário abre a app
   → showSetup() renderiza galeria de cenas + formulário

2. Usuário seleciona cena ou preenche manualmente
   → loadScene(scene) popula os campos

3. Usuário clica "Começar o ensaio"
   → guardSessionStart() verifica localStorage
   → consumeSession() incrementa contador
   → startRehearsal(state) lê configuração via readSetup(state)
   → suggestOpening(state) chama suggestSystem → callClaude → exibe sugestão
   → showSim(state) alterna para a tela de chat

4. Usuário envia mensagem
   → sendMessage(state, text)
   → addBubble("user", text)
   → callClaudeStream(..., onChunk) → streaming SSE
   → extractPartialFala(accumulated) atualiza bolha em tempo real
   → Ao concluir: parseJSON → state.mood, state.moodHistory, pensamento
   → setMood(state, valor)
   → renderMoodChart(state.moodHistory)
   → updateMsgCounter(state)

5. Usuário clica "Como fui?"
   → requestCoach(state) → callClaude(coachSystem) → renderCoach(data)

6. Usuário clica "Relatório final"
   → generateReport(state)
   → callClaudeStream(reportSystem) com animação de etapas
   → parseJSON ao final do stream → renderReport(report) no modal

7. Usuário clica "Nova cena"
   → resetSession(state) → showSetup()
```

---

## Deploy

```
GitHub (main) → GitHub Actions
  1. checkout
  2. sed injeta PROXY_URL em js/config.js
  3. upload-pages-artifact (raiz do repo)
  4. deploy-pages
       ↓
  GitHub Pages (gleica.github.io/ensaio/)
```

O Cloudflare Worker é deployado independentemente via `wrangler deploy` a partir de `worker/`.

---

## Seções HTML (visibilidade via .hide)

| ID | Conteúdo |
|---|---|
| `#setup` | Formulário de configuração + galeria de cenas |
| `#sim` | Chat, mood meter, gráfico, coach box |
| `#keyModal` | Modal para chave de API (oculto em shared mode) |
| `#reportModal` | Modal do relatório final |
