-- Cargas de ventas para balance (sucursal con genera_balance validada en app).
CREATE TABLE "fin_bal_vtas" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_bal_vtas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fin_bal_vtas_sucursal_id_fkey"
        FOREIGN KEY ("sucursal_id") REFERENCES "global_sucursales"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "fin_bal_vtas_sucursal_id_idx" ON "fin_bal_vtas"("sucursal_id");
