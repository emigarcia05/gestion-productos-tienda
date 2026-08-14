import { fmtPrecio, fmtPctEntero } from "@/lib/format";

/** Máscara px manual: `$` + miles con `.` (es-AR). */
export function formatPxManualEnteroMask(n: number | null | undefined): string {
  if (n == null || n <= 0) return "";
  return `$${fmtPrecio(n)}`;
}

/** Máscara DIF PX REF MANUAL: entero con signo + `%` (es-AR). `null` → `0%`. */
export function formatDifPxRefManualMask(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return fmtPctEntero(0);
  return fmtPctEntero(n);
}

/** Máscara DTO. EXTRA: entero + `%` (es-AR). `null` → `0%`. */
export function formatDtoExtraComparacionMask(n: number | null | undefined): string {
  const v = n == null || n < 0 ? 0 : n;
  return `${v.toLocaleString("es-AR")}%`;
}

/** Margen % en Comp. Categorias: 2 decimales, sin tope 100 (puede superar 100 %). */
function roundMargenComparacionPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/** Margen % en grilla Comparacion (2 decimales + `%`, es-AR). */
export function fmtMargenComparacionPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  const s = roundMargenComparacionPct(n).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${s}%`;
}
