"use server";

import { firstZodErrorMessage } from "@/lib/actionHelpers";
import { revalidatePath } from "next/cache";
import { getRol, esEditor } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { USUARIOS_PATH } from "@/lib/usuarios";
import { actualizarUsuarioPersonalSchema } from "@/lib/validations/globalPersonal";
import {
  actualizarUsuarioPersonal,
  listGlobalPersonal,
  listUsuariosParaInicioSesion,
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

export async function listUsuariosParaInicioSesionAction(): Promise<
  ActionResult<GlobalPersonalItem[]>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.usuarios.inicioSesion)) {
    return { ok: false, error: "Sin permisos." };
  }
  try {
    const items = await listUsuariosParaInicioSesion();
    return { ok: true, data: items };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[globalPersonal][action][listUsuariosParaInicioSesion]", message);
    return { ok: false, error: "Error al listar usuarios." };
  }
}

export async function actualizarUsuarioPersonalAction(
  raw: unknown
): Promise<ActionResult<GlobalPersonalItem>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.usuarios.acceso)) {
    return { ok: false, error: "Sin permisos para usuarios." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = actualizarUsuarioPersonalSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const result = await actualizarUsuarioPersonal(parsed.data);
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  revalidatePath(USUARIOS_PATH);
  return { ok: true, data: result.data };
}
