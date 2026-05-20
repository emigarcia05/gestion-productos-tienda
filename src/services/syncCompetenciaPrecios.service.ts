import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shouldAbortCompetenciaSyncInDb } from "@/lib/competenciaPreciosProgressDb";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import { extraerPrecioDesdeUrlProducto } from "@/services/competenciaPrecioScraping.service";

const DELAY_MS = 300;

export class SyncCompetenciaPreciosCancelledError extends Error {
  constructor() {
    super("Comparación de competencia cancelada.");
    this.name = "SyncCompetenciaPreciosCancelledError";
  }
}

export interface SyncCompetenciaPreciosResult {
  procesados: number;
  encontrados: number;
  vacios: number;
  errores: number;
}

export interface SyncCompetenciaPreciosOptions {
  competenciaId: string;
  codTienda?: string;
  limiteProductos?: number;
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Releva precios: una consulta HTTP por cada fila de `prod_precios_competencia`
 * del competidor elegido que tenga `url_producto` (no recorre el catálogo tienda).
 */
export async function syncCompetenciaPrecios(
  options: SyncCompetenciaPreciosOptions
): Promise<SyncCompetenciaPreciosResult> {
  const whereVinculo = {
    competenciaId: options.competenciaId,
    urlProducto: { not: null },
    ...(options.codTienda ? { codTienda: options.codTienda } : {}),
  };

  const totalEnBd = await prisma.prodPrecioCompetencia.count({ where: whereVinculo });
  const limite = options.limiteProductos;
  const totalObjetivo =
    limite != null && limite > 0 ? Math.min(totalEnBd, limite) : totalEnBd;

  let processed = 0;
  let encontrados = 0;
  let vacios = 0;
  let errores = 0;
  let skip = 0;

  while (processed < totalObjetivo) {
    if (await shouldAbortCompetenciaSyncInDb()) {
      throw new SyncCompetenciaPreciosCancelledError();
    }

    const take = Math.min(50, totalObjetivo - processed);
    const vinculos = await prisma.prodPrecioCompetencia.findMany({
      where: whereVinculo,
      orderBy: { codTienda: "asc" },
      skip,
      take,
      select: {
        codTienda: true,
        competenciaId: true,
        urlProducto: true,
      },
    });
    if (vinculos.length === 0) break;

    for (const v of vinculos) {
      const url = v.urlProducto?.trim();
      if (!url) continue;

      const now = new Date();
      try {
        const resultado = await extraerPrecioDesdeUrlProducto(url);

        if (!resultado.ok) {
          errores++;
          await prisma.prodPrecioCompetencia.update({
            where: {
              codTienda_competenciaId: {
                codTienda: v.codTienda,
                competenciaId: v.competenciaId,
              },
            },
            data: {
              pxCompetencia: null,
              estado: ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR,
              errorMensaje: resultado.error.slice(0, 500),
              relevadoAt: now,
            },
          });
        } else if (resultado.precio != null) {
          encontrados++;
          await prisma.prodPrecioCompetencia.update({
            where: {
              codTienda_competenciaId: {
                codTienda: v.codTienda,
                competenciaId: v.competenciaId,
              },
            },
            data: {
              pxCompetencia: new Prisma.Decimal(resultado.precio),
              estado: ESTADO_RELEVAMIENTO_COMPETENCIA.OK,
              errorMensaje: null,
              relevadoAt: now,
            },
          });
        } else {
          vacios++;
          await prisma.prodPrecioCompetencia.update({
            where: {
              codTienda_competenciaId: {
                codTienda: v.codTienda,
                competenciaId: v.competenciaId,
              },
            },
            data: {
              pxCompetencia: null,
              estado: ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_PRECIO,
              errorMensaje: null,
              relevadoAt: now,
            },
          });
        }
      } catch (e) {
        errores++;
        const msg = e instanceof Error ? e.message : "Error desconocido.";
        await prisma.prodPrecioCompetencia.update({
          where: {
            codTienda_competenciaId: {
              codTienda: v.codTienda,
              competenciaId: v.competenciaId,
            },
          },
          data: {
            pxCompetencia: null,
            estado: ESTADO_RELEVAMIENTO_COMPETENCIA.ERROR,
            errorMensaje: msg.slice(0, 500),
            relevadoAt: now,
          },
        });
      }

      processed++;
      options.onProgress?.(processed, totalObjetivo);
      await delay(DELAY_MS);

      if (await shouldAbortCompetenciaSyncInDb()) {
        throw new SyncCompetenciaPreciosCancelledError();
      }
    }

    skip += take;
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
