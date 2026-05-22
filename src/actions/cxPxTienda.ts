"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { filtroTexto } from "@/lib/busqueda";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/pagination";
import { getCxPxTiendaPageParamsSchema } from "@/lib/validations/cxPxTienda";
import { resolverCostoCxPxParaFila } from "@/services/costoListaTienda.service";

export interface ItemCxPxTiendaParaTabla {
  id: string;
  codTienda: string;
  descripcion: string;
  marca: string | null;
  rubro: string | null;
  subRubro: string | null;
  proveedor: string | null;
  costoCompra: number;
  pxListaTienda: number;
}

async function getCxPxTiendaEmptyOpciones() {
  const [rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: { rubro: { not: null } },
      orderBy: { rubro: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      where: { subRubro: { not: null } },
      orderBy: { subRubro: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: { marca: { not: null } },
      orderBy: { marca: "asc" },
    }),
  ]);

  return {
    items: [] as ItemCxPxTiendaParaTabla[],
    total: 0,
    totalPaginas: 0,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
  };
}

/** Listado paginado de `prod_precios_tienda` para Cx y Px Tienda. */
export async function getCxPxTiendaPageData(params: {
  q?: string;
  rubro?: string;
  subRubro?: string;
  marca?: string;
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

  const { q = "", rubro = "", subRubro = "", marca = "", pagina = "1" } = parsed.data;

  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (rubro) andParts.push({ rubro });
  if (subRubro) andParts.push({ subRubro });
  if (marca) andParts.push({ marca });

  const where: Prisma.ListaPrecioTiendaWhereInput = andParts.length ? { AND: andParts } : {};

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const andPartsOnlyQ: Prisma.ListaPrecioTiendaWhereInput[] = [];
  if (textFilter.AND?.length) andPartsOnlyQ.push(textFilter);
  const whereMarcas: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { marca: { not: null } }] }
    : { marca: { not: null } };
  const whereRubros: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { rubro: { not: null } }] }
    : { rubro: { not: null } };
  const whereSubRubros: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length
    ? { AND: [...andPartsOnlyQ, { subRubro: { not: null } }] }
    : { subRubro: { not: null } };

  const [rows, total, rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where,
      orderBy: [{ descripcionTienda: "asc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        codTienda: true,
        descripcionTienda: true,
        marca: true,
        rubro: true,
        subRubro: true,
        proveedor: true,
        costoCompra: true,
        pxListaTienda: true,
        codExtCostoLista: true,
        costoListaProveedor: {
          select: {
            pxCompraFinalSinIva: true,
            proveedor: { select: { nombre: true, prefijo: true } },
          },
        },
      },
    }),
    prisma.listaPrecioTienda.count({ where }),
    prisma.listaPrecioTienda.findMany({
      select: { rubro: true },
      distinct: ["rubro"],
      where: whereRubros,
      orderBy: { rubro: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      where: whereSubRubros,
      orderBy: { subRubro: "asc" },
    }),
    prisma.listaPrecioTienda.findMany({
      select: { marca: true },
      distinct: ["marca"],
      where: whereMarcas,
      orderBy: { marca: "asc" },
    }),
  ]);

  const items: ItemCxPxTiendaParaTabla[] = await Promise.all(
    rows.map(async (r) => {
      const costo = await resolverCostoCxPxParaFila({
        codTienda: r.codTienda,
        proveedor: r.proveedor,
        costoCompra: r.costoCompra,
        codExtCostoLista: r.codExtCostoLista,
        costoListaProveedor: r.costoListaProveedor,
      });
      return {
        id: r.codTienda,
        codTienda: r.codTienda,
        descripcion: r.descripcionTienda ?? "",
        marca: r.marca,
        rubro: r.rubro,
        subRubro: r.subRubro,
        proveedor: costo.proveedorLabel,
        costoCompra: costo.costoCompra,
        pxListaTienda: Number(r.pxListaTienda),
      };
    })
  );

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return {
    items,
    total,
    totalPaginas,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
  };
}
