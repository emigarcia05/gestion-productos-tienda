/**
 * Pedido A Fábrica — productos de lista de precios del proveedor fábrica seleccionado.
 */

import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";

export type ProductoPedidoAFabricaItem = {
  codExt: string;
  descripcion: string;
};

export type ProductosPedidoAFabricaResult = {
  productos: ProductoPedidoAFabricaItem[];
  total: number;
  totalPaginas: number;
};

const VACIO: ProductosPedidoAFabricaResult = {
  productos: [],
  total: 0,
  totalPaginas: 0,
};

/**
 * Lista productos de `prod_precios_provee` del proveedor, solo si `es_fabrica = true`.
 * Descripción = `descripcion_proveedor`. Solo filas `habilitado = true`.
 * Orden alfabético por descripción (`es`, sensitivity base).
 */
export async function listarProductosPorProveedorFabrica(
  proveedorId: string,
  pagina: number = 1
): Promise<ProductosPedidoAFabricaResult> {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: proveedorId, esFabrica: true },
    select: { id: true },
  });
  if (!proveedor) return VACIO;

  const where = {
    idProveedor: proveedorId,
    habilitado: true,
  } as const;

  const [total, filas] = await Promise.all([
    prisma.listaPrecioProveedor.count({ where }),
    prisma.listaPrecioProveedor.findMany({
      where,
      select: {
        codExt: true,
        descripcionProveedor: true,
      },
      orderBy: { descripcionProveedor: "asc" },
      skip: skipForPagina(pagina),
      take: PAGE_SIZE,
    }),
  ]);

  return {
    productos: filas.map((f) => ({
      codExt: f.codExt,
      descripcion: f.descripcionProveedor,
    })),
    total,
    totalPaginas: totalPaginasFromTotal(total),
  };
}
