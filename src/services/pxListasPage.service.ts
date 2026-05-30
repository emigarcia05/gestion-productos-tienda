import type { Prisma } from "@prisma/client";
import { filtroTexto } from "@/lib/busqueda";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";
import {
  esDetPrecioFiltroManual,
  esFiltroPxPromedioPxListas,
  esOrdenMarcacionPxListas,
  filtrarItemsPxListasEnMemoria,
  ORDEN_MARCACION_DESC,
  requierePostProcesoPxListas,
  type FiltroPxPromedioPxListas,
  type OrdenMarcacionPxListas,
} from "@/lib/pxListasFiltros";
import { PAGE_SIZE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { prismaCuidSchema } from "@/lib/validations/common";
import { getPxListasPageParamsSchema } from "@/lib/validations/pxListas";
import {
  listCompetencias,
  type CompetenciaParaCliente,
} from "@/services/competencia.service";
import { buildPxListasItemsDesdeFilas } from "@/services/pxListasRows.service";
import { obtenerMapPxListaConfig } from "@/services/pxListasConfig.service";

export type CompetidorFiltroPxListas = {
  id: string;
  nombre: string;
};

type FilaPxListasBase = {
  codTienda: string;
  descripcion: string;
  costoCompra: number;
};

function buildWherePxListas(params: {
  q: string;
  rubro: string;
  marca: string;
  detPrecio: string;
}): Prisma.ListaPrecioTiendaWhereInput {
  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(params.q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (params.rubro) andParts.push({ rubro: params.rubro });
  if (params.marca) andParts.push({ marca: params.marca });
  if (esDetPrecioFiltroManual(params.detPrecio)) {
    return andParts.length ? { AND: andParts } : {};
  }
  const detPrecioParsed = prismaCuidSchema.safeParse(params.detPrecio);
  if (detPrecioParsed.success) {
    andParts.push({
      preciosCompetencia: { some: { competenciaId: detPrecioParsed.data } },
    });
  }
  return andParts.length ? { AND: andParts } : {};
}

async function listarCompetidoresFiltroDetPrecio(): Promise<CompetidorFiltroPxListas[]> {
  const rows = await prisma.prodCompetencia.findMany({
    where: { precios: { some: {} } },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return rows;
}

function compareItemsPorMarcacion(
  a: ItemPxListasParaTabla,
  b: ItemPxListasParaTabla,
  orden: OrdenMarcacionPxListas
): number {
  const desc = orden === ORDEN_MARCACION_DESC;
  const ma = a.marcacion;
  const mb = b.marcacion;
  if (ma == null && mb == null) {
    return a.descripcion.localeCompare(b.descripcion, "es");
  }
  if (ma == null) return 1;
  if (mb == null) return -1;
  const diff = desc ? mb - ma : ma - mb;
  if (diff !== 0) return diff;
  return a.descripcion.localeCompare(b.descripcion, "es");
}

async function getPxListasPageEmpty(): Promise<{
  items: ItemPxListasParaTabla[];
  total: number;
  totalPaginas: number;
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  competidores: CompetidorFiltroPxListas[];
  competencias: CompetenciaParaCliente[];
}> {
  const [marcasDistinct, rubrosDistinct, competidores, competencias] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: { marca: { not: null } },
      orderBy: { marca: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: { rubro: { not: null } },
      orderBy: { rubro: "asc" },
    }),
    listarCompetidoresFiltroDetPrecio(),
    listCompetencias(),
  ]);
  return {
    items: [],
    total: 0,
    totalPaginas: 1,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    competidores,
    competencias,
  };
}

async function listarItemsPxListasPostProcesados(
  where: Prisma.ListaPrecioTiendaWhereInput,
  opts: {
    detPrecio: string;
    filtroPxPromedio: FiltroPxPromedioPxListas;
    ordenMarcacion: OrdenMarcacionPxListas;
    paginaNum: number;
  }
) {
  const selectBase = {
    codTienda: true,
    descripcionTienda: true,
    costoCompra: true,
  } as const;

  const rows = await prisma.listaPrecioTienda.findMany({
    where,
    select: selectBase,
    orderBy: [{ descripcionTienda: "asc" }],
  });
  const filas: FilaPxListasBase[] = rows.map((r) => ({
    codTienda: r.codTienda,
    descripcion: r.descripcionTienda ?? "",
    costoCompra: Number(r.costoCompra),
  }));
  const configMap = await obtenerMapPxListaConfig(filas.map((f) => f.codTienda));
  const built = await buildPxListasItemsDesdeFilas(filas, configMap);
  let items = filtrarItemsPxListasEnMemoria(built.items, {
    detPrecio: opts.detPrecio,
    filtroPxPromedio: opts.filtroPxPromedio,
  });
  if (opts.ordenMarcacion) {
    items = [...items].sort((a, b) =>
      compareItemsPorMarcacion(a, b, opts.ordenMarcacion)
    );
  }
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
  detPrecio?: string;
  filtroPxPromedio?: string;
  ordenMarcacion?: string;
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
    detPrecio = "",
    filtroPxPromedio: filtroPxPromedioRaw = "",
    ordenMarcacion: ordenMarcacionRaw = "",
    pagina = "1",
  } = parsed.data;

  const ordenMarcacion: OrdenMarcacionPxListas = esOrdenMarcacionPxListas(ordenMarcacionRaw)
    ? ordenMarcacionRaw
    : "";
  const filtroPxPromedio: FiltroPxPromedioPxListas = esFiltroPxPromedioPxListas(
    filtroPxPromedioRaw
  )
    ? filtroPxPromedioRaw
    : "";

  const where = buildWherePxListas({ q, rubro, marca, detPrecio });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const postProceso = requierePostProcesoPxListas({
    ordenMarcacion,
    detPrecio,
    filtroPxPromedio,
  });

  const andPartsOnlyQ: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andPartsOnlyQ.push(textFilter);
  const whereMarcas: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { marca: { not: null } }] }
    : { marca: { not: null } };
  const whereRubros: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { rubro: { not: null } }] }
    : { rubro: { not: null } };

  const [competidores, marcasDistinct, rubrosDistinct] = await Promise.all([
    listarCompetidoresFiltroDetPrecio(),
    prisma.listaPrecioTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: whereMarcas,
      orderBy: { marca: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: whereRubros,
      orderBy: { rubro: "asc" },
    }),
  ]);

  const marcas = marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! }));
  const rubros = rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! }));

  const selectBase = {
    codTienda: true,
    descripcionTienda: true,
    costoCompra: true,
  } as const;

  if (postProceso) {
    const { items, total, totalPaginas, competencias } =
      await listarItemsPxListasPostProcesados(where, {
        detPrecio,
        filtroPxPromedio,
        ordenMarcacion,
        paginaNum,
      });
    return {
      items,
      total,
      totalPaginas,
      marcas,
      rubros,
      competidores,
      competencias,
    };
  }

  const skip = (paginaNum - 1) * PAGE_SIZE;
  const [rows, total] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where,
      select: selectBase,
      orderBy: [{ descripcionTienda: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.listaPrecioTienda.count({ where }),
  ]);

  const filas: FilaPxListasBase[] = rows.map((r) => ({
    codTienda: r.codTienda,
    descripcion: r.descripcionTienda ?? "",
    costoCompra: Number(r.costoCompra),
  }));
  const configMap = await obtenerMapPxListaConfig(filas.map((f) => f.codTienda));
  const { items, competencias } = await buildPxListasItemsDesdeFilas(filas, configMap);
  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return { items, total, totalPaginas, marcas, rubros, competidores, competencias };
}
