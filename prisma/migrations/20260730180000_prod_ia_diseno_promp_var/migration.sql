-- Alias de variables por prompt (fuente canónica → token MAYÚSCULA).
CREATE TABLE "prod_ia_diseno_promp_var" (
    "id" TEXT NOT NULL,
    "promp_id" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "variable" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prod_ia_diseno_promp_var_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prod_ia_diseno_promp_var_promp_fuente_key" ON "prod_ia_diseno_promp_var"("promp_id", "fuente");

CREATE UNIQUE INDEX "prod_ia_diseno_promp_var_promp_variable_key" ON "prod_ia_diseno_promp_var"("promp_id", "variable");

CREATE INDEX "prod_ia_diseno_promp_var_promp_id_idx" ON "prod_ia_diseno_promp_var"("promp_id");

ALTER TABLE "prod_ia_diseno_promp_var" ADD CONSTRAINT "prod_ia_diseno_promp_var_promp_id_fkey" FOREIGN KEY ("promp_id") REFERENCES "prod_ia_diseno_promp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
