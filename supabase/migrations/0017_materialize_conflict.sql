-- ============================================================================
-- ÉLANSTUDIO — arreglo: reservar una clase recurrente fallaba con "Ocurrió un
-- error". Apply AFTER 0016_package_stock.sql.
--
-- La sesión de una clase del horario semanal se materializa la primera vez que
-- alguien la reserva. Ese insert lleva un ON CONFLICT como guarda de carrera,
-- pero el único índice único de (weekly_class_id, session_date) es parcial
-- (`where weekly_class_id is not null`), y Postgres solo puede usar un índice
-- parcial como árbitro si el ON CONFLICT repite su predicado. Sin él lanzaba
-- 42P10 ("there is no unique or exclusion constraint matching the ON CONFLICT
-- specification"), así que book_class reventaba y la reserva nunca se creaba —
-- no en un caso raro de carrera, sino en el camino normal: siempre que la
-- sesión de esa fecha todavía no existía.
--
-- Idéntica a la de 0012 salvo el predicado en el ON CONFLICT.
-- ============================================================================

create or replace function public.materialize_session(p_weekly uuid, p_date date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; wc record; v_off int;
begin
  select * into wc from public.weekly_classes where id = p_weekly;
  if not found then return null; end if;

  select id into v_id from public.class_sessions
  where weekly_class_id = p_weekly and session_date = p_date;
  if v_id is not null then return v_id; end if;

  select utc_offset_minutes into v_off
  from public.locations where id = wc.location_id;
  if v_off is null then v_off := -360; end if;

  insert into public.class_sessions (
    class_type_id, coach_id, location_id, starts_at, ends_at,
    capacity, status, weekly_class_id, session_date
  ) values (
    wc.class_type_id, wc.coach_id, wc.location_id,
    ((p_date + wc.start_time) - make_interval(mins => v_off)) at time zone 'UTC',
    ((p_date + wc.start_time) - make_interval(mins => v_off)) at time zone 'UTC'
      + make_interval(mins => wc.duration_min),
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

grant execute on function public.materialize_session(uuid, date) to authenticated;
