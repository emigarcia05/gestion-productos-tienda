"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { getProveedorById } from "@/services/proveedor.service";
import { upsertPreciosRexDesdeFilasPdf, listarPreciosRexParaVincular, vincularListaPrecioConPrecioRex } from "@/services/prodPreciosRex.service";
import type { PrecioRexParaVincular } from "@/services/prodPreciosRex.service";
import {
  guardarPreciosRexDesdePdfSchema,
  listarPreciosRexParaVincularSchema,
  vincularListaPrecioConPrecioRexSchema,
} from "@/lib/validations/prodPreciosRex";

export interface GuardarPreciosRexResult {
  creados: number;
  actualizados: number;
  errores: string[];
}

export async function guardarPreciosRexDesdePdfAction(
  raw: unknown
): Promise<ActionResult<GuardarPreciosRexResult>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.importarLista)) {
    return { ok: false, error: "Sin permisos para importar lista de precios." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = guardarPreciosRexDesdePdfSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Datos inválidos para guardar precios REX.";
    return { ok: false, error: msg };
  }

  const { proveedorId, filas } = parsed.data;

  const proveedor = await getProveedorById(proveedorId);
  if (!proveedor) {
    return { ok: false, error: "Proveedor no encontrado." };
  }

  try {
    const { creados, actualizados, errores } = await upsertPreciosRexDesdeFilasPdf(proveedorId, filas);

    if (creados === 0 && actualizados === 0 && errores.length > 0) {
      return { ok: false, error: errores[0] ?? "No se pudieron guardar los precios." };
    }

    revalidatePath("/proveedores/lista-precios");

    return { ok: true, data: { creados, actualizados, errores } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al guardar precios REX.";
    return { ok: false, error: message };
  }
}

export async function listarPreciosRexParaVincularAction(
  raw: unknown
): Promise<ActionResult<PrecioRexParaVincular[]>> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para vincular precios REX." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = listarPreciosRexParaVincularSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Parámetros inválidos para listar precios REX." };
  }

  try {
    const rows = await listarPreciosRexParaVincular(
      parsed.data.proveedorId,
      parsed.data.codExtLista,
      parsed.data.q
    );
    return { ok: true, data: rows };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar precios REX.";
    return { ok: false, error: message };
  }
}

export async function vincularListaPrecioConPrecioRexAction(
  raw: unknown
): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.edicionMasiva)) {
    return { ok: false, error: "Sin permisos para vincular precios REX." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = vincularListaPrecioConPrecioRexSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos para vincular." };
  }

  try {
    const result = await vincularListaPrecioConPrecioRex(
      parsed.data.codExtLista,
      parsed.data.idPrecioRex
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    revalidatePath("/proveedores/lista-precios");
    return { ok: true, data: undefined };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al vincular precio REX.";
    return { ok: false, error: message };
  }
}
