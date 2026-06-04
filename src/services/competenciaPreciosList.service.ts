import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";
import {
  codTiendasFiltrosPrecioCompetencia,
  whereConfiguradoCompetencia,
} from "@/lib/competenciaPreciosFiltrosQuery";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import type { CompetenciaPreciosFiltros } from "@/lib/validations/competenciaPrecios";
import {
  competenciaSelect,
  mapCompetenciaRow,
  type CompetenciaParaCliente,
} from "@/services/competencia.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";
import {
  aplicarPrioridadPrecioMostrar,
  buildMapPxVtaSugerido,
} from "@/services/competenciaPxSugerido.service";
import { buildMapPrecioListaPrincipal } from "@/services/prodListasPreciosTienda.service";

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
    urlBloqueadaPorPxSugerido: false,
  };
}

export async function getCompetenciaPreciosList(
  filtros: CompetenciaPreciosFiltros
): Promise<CompetenciaPreciosListResult> {
  const pagina = Math.max(1, parseInt(filtros.pagina, 10) || 1);
  const q = filtros.q.trim();
  const difPromedio = filtros.difPromedio;
  const configurado = filtros.configurado;
  const provCaroCompetenciaId = filtros.provCaroCompetenciaId?.trim() ?? "";
  const provBaratoCompetenciaId = filtros.provBaratoCompetenciaId?.trim() ?? "";
  const competenciaId = filtros.competenciaId?.trim() ?? "";

  const competenciasRows = await prisma.prodCompetencia.findMany({
    orderBy: { nombre: "asc" },
    select: competenciaSelect,
  });

  const competencias = competenciasRows.map(mapCompetenciaRow);

  const baseWhere: Prisma.ProdTiendaWhereInput = {
    ...(q ? filtroTexto(q, ["codTienda", "descripcionTienda", "codExt"]) : {}),
  };

  const whereConfigurado = whereConfiguradoCompetencia(configurado);
  const codTiendasPrecio = await codTiendasFiltrosPrecioCompetencia({
    difPromedio: difPromedio === "" ? undefined : difPromedio,
    provCaroCompetenciaId: provCaroCompetenciaId || undefined,
    provBaratoCompetenciaId: provBaratoCompetenciaId || undefined,
    competenciaId: competenciaId || undefined,
  });

  const where: Prisma.ProdTiendaWhereInput = {
    AND: [
      baseWhere,
      ...(whereConfigurado ? [whereConfigurado] : []),
      ...(codTiendasPrecio !== undefined
        ? [{ codTienda: { in: codTiendasPrecio } }]
        : []),
    ],
  };

  const [total, productos] = await Promise.all([
    prisma.prodTienda.count({ where }),
    prisma.prodTienda.findMany({
      where,
      orderBy: { descripcionTienda: "asc" },
      skip: skipForPagina(pagina),
      take: PAGE_SIZE,
      select: {
        codTienda: true,
        descripcionTienda: true,
        marca: true,
        rubro: true,
      },
    }),
  ]);

  const codTiendas = productos.map((p) => p.codTienda);
  const pxListaMap = await buildMapPrecioListaPrincipal(codTiendas);
  const idProveedoresCompetencia = [
    ...new Set(
      competencias.map((c) => c.idProveedor).filter((id): id is string => Boolean(id))
    ),
  ];
  const pxSugeridoPorCodTiendaProveedor = await buildMapPxVtaSugerido(
    codTiendas,
    idProveedoresCompetencia
  );

  const pxSugeridoParaCompetencia = (
    codTienda: string,
    competenciaId: string
  ): number | null => {
    const idProveedor = competencias.find((c) => c.id === competenciaId)?.idProveedor;
    if (!idProveedor) return null;
    return pxSugeridoPorCodTiendaProveedor.get(`${codTienda}:${idProveedor}`) ?? null;
  };

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
    const desdeBd: DatoVinculoCompetenciaCliente = {
      urlProducto: row.urlProducto,
      tipoPagina: row.tipoPagina,
      pxCompetencia: row.pxCompetencia != null ? Number(row.pxCompetencia) : null,
      estado: row.urlProducto ? row.estado : ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
      errorMensaje: row.errorMensaje,
      relevadoAt: row.relevadoAt?.toISOString() ?? null,
      urlBloqueadaPorPxSugerido: false,
    };
    entry[row.competenciaId] = aplicarPrioridadPrecioMostrar(
      desdeBd,
      pxSugeridoParaCompetencia(row.codTienda, row.competenciaId)
    );
  }

  for (const [codTienda, entry] of vinculosMap) {
    for (const c of competencias) {
      entry[c.id] = aplicarPrioridadPrecioMostrar(
        entry[c.id] ?? vinculoVacio(),
        pxSugeridoParaCompetencia(codTienda, c.id)
      );
    }
  }

  const filas: FilaCompetenciaPrecios[] = productos.map((p) => ({
    codTienda: p.codTienda,
    descripcionTienda: p.descripcionTienda,
    pxListaTienda: pxListaMap.get(p.codTienda) ?? 0,
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
