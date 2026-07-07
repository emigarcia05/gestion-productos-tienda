import { fmtNumero } from "@/lib/format";

/** Tope máscara PX entero Px Listas (9 dígitos). */
export const PX_LISTA_ENTERO_MASK_MAX = 999_999_999;

export function pxListaEnteroNormalizedToDigits(norm: string): number {
  const t = norm.trim();
  if (t === "") return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.trunc(n), PX_LISTA_ENTERO_MASK_MAX);
}

export function pxListaEnteroDigitsToNormalized(digits: number): string {
  const safe = Math.min(Math.max(Math.trunc(digits), 0), PX_LISTA_ENTERO_MASK_MAX);
  if (safe <= 0) return "";
  return String(safe);
}

/** Visual en input: miles `.` (es-AR), sin `$`. */
export function pxListaEnteroNormalizedToDisplay(norm: string): string {
  if (norm.trim() === "") return "";
  const n = pxListaEnteroNormalizedToDigits(norm);
  if (n <= 0) return "";
  return fmtNumero(n);
}

/** Inicializa normalizado desde PX entero persistido. */
export function pxListaEnteroFromNumber(px: number | null | undefined): string {
  if (px == null || !(px > 0) || !Number.isFinite(px)) return "";
  return pxListaEnteroDigitsToNormalized(Math.round(px));
}

/** Parsea normalizado → entero positivo; vacío → `undefined`; inválido → `undefined`. */
export function parsePxListaEnteroNormalized(norm: string): number | undefined {
  const t = norm.trim();
  if (t === "") return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return undefined;
  return Math.min(n, PX_LISTA_ENTERO_MASK_MAX);
}
