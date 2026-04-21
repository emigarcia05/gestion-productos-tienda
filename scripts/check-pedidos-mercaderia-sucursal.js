const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL in .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const colSql = `
    SELECT
      column_name,
      is_nullable,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prod_ped_merc'
      AND column_name IN ('sucursal_id','sucursal')
    ORDER BY column_name;
  `;

  const fkSql = `
    SELECT
      conname,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'prod_ped_merc'
      AND c.contype = 'f';
  `;

  const idxSql = `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'prod_ped_merc'
    ORDER BY indexname;
  `;

  const cols = await client.query(colSql);
  console.log("COLUMNAS:", cols.rows);

  const fks = await client.query(fkSql);
  console.log("FKs:", fks.rows);

  const idxs = await client.query(idxSql);
  console.log("ÍNDICES (parciales):", idxs.rows.slice(0, 30));

  await client.end();
}

main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});

