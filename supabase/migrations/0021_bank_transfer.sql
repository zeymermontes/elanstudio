-- ============================================================================
-- ÉLANSTUDIO — pago por transferencia bancaria.
-- Apply AFTER 0020_booked_counts.sql.
--
-- Además de la tarjeta (Mercado Pago), la alumna puede pagar un paquete por
-- transferencia: ve las cuentas del estudio, transfiere y sube su comprobante.
-- Confiamos en ella — las clases se acreditan al instante — y el admin revisa
-- después en Pagos. Si marca la transferencia como rechazada, las clases se
-- retiran con un asiento negativo en el ledger; si se equivoca, puede volver
-- a aprobarla y el asiento se borra. El asiento original de 'purchase' nunca
-- se toca, así el índice único de 0002 sigue impidiendo el doble abono.
-- ============================================================================

-- Se activa desde Marca & Ajustes; los datos de las cuentas son texto libre
-- (banco, titular, CLABE… una o varias cuentas) tal cual se mostrarán.
alter table public.site_settings
  add column if not exists transfer_enabled  boolean not null default false,
  add column if not exists transfer_accounts text    not null default '';

alter table public.purchases
  add column if not exists method       text not null default 'card'
    check (method in ('card', 'transfer')),
  add column if not exists receipt_path text,          -- objeto en el bucket receipts
  add column if not exists reviewed_at  timestamptz,   -- null = por revisar
  add column if not exists reviewed_by  uuid references auth.users(id) on delete set null;

-- Las transferencias pendientes de revisión se cuentan en cada carga del admin.
create index if not exists idx_purchases_transfer_review
  on public.purchases(method, reviewed_at)
  where method = 'transfer';

-- ---------------------------------------------------------------------------
-- Comprobantes: bucket privado. La alumna sube a su propia carpeta
-- (<user_id>/<archivo>) y solo ella y el admin pueden verlos; el panel los
-- abre con URLs firmadas.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "receipts_own_insert" on storage.objects;
create policy "receipts_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_own_or_admin_read" on storage.objects;
create policy "receipts_own_or_admin_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
