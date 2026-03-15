"use server";

import type { Prisma } from "@prisma/client";
import { FormaPedirReposicion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";
import { PAGE_SIZE } from "@/lib/pagination";
import { revalidatePath } from "next/cache";

export type SucursalReposicion = "guaymallen" | "maipu";

export type FormaPedirReposicionOption = FormaPedirReposicion | "";

export interface ItemReposicion {
  idListaTienda: string;
  codExt: string;
  descripcionTienda: string | null;
  stock: number;
  idProveedor: string | null;
  nombreProveedor: string | null;
  idReposicion: string | null;
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
 * Cada ítem incluye la regla de pedidos_reposicion (si existe) para el primer proveedor vinculado.
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

  const { q = "", marca = "", rubro = "", subRubro = "", pagina = 1 } = params;
  const paginaNum = Math.max(1, pagina);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const whereItems: Prisma.ListaPrecioTiendaWhereInput =
    baseWhere(sucursal, params).length > 0
      ? { AND: baseWhere(sucursal, params) }
      : {};
  const toWhereWithNotNull = (
    exclude: "marca" | "rubro" | "subRubro"
  ): Prisma.ListaPrecioTiendaWhereInput => {
    const parts = baseWhere(sucursal, params, exclude);
    const key = exclude;
    const notNull = {
      [key]: { not: null },
    } as Prisma.ListaPrecioTiendaWhereInput;
    return parts.length > 0 ? { AND: [...parts, notNull] } : notNull;
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
  const reglasMap = new Map<string, { id: string; formaPedir: FormaPedirReposicion; puntoReposicion: number; cant: number; cantPedir: number }>();
  if (pairs.length > 0) {
    const reglas = await prisma.itemPedidoReposicion.findMany({
      where: {
        sucursalCodigo: sucursal,
        OR: pairs.map((p) => ({ idProveedor: p.idProveedor, codExt: p.codExt })),
      },
    });
    for (const r of reglas) {
      reglasMap.set(`${r.idProveedor}:${r.codExt}`, {
        id: r.id,
        formaPedir: r.formaPedir,
        puntoReposicion: r.puntoReposicion,
        cant: r.cant,
        cantPedir: r.cantPedir,
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
    return {
      idListaTienda: r.id,
      codExt: r.codExt,
      descripcionTienda: r.descripcionTienda,
      stock,
      idProveedor,
      nombreProveedor,
      idReposicion: regla?.id ?? null,
      formaPedir: regla?.formaPedir ?? "",
      puntoReposicion: regla?.puntoReposicion ?? 0,
      cant: regla?.cant ?? 0,
      cantPedir: regla?.cantPedir ?? 0,
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
    const existing = await prisma.itemPedidoReposicion.findUnique({
      where: {
        idProveedor_sucursalCodigo_codExt: { idProveedor, sucursalCodigo, codExt },
      },
    });

    if (!formaPedir) {
      if (existing) {
        await prisma.itemPedidoReposicion.delete({
          where: { id: existing.id },
        });
      }
      revalidatePath("/pedidos/reposicion");
      return { ok: true, data: undefined };
    }

    const cantPedir = formaPedir === "CANT_FIJA" ? cant : 0;

    if (existing) {
      await prisma.itemPedidoReposicion.update({
        where: { id: existing.id },
        data: {
          formaPedir: formaPedir as FormaPedirReposicion,
          puntoReposicion,
          cant,
          cantPedir,
        },
      });
    } else {
      await prisma.itemPedidoReposicion.create({
        data: {
          idProveedor,
          sucursalCodigo,
          codExt,
          formaPedir: formaPedir as FormaPedirReposicion,
          puntoReposicion,
          cant,
          cantPedir,
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
