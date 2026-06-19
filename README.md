# 🎭 Ensaio — treine a conversa difícil antes de ela acontecer

> Um simulador de IA onde você ensaia aquela conversa que dá frio na barriga — pedir aumento, cobrar um cliente, dar uma notícia ruim, terminar um contrato — **conversando com a outra pessoa antes de ela existir de verdade**.

**Aplicação no ar:** _[https://gleica.github.io/ensaio/)_
**Vídeo de apresentação:** _(cole aqui o link do Loom/YouTube)_

---

## O problema

Todo mundo trava na mesma hora: a conversa importante que a gente ensaia na cabeça mil vezes e, na hora, sai tudo errado. Pedir aumento, dar um feedback duro, cobrar uma dívida, falar de um término. Não existe ensaio possível — você só tem **uma** chance, ao vivo, com a pessoa na sua frente.

As ferramentas de IA que existem hoje só reescrevem o texto da mensagem. Mas o difícil não é escrever — é **lidar com a reação do outro lado**: a defesa, o silêncio, a explosão, a pressão.

## A solução

O **Ensaio** vira esse jogo do avesso. Você descreve com quem vai falar e como essa pessoa costuma reagir, e a IA **encarna essa pessoa**. Você conversa de verdade, em tempo real, e ela reage como reagiria — empurra de volta, se fecha, ou abre, dependendo de como você conduz.

E o diferencial: enquanto você conversa, você vê duas coisas que na vida real são invisíveis:

- 🌡️ **O termômetro de humor** da outra pessoa subindo ou descendo a cada fala sua.
- 🧠 **O que ela está realmente pensando** por dentro — o pensamento que ela nunca diria em voz alta.

No fim (ou a qualquer momento), o botão **"Como fui?"** chama um coach de comunicação que aponta o que funcionou, onde você cedeu demais ou foi agressivo, e sugere a próxima fala.

## O diferencial

A maioria dos assistentes de IA te dá *a resposta certa*. O Ensaio te dá **o treino** — e o feedback que mostra o invisível de uma conversa real: a emoção e o pensamento do outro lado. É um simulador de voo para conversas humanas.

## Como funciona (em 3 passos)

1. **Monte a cena** — quem é a pessoa, a relação, como ela costuma reagir, o que você precisa dizer e que tom quer manter.
2. **Ensaie** — converse no chat. A IA responde no personagem, o termômetro de humor se move e você pode revelar o pensamento dela.
3. **Receba feedback** — clique em "Como fui?" e ajuste sua abordagem. Repita até ganhar confiança.

> 💡 Tem um **modo demonstração** que roda sem nenhuma chave de API (cena pronta: "pedir aumento ao gestor"), para experimentar na hora.

## Tecnologias utilizadas

- **HTML, CSS e JavaScript puro** (vanilla) — uma única página, zero dependências, zero build.
- **API da Anthropic (Claude)** — chamada direto do navegador com o cabeçalho `anthropic-dangerous-direct-browser-access`, no padrão *traga sua própria chave* (BYOK). A chave fica só no `sessionStorage` do usuário e nunca passa por nenhum servidor intermediário.
- **GitHub Pages** — hospedagem estática.
- Desenvolvido com o apoio da **TRAE** durante o Desafio TRAE + AI Brasil.

## Como executar localmente

Por ser um único arquivo estático, basta abrir o `index.html` no navegador. Para evitar qualquer bloqueio de CORS do navegador, o recomendado é servir localmente:

```bash
# dentro da pasta do projeto
python3 -m http.server 8000
# abra http://localhost:8000
```

## Como usar

1. Abra a aplicação.
2. Clique em **▶ Ver demonstração** para conhecer o fluxo sem precisar de chave, **ou**
3. Clique em **⚙︎ Chave** (topo), cole sua chave da Anthropic e salve para ensaiar a sua conversa de verdade.
4. Preencha a cena e clique em **Começar o ensaio**.
5. Converse, observe o humor e o pensamento da outra pessoa, e use **🎯 Como fui?** para receber feedback.

### Como conseguir uma chave da Anthropic

Acesse [console.anthropic.com](https://console.anthropic.com/) → **API Keys** → **Create Key**. A chave começa com `sk-ant-`. Cole no botão ⚙︎ Chave do app. Se o modelo padrão der erro, confira o nome exato do modelo disponível na sua conta e troque no mesmo campo.

## Privacidade

A chave de API fica **apenas no navegador do usuário** (`sessionStorage`, apagada ao fechar a aba) e vai direto do navegador para a Anthropic. Nada é enviado, salvo ou registrado por nenhum servidor deste projeto — não há backend.

## Possíveis melhorias futuras

- Modo **voz**: ensaiar falando, com transcrição e resposta em áudio.
- **Biblioteca de cenas** prontas (demissão, feedback, negociação salarial, conflito familiar).
- **Relatório pós-ensaio** com evolução do humor ao longo da conversa em gráfico.
- **Níveis de dificuldade** da persona (do "tranquilo" ao "modo pesadelo").
- Backend opcional com chave compartilhada, para uso sem BYOK.
- Suporte a **múltiplos modelos** (OpenAI, Gemini) com seleção na interface.

## Licença

MIT — sinta-se livre para usar, estudar e evoluir.

---

_Projeto criado para o **Desafio TRAE + AI Brasil** (junho/2026)._
