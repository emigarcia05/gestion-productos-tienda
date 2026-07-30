-- Catálogo GESTION DISEÑO — objetivos de diseño
CREATE TABLE "prod_ia_diseno_objetivo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_ia_diseno_objetivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prod_ia_diseno_objetivo_nombre_key" ON "prod_ia_diseno_objetivo"("nombre");
