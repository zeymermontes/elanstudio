-- ============================================================================
-- ÉLANSTUDIO — image for locations. Apply AFTER 0006_profile_history.sql.
-- (coaches.photo_url and class_types.image_url already exist from 0001;
--  locations.map_url already exists too — this only adds the location image.)
-- ============================================================================

alter table public.locations
  add column if not exists image_url text;
