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
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pedidos_mercaderia'
    ORDER BY ordinal_position;
  `;

  const res = await client.query(sql);
  // eslint-disable-next-line no-console
  console.log(res.rows.map((r) => r.column_name).join(", "));

  await client.end();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});

