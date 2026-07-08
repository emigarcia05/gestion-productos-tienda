import { fmtNumero } from "@/lib/format";

/** PX lista tienda en grilla Px Listas: entero, sin decimales (es-AR). */
export function fmtPxListaTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return fmtNumero(n);
}

/** Redondeo al guardar PX en Px Listas (entero). */
export function roundPxListaEntero(value: number): number {
  return Math.round(value);
}

/** Margen % en grilla Px Listas: 2 decimales, mínimo 0 (sin tope superior en UI; BD `DECIMAL(8,4)`). */
export function roundMargenPxListaPct(value: number): number {
  const floored = Math.max(0, value);
  return Math.round(floored * 100) / 100;
}

/** Tope máscara **MARG. MAN.** Px Listas: 9.999,99 % (2 decimales; sin tope inferior 0). */
export const MARGEN_PX_LISTA_MAX_CENTS = 999_999;

/** Valor para `<input>` de margen (2 decimales, sin `%`). */
export function formatMargenPxListaInput(n: number): string {
  return roundMargenPxListaPct(n).toFixed(2);
}

/** Parsea margen editado en Px Listas (≥ 0, máx. 2 decimales). */
export function parseMargenPxListaInput(raw: string): number | undefined {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return roundMargenPxListaPct(n);
}

/** Margen en modo lectura (2 decimales + `%`, es-AR). */
export function fmtMargenPxListaTabla(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  const s = roundMargenPxListaPct(n).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${s}%`;
}

/** Precisión de comparación de margen % (2 decimales). */
const COMPARACION_MARGEN_FACTOR = 100;

/** Difieren dos márgenes % redondeados a 2 decimales. */
export function margenesPorcUtilidadDifieren(
  margenA: number,
  margenB: number
): boolean {
  return (
    Math.round(margenA * COMPARACION_MARGEN_FACTOR) !==
    Math.round(margenB * COMPARACION_MARGEN_FACTOR)
  );
}

/** Comparación de PX enteros (staging vs DUX). */
export function preciosPxListaEnterosIguales(
  pxA: number | null | undefined,
  pxB: number | null | undefined
): boolean {
  if (pxA == null || pxB == null) return false;
  if (!(pxA > 0) || !(pxB > 0)) return false;
  return roundPxListaEntero(pxA) === roundPxListaEntero(pxB);
}

/** Mismo PX de lista tienda a entero (DUX devuelve precio, no margen). */
export function preciosPxListaSincronizados(
  pxA: number | null | undefined,
  pxB: number | null | undefined
): boolean {
  if (pxA == null || pxB == null) return false;
  if (!(pxA > 0) || !(pxB > 0)) return false;
  return roundPxListaEntero(pxA) === roundPxListaEntero(pxB);
}
