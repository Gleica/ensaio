# Guia de Deploy — EnsaIA

**Versão:** 1.0  
**Data:** Junho 2026

---

## Visão geral

EnsaIA tem **dois componentes deployáveis independentes**:

| Componente | Plataforma | Trigger de deploy |
|---|---|---|
| Frontend (SPA estática) | GitHub Pages | `git push main` |
| Proxy API | Cloudflare Worker | `wrangler deploy` manual |

---

## 1. Deploy do Frontend (GitHub Pages)

### Pré-requisitos

- Repositório público no GitHub com GitHub Pages habilitado.
- Source configurada como **GitHub Actions** (não "Deploy from branch") em `Settings → Pages`.
- Secret `PROXY_URL` configurado em `Settings → Secrets and variables → Actions`.

### Secret necessário

| Secret | Valor | Onde fica |
|---|---|---|
| `PROXY_URL` | `https://ensaio-proxy.gleica-tech.workers.dev/v1/messages` | GitHub Actions secrets |

### Fluxo automatizado (.github/workflows/deploy.yml)

```
push em main
     ↓
checkout do repositório
     ↓
sed -i "s|__PROXY_URL__|${{ secrets.PROXY_URL }}|g" js/config.js
     ↓
verificação: falha o build se __PROXY_URL__ ainda estiver no arquivo
     ↓
actions/upload-pages-artifact
     ↓
actions/deploy-pages
     ↓
https://gleica.github.io/ensaio/
```

O `sed` substitui o placeholder `__PROXY_URL__` pelo valor real antes do upload. O código-fonte mantém o placeholder e a URL nunca aparece no repositório.

**Incidente (julho/2026):** o secret `PROXY_URL` ficou configurado com um valor incorreto por semanas sem ninguém perceber — o `sed` "funcionava" (exit 0) mas não substituía nada, e o site publicado ficava preso em modo BYOK silenciosamente para todo mundo. Depois de corrigir o secret, o problema pareceu voltar de forma intermitente (ora a URL certa, ora o placeholder, em checagens a poucos segundos de distância). **Causa raiz real:** `Settings → Pages` estava configurado com `build_type: "legacy"` (Source = "Deploy from a branch", servindo direto do branch `main`) em vez de `"workflow"` (Source = "GitHub Actions") — verificável via `gh api repos/<owner>/<repo>/pages`. Com isso, o artefato publicado pelo `deploy.yml` (já com a URL correta injetada) competia com a publicação legada direto do branch (que nunca roda o `sed`, então sempre serve o placeholder), e qual delas ficava "no ar" dependia de qual ciclo de sync rodou por último — daí a aparência de intermitência. Corrigido com `gh api --method PUT repos/<owner>/<repo>/pages -f build_type=workflow`, confirmando o requisito que este documento (e o `CLAUDE.md`) já exigia. Depois dessa correção, deploys ficaram consistentes em checagens repetidas.

O step "Verify proxy URL was injected" (após o `sed`) continua no workflow como segunda camada de defesa: se `__PROXY_URL__` ainda estiver no arquivo *do artefato que o Actions está prestes a publicar*, o build falha alto (`exit 1`) em vez de silenciosamente publicar um build quebrado — mas ele não teria pego o incidente acima, já que o artefato do Actions estava correto; o problema era o Pages ignorá-lo. Se o site voltar a pedir chave sem necessidade, confira **nessa ordem**: (1) `gh api repos/<owner>/<repo>/pages` → `build_type` deve ser `"workflow"`; (2) o secret `PROXY_URL` em `Settings → Secrets and variables → Actions`; (3) rode o deploy de novo.

### Verificar deploy

```bash
curl -s "https://gleica.github.io/ensaio/js/config.js?cb=$(date +%s)" | grep PROXY_URL
# Deve exibir a URL real, não o placeholder __PROXY_URL__
# O parâmetro ?cb= evita servir uma cópia em cache do CDN da GitHub Pages
```

Desde o step de verificação acima, um deploy com secret incorreto **falha no Actions** em vez de publicar silenciosamente — mas vale checar manualmente após qualquer mudança relacionada a `PROXY_URL` ou ao workflow.

---

## 2. Deploy do Cloudflare Worker

### Pré-requisitos

- Conta Cloudflare com Workers habilitado
- `wrangler` CLI instalado: `npm install -g wrangler`
- Autenticado: `wrangler login`

### Primeira vez

```bash
cd worker

# 1. Criar o namespace KV
wrangler kv namespace create RATE_LIMIT_KV
# Copiar o ID gerado e atualizar em wrangler.toml

# 2. Configurar a chave Anthropic como secret
wrangler secret put ANTHROPIC_KEY
# Digitar a chave quando solicitado

# 3. Deploy
wrangler deploy
```

### Deploys subsequentes (mudança de código)

```bash
cd worker
wrangler deploy
```

### Rotação de chave Anthropic

```bash
cd worker
wrangler secret put ANTHROPIC_KEY
# Zero downtime — secret atualizado sem redeploy
```

### Configuração (worker/wrangler.toml)

```toml
name               = "ensaio-proxy"
main               = "index.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id      = "9ae05cba8f26459b9563f3389646d0b0"
```

---

## 3. Executar localmente

```bash
# Na raiz do repositório
python3 -m http.server 9000
# Abrir http://localhost:9000
```

**Modo local:** `PROXY_URL` permanece como `__PROXY_URL__` → `isSharedMode()` retorna `false` → botão ⚙︎ fica visível e o usuário precisa fornecer sua própria chave Anthropic.

O modo demonstração funciona sem chave de API em qualquer ambiente.

---

## 4. Atualizar a URL do Worker

Se o Worker for recriado com outra URL:

1. Atualizar o secret `PROXY_URL` no GitHub:  
   `Settings → Secrets → Actions → PROXY_URL → Update`
2. Fazer um push qualquer em `main` para acionar re-deploy.

---

## 5. Rollback

**Frontend:** o GitHub Pages mantém histórico de deploys em `Actions`. Para reverter, abrir o workflow run anterior e clicar em `Re-run all jobs`.

**Worker:** não há rollback automático — é necessário redeploy manual com `wrangler deploy` usando a versão anterior do código.

---

## 6. Monitoramento

| Métrica | Onde monitorar |
|---|---|
| Requisições ao Worker | Cloudflare Dashboard → Workers → ensaio-proxy → Metrics |
| Rate limit hits (429) | Cloudflare Dashboard → Workers → Logs |
| Deploy do frontend | GitHub Actions → Pages Deploy log |

### Verificar rate limit KV

```bash
cd worker
wrangler kv key list --namespace-id 9ae05cba8f26459b9563f3389646d0b0
# Lista todas as chaves rl:{ip}:{date} ativas
```
