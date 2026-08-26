-- ============================================================================
-- ÉLANSTUDIO — limited-run packages ("solo los primeros 20").
-- Apply AFTER 0015_payment_status_detail.sql.
--
-- A launch offer capped at N buyers used to mean watching /admin/pagos and
-- flipping the package to inactive by hand the moment the count was reached —
-- which always happened late, so the 21st person could still buy. The cap now
-- lives on the package and is enforced everywhere a charge starts.
--
-- stock_limit null = no cap (every package today). Setting it turns the cap on;
-- clearing it turns it off, which is the admin's on/off switch.
--
-- show_stock_left is separate on purpose: an admin may want the scarcity
-- enforced without announcing "quedan 2" on the site.
-- ============================================================================

alter table public.packages
  add column if not exists stock_limit int
    check (stock_limit is null or stock_limit > 0),
  add column if not exists show_stock_left boolean not null default false;

-- Sold counts are read per package on every /paquetes render and before every
-- charge; both tables are only indexed by user today.
create index if not exists idx_purchases_package
  on public.purchases(package_id);
create index if not exists idx_subscriptions_package
  on public.subscriptions(package_id);
