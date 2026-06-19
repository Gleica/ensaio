# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Ensaio** is a static web app (vanilla JS, zero dependencies, zero build) that lets users rehearse difficult conversations with an AI that role-plays the other person. Built for the TRAE + AI Brasil challenge (June 2026). Deployed on GitHub Pages via GitHub Actions.

## Running locally

```bash
python3 -m http.server 9000
# open http://localhost:9000
```

Opening `index.html` directly in a browser also works, though a local server avoids potential CORS issues with the Anthropic API.

## File structure

```
index.html                        ← HTML structure + all CSS (no inline JS)
js/claude.js                      ← API layer: keys, fetch wrappers, prompts, parsers
js/app.js                         ← state, UI, setup form, simulator, rate limiting, demo mode
js/scenes.js                      ← SCENES array: 6 pre-built conversation scenarios
.github/workflows/deploy.yml      ← GitHub Actions: injects ANTHROPIC_KEY secret and deploys to Pages
```

`index.html` loads `js/scenes.js`, `js/claude.js`, then `js/app.js` as plain `<script src>` tags in that order. No bundler, no framework, no backend.

## Architecture

### Key design decisions

- **BYOK + shared mode:** `SHARED_KEY` constant in `claude.js` (set to `"__SHARED_KEY__"` in source; GitHub Actions injects the real key at deploy time via `sed`). `getKey()` returns `SHARED_KEY` if set, otherwise falls back to `sessionStorage`. Users can always override with their own key via the ⚙︎ modal.
- **Single `state` object:** All runtime state lives in one plain object in `app.js`. Never mutated across async boundaries without intent.
- **Three AI roles via separate system prompts:** `personaSystem(state)` (impersonates the other person → `{fala, humor, pensamento}`), `coachSystem(state)` (communication coach → `{analise, sugestao}`), `reportSystem(state)` (end-of-session evaluator → structured report JSON).
- **Streaming persona responses:** `callClaudeStream()` parses SSE chunks; `extractPartialFala()` progressively extracts the `"fala"` value from incomplete JSON so the bubble updates character by character.
- **Demo mode:** `DEMO` constant in `app.js` holds a fully scripted conversation. `state.demo = true` gates all API calls to `demoReply()` / `demoCoach()` instead. Demo does not consume API tokens and does not count toward rate limits.
- **Rate limiting (shared mode only):** When `isSharedMode()` is true, `getUsage()` / `saveUsage()` track daily session count in `localStorage` (key: `ensaio_usage`, value: `{date, sessions}`). Session message count lives in `state.msgCount`. Limits defined in `LIMITS` constant (`msgsPerSession: 8`, `sessionsPerDay: 3`).

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

### Core functions

| File | Function | Purpose |
|---|---|---|
| `claude.js` | `getKey()` | Returns `SHARED_KEY` or `sessionStorage` key |
| `claude.js` | `callClaude(system, messages, maxTokens)` | Non-streaming fetch to Anthropic API |
| `claude.js` | `callClaudeStream(system, messages, maxTokens, onChunk)` | Streaming fetch; calls `onChunk(delta, accumulated)` per SSE chunk |
| `claude.js` | `parseJSON(txt)` | Extracts first JSON object from text (handles markdown fences) |
| `claude.js` | `extractPartialFala(accumulated)` | Extracts partial `"fala"` value from incomplete JSON during streaming |
| `claude.js` | `personaSystem(state)` | Builds persona system prompt; injects difficulty modifier |
| `claude.js` | `coachSystem(state)` | Builds coach system prompt |
| `claude.js` | `reportSystem(state)` | Builds end-of-session report system prompt |
| `app.js` | `isSharedMode()` | Returns true when `SHARED_KEY` is set |
| `app.js` | `getUsage()` / `saveUsage(d)` | Read/write daily session counter in localStorage |
| `app.js` | `updateMsgCounter()` | Updates `#msgCounter` tag; disables input at limit |
| `app.js` | `openSim()` | Transitions setup → simulator; checks daily session limit in shared mode |
| `app.js` | `send()` | Handles user message; streams persona response; updates mood + chart |
| `app.js` | `renderMoodChart()` | Renders pure SVG mood arc (400×90 viewBox, responsive width) |
| `app.js` | `renderCoach(j)` | Renders coach feedback box with "Usar" button |
| `app.js` | `renderReport(j)` | Renders report modal (score circle, sections, best quote) |
| `app.js` | `renderSceneGallery()` | Populates `#scenesGallery` from `SCENES` array |
| `app.js` | `loadScene(scene)` | Fills setup form from a scene object and marks it active |
| `app.js` | `setMood(v)` | Updates mood meter width + emoji + label from 0–100 value |
| `app.js` | `escapeHtml(s)` | Sanitizes strings before injecting into innerHTML |

## API usage

- **Persona:** `callClaudeStream`, `max_tokens: 600`, must return `{fala, humor, pensamento}`
- **Coach:** `callClaude`, `max_tokens: 500`, must return `{analise, sugestao}`
- **Report:** `callClaude`, `max_tokens: 750`, must return `{nota, titulo, pontos_fortes[], erros_recorrentes[], melhor_fala, proximo_passo, arco}`
- **Suggestion:** `callClaude`, `max_tokens: 250`, returns plain text
- Full `state.history` is sent on every persona call (growing context per session)

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`, which:
1. Checks out the repo
2. Runs `sed -i "s|__SHARED_KEY__|${ANTHROPIC_KEY}|g" js/claude.js` using the `ANTHROPIC_KEY` GitHub Secret
3. Uploads the result as a Pages artifact and deploys

The real key never appears in git history. To rotate the key: update the GitHub Secret and re-run the workflow.

GitHub Pages source must be set to **GitHub Actions** (not "Deploy from branch") in repo Settings → Pages.
