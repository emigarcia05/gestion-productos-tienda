-- Catálogo prod_precios_rex: descripción + precio unitario por ítem.

CREATE TABLE "prod_precios_rex" (
  "id" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "precio" DECIMAL(14, 4) NOT NULL,

  CONSTRAINT "prod_precios_rex_pkey" PRIMARY KEY ("id")
);
