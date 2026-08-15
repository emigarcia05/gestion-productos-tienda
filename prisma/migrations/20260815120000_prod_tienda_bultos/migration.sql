-- Unidades por bulto (1:1 con prod_tienda). Sin fila = valor vacío en Cx Compra.
CREATE TABLE IF NOT EXISTS "prod_tienda_bultos" (
    "cod_tienda" TEXT NOT NULL,
    "bulto" INTEGER NOT NULL,

    CONSTRAINT "prod_tienda_bultos_pkey" PRIMARY KEY ("cod_tienda"),
    CONSTRAINT "prod_tienda_bultos_bulto_positivo" CHECK ("bulto" > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prod_tienda_bultos_cod_tienda_fkey'
  ) THEN
    ALTER TABLE "prod_tienda_bultos"
      ADD CONSTRAINT "prod_tienda_bultos_cod_tienda_fkey"
      FOREIGN KEY ("cod_tienda") REFERENCES "prod_tienda"("cod_tienda")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
