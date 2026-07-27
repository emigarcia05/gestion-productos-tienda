/**
 * Capa 3: une colores_alba.csv + colores_alba_tip_diseno.csv → colores_alba_ia.csv
 *
 * Uso:
 *   npx tsx docs/IA_DISEÑO/scripts/build-colores-ia.ts
 *   npm run build:colores-ia
 */
import path from "node:path";
import { readCsvFile, writeCsvFile } from "../../../scripts/alba-scraper/src/csvIo.js";
import { FILES, IA_DISENO_COLS, IA_DISENO_ROOT } from "./config.js";
import { buildTextoConocimiento } from "./textoConocimiento.js";

function emptyRow(): Record<string, string> {
  return Object.fromEntries(IA_DISENO_COLS.map((c) => [c, ""]));
}

async function main(): Promise<void> {
  const coloresPath = path.join(IA_DISENO_ROOT, FILES.colores);
  const tipPath = path.join(IA_DISENO_ROOT, FILES.tipDiseno);
  const outPath = path.join(IA_DISENO_ROOT, FILES.ia);

  console.log("build-colores-ia — capa 3");
  console.log(`  Origen 1: ${coloresPath}`);
  console.log(`  Origen 2: ${tipPath}`);
  console.log(`  Salida:   ${outPath}`);

  const { rows: coloresRows } = await readCsvFile(coloresPath);
  const { rows: tipRows } = await readCsvFile(tipPath);

  const tipByCodigo = new Map(tipRows.map((r) => [r.codigo, r]));

  const outRows: Record<string, string>[] = [];
  let sinTip = 0;

  for (const c of coloresRows) {
    const codigo = c.codigo ?? "";
    const t = tipByCodigo.get(codigo);
    if (!t) sinTip++;

    const row = emptyRow();
    row.codigo = codigo;
    row.nombre = c.nombre ?? "";
    row.hex = c.hex ?? "";
    row.rgb = c.rgb ?? "";
    row.familia = c.familia ?? "";
    row.subfamilia = c.subfamilia ?? "";
    row.url = c.url ?? "";
    row.imagen = c.imagen ?? "";
    row.superficies = c.superficies ?? "";
    row.descripcion_alba = c.descripcion_alba ?? "";
    row.ambientes_oficiales = c.ambientes ?? "";

    if (t) {
      row.temperatura = t.temperatura ?? "";
      row.luminosidad = t.luminosidad ?? "";
      row.saturacion = t.saturacion ?? "";
      row.nivel_luminosidad = t.nivel_luminosidad ?? "";
      row.nivel_saturacion = t.nivel_saturacion ?? "";
      row.familia_visual = t.familia_visual ?? "";
      row.estilos_recomendados = t.estilos_recomendados ?? "";
      row.ambientes_recomendados = t.ambientes_recomendados ?? "";
      row.combina_con = t.combina_con ?? "";
      row.contrasta_con = t.contrasta_con ?? "";
      row.sensacion_visual = t.sensacion_visual ?? "";
      row.descripcion_tecnica = t.descripcion_tecnica ?? "";
    }

    row.texto_conocimiento = buildTextoConocimiento({
      codigo: row.codigo,
      nombre: row.nombre,
      hex: row.hex,
      rgb: row.rgb,
      familia: row.familia,
      temperatura: row.temperatura,
      luminosidad: row.luminosidad,
      saturacion: row.saturacion,
      nivel_luminosidad: row.nivel_luminosidad,
      nivel_saturacion: row.nivel_saturacion,
      familia_visual: row.familia_visual,
      estilos_recomendados: row.estilos_recomendados,
      ambientes_oficiales: row.ambientes_oficiales,
      ambientes_recomendados: row.ambientes_recomendados,
      combina_con: row.combina_con,
      contrasta_con: row.contrasta_con,
      sensacion_visual: row.sensacion_visual,
      descripcion_tecnica: row.descripcion_tecnica,
      descripcion_alba: row.descripcion_alba,
    });

    outRows.push(row);
  }

  await writeCsvFile(outPath, IA_DISENO_COLS, outRows);

  console.log(`  Filas escritas: ${outRows.length}`);
  if (sinTip > 0) {
    console.warn(`  Aviso: ${sinTip} colores sin fila en tip_diseno`);
  }
  console.log("Listo.");
}

main().catch((err) => {
  console.error("build-colores-ia falló:", err);
  process.exitCode = 1;
});
