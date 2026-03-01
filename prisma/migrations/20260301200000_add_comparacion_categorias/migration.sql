-- Comparación por categorías: Categoria → Subcategoria → Presentacion
CREATE TABLE "categorias_comparacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_comparacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subcategorias_comparacion" (
    "id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategorias_comparacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "presentaciones_comparacion" (
    "id" TEXT NOT NULL,
    "subcategoria_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "costo_compra_objetivo" DECIMAL(14,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presentaciones_comparacion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "subcategorias_comparacion" ADD CONSTRAINT "subcategorias_comparacion_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_comparacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "presentaciones_comparacion" ADD CONSTRAINT "presentaciones_comparacion_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "subcategorias_comparacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lista_precios_proveedores" ADD COLUMN IF NOT EXISTS "id_presentacion" TEXT;

ALTER TABLE "lista_precios_proveedores" ADD CONSTRAINT "lista_precios_proveedores_id_presentacion_fkey" FOREIGN KEY ("id_presentacion") REFERENCES "presentaciones_comparacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
