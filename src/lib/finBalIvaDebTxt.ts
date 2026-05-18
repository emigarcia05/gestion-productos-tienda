import type { FilaCsvIvaDebParseada } from "@/lib/finBalIvaDebCsv";

/** Libro IVA Digital · ventas alícuotas (62 caracteres por línea). */
export const TXT_IVA_DEB_ALICUOTAS_LONGITUD = 62;

/** Líneas de cabecera (266) no se importan; si aparecen, se rechaza el archivo. */
const TXT_IVA_DEB_CABECERA_LONGITUD = 266;

export const TXT_IVA_DEB_POS_ALICUOTAS = {
  tipoComprobante: [0, 3] as const,
  puntoVenta: [3, 8] as const,
  numeroComprobante: [8, 28] as const,
  importeNetoGravado: [28, 43] as const,
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

function claveComprobanteIvaDebTxt(tipo: string, ptoVta: string, nro: string): string {
  return `${tipo.trim()}|${ptoVta.trim()}|${nro.trim()}`;
}

function etiquetaComprobanteDesdeClave(clave: string): string {
  const [tipo, pto, nro] = clave.split("|");
  const nroCorto = (nro ?? "").replace(/^0+/, "") || nro || "?";
  return `Comprobante ${tipo || "?"}-${pto || "?"}-${nroCorto}`;
}

interface AlicuotaParseada {
  clave: string;
  impNeto: number;
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

export interface ParseTxtIvaDebitoOpciones {
  mes: number;
  anio: number;
}

function parsearLineaAlicuota(ln: string): AlicuotaParseada | null {
  if (ln.length !== TXT_IVA_DEB_ALICUOTAS_LONGITUD) return null;

  const tipo = sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.tipoComprobante).trim();
  const ptoVta = sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.puntoVenta).trim();
  const nro = sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.numeroComprobante).trim();
  const impNeto = parsearImporteTxtIvaDeb15(
    sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.importeNetoGravado),
  );
  const impIva = parsearImporteTxtIvaDeb15(
    sliceCampo(ln, TXT_IVA_DEB_POS_ALICUOTAS.impuestoLiquidado),
  );

  if (impIva == null || impNeto == null) return null;

  return {
    clave: claveComprobanteIvaDebTxt(tipo, ptoVta, nro),
    impNeto,
    impIva,
  };
}

/**
 * Parsea únicamente el TXT de alícuotas (Libro IVA Digital ventas, 62 caracteres).
 * El IVA débito es la suma del campo «Impuesto liquidado»; no se calcula en la app.
 */
export function parsearTxtIvaDebitoAfip(
  texto: string,
  opciones: ParseTxtIvaDebitoOpciones,
): ParseTxtIvaDebResult | ParseTxtIvaDebError {
  const { mes, anio } = opciones;
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
    return { ok: false, error: "Período inválido." };
  }

  const raw = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const alicuotas: AlicuotaParseada[] = [];
  let erroresFila = 0;
  let lineasCabecera = 0;

  for (const line of lines) {
    const ln = line.trimEnd();
    if (!ln) continue;

    if (ln.length >= TXT_IVA_DEB_CABECERA_LONGITUD) {
      lineasCabecera++;
      continue;
    }

    if (ln.length === TXT_IVA_DEB_ALICUOTAS_LONGITUD) {
      const alic = parsearLineaAlicuota(ln);
      if (!alic) {
        erroresFila++;
        continue;
      }
      alicuotas.push(alic);
      continue;
    }

    erroresFila++;
  }

  if (lineasCabecera > 0) {
    return {
      ok: false,
      error:
        "El archivo incluye líneas de cabecera (266 caracteres). Solo se acepta el TXT de alícuotas (62 caracteres por línea).",
    };
  }

  if (alicuotas.length === 0) {
    return {
      ok: false,
      error:
        erroresFila > 0
          ? "No se encontraron líneas de alícuotas válidas (62 caracteres por línea)."
          : "El archivo TXT está vacío.",
    };
  }

  const fechaRef = new Date(Date.UTC(anio, mes - 1, 1));
  const filas: FilaTxtIvaDebSinDedupe[] = alicuotas.map((a) => ({
    fechaEmision: fechaRef,
    denominacionReceptor: etiquetaComprobanteDesdeClave(a.clave),
    impTotal: a.impNeto + a.impIva,
    impIva: a.impIva,
    dedupePayload: a.clave,
  }));

  const totalBruto = filas.reduce((a, f) => a + f.impTotal, 0);
  const totalIva = filas.reduce((a, f) => a + f.impIva, 0);

  if (totalIva <= 0) {
    return {
      ok: false,
      error: "No se encontró IVA discriminado en las líneas de alícuotas.",
    };
  }

  return { ok: true, filas, totalBruto, totalIva, erroresFila };
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
