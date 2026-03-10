"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";

export type Sucursal = "guaymallen" | "maipu";

export interface ItemStock {
  id:              string;
  codItem:         string;
  descripcion:     string;
  marca:           string | null;
  rubro:           string | null;
  subRubro:        string | null;
  stock:           number;
  ultimaImpresion: Date | null;
}

export interface ControlStockData {
  items:     ItemStock[];
  marcas:    string[];
  rubros:    string[];
  subRubros: string[];
}

export interface GetControlStockParams {
  q?: string;
  marca?: string;
  rubro?: string;
  subRubro?: string;
  soloNegativo?: boolean;
}

/**
 * Datos para Control Stock desde precios_tienda.
 * Filtros: MARCA → marca, RUBRO → rubro, SUB-RUBRO → sub_rubro.
 * Opciones de cada desplegable según docs/FILTROS_DINAMICOS.md (valores que existen con los demás filtros).
 * STOCK = stock_maipu o stock_guaymallen según sucursal.
 */
export async function getControlStock(
  sucursal: Sucursal | null,
  params: GetControlStockParams = {}
): Promise<ControlStockData> {
  if (!sucursal) {
    return { items: [], marcas: [], rubros: [], subRubros: [] };
  }

  const {
    q = "",
    marca = "",
    rubro = "",
    subRubro = "",
    soloNegativo = false,
  } = params;

  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);

  function baseWhere(exclude?: "marca" | "rubro" | "subRubro"): Prisma.ListaPrecioTiendaWhereInput[] {
    const parts: Prisma.ListaPrecioTiendaWhereInput[] = [];
    if (textFilter.AND?.length) parts.push(textFilter);
    if (exclude !== "marca" && marca) parts.push({ marca });
    if (exclude !== "rubro" && rubro) parts.push({ rubro });
    if (exclude !== "subRubro" && subRubro) parts.push({ subRubro });
    if (soloNegativo) {
      parts.push(
        sucursal === "maipu"
          ? { stockMaipu: { lt: 0 } }
          : { stockGuaymallen: { lt: 0 } }
      );
    }
    return parts;
  }

  const whereItems: Prisma.ListaPrecioTiendaWhereInput =
    baseWhere().length > 0 ? { AND: baseWhere() } : {};

  const whereMarcas: Prisma.ListaPrecioTiendaWhereInput =
    baseWhere("marca").length > 0
      ? { AND: [...baseWhere("marca"), { marca: { not: null } }] }
      : { marca: { not: null } };
  const whereRubros: Prisma.ListaPrecioTiendaWhereInput =
    baseWhere("rubro").length > 0
      ? { AND: [...baseWhere("rubro"), { rubro: { not: null } }] }
      : { rubro: { not: null } };
  const whereSubRubros: Prisma.ListaPrecioTiendaWhereInput =
    baseWhere("subRubro").length > 0
      ? { AND: [...baseWhere("subRubro"), { subRubro: { not: null } }] }
      : { subRubro: { not: null } };

  const [rows, marcasDistinct, rubrosDistinct, subRubrosDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where: whereItems,
      orderBy: { descripcionTienda: "asc" },
    }),
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
    prisma.listaPrecioTienda.findMany({
      select: { subRubro: true },
      distinct: ["subRubro"],
      where: whereSubRubros,
      orderBy: { subRubro: "asc" },
    }),
  ]);

  const items: ItemStock[] = rows.map((r) => ({
    id: r.id,
    codItem: r.codTienda,
    descripcion: r.descripcionTienda ?? "",
    marca: r.marca,
    rubro: r.rubro,
    subRubro: r.subRubro,
    stock: sucursal === "maipu" ? r.stockMaipu : r.stockGuaymallen,
    ultimaImpresion: null,
  }));

  return {
    items,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => m.marca!),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => r.rubro!),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => s.subRubro!),
  };
}

export async function registrarImpresion(ids: string[]): Promise<void> {
  // no-op: persistencia de última impresión opcional
}
