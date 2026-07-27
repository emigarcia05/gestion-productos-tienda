-- Asistente IA: prompt + URL por submódulo (sección IA_DISEÑO).
CREATE TABLE IF NOT EXISTS "prod_ia_diseno_promp" (
  "id" TEXT NOT NULL,
  "submodulo" TEXT NOT NULL,
  "promp" TEXT NOT NULL,
  "url_redireccion" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "prod_ia_diseno_promp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "prod_ia_diseno_promp_submodulo_key"
  ON "prod_ia_diseno_promp"("submodulo");

-- Seed inicial: Buscar Color Desde Imagen
INSERT INTO "prod_ia_diseno_promp" ("id", "submodulo", "promp", "url_redireccion", "created_at", "updated_at")
VALUES (
  'cmiadiseno0buscacolor0001',
  'Buscar Color Desde Imagen',
  'Usá nuestra base de datos "colores_alba_ia" (carta oficial Alba) y buscá el color más parecido al de la imagen adjunta. Respondé con código Alba, nombre, HEX y una breve justificación.',
  'https://chatgpt.com/c/6a6770f3-1a34-83e9-b9a6-a24c979961b0',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("submodulo") DO NOTHING;
