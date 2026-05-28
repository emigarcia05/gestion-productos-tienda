import { prisma } from "@/lib/prisma";
import {
  CX_PROD_SELECCION_PROM,
  PX_LISTA_SELECCION_PROM,
  type ItemCxPxTiendaParaTabla,
  type OpcionCostoCxProdProveedor,
  type OpcionPxListaCompetidor,
} from "@/lib/cxPxTienda";
import {
  calcularCostoPromedioVinculos,
  costoDesdeCandidato,
  etiquetaProveedorCosto,
  listarCandidatosCostoPorCodTienda,
} from "@/services/costoListaTienda.service";
import {
  buildMapOpcionesPxListaPorCodTienda,
  pxListaMostradoParaSeleccion,
  type CompetenciaPxListaCtx,
} from "@/services/pxListaCxPxTienda.service";

export const filaCxPxSelect = {
  codTienda: true,
  descripcionTienda: true,
  costoCompra: true,
  codExtCostoCompra: true,
  pxListaTienda: true,
  pxListaCxPx: true,
  competenciaIdPxLista: true,
} as const;

export type FilaCxPxDb = {
  codTienda: string;
  descripcionTienda: string | null;
  costoCompra: unknown;
  codExtCostoCompra: string | null;
  pxListaTienda: unknown;
  pxListaCxPx: unknown;
  competenciaIdPxLista: string | null;
};

export async function listarCompetenciasPxListaCtx(): Promise<CompetenciaPxListaCtx[]> {
  const rows = await prisma.prodCompetencia.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      idProveedor: true,
      proveedor: { select: { prefijo: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    idProveedor: c.idProveedor,
    prefijoProveedor: c.proveedor?.prefijo?.trim() || null,
  }));
}

export function mapFilaCxPx(
  r: FilaCxPxDb,
  candidatos: Awaited<ReturnType<typeof listarCandidatosCostoPorCodTienda>>,
  opcionesPxLista: OpcionPxListaCompetidor[]
): ItemCxPxTiendaParaTabla {
  const costoDux = Number(r.costoCompra) || 0;
  const costoPromedio = calcularCostoPromedioVinculos(candidatos);

  const opcionesProveedor: OpcionCostoCxProdProveedor[] = candidatos.map((c) => ({
    tipo: "proveedor",
    codExt: c.codExt,
    etiqueta: etiquetaProveedorCosto(c.proveedor.prefijo, c.proveedor.nombre),
    costo: costoDesdeCandidato(c.pxCompraFinalSinIva),
  }));

  let seleccion: typeof CX_PROD_SELECCION_PROM | string = CX_PROD_SELECCION_PROM;
  let costoMostrado = costoPromedio ?? costoDux;

  if (
    r.codExtCostoCompra &&
    opcionesProveedor.some((o) => o.codExt === r.codExtCostoCompra)
  ) {
    seleccion = r.codExtCostoCompra;
    const op = opcionesProveedor.find((o) => o.codExt === r.codExtCostoCompra);
    costoMostrado = op && op.costo > 0 ? op.costo : costoDux;
  } else if (opcionesProveedor.length === 1) {
    seleccion = opcionesProveedor[0].codExt;
    costoMostrado =
      opcionesProveedor[0].costo > 0 ? opcionesProveedor[0].costo : costoDux;
  }

  const pxListaTiendaDux = Number(r.pxListaTienda) || 0;

  let seleccionPxLista: typeof PX_LISTA_SELECCION_PROM | string = PX_LISTA_SELECCION_PROM;
  if (
    r.competenciaIdPxLista &&
    opcionesPxLista.some((o) => o.competenciaId === r.competenciaIdPxLista)
  ) {
    seleccionPxLista = r.competenciaIdPxLista;
  } else if (opcionesPxLista.length === 1) {
    seleccionPxLista = opcionesPxLista[0].competenciaId;
  }

  const pxListaCalculado = pxListaMostradoParaSeleccion(
    seleccionPxLista,
    opcionesPxLista,
    pxListaTiendaDux
  );
  const pxListaCxPxRaw = r.pxListaCxPx != null ? Number(r.pxListaCxPx) : null;
  const pxListaCxPxPersistido =
    pxListaCxPxRaw != null && Number.isFinite(pxListaCxPxRaw) && pxListaCxPxRaw > 0
      ? Math.round(pxListaCxPxRaw)
      : null;
  const pxListaMostrado = pxListaCxPxPersistido ?? pxListaCalculado;

  return {
    id: r.codTienda,
    codTienda: r.codTienda,
    descripcion: r.descripcionTienda ?? "",
    codExtCostoCompra: r.codExtCostoCompra,
    costoPromedio,
    opcionesProveedor,
    seleccion,
    costoMostrado,
    pxListaTiendaDux,
    pxListaCxPxPersistido,
    competenciaIdPxLista: r.competenciaIdPxLista,
    opcionesPxLista,
    seleccionPxLista,
    pxListaMostrado,
  };
}

export async function buildItemsCxPxDesdeFilas(
  rows: FilaCxPxDb[],
  competenciasPxLista: CompetenciaPxListaCtx[]
): Promise<ItemCxPxTiendaParaTabla[]> {
  const codTiendas = rows.map((r) => r.codTienda);
  const vinculos =
    codTiendas.length > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: { codTiendaVinculo: { in: codTiendas }, habilitado: true },
          select: {
            codExt: true,
            codTiendaVinculo: true,
            pxCompraFinalSinIva: true,
            proveedor: { select: { nombre: true, prefijo: true } },
          },
          orderBy: [{ proveedor: { nombre: "asc" } }],
        })
      : [];

  const vinculosPorTienda = new Map<string, typeof vinculos>();
  for (const v of vinculos) {
    if (!v.codTiendaVinculo) continue;
    const lista = vinculosPorTienda.get(v.codTiendaVinculo) ?? [];
    lista.push(v);
    vinculosPorTienda.set(v.codTiendaVinculo, lista);
  }

  const opcionesPxListaMap = await buildMapOpcionesPxListaPorCodTienda(
    codTiendas,
    competenciasPxLista
  );

  return rows.map((r) =>
    mapFilaCxPx(
      r,
      vinculosPorTienda.get(r.codTienda) ?? [],
      opcionesPxListaMap.get(r.codTienda) ?? []
    )
  );
}
