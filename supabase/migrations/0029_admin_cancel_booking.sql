-- ============================================================================
-- ÉLANSTUDIO — el admin cancela la reserva de una alumna.
-- Apply AFTER 0028_pay_only_events.sql.
--
-- cancel_booking es de la alumna y exige 12 horas de anticipación. El
-- estudio necesita poder cancelar por ella sin esa ventana: se equivocó de
-- clase, no va a venir, o el evento cambió de costo después de que reservó.
-- La devolución es la misma que al cancelar ella (refund_booking_credit):
-- vuelven las clases que gastó, con su vencimiento; un lugar pagado aparte
-- no devuelve clases (el dinero se devuelve a mano).
--
-- Solo la llama el servidor con la service role, tras comprobar que quien
-- pide es admin; por eso no mira auth.uid().
-- ============================================================================

create or replace function public.admin_cancel_booking(p_user uuid, p_session uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings set status = 'cancelled'
  where user_id = p_user and session_id = p_session and status = 'confirmed';
  if not found then return 'notfound'; end if;

  perform public.refund_booking_credit(p_user, p_session);
  return 'ok';
end;
$$;

revoke execute on function public.admin_cancel_booking(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.admin_cancel_booking(uuid, uuid) to service_role;
