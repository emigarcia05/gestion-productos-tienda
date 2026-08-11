"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { productosPedidoAFabricaFiltrosSchema } from "@/lib/validations/pedidoAFabrica";
import { upsertPedidoAFabricaItemSchema } from "@/lib/validations/pedidosMutaciones";
import {
  listarProductosPorProveedorFabrica,
  listarSucursalesParaPedidoAFabrica,
  type ProductosPedidoAFabricaResult,
  type SucursalPedidoAFabrica,
} from "@/services/pedidoAFabrica.service";
import { upsertPedidoMercaderiaAFabricaItem } from "@/services/pedidosEnvio.service";

const VACIO: ProductosPedidoAFabricaResult = {
  sucursales: [],
  productos: [],
  total: 0,
  totalPaginas: 0,
  marcas: [],
  rubros: [],
  subRubros: [],
  cantAPedirByCodExt: {},
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
 * con **STOCK ACTUAL** y **PROM. VTA.** por sucursal `pedido = true`,
 * más cantidades **A FÁBRICA** persistidas en `prod_ped_merc`.
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

/**
 * Persiste **CANT. PEDIR** de Pedido A Fáb. en `prod_ped_merc` (`tipo_de_pedido = A FÁBRICA`).
 * Gate: pedidos o estadísticas productos.
 */
export async function upsertPedidoAFabricaItemAction(
  raw: unknown
): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (
    !puede(rol, PERMISOS.pedidos.acceso) &&
    !puede(rol, PERMISOS.estadisticasProductos.acceso)
  ) {
    return { ok: false, error: "Sin permisos para pedidos a fábrica." };
  }

  const parsed = upsertPedidoAFabricaItemSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg).flat().find(Boolean);
    return { ok: false, error: (first as string) ?? "Datos inválidos." };
  }

  const result = await upsertPedidoMercaderiaAFabricaItem({
    listaPrecioProveedorId: parsed.data.listaPrecioProveedorId,
    cant: parsed.data.cant,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: undefined };
}
