-- ============================================================================
-- ÉLANSTUDIO — per-location UTC offset (timezone).
-- Apply AFTER 0011_weekly_schedule.sql.
--
-- Class times are entered as a wall-clock time (e.g. 07:00). Without a fixed
-- timezone that wall time was interpreted in the server's zone when computing
-- the schedule but rendered in the viewer's zone, so the hour shown differed
-- from the hour configured. Each location now carries a fixed UTC offset (in
-- minutes) that is used both to configure and to display its class times.
-- Default -360 = UTC-6 (Ciudad de México).
-- ============================================================================

alter table public.locations
  add column if not exists utc_offset_minutes integer not null default -360;

-- Rebuild materialize_session so the template's start_time is anchored to the
-- location's UTC offset (falling back to -360 when the location is unset).
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
  on conflict (weekly_class_id, session_date) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.class_sessions
    where weekly_class_id = p_weekly and session_date = p_date;
  end if;
  return v_id;
end;
$$;

grant execute on function public.materialize_session(uuid, date) to authenticated;
