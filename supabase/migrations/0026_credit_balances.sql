-- ============================================================================
-- ÉLANSTUDIO — la tabla de Usuarios muestra el saldo real.
-- Apply AFTER 0025_credit_lots_grant.sql.
--
-- La tabla de Usuarios sumaba los deltas del ledger, así que contaba clases
-- ya vencidas: una alumna salía con 4 en la tabla y 0 en su ficha.
-- credit_balances() da el saldo de todas con la misma regla que
-- credit_balance. Solo la usa el admin con la service role.
-- ============================================================================

create or replace function public.credit_balances()
returns table (user_id uuid, balance int)
language sql
stable
set search_path = public
as $$
  select u.user_id, public.credit_balance(u.user_id)
  from (select distinct cl.user_id from public.credit_ledger cl) u;
$$;

revoke execute on function public.credit_balances() from public, anon, authenticated;
grant  execute on function public.credit_balances() to service_role;
