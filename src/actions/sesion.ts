"use server";

import { getSesion } from "@/lib/sesion";
import { revalidatePath } from "next/cache";

export async function activarModoEditor(clave: string): Promise<{ ok: boolean; error?: string }> {
  const claveCorrecta = process.env.EDITOR_PASSWORD;

  if (!claveCorrecta) {
    return { ok: false, error: "No hay clave de editor configurada en el servidor." };
  }

  if (clave !== claveCorrecta) {
    return { ok: false, error: "Clave incorrecta." };
  }

  const sesion = await getSesion();
  sesion.rol = "editor";
  await sesion.save();

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function volverModoSimple(): Promise<void> {
  const sesion = await getSesion();
  sesion.destroy();
  revalidatePath("/", "layout");
}
