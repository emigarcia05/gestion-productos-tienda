"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import { filtroTexto } from "@/lib/busqueda";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

/** Última sincronización (max last_sync de lista_precios_tienda). */
export async function getUltimoSync() {
  const row = await prisma.listaPrecioTienda.findFirst({
    orderBy: { lastSync: "desc" },
    select: { lastSync: true },
  });
  return row?.lastSync ?? null;
}

/** Tipo de ítem que espera la tabla /tienda (mapeado desde ListaPrecioTienda). */
export interface ItemTiendaParaTabla {
  id: string;
  codItem: string;
  descripcion: string;
  rubro: string | null;
  subRubro: string | null;
  marca: string | null;
  proveedorDux: string | null;  // prefijo de proveedores o texto proveedor
  codigoExterno: string | null;
  costo: number;
  porcIva: number;
  precioLista: number;
  precioMayorista: number;
  stockGuaymallen: number;
  stockMaipu: number;
  habilitado: boolean;
  _count: { productos: number };
}

/**
 * Datos para la página /tienda desde lista_precios_tienda.
 * Mapeo: cod_tienda → codItem, descripcion_tienda → descripcion, costo_compra → costo,
 * proveedor → proveedorDux (resuelto a prefijo de proveedores cuando hay match).
 */
export async function getTiendaPageData(params: {
  q?: string;
  rubro?: string;
  subRubro?: string;
  marca?: string;
  habilitado?: string;
  mejorPrecio?: string;
  pagina?: string;
}) {
  const { q = "", rubro = "", subRubro = "", marca = "", pagina = "1" } = params;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (rubro) andParts.push({ rubro });
  if (subRubro) andParts.push({ subRubro });
  if (marca) andParts.push({ marca });
  const where: Prisma.ListaPrecioTiendaWhereInput = andParts.length ? { AND: andParts } : {};

  // Filtros conectados en todas las direcciones: cada lista de opciones se limita por el resto de filtros + búsqueda por descripción
  const filtroTextoParts = textFilter.AND?.length ? [textFilter] : [];

  const whereMarcas: Prisma.ListaPrecioTiendaWhereInput = { marca: { not: null } };
  if (filtroTextoParts.length) whereMarcas.AND = [...filtroTextoParts];
  if (rubro) (whereMarcas.AND ??= []).push({ rubro });
  if (subRubro) (whereMarcas.AND ??= []).push({ subRubro });

  const whereRubros: Prisma.ListaPrecioTiendaWhereInput = { rubro: { not: null } };
  if (filtroTextoParts.length) whereRubros.AND = [...filtroTextoParts];
  if (marca) (whereRubros.AND ??= []).push({ marca });
  if (subRubro) (whereRubros.AND ??= []).push({ subRubro });

  const whereSubRubros: Prisma.ListaPrecioTiendaWhereInput = { subRubro: { not: null } };
  if (filtroTextoParts.length) whereSubRubros.AND = [...filtroTextoParts];
  if (marca) (whereSubRubros.AND ??= []).push({ marca });
  if (rubro) (whereSubRubros.AND ??= []).push({ rubro });

  const [rows, total, proveedores, rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where,
      orderBy: [{ descripcionTienda: "asc" }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.listaPrecioTienda.count({ where }),
    prisma.proveedor.findMany({ select: { nombre: true, prefijo: true } }),
    prisma.listaPrecioTienda.findMany({ select: { rubro: true }, distinct: ["rubro"], where: whereRubros, orderBy: { rubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], where: whereSubRubros, orderBy: { subRubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { marca: true }, distinct: ["marca"], where: whereMarcas, orderBy: { marca: "asc" } }),
  ]);

  const nombreToPrefijo = new Map(proveedores.map((p) => [p.nombre.toLowerCase().trim(), p.prefijo]));

  const items: ItemTiendaParaTabla[] = rows.map((r) => {
    const proveedorTexto = r.proveedor?.trim() ?? null;
    const prefijo = proveedorTexto ? nombreToPrefijo.get(proveedorTexto.toLowerCase()) ?? proveedorTexto : null;
    return {
      id: r.id,
      codItem: r.codTienda,
      descripcion: r.descripcionTienda ?? "",
      rubro: r.rubro,
      subRubro: r.subRubro,
      marca: r.marca,
      proveedorDux: prefijo,
      codigoExterno: r.codExt,
      costo: Number(r.costoCompra),
      porcIva: 21,
      precioLista: Number(r.pxListaTienda),
      precioMayorista: 0,
      stockGuaymallen: r.stockGuaymallen,
      stockMaipu: r.stockMaipu,
      habilitado: true,
      _count: { productos: 0 },
    };
  });

  return {
    items,
    total,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
    setMejorPrecio: new Set<string>(),
    totalPaginas: Math.ceil(total / PAGE_SIZE),
  };
}

// ─── Control de Aumentos ───────────────────────────────────────────────────

export interface ItemAumento {
  itemId:        string;
  codItem:       string;
  descripcion:   string;
  marca:         string | null;
  rubro:         string | null;
  subRubro:      string | null;
  codigoExterno: string;
  proveedorDux:  string | null;
  costoTienda:   number;
  pxCompraFinal: number;
  pctAumento:    number; // ((pxCompraFinal - costoTienda) / costoTienda) * 100
}

export interface GrupoAumento {
  nombre:      string;
  cantidad:    number;
  pctPromedio: number;
  subiendo:    number;
  bajando:     number;
}

export interface ControlAumentosData {
  porMarca:    GrupoAumento[];
  porRubro:    GrupoAumento[];
  porSubRubro: GrupoAumento[];
  individual:  ItemAumento[];
}

export async function getControlAumentos(): Promise<ControlAumentosData> {
  return { porMarca: [], porRubro: [], porSubRubro: [], individual: [] };
}

export async function convertirEnProveedor(
  itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}
