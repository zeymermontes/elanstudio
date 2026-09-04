-- ============================================================================
-- ÉLANSTUDIO — ventana de reserva según si la clase tiene gente.
-- Apply AFTER 0018_featured_events.sql.
--
-- Antes se podía reservar hasta el instante mismo del arranque, incluso una
-- clase a la que nadie se había apuntado: la coach hacía el viaje sin saber si
-- alguien aparecería. Ahora:
--
--   · Clase con 0 reservas → cierra 2 horas antes. A esa hora la coach ya sabe
--     que no se abre y no tiene que ir.
--   · Clase con al menos 1 reserva → sigue abierta hasta 1 minuto antes: la
--     coach va de todos modos, así que cada lugar extra es bienvenido.
--
-- El "al menos 1" se sostiene solo: cancelar exige 12 horas de anticipación
-- (0014), así que una clase que ya tiene gente no puede quedarse vacía dentro
-- de la ventana de 2 horas.
--
-- La regla vive aquí y no en la UI porque esta función es la frontera real —
-- el botón se puede saltar, una función SECURITY DEFINER no.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- La ventana, en un solo lugar. 'open' | 'empty_closed' | 'started'.
-- (src/lib/booking-rules.ts la refleja para pintar el botón; esta manda.)
-- ---------------------------------------------------------------------------
create or replace function public.booking_window(
  p_starts timestamptz,
  p_booked int
)
returns text
language sql
stable
as $$
  select case
    -- También cubre la clase que ya empezó: el intervalo se va a negativo.
    when p_starts - now() < interval '1 minute'  then 'started'
    when p_booked = 0
     and p_starts - now() < interval '2 hours'   then 'empty_closed'
    else 'open'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Instante de arranque de una clase semanal en una fecha, anclado al huso de
-- su sede. Se extrae de materialize_session para que book_class pueda saber la
-- hora de un hueco que todavía no existe como fila.
-- ---------------------------------------------------------------------------
create or replace function public.weekly_starts_at(p_weekly uuid, p_date date)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select ((p_date + wc.start_time)
          - make_interval(mins => coalesce(l.utc_offset_minutes, -360)))
         at time zone 'UTC'
  from public.weekly_classes wc
  left join public.locations l on l.id = wc.location_id
  where wc.id = p_weekly;
$$;

-- Idéntica a la de 0017 salvo que el huso lo calcula weekly_starts_at.
create or replace function public.materialize_session(p_weekly uuid, p_date date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; wc record; v_starts timestamptz;
begin
  select * into wc from public.weekly_classes where id = p_weekly;
  if not found then return null; end if;

  select id into v_id from public.class_sessions
  where weekly_class_id = p_weekly and session_date = p_date;
  if v_id is not null then return v_id; end if;

  v_starts := public.weekly_starts_at(p_weekly, p_date);

  insert into public.class_sessions (
    class_type_id, coach_id, location_id, starts_at, ends_at,
    capacity, status, weekly_class_id, session_date
  ) values (
    wc.class_type_id, wc.coach_id, wc.location_id,
    v_starts, v_starts + make_interval(mins => wc.duration_min),
    wc.capacity, 'scheduled', p_weekly, p_date
  )
  on conflict (weekly_class_id, session_date) where weekly_class_id is not null
  do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.class_sessions
    where weekly_class_id = p_weekly and session_date = p_date;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservar una sesión concreta, ahora con la ventana. Reemplaza la de 0002.
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

  -- La fila está bloqueada (for update) desde antes de contar, así que dos
  -- personas no pueden colarse a la vez en una clase vacía a falta de 2 horas.
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

  insert into public.bookings (user_id, session_id, status)
  values (v_user, p_session, 'confirmed')
  on conflict (user_id, session_id) do update set status = 'confirmed';
  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (v_user, -1, 'booking', p_session);

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservar una clase del horario semanal. Reemplaza la de 0011.
-- ---------------------------------------------------------------------------
create or replace function public.book_class(p_weekly uuid, p_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_starts timestamptz; v_win text;
begin
  select id into v_id from public.class_sessions
  where weekly_class_id = p_weekly and session_date = p_date;

  -- Un hueco que nadie ha reservado todavía no tiene fila: mirar la ventana
  -- antes de materializar, para que un clic tardío no deje una sesión vacía.
  if v_id is null then
    v_starts := public.weekly_starts_at(p_weekly, p_date);
    if v_starts is null then return 'closed'; end if;
    v_win := public.booking_window(v_starts, 0);
    if v_win <> 'open' then return v_win; end if;
  end if;

  v_id := public.materialize_session(p_weekly, p_date);
  if v_id is null then return 'closed'; end if;
  return public.book_session(v_id);
end;
$$;

grant execute on function public.booking_window(timestamptz, int) to authenticated;
grant execute on function public.weekly_starts_at(uuid, date)     to authenticated;
grant execute on function public.materialize_session(uuid, date)  to authenticated;
grant execute on function public.book_session(uuid)               to authenticated;
grant execute on function public.book_class(uuid, date)           to authenticated;
