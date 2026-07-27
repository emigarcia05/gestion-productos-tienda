/**
 * Scraper Alba Pinturas — carta completa de colores.
 *
 * Prioridad de datos:
 * 1) API interna POST /bin/api/colorPopUp
 * 2) JSON SSR embebido (script.js-carousel-data)
 * 3) Playwright Chromium solo con --verify-dom
 *
 * Salida (carpeta output/):
 * - colores_alba.csv
 * - colores_alba_tip_diseno.csv
 * - imagenes/CODIGO.jpg
 *
 * Flags:
 *   --out-dir <ruta>   Carpeta de salida (default: ../output)
 *   --verify-dom       Abre Chromium y valida el wall en DOM
 *
 * Uso:
 *   npm run scrape
 *   npx tsx src/index.ts --out-dir ./output
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  ALBA_COLORES_COLUMNS,
  ALBA_CONOCIMIENTO_COLUMNS,
  ALBA_CONFIG,
  OUTPUT_FILES,
  PALETTE_PAGE_URL,
} from "./config";
import {
  fetchColorPopupCatalog,
  fetchWallEnrichment,
  mergeCatalog,
} from "./catalog";
import { buildConocimientoRow } from "./colorScience";
import { writeCsv } from "./csv";
import { downloadAllSwatches } from "./images";
import type { AlbaColorCsvRow, CatalogColor, ScraperStats } from "./types";
import { hexToRgbString, imagenCsvPath, joinList } from "./utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Salida canónica: IA_COLORES/ (ADR-003). Override con --out-dir. */
const DEFAULT_OUT_DIR = path.resolve(__dirname, "..", "..", "..", "IA_COLORES");

function parseArgs(argv: string[]): { outDir: string; verifyDom: boolean } {
  let outDir = DEFAULT_OUT_DIR;
  let verifyDom = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out-dir" && argv[i + 1]) {
      outDir = path.resolve(argv[++i]);
    } else if (argv[i] === "--verify-dom") {
      verifyDom = true;
    }
  }
  return { outDir, verifyDom };
}

function toColoresRow(color: CatalogColor): AlbaColorCsvRow {
  return {
    codigo: color.codigo,
    nombre: color.nombre,
    url: color.url,
    imagen: color.codigo ? imagenCsvPath(color.codigo) : "",
    hex: color.hex,
    rgb: hexToRgbString(color.hex),
    familia: color.familia,
    subfamilia: color.subfamilia,
    ambientes: joinList(color.ambientes),
    superficies: joinList(color.superficies),
    descripcion_alba: color.descripcion_alba,
  };
}

function printReport(stats: ScraperStats): void {
  const secs = (stats.tiempoMs / 1000).toFixed(1);
  console.log("\n========== INFORME FINAL ==========");
  console.log(`Colores encontrados:     ${stats.coloresEncontrados}`);
  console.log(`Colores descargados:     ${stats.coloresDescargados}`);
  console.log(`Imagenes descargadas:    ${stats.imagenesDescargadas}`);
  console.log(`Errores:                 ${stats.errores}`);
  console.log(`Tiempo total:            ${secs} s`);
  if (stats.errorMessages.length > 0) {
    console.log("\nDetalle de errores (max. 20):");
    for (const msg of stats.errorMessages.slice(0, 20)) {
      console.log(`  - ${msg}`);
    }
    if (stats.errorMessages.length > 20) {
      console.log(`  ... y ${stats.errorMessages.length - 20} mas`);
    }
  }
  console.log("===================================\n");
}

async function verifyDomOptional(errorMessages: string[]): Promise<void> {
  console.log("3) Verificacion DOM con Chromium (--verify-dom)…");
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: ALBA_CONFIG.userAgent,
      locale: "es-AR",
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(ALBA_CONFIG.navigationTimeoutMs);
    await page.goto(PALETTE_PAGE_URL, { waitUntil: "domcontentloaded" });
    await page
      .waitForSelector(
        '[data-component="a20-color-box"], [data-component="m73-color-wall"]',
        { timeout: 30_000 },
      )
      .catch(() => {
        errorMessages.push(
          "Timeout esperando color wall en DOM (se continua con API/JSON).",
        );
      });
    const boxCount = await page
      .locator('button[data-component="a20-color-box"]')
      .count();
    console.log(`   DOM: ${boxCount} cajas a20-color-box visibles`);
    await context.close();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errorMessages.push(`Navegacion paletas: ${msg}`);
    console.warn(`   Aviso navegacion: ${msg}`);
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const started = Date.now();
  const { outDir, verifyDom } = parseArgs(process.argv.slice(2));
  const imagesDir = path.join(outDir, "imagenes");
  const errorMessages: string[] = [];

  console.log("Alba scraper — iniciando");
  console.log(`Salida: ${outDir}`);
  console.log(`Pagina: ${PALETTE_PAGE_URL}`);
  console.log(
    verifyDom
      ? "Modo: API + JSON + verify-dom (Chromium)"
      : "Modo rapido: API + JSON (sin Chromium)",
  );

  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(imagesDir, { recursive: true });

  console.log("1) API colorPopUp…");
  const apiRows = await fetchColorPopupCatalog();
  console.log(`   ${apiRows.length} filas desde API`);

  console.log("2) JSON SSR color wall…");
  const wall = await fetchWallEnrichment();
  console.log(`   ${wall.size} colores enriquecidos (href/id)`);

  if (verifyDom) {
    await verifyDomOptional(errorMessages);
  } else {
    console.log("3) Verificacion DOM omitida (usa --verify-dom si la queres)");
  }

  const catalog = mergeCatalog(apiRows, wall);
  console.log(`4) Catalogo unificado: ${catalog.length} colores unicos`);

  console.log(`5) Escribiendo ${OUTPUT_FILES.colores}…`);
  const colorRows = catalog.map(toColoresRow);
  await writeCsv(
    path.join(outDir, OUTPUT_FILES.colores),
    ALBA_COLORES_COLUMNS,
    colorRows,
  );

  console.log(`6) Escribiendo ${OUTPUT_FILES.tipDiseno}…`);
  const conocimientoRows = catalog.map((c) => buildConocimientoRow(c));
  await writeCsv(
    path.join(outDir, OUTPUT_FILES.tipDiseno),
    ALBA_CONOCIMIENTO_COLUMNS,
    conocimientoRows,
  );

  console.log("7) Generando muestras imagenes/CODIGO.jpg…");
  const imgResult = await downloadAllSwatches(catalog, imagesDir, (done, total) => {
    if (done === total || done % 250 === 0) {
      console.log(`   progreso imagenes: ${done}/${total}`);
    }
  });
  errorMessages.push(...imgResult.errors);
  console.log(
    `   JPG escritas: ${imgResult.written} | omitidas: ${imgResult.skipped}`,
  );

  const stats: ScraperStats = {
    coloresEncontrados: catalog.length,
    coloresDescargados: colorRows.length,
    imagenesDescargadas: imgResult.written,
    errores: errorMessages.length,
    tiempoMs: Date.now() - started,
    errorMessages,
  };

  await fs.writeFile(
    path.join(outDir, OUTPUT_FILES.report),
    JSON.stringify(stats, null, 2),
    "utf8",
  );

  printReport(stats);
}

main().catch((err) => {
  console.error("Scraper fallo:", err);
  process.exitCode = 1;
});
