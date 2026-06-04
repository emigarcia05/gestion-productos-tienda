import type { Prisma } from "@prisma/client";
import { filtroTexto } from "@/lib/busqueda";
import {
  esFiltroPxPromedioPxListas,
  filtrarItemsPxListasEnMemoria,
  requierePostProcesoPxListas,
  type FiltroPxPromedioPxListas,
} from "@/lib/pxListasFiltros";
import { PAGE_SIZE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getPxListasPageParamsSchema } from "@/lib/validations/pxListas";
import {
  listCompetencias,
  type CompetenciaParaCliente,
} from "@/services/competencia.service";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";
import { buildMapPrecioListaPrincipal } from "@/services/prodTiendaPrecios.service";

type FilaPxListasBase = {
  codTienda: string;
  descripcion: string;
  costoCompra: number;
  pxListaTienda: number;
};

async function filasConPrecioListaPrincipal(
  rows: Array<{
    codTienda: string;
    descripcionTienda: string | null;
    costoCompra: { toString(): string };
  }>
): Promise<FilaPxListasBase[]> {
  const pxMap = await buildMapPrecioListaPrincipal(rows.map((r) => r.codTienda));
  return rows.map((r) => ({
    codTienda: r.codTienda,
    descripcion: r.descripcionTienda ?? "",
    costoCompra: Number(r.costoCompra),
    pxListaTienda: pxMap.get(r.codTienda) ?? 0,
  }));
}

function buildWherePxListas(params: {
  q: string;
  rubro: string;
  marca: string;
}): Prisma.ProdTiendaWhereInput {
  const andParts: Prisma.ProdTiendaWhereInput[] = [];
  const textFilter = filtroTexto(params.q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (params.rubro) andParts.push({ rubro: params.rubro });
  if (params.marca) andParts.push({ marca: params.marca });
  return andParts.length ? { AND: andParts } : {};
}

const selectBase = {
  codTienda: true,
  descripcionTienda: true,
  costoCompra: true,
} as const;

async function getPxListasPageEmpty(): Promise<{
  items: ItemPxListasParaTabla[];
  total: number;
  totalPaginas: number;
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  competencias: CompetenciaParaCliente[];
}> {
  const [marcasDistinct, rubrosDistinct, competencias] = await Promise.all([
    prisma.prodTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: { marca: { not: null } },
      orderBy: { marca: "asc" },
    }),
    prisma.prodTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: { rubro: { not: null } },
      orderBy: { rubro: "asc" },
    }),
    listCompetencias(),
  ]);
  return {
    items: [],
    total: 0,
    totalPaginas: 1,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    competencias,
  };
}

async function listarItemsPxListasPostProcesados(
  where: Prisma.ProdTiendaWhereInput,
  opts: {
    filtroPxPromedio: FiltroPxPromedioPxListas;
    paginaNum: number;
  }
) {
  const rows = await prisma.prodTienda.findMany({
    where,
    select: selectBase,
    orderBy: [{ descripcionTienda: "asc" }],
  });
  const filas = await filasConPrecioListaPrincipal(rows);
  const built = await buildPxListasItemsDesdeFilas(filas);
  let items = filtrarItemsPxListasEnMemoria(built.items, {
    filtroPxPromedio: opts.filtroPxPromedio,
  });
  const total = items.length;
  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);
  const skip = (opts.paginaNum - 1) * PAGE_SIZE;
  items = items.slice(skip, skip + PAGE_SIZE);
  return { items, total, totalPaginas, competencias: built.competencias };
}

export async function getPxListasPageDataFromDb(params: {
  q?: string;
  rubro?: string;
  marca?: string;
  filtroPxPromedio?: string;
  pagina?: string;
}) {
  const parsed = getPxListasPageParamsSchema.safeParse(params);
  if (!parsed.success) {
    return getPxListasPageEmpty();
  }

  const {
    q = "",
    rubro = "",
    marca = "",
    filtroPxPromedio: filtroPxPromedioRaw = "",
    pagina = "1",
  } = parsed.data;

  const filtroPxPromedio: FiltroPxPromedioPxListas = esFiltroPxPromedioPxListas(
    filtroPxPromedioRaw
  )
    ? filtroPxPromedioRaw
    : "";

  const where = buildWherePxListas({ q, rubro, marca });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const postProceso = requierePostProcesoPxListas({ filtroPxPromedio });

  const andPartsOnlyQ: Prisma.ProdTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andPartsOnlyQ.push(textFilter);
  const whereMarcas: Prisma.ProdTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { marca: { not: null } }] }
    : { marca: { not: null } };
  const whereRubros: Prisma.ProdTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { rubro: { not: null } }] }
    : { rubro: { not: null } };

  const [marcasDistinct, rubrosDistinct] = await Promise.all([
    prisma.prodTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: whereMarcas,
      orderBy: { marca: "asc" },
    }),
    prisma.prodTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: whereRubros,
      orderBy: { rubro: "asc" },
    }),
  ]);

  const marcas = marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! }));
  const rubros = rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! }));

  if (postProceso) {
    const { items, total, totalPaginas, competencias } =
      await listarItemsPxListasPostProcesados(where, {
        filtroPxPromedio,
        paginaNum,
      });
    return {
      items,
      total,
      totalPaginas,
      marcas,
      rubros,
      competencias,
    };
  }

  const skip = (paginaNum - 1) * PAGE_SIZE;
  const [rows, total] = await Promise.all([
    prisma.prodTienda.findMany({
      where,
      select: selectBase,
      orderBy: [{ descripcionTienda: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.prodTienda.count({ where }),
  ]);

  const filas = await filasConPrecioListaPrincipal(rows);
  const { items, competencias } = await buildPxListasItemsDesdeFilas(filas);
  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return { items, total, totalPaginas, marcas, rubros, competencias };
}
