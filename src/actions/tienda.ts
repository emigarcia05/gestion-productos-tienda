"use server";

import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { filtroTexto } from "@/lib/busqueda";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/pagination";
import { getTiendaPageParamsSchema } from "@/lib/validations/tienda";

/** Respuesta vacía con opciones de filtros (marcas, rubros, subRubros, proveedores) para reutilizar en sinFiltros y filtro `vinculado` sin resultados. */
async function getTiendaEmptyWithOpciones() {
  const [proveedores, rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.proveedor.findMany({
      where: { proveedorMercaderia: true },
      select: { id: true, nombre: true, prefijo: true, codigoUnico: true, coeficienteTintometrico: true },
    }),
    prisma.listaPrecioTienda.findMany({ select: { rubro: true }, distinct: ["rubro"], where: { rubro: { not: null } }, orderBy: { rubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], where: { subRubro: { not: null } }, orderBy: { subRubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { marca: true }, distinct: ["marca"], where: { marca: { not: null } }, orderBy: { marca: "asc" } }),
  ]);
  return {
    items: [] as ItemTiendaParaTabla[],
    total: 0,
    proveedores: proveedores.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      prefijo: p.prefijo ?? "",
      codigoUnico: p.codigoUnico,
      coeficienteTintometrico: Number(p.coeficienteTintometrico),
    })),
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
    totalPaginas: 0,
  };
}

/** Última sincronización (max last_sync de prod_precios_tienda). */
export async function getUltimoSync() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) {
    return null;
  }
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
  /** Derivado de DUX: ambos depósitos informan `ctd_disponible` no nulo. */
  stockeable: boolean;
  habilitado: boolean;
  _count: { productos: number };
}

export interface ProveedorTintoLts {
  id: string;
  nombre: string;
  /** Vacío si el proveedor no tiene prefijo de 3 letras. */
  prefijo: string;
  codigoUnico: string;
  coeficienteTintometrico: number;
}

export async function getProveedoresTintoLts(): Promise<ProveedorTintoLts[]> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.tintoLts)) return [];

  const proveedores = await prisma.proveedor.findMany({
    where: { proveedorMercaderia: true },
    select: {
      id: true,
      nombre: true,
      prefijo: true,
      codigoUnico: true,
      coeficienteTintometrico: true,
    },
    orderBy: { nombre: "asc" },
  });

  return proveedores.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    prefijo: p.prefijo ?? "",
    codigoUnico: p.codigoUnico,
    coeficienteTintometrico: Number(p.coeficienteTintometrico),
  }));
}

/**
 * Datos para la página /tienda desde prod_precios_tienda.
 * Mapeo: cod_tienda → codItem, descripcion_tienda → descripcion, costo_compra → costo,
 * proveedor → proveedorDux (resuelto a prefijo de proveedores cuando hay match).
 */
export async function getTiendaPageData(params: {
  q?: string;
  rubro?: string;
  subRubro?: string;
  marca?: string;
  proveedor?: string;
  vinculado?: string;
  pagina?: string;
}) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) {
    return getTiendaEmptyWithOpciones();
  }

  const parsedParams = getTiendaPageParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return getTiendaEmptyWithOpciones();
  }
  const {
    q = "",
    rubro = "",
    subRubro = "",
    marca = "",
    proveedor = "",
    vinculado: vinculadoRaw = "",
    pagina = "1",
  } = parsedParams.data;

  const vNorm = (vinculadoRaw ?? "").toLowerCase();
  const vinculado = vNorm === "no" || vNorm === "si" ? vNorm : "";

  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (rubro) andParts.push({ rubro });
  if (subRubro) andParts.push({ subRubro });
  if (marca) andParts.push({ marca });
  // Filtro por proveedor: solo proveedores oficiales (columna proveedor en prod_precios_tienda). Los vinculados son solo para comparación en la tabla.
  if (proveedor) andParts.push({ proveedor: { equals: proveedor, mode: "insensitive" } });

  /* Filtro VINCULADO: sin ningún `prod_precios_provee` vinculado vs. al menos uno. */
  if (vinculado === "no") {
    andParts.push({ listaPreciosProveedores: { none: {} } });
  } else if (vinculado === "si") {
    andParts.push({ listaPreciosProveedores: { some: {} } });
  }

  const where: Prisma.ListaPrecioTiendaWhereInput = andParts.length ? { AND: andParts } : {};

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  /* Opciones de filtros: cada desplegable muestra siempre la lista completa de su dimensión (ver docs/FILTROS_DINAMICOS.md). Solo se aplica filtro de búsqueda (q) si existe. */
  const andPartsOnlyQ: Prisma.ListaPrecioTiendaWhereInput[] = [];
  if (textFilter.AND?.length) andPartsOnlyQ.push(textFilter);
  const whereMarcas: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length ? { AND: [...andPartsOnlyQ, { marca: { not: null } }] } : { marca: { not: null } };
  const whereRubros: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length ? { AND: [...andPartsOnlyQ, { rubro: { not: null } }] } : { rubro: { not: null } };
  const whereSubRubros: Prisma.ListaPrecioTiendaWhereInput = andPartsOnlyQ.length ? { AND: [...andPartsOnlyQ, { subRubro: { not: null } }] } : { subRubro: { not: null } };

  const [rows, total, proveedores, rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where,
      orderBy: [{ descripcionTienda: "asc" }],
      include: { _count: { select: { listaPreciosProveedores: true } } },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.listaPrecioTienda.count({ where }),
    prisma.proveedor.findMany({
      where: { proveedorMercaderia: true },
      select: { id: true, nombre: true, prefijo: true, codigoUnico: true, coeficienteTintometrico: true },
    }),
    prisma.listaPrecioTienda.findMany({ select: { rubro: true }, distinct: ["rubro"], where: whereRubros, orderBy: { rubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], where: whereSubRubros, orderBy: { subRubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { marca: true }, distinct: ["marca"], where: whereMarcas, orderBy: { marca: "asc" } }),
  ]);

  const nombreToPrefijo = new Map(
    proveedores.map((p) => [
      p.nombre.toLowerCase().trim(),
      (p.prefijo?.trim() || p.codigoUnico) as string,
    ])
  );

  const items: ItemTiendaParaTabla[] = rows.map((r) => {
    const proveedorTexto = r.proveedor?.trim() ?? null;
    const prefijo = proveedorTexto ? nombreToPrefijo.get(proveedorTexto.toLowerCase()) ?? proveedorTexto : null;
    return {
      id: r.codTienda,
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
      stockeable: r.stockeable,
      habilitado: true,
      _count: { productos: r._count.listaPreciosProveedores },
    };
  });

  const totalPaginas = total <= 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  return {
    items,
    total,
    proveedores: proveedores.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      prefijo: p.prefijo ?? "",
      codigoUnico: p.codigoUnico,
      coeficienteTintometrico: Number(p.coeficienteTintometrico),
    })),
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
    totalPaginas,
  };
}

// ─── Control de Aumentos ───────────────────────────────────────────────────

export interface ItemAumento {
  itemId:          string;
  codItem:         string;
  descripcion:     string;
  marca:           string | null;
  rubro:           string | null;
  subRubro:        string | null;
  codigoExterno:   string;
  proveedorDux:    string | null;  // prefijo del proveedor (para UI)
  proveedorNombre: string | null;   // nombre completo (para exportación)
  costoTienda:     number;
  pxCompraFinalSinIva:   number;
  pctAumento:      number; // ((pxCompraFinalSinIva - costoTienda) / costoTienda) * 100
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
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.controlAumentos)) {
    return { porMarca: [], porRubro: [], porSubRubro: [], individual: [] };
  }
  const { getControlAumentosData } = await import("@/services/controlAumentos.service");
  return getControlAumentosData();
}

/** Marca un producto vinculado como proveedor principal: actualiza prod_precios_tienda.cod_ext y prod_precios_tienda.proveedor. */
const prismaIdParamSchema = z.object({
  itemTiendaId: z.string().min(1).max(128),
  productoProveedorId: z.string().min(1).max(128),
});

export async function convertirEnProveedor(
  itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) {
    return { ok: false, error: "Sin acceso a tienda." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const parsed = prismaIdParamSchema.safeParse({ itemTiendaId, productoProveedorId });
  if (!parsed.success) {
    return { ok: false, error: "IDs inválidos." };
  }
  return {
    ok: false,
    error: "La modificación de proveedor en base de datos está deshabilitada.",
  };
}

