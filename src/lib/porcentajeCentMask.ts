/**
 * Máscara POS para porcentajes 0–100 con 2 decimales visibles (es-AR).
 * Cada dígito desplaza a la derecha en centésimas: 1 → 0,01; 12 → 0,12; 125 → 1,25.
 * Máximo 99,99 % (9999 centésimas). Para persistir: string normalizado `"12.26"`.
 */

import {
  montoArCentsToDisplayBody,
  montoArCentsToNormalizedString,
  montoArNormalizedStringToCents,
} from "@/lib/montoArMask";
import { roundPorcentaje0a100 } from "@/lib/format";

/** Tope de entrada: 99,99 %. */
export const PORCENTAJE_CENT_MASK_MAX_CENTS = 9_999;

export function porcentajeCentNormalizedStringToCents(norm: string): number {
  const c = montoArNormalizedStringToCents(norm);
  return Math.min(Math.max(c, 0), PORCENTAJE_CENT_MASK_MAX_CENTS);
}

export function porcentajeCentCentsToNormalizedString(cents: number): string {
  const safe = Math.min(Math.max(Math.trunc(cents), 0), PORCENTAJE_CENT_MASK_MAX_CENTS);
  return montoArCentsToNormalizedString(safe);
}

/** Visual sin símbolo: `12,26`. */
export function porcentajeCentNormalizedToDisplay(norm: string): string {
  if (norm.trim() === "") return "";
  return montoArCentsToDisplayBody(porcentajeCentNormalizedStringToCents(norm));
}

/** Valor inicial desde número en BD (0 → vacío). */
export function porcentajeCentFromNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const cents = Math.min(Math.round(roundPorcentaje0a100(n) * 100), PORCENTAJE_CENT_MASK_MAX_CENTS);
  if (cents <= 0) return "";
  return montoArCentsToNormalizedString(cents);
}

/** Vacío → `undefined`. Válido solo si &gt; 0 y &lt; 100. */
export function parsePorcentajeCentNormalized(norm: string): number | undefined {
  const t = norm.trim();
  if (t === "") return undefined;
  const cents = porcentajeCentNormalizedStringToCents(t);
  if (cents <= 0 || cents >= 10_000) return undefined;
  return cents / 100;
}
