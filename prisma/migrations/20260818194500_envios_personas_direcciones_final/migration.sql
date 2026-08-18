-- Módulo Vendedor · ENVIOS: catálogo de personas, direcciones y envío final.

CREATE TYPE "EnviosPersonaTipo" AS ENUM ('CLIENTE_FINAL', 'PINTOR');
CREATE TYPE "EnviosFormaPagado" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'POSNET', 'CUENTA_CORRIENTE');

CREATE TABLE "envios_personas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "cel" TEXT NOT NULL,
    "tipo" "EnviosPersonaTipo" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "envios_personas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "envios_personas_tipo_idx" ON "envios_personas"("tipo");
CREATE INDEX "envios_personas_apellido_nombre_idx" ON "envios_personas"("apellido", "nombre");

CREATE TABLE "envios_direcciones" (
    "id" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "numeracion" TEXT NOT NULL,
    "url_maps" TEXT,
    "referencia" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "envios_direcciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "envios_direcciones_direccion_idx" ON "envios_direcciones"("direccion");

CREATE TABLE "envios_final" (
    "id" TEXT NOT NULL,
    "cliente_final_id" TEXT,
    "pintor_id" TEXT,
    "direccion_id" TEXT NOT NULL,
    "observacion_envio" TEXT NOT NULL DEFAULT '',
    "pdf_comprobante_nombre" TEXT,
    "pdf_comprobante" BYTEA,
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "forma_pagado" "EnviosFormaPagado" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "envios_final_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "envios_final_al_menos_una_persona_chk" CHECK ("cliente_final_id" IS NOT NULL OR "pintor_id" IS NOT NULL)
);

CREATE INDEX "envios_final_cliente_final_id_idx" ON "envios_final"("cliente_final_id");
CREATE INDEX "envios_final_pintor_id_idx" ON "envios_final"("pintor_id");
CREATE INDEX "envios_final_direccion_id_idx" ON "envios_final"("direccion_id");
CREATE INDEX "envios_final_pagado_idx" ON "envios_final"("pagado");

ALTER TABLE "envios_final"
ADD CONSTRAINT "envios_final_cliente_final_id_fkey"
FOREIGN KEY ("cliente_final_id") REFERENCES "envios_personas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "envios_final"
ADD CONSTRAINT "envios_final_pintor_id_fkey"
FOREIGN KEY ("pintor_id") REFERENCES "envios_personas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "envios_final"
ADD CONSTRAINT "envios_final_direccion_id_fkey"
FOREIGN KEY ("direccion_id") REFERENCES "envios_direcciones"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
