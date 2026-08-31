-- ============================================================================
-- ÉLANSTUDIO — eventos únicos destacados en la portada.
-- Apply AFTER 0017_materialize_conflict.sql.
--
-- Un evento único (class_sessions con weekly_class_id null) es algo que se
-- anuncia con semanas de anticipación: un taller, una clase con invitada, un
-- retiro. Hasta ahora solo vivía en /horarios y solo dentro de la ventana de
-- días que la página pintaba, así que un evento a un mes no existía para nadie.
--
-- `featured` es la decisión del admin al crearlo: si además se anuncia en la
-- portada, en la sección de próximos eventos especiales. Es independiente de
-- que el evento aparezca en /horarios — ahí salen todos.
--
-- Solo tiene sentido en eventos únicos; en una sesión materializada de la
-- plantilla semanal se ignora (esas se repiten cada semana, no son un evento).
-- ============================================================================

alter table public.class_sessions
  add column if not exists featured boolean not null default false;

-- La portada pregunta por "eventos únicos destacados a futuro" en cada render.
create index if not exists idx_sessions_featured
  on public.class_sessions(starts_at)
  where featured and weekly_class_id is null;
