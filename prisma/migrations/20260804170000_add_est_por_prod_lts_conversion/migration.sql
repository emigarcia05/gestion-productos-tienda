-- Catálogo texto → litros para match en descripciones de producto.
CREATE TABLE "est_por_prod_lts_conversion" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "conversion_lts" DECIMAL(12,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "est_por_prod_lts_conversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "est_por_prod_lts_conversion_texto_key" ON "est_por_prod_lts_conversion"("texto");
