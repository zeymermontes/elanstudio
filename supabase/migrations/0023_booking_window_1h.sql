-- ============================================================================
-- ÉLANSTUDIO — la clase vacía cierra 1 hora antes, no 2.
-- Apply AFTER 0022_meta_pixel.sql.
--
-- Dos horas resultaron demasiado: las alumnas que se deciden a media tarde se
-- topaban con la clase cerrada. Con una hora la coach sigue sabiendo con
-- tiempo si no se abre. La clase que ya tiene gente no cambia: abierta hasta
-- 1 minuto antes. Misma función que en 0019, solo cambia el intervalo;
-- src/lib/booking-rules.ts la refleja.
-- ============================================================================

create or replace function public.booking_window(
  p_starts timestamptz,
  p_booked int
)
returns text
language sql
stable
as $$
  select case
    -- También cubre la clase que ya empezó: el intervalo se va a negativo.
    when p_starts - now() < interval '1 minute'  then 'started'
    when p_booked = 0
     and p_starts - now() < interval '1 hour'    then 'empty_closed'
    else 'open'
  end;
$$;
