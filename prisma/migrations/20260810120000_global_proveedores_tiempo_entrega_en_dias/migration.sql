-- Tiempo de entrega del proveedor en días (entero ≥ 0; NULL = no configurado).

ALTER TABLE "global_proveedores"
  ADD COLUMN IF NOT EXISTS "tiempo_entrega_en_dias" INTEGER;
