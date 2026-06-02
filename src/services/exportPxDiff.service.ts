import type { FilaExportPx } from "@/lib/exportPxDiffTypes";
import { roundMarcacionPxLista } from "@/lib/pxListas";
import { prisma } from "@/lib/prisma";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";
import { obtenerMapPxListaConfig } from "@/services/pxListasConfig.service";

export type { FilaExportPx } from "@/lib/exportPxDiffTypes";

const BATCH_SIZE = 150;

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Exporta ítems cuyo **PX LISTA efectivo** difiere de `px_lista_tienda` en DUX (pesos enteros).
 * La columna Excel **Importe** lleva la **marcación** de la grilla (5 decimales).
 */
export async function listarFilasExportPxDiff(): Promise<FilaExportPx[]> {
  const rows = await prisma.prodPrecioTiendaMarcacion.findMany({
    where: { marcacion: { not: null } },
    select: {
      codTienda: true,
      listaPrecioTienda: {
        select: {
          descripcionTienda: true,
          costoCompra: true,
          pxListaTienda: true,
        },
      },
    },
    orderBy: { codTienda: "asc" },
  });

  const filas: FilaExportPx[] = [];

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const chunk = rows.slice(offset, offset + BATCH_SIZE);
    const codTiendas = chunk.map((r) => r.codTienda);
    const configMap = await obtenerMapPxListaConfig(codTiendas);

    const baseFilas = chunk.map((r) => ({
      codTienda: r.codTienda,
      descripcion: r.listaPrecioTienda.descripcionTienda ?? "",
      costoCompra: toNum(r.listaPrecioTienda.costoCompra),
    }));

    const { items } = await buildPxListasItemsDesdeFilas(baseFilas, configMap);
    const itemPorCod = new Map(items.map((i) => [i.codItem, i]));

    for (const row of chunk) {
      const pxDux = Math.round(toNum(row.listaPrecioTienda.pxListaTienda));
      const item = itemPorCod.get(row.codTienda);
      if (!item) continue;
      const pxLista = item.pxLista;

      if (pxLista == null || !(pxLista > 0) || !(pxDux > 0)) continue;
      if (Math.round(pxLista) === pxDux) continue;

      const marcacion = item.marcacion;
      if (marcacion == null || !(marcacion > 0)) continue;

      filas.push({
        codigo: row.codTienda,
        marcacion: roundMarcacionPxLista(marcacion),
      });
    }
  }

  return filas;
}
