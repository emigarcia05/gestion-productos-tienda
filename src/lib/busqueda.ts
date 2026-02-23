/**
 * Convierte una query de texto en un filtro Prisma AND por tokens.
 * "lox mate" → AND [ contains "lox", contains "mate" ]
 * Así "LOXON INT MATE LARGA DURACIÓN" aparece al buscar "lox mate".
 */
export function filtroTexto(q: string, campos: string[]) {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};

  return {
    AND: tokens.map((token) => ({
      OR: campos.map((campo) => ({
        [campo]: { contains: token, mode: "insensitive" as const },
      })),
    })),
  };
}
