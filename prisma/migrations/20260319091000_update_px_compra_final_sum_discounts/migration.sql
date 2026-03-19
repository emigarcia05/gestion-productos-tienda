-- px_compra_final con descuentos acumulados (sumados) en lugar de multiplicativos.
-- dtoTotal = dto_proveedor + dto_marca + dto_rubro + dto_cantidad + dto_financiero
-- dtoTotal capado entre 0 y 100 para evitar valores negativos.

ALTER TABLE "precios_proveedores" DROP COLUMN IF EXISTS "px_compra_final";

ALTER TABLE "precios_proveedores"
ADD COLUMN "px_compra_final" NUMERIC(14,4) GENERATED ALWAYS AS (
  ("px_lista_proveedor" * (CASE WHEN "px_dolares" THEN "cotizacion_dolar" ELSE 1 END))
  * (
      1 - LEAST(
            100,
            GREATEST(
              0,
              COALESCE("dto_proveedor", 0)
              + COALESCE("dto_marca", 0)
              + COALESCE("dto_rubro", 0)
              + COALESCE("dto_cantidad", 0)
              + COALESCE("dto_financiero", 0)
            )
          )::numeric / 100
    )
  * (1 + COALESCE("cx_transporte", 0)::numeric / 100)
) STORED;

