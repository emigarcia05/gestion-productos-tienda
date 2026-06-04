import type { Prisma } from "@prisma/client";
import { calcMargenSinIvaPct } from "@/lib/calculos";
import { filtroTexto } from "@/lib/busqueda";
import { PAGE_SIZE } from "@/lib/pagination";
import type {
  ItemPxListasPreciosTabla,
  ListaPrecioPxListasColumna,
  PrecioListaPxListasCelda,
} from "@/lib/pxListasPrecios";
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

function armarCeldasPrecio(
  codTienda: string,
  listas: ListaPrecioPxListasColumna[],
  costoCompra: number,
  duxMap: Map<string, number>,
  edicionMap: Map<string, number>
): PrecioListaPxListasCelda[] {
  return listas.map((lista) => {
    const key = `${codTienda}:${lista.idLista}`;
    const pxDux = duxMap.get(key) ?? null;
    const pxEdicion = edicionMap.get(key) ?? null;
    const pxEfectivo = pxEdicion ?? pxDux;
    const margenPct =
      pxEfectivo != null && pxEfectivo > 0
        ? calcMargenSinIvaPct(pxEfectivo, costoCompra)
        : null;
    return {
      idLista: lista.idLista,
      pxDux,
      pxEdicion,
      pxEfectivo,
      margenPct,
    };
  });
}

async function cargarMapsPrecios(
  codTiendas: string[],
  idListas: number[]
): Promise<{ duxMap: Map<string, number>; edicionMap: Map<string, number> }> {
  const duxMap = new Map<string, number>();
  const edicionMap = new Map<string, number>();

  if (codTiendas.length === 0 || idListas.length === 0) {
    return { duxMap, edicionMap };
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
    edicionMap.set(`${r.codTienda}:${r.idLista}`, Number(r.precio));
  }

  return { duxMap, edicionMap };
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

export async function getPxListasPreciosPageDataFromDb(params: {
  q?: string;
  rubro?: string;
  marca?: string;
  subRubro?: string;
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
    pagina = "1",
  } = parsed.data;

  const where = buildWhere({ q, rubro, marca, subRubro });
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const listas = await listarColumnasListas();
  const idListas = listas.map((l) => l.idLista);

  const [marcasDistinct, rubrosDistinct, subRubrosDistinct, rows, total] =
    await Promise.all([
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
  const { duxMap, edicionMap } = await cargarMapsPrecios(codTiendas, idListas);

  const items: ItemPxListasPreciosTabla[] = rows.map((r) => ({
    codTienda: r.codTienda,
    descripcion: r.descripcionTienda ?? "",
    costoCompra: Number(r.costoCompra),
    preciosPorLista: armarCeldasPrecio(
      r.codTienda,
      listas,
      Number(r.costoCompra),
      duxMap,
      edicionMap
    ),
  }));

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
