-- ============================================================================
-- ÉLANSTUDIO — clase muestra.
-- Apply AFTER 0029_admin_cancel_booking.sql.
--
-- Quien nunca ha tenido una clase —ni comprada, ni regalada, ni por
-- mensualidad— puede reservar UNA clase sin costo para conocer el estudio.
-- Hace falta cuenta: la reserva pasa por auth.uid() como cualquier otra.
--
-- Elegible = sin abonos en el ledger (delta > 0), sin mensualidad alguna y
-- sin una clase muestra vigente o tomada. Cancelarla con tiempo la libera:
-- el asiento de 'trial' queda huérfano de reserva confirmada y vuelve a
-- ser elegible.
--
-- Solo aplica a clases normales (1 clase, sin precio aparte, incluida en el
-- plan): un taller de pago no se regala. Se activa o apaga desde Ajustes.
-- ============================================================================

alter table public.site_settings
  add column if not exists trial_class_enabled boolean not null default true;

create or replace function public.trial_eligible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Solo sobre una misma (o el admin sobre cualquiera).
    (p_user = auth.uid() or public.is_admin())
    and not exists (
      select 1 from public.credit_ledger cl
      where cl.user_id = p_user and cl.delta > 0
    )
    and not exists (
      select 1 from public.subscriptions s
      where s.user_id = p_user and s.status in ('authorized', 'paused', 'cancelled')
    )
    and not exists (
      select 1
      from public.credit_ledger cl
      join public.bookings b
        on b.user_id = cl.user_id and b.session_id = cl.ref_id
      where cl.user_id = p_user and cl.reason = 'trial' and b.status = 'confirmed'
    );
$$;

create or replace function public.book_trial(p_session uuid)
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
  v_win    text;
  v_cost   int;
  v_price  numeric;
  v_plan   boolean;
  v_on     boolean;
begin
  if v_user is null then return 'auth'; end if;

  select trial_class_enabled into v_on from public.site_settings where id = 1;
  if not coalesce(v_on, true) then return 'trial_off'; end if;

  if not public.trial_eligible(v_user) then return 'trial_used'; end if;

  select capacity, status, starts_at, credit_cost, price_mxn, plan_included
    into v_cap, v_status, v_starts, v_cost, v_price, v_plan
  from public.class_sessions where id = p_session for update;
  if not found or v_status <> 'scheduled' then return 'closed'; end if;

  -- La muestra es para una clase normal, no para una especial.
  if v_cost <> 1 or v_price is not null or not v_plan then return 'no_trial'; end if;

  if exists (
    select 1 from public.bookings
    where user_id = v_user and session_id = p_session and status = 'confirmed'
  ) then return 'already'; end if;

  select count(*) into v_count from public.bookings
  where session_id = p_session and status = 'confirmed';

  v_win := public.booking_window(v_starts, v_count);
  if v_win <> 'open' then return v_win; end if;

  if v_count >= v_cap then return 'full'; end if;

  insert into public.bookings (user_id, session_id, status)
  values (v_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';
  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (v_user, 0, 'trial', p_session);

  return 'ok';
end;
$$;

-- Clase muestra en un hueco de la plantilla semanal. Espejo de book_class.
create or replace function public.book_trial_class(p_weekly uuid, p_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_starts timestamptz; v_win text;
begin
  select id into v_id from public.class_sessions
  where weekly_class_id = p_weekly and session_date = p_date;

  if v_id is null then
    v_starts := public.weekly_starts_at(p_weekly, p_date);
    if v_starts is null then return 'closed'; end if;
    v_win := public.booking_window(v_starts, 0);
    if v_win <> 'open' then return v_win; end if;
  end if;

  v_id := public.materialize_session(p_weekly, p_date);
  if v_id is null then return 'closed'; end if;
  return public.book_trial(v_id);
end;
$$;

-- Devolución: el asiento de la clase muestra también cuenta (0 → nada que
-- devolver), como el de la mensualidad o el del lugar pagado aparte.
create or replace function public.refund_booking_credit(p_user uuid, p_session uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta int;
  v_exp   timestamptz;
begin
  select cl.delta, cl.expires_at into v_delta, v_exp
  from public.credit_ledger cl
  where cl.user_id = p_user and cl.ref_id = p_session
    and cl.reason in ('booking', 'subscription', 'event_payment', 'trial')
  order by cl.created_at desc
  limit 1;

  if not found then
    v_delta := -1;
    v_exp := null;
  end if;

  if v_delta < 0 then
    insert into public.credit_ledger (user_id, delta, reason, ref_id, expires_at)
    values (p_user, -v_delta, 'refund', p_session, v_exp);
  end if;
end;
$$;

grant execute on function public.trial_eligible(uuid)           to authenticated;
grant execute on function public.book_trial(uuid)               to authenticated;
grant execute on function public.book_trial_class(uuid, date)   to authenticated;
revoke execute on function public.refund_booking_credit(uuid, uuid) from public, anon, authenticated;
