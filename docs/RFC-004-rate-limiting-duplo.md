# RFC 004 — Rate Limiting em Duas Camadas

**Status:** Aceita  
**Data:** Junho 2026  
**Autores:** gleica

---

## Contexto

O modo compartilhado usa uma única chave Anthropic para todos os usuários. Sem controle de uso, um único usuário poderia esgotar a cota ou gerar custo excessivo.

## Decisão

Implementar rate limiting em **duas camadas independentes**, cada uma com função distinta.

---

## Camada 1 — Client-side (localStorage)

**Arquivo:** `js/rateLimit.js`  
**Objetivo:** UX — bloquear o usuário antes de gastar uma requisição de API.

### Limites (js/config.js)

```js
export const LIMITS = {
  msgsPerSession: 8,   // máximo de mensagens por sessão
  sessionsPerDay: 3,   // máximo de sessões diárias
  warnBeforeEnd:  2,   // avisar quando restar N mensagens
};
```

### Mecanismo

- Chave localStorage: `"ensaio_usage"`
- Valor: `{ date: "YYYY-MM-DD", sessions: N }`
- Na abertura de cada sessão, `guardSessionStart()` verifica `sessions >= 3`.
- A cada mensagem, `canSendMessage(state)` verifica `msgCount < 8`.
- Ao concluir, `consumeSession()` incrementa e persiste.
- O contador reseta quando a data muda.

**Por que client-side?** Reduz chamadas desnecessárias ao Worker e proporciona mensagem de erro imediata.

---

## Camada 2 — Server-side (Cloudflare KV)

**Arquivo:** `worker/index.js`  
**Objetivo:** Segurança — impedir bypass do client-side.

### Limite

```js
const DAILY_REQUEST_LIMIT = 30; // ~3 sessões completas com todos os recursos
```

### Mecanismo

- Chave KV: `rl:{CF-Connecting-IP}:{YYYY-MM-DD}` com TTL de 86 400 s.
- Se `count >= 30` → HTTP 429 com JSON de erro localizado.

### Cálculo do limite

- Sessão completa: ~8 msgs × persona + até 8 coaches + 1 relatório ≈ 17 chamadas.
- 30 req/dia comporta ~3 sessões completas com folga.
- Compatível com o limite client-side (3 sessões × ≤ 10 req = 30 req).

---

## Diagrama de fluxo

```
Usuário clica "Começar o ensaio"
        │
        ▼
guardSessionStart()  ←─ localStorage
   sessions >= 3?  →  exibe mensagem de limite; fim
        │ não
        ▼
consumeSession()     ←─ incrementa localStorage
        │
        ▼
Usuário envia mensagem
        │
        ▼
canSendMessage()     ←─ state.msgCount
   msgCount >= 8?  →  input desabilitado; fim
        │ não
        ▼
callClaudeStream()
        │
        ▼
POST /v1/messages → Worker
        │
        ▼
checkRateLimit()     ←─ Cloudflare KV
   count >= 30?    →  HTTP 429; frontend exibe erro
        │ não
        ▼
Encaminha para Anthropic API
```

---

## Trade-offs

| Aspecto | Implicação |
|---|---|
| Client-side bypassável | Usuário com DevTools pode limpar localStorage; a camada KV é a guardrail final. |
| Rate limit por IP | Usuários em NAT compartilhado compartilham o limite; aceitável no hackathon. |
| Sem autenticação | Não há como atribuir uso a uma identidade; só ao IP. |
| Reset à meia-noite UTC | Pode parecer inconsistente para usuários em outros fusos. |
