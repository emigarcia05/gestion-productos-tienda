-- Catálogo de personal DUX para recepción de compras (campo id_personal en POST v2/compras).
-- Filas: carga manual o sync futuro desde API Consultar Personales DUX.

CREATE TABLE IF NOT EXISTS "global_personal" (
  "id_personal" INTEGER NOT NULL,
  "nombre_personal" TEXT NOT NULL,
  CONSTRAINT "global_personal_pkey" PRIMARY KEY ("id_personal")
);
