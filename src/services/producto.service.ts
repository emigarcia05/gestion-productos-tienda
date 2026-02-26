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
export const BASE_ORDER_PRODUCTO = { codExt: "asc" as const };

// ─── Query Maestra: productos vinculados a un ItemTienda ───────────────────

/**
 * Devuelve los productos de Lista Proveedores vinculados a un ítem de TiendaColor.
 * Incluye siempre proveedor (nombre, sufijo) para la UI.
 */
export async function getProductosVinculadosPorItemTienda(
  itemTiendaId: string
): Promise<ServiceResult<ProductoCompleto[]>> {
  try {
    const vinculos = await prisma.itemTiendaProducto.findMany({
      where: { itemTiendaId },
      include: {
        producto: {
          include: BASE_QUERY_INCLUDE_PRODUCTO,
        },
      },
      orderBy: { producto: BASE_ORDER_PRODUCTO },
    });

    const productos = vinculos
      .map((v) => v.producto)
      .filter((p): p is typeof p & { proveedor: NonNullable<typeof p.proveedor> } => p.proveedor != null);

    return { success: true, data: productos as ProductoCompleto[] };
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
 * Busca productos por texto (descripción, codExt, codProdProv), opcionalmente por proveedor.
 * Excluye los ya vinculados a un ItemTienda. Límite 20.
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
    const yaVinculados = await prisma.itemTiendaProducto.findMany({
      where: { itemTiendaId: excluirItemTiendaId },
      select: { productoId: true },
    });
    const idsExcluidos = yaVinculados.map((v) => v.productoId);

    const productos = await prisma.producto.findMany({
      where: {
        id: { notIn: idsExcluidos },
        ...(proveedorId ? { proveedorId } : {}),
        ...filtroTexto(q, ["descripcion", "codExt", "codProdProv"]),
      },
      include: BASE_QUERY_INCLUDE_PRODUCTO,
      take: 20,
      orderBy: BASE_ORDER_PRODUCTO,
    });

    const withProveedor = productos.filter(
      (p): p is typeof p & { proveedor: NonNullable<typeof p.proveedor> } => p.proveedor != null
    );

    return { success: true, data: withProveedor as ProductoCompleto[] };
  } catch (e) {
    console.error("[producto.service] buscarProductos", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al buscar productos.",
    };
  }
}
