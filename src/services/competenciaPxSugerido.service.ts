import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

/**
 * Precio de venta sugerido en lista proveedor para un ítem tienda vinculado al competidor configurado.
 * Devuelve entero en pesos (misma convención que el scraping).
 */
export async function obtenerPxVtaSugeridoParaCompetencia(
  codTienda: string,
  idProveedor: string
): Promise<number | null> {
  const row = await prisma.listaPrecioProveedor.findFirst({
    where: {
      codTiendaVinculo: codTienda,
      idProveedor,
      habilitado: true,
      pxVtaSugerido: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { pxVtaSugerido: true },
  });
  if (row?.pxVtaSugerido == null) return null;
  const n = Number(row.pxVtaSugerido);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/** Filas relevables: URL cargada o px_vta_sugerido del proveedor asociado al competidor. */
export function whereVinculosRelevablesCompetencia(params: {
  competenciaId: string;
  idProveedor?: string | null;
  codTienda?: string;
}): Prisma.ProdPrecioCompetenciaWhereInput {
  const base: Prisma.ProdPrecioCompetenciaWhereInput = {
    competenciaId: params.competenciaId,
    ...(params.codTienda ? { codTienda: params.codTienda } : {}),
  };

  const conUrl: Prisma.ProdPrecioCompetenciaWhereInput = {
    urlProducto: { not: null },
  };

  if (!params.idProveedor) {
    return { ...base, ...conUrl };
  }

  const conPxSugerido: Prisma.ProdPrecioCompetenciaWhereInput = {
    listaPrecioTienda: {
      listaPreciosProveedores: {
        some: {
          idProveedor: params.idProveedor,
          habilitado: true,
          pxVtaSugerido: { not: null },
        },
      },
    },
  };

  return {
    ...base,
    OR: [conUrl, conPxSugerido],
  };
}

export async function countVinculosRelevablesCompetencia(params: {
  competenciaId: string;
  idProveedor?: string | null;
  codTienda?: string;
}): Promise<number> {
  return prisma.prodPrecioCompetencia.count({
    where: whereVinculosRelevablesCompetencia(params),
  });
}

/** Clave `codTienda:idProveedor` → precio entero en pesos. */
export async function buildMapPxVtaSugerido(
  codTiendas: string[],
  idProveedores: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (codTiendas.length === 0 || idProveedores.length === 0) return map;

  const rows = await prisma.listaPrecioProveedor.findMany({
    where: {
      codTiendaVinculo: { in: codTiendas },
      idProveedor: { in: idProveedores },
      habilitado: true,
      pxVtaSugerido: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      codTiendaVinculo: true,
      idProveedor: true,
      pxVtaSugerido: true,
    },
  });

  for (const row of rows) {
    const cod = row.codTiendaVinculo;
    if (!cod || row.pxVtaSugerido == null) continue;
    const key = `${cod}:${row.idProveedor}`;
    if (map.has(key)) continue;
    const n = Number(row.pxVtaSugerido);
    if (Number.isFinite(n) && n > 0) map.set(key, Math.round(n));
  }
  return map;
}

/**
 * Precio a mostrar en UI: Px. Vta. Sugerido si existe; si no, relevamiento por URL (`px_competencia` en BD).
 * Misma presentación en ambos casos (sin distinción visual).
 */
export function aplicarPrioridadPrecioMostrar(
  vinculo: DatoVinculoCompetenciaCliente,
  pxSugerido: number | null | undefined
): DatoVinculoCompetenciaCliente {
  if (pxSugerido != null) {
    return {
      ...vinculo,
      pxCompetencia: pxSugerido,
      estado: ESTADO_RELEVAMIENTO_COMPETENCIA.OK,
    };
  }

  const tieneUrl = Boolean(vinculo.urlProducto?.trim());
  if (!tieneUrl) {
    return {
      ...vinculo,
      pxCompetencia: null,
      estado: ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
    };
  }

  return vinculo;
}
