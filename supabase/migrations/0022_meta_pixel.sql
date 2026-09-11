-- ============================================================================
-- ÉLANSTUDIO — id del Pixel de Meta configurable desde el admin.
-- Apply AFTER 0021_bank_transfer.sql.
--
-- Antes el id solo se podía poner como variable de entorno en Render, así que
-- cambiarlo obligaba a entrar al panel del hosting. Ahora vive en site_settings
-- y se edita desde Marca & Ajustes. Vacío = el pixel no se carga (salvo que
-- siga puesto META_PIXEL_ID en el entorno, que queda como respaldo).
-- ============================================================================

alter table public.site_settings
  add column if not exists meta_pixel_id text not null default '';
