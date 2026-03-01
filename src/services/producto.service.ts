/**
 * DAL Producto – Vinculados desde lista_precios_proveedores; búsqueda mock para compatibilidad.
 */
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";
import { prisma } from "@/lib/prisma";

const MOCK_PROVEEDOR = { id: "mock-prov-1", nombre: "Proveedor Demo", prefijo: "DEM" };

function mockProducto(overrides?: Partial<ProductoCompleto>): ProductoCompleto {
  return {
    id: "mock-prod-1",
    codigoExterno: "DEM-001",
    codProdProv: "001",
    descripcion: "Producto de ejemplo",
    precioLista: 100,
    precioVentaSugerido: 120,
    descuentoProducto: 0,
    descuentoCantidad: 0,
    cxTransporte: 0,
    disponible: true,
    proveedorId: MOCK_PROVEEDOR.id,
    proveedor: MOCK_PROVEEDOR,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export const BASE_QUERY_INCLUDE_PRODUCTO = {} as const;
export const BASE_ORDER_PRODUCTO = { codigoExterno: "asc" as const };

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
      descuentoProducto: r.dtoProducto,
      descuentoCantidad: r.dtoCantidad,
      cxTransporte: r.cxAproxTransporte,
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

export async function buscarProductos(q: string, _excluirItemTiendaId: string, _proveedorId?: string): Promise<ServiceResult<ProductoCompleto[]>> {
  if (!q || q.trim().length < 2) return { success: true, data: [] };
  return { success: true, data: [mockProducto({ descripcion: `Resultado mock: ${q}` })] };
}
