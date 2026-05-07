"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import type { ServiceResult } from "@/types";
import type { ProductoCompleto } from "@/types";
import { getProductosVinculadosPorItemTienda } from "@/services/producto.service";
import { listarProductosProveedoresParaVincular, type ProductoProveedorParaVincular } from "@/services/listaPrecios.service";
import { getProveedoresMercaderia as getProveedoresFromProveedores } from "@/actions/proveedores";
import { uuidSchema } from "@/lib/validations/common";
import { z } from "zod";

const listarParaVincularFiltrosSchema = z.object({
  proveedorId: z.string().max(128).optional(),
  q: z.string().max(500).optional(),
});

export async function getVinculos(itemTiendaId: string): Promise<ServiceResult<ProductoCompleto[]>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) {
    return { success: false, error: "Sin acceso a tienda." };
  }
  const parsedId = uuidSchema.safeParse(itemTiendaId);
  if (!parsedId.success) return { success: false, error: "ID de ítem inválido." };
  return getProductosVinculadosPorItemTienda(parsedId.data);
}

/** Proveedores reales desde BD (para modal de vinculación y otros). */
export async function getProveedores() {
  return getProveedoresFromProveedores();
}

/** Lista ítems de prod_precios_provee para modal "Vincular nuevo producto". Filtros: proveedor, descripción (q). */
export async function listarProductosParaVincular(
  proveedorId?: string,
  q?: string
): Promise<ServiceResult<ProductoProveedorParaVincular[]>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) {
    return { success: false, error: "Sin acceso a tienda." };
  }
  const parsed = listarParaVincularFiltrosSchema.safeParse({ proveedorId, q });
  if (!parsed.success) {
    return { success: false, error: "Parámetros de búsqueda inválidos." };
  }
  try {
    const data = await listarProductosProveedoresParaVincular(
      parsed.data.proveedorId,
      parsed.data.q
    );
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
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) {
    return { ok: false, error: "Sin acceso a tienda." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const parsedItem = uuidSchema.safeParse(itemTiendaId);
  const parsedProducto = uuidSchema.safeParse(productoProveedorId);
  if (!parsedItem.success || !parsedProducto.success) {
    return { ok: false, error: "IDs inválidos." };
  }
  try {
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al vincular el producto.";
    return { ok: false, error: message };
  }
}

export async function desvincularProducto(
  itemTiendaId: string,
  productoProveedorId: string
): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) {
    return { ok: false, error: "Sin acceso a tienda." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const parsedItem = uuidSchema.safeParse(itemTiendaId);
  const parsed = uuidSchema.safeParse(productoProveedorId);
  if (!parsedItem.success || !parsed.success) return { ok: false, error: "ID de producto inválido." };
  try {
    const { prisma } = await import("@/lib/prisma");
    const itemTienda = await prisma.listaPrecioTienda.findUnique({
      where: { id: parsedItem.data },
      select: { id: true, proveedor: true },
    });
    if (!itemTienda) return { ok: false, error: "Ítem tienda no encontrado." };
    const producto = await prisma.listaPrecioProveedor.findUnique({
      where: { id: parsed.data },
      select: {
        id: true,
        idListaPrecioTienda: true,
        proveedor: { select: { nombre: true, prefijo: true } },
      },
    });
    if (!producto || producto.idListaPrecioTienda !== itemTienda.id) {
      return { ok: false, error: "Producto no encontrado o no vinculado a este ítem." };
    }
    const totalVinculados = await prisma.listaPrecioProveedor.count({
      where: { idListaPrecioTienda: itemTienda.id },
    });
    const oficialTxt = (itemTienda.proveedor ?? "").trim().toLowerCase();
    const esOficial =
      oficialTxt.length > 0 &&
      (oficialTxt === (producto.proveedor.nombre ?? "").trim().toLowerCase() ||
        oficialTxt === (producto.proveedor.prefijo ?? "").trim().toLowerCase());
    if (totalVinculados >= 2 && esOficial) {
      return {
        ok: false,
        error:
          "No se puede desvincular el proveedor oficial mientras exista un alternativo. Primero cambiá el oficial y luego eliminá la vinculación.",
      };
    }
    await prisma.listaPrecioProveedor.update({
      where: { id: parsed.data },
      data: { idListaPrecioTienda: null },
    });
    revalidatePath("/tienda");
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al desvincular el producto.";
    return { ok: false, error: message };
  }
}
