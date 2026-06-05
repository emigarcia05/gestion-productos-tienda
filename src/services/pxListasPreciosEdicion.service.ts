import { Prisma } from "@prisma/client";
import { calcMargenSinIvaPct } from "@/lib/calculos";
import { roundPxListaEntero } from "@/lib/pxListasPreciosFormat";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types/service.types";

export async function guardarPrecioListaEdicion(
  codTienda: string,
  idLista: number,
  precio: number | null
): Promise<ServiceResult<{ precio: number | null; margenPct: number | null }>> {
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

  if (precio === null) {
    await prisma.prodTiendaPrecioEdicion.deleteMany({
      where: { codTienda, idLista },
    });
    const dux = await prisma.prodTiendaPrecio.findUnique({
      where: { codTienda_idLista: { codTienda, idLista } },
      select: { precio: true },
    });
    const pxDux = dux ? Number(dux.precio) : null;
    const margenPct =
      pxDux != null && pxDux > 0 ? calcMargenSinIvaPct(pxDux, costoCompra) : null;
    return { success: true, data: { precio: null, margenPct } };
  }

  const redondeado = roundPxListaEntero(precio);
  await prisma.prodTiendaPrecioEdicion.upsert({
    where: { codTienda_idLista: { codTienda, idLista } },
    create: {
      codTienda,
      idLista,
      precio: new Prisma.Decimal(redondeado),
    },
    update: {
      precio: new Prisma.Decimal(redondeado),
    },
  });

  const margenPct = calcMargenSinIvaPct(redondeado, costoCompra);
  return { success: true, data: { precio: redondeado, margenPct } };
}
