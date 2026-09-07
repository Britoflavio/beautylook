# BeautyBook — Agent Guide

Booking + deposits MVP for beauty professionals (Argentina). No AI in this phase.
UI language: **es-AR**. Currency: **ARS**. Timezone: **America/Argentina/Buenos_Aires** (UTC-3, no DST); store all timestamps as UTC `timestamptz`.

## Commands

```bash
npm run dev          # next dev (turbopack)
npm run build        # production build
npm run lint        # eslint (run before finishing any task)
npm run typecheck    # tsc --noEmit (run before finishing any task)
npm test             # vitest run (unit tests live next to the code as *.test.ts)

npx supabase start   # local supabase stack (db + auth + studio, needs docker)
npx supabase db reset # recreate local db applying all migrations + seed
npx supabase db push  # push migrations to the linked remote project
```

Migrations live in `supabase/migrations/`. Create with `npx supabase migration new <name>`. Never edit an applied migration; add a new one.

## Architecture

- Next.js 15 App Router + TS. Server Components by default; `"use client"` only for interactivity.
- Supabase: Postgres + Auth + RLS. Three clients in `src/lib/supabase/`: `client.ts` (browser), `server.ts` (cookie-based, RLS-enforced), `admin.ts` (service role, **server-only**, never import from client code).
- All anonymous access (public landing, booking creation, slot listing, client status page) goes through SECURITY DEFINER RPCs — no RLS policies for `anon` on base tables (default deny).
- Business invariants live in the DB: `UNIQUE(slug)`, `EXCLUDE USING gist` on booking time ranges, `payment_events.payment_id` idempotency. Application code never re-implements them as the only line of defense.
- Mercado Pago: Checkout Pro preferences created server-side with the professional's own OAuth token (AES-256-GCM encrypted at rest, `src/lib/crypto.ts`). Webhook at `/api/webhooks/mercadopago` validates the MP `x-signature` HMAC and is idempotent.
- Booking statuses: `held -> pending_payment -> confirmed | cancelled`. Hold window 25 min; expired holds released by pg_cron every 2 min.
- Env: see `.env.example`. Never commit `.env*`.

## Conventions

- No code comments unless asked.
- Components: shadcn/ui in `src/components/ui` (generated), app components in `src/components/<domain>/`.
- Money: `numeric(10,2)` in DB; strings ("5000.00") in JS to avoid float errors; format with `Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })`.
- Dates: pass ISO UTC strings between client and server; convert to AR time only at render boundaries via `src/lib/time.ts` helpers.
