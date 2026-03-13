"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";
import { getProductosVinculadosPorItemTienda } from "@/services/producto.service";
import { listarProductosProveedoresParaVincular, type ProductoProveedorParaVincular } from "@/services/listaPrecios.service";
import { getProveedores as getProveedoresFromProveedores } from "@/actions/proveedores";
import { uuidSchema } from "@/lib/validations/common";

export async function getVinculos(itemTiendaId: string): Promise<ServiceResult<ProductoCompleto[]>> {
  return getProductosVinculadosPorItemTienda(itemTiendaId);
}

/** Proveedores reales desde BD (para modal de vinculación y otros). */
export async function getProveedores() {
  return getProveedoresFromProveedores();
}

/** Lista ítems de lista_precios_proveedores para modal "Vincular nuevo producto". Filtros: proveedor, descripción (q). */
export async function listarProductosParaVincular(
  proveedorId?: string,
  q?: string
): Promise<ServiceResult<ProductoProveedorParaVincular[]>> {
  try {
    const data = await listarProductosProveedoresParaVincular(proveedorId, q);
    return { success: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function vincularProducto(
  itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const parsedItem = uuidSchema.safeParse(itemTiendaId);
  const parsedProducto = uuidSchema.safeParse(productoProveedorId);
  if (!parsedItem.success || !parsedProducto.success) {
    return { ok: false, error: "IDs inválidos." };
  }
  const { prisma } = await import("@/lib/prisma");
  const producto = await prisma.listaPrecioProveedor.findUnique({
    where: { id: parsedProducto.data },
    select: { idProveedor: true },
  });
  if (!producto) return { ok: false, error: "Producto no encontrado." };
  const yaVinculadoMismoProveedor = await prisma.listaPrecioProveedor.findFirst({
    where: {
      idListaPrecioTienda: parsedItem.data,
      idProveedor: producto.idProveedor,
      id: { not: parsedProducto.data },
    },
  });
  if (yaVinculadoMismoProveedor) {
    return { ok: false, error: "Ya existe un vínculo con ese proveedor. No se puede tener dos vinculaciones del mismo proveedor." };
  }
  await prisma.listaPrecioProveedor.update({
    where: { id: parsedProducto.data },
    data: { idListaPrecioTienda: parsedItem.data },
  });
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}

export async function desvincularProducto(
  _itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const parsed = uuidSchema.safeParse(productoProveedorId);
  if (!parsed.success) return { ok: false, error: "ID de producto inválido." };
  const { prisma } = await import("@/lib/prisma");
  await prisma.listaPrecioProveedor.update({
    where: { id: parsed.data },
    data: { idListaPrecioTienda: null },
  });
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}
