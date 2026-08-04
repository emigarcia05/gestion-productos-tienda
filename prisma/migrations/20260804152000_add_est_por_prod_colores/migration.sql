-- Catálogo de colores para match por nombre en descripciones de producto.
CREATE TABLE "est_por_prod_colores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "est_por_prod_colores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "est_por_prod_colores_nombre_key" ON "est_por_prod_colores"("nombre");

-- Colores iniciales habituales en pinturería (MAYÚSCULAS).
INSERT INTO "est_por_prod_colores" ("id", "nombre") VALUES
  ('est_color_blanco', 'BLANCO'),
  ('est_color_negro', 'NEGRO'),
  ('est_color_azul', 'AZUL'),
  ('est_color_rojo', 'ROJO'),
  ('est_color_verde', 'VERDE'),
  ('est_color_amarillo', 'AMARILLO'),
  ('est_color_gris', 'GRIS'),
  ('est_color_beige', 'BEIGE'),
  ('est_color_marron', 'MARRON'),
  ('est_color_celeste', 'CELESTE'),
  ('est_color_rosa', 'ROSA'),
  ('est_color_naranja', 'NARANJA'),
  ('est_color_violeta', 'VIOLETA'),
  ('est_color_crema', 'CREMA'),
  ('est_color_incoloro', 'INCOLORO');
