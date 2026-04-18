-- Catálogo de tipos de gasto para Finanzas → Balance.
-- Única columna funcional: `nombre` (único). `id`/timestamps según estándar del proyecto.

CREATE TABLE "fin_bal_gasto_tipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_bal_gasto_tipo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fin_bal_gasto_tipo_nombre_key" ON "fin_bal_gasto_tipo"("nombre");
