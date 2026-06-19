"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { actualizarCotizacionUsdSchema } from "@/lib/validations/cotizacionUsd";
import {
  actualizarCotizacionUsd,
  getCotizacionUsdEstado,
  type CotizacionUsdEstado,
} from "@/services/cotizacionUsd.service";

export type { CotizacionUsdEstado } from "@/services/cotizacionUsd.service";

const PATHS_REVALIDAR = [
  "/proveedores/lista-precios",
  "/proveedores",
  "/gestion-productos/proveedores/lista-precios",
] as const;

function revalidarListaPrecios(): void {
  for (const path of PATHS_REVALIDAR) {
    revalidatePath(path);
  }
}

function puedeLeerCotizacionUsd(rol: Awaited<ReturnType<typeof getRol>>): boolean {
  return (
    puede(rol, PERMISOS.proveedores.listaPrecios) ||
    puede(rol, PERMISOS.listaPrecios.acciones.importarLista) ||
    puede(rol, PERMISOS.listaPrecios.acciones.gestionarCotizacionUsd)
  );
}

export async function getCotizacionUsdAction(): Promise<ActionResult<CotizacionUsdEstado>> {
  const rol = await getRol();
  if (!puedeLeerCotizacionUsd(rol)) {
    return { ok: false, error: "Sin permisos para consultar la cotización USD." };
  }

  try {
    const estado = await getCotizacionUsdEstado();
    return { ok: true, data: estado };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al obtener la cotización USD.";
    return { ok: false, error: message };
  }
}

export async function actualizarCotizacionUsdAction(
  raw: unknown
): Promise<ActionResult<{ actualizados: number; estado: CotizacionUsdEstado }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.gestionarCotizacionUsd)) {
    return { ok: false, error: "Sin permisos para actualizar la cotización USD." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = actualizarCotizacionUsdSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Cotización inválida.";
    return { ok: false, error: msg };
  }

  try {
    const result = await actualizarCotizacionUsd(parsed.data.valor);
    if (!result.success) {
      return { ok: false, error: result.error };
    }
    revalidarListaPrecios();
    return { ok: true, data: result.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar la cotización USD.";
    return { ok: false, error: message };
  }
}
