-- Catálogos GESTION DISEÑO (Asistente IA)
CREATE TABLE "prod_ia_diseno_sup_pintar" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_ia_diseno_sup_pintar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prod_ia_diseno_sup_pintar_nombre_key" ON "prod_ia_diseno_sup_pintar"("nombre");

CREATE TABLE "prod_ia_diseno_estilos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_ia_diseno_estilos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prod_ia_diseno_estilos_nombre_key" ON "prod_ia_diseno_estilos"("nombre");

CREATE TABLE "prod_ia_diseno_combinar" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_ia_diseno_combinar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prod_ia_diseno_combinar_nombre_key" ON "prod_ia_diseno_combinar"("nombre");
