"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";
import { PAGE_SIZE } from "@/lib/pagination";

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
  items:         ItemStock[];
  total:         number;
  totalPaginas:  number;
  marcas:        string[];
  rubros:        string[];
  subRubros:     string[];
}

export interface GetControlStockParams {
  q?: string;
  marca?: string;
  rubro?: string;
  subRubro?: string;
  soloNegativo?: boolean;
  pagina?: number;
}

const emptyControlStock: ControlStockData = {
  items: [],
  total: 0,
  totalPaginas: 0,
  marcas: [],
  rubros: [],
  subRubros: [],
};

/**
 * Datos para Control Stock desde precios_tienda.
 * Filtros: MARCA → marca, RUBRO → rubro, SUB-RUBRO → sub_rubro.
 * Opciones de cada desplegable según docs/FILTROS_DINAMICOS.md (valores que existen con los demás filtros).
 * STOCK = stock_maipu o stock_guaymallen según sucursal.
 * Requiere permiso PERMISOS.stock.acceso.
 */
export async function getControlStock(
  sucursal: Sucursal | null,
  params: GetControlStockParams = {}
): Promise<ControlStockData> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return emptyControlStock;
  }
  if (!sucursal) {
    return emptyControlStock;
  }

  const {
    q = "",
    marca = "",
    rubro = "",
    subRubro = "",
    soloNegativo = false,
    pagina = 1,
  } = params;

  const paginaNum = Math.max(1, pagina);
  const skip = (paginaNum - 1) * PAGE_SIZE;

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

  const toWhereWithNotNull = (
    exclude: "marca" | "rubro" | "subRubro"
  ): Prisma.ListaPrecioTiendaWhereInput => {
    const parts = baseWhere(exclude);
    const key = exclude;
    const notNull = { [key]: { not: null } } as Prisma.ListaPrecioTiendaWhereInput;
    return parts.length > 0 ? { AND: [...parts, notNull] } : notNull;
  };

  const whereItems: Prisma.ListaPrecioTiendaWhereInput =
    baseWhere().length > 0 ? { AND: baseWhere() } : {};
  const whereMarcas = toWhereWithNotNull("marca");
  const whereRubros = toWhereWithNotNull("rubro");
  const whereSubRubros = toWhereWithNotNull("subRubro");

  const [rows, total, marcasDistinct, rubrosDistinct, subRubrosDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where: whereItems,
      orderBy: { descripcionTienda: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.listaPrecioTienda.count({ where: whereItems }),
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

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return {
    items,
    total,
    totalPaginas,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => m.marca!),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => r.rubro!),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => s.subRubro!),
  };
}

const idsUuidSchema = z.array(z.string().uuid()).optional().default([]);

/**
 * Registra impresión de ítems (no-op: persistencia opcional).
 * Solo editor. Valida que ids sean UUIDs.
 */
export async function registrarImpresion(ids: string[]): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = idsUuidSchema.safeParse(ids ?? []);
  if (!parsed.success) {
    return { ok: false, error: "IDs inválidos." };
  }
  // no-op: persistencia de última impresión opcional
  return { ok: true, data: undefined };
}
