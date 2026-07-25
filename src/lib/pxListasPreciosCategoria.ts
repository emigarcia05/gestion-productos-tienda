import {
  resolverCategoriaMcPorPct,
  type FinAnaMcCategoriaItem,
} from "@/lib/finAnaMcCategorias";
import type { ListaPrecioPxListasColumna } from "@/lib/pxListasPrecios";

/** Nombre canónico de la lista DUX usada para CATEGORÍA MARGEN. */
export const NOMBRE_LISTA_GENERAL_PX_LISTAS = "1 - GENERAL";

function normalizarNombreLista(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

/**
 * Resuelve el `idLista` de **1 - GENERAL** (match exacto normalizado;
 * fallback: nombre que contiene `GENERAL`).
 */
export function encontrarIdListaGeneralPxListas(
  listas: ListaPrecioPxListasColumna[]
): number | null {
  const exact = listas.find(
    (l) => normalizarNombreLista(l.nombreLista) === NOMBRE_LISTA_GENERAL_PX_LISTAS
  );
  if (exact) return exact.idLista;

  const fuzzy = listas.find((l) =>
    /\bGENERAL\b/i.test(normalizarNombreLista(l.nombreLista))
  );
  return fuzzy?.idLista ?? null;
}

/**
 * CATEGORÍA MARGEN según rangos `fin_ana_mc_cat` aplicados al **PORC. UTILIDAD**
 * de la lista GENERAL (escala 0…100; valores fuera se recortan).
 */
export function resolverCategoriaMargenPxListas(
  porcUtilidad: number | null | undefined,
  categorias: FinAnaMcCategoriaItem[]
): string {
  if (porcUtilidad == null || !Number.isFinite(porcUtilidad) || categorias.length === 0) {
    return "";
  }
  const pct = Math.min(100, Math.max(0, porcUtilidad));
  return resolverCategoriaMcPorPct(pct, categorias)?.categoria ?? "";
}
