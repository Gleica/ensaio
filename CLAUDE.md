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

**Local vs. production modes:** Locally, `PROXY_URL` remains the `"__PROXY_URL__"` placeholder, so `isSharedMode()` returns `false`. The gear button (⚙︎) is visible and an API key is required to start any session (demo mode is always available without a key). The proxy mode only activates after a GitHub Actions deploy that injects the real `PROXY_URL`.

## Testing

Playwright is the only test tool (E2E + functional integration, no separate unit test runner). `npm test` is a stub and does nothing useful — run Playwright directly.

```bash
npm install && npx playwright install chromium   # once
python3 -m http.server 9000 &                    # required: baseURL is http://localhost:9000
npx playwright test tests/ensaio.spec.js          # main suite: demo mode + real AI, mocked-free
npx playwright test tests/production-suite.spec.js  # hits the live deployed site + real Anthropic API
npx playwright test tests/proxy-live.spec.js      # hits the live Cloudflare Worker directly
npx playwright test tests/ensaio.spec.js -g "some test name"  # run a single test
```

`tests/ensaio.spec.js` is the one to run for local iteration; the other two suites hit live production infra (GitHub Pages + the Cloudflare Worker) and are meant for post-deploy verification, not local dev. See `docs/TESTES.md` for full scenario coverage and conventions.

## Documentation

`docs/` has deeper reference material worth checking before making non-trivial changes: `PRD.md` (product), `ARQUITETURA.md` (layered architecture diagram/session flow), `API-REFERENCE.md` (Anthropic + Worker contracts, SSE format, JSON schemas), `PROMPTS.md` (prompt engineering rationale for the four AI roles), `SEGURANCA.md` (threat model), `DEPLOY.md` (deploy/rollback/monitoring), `TESTES.md` (test strategy), and `RFC-00{1..4}-*.md` (architecture decisions: zero-build, Cloudflare proxy, content guardrails, dual rate limiting).

## File structure

```
index.html                        ← HTML structure only (no CSS, no inline JS)
styles/main.css                   ← All CSS (extracted from index.html)
js/
  main.js                         ← Entry point: init(), all event listeners
  config.js                       ← All constants (API_URL, PROXY_URL, LIMITS, MAX_TOKENS, etc.)
  session.js                      ← isSharedMode(), getKey(), getModel()
  prompts.js                      ← System prompts: personaSystem, coachSystem, reportSystem, suggestSystem
  state.js                        ← createState(), resetSession(state)
  rateLimit.js                    ← getUsage(), saveUsage(), guardSessionStart(), consumeSession(), canSendMessage()
  api/
    anthropic.js                  ← HTTP transport: callClaude(), callClaudeStream(); proxy routing logic
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
worker/
  index.js                        ← Cloudflare Worker: CORS, rate limiting, Anthropic proxy
  wrangler.toml                   ← Worker config: KV namespace binding (RATE_LIMIT_KV)
.github/workflows/deploy.yml      ← GitHub Actions: injects PROXY_URL secret into js/config.js and deploys to Pages
```

`index.html` loads only `<script type="module" src="js/main.js">`. The browser resolves all ES module imports. No bundler, no framework, no backend.

## Architecture

### Key design decisions

- **BYOK + shared mode via proxy:** `PROXY_URL` constant in `js/config.js` is set to `"__PROXY_URL__"` in source; GitHub Actions injects the real Cloudflare Worker endpoint at deploy time via `sed`. `isSharedMode()` returns `true` only when `PROXY_URL` is set and does NOT start with `"__"`. When shared mode is active, the gear button (⚙︎) is hidden and all API calls route through the Worker — the Anthropic key never reaches the browser. In BYOK mode (`isSharedMode()` false), the user provides their own key via the ⚙︎ modal, which is stored in `sessionStorage` and used directly with the `anthropic-dangerous-direct-browser-access` header.
- **Proxy routing in `api/anthropic.js`:** `endpoint(key)` returns `PROXY_URL` when `key` is empty (shared mode) or `API_URL` when a key is present (BYOK). `buildHeaders(key)` adds `x-api-key` and `anthropic-dangerous-direct-browser-access` only in BYOK mode — the proxy adds `x-api-key` server-side.
- **Single `state` object:** All runtime state lives in one plain object created by `createState()` in `state.js`. Passed by reference to all controllers and UI helpers; never reassigned (field-level mutation only).
- **Four AI roles via separate system prompts:** `personaSystem(state)` (impersonates the other person → `{fala, humor, pensamento}`), `coachSystem(state)` (communication coach → `{analise, sugestao}`), `reportSystem(state)` (end-of-session evaluator → structured report JSON), `suggestSystem(state)` (opening line suggestion → plain text).
- **Streaming responses:** `callClaudeStream()` in `api/anthropic.js` parses Server-Sent Events, extracting `delta.text` from each chunk and accumulating the full response. For persona calls, `extractPartialFala()` in `lib/parse.js` progressively extracts the `"fala"` field from incomplete JSON so the chat bubble updates character by character. For report generation, streaming is also used (`generateReport` in `feedback.js`) — the full JSON is only parsed after the stream ends, while animated step indicators give the user progress feedback.
- **Demo mode:** `DEMO` object in `data/demo.js` holds a fully scripted 4-turn conversation (pedir aumento scenario). When `state.demo = true`, all API calls are gated to `demoReply()` / `demoCoach()` in `controllers/demo.js`. Uses `state.demoStep` to track position in `DEMO.turns` and adds a simulated typing delay (`DEMO_TYPING_MS`). Demo is always available without a key via "▶ Ver demonstração" and does not count toward rate limits.
- **Content safety guardrails:** A constant `SAFETY_GUARD` in `js/prompts.js` is prepended to `personaSystem` and `suggestSystem` before any roleplay instruction. It instructs the model to refuse and return a fixed refusal JSON (`{fala, humor: 50, pensamento: ""}`) if the scenario involves hate speech, discrimination, violence, illegal activity, disinformation, privacy violations, or malicious use of technology. `coachSystem` and `reportSystem` are not guarded because they only receive transcripts of conversations already filtered by the persona prompt.
- **Rate limiting (shared mode only):** Two layers. Client-side: `guardSessionStart()` in `rateLimit.js` tracks daily session count in `localStorage` (key: `ensaio_usage`, value: `{date, sessions}`) and blocks before hitting the API. Server-side: the Cloudflare Worker enforces a hard limit of 30 requests/IP/day via KV. Client limits: `msgsPerSession: 8`, `sessionsPerDay: 3` (defined in `LIMITS` in `config.js`).

### Cloudflare Worker proxy

`worker/index.js` is the server-side proxy that keeps the Anthropic API key out of the browser in shared mode.

**Responsibilities:**
- **CORS validation:** Whitelists `gleica.github.io`, `localhost:9000`, `127.0.0.1:9000`, and `localhost:8080`. Returns `403` for unknown origins.
- **Rate limiting:** Per-IP daily limit (30 requests/day) stored in Cloudflare KV (`RATE_LIMIT_KV` binding). Key format: `rl:{ip}:{YYYY-MM-DD}`, TTL 86400s. Returns `429` when limit is hit.
- **Request proxying:** Forwards `POST /v1/messages` to `https://api.anthropic.com/v1/messages`, adding `x-api-key: env.ANTHROPIC_KEY` server-side.
- **Response streaming:** Passes Anthropic's SSE response back to the browser with CORS headers intact.

**Deployment:**
- Config: `worker/wrangler.toml` (KV namespace ID `9ae05cba8f26459b9563f3389646d0b0`)
- Deploy: `cd worker && wrangler deploy`
- Secrets: `wrangler secret put ANTHROPIC_KEY` (set once, never in source)
- Live URL: `https://ensaio-proxy.gleica-tech.workers.dev`

**Security decisions:**
- API key lives only in the Worker runtime — never injected into frontend JS, never in git history
- CORS `Origin` check prevents requests from unauthorized domains
- `PROXY_URL` (the Worker URL) is injected into `js/config.js` at deploy time via GitHub Actions secret; it is not sensitive but also not hardcoded

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
- `#keyModal` — API key and model name entry (hidden in shared/proxy mode)
- `#reportModal` — end-of-session report display

### Core functions by layer

| File | Function | Purpose |
|---|---|---|
| `session.js` | `isSharedMode()` | True when PROXY_URL is injected (not `__` placeholder) — hides gear button, routes calls through Worker |
| `session.js` | `getKey()` | Returns sessionStorage key or `""` in shared mode |
| `api/anthropic.js` | `callClaude(key, model, system, messages, maxTokens)` | Non-streaming fetch; routes to proxy when key is empty |
| `api/anthropic.js` | `callClaudeStream(key, model, system, messages, maxTokens, onChunk)` | Streaming SSE fetch; routes to proxy when key is empty; calls `onChunk(delta, accumulated)` per chunk |
| `lib/parse.js` | `parseJSON(txt)` | Extracts first JSON object from text (handles markdown fences) |
| `lib/parse.js` | `extractPartialFala(accumulated)` | Extracts partial `"fala"` value from incomplete JSON during streaming |
| `rateLimit.js` | `guardSessionStart()` | Returns `{ok, message?, usage?}` — never calls alert() itself |
| `controllers/rehearsal.js` | `sendMessage(state, text)` | Receives text as parameter because main.js adds the bubble and clears input before dispatching |
| `ui/moodChart.js` | `buildMoodChartSvg(history)` | Pure function → SVG string (testable without DOM) |

## API usage

- **Persona:** `callClaudeStream`, `max_tokens: 600`, must return `{fala, humor, pensamento}`
- **Coach:** `callClaude`, `max_tokens: 500`, must return `{analise, sugestao}`
- **Report:** `callClaudeStream`, `max_tokens: 750`, must return `{nota, titulo, pontos_fortes[], erros_recorrentes[], melhor_fala, proximo_passo, arco}` — JSON parsed after stream ends
- **Suggestion:** `callClaude`, `max_tokens: 250`, returns plain text
- Full `state.history` is sent on every persona call (growing context per session)
- Anthropic API version pinned to `2023-06-01` in `api/anthropic.js`; default model: `claude-sonnet-4-6`

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which:
1. Checks out the repo
2. Runs `sed -i "s|__PROXY_URL__|${{ secrets.PROXY_URL }}|g" js/config.js` to inject the Cloudflare Worker URL
3. Uploads the result as a Pages artifact and deploys to GitHub Pages

The `PROXY_URL` GitHub Secret holds the Worker endpoint (`https://ensaio-proxy.gleica-tech.workers.dev/v1/messages`). The Anthropic API key is stored exclusively in the Worker as a secret (`wrangler secret put ANTHROPIC_KEY`) and never touches the frontend build.

To rotate the Anthropic key: run `wrangler secret put ANTHROPIC_KEY` from `worker/` and redeploy the Worker. To update the Worker URL: change the `PROXY_URL` GitHub Secret and push any commit to `main`.

GitHub Pages source must be set to **GitHub Actions** (not "Deploy from branch") in repo Settings → Pages.
