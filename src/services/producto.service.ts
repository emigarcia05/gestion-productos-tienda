/**
 * Capa de acceso a datos (DAL) para Producto y relación Lista Proveedores ↔ Lista TiendaColor.
 * Single Source of Truth: todas las búsquedas extienden BASE_QUERY_INCLUDE_* para consistencia.
 */

import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";

// ─── Single Source of Truth: includes para Producto ─────────────────────────
/** Usar en todas las queries de Producto que deban devolver proveedor (listados, búsqueda, vínculos). */
export const BASE_QUERY_INCLUDE_PRODUCTO = {
  proveedor: {
    select: {
      id: true,
      nombre: true,
      sufijo: true,
    },
  },
} as const;

/** Orden por defecto para productos en listados. */
export const BASE_ORDER_PRODUCTO = { codigoExterno: "asc" as const };

// ─── Query Maestra: producto vinculado a un ItemTienda (relación 1:1 por productoProveedorId) ───────────────────

/**
 * Devuelve el producto de Lista Proveedores vinculado a un ítem de TiendaColor (vía productoProveedorId).
 * Incluye siempre proveedor. Retorna array de 0 o 1 elemento para compatibilidad con la UI.
 */
export async function getProductosVinculadosPorItemTienda(
  itemTiendaId: string
): Promise<ServiceResult<ProductoCompleto[]>> {
  try {
    const item = await prisma.itemTienda.findUnique({
      where: { id: itemTiendaId },
      include: {
        productoProveedor: {
          include: BASE_QUERY_INCLUDE_PRODUCTO,
        },
      },
    });

    const producto = item?.productoProveedor;
    if (!producto?.proveedor) {
      return { success: true, data: [] };
    }
    return { success: true, data: [producto] };
  } catch (e) {
    console.error("[producto.service] getProductosVinculadosPorItemTienda", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al obtener vínculos.",
    };
  }
}

// ─── Búsqueda de productos (para selector de vínculo) ──────────────────────

/**
 * Busca productos por texto (descripción, codigoExterno, codProdProv), opcionalmente por proveedor.
 * Excluye el producto ya vinculado al ItemTienda (si tiene productoProveedorId). Límite 20.
 */
export async function buscarProductos(
  q: string,
  excluirItemTiendaId: string,
  proveedorId?: string
): Promise<ServiceResult<ProductoCompleto[]>> {
  if (!q || q.trim().length < 2) {
    return { success: true, data: [] };
  }

  try {
    const item = await prisma.itemTienda.findUnique({
      where: { id: excluirItemTiendaId },
      select: { productoProveedorId: true },
    });
    const idExcluido = item?.productoProveedorId ? [item.productoProveedorId] : [];

    const productos = await prisma.productoProveedor.findMany({
      where: {
        ...(idExcluido.length ? { id: { notIn: idExcluido } } : {}),
        ...(proveedorId ? { proveedorId } : {}),
        ...filtroTexto(q, ["descripcion", "codigoExterno", "codProdProv"]),
      },
      include: BASE_QUERY_INCLUDE_PRODUCTO,
      take: 20,
      orderBy: BASE_ORDER_PRODUCTO,
    });

    const withProveedor = productos.filter(
      (p): p is typeof p & { proveedor: NonNullable<typeof p.proveedor> } => p.proveedor != null
    );

    return { success: true, data: withProveedor };
  } catch (e) {
    console.error("[producto.service] buscarProductos", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al buscar productos.",
    };
  }
}
