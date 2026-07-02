-- Unifica prod_comp_dto_extra + prod_comp_dif_px_ref_manual en prod_comp_cat (ajustes por ítem).
-- El catálogo maestro CategoriaComparacion pasa de prod_comp_cat → prod_comp_categorias.

ALTER TABLE "prod_comp_cat" RENAME TO "prod_comp_categorias";

ALTER INDEX IF EXISTS "prod_comp_cat_pkey" RENAME TO "prod_comp_categorias_pkey";

CREATE TABLE "prod_comp_cat" (
  "id" TEXT NOT NULL,
  "cod_ext_prod_precios_provee" TEXT NOT NULL,
  "dto_extra" INTEGER,
  "dif_px_ref_manual" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prod_comp_cat_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prod_comp_cat_cod_ext_prod_precios_provee_key" UNIQUE ("cod_ext_prod_precios_provee"),
  CONSTRAINT "prod_comp_cat_cod_ext_prod_precios_provee_fkey"
    FOREIGN KEY ("cod_ext_prod_precios_provee")
    REFERENCES "prod_precios_provee"("cod_ext")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "prod_comp_cat" (
  "id",
  "cod_ext_prod_precios_provee",
  "dto_extra",
  "dif_px_ref_manual",
  "created_at",
  "updated_at"
)
SELECT
  COALESCE(d."id", m."id"),
  COALESCE(d."cod_ext_prod_precios_provee", m."cod_ext_prod_precios_provee"),
  d."dto_extra",
  m."dif_px_ref_manual",
  LEAST(COALESCE(d."created_at", m."created_at"), COALESCE(m."created_at", d."created_at")),
  GREATEST(COALESCE(d."updated_at", m."updated_at"), COALESCE(m."updated_at", d."updated_at"))
FROM "prod_comp_dto_extra" d
FULL OUTER JOIN "prod_comp_dif_px_ref_manual" m
  ON d."cod_ext_prod_precios_provee" = m."cod_ext_prod_precios_provee";

DROP TABLE "prod_comp_dto_extra";
DROP TABLE "prod_comp_dif_px_ref_manual";
