-- ---------------------------------------------------------------------------
-- Why a card payment was declined.
--
-- Mercado Pago's `status` on its own is inactionable: a mistyped security code,
-- a card without funds and an anti-fraud block all arrive as 'rejected'. The
-- `status_detail` is the part that says which one it was, so we keep it on the
-- row rather than only in the redirect URL — that way it survives a reload, the
-- webhook (which has no browser to redirect) can record it too, and /admin/pagos
-- can tell three very different problems apart instead of showing one wall of
-- identical rejections.
-- ---------------------------------------------------------------------------
alter table public.purchases
  add column if not exists mp_status_detail text;
