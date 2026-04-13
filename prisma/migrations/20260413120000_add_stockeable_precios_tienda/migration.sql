-- Indica si el ítem es stockeable según DUX (sync usa ctd_disponible no nulo en ambos depósitos; ver duxApi mapItem).
-- Filas existentes: true hasta que una sync DUX recalcule según la API.
ALTER TABLE "precios_tienda" ADD COLUMN IF NOT EXISTS "stockeable" BOOLEAN NOT NULL DEFAULT true;
