"use server";

import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  listGlobalPersonal,
  type GlobalPersonalItem,
} from "@/services/globalPersonal.service";

export async function listGlobalPersonalAction(): Promise<
  ActionResult<GlobalPersonalItem[]>
> {
  try {
    const rol = await getRol();
    if (!puede(rol, PERMISOS.pedidos.acceso)) {
      return { ok: false, error: "Sin permisos para pedidos." };
    }

    const items = await listGlobalPersonal();
    return { ok: true, data: items };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[globalPersonal][action][listGlobalPersonal]", message);
    return { ok: false, error: "Error al listar el personal." };
  }
}
