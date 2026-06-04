"use server";

import { revalidatePath } from "next/cache";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  editarProductoSchema,
  aplicarCampoMasivoSchema,
  type CampoMasivoInput,
} from "@/lib/validations/productos";
import {
  actualizarListaPreciosMasivo,
  aplicarCampoMasivoListaPrecios,
  camposEditableProductoProveedoresToActualizacion,
  type CampoEditableProductoProveedoresPage,
} from "@/services/listaPrecios.service";

export type CampoMasivo = CampoMasivoInput;

const CAMPOS_EDITABLES: CampoEditableProductoProveedoresPage[] = [
  "descuentoRubro",
  "descuentoCantidad",
  "cxTransporte",
  "disponible",
];

function esCampoEditable(campo: string): campo is CampoEditableProductoProveedoresPage {
  return (CAMPOS_EDITABLES as string[]).includes(campo);
}

export async function editarProducto(raw: unknown): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para editar productos de lista." };
  }
  const parsed = editarProductoSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Datos inválidos." };
  }

  const { campos } = parsed.data;
  const entries: [CampoEditableProductoProveedoresPage, number | boolean][] = [];
  if (campos.descuentoRubro !== undefined) entries.push(["descuentoRubro", campos.descuentoRubro]);
  if (campos.descuentoCantidad !== undefined) entries.push(["descuentoCantidad", campos.descuentoCantidad]);
  if (campos.cxTransporte !== undefined) entries.push(["cxTransporte", campos.cxTransporte]);
  if (campos.disponible !== undefined) entries.push(["disponible", campos.disponible]);

  let data: Parameters<typeof actualizarListaPreciosMasivo>[1] = {};
  for (const [campo, valor] of entries) {
    data = { ...data, ...camposEditableProductoProveedoresToActualizacion(campo, valor) };
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "Ningún campo válido para actualizar." };
  }

  try {
    const result = await actualizarListaPreciosMasivo([parsed.data.id], data);
    if (result.error) return { ok: false, error: result.error };
    revalidatePath("/proveedores");
    revalidatePath("/proveedores/lista-precios");
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al editar el producto.";
    return { ok: false, error: message };
  }
}

export async function aplicarCampoMasivo(raw: unknown): Promise<ActionResult<{ afectados: number }>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para edición masiva." };
  }
  const parsed = aplicarCampoMasivoSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
    return { ok: false, error: msg ?? "Datos inválidos." };
  }
  if (!esCampoEditable(parsed.data.campo)) {
    return { ok: false, error: "Campo no permitido." };
  }

  try {
    const result = await aplicarCampoMasivoListaPrecios(
      parsed.data.proveedorId,
      parsed.data.campo,
      parsed.data.valor,
      parsed.data.q
    );
    if (result.error) return { ok: false, error: result.error };
    revalidatePath("/proveedores");
    revalidatePath("/proveedores/lista-precios");
    return { ok: true, data: { afectados: result.afectados } };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error en edición masiva.";
    return { ok: false, error: message };
  }
}
