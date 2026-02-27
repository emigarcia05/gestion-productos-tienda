/**
 * Prueba de conexión a Neon/PostgreSQL.
 * Ejecutar: npm run db:test
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { query } from "../src/lib/db";

const envPath = join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

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
