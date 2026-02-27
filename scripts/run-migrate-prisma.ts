/**
 * Ejecuta la migración para alinear la tabla proveedores con el schema de Prisma.
 * Ejecutar desde la raíz: npm run db:migrate-neon
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Cargar .env desde la raíz del proyecto (cwd = raíz cuando se usa npm run)
function loadEnv() {
  const root = process.cwd();
  for (const name of [".env", ".env.local"]) {
    const envPath = join(root, name);
    if (existsSync(envPath)) {
      const env = readFileSync(envPath, "utf-8");
      for (const line of env.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const m = trimmed.match(/^([^=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
      return;
    }
  }
}
loadEnv();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("✗ DATABASE_URL no está definida.");
  console.error("  Creá un archivo .env en la raíz del proyecto con tu connection string de Neon.");
  process.exit(1);
}
if (dbUrl.includes("tu-endpoint") || dbUrl.includes("usuario:password")) {
  console.error("✗ DATABASE_URL en .env sigue con el valor de ejemplo.");
  console.error("  Abrí .env y reemplazá la URL por la connection string real de tu proyecto en Neon:");
  console.error("  Dashboard Neon → tu proyecto → Connection string (copiá la pooled).");
  process.exit(1);
}

async function main() {
  const { getClient } = await import("../src/lib/db");
  const sqlPath = join(__dirname, "migrate-proveedores-to-prisma.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  const client = await getClient();
  try {
    await client.query(sql);
    console.log("✓ Migración proveedores → Prisma ejecutada correctamente.");
  } finally {
    client.release();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});
