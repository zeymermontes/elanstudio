-- ============================================================================
-- ÉLANSTUDIO — conteo de reservas visible para todas.
-- Apply AFTER 0019_booking_window.sql.
--
-- El horario contaba las reservas confirmadas leyendo `bookings` con la sesión
-- de quien mira la página. La política bookings_self (0001) solo deja ver las
-- reservas propias, así que una visitante veía siempre el cupo completo y una
-- socia veía, como mucho, la suya: "12 lugares" aunque ya hubiera 8 personas.
-- Solo el admin, que sí ve todas, tenía el número correcto.
--
-- Esta función devuelve únicamente cuántas reservas hay por sesión — nunca
-- quién — y corre como SECURITY DEFINER para pasar por encima de esa política.
-- La regla de "cierra 2 h antes si nadie se apuntó" (0019) también se pinta con
-- este número, así que sin él la web cerraba clases que el servidor sí abría.
-- ============================================================================

create or replace function public.session_booked_counts(p_sessions uuid[])
returns table (session_id uuid, booked int)
language sql
stable
security definer
set search_path = public
as $$
  select b.session_id, count(*)::int
  from public.bookings b
  where b.status = 'confirmed'
    and b.session_id = any(p_sessions)
  group by b.session_id;
$$;

grant execute on function public.session_booked_counts(uuid[]) to anon, authenticated;
