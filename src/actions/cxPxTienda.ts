"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { filtroTexto } from "@/lib/busqueda";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/pagination";
import { getCxPxTiendaPageParamsSchema } from "@/lib/validations/cxPxTienda";
import { listaPreciosCodTiendaSchema, prismaCuidSchema } from "@/lib/validations/common";
import { z } from "zod";
import {
  CX_PROD_SELECCION_PROM,
  MARCACION_ORDEN_MAYOR_MENOR,
  MARCACION_ORDEN_MENOR_MAYOR,
  PX_LISTA_SELECCION_PROM,
  VINC_COSTO_MAS,
  VINC_COSTO_SIN,
  VINC_COSTO_UNO,
  marcacionCxPxDeItem,
  type CompetenciaCxPxFiltro,
  type ItemCxPxTiendaParaTabla,
  type MarcacionOrdenCxPx,
  type OpcionCostoCxProdProveedor,
  type ProveedorCxPxFiltro,
} from "@/lib/cxPxTienda";
import {
  calcularCostoPromedioVinculos,
  costoDesdeCandidato,
  establecerCodExtCostoLista,
  etiquetaProveedorCosto,
  limpiarCodExtCostoLista,
  listarCandidatosCostoPorCodTienda,
} from "@/services/costoListaTienda.service";
import { listarFilasExportCostoCxDiff } from "@/services/exportCostoCxDiff.service";
import type { FilaExportCostoCx } from "@/services/exportCostoCxDiff.service";
import {
  buildMapOpcionesPxListaPorCodTienda,
  calcularPxPromedioCompetencia,
  establecerCompetenciaIdPxLista,
  etiquetaCompetidorPxLista,
  limpiarCompetenciaIdPxLista,
  pxListaMostradoParaSeleccion,
  validarCompetenciaPxLista,
  type CompetenciaPxListaCtx,
} from "@/services/pxListaCxPxTienda.service";

async function listarProveedoresCxPxFiltro(): Promise<ProveedorCxPxFiltro[]> {
  const rows = await prisma.proveedor.findMany({
    where: {
      proveedorMercaderia: true,
      listaPrecios: {
        some: { habilitado: true, codTiendaVinculo: { not: null } },
      },
    },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, prefijo: true },
  });
  return rows.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    prefijo: p.prefijo ?? "",
  }));
}

async function whereFiltroVincCosto(
  vincCosto: string
): Promise<Prisma.ListaPrecioTiendaWhereInput | undefined> {
  if (vincCosto === VINC_COSTO_SIN) {
    return { listaPreciosProveedores: { none: { habilitado: true } } };
  }
  if (vincCosto !== VINC_COSTO_UNO && vincCosto !== VINC_COSTO_MAS) {
    return undefined;
  }
  const grouped = await prisma.listaPrecioProveedor.groupBy({
    by: ["codTiendaVinculo"],
    where: { habilitado: true, codTiendaVinculo: { not: null } },
    _count: { codExt: true },
  });
  const codTiendas = grouped
    .filter((g) => {
      if (!g.codTiendaVinculo) return false;
      const n = g._count.codExt;
      return vincCosto === VINC_COSTO_UNO ? n === 1 : n >= 2;
    })
    .map((g) => g.codTiendaVinculo as string);
  return { codTienda: { in: codTiendas } };
}

function mapCompetenciasCxPxFiltro(
  competencias: CompetenciaPxListaCtx[]
): CompetenciaCxPxFiltro[] {
  return competencias.map((c) => ({
    id: c.id,
    etiqueta: etiquetaCompetidorPxLista(c.prefijoProveedor, c.nombre),
  }));
}

async function getCxPxTiendaEmptyOpciones() {
  const [marcasDistinct, proveedores, competenciasPxLista] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: { marca: { not: null } },
      orderBy: { marca: "asc" },
    }),
    listarProveedoresCxPxFiltro(),
    listarCompetenciasPxListaCtx(),
  ]);

  return {
    items: [] as ItemCxPxTiendaParaTabla[],
    total: 0,
    totalPaginas: 0,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    proveedores,
    competencias: mapCompetenciasCxPxFiltro(competenciasPxLista),
  };
}

const filaCxPxSelect = {
  codTienda: true,
  descripcionTienda: true,
  costoCompra: true,
  codExtCostoLista: true,
  pxListaTienda: true,
  competenciaIdPxLista: true,
} as const;

type FilaCxPxDb = {
  codTienda: string;
  descripcionTienda: string | null;
  costoCompra: unknown;
  codExtCostoLista: string | null;
  pxListaTienda: unknown;
  competenciaIdPxLista: string | null;
};

async function buildItemsCxPxDesdeFilas(
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

function ordenarItemsPorMarcacion(
  items: ItemCxPxTiendaParaTabla[],
  marcacionOrden: MarcacionOrdenCxPx
): void {
  const asc = marcacionOrden === MARCACION_ORDEN_MENOR_MAYOR;
  items.sort((a, b) => {
    const ma = marcacionCxPxDeItem(a);
    const mb = marcacionCxPxDeItem(b);
    const aNull = ma == null;
    const bNull = mb == null;
    if (aNull && bNull) {
      return a.descripcion.localeCompare(b.descripcion, "es");
    }
    if (aNull) return 1;
    if (bNull) return -1;
    const diff = asc ? ma - mb : mb - ma;
    if (diff !== 0) return diff;
    return a.descripcion.localeCompare(b.descripcion, "es");
  });
}

async function listarCompetenciasPxListaCtx(): Promise<CompetenciaPxListaCtx[]> {
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

function mapFilaCxPx(
  r: {
    codTienda: string;
    descripcionTienda: string | null;
    costoCompra: unknown;
    codExtCostoLista: string | null;
    pxListaTienda: unknown;
    competenciaIdPxLista: string | null;
  },
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
    r.codExtCostoLista &&
    opcionesProveedor.some((o) => o.codExt === r.codExtCostoLista)
  ) {
    seleccion = r.codExtCostoLista;
    const op = opcionesProveedor.find((o) => o.codExt === r.codExtCostoLista);
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

  const pxListaMostrado = pxListaMostradoParaSeleccion(
    seleccionPxLista,
    opcionesPxLista,
    pxListaTiendaDux
  );

  return {
    id: r.codTienda,
    codTienda: r.codTienda,
    descripcion: r.descripcionTienda ?? "",
    codExtCostoLista: r.codExtCostoLista,
    costoPromedio,
    opcionesProveedor,
    seleccion,
    costoMostrado,
    pxListaTiendaDux,
    competenciaIdPxLista: r.competenciaIdPxLista,
    opcionesPxLista,
    seleccionPxLista,
    pxListaMostrado,
  };
}

/** Listado paginado de `prod_precios_tienda` para Cx & Px Tienda. */
export async function getCxPxTiendaPageData(params: {
  q?: string;
  marca?: string;
  vincCosto?: string;
  costoProv?: string;
  pxLista?: string;
  marcacionOrden?: string;
  pagina?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return getCxPxTiendaEmptyOpciones();
  }

  const parsed = getCxPxTiendaPageParamsSchema.safeParse(params);
  if (!parsed.success) {
    return getCxPxTiendaEmptyOpciones();
  }

  const {
    q = "",
    marca = "",
    vincCosto = "",
    costoProv = "",
    pxLista = "",
    marcacionOrden = "",
    pagina = "1",
  } = parsed.data;

  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (marca) andParts.push({ marca });

  if (vincCosto) {
    const vincWhere = await whereFiltroVincCosto(vincCosto);
    if (vincWhere) andParts.push(vincWhere);
  }

  if (costoProv === CX_PROD_SELECCION_PROM) {
    andParts.push({ codExtCostoLista: null });
  } else if (costoProv) {
    andParts.push({
      codExtCostoLista: { not: null },
      costoListaProveedor: {
        idProveedor: costoProv,
        habilitado: true,
      },
    });
  }

  if (pxLista === PX_LISTA_SELECCION_PROM) {
    andParts.push({ competenciaIdPxLista: null });
  } else if (pxLista) {
    andParts.push({ competenciaIdPxLista: pxLista });
  }

  const where: Prisma.ListaPrecioTiendaWhereInput = andParts.length ? { AND: andParts } : {};

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const andPartsOnlyQ: Prisma.ListaPrecioTiendaWhereInput[] = [];
  if (textFilter.AND?.length) andPartsOnlyQ.push(textFilter);
  const whereMarcas: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { marca: { not: null } }] }
    : { marca: { not: null } };

  const ordenMarcacion =
    marcacionOrden === MARCACION_ORDEN_MENOR_MAYOR ||
    marcacionOrden === MARCACION_ORDEN_MAYOR_MENOR;

  const [marcasDistinct, proveedores, competenciasPxLista] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: whereMarcas,
      orderBy: { marca: "asc" },
    }),
    listarProveedoresCxPxFiltro(),
    listarCompetenciasPxListaCtx(),
  ]);

  const competencias = mapCompetenciasCxPxFiltro(competenciasPxLista);

  let items: ItemCxPxTiendaParaTabla[];
  let total: number;

  if (ordenMarcacion) {
    const allRows = await prisma.listaPrecioTienda.findMany({
      where,
      select: filaCxPxSelect,
    });
    items = await buildItemsCxPxDesdeFilas(allRows, competenciasPxLista);
    ordenarItemsPorMarcacion(items, marcacionOrden as MarcacionOrdenCxPx);
    total = items.length;
    items = items.slice(skip, skip + PAGE_SIZE);
  } else {
    const [rows, totalCount] = await Promise.all([
      prisma.listaPrecioTienda.findMany({
        where,
        orderBy: [{ descripcionTienda: "asc" }],
        skip,
        take: PAGE_SIZE,
        select: filaCxPxSelect,
      }),
      prisma.listaPrecioTienda.count({ where }),
    ]);
    items = await buildItemsCxPxDesdeFilas(rows, competenciasPxLista);
    total = totalCount;
  }

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return {
    items,
    total,
    totalPaginas,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    proveedores,
    competencias,
  };
}

const guardarCostoCxProdSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  seleccion: z.union([z.literal(CX_PROD_SELECCION_PROM), z.string().min(1).max(128)]),
});

/** Persiste costo Cx prod.: proveedor → `cod_ext_costo_lista`; Cx. Prom. → limpia FK (solo promedio en UI). */
export async function guardarCostoCxProdTiendaAction(
  raw: unknown
): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = guardarCostoCxProdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { codTienda, seleccion } = parsed.data;

  if (seleccion === CX_PROD_SELECCION_PROM) {
    const res = await limpiarCodExtCostoLista(codTienda);
    if (!res.success) return { ok: false, error: res.error };
  } else {
    const res = await establecerCodExtCostoLista(codTienda, seleccion);
    if (!res.success) return { ok: false, error: res.error };
  }

  revalidatePath("/gestion-productos/tienda/cx-px-tienda");
  revalidatePath("/tienda/cx-px");
  return { ok: true, data: undefined };
}

const guardarPxListaSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  seleccion: z.union([z.literal(PX_LISTA_SELECCION_PROM), prismaCuidSchema]),
});

/** Persiste px lista: competidor → `competencia_id_px_lista`; Px. Prom. → limpia FK. */
export async function guardarPxListaTiendaAction(
  raw: unknown
): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = guardarPxListaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { codTienda, seleccion } = parsed.data;

  if (seleccion === PX_LISTA_SELECCION_PROM) {
    const res = await limpiarCompetenciaIdPxLista(codTienda);
    if (!res.success) return { ok: false, error: res.error };
  } else {
    const competencias = await listarCompetenciasPxListaCtx();
    const valid = await validarCompetenciaPxLista(codTienda, seleccion, competencias);
    if (!valid.ok) return { ok: false, error: valid.error };
    const res = await establecerCompetenciaIdPxLista(codTienda, seleccion);
    if (!res.success) return { ok: false, error: res.error };
  }

  revalidatePath("/gestion-productos/tienda/cx-px-tienda");
  revalidatePath("/tienda/cx-px");
  return { ok: true, data: undefined };
}

/** Excel CODIGO + COSTO: solo filas con `costo_compra` ≠ costo de `cod_ext_costo_lista`. */
export async function exportarCostoCxDiffAction(): Promise<
  ActionResult<{ filas: FilaExportCostoCx[] }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  try {
    const filas = await listarFilasExportCostoCxDiff();
    return { ok: true, data: { filas } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo generar la exportación.",
    };
  }
}
