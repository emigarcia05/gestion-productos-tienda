-- Claves naturales:
-- - prod_precios_tienda: PK cod_tienda (deja de existir column id uuid).
-- - prod_precios_provee: PK cod_ext global (prefijo + código import); vínculo a tienda vía FK cod_tienda → prod_precios_tienda(cod_tienda).
--
-- prereq: cod_ext debe ser único en prod_precios_provee (detectar antes de DROP id).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM prod_precios_provee GROUP BY cod_ext HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migración abortada: cod_ext duplicados en prod_precios_provee. Corregí datos antes de continuar.';
  END IF;
END $$;

-- Satélites que apuntaban a prod_precios_provee(id UUID)
ALTER TABLE "prod_comp_dto_extra"
  DROP CONSTRAINT IF EXISTS "prod_comp_dto_extra_id_lista_precios_proveedores_fkey";

ALTER TABLE "prod_comp_presentaciones"
  DROP CONSTRAINT IF EXISTS "prod_comp_presentaciones_id_producto_referencia_fkey";

ALTER TABLE "prod_comp_dto_extra" ADD COLUMN "cod_ext_prod_precios_provee" TEXT;

UPDATE "prod_comp_dto_extra" AS d
SET "cod_ext_prod_precios_provee" = p.cod_ext
FROM "prod_precios_provee" AS p
WHERE d.id_lista_precios_proveedores = p.id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "prod_comp_dto_extra" WHERE "cod_ext_prod_precios_provee" IS NULL) THEN
    RAISE EXCEPTION 'prod_comp_dto_extra: filas sin match en prod_precios_provee (id_lista_precios_proveedores huérfano).';
  END IF;
END $$;

ALTER TABLE "prod_comp_dto_extra" DROP CONSTRAINT IF EXISTS "prod_comp_dto_extra_id_lista_precios_proveedores_key";

DROP INDEX IF EXISTS "prod_comp_dto_extra_id_lista_precios_proveedores_key";

ALTER TABLE "prod_comp_dto_extra" DROP COLUMN "id_lista_precios_proveedores";

ALTER TABLE "prod_comp_dto_extra" ALTER COLUMN "cod_ext_prod_precios_provee" SET NOT NULL;

CREATE UNIQUE INDEX "prod_comp_dto_extra_cod_ext_prod_precios_provee_key"
  ON "prod_comp_dto_extra" ("cod_ext_prod_precios_provee");

ALTER TABLE "prod_comp_presentaciones" ADD COLUMN "prod_ref_cod_ext" TEXT;

UPDATE "prod_comp_presentaciones" AS pr
SET "prod_ref_cod_ext" = p.cod_ext
FROM "prod_precios_provee" AS p
WHERE pr.id_producto_referencia IS NOT NULL
  AND pr.id_producto_referencia = p.id;

ALTER TABLE "prod_comp_presentaciones" DROP COLUMN "id_producto_referencia";

CREATE UNIQUE INDEX "prod_comp_presentaciones_prod_ref_cod_ext_key"
  ON "prod_comp_presentaciones" ("prod_ref_cod_ext");

-- Vínculo lista proveedor → tienda (antes por id_lista_precios_tienda → prod_precios_tienda.id)
ALTER TABLE "prod_precios_provee"
  DROP CONSTRAINT IF EXISTS "lista_precios_proveedores_id_lista_precios_tienda_fkey";

ALTER TABLE "prod_precios_provee"
  DROP CONSTRAINT IF EXISTS "prod_precios_provee_id_lista_precios_tienda_fkey";

ALTER TABLE "prod_precios_provee" ADD COLUMN "cod_tienda_vinc" TEXT;

UPDATE "prod_precios_provee" AS pp
SET "cod_tienda_vinc" = pt.cod_tienda
FROM "prod_precios_tienda" AS pt
WHERE pp.id_lista_precios_tienda IS NOT NULL
  AND pp.id_lista_precios_tienda = pt.id;

ALTER TABLE "prod_precios_provee" DROP COLUMN "id_lista_precios_tienda";

ALTER TABLE "prod_precios_provee" RENAME COLUMN "cod_tienda_vinc" TO "cod_tienda";

-- PK tienda: id → cod_tienda
ALTER TABLE "prod_precios_tienda" DROP CONSTRAINT "prod_precios_tienda_pkey";

ALTER TABLE "prod_precios_tienda" DROP COLUMN "id";

ALTER TABLE "prod_precios_tienda" ADD PRIMARY KEY ("cod_tienda");

ALTER TABLE "prod_precios_provee"
  ADD CONSTRAINT "prod_precios_provee_cod_tienda_fkey"
  FOREIGN KEY ("cod_tienda") REFERENCES "prod_precios_tienda"("cod_tienda")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PK proveedor lista: id uuid → cod_ext
ALTER TABLE "prod_precios_provee" DROP CONSTRAINT "prod_precios_provee_pkey";

-- cod_ext único: en esta BD llegó como CONSTRAINT + índice con el mismo nombre (ver migración rename 20260418290000).
ALTER TABLE "prod_precios_provee" DROP CONSTRAINT IF EXISTS "prod_precios_provee_cod_ext_ux";

ALTER TABLE "prod_precios_provee" DROP COLUMN "id";

ALTER TABLE "prod_precios_provee" ADD PRIMARY KEY ("cod_ext");

ALTER TABLE "prod_comp_dto_extra"
  ADD CONSTRAINT "prod_comp_dto_extra_cod_ext_prod_precios_provee_fkey"
  FOREIGN KEY ("cod_ext_prod_precios_provee") REFERENCES "prod_precios_provee"("cod_ext")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "prod_comp_presentaciones"
  ADD CONSTRAINT "prod_comp_presentaciones_prod_ref_cod_ext_fkey"
  FOREIGN KEY ("prod_ref_cod_ext") REFERENCES "prod_precios_provee"("cod_ext")
  ON DELETE SET NULL ON UPDATE CASCADE;
