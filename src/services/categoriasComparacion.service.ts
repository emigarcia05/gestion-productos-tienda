/**
 * Servicio Comparación por categorías.
 * Jerarquía: Categoria → Subcategoria → Presentacion.
 * Cada presentación es la "categoría de comparación final" con costo_compra_objetivo.
 */

import { prisma } from "@/lib/prisma";

const normalizeNombreCategoria = (nombre: string): string =>
  nombre.trim().toUpperCase();

const getObjetivoFromPresentacion = (p: {
  costoCompraObjetivo: unknown;
  productoReferencia?: { pxCompraFinal: unknown } | null;
}): number | null => {
  if (p.productoReferencia?.pxCompraFinal != null) {
    return Number(p.productoReferencia.pxCompraFinal);
  }
  if (p.costoCompraObjetivo != null) {
    return Number(p.costoCompraObjetivo);
  }
  return null;
};

export interface CategoriaComparacionTree {
  id: string;
  nombre: string;
  subcategorias: {
    id: string;
    nombre: string;
    presentaciones: {
      id: string;
      nombre: string;
      costoCompraObjetivo: number | null;
      labelCompleto: string;
    }[];
  }[];
}

export interface ProductoEnCategoria {
  id: string;
  codExt: string;
  descripcionProveedor: string;
  marca: string | null;
  pxCompraFinal: number | null;
  proveedorPrefijo: string | null;
  costoCompraObjetivo: number | null;
  diferenciaVsObjetivo: number | null; // pxCompraFinal - objetivo (negativo = bajo objetivo)
}

/** Árbol completo Categoria → Subcategoria → Presentacion para la UI. */
export async function getArbolCategorias(): Promise<CategoriaComparacionTree[]> {
  const categorias = await prisma.categoriaComparacion.findMany({
    orderBy: { nombre: "asc" },
    include: {
      subcategorias: {
        orderBy: { nombre: "asc" },
        include: {
          presentaciones: {
            orderBy: { nombre: "asc" },
            include: {
              productoReferencia: { select: { pxCompraFinal: true } },
            },
          },
        },
      },
    },
  });

  return categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    subcategorias: c.subcategorias.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      presentaciones: s.presentaciones.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        costoCompraObjetivo: getObjetivoFromPresentacion(p),
        labelCompleto: `${c.nombre} - ${s.nombre} - ${p.nombre}`,
      })),
    })),
  }));
}

/** Productos asignados a una presentación (categoría final) con comparación vs costo_compra_objetivo. */
export async function getProductosPorPresentacion(
  presentacionId: string
): Promise<{ productos: ProductoEnCategoria[]; costoCompraObjetivo: number | null; labelCompleto: string }> {
  const presentacion = await prisma.presentacionComparacion.findUnique({
    where: { id: presentacionId },
    include: {
      subcategoria: { include: { categoria: true } },
      productoReferencia: {
        select: {
          pxCompraFinal: true,
        },
      },
      listaPrecios: {
        include: { proveedor: { select: { prefijo: true } } },
        orderBy: { pxCompraFinal: "asc" },
      },
    },
  });

  if (!presentacion) {
    return { productos: [], costoCompraObjetivo: null, labelCompleto: "" };
  }

  const objetivo = getObjetivoFromPresentacion(presentacion);
  const labelCompleto = `${presentacion.subcategoria.categoria.nombre} - ${presentacion.subcategoria.nombre} - ${presentacion.nombre}`;

  const productos: ProductoEnCategoria[] = presentacion.listaPrecios.map((lp) => {
    const pxFinal = lp.pxCompraFinal != null ? Number(lp.pxCompraFinal) : null;
    const diferencia =
      objetivo != null && pxFinal != null ? Math.round((pxFinal - objetivo) * 100) / 100 : null;
    return {
      id: lp.id,
      codExt: lp.codExt,
      descripcionProveedor: lp.descripcionProveedor,
      marca: lp.marca ?? null,
      pxCompraFinal: pxFinal,
      proveedorPrefijo: lp.proveedor?.prefijo ?? null,
      costoCompraObjetivo: objetivo,
      diferenciaVsObjetivo: diferencia,
    };
  });

  return { productos, costoCompraObjetivo: objetivo, labelCompleto };
}

/** Marcas distintas de lista_tienda (precios_tienda.marca) para filtros. */
export async function getMarcasFromListaTienda(): Promise<string[]> {
  const rows = await prisma.listaPrecioTienda.findMany({
    where: { marca: { not: null } },
    select: { marca: true },
    distinct: ["marca"],
    orderBy: { marca: "asc" },
  });
  return rows.map((r) => r.marca as string).filter(Boolean);
}

/** Proveedores distintos de lista_tienda (precios_tienda.proveedor) para filtros. */
export async function getProveedoresFromListaTienda(): Promise<string[]> {
  const rows = await prisma.listaPrecioTienda.findMany({
    where: { proveedor: { not: null } },
    select: { proveedor: true },
    distinct: ["proveedor"],
    orderBy: { proveedor: "asc" },
  });
  return rows.map((r) => r.proveedor as string).filter(Boolean);
}

/** Lista plana de presentaciones con label completo (para selects). */
export async function getPresentacionesConLabel(): Promise<{ id: string; labelCompleto: string }[]> {
  const presentaciones = await prisma.presentacionComparacion.findMany({
    orderBy: { nombre: "asc" },
    include: {
      subcategoria: { include: { categoria: true } },
    },
  });
  return presentaciones.map((p) => ({
    id: p.id,
    labelCompleto: `${p.subcategoria.categoria.nombre} - ${p.subcategoria.nombre} - ${p.nombre}`,
  }));
}

/** Fila para el modal Gestionar categorías: combinación + ids para filtrar. */
export interface PresentacionParaGestion {
  id: string;
  labelCompleto: string;
  categoriaId: string;
  subcategoriaId: string;
  costoCompraObjetivo: number | null;
  /** Producto asignado cuya px_compra_final coincide con el costo objetivo, si existe. */
  productoReferencia: { prefijo: string; descripcionProveedor: string } | null;
}

const TOLERANCIA_OBJETIVO = 0.01;

/** Lista plana de presentaciones con costo objetivo y producto de referencia (primero que coincida con el objetivo). */
export async function getPresentacionesParaGestion(): Promise<PresentacionParaGestion[]> {
  const presentaciones = await prisma.presentacionComparacion.findMany({
    orderBy: { nombre: "asc" },
    include: {
      subcategoria: { include: { categoria: true } },
      productoReferencia: {
        select: {
          proveedor: { select: { prefijo: true } },
          descripcionProveedor: true,
          pxCompraFinal: true,
        },
      },
      listaPrecios: {
        select: {
          proveedor: { select: { prefijo: true } },
          descripcionProveedor: true,
          pxCompraFinal: true,
        },
      },
    },
  });
  return presentaciones.map((p) => {
    const objetivo = getObjetivoFromPresentacion(p);

    // Si hay productoReferencia explícito, usarlo siempre.
    const refExplicito = p.productoReferencia && p.productoReferencia.pxCompraFinal != null
      ? p.productoReferencia
      : null;

    // Fallback para presentaciones antiguas: buscar por coincidencia con costoCompraObjetivo.
    const refCalculado = !refExplicito && objetivo != null && p.listaPrecios.length > 0
      ? p.listaPrecios.find(
          (lp) => lp.pxCompraFinal != null && Math.abs(Number(lp.pxCompraFinal) - objetivo) < TOLERANCIA_OBJETIVO
        )
      : null;

    const ref = refExplicito ?? refCalculado;

    return {
      id: p.id,
      labelCompleto: `${p.subcategoria.categoria.nombre} - ${p.subcategoria.nombre} - ${p.nombre}`,
      categoriaId: p.subcategoria.categoria.id,
      subcategoriaId: p.subcategoria.id,
      costoCompraObjetivo: objetivo,
      productoReferencia: ref
        ? { prefijo: ref.proveedor?.prefijo ?? "", descripcionProveedor: ref.descripcionProveedor }
        : null,
    };
  });
}

// ─── CRUD Categorias ────────────────────────────────────────────────────────
export async function createCategoria(nombre: string) {
  return prisma.categoriaComparacion.create({
    data: { nombre: normalizeNombreCategoria(nombre) },
  });
}

export async function updateCategoria(id: string, data: { nombre?: string }) {
  const payload: { nombre?: string } = {};
  if (data.nombre !== undefined) {
    payload.nombre = normalizeNombreCategoria(data.nombre);
  }
  return prisma.categoriaComparacion.update({ where: { id }, data: payload });
}

export async function deleteCategoria(id: string) {
  return prisma.categoriaComparacion.delete({ where: { id } });
}

// ─── CRUD Subcategorias ─────────────────────────────────────────────────────
export async function createSubcategoria(categoriaId: string, nombre: string) {
  return prisma.subcategoriaComparacion.create({
    data: { categoriaId, nombre: normalizeNombreCategoria(nombre) },
  });
}

export async function updateSubcategoria(
  id: string,
  data: { nombre?: string; categoriaId?: string }
) {
  const payload: { nombre?: string; categoriaId?: string } = {};
  if (data.nombre !== undefined) {
    payload.nombre = normalizeNombreCategoria(data.nombre);
  }
  if (data.categoriaId !== undefined) {
    payload.categoriaId = data.categoriaId;
  }
  return prisma.subcategoriaComparacion.update({ where: { id }, data: payload });
}

export async function deleteSubcategoria(id: string) {
  return prisma.subcategoriaComparacion.delete({ where: { id } });
}

// ─── CRUD Presentaciones ────────────────────────────────────────────────────
export async function createPresentacion(
  subcategoriaId: string,
  nombre: string,
  costoCompraObjetivo?: number | null
) {
  return prisma.presentacionComparacion.create({
    data: {
      subcategoriaId,
      nombre: normalizeNombreCategoria(nombre),
      costoCompraObjetivo: costoCompraObjetivo ?? null,
    },
  });
}

export type UpdatePresentacionData = {
  nombre?: string;
  subcategoriaId?: string;
  costoCompraObjetivo?: number | null;
   idProductoReferencia?: string | null;
};

export async function updatePresentacion(id: string, data: UpdatePresentacionData) {
  const payload: UpdatePresentacionData = {};
  if (data.nombre !== undefined) {
    payload.nombre = normalizeNombreCategoria(data.nombre);
  }
  if (data.subcategoriaId !== undefined) payload.subcategoriaId = data.subcategoriaId;
  if (data.costoCompraObjetivo !== undefined) payload.costoCompraObjetivo = data.costoCompraObjetivo;
  if (data.idProductoReferencia !== undefined) payload.idProductoReferencia = data.idProductoReferencia;
  return prisma.presentacionComparacion.update({ where: { id }, data: payload });
}

export async function deletePresentacion(id: string) {
  return prisma.presentacionComparacion.delete({ where: { id } });
}

/** Asignar productos (ids de lista_precios_proveedores) a una presentación. */
export async function asignarProductosAPresentacion(
  presentacionId: string,
  idsProductos: string[]
): Promise<{ count: number }> {
  if (idsProductos.length === 0) return { count: 0 };
  const result = await prisma.listaPrecioProveedor.updateMany({
    where: { id: { in: idsProductos } },
    data: { idPresentacion: presentacionId },
  });
  return { count: result.count };
}

/** Quitar asignación de presentación de productos (poner id_presentacion en null). */
export async function quitarAsignacionPresentacion(idsProductos: string[]): Promise<{ count: number }> {
  if (idsProductos.length === 0) return { count: 0 };
  const result = await prisma.listaPrecioProveedor.updateMany({
    where: { id: { in: idsProductos } },
    data: { idPresentacion: null },
  });
  return { count: result.count };
}
