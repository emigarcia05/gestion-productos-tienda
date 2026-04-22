-- Renombrar cajas de tesorería y alta de cheques por caja (solo tipo CHEQUE).
-- Totales de disponibilidad: suma de cheques con fecha_acreditacion <= hoy (AR) en aplicación.

-- ─── 1) Tabla fin_tesoreria_cajas → fin_tesoreria ─────────────────────────
ALTER TABLE "fin_tesoreria_cajas" RENAME TO "fin_tesoreria";

ALTER INDEX "fin_tesoreria_cajas_pkey" RENAME TO "fin_tesoreria_pkey";
ALTER INDEX "fin_tesoreria_cajas_nombre_titular_ux" RENAME TO "fin_tesoreria_nombre_titular_ux";
ALTER INDEX "fin_tesoreria_cajas_tipo_caja_idx" RENAME TO "fin_tesoreria_tipo_caja_idx";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fin_tesoreria_cajas_set_timestamps') THEN
    EXECUTE 'ALTER TRIGGER "fin_tesoreria_cajas_set_timestamps" ON "fin_tesoreria" RENAME TO "fin_tesoreria_set_timestamps"';
  END IF;
END $$;

-- ─── 2) Detalle de cheques por caja CHEQUE ─────────────────────────────────
CREATE TABLE "fin_tesoreria_cheques" (
    "id" TEXT NOT NULL,
    "caja_id" TEXT NOT NULL,
    "emisor" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "fecha_acreditacion" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_tesoreria_cheques_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fin_tesoreria_cheques_monto_check" CHECK ("monto" >= 0)
);

CREATE INDEX "fin_tesoreria_cheques_caja_id_idx" ON "fin_tesoreria_cheques"("caja_id");
CREATE INDEX "fin_tesoreria_cheques_caja_id_fecha_acreditacion_idx"
    ON "fin_tesoreria_cheques"("caja_id", "fecha_acreditacion");

ALTER TABLE "fin_tesoreria_cheques"
ADD CONSTRAINT "fin_tesoreria_cheques_caja_id_fkey"
FOREIGN KEY ("caja_id") REFERENCES "fin_tesoreria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Solo cajas con tipo_caja = CHEQUE pueden tener filas en fin_tesoreria_cheques.
CREATE OR REPLACE FUNCTION fin_tesoreria_cheques_assert_caja_cheque()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "fin_tesoreria" t
    WHERE t."id" = NEW."caja_id"
      AND t."tipo_caja" = 'CHEQUE'::"TipoCajaTesoreria"
  ) THEN
    RAISE EXCEPTION 'fin_tesoreria_cheques: la caja debe existir y tener tipo_caja CHEQUE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "fin_tesoreria_cheques_assert_caja_cheque_trg"
BEFORE INSERT OR UPDATE ON "fin_tesoreria_cheques"
FOR EACH ROW
EXECUTE FUNCTION fin_tesoreria_cheques_assert_caja_cheque();
