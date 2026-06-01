# ÉLANSTUDIO — Setup

Boutique studio website: public site (clases, paquetes, coaches, ubicaciones,
reserva + pago) and an admin to manage it all. Built with Next.js 16, Tailwind
v4, Supabase, and Mercado Pago.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

The site **runs with no backend** — pages render from seed data in
`src/lib/seed.ts` until you configure Supabase.

> Tip: `npm run dev` uses Turbopack and watches only this folder (pinned via
> `turbopack.root` in `next.config.ts`). Press `Ctrl+C` to stop and free RAM.

## Enable the backend (Supabase)

1. Create a project at https://supabase.com.
2. In the **SQL editor**, run the migrations in order:
   - `supabase/migrations/0001_init.sql` — tables, RLS, booking RPCs, and seed
     content (services, classes, coaches, locations, packages, a week of sessions).
   - `supabase/migrations/0002_subscriptions.sql` — the monthly subscription
     support (subscriptions table, `recurring` flag, subscription-aware booking).
3. Copy `.env.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API — server-only secret)
4. Make yourself admin: after signing up in the app, run in the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where id = (
     select id from auth.users where email = 'you@example.com'
   );
   ```

## Enable payments (Mercado Pago)

1. Get **TEST** credentials at https://www.mercadopago.com.mx/developers.
2. Add to `.env.local`: `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY`.
3. Set `NEXT_PUBLIC_SITE_URL` (local: `http://localhost:3000`).
4. One-time package payments use the **embedded Card Payment Brick** (in-page).
   The monthly unlimited plan uses **Suscripciones (preapproval)** — a one-time
   hosted authorization, then automatic monthly billing.
5. Register the webhook URL `${SITE_URL}/api/mp/webhook` in your MP integration,
   subscribed to **payment** and **subscription** events. (Subscriptions can't
   reach `localhost`; use a tunnel like ngrok to test locally.)

## Deploy (Render)

Deploy as a **Web Service** (Node), not a static site — the app has API routes
(Mercado Pago webhook, server actions).

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Add all `.env.local` values as Render environment variables, and set
  `NEXT_PUBLIC_SITE_URL` to the Render URL.
