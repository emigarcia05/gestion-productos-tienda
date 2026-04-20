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

  // Nombre post-rename: prod_comp_dto_extra (ver migración
  // `20260418260000_rename_prod_comp_y_comprobantes`). El script sigue siendo
  // idempotente: en una DB ya migrada via `prisma migrate deploy` no hace nada.
  const sql = `
CREATE TABLE IF NOT EXISTS "prod_comp_dto_extra" (
  "id" TEXT NOT NULL,
  "id_lista_precios_proveedores" UUID NOT NULL,
  "dto_extra" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prod_comp_dto_extra_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prod_comp_dto_extra_id_lista_precios_proveedores_key" UNIQUE ("id_lista_precios_proveedores"),
  CONSTRAINT "prod_comp_dto_extra_id_lista_precios_proveedores_fkey"
    FOREIGN KEY ("id_lista_precios_proveedores") REFERENCES "precios_proveedores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
`.trim();

  try {
    await client.query(sql);
    // eslint-disable-next-line no-console
    console.log("OK: tabla prod_comp_dto_extra asegurada");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});

