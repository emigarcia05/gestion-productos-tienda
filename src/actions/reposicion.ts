"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";
import { PAGE_SIZE } from "@/lib/pagination";
import { revalidatePath } from "next/cache";

export type SucursalReposicion = "guaymallen" | "maipu";

export type FormaPedirReposicionOption = "CANT_MAXIMA" | "CANT_FIJA" | "";

export interface ItemReposicion {
  idListaTienda: string;
  codExt: string;
  descripcionTienda: string | null;
  stock: number;
  idProveedor: string | null;
  nombreProveedor: string | null;
  idReposicion: string | null; // id del registro en pedidos_mercaderia (tipo REPOSICION)
  formaPedir: FormaPedirReposicionOption;
  puntoReposicion: number;
  cant: number;
  cantPedir: number;
}

export interface ReposicionData {
  items: ItemReposicion[];
  total: number;
  totalPaginas: number;
  marcas: string[];
  rubros: string[];
  subRubros: string[];
}

export interface GetReposicionParams {
  q?: string;
  marca?: string;
  rubro?: string;
  subRubro?: string;
  /** "si" = solo ítems con regla de reposición configurada. */
  configurado?: "" | "si";
  pagina?: number;
}

const emptyReposicionData: ReposicionData = {
  items: [],
  total: 0,
  totalPaginas: 1,
  marcas: [],
  rubros: [],
  subRubros: [],
};

function baseWhere(
  sucursal: SucursalReposicion,
  params: GetReposicionParams,
  exclude?: "marca" | "rubro" | "subRubro"
): Prisma.ListaPrecioTiendaWhereInput[] {
  const { q = "", marca = "", rubro = "", subRubro = "" } = params;
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  const parts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  if (textFilter.AND?.length) parts.push(textFilter);
  if (exclude !== "marca" && marca) parts.push({ marca });
  if (exclude !== "rubro" && rubro) parts.push({ rubro });
  if (exclude !== "subRubro" && subRubro) parts.push({ subRubro });
  return parts;
}

/**
 * Datos para Pedido Reposición: lista_tienda filtrada por sucursal (stock), marca, rubro, sub-rubro, descripción.
 * Cada ítem incluye la configuración REPOSICION en pedidos_mercaderia (si existe) para el primer proveedor vinculado.
 */
export async function getReposicionData(
  sucursal: SucursalReposicion | null,
  params: GetReposicionParams = {}
): Promise<ReposicionData> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return emptyReposicionData;
  }
  if (!sucursal) {
    return emptyReposicionData;
  }

  const { q = "", marca = "", rubro = "", subRubro = "", configurado = "", pagina = 1 } = params;
  const paginaNum = Math.max(1, pagina);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  // Filtro "CONFIGURADO = SÍ": reduce lista_tienda a cod_ext que tengan configuración REPOSICION en pedidos_mercaderia para esta sucursal.
  const codExtConfigurados =
    configurado === "si"
      ? await prisma.itemPedidoEnvio.findMany({
          where: { sucursalCodigo: sucursal, tipoPedido: "REPOSICION" },
          select: { codExt: true },
          distinct: ["codExt"],
        })
      : null;
  const codExtList = codExtConfigurados?.map((r) => r.codExt) ?? [];

  const baseParts = baseWhere(sucursal, params);
  const whereItems: Prisma.ListaPrecioTiendaWhereInput = (() => {
    const parts = [...baseParts];
    if (configurado === "si") {
      // Si no hay configurados, devolvemos vacío rápido.
      if (codExtList.length === 0) return { codExt: { in: ["__none__"] } };
      parts.push({ codExt: { in: codExtList } });
    }
    return parts.length > 0 ? { AND: parts } : {};
  })();
  const toWhereWithNotNull = (
    exclude: "marca" | "rubro" | "subRubro"
  ): Prisma.ListaPrecioTiendaWhereInput => {
    const parts = baseWhere(sucursal, params, exclude);
    const key = exclude;
    const notNull = {
      [key]: { not: null },
    } as Prisma.ListaPrecioTiendaWhereInput;
    const extra = [];
    if (configurado === "si") {
      if (codExtList.length === 0) return { codExt: { in: ["__none__"] } };
      extra.push({ codExt: { in: codExtList } });
    }
    return parts.length > 0
      ? { AND: [...parts, ...extra, notNull] }
      : extra.length > 0
        ? { AND: [...extra, notNull] }
        : notNull;
  };
  const whereMarcas = toWhereWithNotNull("marca");
  const whereRubros = toWhereWithNotNull("rubro");
  const whereSubRubros = toWhereWithNotNull("subRubro");

  const [rows, total, marcasDistinct, rubrosDistinct, subRubrosDistinct] =
    await Promise.all([
      prisma.listaPrecioTienda.findMany({
        where: whereItems,
        orderBy: { descripcionTienda: "asc" },
        skip,
        take: PAGE_SIZE,
        include: {
          listaPreciosProveedores: {
            take: 1,
            orderBy: { idProveedor: "asc" },
            select: { idProveedor: true, proveedor: { select: { nombre: true } } },
          },
        },
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

  const pairs = rows
    .filter((r) => r.listaPreciosProveedores[0])
    .map((r) => ({
      idProveedor: r.listaPreciosProveedores[0].idProveedor,
      codExt: r.codExt,
    }));
  const reglasMap = new Map<
    string,
    {
      id: string;
      formaPedir: FormaPedirReposicionOption;
      puntoReposicion: number;
      cant: number;
      cantPedir: number;
    }
  >();
  if (pairs.length > 0) {
    const reglas = await prisma.itemPedidoEnvio.findMany({
      where: {
        sucursalCodigo: sucursal,
        tipoPedido: "REPOSICION",
        OR: pairs.map((p) => ({ idProveedor: p.idProveedor, codExt: p.codExt })),
      },
      select: {
        id: true,
        idProveedor: true,
        codExt: true,
        reposicionFormaPedido: true,
        reposicionPuntoPedido: true,
        reposicionCantConf: true,
        cantPedir: true,
      },
    });
    for (const r of reglas) {
      reglasMap.set(`${r.idProveedor}:${r.codExt}`, {
        id: r.id,
        formaPedir: (r.reposicionFormaPedido as FormaPedirReposicionOption) ?? "",
        puntoReposicion: Math.max(0, Math.floor(Number(r.reposicionPuntoPedido ?? 0))),
        cant: Math.max(0, Math.floor(Number(r.reposicionCantConf ?? 0))),
        cantPedir: Math.max(0, Math.floor(Number(r.cantPedir ?? 0))),
      });
    }
  }

  const stockField = sucursal === "maipu" ? "stockMaipu" : "stockGuaymallen";

  const items: ItemReposicion[] = rows.map((r) => {
    const prov = r.listaPreciosProveedores[0];
    const idProveedor = prov?.idProveedor ?? null;
    const nombreProveedor = prov?.proveedor?.nombre ?? null;
    const key = idProveedor ? `${idProveedor}:${r.codExt}` : "";
    const regla = key ? reglasMap.get(key) : null;
    const stock = Number(r[stockField] ?? 0);
    const forma = regla?.formaPedir ?? "";
    const punto = regla?.puntoReposicion ?? 0;
    const cantCfg = regla?.cant ?? 0;
    const cantAPedir = regla?.cantPedir ?? 0;
    return {
      idListaTienda: r.id,
      codExt: r.codExt,
      descripcionTienda: r.descripcionTienda,
      stock,
      idProveedor,
      nombreProveedor,
      idReposicion: regla?.id ?? null,
      formaPedir: forma,
      puntoReposicion: punto,
      cant: cantCfg,
      cantPedir: cantAPedir,
    };
  });

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return {
    items,
    total,
    totalPaginas,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => m.marca!),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => r.rubro!),
    subRubros: subRubrosDistinct
      .filter((s) => s.subRubro != null)
      .map((s) => s.subRubro!),
  };
}

export interface ItemSelectorReposicion {
  idListaTienda: string;
  codExt: string;
  descripcionTienda: string | null;
  idProveedor: string;
}

const SELECTOR_LIMIT = 300;

/**
 * Productos de lista_tienda con proveedor para el selector del modal "Agregar configuración".
 * Búsqueda por descripción; máximo SELECTOR_LIMIT resultados.
 */
export async function getProductosReposicionSelector(
  sucursal: SucursalReposicion | null,
  q: string = ""
): Promise<ItemSelectorReposicion[]> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) return [];
  if (!sucursal) return [];

  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  const where: Prisma.ListaPrecioTiendaWhereInput =
    textFilter.AND?.length ? textFilter : {};

  const rows = await prisma.listaPrecioTienda.findMany({
    where,
    orderBy: { descripcionTienda: "asc" },
    take: SELECTOR_LIMIT,
    include: {
      listaPreciosProveedores: {
        take: 1,
        orderBy: { idProveedor: "asc" },
        select: { idProveedor: true },
      },
    },
  });

  return rows
    .filter((r) => r.listaPreciosProveedores[0])
    .map((r) => ({
      idListaTienda: r.id,
      codExt: r.codExt,
      descripcionTienda: r.descripcionTienda,
      idProveedor: r.listaPreciosProveedores[0].idProveedor,
    }));
}

const upsertReglaSchema = z.object({
  idProveedor: z.string().min(1, "Proveedor requerido"),
  sucursalCodigo: z.enum(["guaymallen", "maipu"]),
  codExt: z.string().min(1, "Código requerido"),
  formaPedir: z.enum(["CANT_MAXIMA", "CANT_FIJA"]).optional(),
  puntoReposicion: z.number().int().min(0),
  cant: z.number().int().min(0),
});

/**
 * Crea o actualiza la regla de reposición para (proveedor, sucursal, cod_ext).
 * Si formaPedir no se envía o está vacío, se elimina la regla (o no se crea).
 */
export async function upsertReglaReposicion(raw: z.infer<typeof upsertReglaSchema>): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = upsertReglaSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first = Object.values(msg).flat().find(Boolean);
    return { ok: false, error: (first as string) ?? "Datos inválidos." };
  }
  const { idProveedor, sucursalCodigo, codExt, formaPedir, puntoReposicion, cant } = parsed.data;

  try {
    if (!formaPedir) {
      await prisma.itemPedidoEnvio.deleteMany({
        where: {
          idProveedor,
          tipoPedido: "REPOSICION",
          sucursalCodigo,
          codExt,
        },
      });
      revalidatePath("/pedidos/reposicion");
      return { ok: true, data: undefined };
    }

    const existing = await prisma.itemPedidoEnvio.findFirst({
      where: {
        idProveedor,
        tipoPedido: "REPOSICION",
        sucursalCodigo,
        codExt,
      },
      select: { id: true },
    });

    const dataBase = {
      reposicionFormaPedido: formaPedir,
      reposicionPuntoPedido: puntoReposicion,
      reposicionCantConf: cant,
    };

    if (existing) {
      await prisma.itemPedidoEnvio.update({
        where: { id: existing.id },
        data: dataBase,
      });
    } else {
      await prisma.itemPedidoEnvio.create({
        data: {
          idProveedor,
          tipoPedido: "REPOSICION",
          sucursalCodigo,
          codExt,
          codProveedor: "__AUTO__",
          codTienda: null,
          descripcionProveedor: "__AUTO__",
          descripcionTienda: null,
          cantPedir: 0,
          ...dataBase,
        },
      });
    }
    revalidatePath("/pedidos/reposicion");
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al guardar la regla.";
    return { ok: false, error: message };
  }
}

const deleteReglaSchema = z.object({
  id: z.string().uuid("ID de regla inválido"),
});

/**
 * Elimina la regla de reposición por ID.
 */
export async function deleteReglaReposicion(raw: z.infer<typeof deleteReglaSchema>): Promise<ActionResult<void>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.pedidos.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  const parsed = deleteReglaSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "ID inválido." };
  }
  try {
    await prisma.itemPedidoEnvio.delete({
      where: { id: parsed.data.id },
    });
    revalidatePath("/pedidos/reposicion");
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al eliminar la regla.";
    return { ok: false, error: message };
  }
}
