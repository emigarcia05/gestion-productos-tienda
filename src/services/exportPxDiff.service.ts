import { prisma } from "@/lib/prisma";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";
import { obtenerMapPxListaConfig } from "@/services/pxListasConfig.service";

const BATCH_SIZE = 150;

export interface FilaExportPx {
  codigo: string;
  /** PX LISTA a importar en DUX (pesos enteros), según configuración actual del módulo. */
  importe: number;
}

function toNum(n: unknown): number {
  if (n == null) return 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Exporta solo ítems cuyo **PX LISTA efectivo** (grilla Px Listas) difiere del espejo DUX
 * `px_lista_tienda` en pesos enteros. Evita falsos positivos por comparar solo la
 * columna `marcacion` guardada (decimales) cuando el importe en DUX ya coincide.
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
      const pxLista = item?.pxLista;

      if (pxLista == null || !(pxLista > 0) || !(pxDux > 0)) continue;

      const importe = Math.round(pxLista);
      if (importe === pxDux) continue;

      filas.push({
        codigo: row.codTienda,
        importe,
      });
    }
  }

  return filas;
}
