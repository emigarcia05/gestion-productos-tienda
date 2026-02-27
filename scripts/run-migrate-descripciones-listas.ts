/**
 * Migra cambios de estructura:
 * - lista_precios_proveedores: ADD descripcion_proveedor
 * - lista_precios_tienda: RENAME descripcion -> descripcion_tienda
 *
 * Ejecutar desde la raíz: npm run db:migrate-descripciones
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

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
  console.error("✗ DATABASE_URL no está definida. Configurá .env con tu connection string de Neon.");
  process.exit(1);
}
if (dbUrl.includes("tu-endpoint") || dbUrl.includes("usuario:password")) {
  console.error("✗ Reemplazá DATABASE_URL en .env por la connection string real de Neon.");
  process.exit(1);
}

async function main() {
  const { getClient } = await import("../src/lib/db");
  const sqlPath = join(__dirname, "migrate-descripciones-listas.sql");
  const sql = readFileSync(sqlPath, "utf-8");
  const client = await getClient();
  try {
    await client.query(sql);
    console.log("✓ Migración aplicada: descripcion_proveedor + descripcion_tienda.");
  } finally {
    client.release();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});

