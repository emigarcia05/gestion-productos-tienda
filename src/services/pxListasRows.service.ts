import { prisma } from "@/lib/prisma";
import { ESTADO_RELEVAMIENTO_COMPETENCIA } from "@/lib/competenciaRelevamiento";
import {
  DET_PRECIO_MANUAL,
  DET_PRECIO_SUGERIDO,
  calcMarcacionPxLista,
  type DetPrecioSeleccion,
  type ItemPxListasParaTabla,
  type OpcionCompetenciaPxLista,
} from "@/lib/pxListas";
import {
  aplicarPrioridadPrecioMostrar,
  buildMapPxVtaSugerido,
  buildMapPxVtaSugeridoPorCodTienda,
} from "@/services/competenciaPxSugerido.service";
import type { PxListaConfigPersistida } from "@/services/pxListasConfig.service";
import type { DatoVinculoCompetenciaCliente } from "@/services/competenciaVinculo.service";

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

function resolverDetPrecioSeleccion(
  config: PxListaConfigPersistida | undefined,
  pxPrecioSugerido: number | null
): DetPrecioSeleccion {
  if (config) return config.detPrecioSeleccion;
  if (pxPrecioSugerido != null && pxPrecioSugerido > 0) return DET_PRECIO_SUGERIDO;
  return DET_PRECIO_MANUAL;
}

function resolverPxLista(
  detPrecioSeleccion: DetPrecioSeleccion,
  pxListaManual: number | null,
  pxPrecioSugerido: number | null,
  opciones: OpcionCompetenciaPxLista[]
): number | null {
  if (detPrecioSeleccion === DET_PRECIO_MANUAL) return pxListaManual;
  if (detPrecioSeleccion === DET_PRECIO_SUGERIDO) return pxPrecioSugerido;
  const op = opciones.find((o) => o.competenciaId === detPrecioSeleccion);
  return op?.px ?? null;
}

export async function buildPxListasItemsDesdeFilas(
  filas: Array<{
    codTienda: string;
    descripcion: string;
    costoCompra: number;
  }>,
  configMap: Map<string, PxListaConfigPersistida>
): Promise<ItemPxListasParaTabla[]> {
  if (filas.length === 0) return [];

  const codTiendas = filas.map((f) => f.codTienda);

  const [preciosRows, pxSugeridoPorCodTienda] = await Promise.all([
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
    buildMapPxVtaSugeridoPorCodTienda(codTiendas),
  ]);

  const idProveedores = [
    ...new Set(
      preciosRows
        .map((r) => r.competencia.idProveedor)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const pxSugeridoCompetidorMap = await buildMapPxVtaSugerido(codTiendas, idProveedores);

  const opcionesPorCod = new Map<string, OpcionCompetenciaPxLista[]>();
  for (const row of preciosRows) {
    const pxSugeridoComp =
      row.competencia.idProveedor != null
        ? (pxSugeridoCompetidorMap.get(`${row.codTienda}:${row.competencia.idProveedor}`) ??
          null)
        : null;
    const vinculo = aplicarPrioridadPrecioMostrar(vinculoDesdeRow(row), pxSugeridoComp);
    const list = opcionesPorCod.get(row.codTienda) ?? [];
    list.push({
      competenciaId: row.competenciaId,
      nombre: row.competencia.nombre,
      px: vinculo.pxCompetencia,
    });
    opcionesPorCod.set(row.codTienda, list);
  }

  return filas.map((f) => {
    const config = configMap.get(f.codTienda);
    const opciones = opcionesPorCod.get(f.codTienda) ?? [];
    const pxPrecioSugerido = pxSugeridoPorCodTienda.get(f.codTienda) ?? null;
    const detPrecioSeleccion = resolverDetPrecioSeleccion(config, pxPrecioSugerido);
    const esManual = detPrecioSeleccion === DET_PRECIO_MANUAL;
    const esSugerido = detPrecioSeleccion === DET_PRECIO_SUGERIDO;
    const pxListaManual = config?.pxListaManual ?? null;
    const pxLista = resolverPxLista(
      detPrecioSeleccion,
      pxListaManual,
      pxPrecioSugerido,
      opciones
    );

    return {
      id: f.codTienda,
      codItem: f.codTienda,
      descripcion: f.descripcion,
      costoCompra: f.costoCompra,
      detPrecioSeleccion,
      opcionesCompetencia: opciones,
      pxPrecioSugerido,
      pxLista,
      pxListaManual,
      marcacion: pxLista != null ? calcMarcacionPxLista(pxLista, f.costoCompra) : null,
      esDetPrecioManual: esManual,
      esDetPrecioSugerido: esSugerido,
    };
  });
}
