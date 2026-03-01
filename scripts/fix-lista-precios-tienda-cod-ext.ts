/**
 * Corrige la tabla lista_precios_tienda si fue creada con el script SQL (columna cod_externo)
 * y Prisma espera cod_ext. Ejecuta RENAME COLUMN cod_externo → cod_ext.
 *
 * Si ves el error P2022 "The column (not available) does not exist" en listaPrecioTienda,
 * ejecutá: npm run db:fix-lista-precios-tienda-cod-ext
 *
 * Requiere DATABASE_URL en .env.
 */
import { existsSync, readFileSync } from "fs";
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

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("✗ DATABASE_URL no está definida en .env");
    process.exit(1);
  }

  const { getClient } = await import("../src/lib/db");
  const client = await getClient();

  try {
    const { rows } = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'lista_precios_tienda'
       AND column_name IN ('cod_externo', 'cod_ext')`
    );
    const hasCodExterno = rows.some((r) => r.column_name === "cod_externo");
    const hasCodExt = rows.some((r) => r.column_name === "cod_ext");

    if (hasCodExt && !hasCodExterno) {
      console.log("✓ La tabla lista_precios_tienda ya tiene la columna cod_ext. Nada que hacer.");
      return;
    }
    if (!hasCodExterno) {
      console.log("✓ No se encontró la columna cod_externo. ¿La tabla existe? Revisá con Prisma Studio.");
      return;
    }

    await client.query(`ALTER TABLE "lista_precios_tienda" RENAME COLUMN "cod_externo" TO "cod_ext"`);
    console.log("✓ Columna cod_externo renombrada a cod_ext en lista_precios_tienda.");
  } finally {
    client.release();
  }
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});
