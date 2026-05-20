import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extraerPrecioCompetenciaDesdeWeb } from "@/services/competenciaPrecioScraping.service";

const BATCH_SIZE = 25;
const DELAY_MS = 400;

export interface SyncCompetenciaPreciosResult {
  procesados: number;
  encontrados: number;
  vacios: number;
  errores: number;
}

export interface SyncCompetenciaPreciosOptions {
  /** Obligatorio: solo se comparan precios de este competidor. */
  competenciaId: string;
  codTienda?: string;
  onProgress?: (processed: number, total: number) => void;
}

export async function syncCompetenciaPrecios(
  options: SyncCompetenciaPreciosOptions
): Promise<SyncCompetenciaPreciosResult> {
  const competidores = await prisma.prodCompetencia.findMany({
    where: { id: options.competenciaId },
    select: { id: true, nombre: true, web: true, urlBusqueda: true },
  });

  if (competidores.length === 0) {
    return { procesados: 0, encontrados: 0, vacios: 0, errores: 0 };
  }

  const productWhere = options.codTienda ? { codTienda: options.codTienda } : {};
  const totalProductos = await prisma.listaPrecioTienda.count({ where: productWhere });
  const totalPairs = totalProductos * competidores.length;

  let processed = 0;
  let encontrados = 0;
  let vacios = 0;
  let errores = 0;
  let skip = 0;

  while (true) {
    const productos = await prisma.listaPrecioTienda.findMany({
      where: productWhere,
      orderBy: { codTienda: "asc" },
      skip,
      take: BATCH_SIZE,
      select: {
        codTienda: true,
        codExt: true,
        descripcionTienda: true,
      },
    });
    if (productos.length === 0) break;

    for (const producto of productos) {
      for (const competidor of competidores) {
        try {
          const px = await extraerPrecioCompetenciaDesdeWeb(
            competidor.web,
            {
              codTienda: producto.codTienda,
              descripcionTienda: producto.descripcionTienda,
              codExt: producto.codExt,
            },
            competidor.urlBusqueda
          );

          await prisma.prodPrecioCompetencia.upsert({
            where: {
              codTienda_competenciaId: {
                codTienda: producto.codTienda,
                competenciaId: competidor.id,
              },
            },
            create: {
              codTienda: producto.codTienda,
              competenciaId: competidor.id,
              pxCompetencia: px != null ? new Prisma.Decimal(px) : null,
            },
            update: {
              pxCompetencia: px != null ? new Prisma.Decimal(px) : null,
            },
          });

          if (px != null) encontrados++;
          else vacios++;
        } catch {
          errores++;
          await prisma.prodPrecioCompetencia.upsert({
            where: {
              codTienda_competenciaId: {
                codTienda: producto.codTienda,
                competenciaId: competidor.id,
              },
            },
            create: {
              codTienda: producto.codTienda,
              competenciaId: competidor.id,
              pxCompetencia: null,
            },
            update: { pxCompetencia: null },
          });
        }

        processed++;
        options.onProgress?.(processed, totalPairs);
        await delay(DELAY_MS);
      }
    }

    skip += BATCH_SIZE;
  }

  await prisma.prodCompetencia.update({
    where: { id: options.competenciaId },
    data: { ultimaComparacionAt: new Date() },
  });

  return { procesados: processed, encontrados, vacios, errores };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
