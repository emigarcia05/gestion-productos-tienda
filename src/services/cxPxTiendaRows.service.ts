import { prisma } from "@/lib/prisma";
import {
  CX_PROD_SELECCION_PROM,
  PX_LISTA_SELECCION_PROM,
  type CxProdDatosFila,
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
  cxPxCxCodExt: true,
  pxListaTienda: true,
  pxListaCxPx: true,
  cxPxPxCompRef: true,
} as const;

export type FilaCxPxDb = {
  codTienda: string;
  descripcionTienda: string | null;
  costoCompra: unknown;
  cxPxCxCodExt: string | null;
  pxListaTienda: unknown;
  pxListaCxPx: unknown;
  cxPxPxCompRef: string | null;
};

export type FilaCxProdDb = Pick<FilaCxPxDb, "codTienda" | "costoCompra" | "cxPxCxCodExt">;

type CandidatoCostoVinculo = Awaited<
  ReturnType<typeof listarCandidatosCostoPorCodTienda>
>[number];

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

async function cargarVinculosCostoPorCodTienda(codTiendas: string[]) {
  if (codTiendas.length === 0) return new Map<string, CandidatoCostoVinculo[]>();

  const vinculos = await prisma.listaPrecioProveedor.findMany({
    where: { codTiendaVinculo: { in: codTiendas }, habilitado: true },
    select: {
      codExt: true,
      codTiendaVinculo: true,
      pxCompraFinalSinIva: true,
      proveedor: { select: { nombre: true, prefijo: true } },
    },
    orderBy: [{ proveedor: { nombre: "asc" } }],
  });

  const vinculosPorTienda = new Map<string, CandidatoCostoVinculo[]>();
  for (const v of vinculos) {
    if (!v.codTiendaVinculo) continue;
    const lista = vinculosPorTienda.get(v.codTiendaVinculo) ?? [];
    lista.push(v);
    vinculosPorTienda.set(v.codTiendaVinculo, lista);
  }
  return vinculosPorTienda;
}

/** Mapeo compartido de CX PROD. (Comp. Proveedores + Cx & Px Tienda). */
export function mapCxProdDesdeCandidatos(
  costoCompra: unknown,
  cxPxCxCodExt: string | null,
  candidatos: CandidatoCostoVinculo[]
): CxProdDatosFila {
  const costoDux = Number(costoCompra) || 0;
  const costoPromedio = calcularCostoPromedioVinculos(candidatos);

  const opcionesProveedor: OpcionCostoCxProdProveedor[] = candidatos.map((c) => ({
    tipo: "proveedor",
    codExt: c.codExt,
    etiqueta: etiquetaProveedorCosto(c.proveedor.prefijo, c.proveedor.nombre),
    costo: costoDesdeCandidato(c.pxCompraFinalSinIva),
  }));

  let seleccion: typeof CX_PROD_SELECCION_PROM | string = CX_PROD_SELECCION_PROM;
  let costoMostrado = costoPromedio ?? costoDux;

  if (cxPxCxCodExt && opcionesProveedor.some((o) => o.codExt === cxPxCxCodExt)) {
    seleccion = cxPxCxCodExt;
    const op = opcionesProveedor.find((o) => o.codExt === cxPxCxCodExt);
    costoMostrado = op && op.costo > 0 ? op.costo : costoDux;
  } else if (opcionesProveedor.length === 1) {
    seleccion = opcionesProveedor[0].codExt;
    costoMostrado =
      opcionesProveedor[0].costo > 0 ? opcionesProveedor[0].costo : costoDux;
  }

  return {
    opcionesProveedor,
    seleccion,
    costoPromedio,
    costoMostrado,
  };
}

/** CX PROD. por `cod_tienda` sin cargar competencias ni px lista. */
export async function buildCxProdMapDesdeFilas(
  rows: FilaCxProdDb[]
): Promise<Map<string, CxProdDatosFila>> {
  const vinculosPorTienda = await cargarVinculosCostoPorCodTienda(
    rows.map((r) => r.codTienda)
  );
  const map = new Map<string, CxProdDatosFila>();
  for (const r of rows) {
    map.set(
      r.codTienda,
      mapCxProdDesdeCandidatos(
        r.costoCompra,
        r.cxPxCxCodExt,
        vinculosPorTienda.get(r.codTienda) ?? []
      )
    );
  }
  return map;
}

export function mapFilaCxPx(
  r: FilaCxPxDb,
  candidatos: CandidatoCostoVinculo[],
  opcionesPxLista: OpcionPxListaCompetidor[]
): ItemCxPxTiendaParaTabla {
  const cxProd = mapCxProdDesdeCandidatos(r.costoCompra, r.cxPxCxCodExt, candidatos);
  const pxListaTiendaDux = Number(r.pxListaTienda) || 0;

  let seleccionPxLista: typeof PX_LISTA_SELECCION_PROM | string = PX_LISTA_SELECCION_PROM;
  if (
    r.cxPxPxCompRef &&
    opcionesPxLista.some((o) => o.competenciaId === r.cxPxPxCompRef)
  ) {
    seleccionPxLista = r.cxPxPxCompRef;
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
    cxPxCxCodExt: r.cxPxCxCodExt,
    ...cxProd,
    pxListaTiendaDux,
    pxListaCxPxPersistido,
    cxPxPxCompRef: r.cxPxPxCompRef,
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
  const vinculosPorTienda = await cargarVinculosCostoPorCodTienda(codTiendas);

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
