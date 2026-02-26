"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";

// ─── Editar campos manuales de un producto ─────────────────────────────────

export interface CamposEditables {
  descuentoProducto?: number;
  descuentoCantidad?: number;
  cxTransporte?: number;
  disponible?: boolean;
}

export async function editarProducto(
  id: string,
  campos: CamposEditables
): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  try {
    await prisma.productoProveedor.update({
      where: { id },
      data: campos,
    });
    revalidatePath("/proveedores");
    return { ok: true, data: undefined };
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("[productos] editarProducto", e);
    return { ok: false, error: "No se pudo actualizar el producto." };
  }
}

// ─── Acción masiva por proveedor (con filtro opcional de búsqueda) ─────────

export type CampoMasivo = "descuentoProducto" | "descuentoCantidad" | "cxTransporte" | "disponible";

export async function aplicarCampoMasivo(
  proveedorId: string,
  campo: CampoMasivo,
  valor: number | boolean,
  q?: string
): Promise<ActionResult<{ afectados: number }>> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  if (!proveedorId) return { ok: false, error: "Proveedor requerido." };

  const where = {
    proveedorId,
    ...(q?.trim() ? filtroTexto(q, ["descripcion", "codigoExterno", "codProdProv"]) : {}),
  };

  try {
    const { count } = await prisma.productoProveedor.updateMany({
      where,
      data: { [campo]: valor },
    });
    revalidatePath("/proveedores");
    return { ok: true, data: { afectados: count } };
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("[productos] aplicarCampoMasivo", e);
    return { ok: false, error: "No se pudo aplicar la acción masiva." };
  }
}
