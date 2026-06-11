/**
 * Servicio Comparación por categorías.
 * Jerarquía: Categoria → Subcategoria → Presentacion.
 * Referente: fila de prod_precios_competencia (precio vía `resolverPreciosCompetenciaMostrar`, igual Px Competencia).
 */

import { prisma } from "@/lib/prisma";
import {
  resolverPrecioCompetenciaMostrar,
  resolverPreciosCompetenciaMostrar,
} from "@/services/competenciaPxSugerido.service";

const normalizeNombreCategoria = (nombre: string): string =>
  nombre.trim().toUpperCase();

export interface ReferenciaCompetenciaPresentacion {
  codTienda: string;
  competenciaId: string;
  competenciaNombre: string;
  descripcionTienda: string | null;
  pxMostrar: number | null;
  etiqueta: string;
}

export interface OpcionReferenciaCompetencia {
  codTienda: string;
  competenciaId: string;
  competenciaNombre: string;
  descripcionTienda: string | null;
  pxMostrar: number | null;
  etiqueta: string;
}

async function buildReferenciaCompetenciaPresentacion(
  presentacion: {
    refCodTienda: string | null;
    refCompetenciaId: string | null;
    referenciaCompetencia: {
      codTienda: string;
      competenciaId: string;
      competencia: { nombre: string };
      prodTienda: { descripcionTienda: string | null };
    } | null;
  }
): Promise<ReferenciaCompetenciaPresentacion | null> {
  if (!presentacion.refCodTienda || !presentacion.refCompetenciaId || !presentacion.referenciaCompetencia) {
    return null;
  }

  const resuelto = await resolverPrecioCompetenciaMostrar(
    presentacion.refCodTienda,
    presentacion.refCompetenciaId
  );
  const competenciaNombre = presentacion.referenciaCompetencia.competencia.nombre;
  const descripcionTienda = presentacion.referenciaCompetencia.prodTienda.descripcionTienda;
  const etiqueta = `${competenciaNombre} — ${descripcionTienda ?? presentacion.refCodTienda}`;

  return {
    codTienda: presentacion.refCodTienda,
    competenciaId: presentacion.refCompetenciaId,
    competenciaNombre,
    descripcionTienda,
    pxMostrar: resuelto?.pxMostrar ?? null,
    etiqueta,
  };
}

const getObjetivoFromPresentacion = async (p: {
  costoCompraObjetivo: unknown;
  productoReferencia?: { pxCompraFinalSinIva: unknown } | null;
  refCodTienda: string | null;
  refCompetenciaId: string | null;
  referenciaCompetencia: {
    codTienda: string;
    competenciaId: string;
    competencia: { nombre: string };
    prodTienda: { descripcionTienda: string | null };
  } | null;
}): Promise<number | null> => {
  const refComp = await buildReferenciaCompetenciaPresentacion(p);
  if (refComp?.pxMostrar != null) return refComp.pxMostrar;
  if (p.productoReferencia?.pxCompraFinalSinIva != null) {
    return Number(p.productoReferencia.pxCompraFinalSinIva);
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
      referenciaCompetencia: ReferenciaCompetenciaPresentacion | null;
      labelCompleto: string;
    }[];
  }[];
}

export interface ProductoEnCategoria {
  id: string;
  codExt: string;
  descripcionProveedor: string;
  marca: string | null;
  pxCompraFinalSinIva: number | null;
  proveedorPrefijo: string | null;
  /** DTO. EXTRA (0-99) persistido para "Comp. Por Cat." por ítem. */
  dtoExtraComparacion: number | null;
  costoCompraObjetivo: number | null;
  diferenciaVsObjetivo: number | null; // pxCompraFinalSinIva - objetivo (negativo = bajo objetivo)
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
              productoReferencia: { select: { pxCompraFinalSinIva: true } },
              referenciaCompetencia: {
                include: {
                  competencia: { select: { nombre: true } },
                  prodTienda: { select: { descripcionTienda: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return Promise.all(
    categorias.map(async (c) => ({
      id: c.id,
      nombre: c.nombre,
      subcategorias: await Promise.all(
        c.subcategorias.map(async (s) => ({
          id: s.id,
          nombre: s.nombre,
          presentaciones: await Promise.all(
            s.presentaciones.map(async (p) => ({
              id: p.id,
              nombre: p.nombre,
              costoCompraObjetivo: await getObjetivoFromPresentacion(p),
              referenciaCompetencia: await buildReferenciaCompetenciaPresentacion(p),
              labelCompleto: `${c.nombre} - ${s.nombre} - ${p.nombre}`,
            }))
          ),
        }))
      ),
    }))
  );
}

/** Productos asignados a una presentación con referente de competencia. */
export async function getProductosPorPresentacion(
  presentacionId: string
): Promise<{
  productos: ProductoEnCategoria[];
  costoCompraObjetivo: number | null;
  labelCompleto: string;
  referenciaCompetencia: ReferenciaCompetenciaPresentacion | null;
}> {
  const presentacion = await prisma.presentacionComparacion.findUnique({
    where: { id: presentacionId },
    include: {
      subcategoria: { include: { categoria: true } },
      referenciaCompetencia: {
        include: {
          competencia: { select: { nombre: true } },
          prodTienda: { select: { descripcionTienda: true } },
        },
      },
      productoReferencia: { select: { pxCompraFinalSinIva: true } },
      listaPrecios: {
        include: {
          proveedor: { select: { prefijo: true } },
          dtoExtraComparacion: { select: { dtoExtra: true } },
        },
        orderBy: { pxCompraFinalSinIva: "asc" },
      },
    },
  });

  if (!presentacion) {
    return {
      productos: [],
      costoCompraObjetivo: null,
      labelCompleto: "",
      referenciaCompetencia: null,
    };
  }

  const labelCompleto = `${presentacion.subcategoria.categoria.nombre} - ${presentacion.subcategoria.nombre} - ${presentacion.nombre}`;
  const referenciaCompetencia = await buildReferenciaCompetenciaPresentacion(presentacion);
  const objetivo = await getObjetivoFromPresentacion(presentacion);

  const productos: ProductoEnCategoria[] = presentacion.listaPrecios.map((lp) => {
    const pxFinal = lp.pxCompraFinalSinIva != null ? Number(lp.pxCompraFinalSinIva) : null;
    const dif =
      pxFinal != null && objetivo != null ? pxFinal - objetivo : null;
    return {
      id: lp.codExt,
      codExt: lp.codExt,
      descripcionProveedor: lp.descripcionProveedor,
      marca: lp.marca ?? null,
      pxCompraFinalSinIva: pxFinal,
      proveedorPrefijo: lp.proveedor?.prefijo ?? null,
      dtoExtraComparacion: lp.dtoExtraComparacion?.dtoExtra ?? null,
      costoCompraObjetivo: objetivo,
      diferenciaVsObjetivo: dif,
    };
  });

  return { productos, costoCompraObjetivo: objetivo, labelCompleto, referenciaCompetencia };
}

/** Marcas distintas de lista_tienda (prod_precios_tienda.marca) para filtros. */
export async function getMarcasFromListaTienda(): Promise<string[]> {
  const rows = await prisma.prodTienda.findMany({
    where: { marca: { not: null } },
    select: { marca: true },
    distinct: ["marca"],
    orderBy: { marca: "asc" },
  });
  return rows.map((r) => r.marca as string).filter(Boolean);
}

/** Proveedores distintos de lista_tienda (prod_precios_tienda.proveedor) para filtros. */
export async function getProveedoresFromListaTienda(): Promise<string[]> {
  const rows = await prisma.prodTienda.findMany({
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
  referenciaCompetencia: ReferenciaCompetenciaPresentacion | null;
  /** @deprecated Legacy prod_precios_provee */
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
          pxCompraFinalSinIva: true,
        },
      },
      referenciaCompetencia: {
        include: {
          competencia: { select: { nombre: true } },
          prodTienda: { select: { descripcionTienda: true } },
        },
      },
      listaPrecios: {
        select: {
          proveedor: { select: { prefijo: true } },
          descripcionProveedor: true,
          pxCompraFinalSinIva: true,
        },
      },
    },
  });
  return Promise.all(
    presentaciones.map(async (p) => {
      const objetivo = await getObjetivoFromPresentacion(p);
      const referenciaCompetencia = await buildReferenciaCompetenciaPresentacion(p);

      const refExplicito =
        p.productoReferencia && p.productoReferencia.pxCompraFinalSinIva != null
          ? p.productoReferencia
          : null;

      const refCalculado =
        !refExplicito && !referenciaCompetencia && objetivo != null && p.listaPrecios.length > 0
          ? p.listaPrecios.find(
              (lp) =>
                lp.pxCompraFinalSinIva != null &&
                Math.abs(Number(lp.pxCompraFinalSinIva) - objetivo) < TOLERANCIA_OBJETIVO
            )
          : null;

      const ref = refExplicito ?? refCalculado;

      return {
        id: p.id,
        labelCompleto: `${p.subcategoria.categoria.nombre} - ${p.subcategoria.nombre} - ${p.nombre}`,
        categoriaId: p.subcategoria.categoria.id,
        subcategoriaId: p.subcategoria.id,
        costoCompraObjetivo: objetivo,
        referenciaCompetencia,
        productoReferencia: ref
          ? { prefijo: ref.proveedor?.prefijo ?? "", descripcionProveedor: ref.descripcionProveedor }
          : null,
      };
    })
  );
}

/** Opciones para elegir referente desde prod_precios_competencia (catálogo Px Competencia). */
export async function buscarOpcionesReferenciaCompetencia(params: {
  q?: string;
  take?: number;
}): Promise<OpcionReferenciaCompetencia[]> {
  const q = params.q?.trim().toUpperCase() ?? "";
  const take = params.take ?? 100;

  const rows = await prisma.prodPrecioCompetencia.findMany({
    where: {
      prodTienda: { compararCompetencia: true },
      ...(q
        ? {
            OR: [
              { codTienda: { contains: q, mode: "insensitive" } },
              { prodTienda: { descripcionTienda: { contains: q, mode: "insensitive" } } },
              { competencia: { nombre: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    take,
    orderBy: [{ prodTienda: { descripcionTienda: "asc" } }, { competencia: { nombre: "asc" } }],
    select: {
      codTienda: true,
      competenciaId: true,
      urlProducto: true,
      tipoPagina: true,
      pxCompetencia: true,
      estado: true,
      errorMensaje: true,
      relevadoAt: true,
      competencia: { select: { nombre: true } },
      prodTienda: { select: { descripcionTienda: true } },
    },
  });

  const preciosMap = await resolverPreciosCompetenciaMostrar(
    rows.map((r) => ({ codTienda: r.codTienda, competenciaId: r.competenciaId }))
  );

  return rows.map((r) => {
    const resuelto = preciosMap.get(`${r.codTienda}:${r.competenciaId}`);
    const competenciaNombre = r.competencia.nombre;
    const descripcionTienda = r.prodTienda.descripcionTienda;
    return {
      codTienda: r.codTienda,
      competenciaId: r.competenciaId,
      competenciaNombre,
      descripcionTienda,
      pxMostrar: resuelto?.pxMostrar ?? null,
      etiqueta: `${competenciaNombre} — ${descripcionTienda ?? r.codTienda}`,
    };
  });
}

export async function asignarReferenciaCompetenciaPresentacion(
  presentacionId: string,
  codTienda: string,
  competenciaId: string
): Promise<void> {
  const vinculo = await prisma.prodPrecioCompetencia.findUnique({
    where: { codTienda_competenciaId: { codTienda, competenciaId } },
    select: { prodTienda: { select: { compararCompetencia: true } } },
  });
  if (!vinculo?.prodTienda.compararCompetencia) {
    throw new Error("El producto no está en el catálogo de Px Competencia.");
  }

  await prisma.presentacionComparacion.update({
    where: { id: presentacionId },
    data: {
      refCodTienda: codTienda,
      refCompetenciaId: competenciaId,
      productoReferenciaCodExt: null,
      costoCompraObjetivo: null,
    },
  });
}

export async function quitarReferenciaCompetenciaPresentacion(presentacionId: string): Promise<void> {
  await prisma.presentacionComparacion.update({
    where: { id: presentacionId },
    data: {
      refCodTienda: null,
      refCompetenciaId: null,
    },
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
  /** @deprecated Legacy prod_precios_provee */
  productoReferenciaCodExt?: string | null;
  refCodTienda?: string | null;
  refCompetenciaId?: string | null;
};

export async function updatePresentacion(id: string, data: UpdatePresentacionData) {
  const payload: UpdatePresentacionData = {};
  if (data.nombre !== undefined) {
    payload.nombre = normalizeNombreCategoria(data.nombre);
  }
  if (data.subcategoriaId !== undefined) payload.subcategoriaId = data.subcategoriaId;
  if (data.costoCompraObjetivo !== undefined) payload.costoCompraObjetivo = data.costoCompraObjetivo;
  if (data.productoReferenciaCodExt !== undefined)
    payload.productoReferenciaCodExt = data.productoReferenciaCodExt;
  if (data.refCodTienda !== undefined) payload.refCodTienda = data.refCodTienda;
  if (data.refCompetenciaId !== undefined) payload.refCompetenciaId = data.refCompetenciaId;

  if (data.refCodTienda != null && data.refCompetenciaId != null) {
    payload.productoReferenciaCodExt = null;
    payload.costoCompraObjetivo = null;
  }

  return prisma.presentacionComparacion.update({ where: { id }, data: payload });
}

export async function deletePresentacion(id: string) {
  return prisma.presentacionComparacion.delete({ where: { id } });
}

/** Asignar productos (`cod_ext` de prod_precios_provee) a una presentación. */
export async function asignarProductosAPresentacion(
  presentacionId: string,
  codigosExtProductos: string[]
): Promise<{ count: number }> {
  if (codigosExtProductos.length === 0) return { count: 0 };
  const result = await prisma.listaPrecioProveedor.updateMany({
    where: { codExt: { in: codigosExtProductos } },
    data: { idPresentacion: presentacionId },
  });
  return { count: result.count };
}

/** Quitar asignación de presentación de productos (poner id_presentacion en null). */
export async function quitarAsignacionPresentacion(codigosExtProductos: string[]): Promise<{ count: number }> {
  if (codigosExtProductos.length === 0) return { count: 0 };
  const result = await prisma.listaPrecioProveedor.updateMany({
    where: { codExt: { in: codigosExtProductos } },
    data: { idPresentacion: null },
  });
  return { count: result.count };
}

/** Persistir DTO. EXTRA para "Comp. Por Cat." por ítem (ListaPrecioProveedor). */
export async function actualizarDtoExtraComparacionItem(
  listaPrecioProveedorCodExt: string,
  dtoExtra: number | null
): Promise<void> {
  if (dtoExtra === null) {
    await prisma.comparacionDtoExtraItem.deleteMany({
      where: { listaPrecioProveedorCodExt },
    });
    return;
  }

  await prisma.comparacionDtoExtraItem.upsert({
    where: { listaPrecioProveedorCodExt },
    create: { listaPrecioProveedorCodExt, dtoExtra },
    update: { dtoExtra },
  });
}
