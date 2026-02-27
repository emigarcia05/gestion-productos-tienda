/**
 * Crea la tabla proveedores en Neon/PostgreSQL.
 * Ejecutar: npx tsx scripts/init-schema.ts
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { getClient } from "../src/lib/db";

async function main() {
  const sqlPath = join(__dirname, "schema-proveedores.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  const client = await getClient();
  try {
    await client.query(sql);
    console.log("✓ Tabla proveedores creada correctamente.");
  } finally {
    client.release();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});
