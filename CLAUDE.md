# CLAUDE.md — Portal Sociedade Fênix

Guidance for Claude Code working in `angra/fenix`.

## 📌 Product spec (read this first)

**[`projetofenix.md`](./projetofenix.md)** is the canonical product vision for **Sociedade Fênix** —
a Brazilian portal for financial, legal and administrative recovery. Read it before making
product/UX/content decisions. Key points it fixes:

- **Positioning:** not a law firm, not a "robot lawyer", not a debt-eraser. It is a *personal
  recovery hub* that organizes the problem, finds the path, and accompanies the person. Opening
  question is **"O que está tirando o seu sono?"**, never "qual a natureza jurídica da sua demanda?".
- **Core promise:** *"Você não precisa enfrentar tudo isso sozinho."* Deliverable is the
  **Mapa de Recomeço** (diagnosis + plan for hoje / esta semana / este mês / depois da estabilização).
- **AI + lawyer model:** *A IA prepara. O advogado decide. O sistema executa.* Anything carrying
  legal responsibility is reviewed/approved by a lawyer via the **Botão Fênix** before execution.
- **AI agents (personas):** Clara (acolhimento), Farol (urgência/triagem), Atlas (finanças),
  Íris (documentos), Ponte (governo), Acordo (negociação), Vigia (prazos), Oficina (documentos
  jurídicos), Aurora (acompanhamento).
- **Automation bands:** verde (broad automation) · amarela (IA prepares, lawyer approves) ·
  vermelha (priority human handling). See §8.
- **Trust & compliance:** never sell data, never take creditor commissions, never hide a free
  public channel, never create artificial urgency, no invented jurisprudence. OAB separation:
  *Sociedade Fênix Tecnologia* (tech) vs *advocacia parceira* (legal). See §12–13, §15–17.
- **Revenue:** free entry · tech subscription (R$39/mês) · administrative packages (R$149) ·
  legal services contracted directly with the partner law firm · B2B2C.
- **Visual direction (§10):** shelter, reorganization, light after hardship — no gavel, scales,
  columns, brasões, black-and-gold, latin. Phoenix shown abstractly.

## What this folder is

Two things coexist here:

1. **This portal app** — a **Next.js (App Router) + React + TypeScript** implementation of the
   Sociedade Fênix design handoff in `portal-sociedade-f-nix/` (prototype:
   `portal-sociedade-f-nix/project/Sociedade Fênix.dc.html`). Runs on **port 3020**
   (`npm run dev`). Source lives in `app/`, `components/`, `lib/`; brand assets in `public/`.
2. **A LobeChat deployment env** — the `.env*` files (ports 3010/3015, Postgres, Redis, S3,
   SearXNG, `KEY_VAULTS_SECRET`, `AUTH_SECRET`). **Do not overwrite these**; the portal only
   reads the AI keys from them.

## Build plan

The implementation plan (phases, architecture, verification) is at
`~/.claude/plans/compressed-painting-falcon.md`. Master orchestration prompt: `promptgrok.md`.
Summary:
- **Phase 1** — pixel-faithful frontend of all 5 screens (landing, chat/Clara, urgente, painel do
  usuário, painel do advogado) with mock data.
- **Phase 2** — real Clara AI via `app/api/chat/route.ts`, provider-agnostic, **default Grok**
  (`AI_PROVIDER=grok`, `grok-4.3-latest`, xAI `https://api.x.ai/v1`); DeepSeek/OpenAI/Gemini/Qwen fallbacks.
- **Phase 3** — ✅ Auth.js (NextAuth v5) roles (`user` vs `advogado`) gating `/painel` and
  `/advogado`, with a branded `/login`. Demo accounts (Credentials provider, `lib/users.ts`;
  password `fenix123`): `marina@fenix.com.br` (user) and `leandro@fenix.com.br` (Dr. Leandro
  Giannasi, advogado). Config split: `auth.config.ts` (edge-safe) + `auth.ts` (Credentials);
  `middleware.ts` gates routes. `AUTH_SECRET` lives in `.env.development.local` (portal-only).
- **Phase 4** — ✅ Postgres (Drizzle) + Stripe Checkout.
  - **DB:** dedicated `fenix` database + role on the VPS Postgres (native, `127.0.0.1:5432`,
    localhost-only), separate from LobeChat. Schema in `lib/db/schema.ts` (users, subscriptions,
    debts, deadlines, documents, complaints, cases); migrations in `drizzle/`; seed `lib/db/seed.ts`
    (`npm run db:seed`). Repo layer `lib/repo.ts` reads from DB with **graceful fallback to the mock
    data** when `FENIX_DATABASE_URL` is unset/unreachable. Auth (`getUserForAuth`) and the dashboards
    (`getDashboard`, `getCases`) are DB-driven; verified reading real rows from the VPS.
  - Local dev has **no** `FENIX_DATABASE_URL` → runs on mocks. Production config is in
    `.env.production.local` (gitignored): `FENIX_DATABASE_URL=…@localhost:5432/fenix`,
    `AUTH_URL=https://fenix.angra.io`. To seed/migrate the VPS DB from a dev machine, open an SSH
    tunnel `-L 5433:127.0.0.1:5432` and point `FENIX_DATABASE_URL` at `127.0.0.1:5433`.
  - **Stripe:** `lib/stripe.ts` (null-safe), `POST /api/checkout` (Assinatura **R$ 99/mês** subscription;
    Pacote R$ 149 one-time), `POST /api/stripe/webhook` (records purchases via `recordSubscription`).
    The Assinatura CTA uses `components/PlanoCheckoutButton.tsx`. **Stripe keys are pending** — set
    `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`; until then checkout falls back to `/login`.
- **Phase 5 (Ondas 1–5 · promptgrok)** — ✅ Agentes + núcleos + plataforma base.
  - **`lib/agents/`** (todos com faixa + audit): Clara (chat) · Farol · Atlas · Íris · **Acordo** ·
    **Oficina** · **Ponte** · **Vigia** · **Aurora** · **Defensor** · **Superendividamento** · **Escudo**.
  - **APIs agentes:** `/api/agents/{farol,atlas,iris,acordo,oficina,ponte,vigia,aurora,defensor,super,escudo}`.
  - **Botão Fênix real:** `POST /api/fenix/button` (só `role=advogado`) + `lib/fenix-button.ts` + trilha
    `lib/audit.ts` (`GET /api/audit`). UI em `components/Advogado.tsx` com 6 ações.
  - **UI:** Painel + Recharts; `/nucleos` hub (super/acordo/defensor/ponte/escudo/oficina);
    `/privacidade` LGPD; `/urgente` Farol; Cofre Íris; `GET /api/health`; `POST /api/upload` (stub cofre).
  - **Íris PDF:** extração heurística de strings (PDF com texto); imagem → 422 até OCR dedicado.
  - **CI:** `.github/workflows/ci.yml` (typecheck + `test:agents` + build).
  - **Brand:** `public/brand/`. **Smoke:** `npm run test:agents`.
  - **Ainda futuro (não bloqueia MVP):** OCR de imagem (Tesseract/cloud), S3 cofre criptografado,
    envio real WhatsApp/e-mail do Vigia, 2FA TOTP, B2B2C multi-tenant, rede nacional de advogados.

## Deploy — ✅ NO AR em https://fenix.angra.io

Rodando na VPS (`root@62.171.181.241`), Postgres `localhost`. Padrão da casa: **nginx + pm2**.
- Código em `/opt/fenix` (enviado via `git archive main | scp`, `npm ci && npm run build`).
- App sob **pm2** como `fenix` na porta **3020** (`pm2 start npm --name fenix -- start`; `pm2 save`).
- Vhost `/etc/nginx/sites-available/fenix.angra.io` → `proxy_pass 127.0.0.1:3020` com
  `proxy_buffering off` (streaming da Clara). TLS via `certbot --nginx -d fenix.angra.io` (cert
  próprio em `/etc/letsencrypt/live/fenix.angra.io/`, renovação automática).
- Env de produção em `/opt/fenix/.env.production.local` (chmod 600, **não versionado**):
  `FENIX_DATABASE_URL=…@localhost:5432/fenix`, `AUTH_URL=https://fenix.angra.io`,
  `FENIX_AI_PROVIDER=deepseek` + `DEEPSEEK_API_KEY`, `AUTH_SECRET`.
- **Redeploy:** `git archive main | scp` → `/opt/fenix`, `npm ci && npm run build`, `pm2 reload fenix`.

Verificado em produção: landing 200, HTTP→HTTPS 301, `/painel` e `/advogado` com gating por papel
(auth lendo do Postgres), Clara real (DeepSeek) em streaming via proxy. Stripe pendente de keys.

Remote git: `github.com/alceupassos/fenix` (branch `main`, commits como alceupassos@gmail.com).

## Conventions

- **Fidelity first:** colors, gradients, radii and the `fx*` keyframes are ported 1:1 from the
  prototype into `app/globals.css` tokens. Fonts: Bricolage Grotesque (display) + Plus Jakarta
  Sans (body) via `next/font`. Icons: inline Lucide SVG registry in `components/Icon.tsx`.
- **Portuguese copy is product content** — keep it verbatim from the prototype/spec, including the
  legal disclaimers (OAB, "não substitui advogado", free-public-channel notice).
- **Never print or commit secrets** from `.env*`.

## Environment

Windows 11 + PowerShell. The Bash tool (Git Bash) is also available for POSIX scripts.
