-- ════════════════════════════════════════════════════════════════════════════
-- Catálogo global / producto: renombrar 3 tablas maestras
--
--   marcas      → prod_marcas
--   proveedores → global_proveedores
--   sucursales  → global_sucursales
--
-- Incluye PKs, uniques, índices auxiliares, CHECK y recreación de funciones
-- plpgsql que referencian los nombres viejos por texto (no se actualizan solas).
-- Las FKs en tablas hijas siguen válidas por OID; los nombres de constraint
-- hijos (p. ej. prod_ped_merc_id_proveedor_fkey) se conservan.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) Tablas ───────────────────────────────────────────────────────────
ALTER TABLE "marcas" RENAME TO "prod_marcas";
ALTER TABLE "proveedores" RENAME TO "global_proveedores";
ALTER TABLE "sucursales" RENAME TO "global_sucursales";

-- ─── 2) prod_marcas (ex marcas) ───────────────────────────────────────────
ALTER INDEX "marcas_pkey" RENAME TO "prod_marcas_pkey";
ALTER INDEX "marcas_nombre_key" RENAME TO "prod_marcas_nombre_key";

-- ─── 3) global_proveedores (ex proveedores) ──────────────────────────────
ALTER INDEX "proveedores_pkey" RENAME TO "global_proveedores_pkey";
ALTER INDEX "proveedores_nombre_key" RENAME TO "global_proveedores_nombre_key";
ALTER INDEX "proveedores_id_proveedor_dux_key" RENAME TO "global_proveedores_id_proveedor_dux_key";
ALTER INDEX "proveedores_proveedor_mercaderia_idx" RENAME TO "global_proveedores_proveedor_mercaderia_idx";
ALTER INDEX "idx_proveedores_codigo_unico" RENAME TO "global_proveedores_codigo_unico_idx";
ALTER INDEX "idx_proveedores_created_at" RENAME TO "global_proveedores_created_at_idx";
ALTER INDEX "idx_proveedores_nombre" RENAME TO "global_proveedores_nombre_legacy_ux";
ALTER INDEX "idx_proveedores_sufijo" RENAME TO "global_proveedores_prefijo_ux";

ALTER TABLE "global_proveedores"
  RENAME CONSTRAINT "chk_sufijo_3_letras" TO "global_proveedores_chk_prefijo_3_letras";

-- ─── 4) global_sucursales (ex sucursales) ───────────────────────────────────
ALTER INDEX "sucursales_pkey" RENAME TO "global_sucursales_pkey";
ALTER INDEX "sucursales_codigo_key" RENAME TO "global_sucursales_codigo_key";
ALTER INDEX "sucursales_nombre_idx" RENAME TO "global_sucursales_nombre_idx";

-- ─── 5) Funciones que citan tablas por nombre ─────────────────────────────
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
    FROM global_sucursales s
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

CREATE OR REPLACE FUNCTION trg_lista_precios_set_cod_ext()
RETURNS TRIGGER AS $$
BEGIN
  SELECT p.prefijo || '-' || NEW.cod_prod_proveedor
  INTO NEW.cod_ext
  FROM global_proveedores p
  WHERE p.id = NEW.id_proveedor;
  IF NEW.cod_ext IS NULL THEN
    RAISE EXCEPTION 'id_proveedor % no existe en global_proveedores', NEW.id_proveedor;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
