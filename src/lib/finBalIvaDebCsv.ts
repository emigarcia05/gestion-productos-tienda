import { createHash } from "crypto";

/** Encabezados esperados del CSV AFIP (exportación estándar con `;`). */
export const CSV_IVA_DEB_FECHA = "Fecha de Emisión";
export const CSV_IVA_DEB_TIPO = "Tipo de Comprobante";
export const CSV_IVA_DEB_PTO_VTA = "Punto de Venta";
export const CSV_IVA_DEB_NUM_DESDE = "Número Desde";
export const CSV_IVA_DEB_NUM_HASTA = "Número Hasta";
export const CSV_IVA_DEB_COD_AUT = "Cód. Autorización";
export const CSV_IVA_DEB_NRO_DOC_REC = "Nro. Doc. Receptor";
export const CSV_IVA_DEB_DENOMINACION = "Denominación Receptor";
export const CSV_IVA_DEB_IMP_TOTAL = "Imp. Total";

export interface FilaCsvIvaDebParseada {
  dedupeKey: string;
  fechaEmision: Date;
  denominacionReceptor: string;
  impTotal: number;
}

function stripBom(s: string): string {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

export function stripQuotes(cell: string): string {
  const t = cell.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/""/g, '"').trim();
  }
  return t;
}

/** Parsea número con coma decimal (y opcionalmente punto miles). */
export function parseDecimalEsAr(raw: string): number | null {
  const s = stripQuotes(raw);
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let norm: string;
  if (lastComma > lastDot) {
    norm = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    norm = s.replace(/,/g, "");
  } else {
    norm = s;
  }
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

function celdasLinea(line: string): string[] {
  return line.split(";").map(stripQuotes);
}

function parseFechaEmision(raw: string): Date | null {
  const s = stripQuotes(raw).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

function buildDedupeKey(parts: {
  fecha: string;
  tipo: string;
  ptoVta: string;
  numDesde: string;
  numHasta: string;
  codAut: string;
  nroDocRec: string;
}): string {
  const payload = [
    parts.fecha.trim(),
    parts.tipo.trim(),
    parts.ptoVta.trim(),
    parts.numDesde.trim(),
    parts.numHasta.trim(),
    parts.codAut.trim(),
    parts.nroDocRec.trim(),
  ].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export interface ParseCsvIvaDebResult {
  ok: true;
  filas: FilaCsvIvaDebParseada[];
  erroresFila: number;
}
export interface ParseCsvIvaDebError {
  ok: false;
  error: string;
}

/**
 * Parsea el texto completo del CSV. No filtra por mes (lo hace el servicio al importar).
 */
export function parsearCsvIvaDebitoAfip(texto: string): ParseCsvIvaDebResult | ParseCsvIvaDebError {
  const raw = stripBom(texto).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter((ln) => ln.trim() !== "");
  if (lines.length < 2) {
    return { ok: false, error: "El archivo CSV está vacío o no tiene datos." };
  }

  const headerCells = celdasLinea(lines[0]);
  const idx = (name: string): number => headerCells.findIndex((h) => h.trim() === name);

  const iFecha = idx(CSV_IVA_DEB_FECHA);
  const iTipo = idx(CSV_IVA_DEB_TIPO);
  const iPto = idx(CSV_IVA_DEB_PTO_VTA);
  const iNd = idx(CSV_IVA_DEB_NUM_DESDE);
  const iNh = idx(CSV_IVA_DEB_NUM_HASTA);
  const iCod = idx(CSV_IVA_DEB_COD_AUT);
  const iDoc = idx(CSV_IVA_DEB_NRO_DOC_REC);
  const iDenom = idx(CSV_IVA_DEB_DENOMINACION);
  const iImp = idx(CSV_IVA_DEB_IMP_TOTAL);

  const required = [
    [iFecha, CSV_IVA_DEB_FECHA],
    [iTipo, CSV_IVA_DEB_TIPO],
    [iPto, CSV_IVA_DEB_PTO_VTA],
    [iNd, CSV_IVA_DEB_NUM_DESDE],
    [iNh, CSV_IVA_DEB_NUM_HASTA],
    [iCod, CSV_IVA_DEB_COD_AUT],
    [iDoc, CSV_IVA_DEB_NRO_DOC_REC],
    [iDenom, CSV_IVA_DEB_DENOMINACION],
    [iImp, CSV_IVA_DEB_IMP_TOTAL],
  ] as const;

  for (const [ix, label] of required) {
    if (ix < 0) {
      return {
        ok: false,
        error: `No se encontró la columna obligatoria «${label}». Revise que el CSV sea el export AFIP con separador «;».`,
      };
    }
  }

  const filas: FilaCsvIvaDebParseada[] = [];
  let erroresFila = 0;

  for (let r = 1; r < lines.length; r++) {
    const cells = celdasLinea(lines[r]);
    const get = (i: number) => (i < cells.length ? cells[i] : "");

    const fechaRaw = get(iFecha);
    const fechaEmision = parseFechaEmision(fechaRaw);
    const impTotal = parseDecimalEsAr(get(iImp));
    const denominacionReceptor = stripQuotes(get(iDenom)).slice(0, 512);

    if (!fechaEmision || impTotal == null || impTotal < 0 || !denominacionReceptor) {
      erroresFila++;
      continue;
    }

    const dedupeKey = buildDedupeKey({
      fecha: stripQuotes(fechaRaw).trim(),
      tipo: get(iTipo),
      ptoVta: get(iPto),
      numDesde: get(iNd),
      numHasta: get(iNh),
      codAut: get(iCod),
      nroDocRec: get(iDoc),
    });

    filas.push({
      dedupeKey,
      fechaEmision,
      denominacionReceptor,
      impTotal,
    });
  }

  if (filas.length === 0) {
    return {
      ok: false,
      error:
        erroresFila > 0
          ? "No se pudo leer ninguna fila válida (fechas o importes incorrectos)."
          : "No hay filas de datos en el CSV.",
    };
  }

  return { ok: true, filas, erroresFila };
}

export function filaPerteneceMesAnio(fecha: Date, mes: number, anio: number): boolean {
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() + 1 === mes;
}
