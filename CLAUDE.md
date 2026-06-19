# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Ensaio** is a single-file static web app that lets users rehearse difficult conversations with an AI that role-plays the other person. Built for the TRAE + AI Brasil challenge (June 2026). Deployed on GitHub Pages.

## Running locally

```bash
python3 -m http.server 9000
# open http://localhost:9000
```

No build step, no dependencies, no package manager. Opening `index.html` directly in a browser also works, though a local server avoids potential CORS issues.

## File structure

```
index.html      ← HTML structure + CSS (no inline JS)
js/claude.js    ← API layer: callClaude, callClaudeStream, prompts, parsers
js/app.js       ← state, UI, setup form, simulator, demo mode
```

`index.html` loads `js/claude.js` then `js/app.js` as plain `<script src>` tags. No bundler, no framework, no backend.

## Architecture

**Key design decisions:**

- **BYOK (Bring Your Own Key):** The Anthropic API key is stored in `sessionStorage` and sent directly from the browser to `https://api.anthropic.com/v1/messages` with the `anthropic-dangerous-direct-browser-access` header. No server ever touches the key.
- **Single `state` object:** All runtime state (`who`, `rel`, `traits`, `goal`, `tone`, `mood`, `history`, `demo`, `demoStep`) lives in one plain object.
- **Two AI roles via separate system prompts:** `personaSystem()` instructs Claude to impersonate the other person and reply with a JSON `{fala, humor, pensamento}`. `coachSystem()` instructs Claude to act as a communication coach and reply with `{analise, sugestao}`.
- **Demo mode:** A fully pre-scripted conversation (`DEMO` constant) lets users try the full flow without an API key. The `state.demo` flag gates all API calls to the local script instead.

**App sections (hidden/shown via `.hide` class):**

- `#setup` — scene configuration form (who, relationship type, personality chips, goal, tone chips)
- `#sim` — live chat simulator with mood meter, thought reveal toggle, coach feedback panel
- `#keyModal` — API key and model name entry

**Core functions:**

| Function | Purpose |
|---|---|
| `callClaude(system, messages, maxTokens)` | Single fetch wrapper for the Anthropic API |
| `parseJSON(txt)` | Extracts JSON from Claude's response (handles markdown fences) |
| `personaSystem()` | Builds the system prompt for the persona role |
| `coachSystem()` | Builds the system prompt for the coach role |
| `send()` | Handles user message submission (delegates to `demoReply()` in demo mode) |
| `setMood(v)` | Updates the mood meter UI from a 0–100 value |
| `openSim()` | Transitions from setup to simulator view |

## API usage

- Model is configurable per user (default `claude-sonnet-4-6`, stored in `sessionStorage`)
- Persona responses: `max_tokens: 600`, must return valid JSON
- Coach responses: `max_tokens: 500`, must return valid JSON
- Suggestion responses: `max_tokens: 250`, returns plain text
- Conversation history is sent as the full `messages` array (growing context window per session)
