/**
 * Utilidades de búsqueda reutilizables (DRY).
 * filtroTexto: para Prisma where. matchByMultiTerm: para filtrado en cliente.
 */

/** Normaliza texto para búsqueda: minúsculas y sin acentos. */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Búsqueda por términos múltiples: el texto combinado debe contener TODOS los términos.
 * Insensible a mayúsculas y acentos. Reutilizable en lista-precios y otros filtros.
 */
export function matchByMultiTerm(
  textParts: (string | null | undefined)[],
  query: string
): boolean {
  const terms = query
    .trim()
    .split(/\s+/)
    .map((t) => normalizeForSearch(t))
    .filter(Boolean);
  if (terms.length === 0) return true;
  const combined = textParts.filter(Boolean).join(" ");
  const combinedNorm = normalizeForSearch(combined);
  return terms.every((term) => combinedNorm.includes(term));
}

/** Para Prisma: where con AND de términos sobre varios campos. */
export function filtroTexto(q: string, campos: string[]) {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};

  return {
    AND: tokens.map((token) => ({
      OR: campos.map((campo: string) => ({
        [campo]: { contains: token, mode: "insensitive" as const },
      })),
    })),
  };
}
