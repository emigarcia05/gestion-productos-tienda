"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Obtener productos vinculados a un ItemTienda ─────────────────────────

export async function getVinculos(itemTiendaId: string) {
  const vinculos = await prisma.itemTiendaProducto.findMany({
    where: { itemTiendaId },
    include: {
      producto: {
        include: { proveedor: { select: { nombre: true, sufijo: true } } },
      },
    },
    orderBy: { producto: { codExt: "asc" } },
  });
  return vinculos.map((v) => v.producto);
}

// ─── Buscar productos de Lista Proveedores ────────────────────────────────

export async function buscarProductos(q: string, excluirItemTiendaId: string) {
  if (!q || q.trim().length < 2) return [];

  const yaVinculados = await prisma.itemTiendaProducto.findMany({
    where: { itemTiendaId: excluirItemTiendaId },
    select: { productoId: true },
  });
  const idsExcluidos = yaVinculados.map((v) => v.productoId);

  return prisma.producto.findMany({
    where: {
      id: { notIn: idsExcluidos },
      OR: [
        { descripcion: { contains: q, mode: "insensitive" } },
        { codExt:      { contains: q, mode: "insensitive" } },
        { codProdProv: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { proveedor: { select: { nombre: true, sufijo: true } } },
    take: 20,
    orderBy: { codExt: "asc" },
  });
}

// ─── Vincular un producto a un ItemTienda ─────────────────────────────────

export async function vincularProducto(
  itemTiendaId: string,
  productoId: string
): Promise<ActionResult> {
  try {
    await prisma.itemTiendaProducto.create({
      data: { itemTiendaId, productoId },
    });
    revalidatePath("/tienda");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo crear el vínculo." };
  }
}

// ─── Desvincular un producto de un ItemTienda ─────────────────────────────

export async function desvincularProducto(
  itemTiendaId: string,
  productoId: string
): Promise<ActionResult> {
  try {
    await prisma.itemTiendaProducto.delete({
      where: { itemTiendaId_productoId: { itemTiendaId, productoId } },
    });
    revalidatePath("/tienda");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo eliminar el vínculo." };
  }
}

// ─── Auto-vincular por codigoExterno ─────────────────────────────────────
// Busca productos cuyo codExt coincida con el codigoExterno del ItemTienda

export async function autoVincular(
  itemTiendaId: string
): Promise<ActionResult<{ vinculados: number }>> {
  try {
    const item = await prisma.itemTienda.findUnique({
      where: { id: itemTiendaId },
      select: { codigoExterno: true },
    });

    if (!item?.codigoExterno) {
      return { ok: false, error: "Este item no tiene código externo para auto-vincular." };
    }

    // Buscar productos que coincidan con el codigoExterno
    const productos = await prisma.producto.findMany({
      where: {
        OR: [
          { codExt:      { contains: item.codigoExterno, mode: "insensitive" } },
          { codProdProv: { contains: item.codigoExterno, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (productos.length === 0) {
      return { ok: false, error: `No se encontraron productos con código "${item.codigoExterno}".` };
    }

    // Crear vínculos solo para los que no existen aún
    const existentes = await prisma.itemTiendaProducto.findMany({
      where: { itemTiendaId },
      select: { productoId: true },
    });
    const setExistentes = new Set(existentes.map((e) => e.productoId));
    const nuevos = productos.filter((p) => !setExistentes.has(p.id));

    if (nuevos.length > 0) {
      await prisma.itemTiendaProducto.createMany({
        data: nuevos.map((p) => ({ itemTiendaId, productoId: p.id })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/tienda");
    return { ok: true, data: { vinculados: nuevos.length } };
  } catch {
    return { ok: false, error: "Error al auto-vincular." };
  }
}
