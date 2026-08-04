import { escaparRegexLiteral } from "@/lib/estPorProdColores";

/** Ítem del catálogo `est_por_prod_lts_conversion`. */
export type EstPorProdLtsConversionItem = {
  id: string;
  /** Texto en MAYÚSCULAS a buscar en la descripción (p. ej. «440 CC»). */
  texto: string;
  /** Litros equivalentes (p. ej. 0.4). */
  conversionLts: number;
};

/**
 * Busca el primer (texto más largo) match del catálogo en la descripción.
 * Compara en MAYÚSCULAS con límite de palabra (no letra/dígito alrededor).
 */
export function matchLtsConversionEnDescripcion(
  descripcion: string | null | undefined,
  conversiones: EstPorProdLtsConversionItem[]
): EstPorProdLtsConversionItem | null {
  const haystack = (descripcion ?? "").toLocaleUpperCase("es-AR").trim();
  if (!haystack || conversiones.length === 0) return null;

  const ordenados = [...conversiones].sort((a, b) => b.texto.length - a.texto.length);

  for (const item of ordenados) {
    const texto = item.texto.trim();
    if (!texto) continue;
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escaparRegexLiteral(texto)}(?![\\p{L}\\p{N}])`,
      "iu"
    );
    if (pattern.test(haystack)) {
      return item;
    }
  }

  return null;
}
