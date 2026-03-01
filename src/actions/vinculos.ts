"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";
import { getProductosVinculadosPorItemTienda } from "@/services/producto.service";
import { listarProductosProveedoresParaVincular, type ProductoProveedorParaVincular } from "@/services/listaPrecios.service";
import { getProveedores as getProveedoresFromProveedores } from "@/actions/proveedores";

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
  const { prisma } = await import("@/lib/prisma");
  await prisma.listaPrecioProveedor.update({
    where: { id: productoProveedorId },
    data: { idListaPrecioTienda: itemTiendaId },
  });
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}

export async function desvincularProducto(
  itemTiendaId: string,
  _productoProveedorId: string
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}

export async function autoVincular(itemTiendaId: string): Promise<ActionResult<{ vinculados: number }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  revalidatePath("/tienda");
  return { ok: true, data: { vinculados: 0 } };
}
