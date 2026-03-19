-- DTO. EXTRA editable para "Comp. Por Cat." (por ítem / ListaPrecioProveedor)
-- Evita tocar precios_proveedores y deja el ajuste aislado al módulo.

CREATE TABLE "comparacion_dto_extra_items" (
    "id" TEXT NOT NULL,
    "id_lista_precios_proveedores" UUID NOT NULL,
    "dto_extra" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comparacion_dto_extra_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "comparacion_dto_extra_items_id_lista_precios_proveedores_key" UNIQUE ("id_lista_precios_proveedores"),
    CONSTRAINT "comparacion_dto_extra_items_id_lista_precios_proveedores_fkey"
      FOREIGN KEY ("id_lista_precios_proveedores") REFERENCES "precios_proveedores"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

