/**
 * Utilidades de búsqueda. En modo reset solo filtroTexto (sin Prisma).
 * whereProductoConsultaConTienda se reimplementará al reactivar la BD.
 */
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
