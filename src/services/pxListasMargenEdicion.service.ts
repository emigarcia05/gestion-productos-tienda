import { Prisma } from "@prisma/client";
import { calcPxListaDesdeMargenSinIvaPct } from "@/lib/calculos";
import { roundMargenPxListaPct } from "@/lib/pxListasPreciosFormat";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types/service.types";

export async function guardarMargenListaEdicion(
  codTienda: string,
  idLista: number,
  margenManual: number | null
): Promise<
  ServiceResult<{
    margenManual: number | null;
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
    await prisma.prodTiendaMargenEdicion.deleteMany({
      where: { codTienda, idLista },
    });

    const dux = await prisma.prodTiendaPrecio.findUnique({
      where: { codTienda_idLista: { codTienda, idLista } },
      select: { precio: true },
    });
    const pxDux = dux ? Number(dux.precio) : null;

    return {
      success: true,
      data: { margenManual: null, pxEfectivo: pxDux },
    };
  }

  const redondeado = roundMargenPxListaPct(margenManual);
  await prisma.prodTiendaMargenEdicion.upsert({
    where: { codTienda_idLista: { codTienda, idLista } },
    create: {
      codTienda,
      idLista,
      margenManual: new Prisma.Decimal(redondeado),
    },
    update: {
      margenManual: new Prisma.Decimal(redondeado),
    },
  });

  const pxEfectivo =
    costoCompra > 0
      ? calcPxListaDesdeMargenSinIvaPct(redondeado, costoCompra)
      : null;

  return {
    success: true,
    data: { margenManual: redondeado, pxEfectivo },
  };
}
