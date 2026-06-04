-- Reconciliación idempotente: objetos retirados del código que podrían persistir
-- si alguna migración anterior no se aplicó en un entorno. No toca tablas del schema vigente.

-- ─── Tablas históricas (ya sin modelo Prisma ni uso en src/) ─────────────────
DROP TABLE IF EXISTS "prod_precios_tienda_marcacion" CASCADE;
DROP TABLE IF EXISTS "prod_precios_tienda_px_lista_config" CASCADE;
DROP TABLE IF EXISTS "movimientos_finanzas" CASCADE;
DROP TABLE IF EXISTS "movimientos_finanzas_cheques" CASCADE;
DROP TABLE IF EXISTS "pedidos_urgente" CASCADE;
DROP TABLE IF EXISTS "pedidos_reposicion" CASCADE;
DROP TABLE IF EXISTS "finanzas_gastos" CASCADE;
DROP TABLE IF EXISTS "finanzas_rubros" CASCADE;
DROP TABLE IF EXISTS "fin_bal_iva_deb" CASCADE;
DROP TABLE IF EXISTS "tipos_pintura_rendimientos" CASCADE;

-- ─── Columnas retiradas en prod_tienda (o nombre previo prod_precios_tienda) ─
DO $$
DECLARE
  tbl text;
BEGIN
  IF to_regclass('public.prod_tienda') IS NOT NULL THEN
    tbl := 'prod_tienda';
  ELSIF to_regclass('public.prod_precios_tienda') IS NOT NULL THEN
    tbl := 'prod_precios_tienda';
  ELSE
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl, tbl || '_cx_px_px_comp_ref_fkey');
  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl, 'prod_precios_tienda_cx_px_px_comp_ref_fkey');
  EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl, 'prod_precios_tienda_competencia_id_px_lista_fkey');

  EXECUTE format('DROP INDEX IF EXISTS %I', tbl || '_cx_px_px_comp_ref_idx');
  EXECUTE format('DROP INDEX IF EXISTS %I', 'prod_precios_tienda_cx_px_px_comp_ref_idx');
  EXECUTE format('DROP INDEX IF EXISTS %I', 'prod_precios_tienda_competencia_id_px_lista_idx');

  EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', tbl, 'px_lista_tienda');
  EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', tbl, 'px_lista_cx_px');
  EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', tbl, 'cx_px_px_comp_ref');
  EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I', tbl, 'competencia_id_px_lista');
END $$;
