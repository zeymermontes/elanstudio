-- ============================================================================
-- ÉLANSTUDIO — recurring weekly schedule (live template + exceptions).
-- Apply AFTER 0010_coach_role.sql.
--
-- Model: weekly_classes holds the recurring template. The actual schedule is
-- computed on the fly from the template; a class_sessions row is only
-- "materialized" when something happens to a specific date (a booking, a coach
-- cover, or a cancellation). One-off special events are class_sessions rows
-- with weekly_class_id = null.
-- ============================================================================

create table if not exists public.weekly_classes (
  id            uuid primary key default gen_random_uuid(),
  class_type_id uuid not null references public.class_types(id) on delete cascade,
  coach_id      uuid references public.coaches(id) on delete set null,
  location_id   uuid references public.locations(id) on delete set null,
  weekday       smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time    time not null,
  duration_min  int not null default 50,
  capacity      int not null default 10,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.weekly_classes enable row level security;
drop policy if exists weekly_read on public.weekly_classes;
create policy weekly_read on public.weekly_classes for select using (true);
drop policy if exists weekly_admin on public.weekly_classes;
create policy weekly_admin on public.weekly_classes
  for all using (public.is_admin()) with check (public.is_admin());

-- Link materialized sessions back to their template + date.
alter table public.class_sessions
  add column if not exists weekly_class_id uuid references public.weekly_classes(id) on delete set null,
  add column if not exists session_date date;
create unique index if not exists uniq_session_template_date
  on public.class_sessions(weekly_class_id, session_date)
  where weekly_class_id is not null;

-- Get-or-create the concrete session for a template on a date, capturing the
-- template's current coach/location/capacity.
create or replace function public.materialize_session(p_weekly uuid, p_date date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; wc record;
begin
  select * into wc from public.weekly_classes where id = p_weekly;
  if not found then return null; end if;

  select id into v_id from public.class_sessions
  where weekly_class_id = p_weekly and session_date = p_date;
  if v_id is not null then return v_id; end if;

  insert into public.class_sessions (
    class_type_id, coach_id, location_id, starts_at, ends_at,
    capacity, status, weekly_class_id, session_date
  ) values (
    wc.class_type_id, wc.coach_id, wc.location_id,
    (p_date + wc.start_time)::timestamptz,
    (p_date + wc.start_time)::timestamptz + make_interval(mins => wc.duration_min),
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

-- Book a recurring class for a date (materializes first, then books).
create or replace function public.book_class(p_weekly uuid, p_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  v_id := public.materialize_session(p_weekly, p_date);
  if v_id is null then return 'closed'; end if;
  return public.book_session(v_id);
end;
$$;

-- Cancel a session and refund every confirmed booking.
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
    insert into public.credit_ledger (user_id, delta, reason, ref_id)
    values (b.user_id, 1, 'refund', p_session);
  end loop;
  return 'ok';
end;
$$;

-- Cancel a (possibly still-virtual) recurring class on a date.
create or replace function public.cancel_class(p_weekly uuid, p_date date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then return 'auth'; end if;
  v_id := public.materialize_session(p_weekly, p_date);
  if v_id is null then return 'closed'; end if;
  return public.cancel_session(v_id);
end;
$$;

grant execute on function public.materialize_session(uuid, date) to authenticated;
grant execute on function public.book_class(uuid, date) to authenticated;
grant execute on function public.cancel_session(uuid) to authenticated;
grant execute on function public.cancel_class(uuid, date) to authenticated;

-- Realtime not needed here.
