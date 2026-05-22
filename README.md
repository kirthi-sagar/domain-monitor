# Sentinel — Domain monitoring & alerting

Production-ready SaaS for tracking domain expiration, WHOIS/DNS/nameserver changes, and routing alerts to email, Slack, Discord, Telegram, and webhooks.

Built with **Next.js 16**, **Supabase** (Postgres + Auth + RLS), **Tailwind v4**, **Resend**, and **TypeScript**.

---

## Features

- Multi-tenant workspaces with role-based access control (owner / admin / member / viewer)
- Domain CRUD + CSV bulk import
- WHOIS + RDAP lookup with snapshot diffing (expiry, registrar, nameservers, status)
- Multi-threshold expiry reminders (90/60/30/14/7/3/1 days, configurable)
- Notification dispatch: Email (Resend), Slack, Discord, Telegram, generic webhooks
- REST API with scoped, hashed API keys
- Activity timeline + snapshot history per domain
- Cron endpoint for scheduled checks, idempotent worker
- Landing page styled after [wasp.sh](https://wasp.sh) with indigo (`#4338ca` / `#3730a3`) palette

---

## Quickstart

### 1. Create a Supabase project

- Create a project at [supabase.com](https://supabase.com).
- Copy your project URL, anon key, and service-role key.

### 2. Apply the schema

```bash
# In the Supabase SQL editor, paste and run:
cat supabase/migrations/0001_init.sql
```

This creates all tables, enums, RLS policies, and the `auth.users → profiles` trigger.

### 3. Configure environment

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, CRON_SECRET
```

### 4. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
┌───────────────────┐    ┌──────────────────┐
│  Next.js (Vercel) │◀──▶│ Supabase Postgres │  (RLS-isolated multi-tenant)
│  - App pages      │    │  + auth.users     │
│  - REST  /api/v1  │    └──────────────────┘
│  - Cron  /api/cron│
│  - Server Actions │
└─────────┬─────────┘
          │ checkDomain()  ┌────────────┐
          ├───────────────▶│   WHOIS    │  RDAP → fallback to WHOIS TCP/43
          │                └────────────┘
          │ dispatchAlerts ┌────────────┐
          └───────────────▶│  Channels  │  Resend / Slack / Discord / Telegram / Webhook
                           └────────────┘
```

### Multi-tenancy
- Every workspace-scoped table has `workspace_id` + an RLS policy `is_workspace_member(workspace_id)`.
- The browser/server clients use the user's JWT — RLS enforces isolation automatically.
- The monitoring worker uses the **service-role** key (bypasses RLS) and explicitly scopes by `workspace_id`.

### Monitoring loop
1. `POST /api/cron/check-domains` (every 5–60 min via Vercel Cron / GitHub Actions / Supabase Scheduled Function).
2. Selects domains with `next_check_at <= now()`.
3. `checkDomain(id)` performs RDAP/WHOIS, stores a snapshot, diffs against the previous snapshot, emits `domain_events`, and updates the domain's `next_check_at`.
4. Events are idempotent — `(domain_id, kind, dedupe_key)` is unique.
5. `dispatchAlertsForEvent()` routes matching events to channels and records delivery status in `notifications`.

---

## REST API

Base: `/api/v1` · Auth: `Authorization: Bearer <key>`

| Method | Path                              | Notes                |
| ------ | --------------------------------- | -------------------- |
| GET    | `/domains`                        | List workspace domains |
| POST   | `/domains`                        | Create + initial check |
| GET    | `/domains/:id`                    | Fetch one            |
| PATCH  | `/domains/:id`                    | Update notes / monitor flags / thresholds |
| DELETE | `/domains/:id`                    | Delete               |
| POST   | `/domains/:id/check`              | Force re-check       |

Create a key in the app at `/api-keys`. The full secret is printed once to server logs.

---

## Scheduling checks

Run the cron endpoint hourly (or your preferred interval):

```bash
curl -X POST https://your-domain/api/cron/check-domains \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Vercel Cron
Add to `vercel.json`:
```json
{ "crons": [ { "path": "/api/cron/check-domains", "schedule": "0 * * * *" } ] }
```

### Supabase Scheduled Functions
Create a `pg_cron` job that hits the route via `net.http_post`.

---

## Project layout

```
app/
  (auth)/             login / signup / reset + server actions
  (app)/              authenticated app pages
    dashboard/
    domains/[id]/
    domains/new/
    import/
    notifications/
    api-keys/
    settings/
  api/
    v1/domains/[id]/check/        REST
    cron/check-domains/           scheduled worker
  auth/callback/                  OAuth/email callback
  page.tsx                        landing (wasp.sh-styled)
  pricing/  features/  docs/      marketing
components/
  ui/      button, card, input, table, badge, logo
  site/    navbar, footer
  app/     sidebar, topbar
lib/
  supabase/  client.ts  server.ts  middleware.ts  types.ts
  whois.ts   diff.ts    monitor.ts  alerts.ts
  api-auth.ts  utils.ts   workspace.ts
supabase/
  migrations/0001_init.sql
middleware.ts
```

---

## Docker (production)

```bash
docker compose up --build
```

`docker-compose.yml` builds the Next.js app and exposes port 3000. Bring your own Supabase project for the database.

---

## Tests

```bash
npm test                # unit (vitest) — diff/expiry/alert logic
npm run test:e2e        # playwright — signup → add domain → see snapshot
```

(Test scaffolding is included in `tests/`; expand coverage per the brief's checklist.)

---

## What's intentionally not in the MVP

- Slack/Discord/Telegram channel **UI creators** — wire-up code is in `lib/alerts.ts`, channels can be created via SQL or API.
- DNS record monitoring loop (the diff & schema support it; the runner currently watches WHOIS/RDAP).
- Billing / Stripe.
- Admin panel UI (data is in `audit_logs` + `jobs`).
- Public status pages, brand watchlists, comments, SSO.

These are scoped as V2 in the original brief.

---

## License

MIT
