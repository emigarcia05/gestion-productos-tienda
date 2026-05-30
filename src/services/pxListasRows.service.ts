import { prisma } from "@/lib/prisma";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import {
  DET_PRECIO_MANUAL,
  calcMarcacionPxLista,
  type DetPrecioSeleccion,
  type ItemPxListasParaTabla,
  type OpcionCompetenciaPxLista,
} from "@/lib/pxListas";
import {
  aplicarPrioridadPrecioMostrar,
  buildMapPxSugeridoCompetenciaPorCodTienda,
  buildMapPxVtaSugerido,
} from "@/services/competenciaPxSugerido.service";
import {
  calcularResumenPreciosPxListas,
  fusionarVinculosConOpcionesPxListas,
} from "@/lib/competenciaPreciosFilaResumen";
import { vinculosRecordToArray } from "@/lib/pxListasVinculos";
import {
  competenciaSelect,
  mapCompetenciaRow,
  type CompetenciaParaCliente,
} from "@/services/competencia.service";
import type { PxListaConfigPersistida } from "@/services/pxListasConfig.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

export type BuildPxListasItemsResult = {
  items: ItemPxListasParaTabla[];
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

/** Competidor guardado → sugerido → primero en lista (ya ordenada por nombre). */
function elegirCompetidorPreferido(
  opciones: OpcionCompetenciaPxLista[],
  competenciaSugeridoId: string | null,
  configCompetenciaId: string | null
): string {
  if (
    configCompetenciaId &&
    opciones.some((o) => o.competenciaId === configCompetenciaId)
  ) {
    return configCompetenciaId;
  }
  if (
    competenciaSugeridoId &&
    opciones.some((o) => o.competenciaId === competenciaSugeridoId)
  ) {
    return competenciaSugeridoId;
  }
  return opciones[0]!.competenciaId;
}

function opcionesConPrecioRegistrado(
  opciones: OpcionCompetenciaPxLista[]
): OpcionCompetenciaPxLista[] {
  return opciones.filter((o) => o.px != null && o.px > 0);
}

function resolverDetPrecioSeleccion(
  config: PxListaConfigPersistida | undefined,
  competenciaSugeridoId: string | null,
  opciones: OpcionCompetenciaPxLista[]
): DetPrecioSeleccion {
  if (config?.detPrecioSeleccion === DET_PRECIO_MANUAL) {
    return DET_PRECIO_MANUAL;
  }
  if (opciones.length === 0) return DET_PRECIO_MANUAL;

  const configCompetenciaId =
    config && config.detPrecioSeleccion !== DET_PRECIO_MANUAL
      ? config.detPrecioSeleccion
      : null;

  return elegirCompetidorPreferido(opciones, competenciaSugeridoId, configCompetenciaId);
}

function resolverPxLista(
  detPrecioSeleccion: DetPrecioSeleccion,
  pxListaManual: number | null,
  opciones: OpcionCompetenciaPxLista[]
): number | null {
  if (detPrecioSeleccion === DET_PRECIO_MANUAL) return pxListaManual;
  const op = opciones.find((o) => o.competenciaId === detPrecioSeleccion);
  return op?.px ?? null;
}

function enriquecerOpcionesConSugerido(
  opciones: OpcionCompetenciaPxLista[],
  sugerido: {
    competenciaId: string;
    competenciaNombre: string;
    px: number;
  } | null
): OpcionCompetenciaPxLista[] {
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

export async function buildPxListasItemsDesdeFilas(
  filas: Array<{
    codTienda: string;
    descripcion: string;
    costoCompra: number;
  }>,
  configMap: Map<string, PxListaConfigPersistida>
): Promise<BuildPxListasItemsResult> {
  if (filas.length === 0) {
    const competenciasRows = await prisma.prodCompetencia.findMany({
      orderBy: { nombre: "asc" },
      select: competenciaSelect,
    });
    return { items: [], competencias: competenciasRows.map(mapCompetenciaRow) };
  }

  const codTiendas = filas.map((f) => f.codTienda);

  const [preciosRows, sugeridoPorCodTienda, competenciasRows] = await Promise.all([
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
    buildMapPxSugeridoCompetenciaPorCodTienda(codTiendas),
    prisma.prodCompetencia.findMany({
      orderBy: { nombre: "asc" },
      select: competenciaSelect,
    }),
  ]);

  const competencias = competenciasRows.map(mapCompetenciaRow);

  const idProveedores = [
    ...new Set(
      preciosRows
        .map((r) => r.competencia.idProveedor)
        .filter((id): id is string => Boolean(id))
    ),
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

  const opcionesPorCod = new Map<string, OpcionCompetenciaPxLista[]>();
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
    const config = configMap.get(f.codTienda);
    const sugerido = sugeridoPorCodTienda.get(f.codTienda) ?? null;
    const opciones = opcionesConPrecioRegistrado(
      enriquecerOpcionesConSugerido(
        opcionesPorCod.get(f.codTienda) ?? [],
        sugerido
      )
    ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    const detPrecioSeleccion = resolverDetPrecioSeleccion(
      config,
      sugerido?.competenciaId ?? null,
      opciones
    );
    const esManual = detPrecioSeleccion === DET_PRECIO_MANUAL;
    const pxListaManual = config?.pxListaManual ?? null;
    const pxLista = resolverPxLista(detPrecioSeleccion, pxListaManual, opciones);
    const vinculos = vinculosMap.get(f.codTienda) ?? {};
    const pxListaParaResumen = pxLista != null && pxLista > 0 ? pxLista : 0;
    const resumen = calcularResumenPreciosPxListas(
      opciones,
      vinculos,
      competencias,
      pxListaParaResumen
    );
    const vinculosFusionados = fusionarVinculosConOpcionesPxListas(vinculos, opciones);
    const competenciaIds = competencias.map((c) => c.id);

    return {
      id: f.codTienda,
      codItem: f.codTienda,
      descripcion: f.descripcion,
      costoCompra: f.costoCompra,
      detPrecioSeleccion,
      opcionesCompetencia: opciones,
      pxPrecioSugerido: sugerido?.px ?? null,
      pxLista,
      pxListaManual,
      marcacion: pxLista != null ? calcMarcacionPxLista(pxLista, f.costoCompra) : null,
      esDetPrecioManual: esManual,
      pxPromedio: resumen.pxPromedio,
      difPctTiendaVsPromedio: resumen.difPctTiendaVsPromedio,
      competidoresPrecioDetalle: resumen.competidoresOrdenados,
      competidoresFalloDetalle: resumen.competidoresFalloDetalle,
      vinculosCompetencia: vinculosRecordToArray(vinculosFusionados, competenciaIds),
    };
  });

  return { items, competencias };
}
