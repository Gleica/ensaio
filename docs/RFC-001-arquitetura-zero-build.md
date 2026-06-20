# RFC 001 — Arquitetura Zero-Build com Vanilla JS e ES Modules

**Status:** Aceita  
**Data:** Junho 2026  
**Autores:** gleica

---

## Contexto

O EnsaIA foi construído para o hackathon TRAE + AI Brasil com prazo de semanas. As opções avaliadas foram:

1. **React + Vite** — ecossistema familiar, HMR, componentes reutilizáveis.
2. **SvelteKit** — menos boilerplate, bom DX.
3. **Vanilla JS + ES Modules** — sem build, sem dependências de framework.

## Decisão

**Opção 3 — Vanilla JS com ES Modules nativos do browser.**

## Motivação

### Velocidade de setup
Eliminar bundler, transpilador e gerenciador de pacotes de produção significa ir de `git clone` para `python3 -m http.server 9000` em segundos. Em hackathon, isso elimina uma classe inteira de erros de configuração.

### Deploy trivial
GitHub Pages serve arquivos estáticos diretamente. Sem artifact de build, sem processo de CI para compilar — apenas `git push` + GitHub Actions injeta a URL do proxy via `sed` e publica.

### Ausência de lock-in
Zero dependência de npm no frontend significa que o projeto funciona em qualquer browser moderno sem nenhuma etapa de preparação. Isso também facilita avaliação por juízes do hackathon.

### ES Modules são suficientes
O browser resolve `import` nativamente para aplicações de página única sem roteamento complexo. A árvore de módulos do EnsaIA cabe em ~30 arquivos pequenos.

## Trade-offs aceitos

| Limitação | Impacto | Decisão |
|---|---|---|
| Sem TypeScript | Sem checagem de tipos em tempo de edição | Aceitável para o escopo do hackathon; JSDoc pode compensar parcialmente |
| Sem tree-shaking | Todos os módulos carregados são necessários; não há biblioteca de terceiros grande | Irrelevante — zero dependências JS de produção |
| Sem HMR | Recarregamento manual no desenvolvimento | Aceitável; ciclos rápidos com F5 |
| Sem bundling | N requisições HTTP para os módulos | Cada módulo é pequeno; HTTP/2 multiplexado; impacto desprezível |
| Re-export manual | Não há barrel file automático | Importações diretas mantêm rastreabilidade |

## Consequências

- O estado da aplicação vive em um único objeto `state` passado por referência (sem store reativo — sem Zustand, sem Signal).
- Atualizações de UI são imperativamente acionadas pelos controladores.
- Sem JSX: templates HTML são gerados como strings em funções puras (`buildMoodChartSvg`, `renderReport`).
- Testes: Playwright para E2E (acessa o DOM real); sem testes unitários de componente no sentido React.
