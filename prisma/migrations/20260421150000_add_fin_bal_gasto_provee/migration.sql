-- Asignaciones gasto de catálogo (fin_bal_cat_gasto) ↔ proveedor (global_proveedores).
-- Un gasto puede tener N filas; mismo proveedor no se repite por gasto (UNIQUE compuesto).

CREATE TABLE "fin_bal_gasto_provee" (
    "id" TEXT NOT NULL,
    "gasto_id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "gasto_mensual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_bal_gasto_provee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_bal_gasto_provee_gasto_proveedor_ux" ON "fin_bal_gasto_provee" ("gasto_id", "proveedor_id");

CREATE INDEX "fin_bal_gasto_provee_gasto_id_idx" ON "fin_bal_gasto_provee" ("gasto_id");

CREATE INDEX "fin_bal_gasto_provee_proveedor_id_idx" ON "fin_bal_gasto_provee" ("proveedor_id");

ALTER TABLE "fin_bal_gasto_provee"
ADD CONSTRAINT "fin_bal_gasto_provee_gasto_id_fkey"
FOREIGN KEY ("gasto_id") REFERENCES "fin_bal_cat_gasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fin_bal_gasto_provee"
ADD CONSTRAINT "fin_bal_gasto_provee_proveedor_id_fkey"
FOREIGN KEY ("proveedor_id") REFERENCES "global_proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
