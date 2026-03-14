-- Migración inicial para shadow DB: crea proveedores y lista_precios_tienda.
-- Si tu BD ya tiene estas tablas, puedes marcarla como aplicada desde la CLI.

-- Proveedores
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

-- Lista precios tienda
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

-- Lista precios proveedores (20260228 renombra columnas; 20260301180000 añade FK a lista_precios_tienda)
CREATE TABLE IF NOT EXISTS "lista_precios_proveedores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_proveedor" TEXT NOT NULL,
    "cod_prod_proveedor" TEXT NOT NULL,
    "descripcion_proveedor" TEXT NOT NULL,
    "cod_ext" TEXT NOT NULL,
    "px_lista_proveedor" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "descuento_producto" INTEGER NOT NULL DEFAULT 0,
    "descuento_cantidad" INTEGER NOT NULL DEFAULT 0,
    "cx_transporte" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lista_precios_proveedores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "lista_precios_proveedores_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "lista_precios_proveedores_cod_ext_key" ON "lista_precios_proveedores"("cod_ext");
