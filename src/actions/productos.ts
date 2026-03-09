"use server";

import { revalidatePath } from "next/cache";
import { esEditor } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";

// ─── MOCK: sin Prisma; respuestas de prueba ─────────────────────────────────

export interface CamposEditables {
  descuentoRubro?: number;
  descuentoCantidad?: number;
  cxTransporte?: number;
  disponible?: boolean;
}

export async function editarProducto(id: string, campos: CamposEditables): Promise<ActionResult> {
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };
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
  if (!proveedorId) return { ok: false, error: "Proveedor requerido." };
  revalidatePath("/proveedores");
  return { ok: true, data: { afectados: 0 } };
}
