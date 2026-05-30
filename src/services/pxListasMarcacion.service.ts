import { Prisma } from "@prisma/client";
import { calcMargenSinIvaPct } from "@/lib/calculos";
import {
  calcMarcacionPxLista,
  roundMarcacionPxLista,
} from "@/lib/pxListas";
import { prisma } from "@/lib/prisma";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";
import { obtenerMapPxListaConfig } from "@/services/pxListasConfig.service";

/** Marcación “vieja” (espejo DUX): `(px_lista_tienda / 1,21) / costo_compra`. */
export function calcMarcacionViejaDesdeDux(
  pxListaTienda: number,
  costoCompra: number
): number | null {
  return calcMarcacionPxLista(pxListaTienda, costoCompra);
}

export function marcacionesPxListasDifieren(
  marcacionVieja: number | null,
  marcacionNueva: number | null
): boolean {
  if (marcacionVieja == null && marcacionNueva == null) return false;
  if (marcacionVieja == null || marcacionNueva == null) return true;
  return roundMarcacionPxLista(marcacionVieja) !== roundMarcacionPxLista(marcacionNueva);
}

/** Recalcula la marcación de la grilla y la persiste en `prod_precios_tienda_marcacion`. */
export async function persistirMarcacionPxLista(codTienda: string): Promise<void> {
  const tienda = await prisma.listaPrecioTienda.findUnique({
    where: { codTienda },
    select: {
      codTienda: true,
      descripcionTienda: true,
      costoCompra: true,
    },
  });
  if (!tienda) return;

  const configMap = await obtenerMapPxListaConfig([codTienda]);
  if (!configMap.has(codTienda)) return;

  const { items } = await buildPxListasItemsDesdeFilas(
    [
      {
        codTienda: tienda.codTienda,
        descripcion: tienda.descripcionTienda ?? "",
        costoCompra: Number(tienda.costoCompra),
      },
    ],
    configMap
  );

  const marcacion = items[0]?.marcacion ?? null;
  await prisma.prodPrecioTiendaMarcacion.update({
    where: { codTienda },
    data: {
      marcacion:
        marcacion != null ? new Prisma.Decimal(marcacion) : null,
    },
  });
}

/** % utilidad sin IVA para export DUX a partir de la marcación persistida. */
export function porcUtilidadDesdeMarcacionPxLista(
  marcacion: number,
  costoCompra: number
): number | null {
  if (!(marcacion > 0) || !(costoCompra > 0)) return null;
  const pxLista = marcacion * costoCompra * 1.21;
  return calcMargenSinIvaPct(pxLista, costoCompra);
}
