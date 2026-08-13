"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
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
  conteosIndicadorSlidenavSchema,
  encolarTransferenciasPendientesSchema,
  exportarPendientesTransfDepositosSchema,
  listarHistorialTransfDepositosProductoSchema,
  registrarControlTransfDepositosSchema,
} from "@/lib/validations/transfDepositos";
import { GP_INTERNAL, GP_ROUTES } from "@/lib/gestionProductosRoutes";
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

export interface ItemTransfDepositos {
  /** `cod_tienda` (`prod_tienda`); clave estable para tabla. */
  id: string;
  codItem: string;
  descripcion: string;
  marca: string | null;
  rubro: string | null;
}

export type ControlTransfDepositosRecienteDto = {
  codTienda: string;
  cantidad: number;
  createdAtIso: string;
};

export type HistorialTransfDepositosItemDto = {
  createdAtIso: string;
  cantidad: number;
};

export type HistorialTransfDepositosSeccionDto = {
  origenCodigo: Sucursal;
  destinoCodigo: Sucursal;
  titulo: string;
  items: HistorialTransfDepositosItemDto[];
};

export type PendienteExportTransfDepositosDto = {
  id: string;
  tipo: "transferir" | "recibir";
  tipoLabel: "TRANSFERIR" | "RECIBIR";
  origenCodigo: Sucursal;
  destinoCodigo: Sucursal;
  origenLabel: string;
  destinoLabel: string;
  sucursalExcel: Sucursal;
  sucursalExcelLabel: string;
  cantidadRegistros: number;
  fechaIso: string;
};

export type FilaExcelTransfDepositosDto = {
  cod: string;
  tipoMovimiento: "EGRESO" | "INGRESO";
  cantidad: number;
};

export interface TransfDepositosData {
  items: ItemTransfDepositos[];
  total: number;
  totalPaginas: number;
  marcas: string[];
  rubros: string[];
  /** Controles del par origen→destino en la ventana anti-duplicado. */
  controlesRecientes: ControlTransfDepositosRecienteDto[];
}

export interface GetTransfDepositosParams {
  q?: string;
  marca?: string;
  rubro?: string;
  pagina?: number;
}

const emptyTransfDepositos: TransfDepositosData = {
  items: [],
  total: 0,
  totalPaginas: 0,
  marcas: [],
  rubros: [],
  controlesRecientes: [],
};

/**
 * Listado para **Trans. Depósitos**: catálogo stockeable (descripción / filtros).
 * **No** expone `stock_real`: la UI solo captura cantidades a transferir.
 * Con origen+destino distintos, adjunta controles recientes (anti-duplicado).
 * Requiere permiso `PERMISOS.stock.acceso` y sucursal origen.
 */
export async function getTransfDepositos(
  origen: Sucursal | null,
  destino: Sucursal | null = null,
  params: GetTransfDepositosParams = {}
): Promise<TransfDepositosData> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return emptyTransfDepositos;
  }
  if (!origen || !z.enum(["guaymallen", "maipu"]).safeParse(origen).success) {
    return emptyTransfDepositos;
  }
  const destinoOk =
    destino !== null &&
    z.enum(["guaymallen", "maipu"]).safeParse(destino).success &&
    destino !== origen
      ? destino
      : null;

  const parsedParams = getControlStockParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return emptyTransfDepositos;
  }
  const {
    q = "",
    marca = "",
    rubro = "",
    pagina: paginaNum = 1,
  } = parsedParams.data;
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);

  function baseWhere(exclude?: "marca" | "rubro"): Prisma.ProdTiendaWhereInput[] {
    const parts: Prisma.ProdTiendaWhereInput[] = [whereProdTiendaStockeable()];
    if (textFilter.AND?.length) parts.push(textFilter);
    if (exclude !== "marca" && marca) parts.push({ marca });
    if (exclude !== "rubro" && rubro) parts.push({ rubro });
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
        orderBy: { descripcionTienda: "asc" },
        skip,
        take: PAGE_SIZE,
        select: {
          codTienda: true,
          descripcionTienda: true,
          marca: true,
          rubro: true,
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

    const items: ItemTransfDepositos[] = rows.map((r) => ({
      id: r.codTienda,
      codItem: r.codTienda,
      descripcion: r.descripcionTienda ?? "",
      marca: r.marca,
      rubro: r.rubro,
    }));

    const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

    let controlesRecientes: ControlTransfDepositosRecienteDto[] = [];
    if (destinoOk && items.length > 0) {
      const { listarControlesRecientesTransfDepositos } = await import(
        "@/services/transfDepositos.service"
      );
      controlesRecientes = await listarControlesRecientesTransfDepositos(
        origen,
        destinoOk,
        items.map((i) => i.id)
      );
    }

    return {
      items,
      total,
      totalPaginas,
      marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => m.marca!),
      rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => r.rubro!),
      controlesRecientes,
    };
  } catch (e) {
    console.error("[getTransfDepositos]", e);
    return emptyTransfDepositos;
  }
}

/**
 * Marca un control de transferencia (anti-duplicado).
 * Si hay registro igual reciente y `forzar` es false → `requiereConfirmacion`.
 */
export async function registrarControlTransfDepositosAction(
  raw: unknown
): Promise<
  ActionResult<
    | { id: string; createdAtIso: string; eraDuplicado: boolean }
    | { requiereConfirmacion: true; ultimoCreatedAtIso: string }
  >
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = registrarControlTransfDepositosSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { registrarControlTransfDepositos } = await import(
    "@/services/transfDepositos.service"
  );
  const result = await registrarControlTransfDepositos(parsed.data);
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  if ("requiereConfirmacion" in result.data) {
    return { ok: true, data: result.data };
  }
  revalidatePath(GP_ROUTES.ayudaVendedor.transfDepositos);
  revalidatePath(GP_INTERNAL.ayudaVendedor.transfDepositos);
  return { ok: true, data: result.data };
}

/**
 * Historial de transferencias de un producto (últimos 14 días),
 * agrupado por par origen → destino.
 */
export async function listarHistorialTransfDepositosProductoAction(
  raw: unknown
): Promise<ActionResult<HistorialTransfDepositosSeccionDto[]>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = listarHistorialTransfDepositosProductoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  try {
    const { listarHistorialTransfDepositosPorProducto } = await import(
      "@/services/transfDepositos.service"
    );
    const secciones = await listarHistorialTransfDepositosPorProducto(
      parsed.data.codTienda
    );
    return { ok: true, data: secciones };
  } catch (e) {
    console.error("[listarHistorialTransfDepositosProductoAction]", e);
    return { ok: false, error: "Error al cargar historial." };
  }
}

/**
 * Persiste cantidades de la grilla como transferencias pendientes de Excel
 * (EGRESO origen / INGRESO destino aún no exportados).
 */
export async function encolarTransferenciasPendientesAction(
  raw: unknown
): Promise<ActionResult<{ creados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = encolarTransferenciasPendientesSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { encolarTransferenciasPendientes } = await import(
    "@/services/transfDepositos.service"
  );
  const result = await encolarTransferenciasPendientes(parsed.data);
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  revalidatePath(GP_ROUTES.ayudaVendedor.transfDepositos);
  revalidatePath(GP_INTERNAL.ayudaVendedor.transfDepositos);
  return { ok: true, data: result.data };
}

/** Listado de pendientes Excel: Transferir/Recibir por par origen→destino. */
export async function listarPendientesExportTransfDepositosAction(): Promise<
  ActionResult<PendienteExportTransfDepositosDto[]>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  try {
    const { listarPendientesExportTransfDepositos } = await import(
      "@/services/transfDepositos.service"
    );
    const data = await listarPendientesExportTransfDepositos();
    return { ok: true, data };
  } catch (e) {
    console.error("[listarPendientesExportTransfDepositosAction]", e);
    return { ok: false, error: "Error al listar pendientes." };
  }
}

/**
 * Excel de un pendiente (Transferir/Recibir + par) y marca ese lado exportado
 * (desaparece de pendientes).
 */
export async function exportarPendientesTransfDepositosAction(
  raw: unknown
): Promise<
  ActionResult<{
    filas: FilaExcelTransfDepositosDto[];
    marcados: number;
    sucursalExcelLabel: string;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.stock.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = exportarPendientesTransfDepositosSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const { exportarPendientesTransfDepositos } = await import(
    "@/services/transfDepositos.service"
  );
  const result = await exportarPendientesTransfDepositos(parsed.data);
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  revalidatePath(GP_ROUTES.ayudaVendedor.transfDepositos);
  revalidatePath(GP_INTERNAL.ayudaVendedor.transfDepositos);
  return { ok: true, data: result.data };
}

export type IndicadorSlidenavDto = {
  urgente: number;
  tintometrico: number;
  reposicion: number;
  emision: number;
  recepcion: number;
};

/**
 * Conteos del indicador de slidenav: pedidos (Generar Pedido) + transferencias pendientes.
 */
export async function getIndicadorSlidenavAction(
  raw: unknown
): Promise<ActionResult<IndicadorSlidenavDto>> {
  const rol = await getRol();
  const parsed = conteosIndicadorSlidenavSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }
  const sucursal = parsed.data.sucursal;
  try {
    const [pedidos, transf] = await Promise.all([
      puede(rol, PERMISOS.pedidos.acceso)
        ? import("@/services/pedidosEnvio.service").then((m) =>
            m.contarItemsPedidoPorTipoParaSlidenav(sucursal)
          )
        : Promise.resolve({ urgente: 0, tintometrico: 0, reposicion: 0 }),
      puede(rol, PERMISOS.stock.acceso)
        ? import("@/services/transfDepositos.service").then((m) =>
            m.contarPendientesTransfPorSucursal(sucursal)
          )
        : Promise.resolve({ emision: 0, recepcion: 0 }),
    ]);
    return {
      ok: true,
      data: {
        urgente: pedidos.urgente,
        tintometrico: pedidos.tintometrico,
        reposicion: pedidos.reposicion,
        emision: transf.emision,
        recepcion: transf.recepcion,
      },
    };
  } catch (e) {
    console.error("[getIndicadorSlidenavAction]", e);
    return { ok: false, error: "Error al cargar indicador." };
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
