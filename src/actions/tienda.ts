"use server";

import { revalidatePath } from "next/cache";
import { ejecutarSync, type SyncResult } from "@/lib/syncTienda";
import { prisma } from "@/lib/prisma";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function sincronizarManual(): Promise<ActionResult<SyncResult>> {
  try {
    const result = await ejecutarSync("manual");
    revalidatePath("/tienda");
    return { ok: true, data: result };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    return { ok: false, error: mensaje };
  }
}

export async function getUltimoSync() {
  return prisma.syncLog.findFirst({
    orderBy: { createdAt: "desc" },
  });
}

export async function convertirEnProveedor(
  itemTiendaId: string,
  productoId: string
): Promise<ActionResult> {
  if (!(await import("@/lib/sesion").then((m) => m.esEditor()))) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    include: { proveedor: { select: { nombre: true } } },
  });

  if (!producto) return { ok: false, error: "Producto no encontrado." };

  try {
    await prisma.itemTienda.update({
      where: { id: itemTiendaId },
      data: {
        proveedorDux:  producto.proveedor.nombre,
        costo:         parseFloat(
          (
            producto.precioLista *
            (1 - producto.descuentoProducto / 100) *
            (1 - producto.descuentoCantidad / 100) *
            (1 + producto.cxTransporte / 100)
          ).toFixed(2)
        ),
        codigoExterno: producto.codExt,
      },
    });
    revalidatePath("/tienda");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "No se pudo actualizar el item." };
  }
}
