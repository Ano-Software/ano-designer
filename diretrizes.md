Vou **incorporar VS Code + “Codex” (extensão de IA no VS Code)** e **GitHub com CI/CD** diretamente na **Fase 1** do protocolo. Nada de código da aplicação em si — só **setup, ferramentas e automações**.

# Fase 1 — Preparação e contratação de serviços (atualizada)

**Objetivo:** deixar tudo pronto para desenvolver confortável no VS Code, versionar no GitHub, publicar via Vercel e usar Supabase com segurança.

## 0) Pré-requisitos locais (VS Code + Node)

- **Node LTS** (via nvm): instale LTS e defina como padrão.
- **Gerenciador de pacotes:** `pnpm` (recomendado) ou `npm/yarn`.
- **VS Code** instalado e sincronização de settings ativa.

### Extensões VS Code (recomendadas)

- **IA**: a extensão que você chama de “Codex” (a sua preferida), e opcional **GitHub Copilot**.
- **Qualidade**: ESLint, Prettier, EditorConfig, Error Lens.
- **Front**: Tailwind CSS IntelliSense, PostCSS, SVG Preview.
- **DB/Cloud**: Supabase (oficial), REST Client, Thunder Client (teste de APIs).
- **GitHub**: GitHub Pull Requests & Issues, **GitLens**, **Git Graph**.
- **Utilitárias**: dotenv, Path Intellisense, Import Cost.

### Convenções do workspace

- **.editorconfig** (2 espaços, LF, UTF-8).
- **Prettier** como formatador padrão; ESLint “fix on save”.
- **VS Code Tasks** (dev, lint, test) e **Launch Config** (debug local) — deixaremos prontos quando iniciar o projeto.
- **Dev Containers** (opcional): Docker com Node + pnpm + Supabase CLI para ambiente padronizado.

**Critérios de aceite:** VS Code abre o repo, formatação e lint funcionam “on save”, extensão de IA está ativa e sugerindo.

---

## 1) GitHub — repositório, padrão e proteção

- **Repositório:** monorepo (`apps/web`, `packages/ui`, `packages/db`, `packages/utils`).
- **Branches:** `main` (produção), `staging` (homolog), `dev` (integração).
- **Proteções:**
  - PR obrigatório para `main` e `staging` (mín. 1 review).
  - _Status checks_ obrigatórios (CI deve passar).
  - **Squash & merge** (histórico limpo).

- **Templates:**
  - **Issue templates** (bug/feature/task).
  - **PR template** (escopo, testes, checklist).
  - **CODEOWNERS** (você como owner; opcional revisores).

- **Versionamento e commits:**
  - **Conventional Commits** (feat/fix/chore…).
  - **Husky + lint-staged** para rodar ESLint/Prettier no **pre-commit**.
  - (Opcional) **Commitlint** para validar mensagem de commit.

**Critérios de aceite:** PRs exigem review, CI roda nos PRs, hooks de pre-commit ativos.

---

## 2) Vercel — projetos e integração GitHub

- **Três projetos**: `app-dev`, `app-staging`, `app-prod`.
- **Integração GitHub:** deploy preview por PR; `main` ⇒ prod, `staging` ⇒ stg, `dev` ⇒ dev.
- **Variáveis de ambiente** por ambiente (ver item 5).
- **Otimização de imagens** e domínios confiáveis para backgrounds/ícones.

**Critérios:** cada PR gera preview; merges em branches corretas disparam deploy no ambiente certo.

---

## 3) Supabase — Auth, DB, Storage, RLS e backups

- **Projetos:** `dev`, `staging`, `prod`.
- **Auth:** e-mail/senha, link mágico; templates de e-mail com brand.
- **DB (Postgres):** criar **schemas** e **índices** planejados (accounts, memberships, profiles, pages, page_versions, views, clicks, plans, subscriptions, invoices, audits).
- **Storage:** buckets `public-assets`, `audio`, `uploads`; políticas de leitura/escrita por **plano**.
- **RLS:** políticas por `account_id` (multi-tenant seguro); `plans` público.
- **Backups:** snapshot diário ativo (retenção 7–14 dias).
- **CLI:** Supabase CLI instalado localmente para **mutações/migrations** (serão executadas depois, na Fase 2).

**Critérios:** sign-up/sign-in/reset funcionando; RLS impede acesso entre contas; upload funcionando com regras certas.

---

## 4) Pagamentos — Stripe **ou** Mercado Pago

- **Escolher provedor** (recomendo Stripe pela maturidade de assinaturas; Mercado Pago ok se preferir BR puro).
- **Produtos/Planos:** FREE, PRO, BUSINESS (mensal/anual).
- **Portal do cliente (Stripe)** habilitado.
- **Webhooks (sandbox):** criar _endpoint_ (iremos implementar depois), gerar **secret**, salvar nos ambientes.
- **Testes sandbox:** criar uma assinatura de teste até o “checkout completed”.

**Critérios:** plano e webhook configurados no provedor; credenciais seguras, _events_ chegam (a rota será criada na Fase 2).

---

## 5) Segredos e variáveis de ambiente

- **Cofre** (1Password/Bitwarden) com acesso restrito.
- **Arquivos `.env`** separados para `dev`, `staging`, `prod` (nunca commitar):
  - SUPABASE_URL / SUPABASE_ANON_KEY / SERVICE_ROLE (apenas server).
  - STRIPE/MERCADO_PAGO keys + WEBHOOK_SECRET.
  - NEXT_PUBLIC\_\* (somente o que pode estar no cliente).

- **Vercel Env**: replicar as variáveis em cada ambiente.

**Critérios:** nenhum segredo no Git; app local lê `.env.local`; Vercel tem envs por ambiente.

---

## 6) E-mail transacional e domínio

- **Provider:** Resend/Sendgrid (boas-vindas, reset, faturas).
- **SPF/DKIM/DMARC**: DNS configurado e verificado.

**Critérios:** e-mails chegam em inbox (sem spam) e templates padronizados.

---

## 7) Observabilidade e políticas

- **Sentry** para web e (futuro) server; **Supabase logs** ativados.
- **PostHog** (opcional) para métricas de produto (sem PII).
- **LGPD**: política de privacidade e termos (analytics com `ip_hash`, sem PII).
- **Runbooks**: restauração de backup, rotação de chaves, resposta a incidente.

**Saída da Fase 1 (com VS Code & GitHub integrados):**

- VS Code pronto com extensões e padrões; hooks de qualidade ativos.
- Repositório GitHub com **proteção de branches**, **CI inicial** ligado ao Vercel.
- Supabase/Auth/Storage/RLS/Backups prontos.
- Provedor de pagamentos configurado (produtos e webhook).
- E-mail transacional e DNS autenticado.
- Segredos centralizados e envs por ambiente na Vercel.

---

# Fase 2 — Implementação (resumo, sem código)

_(igual te passei antes; segue a ordem de sprints — shell do app, dashboard, CRUD de páginas, editor e temas, publicação e versões, billing, analytics, settings/domínio, áudio/presets/acessibilidade)._

---

## Plus: CI/CD e automações que facilitam tua vida (recomendado)

- **GitHub Actions** (ou Vercel/GitHub integração nativa):
  - **CI**: instalar deps, **lint**, **typecheck**, **test** nos PRs.
  - **Preview**: Vercel linka automaticamente no PR.
  - **Migrations**: job manual de “promover” migrations do `staging` para `prod` via Supabase CLI (quando estiverem prontas).

- **Qualidade automática**:
  - **Husky + lint-staged**: ESLint/Prettier antes de cada commit.
  - **Commitlint** (opcional) para Conventional Commits.

- **Padrão de branches**:
  - `feat/…`, `fix/…`, `chore/…` a partir de `dev`.
  - Merge para `staging` para validar em ambiente real; depois para `main`.

---

## Checklist rápido para você executar agora (ordem sugerida)

1. Instalar Node LTS, pnpm, VS Code + extensões listadas.
2. Criar repo no GitHub (monorepo) e ativar proteções/PR template/CODEOWNERS.
3. Criar 3 projetos na **Vercel** e conectar ao GitHub (dev/staging/prod).
4. Criar 3 projetos no **Supabase** e ativar Auth/Storage/Backups.
5. Configurar **Stripe** (ou **Mercado Pago**) com planos e webhook.
6. Configurar **Resend/Sendgrid** + SPF/DKIM no domínio.
7. Centralizar segredos (.env e Vercel Env) no cofre.
8. Ativar **Sentry** (captura básica) e revisar logs do Supabase.
9. Confirmar: PR abre preview na Vercel; variáveis carregam; sign-up/sign-in/reset funcionam (teste mínimo com uma página placeholder depois, já na Fase 2).

Se quiser, eu converto estes passos em **tarefas de Kanban** (com checkboxes e responsáveis) num formato pronto para colar no **Notion/Trello** — é só dizer que eu já te entrego a lista organizada por coluna (Backlog → Doing → Review → Done).
