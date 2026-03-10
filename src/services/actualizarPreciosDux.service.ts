/**
 * Servicio para armar los payloads de actualización de costos en DUX
 * desde precios_tienda + precios_proveedores (lista proveedores = fuente actualizada).
 *
 * - cod_item → precios_tienda.cod_tienda
 * - costo → precios_proveedores.px_compra_final
 * - id_proveedor → proveedores.id_proveedor_dux
 */

import { prisma } from "@/lib/prisma";

export interface PayloadActualizarCostoDux {
  codItem: string;
  costo: number;
  idProveedorDux: string;
}

/**
 * Para cada ítem de precios_tienda (por id), obtiene los precios_proveedores
 * vinculados cuyo proveedor tiene id_proveedor_dux y px_compra_final no nulo.
 * Devuelve un payload por cada (ítem tienda, proveedor) para enviar a DUX.
 */
export async function getPayloadsActualizarCostosDux(
  idsPreciosTienda: string[]
): Promise<PayloadActualizarCostoDux[]> {
  if (idsPreciosTienda.length === 0) return [];

  const tiendas = await prisma.listaPrecioTienda.findMany({
    where: { id: { in: idsPreciosTienda } },
    select: {
      id: true,
      codTienda: true,
      listaPreciosProveedores: {
        where: {
          idListaPrecioTienda: { not: null },
          pxCompraFinal: { not: null },
          proveedor: { idProveedorDux: { not: null } },
        },
        select: {
          pxCompraFinal: true,
          proveedor: { select: { idProveedorDux: true } },
        },
      },
    },
  });

  const payloads: PayloadActualizarCostoDux[] = [];

  for (const t of tiendas) {
    const codItem = t.codTienda;
    for (const pp of t.listaPreciosProveedores) {
      const idProveedorDux = pp.proveedor?.idProveedorDux;
      if (!idProveedorDux) continue;
      const costo = Number(pp.pxCompraFinal);
      if (!Number.isFinite(costo)) continue;
      payloads.push({ codItem, costo, idProveedorDux });
    }
  }

  return payloads;
}
