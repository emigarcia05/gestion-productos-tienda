/**
 * Servicio lista_precios_proveedores – Capa de datos (Neon / Prisma).
 * Upsert por código externo (cod_ext = [SUFIJO]-[codProdProv]).
 * getListaPreciosConTienda: una sola entrada para la página lista-precios (DRY).
 */

import type { FilaListaPrecio } from "@/lib/parsearImport";
import { prisma } from "@/lib/prisma";
import { buildCodExt } from "@/lib/codigos";

/** Fila para el cliente (lista-precios): proveedor + descripción tienda si existe. */
export interface FilaListaPrecioParaCliente {
  id: string;
  codExt: string;
  descripcionProveedor: string;
  descripcionTienda: string | null;
  pxListaProveedor: number;
  dtoProducto: number;
  dtoCantidad: number;
  cxAproxTransporte: number;
  pxCompraFinal: number | null;
  proveedor: { id: string; prefijo: string } | null;
}

/**
 * Obtiene lista de precios proveedor unida con descripciones de lista_precios_tienda.
 * Una sola función para la página lista-precios: evita repetir la lógica de join.
 */
export async function getListaPreciosConTienda(): Promise<FilaListaPrecioParaCliente[]> {
  const [filas, tiendaRows] = await Promise.all([
    prisma.listaPrecioProveedor.findMany({
      include: { proveedor: true },
      orderBy: { codExt: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { codExt: true, descripcionTienda: true },
    }),
  ]);

  const descripcionPorCodExt = new Map(
    tiendaRows
      .filter((t) => t.descripcionTienda != null && t.descripcionTienda !== "")
      .map((t) => [t.codExt, t.descripcionTienda as string])
  );

  return filas.map((f) => ({
    id: f.id,
    codExt: f.codExt,
    descripcionProveedor: f.descripcionProveedor,
    descripcionTienda: descripcionPorCodExt.get(f.codExt) ?? null,
    pxListaProveedor: Number(f.pxListaProveedor),
    dtoProducto: f.dtoProducto,
    dtoCantidad: f.dtoCantidad,
    cxAproxTransporte: f.cxAproxTransporte,
    pxCompraFinal: f.pxCompraFinal != null ? Number(f.pxCompraFinal) : null,
    proveedor: f.proveedor
      ? { id: f.proveedor.id, prefijo: f.proveedor.prefijo }
      : null,
  }));
}

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
  prefijo: string,
  filas: FilaListaPrecio[]
): Promise<UpsertListaPreciosResult> {
  let creados = 0;
  let actualizados = 0;
  const errores: string[] = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const codExt = buildCodExt(prefijo, fila.codProdProv);

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
