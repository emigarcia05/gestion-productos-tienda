export interface EstPorProdLineaParseada {
  codTienda: string;
  vtasEnUn: number;
}

export type CampoDestinoEstPorProd = "codTienda" | "vtasEnUn" | "ignorar";

export type MapeoColumnasEstPorProd = Record<number, CampoDestinoEstPorProd>;

/**
 * Fila 1-based de la planilla donde están los nombres de columna.
 * Default **3** (típico export DUX con títulos previos).
 */
export const FILA_ENCABEZADO_DEFAULT_EST_POR_PROD = 3;

/** Máximo de filas ofrecidas en el selector de encabezado del modal. */
export const FILA_ENCABEZADO_MAX_EST_POR_PROD = 20;

const MAX_SAFE_COD_TIENDA_INT = Number.MAX_SAFE_INTEGER;

function cellDisplayValue(cell: { w?: string; v?: unknown } | undefined): unknown {
  if (!cell) return "";
  const formatted = cell.w?.trim();
  if (formatted) return formatted;
  return cell.v ?? "";
}

/** Lee la hoja usando texto formateado de Excel (evita perder dígitos en códigos largos). */
export function filasDesdeHojaEstPorProd(
  hoja: Record<string, unknown>,
  utils: { decode_range: (ref: string) => { s: { r: number; c: number }; e: { r: number; c: number } }; encode_cell: (cell: { r: number; c: number }) => string }
): unknown[][] {
  const ref = hoja["!ref"];
  if (typeof ref !== "string" || !ref) return [];

  const range = utils.decode_range(ref);
  const rows: unknown[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: unknown[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = utils.encode_cell({ r, c });
      const cell = hoja[addr] as { w?: string; v?: unknown } | undefined;
      row.push(cellDisplayValue(cell));
    }
    rows.push(row);
  }

  return rows;
}

function normalizarCodTienda(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (typeof value === "string") {
    const s = value.trim().replace(/\s/g, "");
    if (!s) return null;
    if (/^\d+$/.test(s)) return s;
    const n = Number(s.replace(",", "."));
    if (Number.isFinite(n) && /^\d+([.,]\d+)?$/.test(s)) {
      if (Math.abs(n) <= MAX_SAFE_COD_TIENDA_INT && Number.isInteger(n)) {
        return String(Math.trunc(n));
      }
    }
    return s;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value) && Math.abs(value) <= MAX_SAFE_COD_TIENDA_INT) {
      return String(value);
    }
    const asString = String(value);
    if (/^\d+$/.test(asString.replace(/\.\d+$/, ""))) {
      return asString.split(".")[0] ?? asString;
    }
    return asString;
  }

  const s = String(value).trim();
  return s || null;
}

function parseVtasEnUn(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value).trim();
  if (!raw) return null;
  const sinEspacios = raw.replace(/\s/g, "");
  const conDecimal =
    sinEspacios.includes(",") && sinEspacios.includes(".")
      ? sinEspacios.replace(/\./g, "").replace(",", ".")
      : sinEspacios.replace(",", ".");
  const n = Number(conDecimal);
  return Number.isFinite(n) ? n : null;
}

/**
 * Siempre hay encabezados. `filaEncabezado` es 1-based (fila 1 = primera del archivo).
 * Las filas posteriores a esa se toman como datos.
 */
export function separarEncabezadosYFilasEstPorProd(
  todasLasFilas: unknown[][],
  filaEncabezado: number = FILA_ENCABEZADO_DEFAULT_EST_POR_PROD
): { encabezados: string[]; filasCrudas: unknown[][] } {
  if (todasLasFilas.length === 0) {
    return { encabezados: [], filasCrudas: [] };
  }

  const filaIdx = Math.max(1, Math.floor(filaEncabezado)) - 1;
  if (filaIdx >= todasLasFilas.length) {
    return { encabezados: [], filasCrudas: [] };
  }

  const primera = todasLasFilas[filaIdx] ?? [];
  const encabezados = primera.map((c, i) => {
    const s = String(c ?? "").trim();
    return s || `Columna ${i + 1}`;
  });
  return { encabezados, filasCrudas: todasLasFilas.slice(filaIdx + 1) };
}

/** Mapeo por defecto del export Excel: col. 1 → COD. TIENDA, col. 2 → VTAS. EN UN. (editable en UI). */
export function mapeoPorDefectoEstPorProd(encabezados: string[]): MapeoColumnasEstPorProd {
  const mapeo: MapeoColumnasEstPorProd = {};
  encabezados.forEach((_, i) => {
    if (i === 0) mapeo[i] = "codTienda";
    else if (i === 1) mapeo[i] = "vtasEnUn";
    else mapeo[i] = "ignorar";
  });
  return mapeo;
}

function indiceMapeado(mapeo: MapeoColumnasEstPorProd, campo: CampoDestinoEstPorProd): number {
  for (const [idx, dest] of Object.entries(mapeo)) {
    if (dest === campo) return Number(idx);
  }
  return -1;
}

export function lineasDesdeMapeoEstPorProd(
  filasCrudas: unknown[][],
  mapeo: MapeoColumnasEstPorProd
): { lineas: EstPorProdLineaParseada[]; filasOmitidas: number } {
  const idxCod = indiceMapeado(mapeo, "codTienda");
  const idxVtas = indiceMapeado(mapeo, "vtasEnUn");
  if (idxCod < 0 || idxVtas < 0) {
    return { lineas: [], filasOmitidas: 0 };
  }

  const lineas: EstPorProdLineaParseada[] = [];
  let filasOmitidas = 0;

  for (const row of filasCrudas) {
    if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;

    const codTienda = normalizarCodTienda(row[idxCod]);
    const vtasEnUn = parseVtasEnUn(row[idxVtas]);

    if (!codTienda || vtasEnUn == null || vtasEnUn < 0) {
      filasOmitidas += 1;
      continue;
    }

    lineas.push({ codTienda, vtasEnUn });
  }

  return { lineas, filasOmitidas };
}

export async function leerFilasCrudasEstPorProdArchivo(file: File): Promise<unknown[][]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array", cellText: true, cellDates: false });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) {
    throw new Error("El archivo no contiene hojas.");
  }
  return filasDesdeHojaEstPorProd(hoja as Record<string, unknown>, XLSX.utils);
}
