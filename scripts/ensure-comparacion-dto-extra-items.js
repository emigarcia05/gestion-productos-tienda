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
    // Neon puede requerir SSL. Para evitar fallos por certificados en entorno dev, usamos rejectUnauthorized=false.
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  // Idempotente: en una DB ya migrada via `prisma migrate deploy` no hace nada útil.
  const sql = `
CREATE TABLE IF NOT EXISTS "prod_comp_item_comparados" (
  "id" TEXT NOT NULL,
  "cod_ext_prod_precios_provee" TEXT NOT NULL,
  "dto_extra" INTEGER,
  "dif_px_ref_manual" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prod_comp_item_comparados_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prod_comp_item_comparados_cod_ext_prod_precios_provee_key" UNIQUE ("cod_ext_prod_precios_provee"),
  CONSTRAINT "prod_comp_item_comparados_cod_ext_prod_precios_provee_fkey"
    FOREIGN KEY ("cod_ext_prod_precios_provee") REFERENCES "prod_precios_provee"("cod_ext")
    ON DELETE CASCADE ON UPDATE CASCADE
);
`.trim();

  try {
    await client.query(sql);
    // eslint-disable-next-line no-console
    console.log("OK: tabla prod_comp_item_comparados asegurada");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});
