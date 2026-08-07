-- ============================================================================
-- ÉLANSTUDIO — promotions (discounts on one-time packages).
-- Apply AFTER 0012_location_timezone.sql.
--
-- A package price used to be a single number, so running a seasonal sale meant
-- editing the list price by hand and remembering to put it back. Promotions add
-- a discount layer on top: percent or fixed amount, optionally limited by date
-- window, by package, to first-time clients, and by redemption count.
--
-- Scope: one-time packages only. The monthly plan is billed through a Mercado
-- Pago preapproval with a fixed amount, so discounting only the first month
-- would need free_trial or a separate initial charge.
-- ============================================================================

create table if not exists public.promotions (
  id               uuid primary key default gen_random_uuid(),
  -- Shown to the customer next to the discounted price (e.g. "Buen Fin").
  name             text not null,
  -- null = applies on its own; set = the customer must type it at checkout.
  code             text,
  kind             text not null check (kind in ('percent','amount')),
  -- percent: 20 = 20% off. amount: 200 = $200 MXN off.
  value            numeric(10,2) not null check (value > 0),
  starts_at        timestamptz,   -- null = live immediately
  ends_at          timestamptz,   -- null = until deactivated
  new_clients_only boolean not null default false,
  max_redemptions  int check (max_redemptions is null or max_redemptions > 0),
  max_per_user     int check (max_per_user is null or max_per_user > 0),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Scope. No rows for a promotion = it applies to every one-time package.
create table if not exists public.promotion_packages (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  package_id   uuid not null references public.packages(id)   on delete cascade,
  primary key (promotion_id, package_id)
);

-- Codes are matched case-insensitively, so they must be unique that way too.
create unique index if not exists uniq_promotions_code
  on public.promotions (upper(code)) where code is not null;

create index if not exists idx_promotions_active on public.promotions(active);

-- ---------------------------------------------------------------------------
-- Redemption trail on purchases.
-- amount_mxn stays "what was actually charged" (already discounted), so the
-- revenue figures in /admin/pagos keep their meaning. discount_mxn records what
-- was given away, and promotion_id is what the usage caps are counted from.
-- ---------------------------------------------------------------------------
alter table public.purchases
  add column if not exists promotion_id uuid
    references public.promotions(id) on delete set null,
  add column if not exists discount_mxn numeric(10,2) not null default 0;

create index if not exists idx_purchases_promotion
  on public.purchases(promotion_id);

-- ---------------------------------------------------------------------------
-- RLS: admin-only, deliberately NOT publicly readable.
--
-- Every other catalog table grants `select using (true)`. Promotions must not:
-- the anon key is in the browser, so a public read policy would hand out the
-- full list of discount codes to anyone who opened devtools. All resolution
-- happens server-side through the service-role client, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.promotions enable row level security;
alter table public.promotion_packages enable row level security;

drop policy if exists promotions_admin on public.promotions;
create policy promotions_admin on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists promotion_packages_admin on public.promotion_packages;
create policy promotion_packages_admin on public.promotion_packages
  for all using (public.is_admin()) with check (public.is_admin());
