"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
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
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
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
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
  const parsed = aplicarCampoMasivoSchema.safeParse({ proveedorId, campo, valor, q });
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Datos inválidos." };
  }
  revalidatePath("/proveedores");
  return { ok: true, data: { afectados: 0 } };
}
