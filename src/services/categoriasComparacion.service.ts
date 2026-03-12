/**
 * Servicio Comparación por categorías.
 * Jerarquía: Categoria → Subcategoria → Presentacion.
 * Cada presentación es la "categoría de comparación final" con costo_compra_objetivo.
 */

import { prisma } from "@/lib/prisma";

export interface CategoriaComparacionTree {
  id: string;
  nombre: string;
  orden: number;
  subcategorias: {
    id: string;
    nombre: string;
    orden: number;
    presentaciones: {
      id: string;
      nombre: string;
      orden: number;
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
    orderBy: { orden: "asc" },
    include: {
      subcategorias: {
        orderBy: { orden: "asc" },
        include: {
          presentaciones: {
            orderBy: { orden: "asc" },
          },
        },
      },
    },
  });

  return categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    orden: c.orden,
    subcategorias: c.subcategorias.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      orden: s.orden,
      presentaciones: s.presentaciones.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        orden: p.orden,
        costoCompraObjetivo: p.costoCompraObjetivo != null ? Number(p.costoCompraObjetivo) : null,
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
      listaPrecios: {
        include: { proveedor: { select: { prefijo: true } } },
        orderBy: { pxCompraFinal: "asc" },
      },
    },
  });

  if (!presentacion) {
    return { productos: [], costoCompraObjetivo: null, labelCompleto: "" };
  }

  const objetivo = presentacion.costoCompraObjetivo != null ? Number(presentacion.costoCompraObjetivo) : null;
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

/** Lista plana de presentaciones con label completo (para selects). */
export async function getPresentacionesConLabel(): Promise<{ id: string; labelCompleto: string }[]> {
  const presentaciones = await prisma.presentacionComparacion.findMany({
    orderBy: { orden: "asc" },
    include: {
      subcategoria: { include: { categoria: true } },
    },
  });
  return presentaciones.map((p) => ({
    id: p.id,
    labelCompleto: `${p.subcategoria.categoria.nombre} - ${p.subcategoria.nombre} - ${p.nombre}`,
  }));
}

// ─── CRUD Categorias ────────────────────────────────────────────────────────
export async function createCategoria(nombre: string, orden?: number) {
  return prisma.categoriaComparacion.create({
    data: { nombre, orden: orden ?? 0 },
  });
}

export async function updateCategoria(id: string, data: { nombre?: string; orden?: number }) {
  return prisma.categoriaComparacion.update({ where: { id }, data });
}

export async function deleteCategoria(id: string) {
  return prisma.categoriaComparacion.delete({ where: { id } });
}

// ─── CRUD Subcategorias ─────────────────────────────────────────────────────
export async function createSubcategoria(categoriaId: string, nombre: string, orden?: number) {
  return prisma.subcategoriaComparacion.create({
    data: { categoriaId, nombre, orden: orden ?? 0 },
  });
}

export async function updateSubcategoria(
  id: string,
  data: { nombre?: string; orden?: number; categoriaId?: string }
) {
  return prisma.subcategoriaComparacion.update({ where: { id }, data });
}

export async function deleteSubcategoria(id: string) {
  return prisma.subcategoriaComparacion.delete({ where: { id } });
}

// ─── CRUD Presentaciones ────────────────────────────────────────────────────
export async function createPresentacion(
  subcategoriaId: string,
  nombre: string,
  orden?: number,
  costoCompraObjetivo?: number | null
) {
  return prisma.presentacionComparacion.create({
    data: {
      subcategoriaId,
      nombre,
      orden: orden ?? 0,
      costoCompraObjetivo: costoCompraObjetivo ?? null,
    },
  });
}

export type UpdatePresentacionData = {
  nombre?: string;
  orden?: number;
  subcategoriaId?: string;
  costoCompraObjetivo?: number | null;
};

export async function updatePresentacion(id: string, data: UpdatePresentacionData) {
  const payload: UpdatePresentacionData = {};
  if (data.nombre !== undefined) payload.nombre = data.nombre;
  if (data.orden !== undefined) payload.orden = data.orden;
  if (data.subcategoriaId !== undefined) payload.subcategoriaId = data.subcategoriaId;
  if (data.costoCompraObjetivo !== undefined) payload.costoCompraObjetivo = data.costoCompraObjetivo;
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
