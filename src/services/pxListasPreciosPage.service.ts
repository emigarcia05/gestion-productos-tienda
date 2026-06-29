import type { Prisma } from "@prisma/client";
import { filtroTexto } from "@/lib/busqueda";
import { PAGE_SIZE } from "@/lib/pagination";
import type {
  ItemPxListasPreciosTabla,
  ListaPrecioPxListasColumna,
} from "@/lib/pxListasPrecios";
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

function buildWhere(params: {
  q: string;
  rubro: string;
  marca: string;
  subRubro: string;
}): Prisma.ProdTiendaWhereInput {
  const andParts: Prisma.ProdTiendaWhereInput[] = [];
  const textFilter = filtroTexto(params.q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (params.rubro) andParts.push({ rubro: params.rubro });
  if (params.marca) andParts.push({ marca: params.marca });
  if (params.subRubro) andParts.push({ subRubro: params.subRubro });
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

async function cargarMapsPreciosYMargenes(
  codTiendas: string[],
  idListas: number[]
): Promise<{
  duxMap: Map<string, number>;
  margenManualMap: Map<string, number>;
}> {
  const duxMap = new Map<string, number>();
  const margenManualMap = new Map<string, number>();

  if (codTiendas.length === 0 || idListas.length === 0) {
    return { duxMap, margenManualMap };
  }

  const [duxRows, margenRows] = await Promise.all([
    prisma.prodTiendaPrecio.findMany({
      where: { codTienda: { in: codTiendas }, idLista: { in: idListas } },
      select: { codTienda: true, idLista: true, precio: true },
    }),
    prisma.prodTiendaMargenEdicion.findMany({
      where: { codTienda: { in: codTiendas }, idLista: { in: idListas } },
      select: { codTienda: true, idLista: true, margenManual: true },
    }),
  ]);

  for (const r of duxRows) {
    duxMap.set(`${r.codTienda}:${r.idLista}`, Number(r.precio));
  }
  for (const r of margenRows) {
    margenManualMap.set(
      `${r.codTienda}:${r.idLista}`,
      Number(r.margenManual)
    );
  }

  return { duxMap, margenManualMap };
}

function buildItemDesdeFila(
  row: {
    codTienda: string;
    descripcionTienda: string | null;
    costoCompra: { toString(): string };
  },
  listas: ListaPrecioPxListasColumna[],
  duxMap: Map<string, number>,
  margenManualMap: Map<string, number>
): ItemPxListasPreciosTabla {
  const costoCompra = Number(row.costoCompra);
  return {
    codTienda: row.codTienda,
    descripcion: row.descripcionTienda ?? "",
    costoCompra,
    preciosPorLista: listas.map((lista) => {
      const key = `${row.codTienda}:${lista.idLista}`;
      return armarCeldaPrecioPxListas({
        idLista: lista.idLista,
        costoCompra,
        pxDux: duxMap.get(key) ?? null,
        margenManual: margenManualMap.get(key) ?? null,
      });
    }),
  };
}

async function getEmptyPage(q: string) {
  const listas = await listarColumnasListas();
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
    items: [] as ItemPxListasPreciosTabla[],
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
    },
    orderBy: [{ descripcionTienda: "asc" }],
  });

  const codTiendas = rows.map((r) => r.codTienda);
  const { duxMap, margenManualMap } = await cargarMapsPreciosYMargenes(
    codTiendas,
    opts.idListas
  );

  const items = rows
    .map((row) =>
      buildItemDesdeFila(row, opts.listas, duxMap, margenManualMap)
    )
    .filter((item) => filtrarItemPorActualizar(item, opts.actualizar));

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
  pagina?: string;
}) {
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
    pagina = "1",
  } = parsed.data;

  const actualizar: FiltroActualizarPxListas | "" = esFiltroActualizarPxListas(
    actualizarRaw
  )
    ? actualizarRaw
    : "";

  const where = buildWhere({ q, rubro, marca, subRubro });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const postProceso = requierePostProcesoActualizarPxListas({ actualizar });

  const listas = await listarColumnasListas();
  const idListas = listas.map((l) => l.idLista);

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

  if (postProceso && actualizar) {
    const { items, total, totalPaginas } = await listarItemsConFiltroActualizar(
      where,
      { actualizar, paginaNum, listas, idListas }
    );

    return {
      items,
      total,
      totalPaginas,
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
      },
      orderBy: [{ descripcionTienda: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.prodTienda.count({ where }),
  ]);

  const codTiendas = rows.map((r) => r.codTienda);
  const { duxMap, margenManualMap } = await cargarMapsPreciosYMargenes(
    codTiendas,
    idListas
  );

  const items: ItemPxListasPreciosTabla[] = rows.map((row) =>
    buildItemDesdeFila(row, listas, duxMap, margenManualMap)
  );

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return {
    items,
    total,
    totalPaginas,
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
  };
}
