-- ============================================================================
-- ÉLANSTUDIO — attendance check-in. Apply AFTER 0002_subscriptions.sql.
-- ============================================================================

-- attended: null = not checked in yet, true = present, false = no-show.
alter table public.bookings
  add column if not exists attended boolean;
