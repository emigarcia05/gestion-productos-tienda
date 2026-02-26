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

// ─── Vincular un producto a un ItemTienda (relación 1:1 por productoProveedorId) ─────────────────────────────────

export async function vincularProducto(
  itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  try {
    await prisma.itemTienda.update({
      where: { id: itemTiendaId },
      data: { productoProveedorId },
    });
    revalidatePath("/tienda");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo crear el vínculo." };
  }
}

// ─── Desvincular el producto de un ItemTienda ─────────────────────────────

export async function desvincularProducto(
  itemTiendaId: string,
  _productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  try {
    await prisma.itemTienda.update({
      where: { id: itemTiendaId },
      data: { productoProveedorId: null },
    });
    revalidatePath("/tienda");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo eliminar el vínculo." };
  }
}

// ─── Auto-vincular por codigoExterno ─────────────────────────────────────
// Busca un ProductoProveedor cuyo codigoExterno coincida y asigna itemTienda.productoProveedorId

export async function autoVincular(
  itemTiendaId: string
): Promise<ActionResult<{ vinculados: number }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  try {
    const item = await prisma.itemTienda.findUnique({
      where: { id: itemTiendaId },
      select: { codigoExterno: true, productoProveedorId: true },
    });

    if (!item?.codigoExterno) {
      return { ok: false, error: "Este item no tiene código externo para auto-vincular." };
    }

    const producto = await prisma.productoProveedor.findFirst({
      where: {
        OR: [
          { codigoExterno: { contains: item.codigoExterno, mode: "insensitive" } },
          { codProdProv:   { contains: item.codigoExterno, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (!producto) {
      return { ok: false, error: `No se encontró producto con código "${item.codigoExterno}".` };
    }

    const yaVinculado = item.productoProveedorId === producto.id;
    if (!yaVinculado) {
      await prisma.itemTienda.update({
        where: { id: itemTiendaId },
        data: { productoProveedorId: producto.id },
      });
    }

    revalidatePath("/tienda");
    return { ok: true, data: { vinculados: yaVinculado ? 0 : 1 } };
  } catch {
    return { ok: false, error: "Error al auto-vincular." };
  }
}
