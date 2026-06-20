# RFC 002 — Proxy via Cloudflare Worker para Modo Compartilhado

**Status:** Aceita  
**Data:** Junho 2026  
**Autores:** gleica

---

## Contexto

O EnsaIA precisa chamar a API Anthropic. Há duas arquiteturas possíveis:

1. **BYOK puro** — usuário fornece sua chave. Simples, mas exige fricção no onboarding.
2. **Proxy server-side** — produto mantém a chave; usuário acessa sem configuração.

Para o hackathon, a experiência zero-fricção é importante. Ao mesmo tempo, expor a chave Anthropic no código-fonte ou no bundle JS do browser é inaceitável.

## Alternativas avaliadas

| Opção | Prós | Contras |
|---|---|---|
| Netlify Functions | Ecossistema conhecido | Exigiria trocar de GitHub Pages |
| Vercel Edge Functions | Boa latência | Idem; troca de plataforma |
| AWS Lambda | Flexível | Complexo para hackathon |
| Cloudflare Worker | Grátis, zero cold-start, KV nativo, deploy em segundos | Workers são JavaScript; sem suporte a npm opcional |

## Decisão

**Cloudflare Worker** como proxy de uma única rota (`POST /v1/messages`).

## Motivação

### Custo zero
O plano gratuito do Cloudflare Workers suporta 100 000 requisições/dia, muito acima do consumo esperado.

### KV para rate limiting
Cloudflare KV é a solução nativa para persistência key-value no Worker, sem necessidade de banco de dados externo. Chave de rate limit: `rl:{ip}:{YYYY-MM-DD}`, TTL de 86 400 s.

### Latência
Workers rodam na edge da Cloudflare, próximos do usuário. Cold-start é < 5 ms (V8 isolates, sem container).

### Segurança
`ANTHROPIC_KEY` fica como `wrangler secret` — nunca entra no repositório, nunca é enviada ao browser. O Worker a injeta no header `x-api-key` server-side.

## Fluxo de requisição (modo compartilhado)

```
Browser  →  POST PROXY_URL/v1/messages  (sem x-api-key)
   ↓
Cloudflare Worker
  1. Valida Origin contra whitelist
  2. Lê CF-Connecting-IP e verifica KV (rate limit 30/dia)
  3. Encaminha para api.anthropic.com com x-api-key = env.ANTHROPIC_KEY
  4. Faz streaming da resposta SSE de volta ao browser com CORS headers
   ↓
Browser recebe SSE e atualiza UI em tempo real
```

## Injeção da URL no frontend

`PROXY_URL` é um placeholder (`__PROXY_URL__`) no código-fonte. O GitHub Actions executa:

```bash
sed -i "s|__PROXY_URL__|${{ secrets.PROXY_URL }}|g" js/config.js
```

antes do deploy. Assim a URL do Worker é injetada no artefato publicado sem aparecer no repositório.

## Trade-offs aceitos

| Limitação | Impacto |
|---|---|
| Rate limit por IP (não por conta) | Usuários atrás de NAT compartilhado podem ser afetados; aceitável no escopo do hackathon |
| Worker só aceita POST /v1/messages | Qualquer outro endpoint retorna 404; intencional — superfície mínima |
| Sem autenticação do chamador | Qualquer origem na whitelist pode chamar; CORS + whitelist mitiga abuso básico |

## Rotação de chave

```bash
cd worker
wrangler secret put ANTHROPIC_KEY   # digita nova chave; zero downtime
wrangler deploy                      # opcional se o código do Worker não mudou
```

## Configuração do KV

Namespace declarado em `worker/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id      = "9ae05cba8f26459b9563f3389646d0b0"
```
