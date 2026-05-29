/**
 * Backfill único: persiste `prod_precios_tienda_marcacion` para todos los ítems
 * de `prod_precios_tienda`, con la misma lógica que el módulo Px Listas.
 *
 * Uso:
 *   npx tsx scripts/backfill-marcacion-px-listas.ts
 *   npx tsx scripts/backfill-marcacion-px-listas.ts --dry-run
 *
 * Requiere DATABASE_URL en .env (misma BD que producción/Neon).
 */
import "dotenv/config";
import { backfillMarcacionPxListasTodos } from "../src/services/backfillMarcacionPxListas.service";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(
    dryRun
      ? "Modo dry-run: no se escribe en la base de datos."
      : "Ejecutando backfill de marcación Px Listas..."
  );

  const res = await backfillMarcacionPxListasTodos({ dryRun });

  console.log("Resultado:");
  console.log(`  Ítems procesados: ${res.totalProcesados}`);
  if (!dryRun) {
    console.log(`  Filas creadas:     ${res.creados}`);
    console.log(`  Filas actualizadas: ${res.actualizados}`);
  }
  console.log(`  Sin marcación (px/costo inválidos): ${res.sinMarcacion}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
