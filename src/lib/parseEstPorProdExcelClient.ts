export interface EstPorProdLineaParseada {
  codTienda: string;
  vtasEnUn: number;
}

export type CampoDestinoEstPorProd = "codTienda" | "vtasEnUn" | "ignorar";

export type MapeoColumnasEstPorProd = Record<number, CampoDestinoEstPorProd>;

/** Filas iniciales del export DUX que no se importan (metadatos). La 3.ª fila es el encabezado. */
export const FILAS_OMITIR_INICIO_EST_POR_PROD = 2;

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

export function separarEncabezadosYFilasEstPorProd(
  todasLasFilas: unknown[][],
  tieneEncabezados: boolean,
  filasOmitirInicio: number = FILAS_OMITIR_INICIO_EST_POR_PROD
): { encabezados: string[]; filasCrudas: unknown[][] } {
  const omitir = Math.max(0, Math.min(filasOmitirInicio, todasLasFilas.length));
  const desde = todasLasFilas.slice(omitir);

  if (desde.length === 0) {
    return { encabezados: [], filasCrudas: [] };
  }
  if (tieneEncabezados) {
    const primera = desde[0] ?? [];
    const encabezados = primera.map((c, i) => {
      const s = String(c ?? "").trim();
      return s || `Columna ${i + 1}`;
    });
    return { encabezados, filasCrudas: desde.slice(1) };
  }
  const ancho = Math.max(...desde.map((r) => r.length), 0);
  const encabezados = Array.from({ length: ancho }, (_, i) => `Columna ${i + 1}`);
  return { encabezados, filasCrudas: desde };
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
  const libro = XLSX.read(buffer, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) {
    throw new Error("El archivo no contiene hojas.");
  }
  return XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: "" });
}
