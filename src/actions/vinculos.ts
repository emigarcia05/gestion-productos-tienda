"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";
import {
  getProductosVinculadosPorItemTienda,
  buscarProductos as buscarProductosService,
} from "@/services/producto.service";

// ─── Obtener productos vinculados a un ItemTienda (delega al servicio) ─────

export async function getVinculos(itemTiendaId: string): Promise<ServiceResult<ProductoCompleto[]>> {
  return getProductosVinculadosPorItemTienda(itemTiendaId);
}

// ─── Buscar productos de Lista Proveedores ────────────────────────────────

export async function getProveedores() {
  return prisma.proveedor.findMany({
    select: { id: true, nombre: true, sufijo: true },
    orderBy: { nombre: "asc" },
  });
}

export async function buscarProductos(
  q: string,
  excluirItemTiendaId: string,
  proveedorId?: string
): Promise<ServiceResult<ProductoCompleto[]>> {
  return buscarProductosService(q, excluirItemTiendaId, proveedorId);
}

// ─── Vincular un producto a un ItemTienda ─────────────────────────────────

export async function vincularProducto(
  itemTiendaId: string,
  productoId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
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
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
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
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
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
