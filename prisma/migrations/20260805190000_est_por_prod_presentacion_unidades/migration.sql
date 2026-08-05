-- Unidades de presentación (prefijo/sufijo + flag suma).
CREATE TYPE "est_por_prod_posicion_unidad" AS ENUM ('PREFIJO', 'SUFIJO');

CREATE TABLE "est_por_prod_un_presentacion" (
    "id" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "posicion_unidad" "est_por_prod_posicion_unidad" NOT NULL,
    "suma" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "est_por_prod_un_presentacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "est_por_prod_un_presentacion_unidad_key"
  ON "est_por_prod_un_presentacion"("unidad");

-- Renombrar catálogo LTS → presentaciones (datos previos incompatibles: se vacían).
ALTER TABLE "est_por_prod_lts_conversion" RENAME TO "est_por_prod_presentacion";
ALTER INDEX "est_por_prod_lts_conversion_pkey" RENAME TO "est_por_prod_presentacion_pkey";
ALTER INDEX "est_por_prod_lts_conversion_texto_key" RENAME TO "est_por_prod_presentacion_texto_key";

DELETE FROM "est_por_prod_presentacion";

ALTER TABLE "est_por_prod_presentacion" DROP COLUMN "conversion_lts";

ALTER TABLE "est_por_prod_presentacion"
  ADD COLUMN "unidad_medida_id" TEXT NOT NULL,
  ADD COLUMN "presentacion_numerica" DECIMAL(12,4) NOT NULL,
  ADD COLUMN "conversion_a_unidad_id" TEXT NOT NULL,
  ADD COLUMN "conversion_a_unidad_presentacion" DECIMAL(12,4) NOT NULL;

ALTER TABLE "est_por_prod_presentacion"
  ADD CONSTRAINT "est_por_prod_presentacion_unidad_medida_id_fkey"
  FOREIGN KEY ("unidad_medida_id") REFERENCES "est_por_prod_un_presentacion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "est_por_prod_presentacion"
  ADD CONSTRAINT "est_por_prod_presentacion_conversion_a_unidad_id_fkey"
  FOREIGN KEY ("conversion_a_unidad_id") REFERENCES "est_por_prod_un_presentacion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "est_por_prod_presentacion_unidad_medida_id_idx"
  ON "est_por_prod_presentacion"("unidad_medida_id");

CREATE INDEX "est_por_prod_presentacion_conversion_a_unidad_id_idx"
  ON "est_por_prod_presentacion"("conversion_a_unidad_id");
