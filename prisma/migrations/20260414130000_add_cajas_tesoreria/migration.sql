-- Tabla de cajas de tesorería.
-- `ult_actualizacion` representa la última vez que cambió el saldo (`monto`).

CREATE TYPE "TipoCajaTesoreria" AS ENUM ('EFECTIVO', 'BANCO', 'OTRA');

CREATE TABLE "cajas_tesoreria" (
    "id" TEXT NOT NULL,
    "nombre_caja" TEXT NOT NULL,
    "tipo_caja" "TipoCajaTesoreria" NOT NULL,
    "monto" INTEGER NOT NULL DEFAULT 0,
    "ult_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cajas_tesoreria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cajas_tesoreria_nombre_caja_key" ON "cajas_tesoreria"("nombre_caja");
CREATE INDEX "cajas_tesoreria_tipo_caja_idx" ON "cajas_tesoreria"("tipo_caja");

CREATE OR REPLACE FUNCTION set_cajas_tesoreria_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  IF NEW.monto IS DISTINCT FROM OLD.monto THEN
    NEW.ult_actualizacion = CURRENT_TIMESTAMP;
  ELSE
    NEW.ult_actualizacion = OLD.ult_actualizacion;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cajas_tesoreria_set_timestamps
BEFORE UPDATE ON "cajas_tesoreria"
FOR EACH ROW
EXECUTE FUNCTION set_cajas_tesoreria_timestamps();
