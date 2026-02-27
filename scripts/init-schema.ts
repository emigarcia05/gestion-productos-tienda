/**
 * Inicializa/alinea la tabla proveedores en Neon con el schema de Prisma.
 * Crea la tabla si no existe o aplica la migración (sufijo, codigo_unico, updated_at, id TEXT).
 * Ejecutar: npm run db:init-schema
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getClient } from "../src/lib/db";

const envPath = join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf-8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const sqlPath = join(__dirname, "migrate-proveedores-to-prisma.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  const client = await getClient();
  try {
    await client.query(sql);
    console.log("✓ Tabla proveedores inicializada/actualizada correctamente (schema Prisma).");
  } finally {
    client.release();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});
