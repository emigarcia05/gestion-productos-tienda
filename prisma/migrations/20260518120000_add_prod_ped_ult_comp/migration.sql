-- Contador global para columna COMPROBANTE del Excel de recepción de pedidos (una sola fila, id = 1).
CREATE TABLE "prod_ped_ult_comp" (
    "id" INTEGER NOT NULL,
    "ult_comprobante" TEXT NOT NULL,
    CONSTRAINT "prod_ped_ult_comp_pkey" PRIMARY KEY ("id")
);

INSERT INTO "prod_ped_ult_comp" ("id", "ult_comprobante") VALUES (1, '1234568959');
