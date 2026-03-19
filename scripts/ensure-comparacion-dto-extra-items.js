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

  const sql = `
CREATE TABLE IF NOT EXISTS "comparacion_dto_extra_items" (
  "id" TEXT NOT NULL,
  "id_lista_precios_proveedores" UUID NOT NULL,
  "dto_extra" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "comparacion_dto_extra_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comparacion_dto_extra_items_id_lista_precios_proveedores_key" UNIQUE ("id_lista_precios_proveedores"),
  CONSTRAINT "comparacion_dto_extra_items_id_lista_precios_proveedores_fkey"
    FOREIGN KEY ("id_lista_precios_proveedores") REFERENCES "precios_proveedores"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
`.trim();

  try {
    await client.query(sql);
    // eslint-disable-next-line no-console
    console.log("OK: tabla comparacion_dto_extra_items asegurada");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});

