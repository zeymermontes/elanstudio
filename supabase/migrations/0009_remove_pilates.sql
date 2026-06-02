-- ============================================================================
-- ÉLANSTUDIO — remove "Pilates" wording from the originally-seeded content.
-- Only updates rows that still hold the default seed values, so any edits made
-- in the admin are preserved. Apply AFTER 0008_storage_images.sql.
-- ============================================================================

update public.services
set name = 'Reformer',
    description = 'Entrenamiento en máquina reformer: fuerza, control y precisión con bajo impacto.'
where slug = 'reformer' and name = 'Reformer Pilates';

update public.services
set description = 'Movilidad, estiramiento y respiración consciente para todos los niveles.'
where slug = 'mat'
  and description = 'Pilates en colchoneta, movilidad y respiración consciente para todos los niveles.';

update public.class_types
set description = 'Trabajo de core, movilidad y respiración.'
where name = 'Mat & Flow'
  and description = 'Pilates en colchoneta con foco en core y movilidad.';

update public.coaches
set specialties = array_replace(specialties, 'Mat Pilates', 'Mat & Flow')
where 'Mat Pilates' = any (specialties);
