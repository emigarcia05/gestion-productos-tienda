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
  buildMapPxVtaSugerido,
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

  const preciosRows = await prisma.prodPrecioCompetencia.findMany({
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
  });

  const idProveedores = [
    ...new Set(
      preciosRows
        .map((r) => r.competencia.idProveedor)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const pxSugeridoMap = await buildMapPxVtaSugerido(codTiendas, idProveedores);

  const opcionesPorCod = new Map<string, OpcionCompetenciaPxLista[]>();
  for (const row of preciosRows) {
    const pxSugerido =
      row.competencia.idProveedor != null
        ? (pxSugeridoMap.get(`${row.codTienda}:${row.competencia.idProveedor}`) ?? null)
        : null;
    const vinculo = aplicarPrioridadPrecioMostrar(
      vinculoDesdeRow(row),
      pxSugerido
    );
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
    const detPrecioSeleccion: DetPrecioSeleccion =
      config?.detPrecioSeleccion ?? DET_PRECIO_MANUAL;
    const esManual = detPrecioSeleccion === DET_PRECIO_MANUAL;
    const pxListaManual = config?.pxListaManual ?? null;

    let pxLista: number | null = null;
    if (esManual) {
      pxLista = pxListaManual;
    } else {
      const op = opciones.find((o) => o.competenciaId === detPrecioSeleccion);
      pxLista = op?.px ?? null;
    }

    return {
      id: f.codTienda,
      codItem: f.codTienda,
      descripcion: f.descripcion,
      costoCompra: f.costoCompra,
      detPrecioSeleccion,
      opcionesCompetencia: opciones,
      pxLista,
      pxListaManual,
      marcacion: pxLista != null ? calcMarcacionPxLista(pxLista, f.costoCompra) : null,
      esDetPrecioManual: esManual,
    };
  });
}
