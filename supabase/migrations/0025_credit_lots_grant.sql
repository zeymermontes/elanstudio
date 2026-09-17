-- ============================================================================
-- ÉLANSTUDIO — las alumnas vuelven a ver su saldo.
-- Apply AFTER 0024_refund_expiry.sql.
--
-- 0024 dejó credit_lots como interna (revoke a authenticated), pero
-- credit_balance corre con los permisos de quien la llama, no es security
-- definer. Desde "Mi cuenta" la llama la alumna, y al entrar a credit_lots
-- Postgres responde "permission denied": el saldo llegaba vacío y la página
-- pintaba 0. El admin no lo notaba porque consulta con la service role, y
-- reservar seguía funcionando porque book_session sí es security definer.
--
-- credit_lots tampoco es security definer: lee credit_ledger bajo RLS
-- (ledger_self_read), así que una alumna solo puede reproducir su propio
-- ledger. Darle execute no abre nada que no pudiera leer ya.
-- next_lot_expiry sigue interna: solo la llama book_session.
-- ============================================================================

grant execute on function public.credit_lots(uuid) to authenticated;
