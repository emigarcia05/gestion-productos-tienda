-- ════════════════════════════════════════════════════════════════════════════
-- RENAME 7 TABLAS: migración al nuevo prefijado por dominio
--
--   1) pedidos_historia             → prod_ped_historial
--   2) pedidos_historial_mercaderia → prod_ped_historial_merc
--   3) pedidos_mercaderia           → prod_ped_merc
--   4) precios_proveedores          → prod_precios_provee
--   5) precios_tienda               → prod_precios_tienda
--   6) cajas_tesoreria              → fin_tesoreria_cajas
--   7) comprobantes_proveedor       → fin_compras_comprobante
--
-- Los nombres de constraints/índices están tomados del estado REAL en Neon
-- (inspeccionado vía pg_constraint + pg_indexes). Varios tienen nombres
-- históricos desalineados — esta migración los alinea al prefijo nuevo.
--
-- Las funciones plpgsql que referencian `pedidos_mercaderia` y `precios_tienda`
-- por nombre se REEMPLAZAN con CREATE OR REPLACE FUNCTION al final.
-- Los triggers siguen a la tabla automáticamente en PostgreSQL.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) Renombrar las 7 tablas físicas ────────────────────────────────────
ALTER TABLE "pedidos_historia"             RENAME TO "prod_ped_historial";
ALTER TABLE "pedidos_historial_mercaderia" RENAME TO "prod_ped_historial_merc";
ALTER TABLE "pedidos_mercaderia"           RENAME TO "prod_ped_merc";
ALTER TABLE "precios_proveedores"          RENAME TO "prod_precios_provee";
ALTER TABLE "precios_tienda"               RENAME TO "prod_precios_tienda";
ALTER TABLE "cajas_tesoreria"              RENAME TO "fin_tesoreria_cajas";
ALTER TABLE "comprobantes_proveedor"       RENAME TO "fin_compras_comprobante";

-- ─── 2) Renombrar Primary Keys ────────────────────────────────────────────
ALTER INDEX "pedidos_historia_pkey"       RENAME TO "prod_ped_historial_pkey";
ALTER INDEX "pedidos_historia_items_pkey" RENAME TO "prod_ped_historial_merc_pkey";
ALTER INDEX "pedidos_envio_pkey"          RENAME TO "prod_ped_merc_pkey";
ALTER INDEX "lista_precios_proveedores_pkey" RENAME TO "prod_precios_provee_pkey";
ALTER INDEX "lista_precios_tienda_pkey"   RENAME TO "prod_precios_tienda_pkey";
ALTER INDEX "cajas_tesoreria_pkey"        RENAME TO "fin_tesoreria_cajas_pkey";
ALTER INDEX "comprobantes_proveedor_pkey" RENAME TO "fin_compras_comprobante_pkey";

-- ─── 3) Renombrar Foreign Keys ────────────────────────────────────────────
-- prod_ped_historial (ex pedidos_historia)
ALTER TABLE "prod_ped_historial"
    RENAME CONSTRAINT "pedidos_historia_proveedor_id_fkey" TO "prod_ped_historial_proveedor_id_fkey";
ALTER TABLE "prod_ped_historial"
    RENAME CONSTRAINT "pedidos_historia_sucursal_id_fkey"  TO "prod_ped_historial_sucursal_id_fkey";

-- prod_ped_historial_merc (ex pedidos_historial_mercaderia)
ALTER TABLE "prod_ped_historial_merc"
    RENAME CONSTRAINT "pedidos_historia_items_pedido_historia_id_fkey"
                  TO "prod_ped_historial_merc_pedido_historia_id_fkey";

-- prod_ped_merc (ex pedidos_mercaderia)
ALTER TABLE "prod_ped_merc"
    RENAME CONSTRAINT "pedidos_envio_id_proveedor_fkey"    TO "prod_ped_merc_id_proveedor_fkey";
ALTER TABLE "prod_ped_merc"
    RENAME CONSTRAINT "pedidos_mercaderia_sucursal_id_fkey" TO "prod_ped_merc_sucursal_id_fkey";

-- prod_precios_provee (ex precios_proveedores): solo existe 1 FK explícita en BD
ALTER TABLE "prod_precios_provee"
    RENAME CONSTRAINT "lista_precios_proveedores_id_presentacion_fkey"
                  TO "prod_precios_provee_id_presentacion_fkey";

-- prod_precios_tienda (ex precios_tienda)
ALTER TABLE "prod_precios_tienda"
    RENAME CONSTRAINT "lista_precios_tienda_id_marca_fkey"
                  TO "prod_precios_tienda_id_marca_fkey";

-- fin_compras_comprobante (ex comprobantes_proveedor)
ALTER TABLE "fin_compras_comprobante"
    RENAME CONSTRAINT "comprobantes_proveedor_id_proveedor_fkey"
                  TO "fin_compras_comprobante_id_proveedor_fkey";

-- ─── 4) Renombrar índices únicos ──────────────────────────────────────────
-- prod_ped_historial_merc
ALTER INDEX "pedidos_historia_items_pedido_historia_id_cod_tienda_key"
    RENAME TO "prod_ped_historial_merc_pedido_historia_id_cod_tienda_key";

-- prod_ped_merc (unique global sobre 4 columnas; nombre mantenido corto via map:)
ALTER INDEX "pedidos_mercaderia_item_unique" RENAME TO "prod_ped_merc_item_unique";

-- prod_precios_provee: 2 uniques (uno sobre cod_ext, otro sobre (id_proveedor, cod_prod_proveedor))
-- El unique sobre cod_ext NO está declarado en schema.prisma (drift histórico) pero existe en BD.
-- Lo conservamos con nombre prolijo (map: en schema se maneja aparte si se decide modelarlo).
ALTER INDEX "uq_lista_precios_cod_ext"       RENAME TO "prod_precios_provee_cod_ext_ux";
ALTER INDEX "uq_lista_precios_proveedor_cod" RENAME TO "prod_precios_provee_id_proveedor_cod_prod_prov_key";

-- prod_precios_tienda
ALTER INDEX "lista_precios_tienda_cod_ext_key" RENAME TO "prod_precios_tienda_cod_ext_key";

-- fin_tesoreria_cajas (unique con map: explícito en schema)
ALTER INDEX "cajas_tesoreria_nombre_titular_ux" RENAME TO "fin_tesoreria_cajas_nombre_titular_ux";

-- fin_compras_comprobante (unique con map: explícito en schema)
ALTER INDEX "comprobantes_proveedor_natural_ux" RENAME TO "fin_compras_comprobante_natural_ux";

-- ─── 5) Renombrar índices no únicos ───────────────────────────────────────
-- prod_ped_historial (ex pedidos_historia)
ALTER INDEX "pedidos_historia_generado_at_idx"
    RENAME TO "prod_ped_historial_generado_at_idx";
ALTER INDEX "pedidos_historia_proveedor_id_generado_at_idx"
    RENAME TO "prod_ped_historial_proveedor_id_generado_at_idx";
ALTER INDEX "pedidos_historia_sucursal_id_generado_at_idx"
    RENAME TO "prod_ped_historial_sucursal_id_generado_at_idx";

-- prod_ped_historial_merc
ALTER INDEX "pedidos_historia_items_pedido_historia_id_idx"
    RENAME TO "prod_ped_historial_merc_pedido_historia_id_idx";

-- prod_ped_merc
ALTER INDEX "pedidos_mercaderia_sucursal_id_idx"
    RENAME TO "prod_ped_merc_sucursal_id_idx";

-- prod_precios_tienda (3 índices auxiliares históricos)
ALTER INDEX "idx_lista_precios_tienda_cod_externo"
    RENAME TO "prod_precios_tienda_cod_ext_aux_idx";
ALTER INDEX "idx_lista_precios_tienda_proveedor"
    RENAME TO "prod_precios_tienda_proveedor_idx";
ALTER INDEX "idx_precios_tienda_cod_tienda"
    RENAME TO "prod_precios_tienda_cod_tienda_idx";
ALTER INDEX "precios_tienda_ultima_exportacion_excel_idx"
    RENAME TO "prod_precios_tienda_ultima_exportacion_excel_idx";

-- fin_tesoreria_cajas
ALTER INDEX "cajas_tesoreria_tipo_caja_idx" RENAME TO "fin_tesoreria_cajas_tipo_caja_idx";

-- fin_compras_comprobante
ALTER INDEX "comprobantes_proveedor_fecha_comp_idx"
    RENAME TO "fin_compras_comprobante_fecha_comp_idx";
ALTER INDEX "comprobantes_proveedor_id_proveedor_idx"
    RENAME TO "fin_compras_comprobante_id_proveedor_idx";

-- ─── 6) Renombrar CHECK constraints históricos en prod_precios_provee ─────
ALTER TABLE "prod_precios_provee"
    RENAME CONSTRAINT "lista_precios_proveedores_cx_aprox_transporte_check"
                  TO "prod_precios_provee_cx_transporte_check";
ALTER TABLE "prod_precios_provee"
    RENAME CONSTRAINT "lista_precios_proveedores_dto_cantidad_check"
                  TO "prod_precios_provee_dto_cantidad_check";
ALTER TABLE "prod_precios_provee"
    RENAME CONSTRAINT "lista_precios_proveedores_dto_marca_range"
                  TO "prod_precios_provee_dto_marca_check";
ALTER TABLE "prod_precios_provee"
    RENAME CONSTRAINT "lista_precios_proveedores_dto_producto_check"
                  TO "prod_precios_provee_dto_rubro_check";

-- ─── 7) Renombrar triggers (si existen, cosmético) ────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_pedidos_mercaderia_cant_pedir') THEN
    EXECUTE 'ALTER TRIGGER "trg_sync_pedidos_mercaderia_cant_pedir" ON "prod_ped_merc" RENAME TO "trg_sync_prod_ped_merc_cant_pedir"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_reposicion_on_precios_tienda_stock') THEN
    EXECUTE 'ALTER TRIGGER "trg_sync_reposicion_on_precios_tienda_stock" ON "prod_precios_tienda" RENAME TO "trg_sync_reposicion_on_prod_precios_tienda_stock"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cajas_tesoreria_set_timestamps') THEN
    EXECUTE 'ALTER TRIGGER "cajas_tesoreria_set_timestamps" ON "fin_tesoreria_cajas" RENAME TO "fin_tesoreria_cajas_set_timestamps"';
  END IF;
END $$;

-- ─── 8) Recrear funciones plpgsql con los NUEVOS nombres de tablas ────────
--
-- `sync_pedidos_mercaderia_cant_pedir` referencia `precios_tienda`.
-- `sync_reposicion_on_precios_tienda_stock_change` referencia `pedidos_mercaderia`.
-- Ambas se actualizan a prod_precios_tienda / prod_ped_merc respectivamente.

CREATE OR REPLACE FUNCTION sync_pedidos_mercaderia_cant_pedir()
RETURNS TRIGGER AS $$
DECLARE
  stock_sucursal INTEGER := 0;
  sucursal_codigo TEXT;
  forma_norm TEXT;
  punto_norm INTEGER := 0;
  cant_conf_norm INTEGER := 0;
BEGIN
  IF NEW.tipo_de_pedido = 'REPOSICION' THEN
    SELECT s.codigo
      INTO sucursal_codigo
    FROM sucursales s
    WHERE s.id = NEW.sucursal_id
    LIMIT 1;

    IF sucursal_codigo = 'maipu' THEN
      SELECT COALESCE(t.stock_maipu, 0)
        INTO stock_sucursal
      FROM prod_precios_tienda t
      WHERE t.cod_ext = NEW.cod_ext
      LIMIT 1;
    ELSIF sucursal_codigo = 'guaymallen' THEN
      SELECT COALESCE(t.stock_guaymallen, 0)
        INTO stock_sucursal
      FROM prod_precios_tienda t
      WHERE t.cod_ext = NEW.cod_ext
      LIMIT 1;
    ELSE
      stock_sucursal := 0;
    END IF;

    forma_norm := UPPER(TRIM(COALESCE(NEW.reposicion_forma_pedido, '')));
    punto_norm := COALESCE(NEW.reposicion_punto_pedido, 0);
    cant_conf_norm := COALESCE(NEW.reposicion_cant_conf, 0);

    IF stock_sucursal <= punto_norm THEN
      IF forma_norm = 'CANT_FIJA' THEN
        NEW.reposicion_cant_pedir := cant_conf_norm;
      ELSIF forma_norm = 'CANT_MAXIMA' THEN
        NEW.reposicion_cant_pedir := GREATEST(0, cant_conf_norm - stock_sucursal);
      ELSE
        NEW.reposicion_cant_pedir := 0;
      END IF;
    ELSE
      NEW.reposicion_cant_pedir := 0;
    END IF;
  END IF;

  IF NEW.tipo_de_pedido = 'TINTOMETRICO' THEN
    NEW.cant_pedir := COALESCE(NEW.tintometrio_cant_pedir, 0);
  ELSIF NEW.tipo_de_pedido = 'URGENTE' THEN
    NEW.cant_pedir := COALESCE(NEW.urgente_cant_pedir, 0);
  ELSIF NEW.tipo_de_pedido = 'REPOSICION' THEN
    NEW.cant_pedir := COALESCE(NEW.reposicion_cant_pedir, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_reposicion_on_precios_tienda_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prod_ped_merc pm
  SET reposicion_cant_pedir = pm.reposicion_cant_pedir
  WHERE pm.tipo_de_pedido = 'REPOSICION'
    AND pm.cod_ext = NEW.cod_ext;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
