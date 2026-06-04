"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";
import { PAGE_SIZE } from "@/lib/pagination";
import { getControlStockParamsSchema } from "@/lib/validations/stock";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";
import {
  getIdDepositoPorSucursalCodigo,
  whereProdTiendaStockeable,
} from "@/services/prodTiendaStock.service";

export type Sucursal = "guaymallen" | "maipu";

export interface ItemStock {
  /** `cod_tienda` (`prod_tienda`); clave estable para tabla y export Excel. */
  id:              string;
  codItem:         string;
  descripcion:     string;
  marca:           string | null;
  rubro:           string | null;
  stock:           number;
  /** ISO 8601 (serializable RSC → cliente). */
  ultimaExportacionExcel: string | null;
}

export interface ControlStockData {
  items:         ItemStock[];
  total:         number;
  totalPaginas:  number;
  marcas:        string[];
  rubros:        string[];
}

export interface GetControlStockParams {
  q?: string;
  marca?: string;
  rubro?: string;
  soloNegativo?: boolean;
  orden?: string;
  pagina?: number;
}

const emptyControlStock: ControlStockData = {
  items: [],
  total: 0,
  totalPaginas: 0,
  marcas: [],
  rubros: [],
};

/**
 * Datos para Control Stock desde prod_tienda.
 * Filtros: MARCA → marca, RUBRO → rubro, SUB-RUBRO → sub_rubro.
 * Opciones de cada desplegable según docs/FILTROS_DINAMICOS.md (valores que existen con los demás filtros).
 * STOCK = `prod_tienda_stock.stock_real` del depósito DUX de la sucursal (Maipú / Guaymallén).
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
  if (!z.enum(["guaymallen", "maipu"]).safeParse(sucursal).success) {
    return emptyControlStock;
  }

  const parsedParams = getControlStockParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return emptyControlStock;
  }
  const {
    q = "",
    marca = "",
    rubro = "",
    soloNegativo = false,
    orden = "",
    pagina: paginaNum = 1,
  } = parsedParams.data;
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  const idDepositoSucursal = getIdDepositoPorSucursalCodigo(sucursal);

  function baseWhere(exclude?: "marca" | "rubro"): Prisma.ProdTiendaWhereInput[] {
    const parts: Prisma.ProdTiendaWhereInput[] = [whereProdTiendaStockeable()];
    if (textFilter.AND?.length) parts.push(textFilter);
    if (exclude !== "marca" && marca) parts.push({ marca });
    if (exclude !== "rubro" && rubro) parts.push({ rubro });
    if (soloNegativo) {
      parts.push({
        stocks: {
          some: {
            idDeposito: idDepositoSucursal,
            stockReal: { lt: 0 },
          },
        },
      });
    }
    return parts;
  }

  const toWhereWithNotNull = (
    exclude: "marca" | "rubro"
  ): Prisma.ProdTiendaWhereInput => {
    const parts = baseWhere(exclude);
    const key = exclude;
    const notNull = { [key]: { not: null } } as Prisma.ProdTiendaWhereInput;
    return parts.length > 0 ? { AND: [...parts, notNull] } : notNull;
  };

  const whereItems: Prisma.ProdTiendaWhereInput =
    baseWhere().length > 0 ? { AND: baseWhere() } : {};
  const whereMarcas = toWhereWithNotNull("marca");
  const whereRubros = toWhereWithNotNull("rubro");

  try {
    const [rows, total, marcasDistinct, rubrosDistinct] = await Promise.all([
      prisma.prodTienda.findMany({
        where: whereItems,
        orderBy:
          orden === "segunTiempoControl"
            ? [
                { ultimaExportacionExcel: { sort: "asc", nulls: "first" } },
                { descripcionTienda: "asc" },
              ]
            : { descripcionTienda: "asc" },
        skip,
        take: PAGE_SIZE,
        include: {
          stocks: {
            where: { idDeposito: idDepositoSucursal },
            select: { stockReal: true },
          },
        },
      }),
      prisma.prodTienda.count({ where: whereItems }),
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

    const items: ItemStock[] = rows.map((r) => ({
      id: r.codTienda,
      codItem: r.codTienda,
      descripcion: r.descripcionTienda ?? "",
      marca: r.marca,
      rubro: r.rubro,
      stock: r.stocks[0]?.stockReal ?? 0,
      ultimaExportacionExcel: r.ultimaExportacionExcel?.toISOString() ?? null,
    }));

    const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

    return {
      items,
      total,
      totalPaginas,
      marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => m.marca!),
      rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => r.rubro!),
    };
  } catch (e) {
    console.error("[getControlStock]", e);
    return emptyControlStock;
  }
}

const codTiendasExcelSchema = z.array(listaPreciosCodTiendaSchema).optional().default([]);

/**
 * Registra la última exportación Excel de stock para una lista de ítems (persistente).
 * Se usa para la columna "ÚLT. EXPORT. EXCEL" en Control Stock.
 */
export async function registrarExportacionExcelStock(ids: string[]): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = codTiendasExcelSchema.safeParse(ids ?? []);
  if (!parsed.success) {
    return { ok: false, error: "IDs inválidos." };
  }
  try {
    const ahora = new Date();
    await prisma.prodTienda.updateMany({
      where: { codTienda: { in: parsed.data } },
      data: { ultimaExportacionExcel: ahora },
    });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al registrar exportación.";
    return { ok: false, error: message };
  }
}
