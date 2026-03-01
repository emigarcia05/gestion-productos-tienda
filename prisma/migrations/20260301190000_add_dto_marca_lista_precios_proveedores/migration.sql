-- Añadir columna dto_marca (descuento por marca, 0-100%) a lista_precios_proveedores
ALTER TABLE "lista_precios_proveedores"
ADD COLUMN IF NOT EXISTS "dto_marca" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lista_precios_proveedores_dto_marca_range') THEN
    ALTER TABLE "lista_precios_proveedores"
    ADD CONSTRAINT "lista_precios_proveedores_dto_marca_range"
    CHECK ("dto_marca" >= 0 AND "dto_marca" <= 100);
  END IF;
END $$;
