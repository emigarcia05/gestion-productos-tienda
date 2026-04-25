"use server";

import { revalidatePath } from "next/cache";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { editarProductoSchema, aplicarCampoMasivoSchema } from "@/lib/validations/productos";

// ─── MOCK: sin Prisma; respuestas de prueba ─────────────────────────────────

export interface CamposEditables {
  descuentoRubro?: number;
  descuentoCantidad?: number;
  cxTransporte?: number;
  disponible?: boolean;
}

export async function editarProducto(id: string, campos: CamposEditables): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para editar productos de lista." };
  }
  const parsed = editarProductoSchema.safeParse({ id, campos });
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Datos inválidos." };
  }
  revalidatePath("/proveedores");
  return { ok: true, data: undefined };
}

export type CampoMasivo = "descuentoRubro" | "descuentoCantidad" | "cxTransporte" | "disponible";

export async function aplicarCampoMasivo(
  proveedorId: string,
  campo: CampoMasivo,
  valor: number | boolean,
  q?: string
): Promise<ActionResult<{ afectados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para edición masiva." };
  }
  const parsed = aplicarCampoMasivoSchema.safeParse({ proveedorId, campo, valor, q });
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Datos inválidos." };
  }
  revalidatePath("/proveedores");
  return { ok: true, data: { afectados: 0 } };
}
