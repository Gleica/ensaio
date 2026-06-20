# Documentação — EnsaIA

Documentação técnica e de produto do simulador de conversas difíceis EnsaIA.

---

## Índice

| Documento | Tipo | Conteúdo |
|---|---|---|
| [PRD.md](PRD.md) | Produto | Visão, problema, usuários-alvo, funcionalidades, requisitos não-funcionais |
| [ARQUITETURA.md](ARQUITETURA.md) | Técnico | Diagrama de camadas, fluxo de sessão, módulos, estado da aplicação |
| [API-REFERENCE.md](API-REFERENCE.md) | Técnico | Contrato Anthropic API, Cloudflare Worker, formato SSE, schemas JSON |
| [PROMPTS.md](PROMPTS.md) | Técnico | Engenharia de prompts dos 4 papéis de IA, guardrail, decisões de design |
| [SEGURANCA.md](SEGURANCA.md) | Técnico | Modelo de ameaças, gestão de chaves, XSS, CORS, privacidade |
| [DEPLOY.md](DEPLOY.md) | Operacional | Deploy GitHub Pages, Cloudflare Worker, execução local, rollback, monitoramento |
| [TESTES.md](TESTES.md) | Qualidade | Estratégia Playwright, suites, cobertura funcional, convenções |
| [RFC-001-arquitetura-zero-build.md](RFC-001-arquitetura-zero-build.md) | RFC | Decisão por Vanilla JS + ES Modules sem bundler |
| [RFC-002-proxy-cloudflare-worker.md](RFC-002-proxy-cloudflare-worker.md) | RFC | Decisão pelo Cloudflare Worker como proxy para modo compartilhado |
| [RFC-003-guardrails-conteudo.md](RFC-003-guardrails-conteudo.md) | RFC | Decisão pela abordagem de guardrail via system prompt |
| [RFC-004-rate-limiting-duplo.md](RFC-004-rate-limiting-duplo.md) | RFC | Decisão pelo rate limiting em duas camadas (client + server) |

---

## Links rápidos

- **App em produção:** https://gleica.github.io/ensaio/
- **Proxy Cloudflare:** `https://ensaio-proxy.gleica-tech.workers.dev/v1/messages`
- **Executar local:** `python3 -m http.server 9000` na raiz do projeto
