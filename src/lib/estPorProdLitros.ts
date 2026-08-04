import { matchLtsConversionEnDescripcion } from "@/lib/estPorProdLtsConversion";
import type { EstPorProdLtsConversionItem } from "@/lib/estPorProdLtsConversion";

/**
 * Extrae litros desde la descripción del producto (p. ej. «… 20 LTS», «4 L»).
 * Si hay varios matches, usa el último (suele ser el volumen al final).
 */
export function extraerLitrosDesdeDescripcion(
  descripcion: string | null | undefined
): number | null {
  const s = (descripcion ?? "").toLocaleUpperCase("es-AR");
  if (!s.trim()) return null;

  const re = /(\d+(?:[.,]\d+)?)\s*LTS?\b/gi;
  let last: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(s)) !== null) {
    const raw = match[1]?.replace(",", ".") ?? "";
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) {
      last = n;
    }
  }
  return last;
}

/**
 * Resuelve litros: 1) catálogo `est_por_prod_lts_conversion` (texto → lts);
 * 2) fallback regex «N LTS» / «N L» en la descripción.
 */
export function resolverLitrosDesdeDescripcion(
  descripcion: string | null | undefined,
  conversiones: EstPorProdLtsConversionItem[]
): number | null {
  const fromCatalog = matchLtsConversionEnDescripcion(descripcion, conversiones);
  if (fromCatalog) return fromCatalog.conversionLts;
  return extraerLitrosDesdeDescripcion(descripcion);
}

/** Etiqueta de litros para UI / filtros (sin unidad). */
export function etiquetaLitros(lts: number | null): string {
  if (lts == null) return "";
  return Number.isInteger(lts)
    ? String(lts)
    : lts.toLocaleString("es-AR", { maximumFractionDigits: 3 });
}
