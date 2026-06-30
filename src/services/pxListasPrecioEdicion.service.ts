import { Prisma } from "@prisma/client";
import {
  calcMargenSinIvaPct,
  calcPxListaDesdeMargenSinIvaPct,
  roundPrecioListaTienda,
} from "@/lib/calculos";
import { roundMargenPxListaPct } from "@/lib/pxListasPreciosFormat";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types/service.types";

export type ClavePrecioListaEdicion = {
  codTienda: string;
  idLista: number;
};

/**
 * Guarda el PX calculado desde el margen en `prod_tienda_precios_edicion` (staging hasta Act. Px).
 * `margenManual: null` elimina la fila pendiente.
 */
export async function guardarPrecioListaEdicionDesdeMargen(
  codTienda: string,
  idLista: number,
  margenManual: number | null
): Promise<
  ServiceResult<{
    margenManual: number | null;
    pxEdicion: number | null;
    pxEfectivo: number | null;
  }>
> {
  const listaExiste = await prisma.prodTiendaListaPrecio.findUnique({
    where: { idLista },
    select: { idLista: true },
  });
  if (!listaExiste) {
    return { success: false, error: "Lista de precio no encontrada." };
  }

  const producto = await prisma.prodTienda.findUnique({
    where: { codTienda },
    select: { codTienda: true, costoCompra: true },
  });
  if (!producto) {
    return { success: false, error: "Producto tienda no encontrado." };
  }

  const costoCompra = Number(producto.costoCompra);

  if (margenManual === null) {
    await prisma.prodTiendaPrecioEdicion.deleteMany({
      where: { codTienda, idLista },
    });

    const dux = await prisma.prodTiendaPrecio.findUnique({
      where: { codTienda_idLista: { codTienda, idLista } },
      select: { precio: true },
    });
    const pxDux = dux ? Number(dux.precio) : null;

    return {
      success: true,
      data: { margenManual: null, pxEdicion: null, pxEfectivo: pxDux },
    };
  }

  const margenRedondeado = roundMargenPxListaPct(margenManual);
  const pxCalculado = calcPxListaDesdeMargenSinIvaPct(margenRedondeado, costoCompra);
  if (pxCalculado == null || !(pxCalculado > 0)) {
    return {
      success: false,
      error: "No se pudo calcular el precio desde el margen.",
    };
  }

  const precioPersistir = new Prisma.Decimal(
    roundPrecioListaTienda(pxCalculado)
  );

  await prisma.prodTiendaPrecioEdicion.upsert({
    where: { codTienda_idLista: { codTienda, idLista } },
    create: {
      codTienda,
      idLista,
      precio: precioPersistir,
    },
    update: {
      precio: precioPersistir,
    },
  });

  return {
    success: true,
    data: {
      margenManual: margenRedondeado,
      pxEdicion: pxCalculado,
      pxEfectivo: pxCalculado,
    },
  };
}

/** Elimina filas exportadas en Act. Px (cierra la actualización pendiente). */
export async function limpiarPreciosEdicionTrasActPx(
  claves: ClavePrecioListaEdicion[]
): Promise<void> {
  if (claves.length === 0) return;

  await prisma.prodTiendaPrecioEdicion.deleteMany({
    where: {
      OR: claves.map((c) => ({
        codTienda: c.codTienda,
        idLista: c.idLista,
      })),
    },
  });
}

/** Margen % para export DUX desde PX guardado en staging. */
export function margenExportDesdePrecioEdicion(
  pxEdicion: number,
  costoCompra: number
): number | null {
  if (!(costoCompra > 0) || !(pxEdicion > 0)) return null;
  const margen = calcMargenSinIvaPct(pxEdicion, costoCompra);
  return margen == null ? null : roundMargenPxListaPct(margen);
}
