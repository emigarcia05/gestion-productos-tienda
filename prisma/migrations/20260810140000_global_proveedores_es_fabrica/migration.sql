-- Flag "es fábrica" en catálogo de proveedores (Pedido A Fábrica).
-- Default false: opt-in explícito desde el modal Editar/Nuevo Proveedor.

ALTER TABLE "global_proveedores"
  ADD COLUMN IF NOT EXISTS "es_fabrica" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "global_proveedores_es_fabrica_idx"
  ON "global_proveedores"("es_fabrica");
