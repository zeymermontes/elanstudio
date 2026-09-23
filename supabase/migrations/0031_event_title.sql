-- ============================================================================
-- ÉLANSTUDIO — título y descripción propios de un evento único.
-- Apply AFTER 0030_trial_class.sql.
--
-- Un taller o una masterclass se anuncia con su propio nombre («Masterclass
-- de Reformer con Ana»), no solo con el de la clase base. El formulario los
-- prellena desde la clase y el admin los cambia si quiere. Null = se usa lo
-- de la clase, así renombrar la clase sigue alcanzando a los eventos que no
-- se personalizaron.
-- ============================================================================

alter table public.class_sessions
  add column if not exists title       text,
  add column if not exists description text;
