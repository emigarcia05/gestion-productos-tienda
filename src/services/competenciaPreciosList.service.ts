import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";
import { parseCompetenciaConfigExtraccion } from "@/lib/competenciaConfigExtraccion";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import type { CompetenciaPreciosFiltros } from "@/lib/validations/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

export interface FilaCompetenciaPrecios {
  codTienda: string;
  descripcionTienda: string | null;
  pxListaTienda: number;
  marca: string | null;
  rubro: string | null;
  vinculosPorCompetencia: Record<string, DatoVinculoCompetenciaCliente>;
}

export interface CompetenciaPreciosListResult {
  filas: FilaCompetenciaPrecios[];
  total: number;
  totalPaginas: number;
  competencias: CompetenciaParaCliente[];
  marcasDisponibles: string[];
  rubrosDisponibles: string[];
}

function vinculoVacio(): DatoVinculoCompetenciaCliente {
  return {
    urlProducto: null,
    tipoPagina: null,
    pxCompetencia: null,
    estado: ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
    errorMensaje: null,
    relevadoAt: null,
  };
}

export async function getCompetenciaPreciosList(
  filtros: CompetenciaPreciosFiltros
): Promise<CompetenciaPreciosListResult> {
  const pagina = Math.max(1, parseInt(filtros.pagina, 10) || 1);
  const q = filtros.q.trim();
  const marca = filtros.marca.trim();
  const rubro = filtros.rubro.trim();
  const estadoVinculo = filtros.estadoVinculo?.trim() ?? "";
  const competenciaFiltroId = filtros.competenciaId?.trim() ?? "";

  const competenciasRows = await prisma.prodCompetencia.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      web: true,
      ultimaComparacionAt: true,
      configExtraccion: true,
    },
  });

  const competencias = competenciasRows.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    web: c.web,
    ultimaComparacionAt: c.ultimaComparacionAt?.toISOString() ?? null,
    configExtraccion: parseCompetenciaConfigExtraccion(c.configExtraccion),
  }));

  const baseWhere: Prisma.ListaPrecioTiendaWhereInput = {
    ...(q
      ? {
          OR: [
            { codTienda: { contains: q, mode: "insensitive" } },
            { descripcionTienda: { contains: q, mode: "insensitive" } },
            { codExt: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(marca ? { marca: { equals: marca, mode: "insensitive" } } : {}),
    ...(rubro ? { rubro: { equals: rubro, mode: "insensitive" } } : {}),
  };

  let where: Prisma.ListaPrecioTiendaWhereInput = baseWhere;

  if (estadoVinculo && competenciaFiltroId) {
    if (estadoVinculo === ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL) {
      where = {
        ...baseWhere,
        NOT: {
          preciosCompetencia: {
            some: {
              competenciaId: competenciaFiltroId,
              urlProducto: { not: null },
            },
          },
        },
      };
    } else {
      where = {
        ...baseWhere,
        preciosCompetencia: {
          some: {
            competenciaId: competenciaFiltroId,
            estado: estadoVinculo,
          },
        },
      };
    }
  }

  const [total, productos, marcasRows, rubrosRows] = await Promise.all([
    prisma.listaPrecioTienda.count({ where }),
    prisma.listaPrecioTienda.findMany({
      where,
      orderBy: { descripcionTienda: "asc" },
      skip: skipForPagina(pagina),
      take: PAGE_SIZE,
      select: {
        codTienda: true,
        descripcionTienda: true,
        pxListaTienda: true,
        marca: true,
        rubro: true,
      },
    }),
    prisma.listaPrecioTienda.findMany({
      where: { marca: { not: null } },
      distinct: ["marca"],
      select: { marca: true },
      orderBy: { marca: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      where: { rubro: { not: null } },
      distinct: ["rubro"],
      select: { rubro: true },
      orderBy: { rubro: "asc" },
    }),
  ]);

  const codTiendas = productos.map((p) => p.codTienda);
  const preciosRows =
    codTiendas.length > 0
      ? await prisma.prodPrecioCompetencia.findMany({
          where: { codTienda: { in: codTiendas } },
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
        })
      : [];

  const vinculosMap = new Map<string, Record<string, DatoVinculoCompetenciaCliente>>();
  for (const p of productos) {
    const entry: Record<string, DatoVinculoCompetenciaCliente> = {};
    for (const c of competencias) entry[c.id] = vinculoVacio();
    vinculosMap.set(p.codTienda, entry);
  }
  for (const row of preciosRows) {
    const entry = vinculosMap.get(row.codTienda);
    if (!entry) continue;
    entry[row.competenciaId] = {
      urlProducto: row.urlProducto,
      tipoPagina: row.tipoPagina,
      pxCompetencia: row.pxCompetencia != null ? Number(row.pxCompetencia) : null,
      estado: row.urlProducto ? row.estado : ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
      errorMensaje: row.errorMensaje,
      relevadoAt: row.relevadoAt?.toISOString() ?? null,
    };
  }

  const filas: FilaCompetenciaPrecios[] = productos.map((p) => ({
    codTienda: p.codTienda,
    descripcionTienda: p.descripcionTienda,
    pxListaTienda: Number(p.pxListaTienda),
    marca: p.marca,
    rubro: p.rubro,
    vinculosPorCompetencia: vinculosMap.get(p.codTienda) ?? {},
  }));

  return {
    filas,
    total,
    totalPaginas: totalPaginasFromTotal(total),
    competencias,
    marcasDisponibles: marcasRows.map((m) => m.marca).filter((m): m is string => !!m),
    rubrosDisponibles: rubrosRows.map((r) => r.rubro).filter((r): r is string => !!r),
  };
}
