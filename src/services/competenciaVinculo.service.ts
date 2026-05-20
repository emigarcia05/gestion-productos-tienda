import { prisma } from "@/lib/prisma";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";

export interface DatoVinculoCompetenciaCliente {
  urlProducto: string | null;
  tipoPagina: string | null;
  pxCompetencia: number | null;
  estado: string;
  errorMensaje: string | null;
  relevadoAt: string | null;
}

export async function guardarUrlVinculoCompetencia(data: {
  codTienda: string;
  competenciaId: string;
  urlProducto: string | null;
  tipoPagina?: string | null;
}): Promise<DatoVinculoCompetenciaCliente> {
  const url = data.urlProducto?.trim() || null;
  const tipoPagina = data.tipoPagina?.trim() || null;

  if (!url) {
    const row = await prisma.prodPrecioCompetencia.upsert({
      where: {
        codTienda_competenciaId: {
          codTienda: data.codTienda,
          competenciaId: data.competenciaId,
        },
      },
      create: {
        codTienda: data.codTienda,
        competenciaId: data.competenciaId,
        urlProducto: null,
        tipoPagina: null,
        estado: ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
        pxCompetencia: null,
        errorMensaje: null,
        relevadoAt: null,
      },
      update: {
        urlProducto: null,
        tipoPagina: null,
        estado: ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
        errorMensaje: null,
      },
      select: vinculoSelect,
    });
    return mapVinculo(row);
  }

  try {
    new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    throw new Error("URL de producto inválida.");
  }

  const urlNorm = url.startsWith("http") ? url : `https://${url}`;

  const existente = await prisma.prodPrecioCompetencia.findUnique({
    where: {
      codTienda_competenciaId: {
        codTienda: data.codTienda,
        competenciaId: data.competenciaId,
      },
    },
    select: { urlProducto: true },
  });
  const urlCambio = existente?.urlProducto !== urlNorm;

  const row = await prisma.prodPrecioCompetencia.upsert({
    where: {
      codTienda_competenciaId: {
        codTienda: data.codTienda,
        competenciaId: data.competenciaId,
      },
    },
    create: {
      codTienda: data.codTienda,
      competenciaId: data.competenciaId,
      urlProducto: urlNorm,
      tipoPagina,
      estado: ESTADO_RELEVAMIENTO_COMPETENCIA.PENDIENTE,
      pxCompetencia: null,
      errorMensaje: null,
      relevadoAt: null,
    },
    update: {
      urlProducto: urlNorm,
      tipoPagina,
      estado: ESTADO_RELEVAMIENTO_COMPETENCIA.PENDIENTE,
      errorMensaje: null,
      // Solo persiste el enlace; el precio se releva al ejecutar Comparar Precios.
      ...(urlCambio ? { pxCompetencia: null, relevadoAt: null } : {}),
    },
    select: vinculoSelect,
  });
  return mapVinculo(row);
}

const vinculoSelect = {
  urlProducto: true,
  tipoPagina: true,
  pxCompetencia: true,
  estado: true,
  errorMensaje: true,
  relevadoAt: true,
} as const;

function mapVinculo(row: {
  urlProducto: string | null;
  tipoPagina: string | null;
  pxCompetencia: { toString(): string } | null;
  estado: string;
  errorMensaje: string | null;
  relevadoAt: Date | null;
}): DatoVinculoCompetenciaCliente {
  return {
    urlProducto: row.urlProducto,
    tipoPagina: row.tipoPagina,
    pxCompetencia: row.pxCompetencia != null ? Number(row.pxCompetencia) : null,
    estado: row.estado,
    errorMensaje: row.errorMensaje,
    relevadoAt: row.relevadoAt?.toISOString() ?? null,
  };
}
