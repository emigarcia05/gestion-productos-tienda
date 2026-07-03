-- Filtros de categorización en reglas desc. específico (proveedor / marca / rubro).

ALTER TABLE "prod_precios_desc_especial_regla"
  ADD COLUMN "id_proveedor" TEXT,
  ADD COLUMN "id_marca" TEXT,
  ADD COLUMN "id_rubro" TEXT;

ALTER TABLE "prod_precios_desc_especial_regla"
  ADD CONSTRAINT "pp_desc_esp_regla_id_proveedor_fkey"
    FOREIGN KEY ("id_proveedor") REFERENCES "global_proveedores"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "pp_desc_esp_regla_id_marca_fkey"
    FOREIGN KEY ("id_marca") REFERENCES "prod_marcas"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "pp_desc_esp_regla_id_rubro_fkey"
    FOREIGN KEY ("id_rubro") REFERENCES "prod_rubros_lista"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "pp_desc_esp_regla_id_proveedor_idx"
  ON "prod_precios_desc_especial_regla" ("id_proveedor");
CREATE INDEX "pp_desc_esp_regla_id_marca_idx"
  ON "prod_precios_desc_especial_regla" ("id_marca");
CREATE INDEX "pp_desc_esp_regla_id_rubro_idx"
  ON "prod_precios_desc_especial_regla" ("id_rubro");
