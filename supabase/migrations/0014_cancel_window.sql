-- ============================================================================
-- ÉLANSTUDIO — cancellation window.
-- Apply AFTER 0013_promotions.sql.
--
-- Cancelling used to be allowed right up to the start of class, which meant a
-- seat could be freed too late for anyone else to take it. A booking can now
-- only be cancelled while there are more than 12 hours left; the credit comes
-- back as before. Inside the window the class is kept and the credit is spent.
--
-- The rule lives here rather than in the UI because this function is the real
-- boundary — the button can be bypassed, a SECURITY DEFINER function cannot.
-- ============================================================================

create or replace function public.cancel_booking(p_session uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_starts timestamptz;
begin
  if v_user is null then return 'auth'; end if;

  select starts_at into v_starts
  from public.class_sessions where id = p_session;
  if v_starts is null then return 'notfound'; end if;

  -- Also covers classes that already started: the interval goes negative.
  if v_starts - now() < interval '12 hours' then
    return 'too_late';
  end if;

  update public.bookings set status = 'cancelled'
  where user_id = v_user and session_id = p_session and status = 'confirmed';
  if not found then return 'notfound'; end if;

  insert into public.credit_ledger (user_id, delta, reason, ref_id)
  values (v_user, 1, 'refund', p_session);

  return 'ok';
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;
