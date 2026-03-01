/**
 * Corrige columnas de lista_precios_proveedores si tienen nombres que Prisma no espera.
 * Prisma espera: dto_producto, dto_cantidad, cx_aprox_transporte.
 *
 * Si ves "The column (not available) does not exist" en listaPrecioProveedor.updateMany(),
 * ejecutá: npm run db:fix-lista-precios-proveedores-columnas
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

// Mapeo: DESC. PROD. -> dto_producto, DESC. CANT. -> dto_cantidad, CX. APROX TRANSPORTE -> cx_aprox_transporte
const ESPERADAS = ["dto_producto", "dto_cantidad", "cx_aprox_transporte"] as const;
const RENOMBRES: { desde: string; hacia: (typeof ESPERADAS)[number] }[] = [
  { desde: "descuento_producto", hacia: "dto_producto" },
  { desde: "desc_prod", hacia: "dto_producto" },
  { desde: "descuento_cantidad", hacia: "dto_cantidad" },
  { desde: "desc_cant", hacia: "dto_cantidad" },
  { desde: "cx_transporte", hacia: "cx_aprox_transporte" },
  { desde: "costo_aprox_transporte", hacia: "cx_aprox_transporte" },
];

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
       WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores'
       ORDER BY ordinal_position`
    );
    const columnas = rows.map((r) => r.column_name);

    if (columnas.length === 0) {
      console.log("✗ La tabla lista_precios_proveedores no existe o no tiene columnas. Creala con el script SQL o migraciones.");
      process.exit(1);
    }

    console.log("Columnas actuales en lista_precios_proveedores:", columnas.join(", "));

    const faltantes = ESPERADAS.filter((e) => !columnas.includes(e));
    if (faltantes.length === 0) {
      console.log("✓ Las columnas dto_producto, dto_cantidad y cx_aprox_transporte ya existen. Nada que hacer.");
      return;
    }

    let actuales = [...columnas];
    for (const { desde, hacia } of RENOMBRES) {
      if (!actuales.includes(desde) || actuales.includes(hacia)) continue;
      await client.query(
        `ALTER TABLE lista_precios_proveedores RENAME COLUMN "${desde}" TO "${hacia}"`
      );
      console.log(`✓ Columna "${desde}" renombrada a "${hacia}".`);
      const { rows: next } = await client.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores'
         ORDER BY ordinal_position`
      );
      actuales = next.map((r) => r.column_name);
    }

    const { rows: after } = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'lista_precios_proveedores'
       AND column_name = ANY($1)`,
      [ESPERADAS]
    );
    const encontradas = after.map((r) => r.column_name);
    if (ESPERADAS.every((e) => encontradas.includes(e))) {
      console.log("✓ Listo. Columnas esperadas por Prisma presentes.");
    } else {
      console.warn("⚠ Faltan columnas esperadas por Prisma:", ESPERADAS.filter((e) => !encontradas.includes(e)).join(", "));
      console.warn("  Si la tabla la creaste a mano, agregá esas columnas o ejecutá la migración:");
      console.warn("  npx prisma migrate deploy");
    }
  } finally {
    client.release();
  }
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});
