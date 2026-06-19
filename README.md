# 🎭 EnsaIA — treine a conversa difícil antes de ela acontecer

> Um simulador de IA onde você ensaia aquela conversa que dá frio na barriga — pedir aumento, cobrar um cliente, dar uma notícia ruim, terminar um contrato — **conversando com a outra pessoa antes de ela existir de verdade**.

**Aplicação no ar:** [https://gleica.github.io/ensaio/](https://gleica.github.io/ensaio/)

---

## O problema

Todo mundo trava na mesma hora: a conversa importante que a gente ensaia na cabeça mil vezes e, na hora, sai tudo errado. Pedir aumento, dar um feedback duro, cobrar uma dívida, falar de um término. Não existe ensaio possível — você só tem **uma** chance, ao vivo, com a pessoa na sua frente.

As ferramentas de IA que existem hoje só reescrevem o texto da mensagem. Mas o difícil não é escrever — é **lidar com a reação do outro lado**: a defesa, o silêncio, a explosão, a pressão.

## A solução

O **EnsaIA** vira esse jogo do avesso. Você descreve com quem vai falar e como essa pessoa costuma reagir, e a IA **encarna essa pessoa**. Você conversa de verdade, em tempo real, e ela reage como reagiria — empurra de volta, se fecha, ou abre, dependendo de como você conduz.

E o diferencial: enquanto você conversa, você vê duas coisas que na vida real são invisíveis:

- 🌡️ **O termômetro de humor** da outra pessoa subindo ou descendo a cada fala sua.
- 🧠 **O que ela está realmente pensando** por dentro — o pensamento que ela nunca diria em voz alta.
- 📈 **O arco emocional** da conversa inteira em gráfico, ao vivo.

No fim, o botão **"📋 Relatório final"** gera um relatório completo: nota (0–10), pontos fortes, erros recorrentes, sua melhor fala e um próximo passo concreto. O botão **"🎯 Como fui?"** dá feedback imediato a qualquer momento.

## O diferencial

A maioria dos assistentes de IA te dá *a resposta certa*. O EnsaIA te dá **o treino** — e o feedback que mostra o invisível de uma conversa real: a emoção e o pensamento do outro lado. É um simulador de voo para conversas humanas.

## Como funciona (em 4 passos)

1. **Escolha uma cena** — use um atalho pronto (pedir aumento, dar feedback, cobrar dívida, encerrar parceria...) ou monte a sua do zero.
2. **Configure a dificuldade** — 😌 Fácil (persona receptiva), 😐 Normal (realista) ou 🔥 Pesadelo (adversarial, pressiona e não cede fácil).
3. **Ensaie** — converse no chat. A IA responde em streaming no personagem, o termômetro de humor se move em tempo real e você pode revelar o pensamento dela.
4. **Receba feedback** — use "🎯 Como fui?" para feedback imediato ou "📋 Relatório final" para análise completa da sessão. Repita até ganhar confiança.

> 💡 Tem um **modo demonstração** que roda sem nenhuma chave de API (cena pronta: "pedir aumento ao gestor"), para experimentar na hora.

## Funcionalidades

| Funcionalidade | Detalhe |
|---|---|
| 🎭 Persona IA em streaming | Resposta em tempo real com indicador de digitação |
| 🌡️ Termômetro de humor | 0–100, atualizado a cada resposta da persona |
| 🧠 Pensamento oculto | O que a outra pessoa pensa mas não diz |
| 📈 Arco emocional | Gráfico SVG ao vivo com a evolução do humor |
| 📚 Biblioteca de cenas | 6 cenas prontas (aumento, feedback, dívida, contrato, prazo, demissão) |
| 🎚️ Dificuldade | Fácil / Normal / Pesadelo — altera o comportamento da persona no prompt |
| 🎯 Coach em tempo real | Análise da última fala + sugestão de reformulação |
| 📋 Relatório final | Nota, pontos fortes, erros, melhor fala, próximo passo |
| 💡 Sugestão de abertura | IA sugere a primeira fala para você começar |
| ▶ Modo demonstração | Conversa roteirizada, sem chave de API |

## Tecnologias utilizadas

- **HTML, CSS e JavaScript puro** (vanilla) — zero dependências, zero build step.
- **API da Anthropic (Claude Sonnet)** — chamadas direto do navegador com o cabeçalho `anthropic-dangerous-direct-browser-access`. Modo BYOK: chave fica só no `sessionStorage` do usuário. Modo compartilhado: chave injetada via GitHub Actions secret, nunca exposta no repositório.
- **GitHub Pages + GitHub Actions** — hospedagem estática com deploy automatizado e injeção segura de secrets.

## Como executar localmente

```bash
# dentro da pasta do projeto
python3 -m http.server 9000
# abra http://localhost:9000
```

Abrir `index.html` diretamente no browser também funciona, mas um servidor local evita bloqueios de CORS.

## Como usar

1. Abra a aplicação.
2. Clique em **▶ Ver demonstração** para conhecer o fluxo sem precisar de chave, **ou**
3. Clique em **⚙︎ Chave** (topo), cole sua chave da Anthropic e salve.
4. Escolha uma cena da biblioteca ou preencha os campos manualmente.
5. Selecione a dificuldade e clique em **Começar o ensaio**.
6. Converse, observe o humor e o pensamento da outra pessoa.
7. Use **🎯 Como fui?** para feedback imediato ou **📋 Relatório final** ao encerrar.

### Como conseguir uma chave da Anthropic

Acesse [console.anthropic.com](https://console.anthropic.com/) → **API Keys** → **Create Key**. A chave começa com `sk-ant-`. Cole no botão ⚙︎ Chave do app.

## Privacidade

No **modo BYOK** (traga sua própria chave), a chave fica apenas no `sessionStorage` do seu navegador (apagada ao fechar a aba) e vai direto do seu navegador para a Anthropic — nenhum servidor intermediário.

No **modo compartilhado** (acesso direto no link público), as chamadas à API passam por um proxy Cloudflare Worker. A chave da Anthropic vive exclusivamente como secret do Worker — nunca aparece no código-fonte do repositório, nunca é enviada ao navegador. O proxy aplica rate limiting por IP (via Cloudflare KV) e valida a origem das requisições.

## Possíveis melhorias futuras

| Melhoria | Descrição |
|---|---|
| 🎙️ Voz para a persona | Síntese de voz com a resposta da persona, tornando o ensaio mais imersivo |
| 🗂️ Histórico de ensaios | Salvar sessões anteriores no `localStorage` para revisitar e comparar evolução |
| 👥 Modo multiplayer | Duas pessoas ensaiam a mesma conversa em papéis opostos, com IA como mediadora |
| 🌍 Suporte a outros idiomas | Interface e prompts em inglês e espanhol para ampliar o alcance |
| 📊 Dashboard de progresso | Painel com estatísticas ao longo das sessões: média de nota, humor médio, cenas mais ensaiadas |
| 🔁 Modo variação | IA gera uma versão alternativa da mesma conversa com outra estratégia de comunicação, para comparar abordagens |
| 🏷️ Perfis de persona salvos | Salvar personas personalizadas (ex.: "meu gestor direto") para reusar em múltiplos ensaios |
| 📱 App nativo (PWA) | Transformar em Progressive Web App instalável com notificações de lembrete de ensaio |

## Licença

MIT — sinta-se livre para usar, estudar e evoluir.

---

_Projeto criado para o **Desafio TRAE + AI Brasil** (junho/2026)._
