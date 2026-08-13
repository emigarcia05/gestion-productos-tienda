import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

/**
 * Precio de venta sugerido en lista proveedor para un ítem tienda vinculado al competidor configurado.
 * Devuelve entero en pesos (misma convención que el scraping).
 */
/**
 * Px. Vta. Sugerido para un par producto×competidor: resuelve `id_proveedor` del competidor
 * y delega en `obtenerPxVtaSugeridoParaCompetencia`.
 */
export async function obtenerPxVtaSugeridoPorCompetenciaId(
  codTienda: string,
  competenciaId: string
): Promise<number | null> {
  const competencia = await prisma.prodCompetencia.findUnique({
    where: { id: competenciaId },
    select: { idProveedor: true },
  });
  if (!competencia?.idProveedor) return null;
  return obtenerPxVtaSugeridoParaCompetencia(codTienda, competencia.idProveedor);
}

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
    prodTienda: {
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

export type PxSugeridoCompetenciaPorCodTienda = {
  px: number;
  competenciaId: string;
  competenciaNombre: string;
  idProveedor: string;
};

/**
 * Por `cod_tienda`: `px_vta_sugerido` del vínculo habilitado más reciente y el competidor
 * de `prod_competencia` asociado a ese proveedor (`id_proveedor`).
 */
export async function buildMapPxSugeridoCompetenciaPorCodTienda(
  codTiendas: string[]
): Promise<Map<string, PxSugeridoCompetenciaPorCodTienda>> {
  const map = new Map<string, PxSugeridoCompetenciaPorCodTienda>();
  if (codTiendas.length === 0) return map;

  const rows = await prisma.listaPrecioProveedor.findMany({
    where: {
      codTiendaVinculo: { in: codTiendas },
      habilitado: true,
      pxVtaSugerido: { not: null, gt: 0 },
    },
    orderBy: { updatedAt: "desc" },
    select: { codTiendaVinculo: true, idProveedor: true, pxVtaSugerido: true },
  });

  const idProveedores = [...new Set(rows.map((r) => r.idProveedor))];
  const competenciasPorProveedor = new Map<
    string,
    { id: string; nombre: string }
  >();
  if (idProveedores.length > 0) {
    const competencias = await prisma.prodCompetencia.findMany({
      where: { idProveedor: { in: idProveedores } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, idProveedor: true },
    });
    for (const c of competencias) {
      if (!c.idProveedor || competenciasPorProveedor.has(c.idProveedor)) continue;
      competenciasPorProveedor.set(c.idProveedor, { id: c.id, nombre: c.nombre });
    }
  }

  for (const row of rows) {
    const cod = row.codTiendaVinculo;
    if (!cod || map.has(cod)) continue;
    const n = Number(row.pxVtaSugerido);
    if (!Number.isFinite(n) || n <= 0) continue;
    const comp = competenciasPorProveedor.get(row.idProveedor);
    if (!comp) continue;
    map.set(cod, {
      px: Math.round(n),
      competenciaId: comp.id,
      competenciaNombre: comp.nombre,
      idProveedor: row.idProveedor,
    });
  }
  return map;
}

export type CompetenciaPxSugeridoPorCodTienda = {
  codTienda: string;
  competenciaId: string;
  competenciaNombre: string;
  idProveedor: string;
  px: number;
};

/**
 * Todas las competencias con `px_vta_sugerido` por `cod_tienda` (misma lógica que `/cx-px-tienda`).
 * No exige fila en `prod_precios_competencia`; mapea `lista.id_proveedor` → `prod_competencia`.
 */
export async function listarCompetenciasConPxSugeridoPorCodTiendas(
  codTiendas: string[],
  competenciaId?: string
): Promise<CompetenciaPxSugeridoPorCodTienda[]> {
  if (codTiendas.length === 0) return [];

  const rows = await prisma.listaPrecioProveedor.findMany({
    where: {
      codTiendaVinculo: { in: codTiendas },
      habilitado: true,
      pxVtaSugerido: { not: null, gt: 0 },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      codTiendaVinculo: true,
      idProveedor: true,
      pxVtaSugerido: true,
    },
  });

  const idProveedores = [...new Set(rows.map((r) => r.idProveedor))];
  const competenciasPorProveedor = new Map<string, { id: string; nombre: string }>();
  if (idProveedores.length > 0) {
    const competencias = await prisma.prodCompetencia.findMany({
      where: {
        idProveedor: { in: idProveedores },
        ...(competenciaId ? { id: competenciaId } : {}),
      },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, idProveedor: true },
    });
    for (const c of competencias) {
      if (!c.idProveedor || competenciasPorProveedor.has(c.idProveedor)) continue;
      competenciasPorProveedor.set(c.idProveedor, { id: c.id, nombre: c.nombre });
    }
  }

  const seen = new Set<string>();
  const result: CompetenciaPxSugeridoPorCodTienda[] = [];
  for (const row of rows) {
    const codTienda = row.codTiendaVinculo;
    if (!codTienda) continue;
    const comp = competenciasPorProveedor.get(row.idProveedor);
    if (!comp) continue;
    const key = `${codTienda}:${comp.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const px = Number(row.pxVtaSugerido);
    if (!Number.isFinite(px) || px <= 0) continue;
    result.push({
      codTienda,
      competenciaId: comp.id,
      competenciaNombre: comp.nombre,
      idProveedor: row.idProveedor,
      px: Math.round(px),
    });
  }
  return result;
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
      urlBloqueadaPorPxSugerido: true,
    };
  }

  const tieneUrl = Boolean(vinculo.urlProducto?.trim());
  if (!tieneUrl) {
    return {
      ...vinculo,
      pxCompetencia: null,
      estado: ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
      urlBloqueadaPorPxSugerido: false,
    };
  }

  return { ...vinculo, urlBloqueadaPorPxSugerido: false };
}

export type PrecioCompetenciaRowDb = {
  codTienda: string;
  competenciaId: string;
  urlProducto: string | null;
  tipoPagina: string | null;
  pxCompetencia: { toString(): string } | null;
  estado: string;
  errorMensaje: string | null;
  relevadoAt: Date | null;
};

export function mapPrecioCompetenciaRowToVinculo(
  row: Omit<PrecioCompetenciaRowDb, "codTienda" | "competenciaId">
): DatoVinculoCompetenciaCliente {
  return {
    urlProducto: row.urlProducto,
    tipoPagina: row.tipoPagina,
    pxCompetencia: row.pxCompetencia != null ? Number(row.pxCompetencia) : null,
    estado: row.urlProducto ? row.estado : ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
    errorMensaje: row.errorMensaje,
    relevadoAt: row.relevadoAt?.toISOString() ?? null,
    urlBloqueadaPorPxSugerido: false,
  };
}

export type PrecioCompetenciaMostrarResuelto = {
  codTienda: string;
  competenciaId: string;
  pxMostrar: number | null;
  vinculo: DatoVinculoCompetenciaCliente;
};

/** SSOT: mismo precio que Px Competencia (`aplicarPrioridadPrecioMostrar`). */
export async function resolverPreciosCompetenciaMostrar(
  items: ReadonlyArray<{ codTienda: string; competenciaId: string }>
): Promise<Map<string, PrecioCompetenciaMostrarResuelto>> {
  const map = new Map<string, PrecioCompetenciaMostrarResuelto>();
  if (items.length === 0) return map;

  const codTiendas = [...new Set(items.map((i) => i.codTienda))];
  const competenciaIds = [...new Set(items.map((i) => i.competenciaId))];

  const [rows, competencias] = await Promise.all([
    prisma.prodPrecioCompetencia.findMany({
      where: {
        codTienda: { in: codTiendas },
        competenciaId: { in: competenciaIds },
      },
      select: {
        codTienda: true,
        competenciaId: true,
        urlProducto: true,
        tipoPagina: true,
        pxCompetencia: true,
        estado: true,
        errorMensaje: true,
        relevadoAt: true,
      },
    }),
    prisma.prodCompetencia.findMany({
      where: { id: { in: competenciaIds } },
      select: { id: true, idProveedor: true },
    }),
  ]);

  const idProveedores = [
    ...new Set(competencias.map((c) => c.idProveedor).filter((id): id is string => Boolean(id))),
  ];
  const pxSugeridoMap = await buildMapPxVtaSugerido(codTiendas, idProveedores);
  const proveedorPorCompetencia = new Map(
    competencias.filter((c) => c.idProveedor).map((c) => [c.id, c.idProveedor as string])
  );

  for (const row of rows) {
    const key = `${row.codTienda}:${row.competenciaId}`;
    const idProveedor = proveedorPorCompetencia.get(row.competenciaId);
    const pxSugerido =
      idProveedor != null ? (pxSugeridoMap.get(`${row.codTienda}:${idProveedor}`) ?? null) : null;
    const vinculo = aplicarPrioridadPrecioMostrar(mapPrecioCompetenciaRowToVinculo(row), pxSugerido);
    map.set(key, {
      codTienda: row.codTienda,
      competenciaId: row.competenciaId,
      pxMostrar: vinculo.pxCompetencia,
      vinculo,
    });
  }

  return map;
}

export async function resolverPrecioCompetenciaMostrar(
  codTienda: string,
  competenciaId: string
): Promise<PrecioCompetenciaMostrarResuelto | null> {
  const map = await resolverPreciosCompetenciaMostrar([{ codTienda, competenciaId }]);
  return map.get(`${codTienda}:${competenciaId}`) ?? null;
}
