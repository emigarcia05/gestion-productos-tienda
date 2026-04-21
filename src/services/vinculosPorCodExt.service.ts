/**
 * Vinculación automática por cod_ext entre prod_precios_tienda y prod_precios_provee.
 * Actualiza id_lista_precios_tienda en prod_precios_provee donde cod_ext coincide con un ítem de prod_precios_tienda.
 */

import { prisma } from "@/lib/prisma";

/**
 * Vincula todos los ítems de prod_precios_provee con prod_precios_tienda por cod_ext.
 * Para cada fila en prod_precios_tienda, actualiza las filas de prod_precios_provee con el mismo cod_ext.
 * Idempotente: ejecutar varias veces no cambia el resultado.
 * @returns Número de filas de prod_precios_provee actualizadas.
 */
export async function vincularProveedoresPorCodExt(): Promise<number> {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE prod_precios_provee pp
    SET id_lista_precios_tienda = pt.id
    FROM prod_precios_tienda pt
    WHERE pt.cod_ext = pp.cod_ext
  `);
  return Number(result);
}
