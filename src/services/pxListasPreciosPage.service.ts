import type { Prisma } from "@prisma/client";
import { filtroTexto } from "@/lib/busqueda";
import type { FinAnaMcCategoriaItem } from "@/lib/finAnaMcCategorias";
import { PAGE_SIZE } from "@/lib/pagination";
import type { OpcionCompetenciaRefPxListas, OpcionFiltroPxVinculado } from "@/lib/pxListasCompetenciaRef";
import type {
  ItemPxListasPreciosTabla,
  ListaPrecioPxListasColumna,
} from "@/lib/pxListasPrecios";
import { encontrarIdListaGeneralPxListas } from "@/lib/pxListasPreciosCategoria";
import {
  armarCeldaPrecioPxListas,
  filtrarItemPorActualizar,
} from "@/lib/pxListasPreciosCelda";
import {
  esFiltroActualizarPxListas,
  requierePostProcesoActualizarPxListas,
  type FiltroActualizarPxListas,
} from "@/lib/pxListasPreciosFiltros";
import { prisma } from "@/lib/prisma";
import { getPxListasPreciosPageParamsSchema } from "@/lib/validations/pxListasPrecios";
import {
  asegurarOpcionCompetenciaRefSeleccionada,
  listarOpcionesCompetenciaRefPorCodTiendas,
  listarOpcionesFiltroPxVinculado,
  sincronizarPxGeneralDesdeCompetenciaRef,
} from "@/services/pxListasCompetenciaRef.service";
import { listarFinAnaMcCategorias } from "@/services/finAnaMcCategorias.service";

export type PxListasPreciosPageData = {
  items: ItemPxListasPreciosTabla[];
  total: number;
  totalPaginas: number;
  listas: ListaPrecioPxListasColumna[];
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  subRubros: Array<{ subRubro: string }>;
  /** Opciones del filtro PX VINCULADO (etiqueta = prefijo/abrev. 3 letras). */
  opcionesPxVinculado: OpcionFiltroPxVinculado[];
  /** Rangos `fin_ana_mc_cat` para CATEGORÍA MARGEN (PORC. UTILIDAD de 1 - GENERAL). */
  categoriasMc: FinAnaMcCategoriaItem[];
  /** `idLista` de **1 - GENERAL**; `null` si no existe en el catálogo. */
  idListaGeneral: number | null;
};
function buildWhere(params: {
  q: string;
  rubro: string;
  marca: string;
  subRubro: string;
  pxVinculado: string;
}): Prisma.ProdTiendaWhereInput {
  const andParts: Prisma.ProdTiendaWhereInput[] = [];
  const textFilter = filtroTexto(params.q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (params.rubro) andParts.push({ rubro: params.rubro });
  if (params.marca) andParts.push({ marca: params.marca });
  if (params.subRubro) andParts.push({ subRubro: params.subRubro });
  if (params.pxVinculado) {
    andParts.push({ competenciaIdPxListaGeneral: params.pxVinculado });
  }
  return andParts.length ? { AND: andParts } : {};
}

function whereDistinctOpciones(
  q: string,
  extra: Prisma.ProdTiendaWhereInput
): Prisma.ProdTiendaWhereInput {
  const andParts: Prisma.ProdTiendaWhereInput[] = [extra];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  return { AND: andParts };
}

async function listarColumnasListas(): Promise<ListaPrecioPxListasColumna[]> {
  const rows = await prisma.prodTiendaListaPrecio.findMany({
    orderBy: [{ idLista: "asc" }],
    select: { idLista: true, nombreLista: true },
  });
  return rows.map((r) => ({
    idLista: r.idLista,
    nombreLista: r.nombreLista,
  }));
}

async function cargarMapsPreciosYEdicion(
  codTiendas: string[],
  idListas: number[]
): Promise<{
  duxMap: Map<string, number>;
  pxEdicionMap: Map<string, number>;
}> {
  const duxMap = new Map<string, number>();
  const pxEdicionMap = new Map<string, number>();

  if (codTiendas.length === 0 || idListas.length === 0) {
    return { duxMap, pxEdicionMap };
  }

  const [duxRows, edicionRows] = await Promise.all([
    prisma.prodTiendaPrecio.findMany({
      where: { codTienda: { in: codTiendas }, idLista: { in: idListas } },
      select: { codTienda: true, idLista: true, precio: true },
    }),
    prisma.prodTiendaPrecioEdicion.findMany({
      where: { codTienda: { in: codTiendas }, idLista: { in: idListas } },
      select: { codTienda: true, idLista: true, precio: true },
    }),
  ]);

  for (const r of duxRows) {
    duxMap.set(`${r.codTienda}:${r.idLista}`, Number(r.precio));
  }
  for (const r of edicionRows) {
    pxEdicionMap.set(`${r.codTienda}:${r.idLista}`, Number(r.precio));
  }

  return { duxMap, pxEdicionMap };
}

function buildItemDesdeFila(
  row: {
    codTienda: string;
    descripcionTienda: string | null;
    costoCompra: { toString(): string };
    competenciaIdPxListaGeneral: string | null;
  },
  listas: ListaPrecioPxListasColumna[],
  duxMap: Map<string, number>,
  pxEdicionMap: Map<string, number>,
  opcionesPorCod: Map<string, OpcionCompetenciaRefPxListas[]>
): ItemPxListasPreciosTabla {
  const costoCompra = Number(row.costoCompra);
  return {
    codTienda: row.codTienda,
    descripcion: row.descripcionTienda ?? "",
    costoCompra,
    competenciaIdPxListaGeneral: row.competenciaIdPxListaGeneral,
    opcionesCompetenciaRef: opcionesPorCod.get(row.codTienda) ?? [],
    preciosPorLista: listas.map((lista) => {
      const key = `${row.codTienda}:${lista.idLista}`;
      return armarCeldaPrecioPxListas({
        idLista: lista.idLista,
        costoCompra,
        pxDux: duxMap.get(key) ?? null,
        pxEdicion: pxEdicionMap.get(key) ?? null,
      });
    }),
  };
}

async function enriquecerItemsPxListas(
  rows: Array<{
    codTienda: string;
    descripcionTienda: string | null;
    costoCompra: { toString(): string };
    competenciaIdPxListaGeneral: string | null;
  }>,
  listas: ListaPrecioPxListasColumna[],
  idListas: number[]
): Promise<ItemPxListasPreciosTabla[]> {
  const codTiendas = rows.map((r) => r.codTienda);
  await sincronizarPxGeneralDesdeCompetenciaRef(codTiendas);
  const [{ duxMap, pxEdicionMap }, opcionesPorCod] = await Promise.all([
    cargarMapsPreciosYEdicion(codTiendas, idListas),
    listarOpcionesCompetenciaRefPorCodTiendas(codTiendas),
  ]);
  await asegurarOpcionCompetenciaRefSeleccionada(opcionesPorCod, rows);
  return rows.map((row) =>
    buildItemDesdeFila(row, listas, duxMap, pxEdicionMap, opcionesPorCod)
  );
}

async function getEmptyPage(q: string): Promise<PxListasPreciosPageData> {
  const [listas, categoriasMc, opcionesPxVinculado] = await Promise.all([
    listarColumnasListas(),
    listarFinAnaMcCategorias(),
    listarOpcionesFiltroPxVinculado(),
  ]);
  const [marcasDistinct, rubrosDistinct, subRubrosDistinct] = await Promise.all([
    prisma.prodTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: whereDistinctOpciones(q, { marca: { not: null } }),
      orderBy: { marca: "asc" },
    }),
    prisma.prodTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: whereDistinctOpciones(q, { rubro: { not: null } }),
      orderBy: { rubro: "asc" },
    }),
    prisma.prodTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      where: whereDistinctOpciones(q, { subRubro: { not: null } }),
      orderBy: { subRubro: "asc" },
    }),
  ]);

  return {
    items: [],
    total: 0,
    totalPaginas: 1,
    listas,
    marcas: marcasDistinct
      .filter((m) => m.marca != null)
      .map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct
      .filter((r) => r.rubro != null)
      .map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct
      .filter((s) => s.subRubro != null)
      .map((s) => ({ subRubro: s.subRubro! })),
    opcionesPxVinculado,
    categoriasMc,
    idListaGeneral: encontrarIdListaGeneralPxListas(listas),
  };
}

async function listarItemsConFiltroActualizar(
  where: Prisma.ProdTiendaWhereInput,
  opts: {
    actualizar: FiltroActualizarPxListas;
    paginaNum: number;
    listas: ListaPrecioPxListasColumna[];
    idListas: number[];
  }
) {
  const rows = await prisma.prodTienda.findMany({
    where,
    select: {
      codTienda: true,
      descripcionTienda: true,
      costoCompra: true,
      competenciaIdPxListaGeneral: true,
    },
    orderBy: [{ descripcionTienda: "asc" }],
  });

  const items = (await enriquecerItemsPxListas(rows, opts.listas, opts.idListas)).filter(
    (item) => filtrarItemPorActualizar(item, opts.actualizar)
  );

  const total = items.length;
  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);
  const skip = (opts.paginaNum - 1) * PAGE_SIZE;

  return {
    items: items.slice(skip, skip + PAGE_SIZE),
    total,
    totalPaginas,
  };
}

export async function getPxListasPreciosPageDataFromDb(params: {
  q?: string;
  rubro?: string;
  marca?: string;
  subRubro?: string;
  actualizar?: string;
  pxVinculado?: string;
  pagina?: string;
}): Promise<PxListasPreciosPageData> {
  const parsed = getPxListasPreciosPageParamsSchema.safeParse(params);
  if (!parsed.success) {
    return getEmptyPage("");
  }

  const {
    q = "",
    rubro = "",
    marca = "",
    subRubro = "",
    actualizar: actualizarRaw = "",
    pxVinculado = "",
    pagina = "1",
  } = parsed.data;

  const actualizar: FiltroActualizarPxListas | "" = esFiltroActualizarPxListas(
    actualizarRaw
  )
    ? actualizarRaw
    : "";

  const where = buildWhere({ q, rubro, marca, subRubro, pxVinculado });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const postProceso = requierePostProcesoActualizarPxListas({ actualizar });

  const [listas, categoriasMc, opcionesPxVinculado] = await Promise.all([
    listarColumnasListas(),
    listarFinAnaMcCategorias(),
    listarOpcionesFiltroPxVinculado(),
  ]);
  const idListas = listas.map((l) => l.idLista);
  const idListaGeneral = encontrarIdListaGeneralPxListas(listas);

  const [marcasDistinct, rubrosDistinct, subRubrosDistinct] = await Promise.all([
    prisma.prodTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: whereDistinctOpciones(q, { marca: { not: null } }),
      orderBy: { marca: "asc" },
    }),
    prisma.prodTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: whereDistinctOpciones(q, { rubro: { not: null } }),
      orderBy: { rubro: "asc" },
    }),
    prisma.prodTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      where: whereDistinctOpciones(q, { subRubro: { not: null } }),
      orderBy: { subRubro: "asc" },
    }),
  ]);

  const metaFiltros = {
    listas,
    marcas: marcasDistinct
      .filter((m) => m.marca != null)
      .map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct
      .filter((r) => r.rubro != null)
      .map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct
      .filter((s) => s.subRubro != null)
      .map((s) => ({ subRubro: s.subRubro! })),
    opcionesPxVinculado,
    categoriasMc,
    idListaGeneral,
  };

  if (postProceso && actualizar) {
    const { items, total, totalPaginas } = await listarItemsConFiltroActualizar(
      where,
      { actualizar, paginaNum, listas, idListas }
    );

    return {
      items,
      total,
      totalPaginas,
      ...metaFiltros,
    };
  }

  const skip = (paginaNum - 1) * PAGE_SIZE;

  const [rows, total] = await Promise.all([
    prisma.prodTienda.findMany({
      where,
      select: {
        codTienda: true,
        descripcionTienda: true,
        costoCompra: true,
        competenciaIdPxListaGeneral: true,
      },
      orderBy: [{ descripcionTienda: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.prodTienda.count({ where }),
  ]);

  const items: ItemPxListasPreciosTabla[] = await enriquecerItemsPxListas(
    rows,
    listas,
    idListas
  );

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return {
    items,
    total,
    totalPaginas,
    ...metaFiltros,
  };
}
