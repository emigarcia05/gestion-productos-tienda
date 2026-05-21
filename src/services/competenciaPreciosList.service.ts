import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";
import { parseCompetenciaConfigExtraccion } from "@/lib/competenciaConfigExtraccion";
import {
  codTiendasFiltrosPrecioCompetencia,
  whereConfiguradoCompetencia,
} from "@/lib/competenciaPreciosFiltrosQuery";
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
  const difPromedio = filtros.difPromedio?.trim() ?? "";
  const provCaroCompetenciaId = filtros.provCaroCompetenciaId?.trim() ?? "";
  const provBaratoCompetenciaId = filtros.provBaratoCompetenciaId?.trim() ?? "";
  const configurado = filtros.configurado?.trim() ?? "";

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
    ...(q ? filtroTexto(q, ["codTienda", "descripcionTienda", "codExt"]) : {}),
  };

  const whereConfigurado = whereConfiguradoCompetencia(configurado);
  const codTiendasPrecio = await codTiendasFiltrosPrecioCompetencia({
    difPromedio: difPromedio || undefined,
    provCaroCompetenciaId: provCaroCompetenciaId || undefined,
    provBaratoCompetenciaId: provBaratoCompetenciaId || undefined,
  });

  const where: Prisma.ListaPrecioTiendaWhereInput = {
    AND: [
      baseWhere,
      ...(whereConfigurado ? [whereConfigurado] : []),
      ...(codTiendasPrecio !== undefined
        ? [{ codTienda: { in: codTiendasPrecio } }]
        : []),
    ],
  };

  const [total, productos] = await Promise.all([
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
  };
}
