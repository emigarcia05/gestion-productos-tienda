/**
 * DAL Producto – MODO MOCK: sin Prisma; datos de prueba para UI navegable.
 */
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";

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

export async function getProductosVinculadosPorItemTienda(_itemTiendaId: string): Promise<ServiceResult<ProductoCompleto[]>> {
  return { success: true, data: [] };
}

export async function buscarProductos(q: string, _excluirItemTiendaId: string, _proveedorId?: string): Promise<ServiceResult<ProductoCompleto[]>> {
  if (!q || q.trim().length < 2) return { success: true, data: [] };
  return { success: true, data: [mockProducto({ descripcion: `Resultado mock: ${q}` })] };
}
