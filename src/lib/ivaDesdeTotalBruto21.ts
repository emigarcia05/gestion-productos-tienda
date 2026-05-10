/** Monto bruto con IVA 21 % implícito (`total / 1.21` = neto gravado). */
const DIVISOR_NETO_CON_IVA = 1.21 as const;

/**
 * IVA incluido en un total bruto al 21 %: `total - (total / 1.21)` redondeado al peso entero.
 * Usado en IVA crédito y IVA débito desde totales con misma alícuota implícita.
 */
export function ivaCreditoDesdeTotalConIva21(totalPesos: number): number {
  if (!Number.isFinite(totalPesos) || totalPesos <= 0) return 0;
  return Math.round(totalPesos - totalPesos / DIVISOR_NETO_CON_IVA);
}
