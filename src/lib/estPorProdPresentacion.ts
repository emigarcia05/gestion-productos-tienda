import { escaparRegexLiteral } from "@/lib/estPorProdColores";
import type { EstPorProdUnPresentacionItem } from "@/lib/estPorProdUnPresentacion";
import { formatearPresentacionConUnidad } from "@/lib/estPorProdUnPresentacion";

/** Ítem del catálogo `est_por_prod_presentacion`. */
export type EstPorProdPresentacionItem = {
  id: string;
  /** Texto en MAYÚSCULAS a buscar en la descripción (p. ej. «440 CC»). */
  texto: string;
  unidadMedidaId: string;
  presentacionNumerica: number;
  conversionAUnidadId: string;
  conversionAUnidadPresentacion: number;
  unidadMedida: EstPorProdUnPresentacionItem;
  conversionAUnidad: EstPorProdUnPresentacionItem;
};

/** Etiqueta de la presentación medida (unidad + número). */
export function etiquetaPresentacionMedida(item: EstPorProdPresentacionItem): string {
  return formatearPresentacionConUnidad(item.presentacionNumerica, item.unidadMedida);
}

/** Etiqueta de la conversión a otra unidad. */
export function etiquetaPresentacionConversion(item: EstPorProdPresentacionItem): string {
  return formatearPresentacionConUnidad(
    item.conversionAUnidadPresentacion,
    item.conversionAUnidad
  );
}

/**
 * Busca el primer (texto más largo) match del catálogo en la descripción.
 * Compara en MAYÚSCULAS con límite de palabra (no letra/dígito alrededor).
 */
export function matchPresentacionEnDescripcion(
  descripcion: string | null | undefined,
  presentaciones: EstPorProdPresentacionItem[]
): EstPorProdPresentacionItem | null {
  const haystack = (descripcion ?? "").toLocaleUpperCase("es-AR").trim();
  if (!haystack || presentaciones.length === 0) return null;

  const ordenados = [...presentaciones].sort((a, b) => b.texto.length - a.texto.length);

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
