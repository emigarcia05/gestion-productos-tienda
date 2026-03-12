-- Renombrar tablas de comparación y eliminar columna orden

ALTER TABLE "categorias_comparacion"
  DROP COLUMN IF EXISTS "orden";

ALTER TABLE "subcategorias_comparacion"
  DROP COLUMN IF EXISTS "orden";

ALTER TABLE "presentaciones_comparacion"
  DROP COLUMN IF EXISTS "orden";

ALTER TABLE "categorias_comparacion"
  RENAME TO "comparacion_categorias";

ALTER TABLE "subcategorias_comparacion"
  RENAME TO "comparacion_subcategorias";

ALTER TABLE "presentaciones_comparacion"
  RENAME TO "comparacion_presentaciones";

