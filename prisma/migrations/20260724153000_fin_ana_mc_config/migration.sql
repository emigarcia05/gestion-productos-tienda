-- Defaults del módulo Margen Contribución / condiciones Cat. M.C.
CREATE TABLE "fin_ana_mc_config" (
    "id" TEXT NOT NULL,
    "terminal_id" TEXT,
    "tipo_comprobante" TEXT NOT NULL,
    "variable_objetivo" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_ana_mc_config_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "fin_ana_mc_config"
  ADD CONSTRAINT "fin_ana_mc_config_terminal_id_fkey"
  FOREIGN KEY ("terminal_id") REFERENCES "fin_ana_cos_fina_terminales"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "fin_ana_mc_config" ("id", "terminal_id", "tipo_comprobante", "variable_objetivo", "updated_at")
VALUES ('DEFAULT', NULL, 'FACTURA_A', 'MC_PONDERADO', CURRENT_TIMESTAMP);
