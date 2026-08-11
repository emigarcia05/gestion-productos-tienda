"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { productosPedidoAFabricaFiltrosSchema } from "@/lib/validations/pedidoAFabrica";
import {
  listarProductosPorProveedorFabrica,
  listarSucursalesParaPedidoAFabrica,
  type ProductosPedidoAFabricaResult,
  type SucursalPedidoAFabrica,
} from "@/services/pedidoAFabrica.service";

const VACIO: ProductosPedidoAFabricaResult = {
  sucursales: [],
  productos: [],
  total: 0,
  totalPaginas: 0,
  marcas: [],
  rubros: [],
  subRubros: [],
};

/**
 * Sucursales con `pedido = true` para columnas de Pedido A Fáb.
 */
export async function getSucursalesPedidoAFabricaAction(): Promise<
  SucursalPedidoAFabrica[]
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) return [];
  return listarSucursalesParaPedidoAFabrica();
}

/**
 * Productos de lista de precios del proveedor fábrica (`es_fabrica = true`),
 * con **STOCK ACTUAL** y **PROM. VTA.** por sucursal `pedido = true`.
 * Filtros opcionales: marca / rubro / subRubro (tienda) + q (descripción).
 * Gate: `PERMISOS.estadisticasProductos.acceso`.
 */
export async function getProductosPedidoAFabricaAction(
  raw: unknown
): Promise<ProductosPedidoAFabricaResult> {
  const parsed = productosPedidoAFabricaFiltrosSchema.safeParse(raw);
  if (!parsed.success) return VACIO;

  const rol = await getRol();
  if (!puede(rol, PERMISOS.estadisticasProductos.acceso)) return VACIO;

  const { proveedorId, pagina, marca, rubro, subRubro, q } = parsed.data;
  return listarProductosPorProveedorFabrica(proveedorId, {
    pagina,
    marca,
    rubro,
    subRubro,
    q,
  });
}
