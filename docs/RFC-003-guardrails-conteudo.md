# RFC 003 — Guardrails de Segurança de Conteúdo

**Status:** Aceita  
**Data:** Junho 2026  
**Autores:** gleica

---

## Contexto

O EnsaIA realiza roleplay de personas. Sem restrição, um usuário mal-intencionado poderia configurar cenários de assédio, discriminação, incitação à violência, ou outras categorias de conteúdo nocivo, usando a IA como veículo.

O regulamento do hackathon TRAE + AI Brasil tem cláusula eliminatória sobre uso de IA para fins nocivos.

## Decisão

Inserir uma constante `SAFETY_GUARD` **no início** dos prompts `personaSystem` e `suggestSystem` — antes de qualquer instrução de roleplay.

## Implementação

```js
// js/prompts.js
const SAFETY_GUARD = `GUARDRAIL DE SEGURANÇA — verifique ANTES de qualquer outra instrução:
Se o objetivo, contexto ou qualquer fala do usuário envolver discurso de ódio, 
discriminação, incitação à violência, atividades ilegais, desinformação, 
violação de privacidade ou uso malicioso de tecnologia, NÃO prossiga com o roleplay.
Responda SOMENTE com este JSON exato e nada mais:
{"fala": "Este tipo de conversa está fora do escopo do EnsaIA...", "humor": 50, "pensamento": ""}
`;
```

O guardrail **precede** a instrução de roleplay. A verificação de segurança é processada antes que o modelo receba qualquer contexto de personagem.

## Por que prompt e não filtro externo?

| Abordagem | Vantagem | Desvantagem |
|---|---|---|
| Prompt (esta RFC) | Zero latência adicional, sem custo extra, sem biblioteca | Dependente do seguimento do modelo |
| Filtro pré-LLM (palavras-chave) | Bloqueio determinístico | Muitos falsos positivos; frágil contra variações |
| API de moderação externa | Mais robusto | Custo adicional; latência; complexidade de integração |

Para o escopo do hackathon, a abordagem via prompt é suficiente. Claude Sonnet 4.6 segue instruções de guardrail com alta fidelidade quando colocadas no início do system prompt.

## Categorias banidas

1. Discurso de ódio e discriminação
2. Incitação à violência
3. Atividades ilegais
4. Desinformação
5. Violação de privacidade
6. Uso malicioso de tecnologia

## Quais prompts recebem o guardrail?

| Prompt | Recebe guardrail? | Justificativa |
|---|---|---|
| `personaSystem` | Sim | Ponto de entrada de roleplay; maior risco |
| `suggestSystem` | Sim | Pode sugerir aberturas inapropriadas |
| `coachSystem` | Não | Recebe apenas transcrição já filtrada; risco residual baixo |
| `reportSystem` | Não | Analisa sessão já concluída; mesmo raciocínio |

## Resposta de recusa

O modelo retorna o JSON de recusa diretamente no campo `fala`, que é renderizado no chat como qualquer outra fala da persona. O usuário vê a mensagem de recusa sem expor erros técnicos.

## Limitações conhecidas

- A efetividade depende do modelo seguir as instruções; não é 100% garantida.
- Cenários ambíguos podem gerar falsos positivos ocasionais.
- O guardrail não verifica os campos de configuração inicial (`who`, `goal`, `traits`) antes da sessão começar.

---

## Atualização — endurecimento contra jailbreak de roleplay (julho/2026)

**Contexto:** o `SAFETY_GUARD` original verificava o pedido antes do roleplay, mas não blindava explicitamente contra o vetor de ataque mais comum em produtos de personagem via IA: o usuário pressionar, ao longo da conversa, para o modelo "quebrar o personagem" ou tratar a regra como negociável ("é só ficção", "o personagem falaria assim de verdade", "ignore a regra anterior"). A dificuldade PESADELO — que instrui o modelo a "não ceder com facilidade" — é justamente a combinação que esse tipo de ataque explora.

**Opções avaliadas (revisitando a tabela acima com uma restrição adicional: zero latência perceptível e zero custo adicional de chamada de IA):**

| Opção | Atende à restrição de custo/latência? |
|---|---|
| (a) Chamada de classificação separada checando a saída antes de exibir | Não — qualquer segunda chamada ao modelo adiciona as duas coisas que a restrição proíbe |
| (b) Prompt mais robusto contra character-breaking | Sim — mesma chamada única já existente, sem mudança de custo |

**Decisão:** manter a abordagem 100% via prompt (opção b), reforçando o `SAFETY_GUARD` com: (1) declaração explícita de prioridade máxima e não-redefinível por nenhuma mensagem do usuário, (2) reavaliação a cada nova fala, não só na primeira mensagem, (3) esclarecimento de que a dificuldade PESADELO nunca justifica discurso de ódio, ameaças reais, discriminação ou conteúdo ilegal, e (4) um lembrete curto reafirmando o guardrail imediatamente antes do bloco `FORMATO DA RESPOSTA` em `personaSystem` — técnica de "sandwich" para dar peso extra à instrução de segurança na posição mais próxima da geração.

**O que foi descartado e por quê:** um filtro determinístico de palavras-chave no client (bloqueando a saída antes de exibir) foi considerado e rejeitado — além de facilmente contornável, o português brasileiro tem alto risco de falso positivo em expressões idiomáticas comuns em conversas de trabalho (ex.: "isso vai me matar de tanto trabalho", "matar o prazo"), e manter uma lista de termos sensíveis versionada no repositório é, em si, um problema de manutenção e julgamento de conteúdo que não cabe bem resolver sem expertise dedicada.

**Limitação que permanece:** esta é ainda uma mitigação 100% dependente da fidelidade do modelo às instruções — não existe verificação independente da saída. Se o orçamento de custo/latência mudar no futuro, uma chamada de classificação leve e barata (opção a) continua sendo o upgrade natural para uma segunda camada de fato independente do modelo de personagem.
