-- Saldo IVA configurable para comparación de costos entre proveedores en pedidos.

CREATE TABLE "fin_bal_posicion_iva_comparacion_pedido" (
  "id" TEXT NOT NULL,
  "usar_valor_configurado" BOOLEAN NOT NULL DEFAULT false,
  "saldo_pesos" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fin_bal_posicion_iva_comparacion_pedido_pkey" PRIMARY KEY ("id")
);

INSERT INTO "fin_bal_posicion_iva_comparacion_pedido" ("id", "usar_valor_configurado", "saldo_pesos", "updated_at")
VALUES ('comparacion_pedido', false, 0, CURRENT_TIMESTAMP);
