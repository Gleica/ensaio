# Estratégia de Testes — EnsaIA

**Versão:** 1.0  
**Data:** Junho 2026

---

## Visão geral

O EnsaIA usa **Playwright** como única ferramenta de teste, cobrindo E2E e integração funcional. Não há testes unitários separados — a arquitetura de módulos pequenos e funções puras permite validação suficiente via E2E.

---

## Estrutura de testes

```
tests/
├── ensaio.spec.js            ← Suite principal (local, com mock de API)
├── production-suite.spec.js  ← Suite de produção (hits reais na API)
├── proxy-live.spec.js        ← Teste do Worker ao vivo
├── playwright-report/        ← HTML report do último run
└── screenshots/              ← Capturas geradas pelos testes
```

---

## Configuração

**`playwright.config.js`** — ponto de entrada configurado para `http://localhost:9000`.

### Executar localmente

```bash
# 1. Instalar Playwright (uma vez)
npm install
npx playwright install chromium

# 2. Subir o servidor local
python3 -m http.server 9000 &

# 3. Rodar a suite principal
npx playwright test tests/ensaio.spec.js

# 4. Rodar suite de produção (requer chave ou shared mode ativo)
npx playwright test tests/production-suite.spec.js
```

---

## Suite principal (ensaio.spec.js)

| Cenário | Descrição |
|---|---|
| Page load | Título, galeria de cenas e botão de demo visíveis |
| Responsividade | Screenshots em 375, 768 e 1280px |
| Galeria de cenas | 6 cenas renderizadas; clique popula o formulário |
| Modo demonstração | Fluxo completo sem chave: demo inicia, cenas percorrem, coach funciona |
| IA real | Setup + envio de mensagem + resposta da persona + coach |
| Nova cena | Botão retorna ao setup e reseta o estado |
| Guardrail | Cenário proibido retorna mensagem de recusa no chat |
| Relatório | Duas mensagens + geração de relatório completo |

### Screenshots geradas

```
tests/screenshots/
├── 01-page-load.png
├── 02-responsive-mobile-375.png
├── 02-responsive-tablet-768.png
├── 02-responsive-desktop-1280.png
├── 03-scene-gallery.png
├── 04a-demo-sim-visible.png
├── 04b-demo-after-send.png
├── 04c-demo-coach.png
├── 05a-real-ai-sim-open.png
├── 05b-real-ai-response.png
├── 06-nova-cena-placement.png
├── 07a-guardrail-sim.png
├── 07b-guardrail-refusal.png
├── 08a-report-first-exchange.png
├── 08b-report-second-exchange.png
├── 08c-report-loading.png
└── 08d-report-rendered.png
```

---

## Suite de produção (production-suite.spec.js)

Executa contra `https://gleica.github.io/ensaio/` com chamadas reais à API Anthropic. Usado para validação pós-deploy.

Cenários adicionais cobertos:

- Modo compartilhado ativo (botão ⚙︎ oculto)
- Streaming de resposta da persona
- Relatório final completo com JSON válido
- Contador de mensagens e limites visuais

---

## Suite de proxy (proxy-live.spec.js)

Testa o Cloudflare Worker diretamente:

- Preflight CORS OPTIONS → 204
- POST de origem autorizada → 200
- POST de origem não autorizada → 403
- Rate limit após N requisições → 429

---

## Cobertura funcional

| Funcionalidade | Coberta? |
|---|---|
| Carregamento da página | Sim |
| Galeria de cenas | Sim |
| Formulário de setup | Sim |
| Modo demonstração end-to-end | Sim |
| Resposta da persona (streaming) | Sim (produção) |
| Termômetro de humor | Sim |
| Pensamento oculto | Sim |
| Coach em tempo real | Sim |
| Relatório final | Sim |
| Guardrail de segurança | Sim |
| Responsividade (3 breakpoints) | Sim |
| Botão nova cena | Sim |
| Rate limiting visual | Sim (produção) |
| Modo BYOK | Sim (produção) |

---

## Convenções

- **Seletores:** preferência por `data-testid` quando ambíguo; `text=` e `role=` para elementos semânticos.
- **Timeouts:** `waitForSelector` com 30 s para respostas de IA.
- **Screenshots:** tiradas após cada etapa crítica; prefixadas com número para ordenação.
- **Sem mocks de rede** na suite principal — usa modo demo (sem API) ou chaves reais.

---

## Adicionar um novo teste

```js
// tests/ensaio.spec.js
test('nome descritivo do comportamento', async ({ page }) => {
  // Arrange
  await page.goto('http://localhost:9000');

  // Act
  await page.click('text=Ver demonstração');
  await page.waitForSelector('.chat-bubble');

  // Assert
  await expect(page.locator('.chat-bubble')).toBeVisible();

  // Screenshot opcional
  await page.screenshot({
    path: 'tests/screenshots/novo-teste.png',
    fullPage: true,
  });
});
```
