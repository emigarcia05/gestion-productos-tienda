-- ============================================================================
-- Renombre masivo de tablas de los módulos "Comparación por Categoría" y
-- "Comprobantes de Compra DUX" a prefijos consistentes.
--
-- Renombres:
--   comparacion_categorias        -> prod_comp_cat
--   comparacion_subcategorias     -> prod_comp_sub_cat
--   comparacion_presentaciones    -> prod_comp_presentaciones
--   comparacion_dto_extra_items   -> prod_comp_dto_extra
--   comprobantes_proveedor        -> prod_comp_provee
--
-- NOTA HISTÓRICA IMPORTANTE (nombres de constraints):
--   Las tablas `comparacion_*` fueron renombradas hace meses desde nombres
--   `*_comparacion` mediante un script ad-hoc (`prisma/rename_comparacion_tables.sql`,
--   hoy eliminado) que NO renombró las constraints ni los índices. Como
--   consecuencia, al momento de esta migración los nombres reales en Neon
--   para las 3 tablas de Comparación por Categoría son los ANTIGUOS:
--     * comparacion_categorias    → PK `categorias_comparacion_pkey`
--     * comparacion_subcategorias → PK `subcategorias_comparacion_pkey`,
--                                   FK `subcategorias_comparacion_categoria_id_fkey`
--     * comparacion_presentaciones → PK `presentaciones_comparacion_pkey`,
--                                    FK `presentaciones_comparacion_subcategoria_id_fkey`,
--                                    FK `comparacion_presentaciones_id_producto_referencia_fkey`
--       (esta última FK sí se creó DESPUÉS del rename y quedó con el prefijo correcto)
--   Las constraints de `comparacion_dto_extra_items` y `comprobantes_proveedor`
--   sí siguen la convención Prisma `{tabla}_{col}_{suffix}`.
--
--   Esta migración renombra las 5 tablas + TODAS sus constraints e índices
--   a la convención nueva `prod_comp_*`, limpiando de paso la deuda técnica
--   dejada por aquel rename incompleto.
--
-- NOTA SEMÁNTICA (decisión consciente):
--   Las 4 primeras tablas pertenecen al dominio "Comparación por Categoría"
--   (lectura del prefijo: prod[ucto]_comp[aración]). La 5ª — `comprobantes_proveedor`
--   — pertenece al dominio "Comprobantes DUX" (facturas/NC/ND sincronizadas desde
--   la API DUX `/compras`, consumidas por Control de Comprobantes, Vencimientos
--   por Fecha y Deuda Proveedores). Usar el mismo prefijo `prod_comp_*` para
--   un dominio distinto se mantiene por pedido explícito del producto, pero
--   deja el prefijo "genérico" a partir de esta migración: ya NO puede leerse
--   únicamente como "producto comparación". Si a futuro se agrega una tabla
--   de comparación-por-proveedor dentro del módulo Comparación, deberá usarse
--   otro nombre distinto de `prod_comp_provee` (ya ocupado por comprobantes).
--
-- Idempotencia:
--   Usamos `IF EXISTS` en cada rename para permitir reintento seguro y para
--   ser tolerante al caso en que una entidad ya hubiera sido renombrada
--   manualmente. Los renames que no se resuelvan simplemente se saltan sin
--   romper la transacción.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) comparacion_categorias  ->  prod_comp_cat
--    Constraint histórica: `categorias_comparacion_pkey` (antigua)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS "comparacion_categorias" RENAME TO "prod_comp_cat";

ALTER INDEX IF EXISTS "categorias_comparacion_pkey"
    RENAME TO "prod_comp_cat_pkey";

-- ────────────────────────────────────────────────────────────────────────────
-- 2) comparacion_subcategorias  ->  prod_comp_sub_cat
--    Constraints históricas: `subcategorias_comparacion_pkey`,
--                             `subcategorias_comparacion_categoria_id_fkey`
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS "comparacion_subcategorias" RENAME TO "prod_comp_sub_cat";

ALTER INDEX IF EXISTS "subcategorias_comparacion_pkey"
    RENAME TO "prod_comp_sub_cat_pkey";

ALTER TABLE IF EXISTS "prod_comp_sub_cat"
    RENAME CONSTRAINT "subcategorias_comparacion_categoria_id_fkey"
                  TO "prod_comp_sub_cat_categoria_id_fkey";

-- ────────────────────────────────────────────────────────────────────────────
-- 3) comparacion_presentaciones  ->  prod_comp_presentaciones
--    Constraints históricas (dos con nombre antiguo + una con nuevo):
--      * presentaciones_comparacion_pkey                           (antigua)
--      * presentaciones_comparacion_subcategoria_id_fkey           (antigua)
--      * comparacion_presentaciones_id_producto_referencia_fkey    (creada post-rename)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS "comparacion_presentaciones" RENAME TO "prod_comp_presentaciones";

ALTER INDEX IF EXISTS "presentaciones_comparacion_pkey"
    RENAME TO "prod_comp_presentaciones_pkey";

ALTER TABLE IF EXISTS "prod_comp_presentaciones"
    RENAME CONSTRAINT "presentaciones_comparacion_subcategoria_id_fkey"
                  TO "prod_comp_presentaciones_subcategoria_id_fkey";

-- El identificador nuevo mide 52 chars (dentro del límite PostgreSQL de 63),
-- por lo que se mantiene el nombre completo sin truncamiento.
ALTER TABLE IF EXISTS "prod_comp_presentaciones"
    RENAME CONSTRAINT "comparacion_presentaciones_id_producto_referencia_fkey"
                  TO "prod_comp_presentaciones_id_producto_referencia_fkey";

-- ────────────────────────────────────────────────────────────────────────────
-- 4) comparacion_dto_extra_items  ->  prod_comp_dto_extra
--    Constraints existentes (todas alineadas con la tabla):
--      * comparacion_dto_extra_items_pkey
--      * comparacion_dto_extra_items_id_lista_precios_proveedores_key (UNIQUE)
--      * comparacion_dto_extra_items_id_lista_precios_proveedores_fkey (FK)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS "comparacion_dto_extra_items" RENAME TO "prod_comp_dto_extra";

ALTER INDEX IF EXISTS "comparacion_dto_extra_items_pkey"
    RENAME TO "prod_comp_dto_extra_pkey";

ALTER INDEX IF EXISTS "comparacion_dto_extra_items_id_lista_precios_proveedores_key"
    RENAME TO "prod_comp_dto_extra_id_lista_precios_proveedores_key";

ALTER TABLE IF EXISTS "prod_comp_dto_extra"
    RENAME CONSTRAINT "comparacion_dto_extra_items_id_lista_precios_proveedores_fkey"
                  TO "prod_comp_dto_extra_id_lista_precios_proveedores_fkey";

-- ────────────────────────────────────────────────────────────────────────────
-- 5) comprobantes_proveedor  ->  prod_comp_provee
--    Constraints existentes (todas alineadas con la tabla):
--      * comprobantes_proveedor_pkey
--      * comprobantes_proveedor_natural_ux (UNIQUE, con `map:` explícito en Prisma)
--      * comprobantes_proveedor_fecha_comp_idx
--      * comprobantes_proveedor_id_proveedor_idx
--      * comprobantes_proveedor_id_proveedor_fkey
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS "comprobantes_proveedor" RENAME TO "prod_comp_provee";

ALTER INDEX IF EXISTS "comprobantes_proveedor_pkey"
    RENAME TO "prod_comp_provee_pkey";

-- Índice UNIQUE con `map:` explícito en Prisma → el nombre DEBE coincidir con
-- el @@unique(map:) actualizado en schema.prisma en paralelo a esta migración.
ALTER INDEX IF EXISTS "comprobantes_proveedor_natural_ux"
    RENAME TO "prod_comp_provee_natural_ux";

ALTER INDEX IF EXISTS "comprobantes_proveedor_fecha_comp_idx"
    RENAME TO "prod_comp_provee_fecha_comp_idx";

ALTER INDEX IF EXISTS "comprobantes_proveedor_id_proveedor_idx"
    RENAME TO "prod_comp_provee_id_proveedor_idx";

ALTER TABLE IF EXISTS "prod_comp_provee"
    RENAME CONSTRAINT "comprobantes_proveedor_id_proveedor_fkey"
                  TO "prod_comp_provee_id_proveedor_fkey";
