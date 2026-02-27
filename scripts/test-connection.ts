/**
 * Prueba de conexión a Neon/PostgreSQL.
 * Ejecutar: npx tsx scripts/test-connection.ts
 * (o: npm run db:test)
 */
import "dotenv/config";
import { query } from "../src/lib/db";

async function main() {
  console.log("Probando conexión a la base de datos...");
  try {
    const { rows } = await query<{ now: string }>("SELECT NOW() AS now");
    const now = rows[0]?.now ?? "—";
    console.log("✓ Conexión exitosa.");
    console.log("  Servidor (NOW):", now);
    process.exit(0);
  } catch (err) {
    console.error("✗ Error de conexión:", err);
    process.exit(1);
  }
}

main();
