import { prisma } from "@/lib/prisma";
import {
  calcMarcacionViejaDesdeDux,
  marcacionesPxListasDifieren,
  porcUtilidadDesdeMarcacionPxLista,
} from "@/services/pxListasMarcacion.service";

export interface FilaExportPx {
  codigo: string;
  porcUtilidad: number;
}

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Exporta ítems con fila en `prod_precios_tienda_marcacion` cuya marcación persistida
 * difiere de la marcación DUX (`px_lista_tienda` + `costo_compra`).
 */
export async function listarFilasExportPxDiff(): Promise<FilaExportPx[]> {
  const rows = await prisma.prodPrecioTiendaMarcacion.findMany({
    where: { marcacion: { not: null } },
    select: {
      codTienda: true,
      marcacion: true,
      listaPrecioTienda: {
        select: {
          pxListaTienda: true,
          costoCompra: true,
        },
      },
    },
    orderBy: { codTienda: "asc" },
  });

  const filas: FilaExportPx[] = [];
  for (const row of rows) {
    const costo = toNum(row.listaPrecioTienda.costoCompra);
    const pxDux = toNum(row.listaPrecioTienda.pxListaTienda);
    const marcacionNueva = row.marcacion != null ? Number(row.marcacion) : null;
    if (marcacionNueva == null || !(costo > 0) || !(pxDux > 0)) continue;

    const marcacionVieja = calcMarcacionViejaDesdeDux(pxDux, costo);
    if (!marcacionesPxListasDifieren(marcacionVieja, marcacionNueva)) continue;

    const porcUtilidad = porcUtilidadDesdeMarcacionPxLista(marcacionNueva, costo);
    if (porcUtilidad == null) continue;

    filas.push({
      codigo: row.codTienda,
      porcUtilidad: Math.round(porcUtilidad * 100) / 100,
    });
  }
  return filas;
}
