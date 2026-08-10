"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { productosPedidoAFabricaFiltrosSchema } from "@/lib/validations/pedidoAFabrica";
import {
  listarProductosPorProveedorFabrica,
  type ProductosPedidoAFabricaResult,
} from "@/services/pedidoAFabrica.service";

const VACIO: ProductosPedidoAFabricaResult = {
  productos: [],
  total: 0,
  totalPaginas: 0,
};

/**
 * Productos de lista de precios del proveedor fábrica (`es_fabrica = true`).
 * Gate: `PERMISOS.estadisticasProductos.acceso`.
 */
export async function getProductosPedidoAFabricaAction(
  raw: unknown
): Promise<ProductosPedidoAFabricaResult> {
  const parsed = productosPedidoAFabricaFiltrosSchema.safeParse(raw);
  if (!parsed.success) return VACIO;

  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) return VACIO;

  return listarProductosPorProveedorFabrica(
    parsed.data.proveedorId,
    parsed.data.pagina
  );
}
