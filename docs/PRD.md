# PRD — EnsaIA: Simulador de Conversas Difíceis

**Status:** Lançado  
**Data:** Junho 2026  
**Contexto:** Desafio TRAE + AI Brasil (hackathon)

---

## 1. Problema

Todo profissional e pessoa enfrenta conversas difíceis que concentram alto peso emocional: pedir aumento, dar feedback negativo, cobrar uma dívida, demitir alguém, encerrar uma parceria. A preparação convencional — ensaiar mentalmente ou escrever um roteiro — falha porque não reproduz a variável mais crítica: a **reação imprevisível do outro lado**.

Ferramentas de IA existentes reescrevem mensagens, sugerem scripts ou ajudam a redigir e-mails. Nenhuma coloca o usuário em confronto com a resistência real de uma persona específica.

**Lacuna identificada:** não existe simulação conversacional acessível que encarne a outra pessoa, forneça feedback sobre as próprias respostas em tempo real e revele as emoções invisíveis dessa persona.

---

## 2. Proposta de valor

**EnsaIA** é um simulador de conversas difíceis que usa IA generativa para:

1. **Encarnar a outra pessoa** com personalidade, cargo e padrão de reação configurados pelo usuário.
2. **Revelar o invisível** — um termômetro de humor (0–100) e o "pensamento oculto" da persona a cada turno.
3. **Fornecer coaching imediato** — análise da última fala + sugestão de reformulação.
4. **Gerar um relatório pós-sessão** — nota global, pontos fortes, erros recorrentes, melhor fala e próximo passo.

---

## 3. Usuários-alvo

| Perfil | Situação típica |
|---|---|
| Profissional de carreira | Pedir aumento, dar feedback, negociar com stakeholders |
| Gestor / líder de time | Dar feedback difícil, comunicar demissão, tratar conflitos |
| Empreendedor | Encerrar contrato, negociar prazo com cliente, cobrar inadimplência |
| Estudante e jovem profissional | Primeiras experiências com conversas de alto impacto |

---

## 4. Objetivos do produto

| Objetivo | Métrica de sucesso |
|---|---|
| Entregar simulação de alta verossimilhança | Taxa de abandono < 30% após a primeira mensagem |
| Manter barreira de entrada zero | Funcionar sem cadastro, sem chave de API (modo compartilhado) |
| Prover feedback educativo em tempo real | Coach disparado em ≤ 2 s após solicitação |
| Garantir moderação de conteúdo | 0 respostas de roleplay para inputs banidos pelo guardrail |

---

## 5. Funcionalidades

### 5.1 MVP (lançado)

| Funcionalidade | Descrição |
|---|---|
| Biblioteca de 6 cenas | Pedir aumento, feedback, dívida, contrato, prazo, demissão |
| Configuração livre | Who, Rel, Traits (chips), Goal, Tone, Difficulty |
| 3 níveis de dificuldade | Fácil, Normal, Pesadelo — alteram o comportamento da persona |
| Persona em streaming | Resposta incremental com indicador de digitação |
| Termômetro de humor | Escala 0–100 atualizada a cada turno |
| Pensamento oculto | O que a persona pensa mas não diz |
| Arco emocional | Gráfico SVG ao vivo com evolução do humor |
| Coach em tempo real | Análise + sugestão de reformulação por demanda |
| Relatório final | Nota, pontos fortes, erros, melhor fala, próximo passo |
| Sugestão de abertura | IA sugere a primeira fala ideal |
| Modo demonstração | Conversa roteirizada sem chave de API |
| Guardrail de segurança | Recusa roleplay de conteúdo proibido |

### 5.2 Modo de acesso

| Modo | Quem usa | Como funciona |
|---|---|---|
| Compartilhado (shared) | Qualquer usuário sem cadastro | Chamadas passam pelo Cloudflare Worker; limite de 3 sessões/dia e 8 mensagens/sessão |
| BYOK (Bring Your Own Key) | Usuário com chave Anthropic | Chamadas direto do browser com `anthropic-dangerous-direct-browser-access`; sem limites de quota |

### 5.3 Backlog (melhorias futuras)

- Voz para a persona (síntese de fala)
- Histórico de sessões em `localStorage`
- Modo multiplayer (dois usuários, IA mediadora)
- Dashboard de progresso longitudinal
- Modo variação (IA propõe abordagem alternativa)
- Perfis de persona salvos
- PWA instalável

---

## 6. Requisitos não-funcionais

| Requisito | Meta |
|---|---|
| **Zero dependências** | Nenhum pacote npm no frontend; HTML + CSS + JS puro |
| **Zero build step** | Abertura direta do `index.html` funciona |
| **Latência de primeira resposta** | < 3 s (limitado pela API Anthropic) |
| **Segurança da chave** | `ANTHROPIC_KEY` nunca no código-fonte ou no browser |
| **Rate limiting duplo** | Client (`localStorage`) + Server (Cloudflare KV, 30 req/IP/dia) |
| **Compatibilidade** | Chrome, Firefox, Safari modernos; mobile responsivo |
| **Moderação** | Guardrail embutido no prompt recusa conteúdos banidos |

---

## 7. Fora de escopo

- Autenticação / sistema de contas de usuário
- Armazenamento server-side de histórico de conversas
- Suporte a outros idiomas (UI em pt-BR; possível expansão futura)
- Geração de voz (listado como melhoria futura, não MVP)

---

## 8. Dependências críticas

| Dependência | Risco | Mitigação |
|---|---|---|
| API Anthropic (Claude Sonnet 4.6) | Mudança de preço / indisponibilidade | Modelo configurável; fallback para BYOK |
| Cloudflare Workers (proxy) | Downtime do Worker | Usuário pode alternar para BYOK com ⚙︎ |
| GitHub Pages | Indisponibilidade de CDN | Estático; baixo risco |
| Cloudflare KV | Latência do KV impacta rate limiting | Limite de 30 req/dia é tolerante a falhas momentâneas |
