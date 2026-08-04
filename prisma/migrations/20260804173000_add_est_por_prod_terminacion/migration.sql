-- Catálogo de terminaciones para match en descripciones de producto.
CREATE TABLE "est_por_prod_terminacion" (
    "id" TEXT NOT NULL,
    "terminacion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "est_por_prod_terminacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "est_por_prod_terminacion_terminacion_key" ON "est_por_prod_terminacion"("terminacion");
