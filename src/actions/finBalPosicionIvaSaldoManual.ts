"use server";

import { firstZodErrorMessage } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import { revalidatePedidoUrgenteTrasCambioIvaSaldo } from "@/lib/revalidatePedidoUrgenteTrasCambioIvaSaldo";
import { z } from "zod";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import {
  eliminarSaldoManualPosicionIva,
  upsertSaldoManualPosicionIva,
} from "@/services/finBalPosicionIvaSaldoManual.service";

const guardarSaldoSchema = mesAnioQuerySchema.extend({
  saldoPesos: z.coerce.number().finite(),
});

async function gateFinanzasEditor(): Promise<{ ok: true } | { ok: false; error: string }> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede modificar el saldo manual." };
  }
  return { ok: true };
}

export async function guardarFinBalPosicionIvaSaldoManualAction(
  raw: unknown,
): Promise<ActionResult<{ saldoPesos: number }>> {
  const gate = await gateFinanzasEditor();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = guardarSaldoSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  const saldoPesos = Math.round(parsed.data.saldoPesos);

  try {
    await upsertSaldoManualPosicionIva({
      anio: parsed.data.anio,
      mes: parsed.data.mes,
      saldoPesos,
    });
  } catch {
    return { ok: false, error: "No se pudo guardar el saldo." };
  }

  revalidatePath("/finanzas/posicion-iva");
  revalidatePedidoUrgenteTrasCambioIvaSaldo();
  return { ok: true, data: { saldoPesos } };
}

export async function eliminarFinBalPosicionIvaSaldoManualAction(
  raw: unknown,
): Promise<ActionResult<void>> {
  const gate = await gateFinanzasEditor();
  if (!gate.ok) return { ok: false, error: gate.error };

  const parsed = mesAnioQuerySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  try {
    await eliminarSaldoManualPosicionIva({ anio: parsed.data.anio, mes: parsed.data.mes });
  } catch {
    return { ok: false, error: "No se pudo restaurar el cálculo automático." };
  }

  revalidatePath("/finanzas/posicion-iva");
  revalidatePedidoUrgenteTrasCambioIvaSaldo();
  return { ok: true, data: undefined };
}
