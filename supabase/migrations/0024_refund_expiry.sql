-- ============================================================================
-- ÉLANSTUDIO — el crédito devuelto vence cuando vencía el que se gastó, y el
-- saldo deja de cargar reservas a paquetes ya vencidos.
-- Apply AFTER 0023_booking_window_1h.sql.
--
-- Dos cosas, ligadas:
--
-- 1) Devoluciones. Al cancelar (la alumna con más de 12 h, o el estudio la
--    clase entera) se devolvía un crédito sin vencimiento. Ahora el asiento
--    de -1 de la reserva anota el vencimiento del lote del que sale, y el +1
--    de la devolución lo copia. Si ese lote ya venció, el crédito vuelve
--    vencido: es el mismo crédito, no uno nuevo. Una reserva con suscripción
--    no gastó crédito (asiento de 0), así que tampoco devuelve ninguno.
--    Reservas anteriores a esta migración no traen vencimiento anotado; su
--    devolución sigue sin vencer, como hasta ahora.
--
-- 2) Saldo. credit_balance (0004) repartía el consumo total entre los lotes
--    por orden de vencimiento sin mirar CUÁNDO se hizo cada reserva. Un
--    paquete vencido con clases sin usar absorbía las reservas posteriores:
--    la alumna reservaba y el saldo no bajaba hasta agotar las vencidas.
--    Ahora el ledger se reproduce en orden: cada reserva descuenta del lote
--    que vence antes de los que estaban vigentes EN ESE MOMENTO. Lo que sobra
--    de un paquete al vencer, se pierde de verdad.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Lotes con saldo de una alumna tras reproducir su ledger en orden.
-- Cada abono (delta > 0) abre un lote con su vencimiento; cada cargo (delta
-- < 0) descuenta del lote vigente en su fecha que venza antes. Un cargo sin
-- lote vigente (ajuste manual en negativo, datos viejos) descuenta del que
-- haya. Base de credit_balance y next_lot_expiry.
-- ---------------------------------------------------------------------------
create or replace function public.credit_lots(p_user uuid)
returns table (expires_at timestamptz, remaining int)
language plpgsql
stable
set search_path = public
as $$
declare
  e      record;
  l_exp  timestamptz[] := '{}';
  l_left int[]         := '{}';
  n      int;
  i      int;
  best   int;
  rem    int;
  take   int;
begin
  for e in
    select cl.delta, cl.expires_at as exp, cl.created_at
    from public.credit_ledger cl
    where cl.user_id = p_user and cl.delta <> 0
    order by cl.created_at, cl.delta desc   -- a igual instante, primero el abono
  loop
    if e.delta > 0 then
      l_exp  := array_append(l_exp, e.exp);
      l_left := array_append(l_left, e.delta);
      continue;
    end if;

    rem := -e.delta;
    n := coalesce(array_length(l_left, 1), 0);
    while rem > 0 loop
      best := null;
      for i in 1..n loop
        if l_left[i] > 0 and (l_exp[i] is null or l_exp[i] > e.created_at) then
          if best is null
             or (l_exp[i] is not null and (l_exp[best] is null or l_exp[i] < l_exp[best]))
          then best := i; end if;
        end if;
      end loop;
      if best is null then
        for i in 1..n loop
          if l_left[i] > 0 then best := i; exit; end if;
        end loop;
      end if;
      exit when best is null;   -- nada de dónde descontar
      take := least(rem, l_left[best]);
      l_left[best] := l_left[best] - take;
      rem := rem - take;
    end loop;
  end loop;

  n := coalesce(array_length(l_left, 1), 0);
  for i in 1..n loop
    if l_left[i] > 0 then
      expires_at := l_exp[i];
      remaining  := l_left[i];
      return next;
    end if;
  end loop;
end;
$$;

-- Saldo disponible hoy: lo que queda de los lotes que siguen vigentes.
create or replace function public.credit_balance(p_user uuid)
returns int
language plpgsql
stable
set search_path = public
as $$
declare v int;
begin
  select coalesce(sum(remaining), 0)::int into v
  from public.credit_lots(p_user) l
  where l.expires_at is null or l.expires_at > now();
  return v;
end;
$$;

-- Vencimiento del lote que gastaría la próxima reserva (null = no vence, o
-- no hay saldo).
create or replace function public.next_lot_expiry(p_user uuid)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare v timestamptz;
begin
  select l.expires_at into v
  from public.credit_lots(p_user) l
  where l.expires_at is null or l.expires_at > now()
  order by l.expires_at asc nulls last
  limit 1;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservar. Idéntica a la de 0019 salvo que el asiento de -1 anota el
-- vencimiento del lote que gasta.
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
begin
  if v_user is null then return 'auth'; end if;

  select capacity, status, starts_at into v_cap, v_status, v_starts
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

  -- Suscripción activa: reserva sin gastar crédito (asiento de 0 en el ledger).
  if public.has_active_subscription(v_user) then
    insert into public.bookings (user_id, session_id, status)
    values (v_user, p_session, 'confirmed')
    on conflict (user_id, session_id) do update set status = 'confirmed';
    insert into public.credit_ledger (user_id, delta, reason, ref_id)
    values (v_user, 0, 'subscription', p_session);
    return 'ok';
  end if;

  select public.credit_balance(v_user) into v_bal;
  if v_bal <= 0 then return 'no_credits'; end if;

  -- Antes de escribir el -1, para que el cálculo vea el saldo tal cual está.
  v_exp := public.next_lot_expiry(v_user);

  insert into public.bookings (user_id, session_id, status)
  values (v_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';
  insert into public.credit_ledger (user_id, delta, reason, ref_id, expires_at)
  values (v_user, -1, 'booking', p_session, v_exp);

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Devolver a una alumna lo que gastó en una sesión: el mismo crédito, con el
-- mismo vencimiento. Con suscripción (asiento de 0) no hay nada que devolver.
-- Se toma el asiento más reciente por si reservó, canceló y volvió a reservar.
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
    and cl.reason in ('booking', 'subscription')
  order by cl.created_at desc
  limit 1;

  -- Sin asiento (reserva anterior al ledger) se devuelve 1 sin vencimiento,
  -- que era el comportamiento de siempre.
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

-- ---------------------------------------------------------------------------
-- La alumna cancela. Misma ventana de 12 h que en 0014; cambia la devolución.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(p_session uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_starts timestamptz;
begin
  if v_user is null then return 'auth'; end if;

  select starts_at into v_starts
  from public.class_sessions where id = p_session;
  if v_starts is null then return 'notfound'; end if;

  -- También cubre la clase que ya empezó: el intervalo se va a negativo.
  if v_starts - now() < interval '12 hours' then
    return 'too_late';
  end if;

  update public.bookings set status = 'cancelled'
  where user_id = v_user and session_id = p_session and status = 'confirmed';
  if not found then return 'notfound'; end if;

  perform public.refund_booking_credit(v_user, p_session);
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- El estudio cancela la clase. Igual a la de 0011; cambia la devolución.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_session(p_session uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare b record;
begin
  if not public.is_admin() then return 'auth'; end if;
  update public.class_sessions set status = 'cancelled' where id = p_session;
  for b in
    select user_id from public.bookings
    where session_id = p_session and status = 'confirmed'
  loop
    update public.bookings set status = 'cancelled'
    where session_id = p_session and user_id = b.user_id;
    perform public.refund_booking_credit(b.user_id, p_session);
  end loop;
  return 'ok';
end;
$$;

-- Internas: solo las llaman las funciones security definer de arriba.
revoke execute on function public.credit_lots(uuid)                 from public, anon, authenticated;
revoke execute on function public.next_lot_expiry(uuid)             from public, anon, authenticated;
revoke execute on function public.refund_booking_credit(uuid, uuid) from public, anon, authenticated;

grant execute on function public.credit_balance(uuid) to authenticated;
grant execute on function public.book_session(uuid)   to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.cancel_session(uuid) to authenticated;
