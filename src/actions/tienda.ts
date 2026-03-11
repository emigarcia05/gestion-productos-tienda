"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import { filtroTexto } from "@/lib/busqueda";
import { calcPxCompraFinal } from "@/lib/calculos";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

/** Respuesta vacía con opciones de filtros (marcas, rubros, subRubros) para reutilizar en sinFiltros y mejorPrecio sin resultados. */
async function getTiendaEmptyWithOpciones() {
  const [rubrosDistinct, subRubrosDistinct, marcasDistinct] = await Promise.all([
    prisma.listaPrecioTienda.findMany({ select: { rubro: true }, distinct: ["rubro"], where: { rubro: { not: null } }, orderBy: { rubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { subRubro: true }, distinct: ["subRubro"], where: { subRubro: { not: null } }, orderBy: { subRubro: "asc" } }),
    prisma.listaPrecioTienda.findMany({ select: { marca: true }, distinct: ["marca"], where: { marca: { not: null } }, orderBy: { marca: "asc" } }),
  ]);
  return {
    items: [] as ItemTiendaParaTabla[],
    total: 0,
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
    setMejorPrecio: new Set<string>(),
    totalPaginas: 0,
  };
}

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
  /** Si hay ≥2 proveedores vinculados y al menos un no oficial con px_compra_final < costo_compra: diferencia (costo - mejor px no oficial). Null en caso contrario. */
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
  proveedor?: string;
  mejorPrecio?: string;
  pagina?: string;
}) {
  const {
    q = "",
    rubro = "",
    subRubro = "",
    marca = "",
    proveedor = "",
    mejorPrecio = "",
    pagina = "1",
  } = params;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;

  const andParts: Prisma.ListaPrecioTiendaWhereInput[] = [];
  const textFilter = filtroTexto(q, ["descripcionTienda", "codTienda"]);
  if (textFilter.AND?.length) andParts.push(textFilter);
  if (rubro) andParts.push({ rubro });
  if (subRubro) andParts.push({ subRubro });
  if (marca) andParts.push({ marca });
   // Filtro por proveedor (texto de columna proveedor en precios_tienda).
  if (proveedor) andParts.push({ proveedor });

  /* Filtro "Menor Cx Disponible": ≥2 proveedores vinculados y al menos un no oficial con px_compra_final < costo_compra. */
  let idsMenorCxDisponible: string[] = [];
  if (mejorPrecio === "true") {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT lpt.id
      FROM precios_tienda lpt
      WHERE (SELECT COUNT(*) FROM precios_proveedores lpp WHERE lpp.id_lista_precios_tienda = lpt.id) >= 2
        AND EXISTS (
          SELECT 1 FROM precios_proveedores lpp
          INNER JOIN proveedores p ON p.id = lpp.id_proveedor
          WHERE lpp.id_lista_precios_tienda = lpt.id
            AND LOWER(TRIM(COALESCE(p.nombre, ''))) != LOWER(TRIM(COALESCE(lpt.proveedor, '')))
            AND COALESCE(lpp.px_compra_final, lpp.px_lista_proveedor::numeric) < lpt.costo_compra
        )
    `;
    idsMenorCxDisponible = rows.map((r) => r.id);
    if (idsMenorCxDisponible.length === 0) return getTiendaEmptyWithOpciones();
    andParts.push({ id: { in: idsMenorCxDisponible } });
  }

  const where: Prisma.ListaPrecioTiendaWhereInput = andParts.length ? { AND: andParts } : {};

  /* Sin filtros: no cargar ítems para que la navegación sea más rápida; solo opciones de filtros. */
  if (andParts.length === 0) return getTiendaEmptyWithOpciones();

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
            dtoRubro: true,
            dtoCantidad: true,
            dtoFinanciero: true,
            cxTransporte: true,
            proveedor: { select: { nombre: true } },
          },
        })
      : [];

  const proveedorOficialPorTienda = new Map<string, string>();
  for (const r of rows) {
    const txt = (r.proveedor ?? "").trim().toLowerCase();
    proveedorOficialPorTienda.set(r.id, txt);
  }

  // Mínimo px_compra_final solo entre proveedores NO oficiales por ítem tienda (para tilde "Menor Cx Disponible").
  const minPxNoOficialPorTienda = new Map<string, number>();
  for (const lp of linkedPrices) {
    if (!lp.idListaPrecioTienda) continue;
    const oficial = proveedorOficialPorTienda.get(lp.idListaPrecioTienda) ?? "";
    const nombreProveedor = (lp.proveedor?.nombre ?? "").trim().toLowerCase();
    if (nombreProveedor === oficial) continue; // excluir proveedor oficial
    let n: number;
    if (lp.pxCompraFinal != null) {
      n = Number(lp.pxCompraFinal);
    } else {
      const pxLista = Number(lp.pxListaProveedor);
      n = calcPxCompraFinal(
        pxLista,
        lp.dtoRubro,
        lp.dtoCantidad,
        lp.cxTransporte,
        lp.dtoProveedor,
        lp.dtoMarca,
        lp.dtoFinanciero
      );
    }
    const prev = minPxNoOficialPorTienda.get(lp.idListaPrecioTienda);
    if (prev === undefined || n < prev) minPxNoOficialPorTienda.set(lp.idListaPrecioTienda, n);
  }

  const nombreToPrefijo = new Map(proveedores.map((p) => [p.nombre.toLowerCase().trim(), p.prefijo]));

  const items: ItemTiendaParaTabla[] = rows.map((r) => {
    const proveedorTexto = r.proveedor?.trim() ?? null;
    const prefijo = proveedorTexto ? nombreToPrefijo.get(proveedorTexto.toLowerCase()) ?? proveedorTexto : null;
    const costo = Number(r.costoCompra);
    const minPxNoOficial = minPxNoOficialPorTienda.get(r.id);
    const cantidadVinculos = r._count.listaPreciosProveedores;
    /* Tilde "Menor Cx Disponible": ≥2 proveedores vinculados y al menos un no oficial con px_compra_final < costo_compra. */
    const diferenciaMejorPrecio =
      cantidadVinculos >= 2 && minPxNoOficial != null && minPxNoOficial < costo
        ? Math.round((costo - minPxNoOficial) * 100) / 100
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
    proveedores: proveedores.map((p) => ({ nombre: p.nombre, prefijo: p.prefijo })),
    marcas: marcasDistinct.filter((m) => m.marca != null).map((m) => ({ marca: m.marca! })),
    rubros: rubrosDistinct.filter((r) => r.rubro != null).map((r) => ({ rubro: r.rubro! })),
    subRubros: subRubrosDistinct.filter((s) => s.subRubro != null).map((s) => ({ subRubro: s.subRubro! })),
    setMejorPrecio: new Set<string>(),
    totalPaginas: Math.ceil(total / PAGE_SIZE),
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
  pxCompraFinal:   number;
  pctAumento:      number; // ((pxCompraFinal - costoTienda) / costoTienda) * 100
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
  const { getControlAumentosData } = await import("@/services/controlAumentos.service");
  return getControlAumentosData();
}

/** Marca un producto vinculado como proveedor principal: actualiza precios_tienda.cod_ext y precios_tienda.proveedor. */
export async function convertirEnProveedor(
  itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const itemProveedor = await prisma.listaPrecioProveedor.findUnique({
    where: { id: productoProveedorId },
    include: { proveedor: { select: { nombre: true, prefijo: true } } },
  });
  if (!itemProveedor || itemProveedor.idListaPrecioTienda !== itemTiendaId) {
    return { ok: false, error: "Producto no encontrado o no está vinculado a este ítem." };
  }
  await prisma.listaPrecioTienda.update({
    where: { id: itemTiendaId },
    data: {
      codExt: itemProveedor.codExt,
      proveedor: itemProveedor.proveedor.nombre ?? itemProveedor.proveedor.prefijo,
    },
  });
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}
