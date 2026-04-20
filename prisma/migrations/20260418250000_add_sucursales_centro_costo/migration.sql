-- Agrega el flag `sucursales.centro_costo` (Prisma: `Sucursal.centroCosto`).
--
-- Semántica:
--   Indica si la sucursal se considera "centro de costo" en reportes de
--   balance / imputación contable. Es un concepto ortogonal a `pedido`
--   (participación en flujos de pedidos de mercadería): una sucursal puede
--   ser centro de costo sin recibir pedidos (ej. CORPORATIVO) y viceversa.
--
-- Diseño:
--   * `BOOLEAN NOT NULL` con `DEFAULT FALSE`.
--   * Los registros preexistentes (GUAYMALLEN, MAIPU, CORPORATIVO, etc.) quedan
--     en `false` (opt-in explícito). Si alguna debe ser centro de costo,
--     marcarla con un `UPDATE` posterior (no se hace backfill automático:
--     hoy no hay una regla universal que permita derivar el valor a partir
--     de columnas existentes).
--   * Sin índice: cardinalidad baja (2 valores) y el flag se leerá siempre
--     como payload del registro, no como predicado en queries masivas.
--
-- Idempotente: la columna no preexiste (primer uso del nombre en la tabla).

ALTER TABLE "sucursales"
    ADD COLUMN "centro_costo" BOOLEAN NOT NULL DEFAULT FALSE;
