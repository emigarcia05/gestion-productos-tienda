-- Unifica catálogos GESTION DISEÑO en `prod_ia_diseno_catalogo` (kind + nombre + texto).

CREATE TABLE IF NOT EXISTS "prod_ia_diseno_catalogo" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_ia_diseno_catalogo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "prod_ia_diseno_catalogo_kind_nombre_key"
  ON "prod_ia_diseno_catalogo"("kind", "nombre");
CREATE UNIQUE INDEX IF NOT EXISTS "prod_ia_diseno_catalogo_kind_texto_key"
  ON "prod_ia_diseno_catalogo"("kind", "texto");
CREATE INDEX IF NOT EXISTS "prod_ia_diseno_catalogo_kind_idx"
  ON "prod_ia_diseno_catalogo"("kind");

-- Copiar filas desde tablas legacy (si existen).
DO $$
BEGIN
  IF to_regclass('public.prod_ia_diseno_modo_diseno') IS NOT NULL THEN
    INSERT INTO "prod_ia_diseno_catalogo" ("id", "kind", "nombre", "texto", "created_at", "updated_at")
    SELECT "id", 'modo_diseno', "nombre", "texto", "created_at", "updated_at"
    FROM "prod_ia_diseno_modo_diseno"
    ON CONFLICT ("id") DO NOTHING;
  END IF;

  IF to_regclass('public.prod_ia_diseno_objetivo') IS NOT NULL THEN
    INSERT INTO "prod_ia_diseno_catalogo" ("id", "kind", "nombre", "texto", "created_at", "updated_at")
    SELECT "id", 'objetivo', "nombre", "texto", "created_at", "updated_at"
    FROM "prod_ia_diseno_objetivo"
    ON CONFLICT ("id") DO NOTHING;
  END IF;

  IF to_regclass('public.prod_ia_diseno_estilos') IS NOT NULL THEN
    INSERT INTO "prod_ia_diseno_catalogo" ("id", "kind", "nombre", "texto", "created_at", "updated_at")
    SELECT "id", 'estilos', "nombre", "texto", "created_at", "updated_at"
    FROM "prod_ia_diseno_estilos"
    ON CONFLICT ("id") DO NOTHING;
  END IF;

  IF to_regclass('public.prod_ia_diseno_luz_nat') IS NOT NULL THEN
    INSERT INTO "prod_ia_diseno_catalogo" ("id", "kind", "nombre", "texto", "created_at", "updated_at")
    SELECT "id", 'luz_natural', "nombre", "texto", "created_at", "updated_at"
    FROM "prod_ia_diseno_luz_nat"
    ON CONFLICT ("id") DO NOTHING;
  END IF;

  IF to_regclass('public.prod_ia_diseno_luz_art') IS NOT NULL THEN
    INSERT INTO "prod_ia_diseno_catalogo" ("id", "kind", "nombre", "texto", "created_at", "updated_at")
    SELECT "id", 'luz_artificial', "nombre", "texto", "created_at", "updated_at"
    FROM "prod_ia_diseno_luz_art"
    ON CONFLICT ("id") DO NOTHING;
  END IF;

  IF to_regclass('public.prod_ia_diseno_combinar') IS NOT NULL THEN
    INSERT INTO "prod_ia_diseno_catalogo" ("id", "kind", "nombre", "texto", "created_at", "updated_at")
    SELECT "id", 'combinar', "nombre", "texto", "created_at", "updated_at"
    FROM "prod_ia_diseno_combinar"
    ON CONFLICT ("id") DO NOTHING;
  END IF;

  IF to_regclass('public.prod_ia_diseno_sup_pintar') IS NOT NULL THEN
    INSERT INTO "prod_ia_diseno_catalogo" ("id", "kind", "nombre", "texto", "created_at", "updated_at")
    SELECT "id", 'sup_pintar', "nombre", "texto", "created_at", "updated_at"
    FROM "prod_ia_diseno_sup_pintar"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

DROP TABLE IF EXISTS "prod_ia_diseno_modo_diseno" CASCADE;
DROP TABLE IF EXISTS "prod_ia_diseno_objetivo" CASCADE;
DROP TABLE IF EXISTS "prod_ia_diseno_estilos" CASCADE;
DROP TABLE IF EXISTS "prod_ia_diseno_luz_nat" CASCADE;
DROP TABLE IF EXISTS "prod_ia_diseno_luz_art" CASCADE;
DROP TABLE IF EXISTS "prod_ia_diseno_combinar" CASCADE;
DROP TABLE IF EXISTS "prod_ia_diseno_sup_pintar" CASCADE;
