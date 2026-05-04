ALTER TABLE "prod_ped_historial"
ADD COLUMN IF NOT EXISTS "recepcion_numero" INTEGER NOT NULL DEFAULT 0;
