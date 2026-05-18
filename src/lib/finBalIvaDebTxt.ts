import { filaPerteneceMesAnio, type FilaCsvIvaDebParseada } from "@/lib/finBalIvaDebCsv";

/** Libro IVA Digital · ventas cabecera (266 caracteres, posiciones 1-based AFIP → 0-based). */
export const TXT_IVA_DEB_CABECERA_LONGITUD = 266;

/** Libro IVA Digital · ventas alícuotas (62 caracteres). */
export const TXT_IVA_DEB_ALICUOTAS_LONGITUD = 62;

export const TXT_IVA_DEB_POS_CABECERA = {
  fecha: [0, 8] as const,
  tipoComprobante: [8, 11] as const,
  puntoVenta: [11, 16] as const,
  numeroComprobante: [16, 36] as const,
  denominacionReceptor: [78, 108] as const,
  impTotal: [108, 123] as const,
} as const;

export const TXT_IVA_DEB_POS_ALICUOTAS = {
  tipoComprobante: [0, 3] as const,
  puntoVenta: [3, 8] as const,
  numeroComprobante: [8, 28] as const,
  impuestoLiquidado: [47, 62] as const,
} as const;

function sliceCampo(linea: string, [desde, hasta]: readonly [number, number]): string {
  return linea.slice(desde, hasta);
}

/** Importe de 15 dígitos: 13 enteros + 2 centavos (sin separador decimal). */
export function parsearImporteTxtIvaDeb15(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d{15}$/.test(s)) return null;
  const n = Number(s) / 100;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parsearFechaYmd(fechaRaw: string): Date | null {
  if (!/^\d{8}$/.test(fechaRaw)) return null;
  const y = Number(fechaRaw.slice(0, 4));
  const mo = Number(fechaRaw.slice(4, 6));
  const d = Number(fechaRaw.slice(6, 8));
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

export function claveComprobanteIvaDebTxt(tipo: string, ptoVta: string, nro: string): string {
  return `${tipo.trim()}|${ptoVta.trim()}|${nro.trim()}`;
}

interface CabeceraParseada {
  fechaEmision: Date;
  denominacionReceptor: string;
  impTotal: number;
  clave: string;
  dedupePayload: string;
}

interface AlicuotaParseada {
  clave: string;
  impIva: number;
}

export interface FilaTxtIvaDebSinDedupe {
  fechaEmision: Date;
  denominacionReceptor: string;
  impTotal: number;
  impIva: number;
  dedupePayload: string;
}

export interface ParseTxtIvaDebResult {
  ok: true;
  filas: FilaTxtIvaDebSinDedupe[];
  totalBruto: number;
  totalIva: number;
  erroresFila: number;
}

export interface ParseTxtIvaDebError {
  ok: false;
  error: string;
}

function parsearLineaCabecera(ln: string): CabeceraParseada | null {
  if (ln.length < TXT_IVA_DEB_CABECERA_LONGITUD) return null;

  const fechaRaw = sliceCampo(ln, TXT_IVA_DEB_POS_CABECERA.fecha);
  const fechaEmision = parsearFechaYmd(fechaRaw);
  const impTotal = parsearImporteTxtIvaDeb15(sliceCampo(ln, TXT_IVA_DEB_POS_CABECERA.impTotal));

  const tipo = sliceCampo(ln, TXT_IVA_DEB_POS_CABECERA.tipoComprobante).trim();
  const ptoVta = sliceCampo(ln, TXT_IVA_DEB_POS_CABECERA.puntoVenta).trim();
  const nro = sliceCampo(ln, TXT_IVA_DEB_POS_CABECERA.numeroComprobante).trim();

  let denominacionReceptor = sliceCampo(ln, TXT_IVA_DEB_POS_CABECERA.denominacionReceptor).trim();
  if (!denominacionReceptor) {
    denominacionReceptor = `Comprobante ${tipo || "?"}-${ptoVta || "?"}-${nro.slice(-8) || "?"}`;
  }
  denominacionReceptor = denominacionReceptor.slice(0, 512);

  if (!fechaEmision || impTotal == null) return null;

  const clave = claveComprobanteIvaDebTxt(tipo, ptoVta, nro);
  const dedupePayload = [fechaRaw, clave, sliceCampo(ln, TXT_IVA_DEB_POS_CABECERA.impTotal).trim()].join("|");

  return {
    fechaEmision,
    denominacionReceptor,
    impTotal,
    clave,
    dedupePayload,
  };
}

function parsearLineaAlicuota(ln: string): AlicuotaParseada | null {
  if (ln.length < TXT_IVA_DEB_ALICUOTAS_LONGITUD) return null;

  const tipo = sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.tipoComprobante).trim();
  const ptoVta = sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.puntoVenta).trim();
  const nro = sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.numeroComprobante).trim();
  const impIva = parsearImporteTxtIvaDeb15(
    sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.impuestoLiquidado),
  );

  if (impIva == null) return null;

  return {
    clave: claveComprobanteIvaDebTxt(tipo, ptoVta, nro),
    impIva,
  };
}

/**
 * Parsea TXT Libro IVA Digital: cabecera ventas (266) + alícuotas (62) en el mismo archivo.
 * El IVA débito se toma del campo «Impuesto liquidado» de las líneas de alícuotas.
 */
export function parsearTxtIvaDebitoAfip(
  texto: string,
): ParseTxtIvaDebResult | ParseTxtIvaDebError {
  const raw = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const cabeceras: CabeceraParseada[] = [];
  const ivaPorClave = new Map<string, number>();
  let erroresFila = 0;

  for (const line of lines) {
    const ln = line.trimEnd();
    if (!ln) continue;

    if (ln.length >= TXT_IVA_DEB_CABECERA_LONGITUD) {
      const cab = parsearLineaCabecera(ln);
      if (!cab) {
        erroresFila++;
        continue;
      }
      cabeceras.push(cab);
      continue;
    }

    if (ln.length >= TXT_IVA_DEB_ALICUOTAS_LONGITUD && ln.length < TXT_IVA_DEB_CABECERA_LONGITUD) {
      const alic = parsearLineaAlicuota(ln);
      if (!alic) {
        erroresFila++;
        continue;
      }
      ivaPorClave.set(alic.clave, (ivaPorClave.get(alic.clave) ?? 0) + alic.impIva);
      continue;
    }

    erroresFila++;
  }

  if (cabeceras.length === 0) {
    return {
      ok: false,
      error:
        erroresFila > 0
          ? "No se encontraron comprobantes válidos (líneas de 266 caracteres)."
          : "El archivo TXT está vacío o no tiene comprobantes de cabecera.",
    };
  }

  const filas: FilaTxtIvaDebSinDedupe[] = cabeceras.map((c) => ({
    fechaEmision: c.fechaEmision,
    denominacionReceptor: c.denominacionReceptor,
    impTotal: c.impTotal,
    impIva: ivaPorClave.get(c.clave) ?? 0,
    dedupePayload: c.dedupePayload,
  }));

  const totalBruto = filas.reduce((a, f) => a + f.impTotal, 0);
  const totalIva = filas.reduce((a, f) => a + f.impIva, 0);

  if (totalIva <= 0) {
    return {
      ok: false,
      error:
        "No se encontró IVA discriminado en el archivo. Incluí las líneas de alícuotas (62 caracteres) del Libro IVA Digital junto con la cabecera.",
    };
  }

  return { ok: true, filas, totalBruto, totalIva, erroresFila };
}

/** Todas las fechas del archivo deben pertenecer al mes/año objetivo. */
export function archivoTxtIvaDebCoincideMes(
  filas: Pick<FilaTxtIvaDebSinDedupe, "fechaEmision">[],
  mes: number,
  anio: number,
): { ok: true } | { ok: false; error: string } {
  const fuera = filas.filter((f) => !filaPerteneceMesAnio(f.fechaEmision, mes, anio));
  if (fuera.length === 0) return { ok: true };

  const primera = fuera[0]!.fechaEmision;
  const y = primera.getUTCFullYear();
  const m = primera.getUTCMonth() + 1;
  return {
    ok: false,
    error: `El archivo no corresponde a ${mes}/${anio}: hay ${fuera.length} comprobante(s) de ${m}/${y} u otro período.`,
  };
}

/** Convierte filas parseadas en entidades persistibles (solo servidor). */
export function filasTxtConDedupeKey(
  filas: FilaTxtIvaDebSinDedupe[],
  hashFn: (payload: string) => string,
): FilaCsvIvaDebParseada[] {
  return filas.map((f) => ({
    dedupeKey: hashFn(f.dedupePayload),
    fechaEmision: f.fechaEmision,
    denominacionReceptor: f.denominacionReceptor,
    impTotal: f.impTotal,
    impIva: f.impIva,
  }));
}
