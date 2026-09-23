-- ============================================================================
-- ÉLANSTUDIO — clases especiales de pago forzoso.
-- Apply AFTER 0027_event_pricing.sql.
--
-- credit_cost = 0 significa que la clase NO se puede reservar con clases del
-- paquete ni con la mensualidad: solo pagando aparte. Por eso exige precio.
-- book_session la rechaza con 'pay_only'; el lugar entra únicamente por
-- book_paid_session, tras el cobro.
-- ============================================================================

alter table public.class_sessions
  drop constraint if exists class_sessions_credit_cost_check;
alter table public.class_sessions
  add constraint class_sessions_credit_cost_check
    check (credit_cost >= 0),
  add constraint class_sessions_pay_only_needs_price
    check (credit_cost > 0 or price_mxn is not null);

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
  v_starts timestamptz;
  v_count  int;
  v_bal    int;
  v_win    text;
  v_exp    timestamptz;
  v_cost   int;
  v_plan   boolean;
  v_sub    boolean;
begin
  if v_user is null then return 'auth'; end if;

  select capacity, status, starts_at, credit_cost, plan_included
    into v_cap, v_status, v_starts, v_cost, v_plan
  from public.class_sessions where id = p_session for update;
  if not found or v_status <> 'scheduled' then return 'closed'; end if;

  if exists (
    select 1 from public.bookings
    where user_id = v_user and session_id = p_session and status = 'confirmed'
  ) then return 'already'; end if;

  select count(*) into v_count from public.bookings
  where session_id = p_session and status = 'confirmed';

  v_win := public.booking_window(v_starts, v_count);
  if v_win <> 'open' then return v_win; end if;

  if v_count >= v_cap then return 'full'; end if;

  -- Pago forzoso: ni clases ni mensualidad. Solo por book_paid_session.
  if v_cost = 0 then return 'pay_only'; end if;

  v_sub := public.has_active_subscription(v_user);

  if v_sub and v_plan then
    insert into public.bookings (user_id, session_id, status)
    values (v_user, p_session, 'confirmed')
    on conflict (user_id, session_id) do update set status = 'confirmed';
    insert into public.credit_ledger (user_id, delta, reason, ref_id)
    values (v_user, 0, 'subscription', p_session);
    return 'ok';
  end if;

  select public.credit_balance(v_user) into v_bal;
  if v_bal < v_cost then
    if v_sub then return 'not_in_plan'; end if;
    if v_bal <= 0 then return 'no_credits'; end if;
    return 'not_enough';
  end if;

  v_exp := public.next_lot_expiry(v_user);

  insert into public.bookings (user_id, session_id, status)
  values (v_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';
  insert into public.credit_ledger (user_id, delta, reason, ref_id, expires_at)
  values (v_user, -v_cost, 'booking', p_session, v_exp);

  return 'ok';
end;
$$;

grant execute on function public.book_session(uuid) to authenticated;
