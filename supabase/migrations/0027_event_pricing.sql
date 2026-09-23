-- ============================================================================
-- ÉLANSTUDIO — clases especiales con costo propio.
-- Apply AFTER 0026_credit_balances.sql.
--
-- Un evento único (taller, masterclass, clase con invitada) puede valer más
-- que una clase normal. El admin lo define al crearlo, con tres piezas que
-- se combinan:
--
--   · credit_cost   Cuántas clases del paquete descuenta (1 = clase normal).
--   · price_mxn     Precio para pagarla aparte, con tarjeta o transferencia.
--                   Null = solo se paga con clases. Si está, la alumna elige:
--                   gasta sus clases o paga el precio.
--   · plan_included Si la mensualidad ilimitada la cubre. Sin marcar, a quien
--                   tiene mensualidad se le avisa «no se incluye en tu plan»
--                   y la paga aparte o con clases de un paquete.
--
-- Las sesiones de la plantilla semanal nacen con los valores por defecto
-- (1 clase, sin precio, incluida), así que nada cambia para ellas.
--
-- Un pago aparte es una fila en purchases con session_id en lugar de
-- package_id y credits = 0: no acredita clases, reserva el lugar. La reserva
-- deja un asiento de 0 en el ledger con reason 'event_payment' para que al
-- cancelar no se devuelva ninguna clase (el dinero se devuelve a mano).
-- ============================================================================

alter table public.class_sessions
  add column if not exists credit_cost   int not null default 1
    check (credit_cost >= 1),
  add column if not exists price_mxn     numeric(10,2)
    check (price_mxn is null or price_mxn > 0),
  add column if not exists plan_included boolean not null default true;

alter table public.purchases
  add column if not exists session_id uuid references public.class_sessions(id) on delete set null;

create index if not exists idx_purchases_session
  on public.purchases(session_id)
  where session_id is not null;

-- ---------------------------------------------------------------------------
-- Reservar con clases. Igual a la de 0024 salvo que descuenta credit_cost
-- y que la mensualidad solo cubre las clases incluidas en el plan.
--
-- Cuando el costo abarca más de un lote, el asiento anota el vencimiento del
-- lote que vence antes; la devolución vuelve entera con ese vencimiento.
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

  v_sub := public.has_active_subscription(v_user);

  -- Mensualidad activa y clase incluida: reserva sin gastar (asiento de 0).
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

  -- Antes de escribir el cargo, para que el cálculo vea el saldo tal cual está.
  v_exp := public.next_lot_expiry(v_user);

  insert into public.bookings (user_id, session_id, status)
  values (v_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';
  insert into public.credit_ledger (user_id, delta, reason, ref_id, expires_at)
  values (v_user, -v_cost, 'booking', p_session, v_exp);

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservar un lugar ya pagado aparte. La llama el servidor (service role)
-- cuando Mercado Pago aprueba el cobro o cuando la alumna sube su
-- comprobante de transferencia; nunca la alumna directamente.
--
-- No mira el cupo ni la ventana: el cobro ya se hizo y eso se revisó antes
-- de cobrar. Si en el instante entre una cosa y otra alguien tomó el último
-- lugar, es mejor un lugar de más que una alumna que pagó y no tiene clase.
-- Idempotente: reservar dos veces deja una sola reserva.
-- ---------------------------------------------------------------------------
create or replace function public.book_paid_session(p_user uuid, p_session uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_status text;
begin
  select status into v_status
  from public.class_sessions where id = p_session for update;
  if not found or v_status <> 'scheduled' then return 'closed'; end if;

  insert into public.bookings (user_id, session_id, status)
  values (p_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';

  -- Asiento de 0: refund_booking_credit lo encuentra y no devuelve clases.
  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (p_user, 0, 'event_payment', p_session);

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Devolución. Igual a la de 0024, pero también reconoce el asiento de un
-- lugar pagado aparte: sin él, una reserva pagada con dinero parecería
-- anterior al ledger y devolvería una clase que nunca se gastó.
-- ---------------------------------------------------------------------------
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
    and cl.reason in ('booking', 'subscription', 'event_payment')
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

revoke execute on function public.book_paid_session(uuid, uuid)     from public, anon, authenticated;
grant  execute on function public.book_paid_session(uuid, uuid)     to service_role;
revoke execute on function public.refund_booking_credit(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.book_session(uuid)                to authenticated;
