-- Catálogo GESTION DISEÑO — Modo de Diseño (pregunta 1, obligatorio, 1 respuesta).
CREATE TABLE IF NOT EXISTS "prod_ia_diseno_modo_diseno" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_ia_diseno_modo_diseno_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "prod_ia_diseno_modo_diseno_nombre_key" ON "prod_ia_diseno_modo_diseno"("nombre");
CREATE UNIQUE INDEX IF NOT EXISTS "prod_ia_diseno_modo_diseno_texto_key" ON "prod_ia_diseno_modo_diseno"("texto");
