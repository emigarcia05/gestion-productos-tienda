"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  cargarImputacionesMensualesDesdeCatalogo,
  mesAnioCalendarioArgentina,
} from "@/services/finBalGastoMensualBalance.service";

function revalidateGastosPaths(): void {
  revalidatePath("/finanzas");
  revalidatePath("/finanzas/balance/gastos");
}

export async function cargarFinBalGastoMensualMesAction(): Promise<
  ActionResult<{ creados: number; yaExistentes: number }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) return { ok: false, error: "Sin permisos de editor." };

  const { mes, anio } = mesAnioCalendarioArgentina();
  const res = await cargarImputacionesMensualesDesdeCatalogo({ mes, anio });
  if (!res.success) return { ok: false, error: res.error };

  revalidateGastosPaths();
  return { ok: true, data: res.data };
}
