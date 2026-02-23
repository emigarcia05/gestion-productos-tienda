"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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
  try {
    await prisma.producto.update({
      where: { id },
      data: campos,
    });
    revalidatePath("/proveedores");
    return { ok: true, data: undefined };
  } catch {
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
  if (!proveedorId) return { ok: false, error: "Proveedor requerido." };

  const where = {
    proveedorId,
    ...(q ? {
      OR: [
        { descripcion: { contains: q, mode: "insensitive" as const } },
        { codExt:      { contains: q, mode: "insensitive" as const } },
        { codProdProv: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  try {
    const { count } = await prisma.producto.updateMany({
      where,
      data: { [campo]: valor },
    });
    revalidatePath("/proveedores");
    return { ok: true, data: { afectados: count } };
  } catch {
    return { ok: false, error: "No se pudo aplicar la acción masiva." };
  }
}
