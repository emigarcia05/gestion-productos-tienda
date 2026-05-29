import { Prisma } from "@prisma/client";
import { DET_PRECIO_MANUAL } from "@/lib/pxListas";
import { prisma } from "@/lib/prisma";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";
import { obtenerMapPxListaConfig } from "@/services/pxListasConfig.service";

const BATCH_SIZE = 150;

export type BackfillMarcacionPxListasResult = {
  totalProcesados: number;
  creados: number;
  actualizados: number;
  sinMarcacion: number;
};

/**
 * Backfill único: por cada `cod_tienda` en `prod_precios_tienda`, aplica la misma
 * configuración que la grilla Px Listas y persiste `prod_precios_tienda_marcacion`
 * (DET PRECIO, px manual si aplica, marcación).
 */
export async function backfillMarcacionPxListasTodos(options?: {
  dryRun?: boolean;
}): Promise<BackfillMarcacionPxListasResult> {
  const dryRun = options?.dryRun ?? false;
  let skip = 0;
  let totalProcesados = 0;
  let creados = 0;
  let actualizados = 0;
  let sinMarcacion = 0;

  const total = await prisma.listaPrecioTienda.count();

  while (skip < total) {
    const rows = await prisma.listaPrecioTienda.findMany({
      select: {
        codTienda: true,
        descripcionTienda: true,
        costoCompra: true,
      },
      orderBy: { codTienda: "asc" },
      skip,
      take: BATCH_SIZE,
    });
    if (rows.length === 0) break;

    const codTiendas = rows.map((r) => r.codTienda);
    const configMap = await obtenerMapPxListaConfig(codTiendas);
    const existentes = new Set(configMap.keys());

    const filas = rows.map((r) => ({
      codTienda: r.codTienda,
      descripcion: r.descripcionTienda ?? "",
      costoCompra: Number(r.costoCompra),
    }));

    const items = await buildPxListasItemsDesdeFilas(filas, configMap);

    for (const item of items) {
      totalProcesados += 1;
      const esManual = item.esDetPrecioManual;
      const competenciaId =
        !esManual && item.detPrecioSeleccion !== DET_PRECIO_MANUAL
          ? item.detPrecioSeleccion
          : null;
      const pxManual =
        esManual && item.pxLista != null && item.pxLista > 0 ? item.pxLista : null;
      const marcacion = item.marcacion;

      if (marcacion == null) sinMarcacion += 1;

      if (!dryRun) {
        const yaExistia = existentes.has(item.codItem);
        await prisma.prodPrecioTiendaMarcacion.upsert({
          where: { codTienda: item.codItem },
          create: {
            codTienda: item.codItem,
            detPrecioManual: esManual,
            competenciaId,
            pxListaManual: pxManual,
            marcacion:
              marcacion != null ? new Prisma.Decimal(marcacion) : null,
          },
          update: {
            detPrecioManual: esManual,
            competenciaId,
            pxListaManual: esManual ? pxManual : null,
            marcacion:
              marcacion != null ? new Prisma.Decimal(marcacion) : null,
          },
        });
        if (yaExistia) actualizados += 1;
        else creados += 1;
      }
    }

    skip += BATCH_SIZE;
  }

  return { totalProcesados, creados, actualizados, sinMarcacion };
}
