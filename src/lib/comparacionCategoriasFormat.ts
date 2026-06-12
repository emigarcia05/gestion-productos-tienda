import { fmtPrecio } from "@/lib/format";

/** Entero positivo desde input con máscara `$` y separador de miles (`.`). Vacío → `null`; inválido → `undefined`. */
export function parsePxManualEnteroMask(raw: string): number | null | undefined {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  if (!Number.isSafeInteger(n) || n <= 0) return undefined;
  return n;
}

/** Máscara px manual: `$` + miles con `.` (es-AR). */
export function formatPxManualEnteroMask(n: number | null | undefined): string {
  if (n == null || n <= 0) return "";
  return `$${fmtPrecio(n)}`;
}

/** Margen % en Comp. Categorias: entero redondeado, sin tope 100 (puede superar 100 %). */
export function roundMargenComparacionPct(value: number): number {  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/** Margen % en grilla Comparacion (entero + `%`, es-AR). */
export function fmtMargenComparacionPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return `${roundMargenComparacionPct(n).toLocaleString("es-AR")}%`;
}
