/**
 * Diagnóstico estado parcial migración desc_especial.
 * Uso: npx tsx scripts/diagnose-desc-especial-migration.ts
 */
import "dotenv/config";
import { query } from "../src/lib/db";

async function main() {
  const checks = await query<{
    desc_especial_col: string | null;
    regla_table: string | null;
    producto_table: string | null;
    migration_status: string | null;
  }>(`
    SELECT
      (SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'prod_precios_provee' AND column_name = 'desc_especial') AS desc_especial_col,
      (SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'prod_precios_desc_especial_regla') AS regla_table,
      (SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'prod_precios_desc_especial_regla_producto') AS producto_table,
      (SELECT migration_name || ' → ' || finished_at::text || ' / ' || rolled_back_at::text
       FROM _prisma_migrations
       WHERE migration_name = '20260703100000_prod_precios_desc_especial'
       ORDER BY started_at DESC LIMIT 1) AS migration_status
  `);

  const row = checks.rows[0];
  console.log("Estado BD desc_especial:");
  console.log("  columna desc_especial:", row?.desc_especial_col ?? "(no existe)");
  console.log("  tabla regla:", row?.regla_table ?? "(no existe)");
  console.log("  tabla producto:", row?.producto_table ?? "(no existe)");
  console.log("  _prisma_migrations:", row?.migration_status ?? "(sin registro)");

  const constraints = await query<{ conname: string; contype: string }>(`
    SELECT conname, contype::text
    FROM pg_constraint
    WHERE conname LIKE 'prod_precios_desc_especial%'
    ORDER BY conname
  `);
  console.log("\nConstraints relacionados:", constraints.rows.length);
  for (const c of constraints.rows) {
    console.log(`  ${c.conname} (${c.contype})`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
