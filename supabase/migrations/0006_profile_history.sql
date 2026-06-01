-- ============================================================================
-- ÉLANSTUDIO — profile change history (real record of health/progress changes).
-- Apply AFTER 0005_profile_health.sql.
-- ============================================================================

create table if not exists public.profile_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  birth_date        date,
  health_conditions text,
  injuries          text,
  activity_type     text,
  notes             text,
  changed_by        uuid,
  changed_at        timestamptz not null default now()
);
create index if not exists idx_profile_history_user
  on public.profile_history(user_id, changed_at desc);

alter table public.profile_history enable row level security;

-- Members read their own history; admins read all. Inserts happen via the
-- trigger below (security definer), never directly.
drop policy if exists profile_history_read on public.profile_history;
create policy profile_history_read on public.profile_history
  for select using (user_id = auth.uid() or public.is_admin());

-- Snapshot the profile whenever a health/birthday field changes (by anyone).
create or replace function public.log_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.birth_date::text, '') is distinct from coalesce(old.birth_date::text, '')
     or coalesce(new.health_conditions, '') is distinct from coalesce(old.health_conditions, '')
     or coalesce(new.injuries, '') is distinct from coalesce(old.injuries, '')
     or coalesce(new.activity_type, '') is distinct from coalesce(old.activity_type, '')
     or coalesce(new.notes, '') is distinct from coalesce(old.notes, '')
  then
    insert into public.profile_history (
      user_id, birth_date, health_conditions, injuries, activity_type, notes, changed_by
    ) values (
      new.id, new.birth_date, new.health_conditions, new.injuries,
      new.activity_type, new.notes, auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_change on public.profiles;
create trigger on_profile_change
  after update on public.profiles
  for each row execute function public.log_profile_change();
