import { fmtPrecio, fmtPctEntero } from "@/lib/format";

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

/** Sanitiza texto mientras se escribe DIF PX REF MANUAL (entero con signo + `%` opcional). */
export function sanitizeDifPxRefManualInput(raw: string): string {
  const sinPct = raw.replace(/%/g, "").trimStart();
  const m = sinPct.match(/^([+-]?)(\d*)/);
  if (!m) return "";
  const signPrefix = m[1];
  const digits = m[2] ?? "";
  if (signPrefix === "-" && digits === "") return "-";
  if (signPrefix === "+" && digits === "") return "+";
  if (digits === "") return "";
  return `${signPrefix === "-" ? "-" : ""}${digits}%`;
}

/** Entero con signo desde input DIF PX REF MANUAL; vacío → `0`; inválido → `undefined`. */
export function parseDifPxRefManualMask(raw: string): number | null | undefined {
  const trimmed = raw.replace(/%/g, "").trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "+") return 0;
  const normalized = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  const n = Number(normalized);
  if (!Number.isSafeInteger(n)) return undefined;
  return n;
}

/** Máscara DIF PX REF MANUAL: entero con signo + `%` (es-AR). `null` → `0%`. */
export function formatDifPxRefManualMask(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return fmtPctEntero(0);
  return fmtPctEntero(n);
}

/** Entero 0–99 desde input DTO. EXTRA; vacío → `0`; inválido → `undefined`. */
export function parseDtoExtraComparacionMask(raw: string): number | null | undefined {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return 0;
  const n = Number(digits);
  if (!Number.isSafeInteger(n) || n < 0 || n > 99) return undefined;
  return n;
}

/** Máscara DTO. EXTRA: entero + `%` (es-AR). `null` → `0%`. */
export function formatDtoExtraComparacionMask(n: number | null | undefined): string {
  const v = n == null || n < 0 ? 0 : n;
  return `${v.toLocaleString("es-AR")}%`;
}

/** Margen % en Comp. Categorias: 2 decimales, sin tope 100 (puede superar 100 %). */
export function roundMargenComparacionPct(value: number): number {
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
