-- ============================================================================
-- ÉLANSTUDIO — coach role + link a coach record to a login.
-- Apply AFTER 0009_remove_pilates.sql.
-- ============================================================================

-- Allow the 'coach' role.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('member', 'admin', 'coach'));

-- Link a coach content record to an auth user (their login).
alter table public.coaches
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_coaches_user on public.coaches(user_id);

-- Helper: is the current user staff (admin or coach)?
create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'coach')
  );
$$;
