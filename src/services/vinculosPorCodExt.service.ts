/**
 * Vinculación automática por cod_ext entre precios_tienda y precios_proveedores.
 * Actualiza id_lista_precios_tienda en precios_proveedores donde cod_ext coincide con un ítem de precios_tienda.
 */

import { prisma } from "@/lib/prisma";

/**
 * Vincula todos los ítems de precios_proveedores con precios_tienda por cod_ext.
 * Para cada fila en precios_tienda, actualiza las filas de precios_proveedores con el mismo cod_ext.
 * Idempotente: ejecutar varias veces no cambia el resultado.
 * @returns Número de filas de precios_proveedores actualizadas.
 */
export async function vincularProveedoresPorCodExt(): Promise<number> {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE precios_proveedores pp
    SET id_lista_precios_tienda = pt.id
    FROM precios_tienda pt
    WHERE pt.cod_ext = pp.cod_ext
  `);
  return Number(result);
}
