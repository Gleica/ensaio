# Jobs to Be Done — Comercialização do EnsaIA

**Status:** Rascunho para decisão  
**Origem:** Análise crítica de comercialização (sessão de julho/2026)  
**Como usar:** Cada item abaixo é um "job" no formato JTBD (Quando ___, eu quero ___, para que eu possa ___), com a evidência que o justifica, um score ICE (Impacto × Confiança ÷ Esforço) e um prompt pronto para colar no Claude Code quando decidir avançar. A ordem é por prioridade recomendada, não só por ICE puro — dependências entre itens quebram o ranking ICE em alguns pontos (marcado em cada item).

---

## Resumo rápido

| # | Job | Impacto | Confiança | Esforço | ICE | Depende de |
|---|---|---|---|---|---|---|
| P1 | Telemetria básica de uso | 4 | 5 | 1 | **20** | — |
| P2 | Decisão de ICP (B2B vs B2C) | 5 | 3 | 2 | **7.5** | P1 (dados ajudam a decidir) |
| P3 | Guardrail em camada separada | 3 | 4 | 2 | **6** | — |
| P4 | Reposicionar cenas/copy para RH (se B2B) | 4 | 3 | 1 | **12** | P2 |
| P5 | Autenticação + persistência (LGPD-aware) | 5 | 4 | 4 | **5** | P2 |
| P6 | Billing por usuário (fim do proxy compartilhado por IP) | 5 | 4 | 4 | **5** | P5 |
| P7 | Dashboard de progresso (a alavanca de 10x) | 5 | 3 | 3 | **5** | P5 |

ICE alto não significa "fazer primeiro" sempre — P4 tem ICE maior que P5/P6/P7, mas não faz sentido reposicionar copy antes de decidir o público (P2). A ordem de execução recomendada é a ordem numérica (P1→P7); o ICE serve para você repriorizar dentro desse esqueleto se quiser paralelizar com outra pessoa no time.

---

## P1 — Telemetria básica de uso

**Job to be done:** Quando eu precisar decidir qualquer coisa sobre o produto — se vale pivotar para B2B, se o funil de setup→conversa→relatório está vazando gente, se alguém além dos jurados do hackathon já usou isso — eu quero dados reais de uso, para que eu possa parar de decidir no escuro.

**Por quê:** Hoje não existe nenhuma instrumentação no código. Toda decisão de priorização — inclusive as deste documento — está sendo tomada por inferência de código, não por comportamento real de usuário.

**ICE:** Impacto 4 · Confiança 5 · Esforço 1 → **20**

**Depende de:** nada. É o único item que não trava em decisão nenhuma — pode começar hoje.

**Prompt sugerido:**
```
Adicione telemetria de uso mínima e privacy-first ao EnsaIA (sem backend
próprio, sem PII). Instrumentar: início de sessão (com modo: demo/byok/shared),
cena escolhida (ou "customizada"), dificuldade selecionada, nº de mensagens
enviadas antes de abandonar, se "Como fui?" foi clicado, se "Relatório final"
foi gerado, se o guardrail foi acionado. Avalie Cloudflare Web Analytics
(gratuito, sem cookies, já que já usamos Cloudflare Workers) vs Plausible
self-hosted vs evento simples batendo no próprio Worker gravando em KV.
Não capturar texto de conversa nem nome de terceiros — só eventos e metadados.
```

---

## P2 — Decisão de ICP: B2B (RH/L&D) vs B2C

**Job to be done:** Quando eu estiver escolhendo o que construir a seguir, eu quero um critério objetivo de mercado e não minha intuição sobre "todo mundo precisa disso", para que eu possa escolher entre vender para empresas (RH/treinamento de liderança) ou para pessoas físicas sem desperdiçar meses construindo para o público errado.

**Por quê:** O PRD atual mira "qualquer pessoa" — isso não é um ICP, é ausência de um. A análise identificou que B2C sofre de baixa frequência de uso estrutural (conversas difíceis acontecem poucas vezes por ano → LTV baixo → CAC não se paga). B2B/RH tem orçamento já existente para essa categoria (treinamento de liderança/feedback) e uso recorrente natural (onboarding de gestores, ciclos de PDI).

**ICE:** Impacto 5 · Confiança 3 · Esforço 2 → **7.5**

**Depende de:** dados do P1 ajudam, mas isso pode (e talvez deva) ser decidido via validação qualitativa em paralelo — 5 a 10 conversas com gestores de RH/L&D perguntando se pagariam por isso, e 5 a 10 conversas com profissionais individuais perguntando o mesmo.

**Prompt sugerido:**
```
Isto não é uma tarefa de código. É uma sessão de brainstorming estruturado
para decidir o ICP do EnsaIA. Use a skill product-lens (Mode 1: Product
Diagnostic) para me guiar pelas perguntas difíceis: quem é o comprador vs
quem é o usuário no cenário B2B, qual o ciclo de compra de RH corporativo
no Brasil, o que muda no produto (cenas, copy, dificuldade, relatório) se o
comprador for uma empresa em vez de um indivíduo. Não escreva código —
produza um PRODUCT-BRIEF.md com a decisão e o porquê.
```

---

## P3 — Guardrail de segurança em camada separada

**Job to be done:** Quando um usuário tentar contornar o guardrail atual (que é só instrução de sistema dentro do próprio prompt de personagem), eu quero uma camada de moderação independente do modelo que interpreta o personagem, para que eu possa reduzir o risco de um print de output ofensivo virar problema de reputação antes de eu ter qualquer usuário pagante.

**Por quê:** `SAFETY_GUARD` em `js/prompts.js` está dentro do mesmo prompt que instrui "nunca quebre o personagem" e "seja um desafio real, não ceda fácil" (modo Pesadelo) — exatamente a combinação que a literatura de jailbreak de roleplay explora. Isso é risco técnico independente da decisão de ICP, então pode ser feito em paralelo a P2.

**ICE:** Impacto 3 · Confiança 4 · Esforço 2 → **6**

**Depende de:** nada — pode rodar em paralelo com P2.

**Prompt sugerido:**
```
Adicione uma segunda camada de moderação ao EnsaIA, independente do prompt
de personagem. Hoje o único guardrail é o SAFETY_GUARD dentro de
personaSystem() em js/prompts.js — mesma chamada que interpreta o
personagem, o que é vulnerável a jailbreak de roleplay. Avalie: (a) checar
a saída da persona com uma chamada de classificação leve e barata antes de
mostrar ao usuário, ou (b) usar a Moderation-adjacent guidance da Anthropic
para prompts de sistema mais robustos contra character-breaking. Priorize
solução que não adicione latência perceptível ao streaming atual.
```

---

## P4 — Reposicionar cenas e copy para RH/liderança (se B2B for a decisão)

**Job to be done:** Quando eu tiver decidido que o comprador é RH/L&D, eu quero que a biblioteca de cenas e a linguagem do produto falem a língua de quem compra treinamento corporativo, para que eu possa vender o mesmo motor de simulação como "ferramenta de treinamento de liderança" em vez de "app para ensaiar sua vida pessoal".

**Por quê:** As 6 cenas atuais (`js/data/scenes.js`) já são majoritariamente do ponto de vista de gestor (pedir aumento é a exceção) — o produto já está meio-desenhado para esse público sem que isso tenha sido uma decisão consciente. É principalmente trabalho de conteúdo/copy, não de arquitetura — por isso o esforço é baixo.

**ICE:** Impacto 4 · Confiança 3 · Esforço 1 → **12**

**Depende de:** P2 (decisão de ICP). Não faz sentido investir nisso antes de decidir o público.

**Prompt sugerido:**
```
Reposicione o conteúdo do EnsaIA (copy do README, landing, cenas em
js/data/scenes.js) para o público de RH/L&D corporativo, mantendo a
arquitetura zero-build atual. Adicione cenas do ponto de vista de gestor
de pessoas: onboarding de liderança de primeira viagem, conversa de
desligamento por justa causa, mediação de conflito entre pares no time,
devolutiva de avaliação 360. Ajuste o relatório final (reportSystem em
js/prompts.js) para incluir linguagem de competências de liderança
(ex.: "escuta ativa", "assertividade sem agressividade") em vez de
avaliação genérica.
```

---

## P5 — Autenticação + persistência de sessão (LGPD-aware desde o design)

**Job to be done:** Quando um usuário terminar uma sessão de ensaio, eu quero que o relatório e o histórico fiquem salvos vinculados à conta dele, para que eu possa mostrar evolução ao longo do tempo em vez de jogar fora o único dado de valor que o produto gera a cada sessão.

**Por quê:** Hoje o relatório final desaparece ao fechar a aba (`state` vive só em memória, `resetSession` limpa tudo). É o item que mais destrava valor futuro (retenção, billing por usuário real em vez de IP, dashboard de progresso) mas também é o maior salto arquitetural — o EnsaIA hoje não tem nenhum backend além do proxy stateless. Como esse histórico vai conter descrições de terceiros nomeados ("minha gestora, a Ana"), o modelo de dados precisa nascer pensando em LGPD (minimização de dados, não guardar nome real de terceiro em texto livre sem tratamento, direito de exclusão) — não como reboque depois.

**ICE:** Impacto 5 · Confiança 4 · Esforço 4 → **5**

**Depende de:** P2, porque o modelo de conta (individual vs conta de empresa com múltiplos seats) muda dependendo do ICP.

**Prompt sugerido:**
```
Projete (não implemente ainda — só o desenho) autenticação e persistência
de sessão para o EnsaIA, hoje 100% client-side e stateless (ver CLAUDE.md
para arquitetura atual: zero backend próprio, só o Cloudflare Worker como
proxy stateless). Considerar: Cloudflare D1 ou Supabase para o banco,
Cloudflare Access ou Clerk para auth, o que muda no Worker (worker/index.js)
para autenticar requests em vez de confiar só em CORS+IP. Desenhar o schema
pensando em LGPD desde o início: como tratar o campo "who" (descrição de
terceiro nomeado) sem violar minimização de dados, e como implementar
direito de exclusão de conta. Produza um RFC no padrão dos existentes em
docs/RFC-00N-*.md.
```

---

## P6 — Billing por usuário real (fim do proxy compartilhado por IP)

**Job to be done:** Quando eu tiver tráfego real além do hackathon, eu quero parar de pagar a conta da Anthropic para qualquer visitante anônimo via IP, para que eu possa ter um modelo de custo que escala com receita, não com visitantes.

**Por quê:** `worker/index.js` hoje usa uma `ANTHROPIC_KEY` única compartilhada, com rate limit de 30 req/dia por IP — trivialmente contornável (VPN, 4G, NAT de escritório) e, mais importante, **estruturalmente um modelo de prejuízo**: sucesso em distribuição = mais custo direto sem contrapartida de receita. Este item é o que torna P5 (contas de usuário) uma necessidade de negócio, não só de produto.

**ICE:** Impacto 5 · Confiança 4 · Esforço 4 → **5**

**Depende de:** P5 (precisa de identidade de usuário para cobrar por usuário em vez de por IP).

**Prompt sugerido:**
```
Depois que a autenticação (P5) estiver desenhada, redesenhe o rate limiting
e o modelo de custo do EnsaIA. Hoje worker/index.js limita por IP via
Cloudflare KV (30 req/dia), o que não sobrevive a tráfego real nem impede
abuso via VPN/NAT. Avalie: plano freemium com cota real por conta de
usuário autenticado, cobrança por sessão consumida acima da cota (Stripe
metered billing), e para o cenário B2B (se P2 decidir por RH/L&D) um
modelo de seats corporativos com pool de sessões compartilhado pelo time.
```

---

## P7 — Dashboard de progresso (a alavanca de 10x)

**Job to be done:** Quando um usuário (ou um gestor de RH olhando o time dele) quiser saber se está melhorando de verdade em conversas difíceis, eu quero um painel que mostre a evolução de nota, humor médio alcançado e cenas praticadas ao longo do tempo, para que eu possa transformar uma ferramenta de uso único em algo que justifica pagamento recorrente.

**Por quê:** Identificado na análise anterior como a alavanca de maior potencial de 10x — é o que já está listado no backlog do PRD ("Dashboard de progresso") mas hoje é impossível de construir porque não existe persistência (P5) nem dado histórico (P1+P5 juntos).

**ICE:** Impacto 5 · Confiança 3 · Esforço 3 → **5**

**Depende de:** P5 (não existe dashboard sem histórico salvo) e se beneficia de P1 (saber quais métricas de fato importam para o usuário antes de desenhar o painel).

**Prompt sugerido:**
```
Depois que houver persistência de sessão (P5), implemente um dashboard de
progresso no EnsaIA. Métricas candidatas: nota média ao longo do tempo por
tipo de cena, humor final médio alcançado por sessão (indicador de quão
bem a conversa terminou), frequência de prática, "erros recorrentes" mais
citados pelo relatório across sessões (dado que já existe no schema do
reportSystem em js/prompts.js, só nunca foi agregado). Se o ICP (P2) for
B2B, considerar uma visão agregada por gestor de RH olhando o time inteiro,
respeitando o desenho de LGPD definido em P5.
```

---

## Fora do JTBD — decisões que ainda não viraram job

Itens da análise anterior que são recomendações de *não fazer agora* (multiplayer, voz, internacionalização) não entraram como jobs porque não há dor validada por trás deles hoje — ver seção "Anti-goals" da análise de comercialização. Se algum desses ganhar evidência via P1/P2, vira um novo job neste documento.
