-- ============================================================================
-- ÉLANSTUDIO — credit expiry. Apply AFTER 0003_attendance.sql.
-- Positive credit grants can carry an expiry date; the balance respects it.
-- ============================================================================

alter table public.credit_ledger
  add column if not exists expires_at timestamptz;

-- Expiry-aware balance (FIFO): consumption draws down the soonest-to-expire
-- grants first; only the non-expired remainder counts toward the balance, so
-- expired credits drop off automatically. Replaces the 0001 version.
create or replace function public.credit_balance(p_user uuid)
returns int
language plpgsql
stable
set search_path = public
as $$
declare
  consumed int;
  rem      int;
  lot      record;
  lot_left int;
  avail    int := 0;
begin
  -- Total consumed so far (negative deltas), as a positive number.
  select coalesce(-sum(delta), 0)::int into consumed
  from public.credit_ledger
  where user_id = p_user and delta < 0;
  rem := consumed;

  -- Walk positive grants, soonest-expiring first, applying consumption.
  for lot in
    select delta, expires_at
    from public.credit_ledger
    where user_id = p_user and delta > 0
    order by expires_at asc nulls last, created_at asc
  loop
    if rem >= lot.delta then
      rem := rem - lot.delta;            -- this grant fully consumed
    else
      lot_left := lot.delta - rem;       -- remainder of this grant
      rem := 0;
      if lot.expires_at is null or lot.expires_at > now() then
        avail := avail + lot_left;       -- counts only if not expired
      end if;
    end if;
  end loop;

  return avail;
end;
$$;

grant execute on function public.credit_balance(uuid) to authenticated;
