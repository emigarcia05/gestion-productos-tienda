/**
 * Servicio lista_precios_proveedores – Capa de datos (Neon / Prisma).
 * Upsert por código externo (cod_ext = [SUFIJO]-[codProdProv]).
 */

import type { FilaListaPrecio } from "@/lib/parsearImport";
import { prisma } from "@/lib/prisma";
import { buildCodExt } from "@/lib/codigos";

export interface UpsertListaPreciosResult {
  creados: number;
  actualizados: number;
  errores: string[];
}

/**
 * Upsert de filas en lista_precios_proveedores.
 * Clave lógica: cod_ext (único) = [SUFIJO]-[codProdProv].
 * Si existe, actualiza; si no, crea con descuentos y cx_transporte en 0 (defaults BD).
 */
export async function upsertListaPrecios(
  proveedorId: string,
  sufijo: string,
  filas: FilaListaPrecio[]
): Promise<UpsertListaPreciosResult> {
  let creados = 0;
  let actualizados = 0;
  const errores: string[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const codExt = buildCodExt(sufijo, fila.codProdProv);

    try {
      const existente = await prisma.listaPrecioProveedor.findUnique({
        where: { codExt },
        select: { id: true },
      });

      await prisma.listaPrecioProveedor.upsert({
        where: { codExt },
        create: {
          idProveedor: proveedorId,
          codProdProveedor: fila.codProdProv,
          descripcionProveedor: fila.descripcion,
          codExt,
          pxListaProveedor: fila.precioLista,
          pxVtaSugerido: fila.precioVentaSugerido || null,
          // dto_producto, dto_cantidad, cx_aprox_transporte usan defaults (0)
        },
        update: {
          idProveedor: proveedorId,
          codProdProveedor: fila.codProdProv,
          descripcionProveedor: fila.descripcion,
          pxListaProveedor: fila.precioLista,
          pxVtaSugerido: fila.precioVentaSugerido || null,
        },
      });

      if (existente) actualizados++;
      else creados++;
    } catch (e) {
      errores.push(`Fila ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { creados, actualizados, errores };
}
