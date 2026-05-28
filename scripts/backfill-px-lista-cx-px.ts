/**
 * Backfill PX LISTA Cx & Px: persiste en prod_precios_tienda lo que muestra la grilla.
 *
 * Uso:
 *   npx tsx scripts/backfill-px-lista-cx-px.ts           # solo filas sin guardar
 *   npx tsx scripts/backfill-px-lista-cx-px.ts --dry-run # simular
 *   npx tsx scripts/backfill-px-lista-cx-px.ts --todos   # reescribir según grilla
 */
import "dotenv/config";
import { backfillPxListaCxPxDesdeGrilla } from "../src/services/backfillPxListaCxPx.service";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const todos = args.includes("--todos");

  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL no definida en .env");
    process.exit(1);
  }

  console.log(
    dryRun
      ? "Modo dry-run (sin escribir en BD)…"
      : todos
        ? "Backfill PX LISTA (todos los ítems según grilla)…"
        : "Backfill PX LISTA (solo competencia_id_px_lista y px_lista_cx_px vacíos)…"
  );

  const res = await backfillPxListaCxPxDesdeGrilla({
    soloVacios: !todos,
    dryRun,
  });

  console.log(`Candidatos: ${res.totalCandidatos}`);
  console.log(`${dryRun ? "Simulados" : "Guardados"}: ${res.guardados}`);
  console.log(`Omitidos (sin precio válido): ${res.omitidos}`);
  if (res.errores.length > 0) {
    console.log(`Errores: ${res.errores.length}`);
    for (const e of res.errores.slice(0, 20)) {
      console.log(`  - ${e.codTienda}: ${e.error}`);
    }
    if (res.errores.length > 20) {
      console.log(`  … y ${res.errores.length - 20} más`);
    }
    process.exit(1);
  }

  console.log("✓ Listo.");
}

main().catch((err) => {
  console.error("✗ Error:", err);
  process.exit(1);
});
