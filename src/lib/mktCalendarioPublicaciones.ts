/**
 * Ventana de 5 semanas para el calendario de publicaciones (Marketing).
 * Semana empieza el **lunes**; fechas en calendario de negocio Argentina (`YYYY-MM-DD`).
 */

import {
  addDaysToIsoYmdArgentina,
  dateToIsoYmdArgentina,
  formatMesAnioMayusculasDesdeIsoYmd,
} from "@/lib/fechaArgentina";

export const MKT_CALENDARIO_SEMANAS_VISIBLE = 5;
export const MKT_CALENDARIO_DIAS_SEMANA = [
  "LUN.",
  "MAR.",
  "MIÉ.",
  "JUE.",
  "VIE.",
  "SÁB.",
  "DOM.",
] as const;

export type MktCalendarioMesAnio = {
  /** Año civil. */
  anio: number;
  /** Mes 1–12. */
  mes: number;
};

export type MktCalendarioDiaCelda = {
  isoYmd: string;
  /** Día del mes (1–31). */
  diaMes: number;
  /** Mes 1–12. */
  mes: number;
  /** Año. */
  anio: number;
  /** Pertenece al mes en vista (navegación). */
  delMesActual: boolean;
  /** Coincide con hoy (Argentina). */
  esHoy: boolean;
};

export type MktCalendarioSemana = {
  /** Lunes de la semana (`YYYY-MM-DD`). */
  lunesIso: string;
  dias: MktCalendarioDiaCelda[];
};

/** Partes numéricas de `YYYY-MM-DD`. */
export function partesIsoYmd(isoYmd: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = isoYmd.split("-").map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  return { y, m, d };
}

/**
 * Lunes de la semana que contiene `isoYmd` (calendario AR).
 * Domingo → lunes anterior; lunes → mismo día.
 */
export function lunesDeSemanaIsoYmdArgentina(isoYmd: string): string {
  const partes = partesIsoYmd(isoYmd);
  if (!partes) return isoYmd;
  const utc = Date.UTC(partes.y, partes.m - 1, partes.d, 12, 0, 0);
  /** 0=dom … 6=sáb (UTC del día civil). */
  const dow = new Date(utc).getUTCDay();
  const offsetDesdeLunes = dow === 0 ? 6 : dow - 1;
  return addDaysToIsoYmdArgentina(isoYmd, -offsetDesdeLunes);
}

/** Lunes de la semana actual en Argentina. */
export function lunesSemanaActualArgentina(ahora: Date = new Date()): string {
  return lunesDeSemanaIsoYmdArgentina(dateToIsoYmdArgentina(ahora));
}

/** Mes/año civiles de “hoy” en Argentina. */
export function mesAnioActualArgentina(ahora: Date = new Date()): MktCalendarioMesAnio {
  const partes = partesIsoYmd(dateToIsoYmdArgentina(ahora));
  return { anio: partes?.y ?? 1970, mes: partes?.m ?? 1 };
}

/** `YYYY-MM-01` del mes indicado. */
export function isoYmdPrimerDiaMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}

/** Lunes de la semana que contiene el día 1 del mes (inicio de fila del mes). */
export function lunesInicioMesArgentina(anio: number, mes: number): string {
  return lunesDeSemanaIsoYmdArgentina(isoYmdPrimerDiaMes(anio, mes));
}

/** Desplaza mes/año ±N meses (sin día). */
export function desplazarMesAnio(
  vista: MktCalendarioMesAnio,
  deltaMeses: number
): MktCalendarioMesAnio {
  const idx = vista.anio * 12 + (vista.mes - 1) + deltaMeses;
  const anio = Math.floor(idx / 12);
  const mes = (idx % 12) + 1;
  return { anio, mes };
}

/** Etiqueta centrada: `JULIO 2026`. */
export function etiquetaMesAnioMayusculas(vista: MktCalendarioMesAnio): string {
  return formatMesAnioMayusculasDesdeIsoYmd(isoYmdPrimerDiaMes(vista.anio, vista.mes));
}

function armarCelda(
  isoYmd: string,
  mesVista: number,
  anioVista: number,
  hoyIso: string
): MktCalendarioDiaCelda {
  const partes = partesIsoYmd(isoYmd);
  const diaMes = partes?.d ?? 0;
  const mes = partes?.m ?? 0;
  const anio = partes?.y ?? 0;
  return {
    isoYmd,
    diaMes,
    mes,
    anio,
    delMesActual: mes === mesVista && anio === anioVista,
    esHoy: isoYmd === hoyIso,
  };
}

/**
 * 5 semanas consecutivas a partir del lunes `lunesInicioIso` (inclusive).
 * `mesVista`/`anioVista` definen el resaltado del mes navegable (default: mes de hoy AR).
 */
export function construirVentanaCincoSemanas(
  lunesInicioIso: string,
  opciones?: { ahora?: Date; mesVista?: number; anioVista?: number }
): MktCalendarioSemana[] {
  const ahora = opciones?.ahora ?? new Date();
  const hoyIso = dateToIsoYmdArgentina(ahora);
  const hoy = mesAnioActualArgentina(ahora);
  const mesVista = opciones?.mesVista ?? hoy.mes;
  const anioVista = opciones?.anioVista ?? hoy.anio;

  const lunesBase = lunesDeSemanaIsoYmdArgentina(lunesInicioIso);
  const semanas: MktCalendarioSemana[] = [];

  for (let s = 0; s < MKT_CALENDARIO_SEMANAS_VISIBLE; s += 1) {
    const lunesIso = addDaysToIsoYmdArgentina(lunesBase, s * 7);
    const dias: MktCalendarioDiaCelda[] = [];
    for (let d = 0; d < 7; d += 1) {
      const iso = addDaysToIsoYmdArgentina(lunesIso, d);
      dias.push(armarCelda(iso, mesVista, anioVista, hoyIso));
    }
    semanas.push({ lunesIso, dias });
  }

  return semanas;
}
