"use server";

import { revalidatePath } from "next/cache";
import { revalidatePedidoUrgenteTrasCambioIvaSaldo } from "@/lib/revalidatePedidoUrgenteTrasCambioIvaSaldo";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { guardarIvaComparacionPedidoSchema } from "@/lib/validations/finBalPosicionIvaComparacionPedido";
import {
  guardarIvaComparacionPedido,
  type EstadoIvaComparacionPedido,
} from "@/services/finBalPosicionIvaComparacionPedido.service";

export type { EstadoIvaComparacionPedido } from "@/services/finBalPosicionIvaComparacionPedido.service";

async function gateFinanzasEditor(): Promise<{ ok: true } | { ok: false; error: string }> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede configurar la comparación de pedidos." };
  }
  return { ok: true };
}

export async function guardarIvaComparacionPedidoAction(
  raw: unknown
): Promise<ActionResult<EstadoIvaComparacionPedido>> {
  const gate = await gateFinanzasEditor();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = guardarIvaComparacionPedidoSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Datos inválidos para guardar.";
    return { ok: false, error: msg };
  }

  try {
    const estado = await guardarIvaComparacionPedido({
      usarValorConfigurado: parsed.data.usarValorConfigurado,
      saldoPesos: parsed.data.saldoPesos,
    });
    revalidatePath("/finanzas/posicion-iva");
    revalidatePedidoUrgenteTrasCambioIvaSaldo();
    return { ok: true, data: estado };
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo guardar la configuración.";
    return { ok: false, error: message };
  }
}
