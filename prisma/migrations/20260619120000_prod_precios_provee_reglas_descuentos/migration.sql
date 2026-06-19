-- Motor de reglas de descuentos para prod_precios_provee (Fase 0+1).
-- Columnas dto_* / cx_transporte siguen siendo caché materializada; px_compra_final_sin_iva GENERATED intacta.

DO $$ BEGIN
  CREATE TYPE "CampoReglaDescuentoListaPrecio" AS ENUM (
    'dto_proveedor',
    'dto_marca',
    'dto_rubro',
    'dto_cantidad',
    'dto_financiero',
    'cx_transporte'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "prod_rubros_lista" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "prod_rubros_lista_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "prod_rubros_lista_nombre_key"
  ON "prod_rubros_lista" ("nombre");

CREATE TABLE IF NOT EXISTS "prod_precios_provee_reglas" (
  "id" TEXT NOT NULL,
  "campo" "CampoReglaDescuentoListaPrecio" NOT NULL,
  "valor" DECIMAL(5, 2) NOT NULL,
  "id_proveedor" TEXT,
  "id_marca" TEXT,
  "id_rubro" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "prod_precios_provee_reglas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prod_precios_provee_reglas_valor_check"
    CHECK ("valor" >= 0 AND "valor" <= 100),
  CONSTRAINT "prod_precios_provee_reglas_al_menos_una_condicion_check"
    CHECK (
      "id_proveedor" IS NOT NULL
      OR "id_marca" IS NOT NULL
      OR "id_rubro" IS NOT NULL
    ),
  CONSTRAINT "prod_precios_provee_reglas_id_proveedor_fkey"
    FOREIGN KEY ("id_proveedor") REFERENCES "global_proveedores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "prod_precios_provee_reglas_id_marca_fkey"
    FOREIGN KEY ("id_marca") REFERENCES "prod_marcas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "prod_precios_provee_reglas_id_rubro_fkey"
    FOREIGN KEY ("id_rubro") REFERENCES "prod_rubros_lista"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "prod_precios_provee_reglas_campo_idx"
  ON "prod_precios_provee_reglas" ("campo");

CREATE INDEX IF NOT EXISTS "prod_precios_provee_reglas_id_proveedor_idx"
  ON "prod_precios_provee_reglas" ("id_proveedor");

CREATE INDEX IF NOT EXISTS "prod_precios_provee_reglas_id_marca_idx"
  ON "prod_precios_provee_reglas" ("id_marca");

CREATE INDEX IF NOT EXISTS "prod_precios_provee_reglas_id_rubro_idx"
  ON "prod_precios_provee_reglas" ("id_rubro");

-- Unicidad de condiciones por campo (NULL = comodín → COALESCE con sentinela vacío).
CREATE UNIQUE INDEX IF NOT EXISTS "prod_precios_provee_reglas_campo_dims_ux"
  ON "prod_precios_provee_reglas" (
    "campo",
    COALESCE("id_proveedor", ''),
    COALESCE("id_marca", ''),
    COALESCE("id_rubro", '')
  );

-- Seed opcional: rubros distintos de lista proveedor y tienda (sin inferir reglas desde dto_* actuales).
INSERT INTO "prod_rubros_lista" ("id", "nombre", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  src.nombre,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM("rubro") AS nombre
  FROM "prod_precios_provee"
  WHERE "rubro" IS NOT NULL AND TRIM("rubro") <> ''
  UNION
  SELECT DISTINCT TRIM("rubro") AS nombre
  FROM "prod_tienda"
  WHERE "rubro" IS NOT NULL AND TRIM("rubro") <> ''
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM "prod_rubros_lista" r WHERE r."nombre" = src.nombre
);
