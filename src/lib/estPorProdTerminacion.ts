import { escaparRegexLiteral } from "@/lib/estPorProdColores";

/** Ítem del catálogo `est_por_prod_terminacion`. */
export type EstPorProdTerminacionItem = {
  id: string;
  /** Terminación en MAYÚSCULAS (p. ej. MATE, SATINADO). */
  terminacion: string;
};

/**
 * Detecta qué terminaciones del catálogo aparecen en la descripción.
 * Compara en MAYÚSCULAS con límite de palabra; prioriza textos más largos.
 */
export function matchTerminacionesEnDescripcion(
  descripcion: string | null | undefined,
  terminaciones: EstPorProdTerminacionItem[]
): EstPorProdTerminacionItem[] {
  const haystack = (descripcion ?? "").toLocaleUpperCase("es-AR").trim();
  if (!haystack || terminaciones.length === 0) return [];

  const ordenados = [...terminaciones].sort(
    (a, b) => b.terminacion.length - a.terminacion.length
  );
  const matched: EstPorProdTerminacionItem[] = [];
  let restante = haystack;

  for (const item of ordenados) {
    const nombre = item.terminacion.trim();
    if (!nombre) continue;
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escaparRegexLiteral(nombre)}(?![\\p{L}\\p{N}])`,
      "iu"
    );
    if (!pattern.test(restante)) continue;
    matched.push({ id: item.id, terminacion: item.terminacion });
    restante = restante.replace(pattern, (m) => " ".repeat(m.length));
  }

  return matched;
}
