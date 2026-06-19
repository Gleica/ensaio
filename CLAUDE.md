# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**EnsaIA** is a static web app (vanilla JS, zero dependencies, zero build) that lets users rehearse difficult conversations with an AI that role-plays the other person. Built for the TRAE + AI Brasil challenge (June 2026). Deployed on GitHub Pages via GitHub Actions.

## Running locally

```bash
python3 -m http.server 9000
# open http://localhost:9000
```

Opening `index.html` directly in a browser also works, though a local server avoids potential CORS issues with the Anthropic API.

## File structure

```
index.html                        ← HTML structure only (no CSS, no inline JS)
styles/main.css                   ← All CSS (extracted from index.html)
js/
  main.js                         ← Entry point: init(), all event listeners
  config.js                       ← All constants (API_URL, LIMITS, MAX_TOKENS, etc.)
  session.js                      ← SHARED_KEY placeholder, isSharedMode(), getKey(), getModel()
  prompts.js                      ← System prompts: personaSystem, coachSystem, reportSystem, suggestSystem
  state.js                        ← createState(), resetSession(state)
  rateLimit.js                    ← getUsage(), saveUsage(), guardSessionStart(), consumeSession(), canSendMessage()
  api/
    anthropic.js                  ← HTTP transport: callClaude(), callClaudeStream()
  lib/
    parse.js                      ← parseJSON(), extractPartialFala()
    transcript.js                 ← buildTranscript(history)
    mood.js                       ← moodScale(value) → {emoji, label, color}
    escape.js                     ← escapeHtml(s)
  data/
    scenes.js                     ← SCENES array (6 pre-built scenarios)
    demo.js                       ← DEMO object (scripted conversation)
  ui/
    chat.js                       ← addBubble(), addThought(), scrollChat()
    moodMeter.js                  ← setMood(state, value)
    moodChart.js                  ← buildMoodChartSvg(history), renderMoodChart(history)
    coach.js                      ← renderCoach(coachData)
    report.js                     ← renderReport(report)
    setupForm.js                  ← readSetup(state), loadScene(scene), renderSceneGallery(onSceneClick)
    screens.js                    ← showSim(state), showSetup()
    msgCounter.js                 ← updateMsgCounter(state)
  controllers/
    rehearsal.js                  ← startRehearsal(state), suggestOpening(state), sendMessage(state, text)
    feedback.js                   ← requestCoach(state), generateReport(state)
    demo.js                       ← runDemo(state), demoReply(state), demoCoach()
.github/workflows/deploy.yml      ← GitHub Actions: injects ANTHROPIC_KEY secret into js/session.js and deploys to Pages
```

`index.html` loads only `<script type="module" src="js/main.js">`. The browser resolves all ES module imports. No bundler, no framework, no backend.

## Architecture

### Key design decisions

- **BYOK + shared mode:** `SHARED_KEY` constant in `js/session.js` (set to `"__SHARED_KEY__"` in source; GitHub Actions injects the real key at deploy time via `sed`). `isSharedMode()` returns `true` only when `SHARED_KEY` is set AND does NOT start with `"__"` — this prevents 401 errors locally. `getKey()` returns `SHARED_KEY` if in shared mode, otherwise falls back to `sessionStorage`. Users can always override with their own key via the ⚙︎ modal.
- **Single `state` object:** All runtime state lives in one plain object created by `createState()` in `state.js`. Passed by reference to all controllers and UI helpers; never reassigned (field-level mutation only).
- **Three AI roles via separate system prompts:** `personaSystem(state)` (impersonates the other person → `{fala, humor, pensamento}`), `coachSystem(state)` (communication coach → `{analise, sugestao}`), `reportSystem(state)` (end-of-session evaluator → structured report JSON), `suggestSystem(state)` (opening line suggestion → plain text).
- **Streaming persona responses:** `callClaudeStream()` in `api/anthropic.js` parses SSE chunks; `extractPartialFala()` in `lib/parse.js` progressively extracts the `"fala"` value from incomplete JSON so the bubble updates character by character.
- **Demo mode:** `DEMO` object in `data/demo.js` holds a fully scripted conversation. `state.demo = true` gates all API calls to `demoReply()` / `demoCoach()` in `controllers/demo.js`. Demo does not consume API tokens and does not count toward rate limits.
- **Rate limiting (shared mode only):** When `isSharedMode()` is true, `getUsage()` / `saveUsage()` in `rateLimit.js` track daily session count in `localStorage` (key: `ensaio_usage`, value: `{date, sessions}`). `guardSessionStart()` returns `{ok, message?, usage?}` — callers call `consumeSession(usage)` only after confirming `ok`. Limits defined in `LIMITS` constant in `config.js` (`msgsPerSession: 8`, `sessionsPerDay: 3`).

### State object

```js
let state = {
  who: "",          // name/description of the other person
  rel: "",          // relationship type (from <select>)
  traits: [],       // personality chips selected
  goal: "",         // what the user needs to say / achieve
  tone: "firme",    // desired communication tone
  difficulty: "normal",  // "facil" | "normal" | "pesadelo"
  mood: 50,         // current persona mood 0–100
  moodHistory: [],  // mood value after each persona turn (for SVG chart)
  history: [],      // full messages array sent to the API [{role, content}]
  msgCount: 0,      // user messages sent this session (for rate limiting)
  demo: false,      // demo mode flag
  demoStep: 0       // index into DEMO.turns
};
```

### App sections (hidden/shown via `.hide` class)

- `#setup` — scene configuration form (scenes gallery, who, rel, traits, goal, tone, difficulty chips)
- `#sim` — live chat simulator (mood meter, thought toggle, chat, composer, tools bar, mood chart, coach box)
- `#keyModal` — API key and model name entry
- `#reportModal` — end-of-session report display

### Core functions by layer

| File | Function | Purpose |
|---|---|---|
| `session.js` | `isSharedMode()` | True only when SHARED_KEY is injected (not `__` placeholder) |
| `session.js` | `getKey()` | Returns SHARED_KEY or sessionStorage key |
| `api/anthropic.js` | `callClaude(key, model, system, messages, maxTokens)` | Non-streaming fetch to Anthropic API |
| `api/anthropic.js` | `callClaudeStream(key, model, system, messages, maxTokens, onChunk)` | Streaming SSE fetch; calls `onChunk(delta, accumulated)` per chunk |
| `lib/parse.js` | `parseJSON(txt)` | Extracts first JSON object from text (handles markdown fences) |
| `lib/parse.js` | `extractPartialFala(accumulated)` | Extracts partial `"fala"` value from incomplete JSON during streaming |
| `rateLimit.js` | `guardSessionStart()` | Returns `{ok, message?, usage?}` — never calls alert() itself |
| `controllers/rehearsal.js` | `sendMessage(state, text)` | Receives text as parameter because main.js adds the bubble and clears input before dispatching |
| `ui/moodChart.js` | `buildMoodChartSvg(history)` | Pure function → SVG string (testable without DOM) |

## API usage

- **Persona:** `callClaudeStream`, `max_tokens: 600`, must return `{fala, humor, pensamento}`
- **Coach:** `callClaude`, `max_tokens: 500`, must return `{analise, sugestao}`
- **Report:** `callClaude`, `max_tokens: 750`, must return `{nota, titulo, pontos_fortes[], erros_recorrentes[], melhor_fala, proximo_passo, arco}`
- **Suggestion:** `callClaude`, `max_tokens: 250`, returns plain text
- Full `state.history` is sent on every persona call (growing context per session)

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which:
1. Checks out the repo
2. Runs `sed -i "s|__SHARED_KEY__|${ANTHROPIC_KEY}|g" js/session.js` using the `ANTHROPIC_KEY` GitHub Secret
3. Uploads the result as a Pages artifact and deploys

The real key never appears in git history. To rotate the key: update the GitHub Secret and re-run the workflow.

GitHub Pages source must be set to **GitHub Actions** (not "Deploy from branch") in repo Settings → Pages.
