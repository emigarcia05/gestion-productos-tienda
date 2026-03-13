-- Migración inicial para shadow DB: crea proveedores y lista_precios_tienda
-- que las migraciones 20250310 y 20260227 esperan que existan.
-- Si tu BD ya tiene estas tablas, marcar como aplicada: prisma migrate resolve --applied 20250101000000_initial_proveedores_lista_tienda

-- Proveedores (20250310 añade id_proveedor_dux; 20260227 renombra sufijo -> prefijo)
CREATE TABLE IF NOT EXISTS "proveedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sufijo" TEXT NOT NULL,
    "codigo_unico" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "proveedores_nombre_key" ON "proveedores"("nombre");
CREATE UNIQUE INDEX IF NOT EXISTS "proveedores_sufijo_key" ON "proveedores"("sufijo");

-- Lista precios tienda (20260227 renombra cod_externo -> cod_ext)
CREATE TABLE IF NOT EXISTS "lista_precios_tienda" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cod_externo" TEXT NOT NULL,
    "cod_tienda" TEXT NOT NULL,
    "rubro" TEXT,
    "sub_rubro" TEXT,
    "marca" TEXT,
    "proveedor" TEXT,
    "descripcion_tienda" TEXT,
    "costo_compra" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "px_lista_tienda" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "stock_maipu" INTEGER NOT NULL DEFAULT 0,
    "stock_guaymallen" INTEGER NOT NULL DEFAULT 0,
    "last_sync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lista_precios_tienda_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lista_precios_tienda_cod_externo_key" ON "lista_precios_tienda"("cod_externo");
