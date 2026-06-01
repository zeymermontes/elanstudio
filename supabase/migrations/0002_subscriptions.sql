-- ============================================================================
-- ÉLANSTUDIO — subscriptions (Mercado Pago preapproval) for the unlimited plan
-- Apply AFTER 0001_init.sql.
-- ============================================================================

-- Mark which packages are recurring subscriptions vs one-time purchases.
alter table public.packages
  add column if not exists recurring boolean not null default false;

-- The monthly unlimited plan is a subscription.
update public.packages set recurring = true
where name ilike '%ilimitad%';

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  package_id         uuid references public.packages(id) on delete set null,
  mp_preapproval_id  text,
  status             text not null default 'pending'
                       check (status in ('pending','authorized','paused','cancelled')),
  current_period_end timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_mp on public.subscriptions(mp_preapproval_id);

alter table public.subscriptions enable row level security;

-- Members read their own; admins read all. Writes happen via the service role
-- (subscription webhook), which bypasses RLS.
drop policy if exists subscriptions_self_read on public.subscriptions;
create policy subscriptions_self_read on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- Is there an active (authorized, not expired) subscription for a user?
create or replace function public.has_active_subscription(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.status = 'authorized'
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;
grant execute on function public.has_active_subscription(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Booking honors an active subscription (book without spending credits).
-- Replaces the 0001 version.
-- ---------------------------------------------------------------------------
create or replace function public.book_session(p_session uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_cap    int;
  v_status text;
  v_count  int;
  v_bal    int;
begin
  if v_user is null then return 'auth'; end if;

  select capacity, status into v_cap, v_status
  from public.class_sessions where id = p_session for update;
  if not found or v_status <> 'scheduled' then return 'closed'; end if;

  if exists (
    select 1 from public.bookings
    where user_id = v_user and session_id = p_session and status = 'confirmed'
  ) then return 'already'; end if;

  select count(*) into v_count from public.bookings
  where session_id = p_session and status = 'confirmed';
  if v_count >= v_cap then return 'full'; end if;

  -- Active subscriber: book without consuming a credit (0-delta ledger entry).
  if public.has_active_subscription(v_user) then
    insert into public.bookings (user_id, session_id, status)
    values (v_user, p_session, 'confirmed')
    on conflict (user_id, session_id) do update set status = 'confirmed';
    insert into public.credit_ledger (user_id, delta, reason, ref_id)
    values (v_user, 0, 'subscription', p_session);
    return 'ok';
  end if;

  -- Otherwise require credits.
  select public.credit_balance(v_user) into v_bal;
  if v_bal <= 0 then return 'no_credits'; end if;

  insert into public.bookings (user_id, session_id, status)
  values (v_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';
  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (v_user, -1, 'booking', p_session);

  return 'ok';
end;
$$;

-- A purchase can credit the ledger at most once (idempotency across the
-- embedded-payment API and the webhook).
create unique index if not exists uniq_ledger_purchase
  on public.credit_ledger(ref_id) where reason = 'purchase';

-- Realtime for the admin dashboard (subscriptions activity), best-effort.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public'
         and tablename = 'subscriptions'
     )
  then
    execute 'alter publication supabase_realtime add table public.subscriptions';
  end if;
end $$;
