/**
 * DAL Producto – Vinculados desde lista_precios_proveedores.
 */
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";
import { prisma } from "@/lib/prisma";

/** Productos de lista_precios_proveedores vinculados al ítem tienda (idListaPrecioTienda). */
export async function getProductosVinculadosPorItemTienda(itemTiendaId: string): Promise<ServiceResult<ProductoCompleto[]>> {
  try {
    const rows = await prisma.listaPrecioProveedor.findMany({
      where: { idListaPrecioTienda: itemTiendaId },
      include: { proveedor: true },
      orderBy: { codExt: "asc" },
    });
    const data: ProductoCompleto[] = rows.map((r) => ({
      id: r.id,
      codProdProv: r.codProdProveedor,
      codigoExterno: r.codExt,
      descripcion: r.descripcionProveedor,
      precioLista: Number(r.pxListaProveedor),
      precioVentaSugerido: Number(r.pxVtaSugerido ?? 0),
      descuentoRubro: r.dtoRubro,
      descuentoCantidad: r.dtoCantidad,
      cxTransporte: r.cxTransporte,
      pxCompraFinal: r.pxCompraFinal != null ? Number(r.pxCompraFinal) : null,
      disponible: true,
      proveedorId: r.proveedor.id,
      proveedor: { id: r.proveedor.id, nombre: r.proveedor.nombre, prefijo: r.proveedor.prefijo },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return { success: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
