-- Tabla nueva `prod_ped_merc_2`: modelo reducido para evolución de pedidos (REPOSICION / URGENTE / TINTOMETRICO).
-- FK `sucursal_id` → `global_sucursales.id`.

CREATE TABLE "prod_ped_merc_2" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
    "tipo_de_pedido" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "urgente_cod_ext" TEXT,
    "urgente_cant_pedir" INTEGER NOT NULL DEFAULT 0,
    "tintometrico_descripcion" TEXT,
    "tintometrio_cant_pedir" INTEGER NOT NULL DEFAULT 0,
    "reposicion_forma_pedido" TEXT,
    "reposicion_punto_pedido" INTEGER,
    "reposicion_cant_conf" INTEGER,

    CONSTRAINT "prod_ped_merc_2_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prod_ped_merc_2_tipo_de_pedido_check" CHECK (
        "tipo_de_pedido" IN ('REPOSICION', 'URGENTE', 'TINTOMETRICO')
    ),
    CONSTRAINT "prod_ped_merc_2_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "global_sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "prod_ped_merc_2_sucursal_tipo_idx" ON "prod_ped_merc_2"("sucursal_id", "tipo_de_pedido");
