/**
 * Ventana de 5 semanas para el calendario de publicaciones (Marketing).
 * Semana empieza el **lunes**; fechas en calendario de negocio Argentina (`YYYY-MM-DD`).
 */

import {
  addDaysToIsoYmdArgentina,
  dateToIsoYmdArgentina,
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

export type MktCalendarioDiaCelda = {
  isoYmd: string;
  /** Día del mes (1–31). */
  diaMes: number;
  /** Mes 1–12. */
  mes: number;
  /** Año. */
  anio: number;
  /** Pertenece al mes calendario de “hoy” en Argentina. */
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

function armarCelda(
  isoYmd: string,
  mesActual: number,
  anioActual: number,
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
    delMesActual: mes === mesActual && anio === anioActual,
    esHoy: isoYmd === hoyIso,
  };
}

/**
 * 5 semanas consecutivas a partir del lunes `lunesInicioIso` (inclusive).
 * `mesActual`/`anioActual` definen el resaltado “mes actual” (hoy AR al abrir, fijo para la sesión UI).
 */
export function construirVentanaCincoSemanas(
  lunesInicioIso: string,
  opciones?: { ahora?: Date }
): MktCalendarioSemana[] {
  const ahora = opciones?.ahora ?? new Date();
  const hoyIso = dateToIsoYmdArgentina(ahora);
  const hoyPartes = partesIsoYmd(hoyIso);
  const mesActual = hoyPartes?.m ?? 1;
  const anioActual = hoyPartes?.y ?? 1970;

  const lunesBase = lunesDeSemanaIsoYmdArgentina(lunesInicioIso);
  const semanas: MktCalendarioSemana[] = [];

  for (let s = 0; s < MKT_CALENDARIO_SEMANAS_VISIBLE; s += 1) {
    const lunesIso = addDaysToIsoYmdArgentina(lunesBase, s * 7);
    const dias: MktCalendarioDiaCelda[] = [];
    for (let d = 0; d < 7; d += 1) {
      const iso = addDaysToIsoYmdArgentina(lunesIso, d);
      dias.push(armarCelda(iso, mesActual, anioActual, hoyIso));
    }
    semanas.push({ lunesIso, dias });
  }

  return semanas;
}

/** Mueve el ancla (lunes) ±N semanas. */
export function desplazarLunesSemanas(lunesIso: string, deltaSemanas: number): string {
  return addDaysToIsoYmdArgentina(lunesIso, deltaSemanas * 7);
}

/** Rótulo de rango visible: `13/07 — 16/08/2026`. */
export function etiquetaRangoVentanaCincoSemanas(lunesInicioIso: string): string {
  const semanas = construirVentanaCincoSemanas(lunesInicioIso);
  const primero = semanas[0]?.dias[0]?.isoYmd;
  const ultimo = semanas[MKT_CALENDARIO_SEMANAS_VISIBLE - 1]?.dias[6]?.isoYmd;
  if (!primero || !ultimo) return "";
  const a = partesIsoYmd(primero);
  const b = partesIsoYmd(ultimo);
  if (!a || !b) return "";
  const dd = (n: number) => String(n).padStart(2, "0");
  const desde = `${dd(a.d)}/${dd(a.m)}`;
  const hasta = `${dd(b.d)}/${dd(b.m)}/${b.y}`;
  return `${desde} — ${hasta}`;
}
