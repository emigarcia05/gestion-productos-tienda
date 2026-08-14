import { prisma } from "@/lib/prisma";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import type { ItemPxCompetenciaTabla, OpcionPxCompetencia } from "@/lib/pxCompetencia";
import {
  aplicarPrioridadPrecioMostrar,
  buildMapPxVtaSugerido,
  listarCompetenciasConPxSugeridoPorCodTiendas,
  type CompetenciaPxSugeridoPorCodTienda,
} from "@/services/competenciaPxSugerido.service";
import {
  calcularResumenPreciosPxCompetencia,
  fusionarVinculosConOpcionesPxCompetencia,
} from "@/lib/competenciaPreciosFilaResumen";
import { vinculosRecordToArray } from "@/lib/pxCompetenciaVinculos";
import {
  competenciaSelect,
  mapCompetenciaRow,
  type CompetenciaParaCliente,
} from "@/services/competencia.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

export type BuildPxCompetenciaItemsResult = {
  items: ItemPxCompetenciaTabla[];
  competencias: CompetenciaParaCliente[];
};

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

function vinculoDesdeRow(row: {
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
    estado: row.urlProducto ? row.estado : ESTADO_RELEVAMIENTO_COMPETENCIA.SIN_URL,
    errorMensaje: row.errorMensaje,
    relevadoAt: row.relevadoAt?.toISOString() ?? null,
    urlBloqueadaPorPxSugerido: false,
  };
}

function opcionesConPrecioRegistrado(
  opciones: OpcionPxCompetencia[]
): OpcionPxCompetencia[] {
  return opciones.filter((o) => o.px != null && o.px > 0);
}

function enriquecerOpcionesConSugerido(
  opciones: OpcionPxCompetencia[],
  sugerido: {
    competenciaId: string;
    competenciaNombre: string;
    px: number;
  } | null
): OpcionPxCompetencia[] {
  if (!sugerido || !(sugerido.px > 0)) return opciones;
  if (opciones.some((o) => o.competenciaId === sugerido.competenciaId)) {
    return opciones.map((o) =>
      o.competenciaId === sugerido.competenciaId
        ? { ...o, px: o.px ?? sugerido.px }
        : o
    );
  }
  return [
    ...opciones,
    {
      competenciaId: sugerido.competenciaId,
      nombre: sugerido.competenciaNombre,
      px: sugerido.px,
    },
  ];
}

function enriquecerOpcionesConTodosSugeridos(
  opciones: OpcionPxCompetencia[],
  sugeridos: CompetenciaPxSugeridoPorCodTienda[]
): OpcionPxCompetencia[] {
  return sugeridos.reduce(
    (acc, s) =>
      enriquecerOpcionesConSugerido(acc, {
        competenciaId: s.competenciaId,
        competenciaNombre: s.competenciaNombre,
        px: s.px,
      }),
    opciones
  );
}

function agruparSugeridosPorCodTienda(
  sugeridos: CompetenciaPxSugeridoPorCodTienda[]
): Map<string, CompetenciaPxSugeridoPorCodTienda[]> {
  const map = new Map<string, CompetenciaPxSugeridoPorCodTienda[]>();
  for (const s of sugeridos) {
    const list = map.get(s.codTienda) ?? [];
    list.push(s);
    map.set(s.codTienda, list);
  }
  return map;
}

export async function buildPxCompetenciaItemsDesdeFilas(
  filas: Array<{
    codTienda: string;
    descripcion: string;
    costoCompra: number;
    pxListaTienda: number;
  }>
): Promise<BuildPxCompetenciaItemsResult> {
  if (filas.length === 0) {
    const competenciasRows = await prisma.prodCompetencia.findMany({
      orderBy: { nombre: "asc" },
      select: competenciaSelect,
    });
    return { items: [], competencias: competenciasRows.map(mapCompetenciaRow) };
  }

  const codTiendas = filas.map((f) => f.codTienda);

  const [preciosRows, sugeridosPorCodTiendaList, competenciasRows] = await Promise.all([
    prisma.prodPrecioCompetencia.findMany({
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
        competencia: { select: { id: true, nombre: true, idProveedor: true } },
      },
      orderBy: { competencia: { nombre: "asc" } },
    }),
    listarCompetenciasConPxSugeridoPorCodTiendas(codTiendas),
    prisma.prodCompetencia.findMany({
      orderBy: { nombre: "asc" },
      select: competenciaSelect,
    }),
  ]);

  const competencias = competenciasRows.map(mapCompetenciaRow);
  const sugeridosPorCodTienda = agruparSugeridosPorCodTienda(sugeridosPorCodTiendaList);

  const idProveedores = [
    ...new Set([
      ...competencias
        .map((c) => c.idProveedor)
        .filter((id): id is string => Boolean(id)),
      ...sugeridosPorCodTiendaList.map((s) => s.idProveedor),
      ...preciosRows
        .map((r) => r.competencia.idProveedor)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];
  const pxSugeridoCompetidorMap = await buildMapPxVtaSugerido(codTiendas, idProveedores);

  const pxSugeridoParaCompetencia = (
    codTienda: string,
    competenciaId: string
  ): number | null => {
    const idProveedor = competencias.find((c) => c.id === competenciaId)?.idProveedor;
    if (!idProveedor) return null;
    return pxSugeridoCompetidorMap.get(`${codTienda}:${idProveedor}`) ?? null;
  };

  const vinculosMap = new Map<string, Record<string, DatoVinculoCompetenciaCliente>>();
  for (const cod of codTiendas) {
    const entry: Record<string, DatoVinculoCompetenciaCliente> = {};
    for (const c of competencias) entry[c.id] = vinculoVacio();
    vinculosMap.set(cod, entry);
  }

  const opcionesPorCod = new Map<string, OpcionPxCompetencia[]>();
  for (const row of preciosRows) {
    const pxSugeridoComp =
      row.competencia.idProveedor != null
        ? (pxSugeridoCompetidorMap.get(`${row.codTienda}:${row.competencia.idProveedor}`) ??
          null)
        : null;
    const vinculo = aplicarPrioridadPrecioMostrar(vinculoDesdeRow(row), pxSugeridoComp);
    const entry = vinculosMap.get(row.codTienda);
    if (entry) {
      entry[row.competenciaId] = vinculo;
    }
    const px = vinculo.pxCompetencia;
    if (px == null || !(px > 0)) continue;
    const list = opcionesPorCod.get(row.codTienda) ?? [];
    list.push({
      competenciaId: row.competenciaId,
      nombre: row.competencia.nombre,
      px,
    });
    opcionesPorCod.set(row.codTienda, list);
  }

  for (const [codTienda, entry] of vinculosMap) {
    for (const c of competencias) {
      entry[c.id] = aplicarPrioridadPrecioMostrar(
        entry[c.id] ?? vinculoVacio(),
        pxSugeridoParaCompetencia(codTienda, c.id)
      );
    }
  }

  const items = filas.map((f) => {
    const sugeridos = sugeridosPorCodTienda.get(f.codTienda) ?? [];
    const opciones = opcionesConPrecioRegistrado(
      enriquecerOpcionesConTodosSugeridos(
        opcionesPorCod.get(f.codTienda) ?? [],
        sugeridos
      )
    ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    const vinculos = vinculosMap.get(f.codTienda) ?? {};
    const pxListaParaResumen = f.pxListaTienda > 0 ? f.pxListaTienda : 0;
    const resumen = calcularResumenPreciosPxCompetencia(
      opciones,
      vinculos,
      competencias,
      pxListaParaResumen
    );
    const vinculosFusionados = fusionarVinculosConOpcionesPxCompetencia(vinculos, opciones);
    const competenciaIds = competencias.map((c) => c.id);

    return {
      id: f.codTienda,
      codItem: f.codTienda,
      descripcion: f.descripcion,
      costoCompra: f.costoCompra,
      pxListaTienda: f.pxListaTienda,
      pxPromedio: resumen.pxPromedio,
      difPctTiendaVsPromedio: resumen.difPctTiendaVsPromedio,
      competidoresPrecioDetalle: resumen.competidoresOrdenados,
      competidoresFalloDetalle: resumen.competidoresFalloDetalle,
      vinculosCompetencia: vinculosRecordToArray(vinculosFusionados, competenciaIds),
    };
  });

  return { items, competencias };
}
