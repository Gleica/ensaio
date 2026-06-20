# Segurança — EnsaIA

**Versão:** 1.0  
**Data:** Junho 2026

---

## Modelo de ameaças

| Ameaça | Vetor | Mitigação |
|---|---|---|
| Exposição da chave Anthropic | Código-fonte, bundle JS, git history | Chave exclusivamente no Cloudflare Worker como secret; nunca no repositório ou no browser |
| Abuso de quota (DoS econômico) | Chamadas em loop ao proxy | Rate limiting duplo: 3 sessões/dia client + 30 req/IP/dia no Worker via KV |
| Uso para conteúdo nocivo | Roleplay de cenários banidos | Guardrail embutido no system prompt da persona e do suggest |
| CORS bypass | Requisições de origens não autorizadas | Worker verifica `Origin` contra whitelist; retorna 403 para origens desconhecidas |
| XSS via conteúdo da persona | Injeção de HTML nas respostas da IA | `escapeHtml()` em `lib/escape.js` sanitiza toda saída antes de inserção no DOM |
| Credenciais no git history | Commit acidental de secrets | `PROXY_URL` injetado em runtime via Actions secret; `ANTHROPIC_KEY` nunca aparece em arquivo fonte |

---

## Chave Anthropic

### Fluxo de armazenamento

```
Anthropic Dashboard
       ↓
wrangler secret put ANTHROPIC_KEY
       ↓
Cloudflare encrypted secret store
       ↓
env.ANTHROPIC_KEY (runtime do Worker apenas)
       ↓
x-api-key: ... (header adicionado server-side)
```

A chave **nunca** aparece em nenhum arquivo do repositório, nunca é enviada ao browser e nunca aparece em logs de requisição.

### Rotação de chave

```bash
cd worker
wrangler secret put ANTHROPIC_KEY
# digita a nova chave quando solicitado
# zero downtime — Workers recarregam o secret automaticamente
```

---

## Modo BYOK

No modo BYOK, a chave é fornecida pelo próprio usuário:

- Armazenada em `sessionStorage` (chave: `ensaio_key`)
- Apagada automaticamente ao fechar a aba
- Vai direto do browser para `api.anthropic.com` com o header `anthropic-dangerous-direct-browser-access: true`
- Nunca passa pelo Worker ou por qualquer servidor intermediário

**Risco aceito:** a chave fica na memória do browser durante a sessão. O usuário é responsável pela segurança de sua própria chave.

---

## XSS Prevention

Toda saída dinâmica renderizada no DOM passa por `escapeHtml()` antes da inserção:

```js
// js/lib/escape.js
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

Aplica-se a: falas da persona, pensamentos ocultos, análises do coach, campos do relatório.

---

## Guardrails de conteúdo

Ver [RFC-003-guardrails-conteudo.md](RFC-003-guardrails-conteudo.md) para a especificação completa.

**Resumo:** `SAFETY_GUARD` no início dos prompts `personaSystem` e `suggestSystem` instrui o modelo a recusar qualquer cenário com discurso de ódio, discriminação, violência, atividades ilegais, desinformação, violação de privacidade ou uso malicioso de tecnologia.

---

## CORS

```js
const ALLOWED_ORIGINS = [
  "https://gleica.github.io",
  "http://localhost:9000",
  "http://127.0.0.1:9000",
  "http://localhost:8080",
];
```

Origens fora da lista recebem HTTP 403 antes de qualquer acesso ao KV ou à API Anthropic.

---

## Privacidade

| Dado | Onde fica | Quando some |
|---|---|---|
| Texto das conversas | Memória do browser (`state.history`) | Ao fechar a aba ou iniciar nova cena |
| Chave de API (BYOK) | `sessionStorage` do browser | Ao fechar a aba |
| Contador de sessões | `localStorage` do browser | Após 24h (reset por data) |
| IP do usuário | Cloudflare KV (rate limit) | Após 86.400 s (TTL do KV) |

Nenhuma conversa é armazenada em servidor. O Worker persiste apenas o contador de rate limit por IP.

---

## Dependências de segurança

| Componente | Risco |
|---|---|
| Cloudflare Workers runtime | Gerenciado pela Cloudflare; atualizações automáticas de segurança |
| Anthropic API v`2023-06-01` | API pinada; sem breaking changes inesperados |
| Browser ES Modules | Sem dependência de npm no runtime do browser |
