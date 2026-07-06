const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // eslint-disable-next-line no-console
    console.error("Missing DATABASE_URL in .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const sql = `
CREATE TABLE IF NOT EXISTS "prod_comp_item_comparados" (
  "id" TEXT NOT NULL,
  "presentacion_id" TEXT NOT NULL,
  "cod_ext_prod_precios_provee" TEXT NOT NULL,
  "dto_extra" INTEGER,
  "dif_px_ref_manual" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prod_comp_item_comparados_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prod_comp_item_comparados_present_cod_ext_ux"
    UNIQUE ("presentacion_id", "cod_ext_prod_precios_provee"),
  CONSTRAINT "prod_comp_item_comparados_presentacion_id_fkey"
    FOREIGN KEY ("presentacion_id") REFERENCES "prod_comp_presentaciones"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "prod_comp_item_comparados_cod_ext_prod_precios_provee_fkey"
    FOREIGN KEY ("cod_ext_prod_precios_provee") REFERENCES "prod_precios_provee"("cod_ext")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "prod_comp_item_comparados_presentacion_id_idx"
  ON "prod_comp_item_comparados" ("presentacion_id");
`.trim();

  try {
    await client.query(sql);
    // eslint-disable-next-line no-console
    console.log("OK: tabla prod_comp_item_comparados (membresía) asegurada");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});
