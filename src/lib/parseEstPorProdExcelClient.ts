export interface EstPorProdLineaParseada {
  codTienda: string;
  vtasEnUn: number;
}

export interface ParseEstPorProdExcelResult {
  lineas: EstPorProdLineaParseada[];
  errores: string[];
}

function normalizarEncabezado(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[.\s_-]+/g, "");
}

function normalizarCodTienda(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  const s = String(value).trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n) && /^\d+([.,]\d+)?$/.test(s.replace(/\s/g, ""))) {
    return String(Math.trunc(n));
  }
  return s;
}

function parseVtasEnUn(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const ALIAS_COD_TIENDA = new Set([
  "codtienda",
  "codigotienda",
  "codigo",
  "cod",
  "coditem",
  "item",
]);

const ALIAS_VTAS = new Set([
  "vtasenun",
  "ventasenunidades",
  "ventasunidades",
  "unidades",
  "cantidad",
  "vtas",
  "ventas",
]);

function indiceColumna(encabezados: string[], aliases: Set<string>): number {
  return encabezados.findIndex((h) => aliases.has(h));
}

/**
 * Parsea la primera hoja de un libro Excel/CSV ya leído con `xlsx`.
 * Espera columnas de código tienda y ventas en unidades (cabecera flexible).
 */
export function parseEstPorProdSheetRows(rows: unknown[][]): ParseEstPorProdExcelResult {
  const errores: string[] = [];
  if (rows.length < 2) {
    return { lineas: [], errores: ["La planilla está vacía o no tiene filas de datos."] };
  }

  const encabezados = (rows[0] ?? []).map(normalizarEncabezado);
  let idxCod = indiceColumna(encabezados, ALIAS_COD_TIENDA);
  let idxVtas = indiceColumna(encabezados, ALIAS_VTAS);

  if (idxCod < 0 && encabezados.length >= 1) idxCod = 0;
  if (idxVtas < 0 && encabezados.length >= 2) idxVtas = 1;

  if (idxCod < 0 || idxVtas < 0) {
    return {
      lineas: [],
      errores: [
        "No se encontraron columnas de código tienda y ventas en unidades. Usá cabeceras como COD_TIENDA y VTAS_EN_UN.",
      ],
    };
  }

  const lineas: EstPorProdLineaParseada[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;

    const codTienda = normalizarCodTienda(row[idxCod]);
    const vtasEnUn = parseVtasEnUn(row[idxVtas]);

    if (!codTienda) {
      errores.push(`Fila ${i + 1}: código tienda vacío o inválido.`);
      continue;
    }
    if (vtasEnUn == null) {
      errores.push(`Fila ${i + 1}: ventas en unidades inválidas.`);
      continue;
    }
    if (vtasEnUn < 0) {
      errores.push(`Fila ${i + 1}: ventas en unidades no pueden ser negativas.`);
      continue;
    }

    lineas.push({ codTienda, vtasEnUn });
  }

  if (lineas.length === 0 && errores.length === 0) {
    errores.push("No se encontraron filas válidas en la planilla.");
  }

  return { lineas, errores };
}

export async function leerEstPorProdDesdeArchivo(file: File): Promise<ParseEstPorProdExcelResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) {
    return { lineas: [], errores: ["El archivo no contiene hojas."] };
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: "" });
  return parseEstPorProdSheetRows(rows);
}
