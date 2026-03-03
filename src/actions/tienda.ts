"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import { filtroTexto } from "@/lib/busqueda";
import { calcPxCompraFinal } from "@/lib/calculos";
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
  /** Si hay al menos un proveedor vinculado con precio final más bajo que el principal: diferencia positiva (costo - mejor precio). Null si ya tiene el mejor precio o no hay vínculos. */
  diferenciaMejorPrecio: number | null;
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
  const { q = "", rubro = "", subRubro = "", marca = "", mejorPrecio = "", pagina = "1" } = params;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (rubro) andParts.push({ rubro });
  if (subRubro) andParts.push({ subRubro });
  if (marca) andParts.push({ marca });

  /* Filtro "Menor Cx Disponible": solo ítems con ≥2 proveedores vinculados y el principal no es el de menor costo. */
  let idsMenorCxDisponible: string[] = [];
  if (mejorPrecio === "true") {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT lpt.id
      FROM lista_precios_tienda lpt
      WHERE (SELECT COUNT(*) FROM lista_precios_proveedores lpp WHERE lpp.id_lista_precios_tienda = lpt.id) >= 1
        AND (SELECT MIN(COALESCE(lpp.px_compra_final, lpp.px_lista_proveedor::numeric)) FROM lista_precios_proveedores lpp
             WHERE lpp.id_lista_precios_tienda = lpt.id) < lpt.costo_compra
    `;
    idsMenorCxDisponible = rows.map((r) => r.id);
    if (idsMenorCxDisponible.length === 0) {
      const [rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
        prisma.listaPrecioTienda.findMany({ select: { rubro: true }, distinct: ["rubro"], where: { rubro: { not: null } }, orderBy: { rubro: "asc" } }),
        prisma.listaPrecioTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], where: { subRubro: { not: null } }, orderBy: { subRubro: "asc" } }),
        prisma.listaPrecioTienda.findMany({ select: { marca: true }, distinct: ["marca"], where: { marca: { not: null } }, orderBy: { marca: "asc" } }),
      ]);
      return {
        items: [],
        total: 0,
        marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
        rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
        subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
        setMejorPrecio: new Set<string>(),
        totalPaginas: 0,
      };
    }
    andParts.push({ id: { in: idsMenorCxDisponible } });
  }

  const where: Prisma.ListaPrecioTiendaWhereInput = andParts.length ? { AND: andParts } : {};

  /* Sin filtros: no cargar ítems para que la navegación sea más rápida; solo opciones de filtros. */
  const sinFiltros = andParts.length === 0;
  if (sinFiltros) {
    const [rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
      prisma.listaPrecioTienda.findMany({ select: { rubro: true }, distinct: ["rubro"], where: { rubro: { not: null } }, orderBy: { rubro: "asc" } }),
      prisma.listaPrecioTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], where: { subRubro: { not: null } }, orderBy: { subRubro: "asc" } }),
      prisma.listaPrecioTienda.findMany({ select: { marca: true }, distinct: ["marca"], where: { marca: { not: null } }, orderBy: { marca: "asc" } }),
    ]);
    return {
      items: [],
      total: 0,
      marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
      rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
      subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
      setMejorPrecio: new Set<string>(),
      totalPaginas: 0,
    };
  }

  /* Opciones de filtros encadenadas: cada desplegable solo muestra valores que existen
   * en el conjunto que cumple TODOS los filtros actuales (q, marca, rubro, subRubro). */
  const whereMarcas: Prisma.ListaPrecioTiendaWhereInput = { AND: [...andParts, { marca: { not: null } }] };
  const whereRubros: Prisma.ListaPrecioTiendaWhereInput = { AND: [...andParts, { rubro: { not: null } }] };
  const whereSubRubros: Prisma.ListaPrecioTiendaWhereInput = { AND: [...andParts, { subRubro: { not: null } }] };

  const [rows, total, proveedores, rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({
      where,
      orderBy: [{ descripcionTienda: "asc" }],
      skip,
      take: PAGE_SIZE,
      include: { _count: { select: { listaPreciosProveedores: true } } },
    }),
    prisma.listaPrecioTienda.count({ where }),
    prisma.proveedor.findMany({ select: { nombre: true, prefijo: true } }),
    prisma.listaPrecioTienda.findMany({ select: { rubro: true }, distinct: ["rubro"], where: whereRubros, orderBy: { rubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], where: whereSubRubros, orderBy: { subRubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { marca: true }, distinct: ["marca"], where: whereMarcas, orderBy: { marca: "asc" } }),
  ]);

  const linkedPrices =
    rows.length > 0
      ? await prisma.listaPrecioProveedor.findMany({
          where: { idListaPrecioTienda: { in: rows.map((r) => r.id) } },
          select: {
            idListaPrecioTienda: true,
            pxCompraFinal: true,
            pxListaProveedor: true,
            dtoProveedor: true,
            dtoMarca: true,
            dtoProducto: true,
            dtoCantidad: true,
            cxTransporte: true,
          },
        })
      : [];

  // Mínimo px compra final por ítem tienda (entre proveedores vinculados). Si px_compra_final es null, se calcula.
  const minPxPorTienda = new Map<string, number>();
  for (const lp of linkedPrices) {
    if (!lp.idListaPrecioTienda) continue;
    let n: number;
    if (lp.pxCompraFinal != null) {
      n = Number(lp.pxCompraFinal);
    } else {
      const pxLista = Number(lp.pxListaProveedor);
      n = calcPxCompraFinal(
        pxLista,
        lp.dtoProducto,
        lp.dtoCantidad,
        lp.cxTransporte
      );
    }
    const prev = minPxPorTienda.get(lp.idListaPrecioTienda);
    if (prev === undefined || n < prev) minPxPorTienda.set(lp.idListaPrecioTienda, n);
  }

  const nombreToPrefijo = new Map(proveedores.map((p) => [p.nombre.toLowerCase().trim(), p.prefijo]));

  const items: ItemTiendaParaTabla[] = rows.map((r) => {
    const proveedorTexto = r.proveedor?.trim() ?? null;
    const prefijo = proveedorTexto ? nombreToPrefijo.get(proveedorTexto.toLowerCase()) ?? proveedorTexto : null;
    const costo = Number(r.costoCompra);
    const minPx = minPxPorTienda.get(r.id);
    const cantidadVinculos = r._count.listaPreciosProveedores;
    /* Tilde "Menor Cx Disponible": ≥1 proveedor vinculado y alguno tiene costo menor que el principal (costo_compra). */
    const diferenciaMejorPrecio =
      cantidadVinculos >= 1 && minPx != null && minPx < costo
        ? Math.round((costo - minPx) * 100) / 100
        : null;
    return {
      id: r.id,
      codItem: r.codTienda,
      descripcion: r.descripcionTienda ?? "",
      rubro: r.rubro,
      subRubro: r.subRubro,
      marca: r.marca,
      proveedorDux: prefijo,
      codigoExterno: r.codExt,
      costo,
      porcIva: 21,
      precioLista: Number(r.pxListaTienda),
      precioMayorista: 0,
      stockGuaymallen: r.stockGuaymallen,
      stockMaipu: r.stockMaipu,
      habilitado: true,
      _count: { productos: r._count.listaPreciosProveedores },
      diferenciaMejorPrecio,
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
