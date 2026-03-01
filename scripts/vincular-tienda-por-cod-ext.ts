/**
 * Acción única: vincula lista_precios_proveedores con lista_precios_tienda por cod_ext.
 * Para cada ítem de tienda, actualiza todos los ítems de proveedores con el mismo cod_ext
 * asignando id_lista_precios_tienda = id del ítem de tienda.
 *
 * Ejecutar una sola vez: npm run db:vincular-tienda-por-cod-ext
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

  const { prisma } = await import("../src/lib/prisma");

  const tiendaRows = await prisma.listaPrecioTienda.findMany({
    select: { id: true, codExt: true },
  });

  console.log(`→ ${tiendaRows.length} ítem(s) en lista_precios_tienda. Vinculando por cod_ext...`);

  let totalUpdated = 0;
  for (const t of tiendaRows) {
    const result = await prisma.listaPrecioProveedor.updateMany({
      where: { codExt: t.codExt },
      data: { idListaPrecioTienda: t.id },
    });
    totalUpdated += result.count;
    if (result.count > 0) {
      console.log(`  ${t.codExt}: ${result.count} proveedor(es) vinculado(s)`);
    }
  }

  console.log(`✓ Listo. Total de filas en lista_precios_proveedores actualizadas: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
