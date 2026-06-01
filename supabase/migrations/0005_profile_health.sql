-- ============================================================================
-- ÉLANSTUDIO — member profile: health info + birthday + onboarding flag.
-- Apply AFTER 0004_credit_expiry.sql.
-- ============================================================================

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists health_conditions text default '',
  add column if not exists injuries text default '',
  add column if not exists activity_type text default '',
  add column if not exists notes text default '',
  add column if not exists onboarded boolean not null default false;

create index if not exists idx_profiles_birth_date on public.profiles(birth_date);
