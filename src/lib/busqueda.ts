import type { PrismaClient, ProductoWhereInput } from "@prisma/client";

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

/**
 * Where para lista "Consulta Px" / "Pedido urgente": productos con precio sugerido
 * que coincidan por descripción de proveedor O por descripción de lista tienda
 * (vía codigoExterno = codExt).
 */
export async function whereProductoConsultaConTienda(
  prisma: PrismaClient,
  q: string
): Promise<ProductoWhereInput> {
  const base: ProductoWhereInput = { precioVentaSugerido: { gt: 0 } };
  if (!q || !q.trim()) return base;

  const matchProveedor = filtroTexto(q, ["descripcion"]) as ProductoWhereInput;

  const itemsTienda = await prisma.itemTienda.findMany({
    where: {
      codigoExterno: { not: null },
      habilitado: true,
      ...filtroTexto(q, ["descripcion"]),
    },
    select: { codigoExterno: true },
  });
  const codExtSet = new Set(
    itemsTienda.map((i) => i.codigoExterno).filter((c): c is string => c != null)
  );
  const codExtList = Array.from(codExtSet);

  if (codExtList.length === 0) return { ...base, ...matchProveedor };

  return {
    ...base,
    OR: [matchProveedor, { codExt: { in: codExtList } }],
  };
}
