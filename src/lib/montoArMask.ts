/**
 * Máscara AR para montos en pesos: entrada tipo POS (cada dígito agrega centavos a la derecha),
 * visualización con `.` miles y `,` decimales (es-AR), opcional prefijo `$`.
 * El valor persistido en estado de formulario es un string **normalizado** parseable con `Number()`
 * (punto solo como decimal ASCII, sin miles), p. ej. `"0"`, `"0.01"`, `"1234.56"`.
 */

export const MONTO_AR_MASK_MAX_CENTS = 99_999_999_999; // hasta 999.999.999,99

export function montoArNormalizedStringToCents(norm: string): number {
  const t = norm.trim();
  if (t === "") return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return 0;
  const cents = Math.round(n * 100);
  return Math.min(Math.max(cents, 0), MONTO_AR_MASK_MAX_CENTS);
}

export function montoArCentsToNormalizedString(cents: number): string {
  const safe = Math.min(Math.max(Math.trunc(cents), 0), MONTO_AR_MASK_MAX_CENTS);
  const enteros = Math.floor(safe / 100);
  const decimales = safe % 100;
  if (decimales === 0) return String(enteros);
  return `${enteros}.${String(decimales).padStart(2, "0")}`;
}

/** Visual con miles `.` y decimales `,XX` (sin símbolo). */
export function montoArCentsToDisplayBody(cents: number): string {
  const safe = Math.min(Math.max(Math.trunc(cents), 0), MONTO_AR_MASK_MAX_CENTS);
  const enteros = Math.floor(safe / 100);
  const decimales = safe % 100;
  const enterosFmt = enteros.toLocaleString("es-AR", {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
  return `${enterosFmt},${String(decimales).padStart(2, "0")}`;
}

export function montoArCentsToDisplayWithCurrency(
  cents: number,
  currencySymbol: string = "$"
): string {
  return `${currencySymbol}${montoArCentsToDisplayBody(cents)}`;
}

/** Pesos enteros (p. ej. saldo) como en la máscara: siempre `$` + miles + `,00`. */
export function montoArPesosEnterosToDisplay(pesos: number): string {
  if (!Number.isFinite(pesos) || pesos <= 0) {
    return montoArCentsToDisplayWithCurrency(0);
  }
  const ent = Math.trunc(pesos);
  const cents = Math.min(ent * 100, MONTO_AR_MASK_MAX_CENTS);
  return montoArCentsToDisplayWithCurrency(cents);
}

/** Pesos (2 decimales) desde string normalizado. */
export function montoArNormalizedStringToPesosNumber(norm: string): number {
  return montoArNormalizedStringToCents(norm) / 100;
}

/** Pesos enteros (redondeo) para columnas Int en DB. */
export function montoArNormalizedStringToPesosIntRounded(norm: string): number {
  return Math.round(montoArNormalizedStringToPesosNumber(norm));
}

/** Inicializar normalizado desde pesos enteros guardados en DB. */
export function montoArPesosEnterosToNormalizedString(pesos: number): string {
  if (!Number.isFinite(pesos) || pesos <= 0) return "";
  return String(Math.trunc(pesos));
}
