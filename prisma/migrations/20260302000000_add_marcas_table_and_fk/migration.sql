-- Tabla de marcas (catálogo); se vincula con lista_precios_tienda desde el texto "marca" de la API.
CREATE TABLE "marcas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");

-- Poblar marcas con los valores distintos de lista_precios_tienda.marca (texto de la API).
INSERT INTO "marcas" ("id", "nombre", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "nombre", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT trim("marca") AS "nombre"
    FROM "lista_precios_tienda"
    WHERE "marca" IS NOT NULL AND trim("marca") != ''
) AS "distinct_marcas";

-- Columna FK en lista_precios_tienda (nullable; la columna "marca" texto se mantiene).
ALTER TABLE "lista_precios_tienda" ADD COLUMN "id_marca" TEXT;

-- Vincular cada fila con su marca según el texto actual.
UPDATE "lista_precios_tienda" AS "t"
SET "id_marca" = "m"."id"
FROM "marcas" AS "m"
WHERE trim("t"."marca") = "m"."nombre"
  AND "t"."marca" IS NOT NULL
  AND trim("t"."marca") != '';

-- Constraint FK después del update para no fallar por valores no resueltos.
ALTER TABLE "lista_precios_tienda" ADD CONSTRAINT "lista_precios_tienda_id_marca_fkey"
    FOREIGN KEY ("id_marca") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
