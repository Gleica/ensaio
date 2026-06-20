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
