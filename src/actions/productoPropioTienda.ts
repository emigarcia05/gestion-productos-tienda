"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";
import { setProductoPropioTienda } from "@/services/productoPropioTienda.service";

const setProductoPropioSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  esPropio: z.boolean(),
});

/** Marca o desmarca un ítem `prod_precios_tienda` como producto propio TiendaColor. Mismo gate que vincular/desvincular: módulo tienda + editor. */
export async function setProductoPropioTiendaAction(
  payload: unknown
): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acceso)) {
    return { ok: false, error: "Sin acceso a tienda." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  const parsed = setProductoPropioSchema.safeParse(payload);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0];
    return { ok: false, error: first ?? "Datos inválidos." };
  }
  try {
    const res = await setProductoPropioTienda(parsed.data.codTienda, parsed.data.esPropio);
    if (!res.success) return { ok: false, error: res.error };
    revalidatePath("/tienda");
    revalidatePath("/gestion-productos/tienda/comp-proveedores");
    revalidatePath("/gestion-productos/tienda/cx-px-tienda");
    return { ok: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al actualizar Producto TiendaColor.";
    return { ok: false, error: msg };
  }
}
