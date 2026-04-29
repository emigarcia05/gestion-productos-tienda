/**
 * Exporta todas las tablas del esquema `public` a un archivo Excel (.xlsx).
 * Una hoja por tabla; nombres de hoja truncados al límite de Excel (31 caracteres).
 *
 * Requisitos: DATABASE_URL en .env (misma que usa la app).
 * Ejecutar: npm run db:export-excel
 * Opcional: npm run db:export-excel -- ./mi-export.xlsx
 *
 * Notas:
 * - Límite práctico por hoja: ~500k filas de datos (Excel admite ~1M filas totales).
 *   Si una tabla supera el tope, se trunca y se agrega una fila de aviso al inicio.
 * - Objetos JSON y fechas se serializan como texto/ISO para abrir bien en Excel.
 * - Para backup fiel de PostgreSQL sigue siendo preferible `pg_dump`; esto es para
 *   revisión / trabajo intermedio antes de rediseñar e importar con lógica nueva.
 */
import dotenv from "dotenv";
import { dirname, join, resolve } from "path";
import { mkdirSync } from "fs";
import * as XLSX from "xlsx";

dotenv.config({ path: join(__dirname, "..", ".env") });
dotenv.config({ path: join(process.cwd(), ".env") });

const MAX_ROWS_PER_SHEET = 500_000;
const EXCEL_SHEET_NAME_MAX = 31;

function safeSheetName(table: string): string {
  const cleaned = table.replace(/[:\\/?*[\]]/g, "_");
  return cleaned.length <= EXCEL_SHEET_NAME_MAX
    ? cleaned
    : cleaned.slice(0, EXCEL_SHEET_NAME_MAX);
}

function cellValue(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return "";
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return v as string | number | boolean;
}

function rowsToAoA(rows: Record<string, unknown>[]): (string | number | boolean)[][] {
  if (rows.length === 0) return [["(sin filas)"]];
  const keys = Object.keys(rows[0]!);
  const header = keys;
  const body = rows.map((r) => keys.map((k) => cellValue(r[k])));
  return [header, ...body];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL no está definida. Configurá .env en la raíz del proyecto.");
    process.exit(1);
  }

  const outArg = process.argv[2];
  const defaultName = `db-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`;
  const outPath = resolve(process.cwd(), outArg ?? join("exports", defaultName));

  const { query, pool } = await import("../src/lib/db");

  const { rows: tables } = await query<{ tablename: string }>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT LIKE 'pg_%'
       AND tablename <> '_prisma_migrations'
     ORDER BY tablename`
  );

  if (tables.length === 0) {
    console.error("No se encontraron tablas en public.");
    await pool.end();
    process.exit(1);
  }

  mkdirSync(dirname(outPath), { recursive: true });

  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const { tablename } of tables) {
    const quoted = `"${tablename.replace(/"/g, '""')}"`;
    const { rows, rowCount } = await query<Record<string, unknown>>(
      `SELECT * FROM ${quoted}`
    );

    let slice = rows;
    let truncated = false;
    if (slice.length > MAX_ROWS_PER_SHEET) {
      slice = rows.slice(0, MAX_ROWS_PER_SHEET);
      truncated = true;
    }

    let baseName = safeSheetName(tablename);
    let sheetName = baseName;
    let n = 1;
    while (usedNames.has(sheetName)) {
      const suffix = `_${n++}`;
      sheetName = safeSheetName(baseName.slice(0, EXCEL_SHEET_NAME_MAX - suffix.length) + suffix);
    }
    usedNames.add(sheetName);

    let aoa = rowsToAoA(slice as Record<string, unknown>[]);
    if (truncated) {
      aoa = [
        [
          `AVISO: tabla ${tablename} truncada a ${MAX_ROWS_PER_SHEET} filas (total aprox. ${rowCount}). Usá pg_dump o COPY para el resto.`,
        ],
        [],
        ...aoa,
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    console.log(`  + ${tablename} → hoja "${sheetName}" (${slice.length} filas exportadas)`);
  }

  XLSX.writeFile(wb, outPath);
  console.log(`\n✓ Archivo generado: ${outPath}`);
  console.log("  Tablas:", tables.length);

  await pool.end();
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  try {
    const { pool } = await import("../src/lib/db");
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
