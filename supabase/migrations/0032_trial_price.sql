-- ============================================================================
-- ÉLANSTUDIO — la clase muestra puede tener precio.
-- Apply AFTER 0031_event_title.sql.
--
-- El admin decide si la clase muestra es gratis (precio vacío) o cuesta algo
-- (una clase de introducción a precio especial). Con precio, la alumna
-- elegible la paga con tarjeta o transferencia y el servidor reserva el
-- lugar con el asiento de 'trial', igual que la gratuita: consume la
-- muestra y la coach la ve como primera vez.
--
-- book_trial (gratis) se niega cuando hay precio: el lugar entra solo por
-- book_paid_session con reason 'trial', tras el cobro.
-- ============================================================================

alter table public.site_settings
  add column if not exists trial_class_price_mxn numeric(10,2)
    check (trial_class_price_mxn is null or trial_class_price_mxn > 0);

-- Una compra de purchases con session_id puede ser un lugar en una clase
-- especial (0027) o la clase muestra pagada.
alter table public.purchases
  add column if not exists trial boolean not null default false;

-- ---------------------------------------------------------------------------
-- Elegibilidad sin mirar quién pregunta: la usa el servidor (service role,
-- que no tiene auth.uid()) antes de cobrar. trial_eligible la envuelve con
-- la comprobación de identidad para la alumna.
-- ---------------------------------------------------------------------------
create or replace function public.trial_eligible_raw(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (
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

create or replace function public.trial_eligible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (p_user = auth.uid() or public.is_admin())
     and public.trial_eligible_raw(p_user);
$$;

-- Clase muestra gratuita. Igual a la de 0030, pero con precio definido se
-- niega: esa se paga.
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
  v_fee    numeric;
begin
  if v_user is null then return 'auth'; end if;

  select trial_class_enabled, trial_class_price_mxn into v_on, v_fee
  from public.site_settings where id = 1;
  if not coalesce(v_on, true) then return 'trial_off'; end if;
  if v_fee is not null and v_fee > 0 then return 'trial_paid'; end if;

  if not public.trial_eligible_raw(v_user) then return 'trial_used'; end if;

  select capacity, status, starts_at, credit_cost, price_mxn, plan_included
    into v_cap, v_status, v_starts, v_cost, v_price, v_plan
  from public.class_sessions where id = p_session for update;
  if not found or v_status <> 'scheduled' then return 'closed'; end if;

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

-- ---------------------------------------------------------------------------
-- Reservar un lugar pagado. Igual a la de 0027 más el motivo del asiento:
-- 'event_payment' (lugar en clase especial) o 'trial' (clase muestra
-- pagada). Se sustituye la firma de dos parámetros por una con valor por
-- defecto, así las llamadas existentes siguen igual.
-- ---------------------------------------------------------------------------
drop function if exists public.book_paid_session(uuid, uuid);

create or replace function public.book_paid_session(
  p_user    uuid,
  p_session uuid,
  p_reason  text default 'event_payment'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  if p_reason not in ('event_payment', 'trial') then return 'bad_reason'; end if;

  select status into v_status
  from public.class_sessions where id = p_session for update;
  if not found or v_status <> 'scheduled' then return 'closed'; end if;

  insert into public.bookings (user_id, session_id, status)
  values (p_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (p_user, 0, p_reason, p_session);

  return 'ok';
end;
$$;

revoke execute on function public.trial_eligible_raw(uuid)            from public, anon, authenticated;
grant  execute on function public.trial_eligible_raw(uuid)            to service_role;
grant  execute on function public.trial_eligible(uuid)                to authenticated;
grant  execute on function public.book_trial(uuid)                    to authenticated;
revoke execute on function public.book_paid_session(uuid, uuid, text) from public, anon, authenticated;
grant  execute on function public.book_paid_session(uuid, uuid, text) to service_role;
