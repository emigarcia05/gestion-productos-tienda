"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  actualizarReglaDescuentoListaPrecioSchema,
  crearReglaDescuentoListaPrecioSchema,
  eliminarReglaDescuentoListaPrecioSchema,
} from "@/lib/validations/descuentosListaPrecioReglas";
import {
  actualizarReglaDescuentosListaPrecio,
  crearReglaDescuentosListaPrecio,
  eliminarReglaDescuentosListaPrecio,
  listarCatalogosReglasDescuentos,
  listarReglasDescuentosListaPrecio,
  type CatalogosReglasDescuentosListaPrecio,
  type ReglaDescuentoListaPrecio,
} from "@/services/descuentosListaPrecioReglas.service";

export type {
  ReglaDescuentoListaPrecio,
  CatalogosReglasDescuentosListaPrecio,
} from "@/services/descuentosListaPrecioReglas.service";

import { REVALIDATE_LISTA_PRECIOS } from "@/lib/gestionProductosRoutes";

function revalidarListaPrecios(): void {
  for (const path of REVALIDATE_LISTA_PRECIOS) {
    revalidatePath(path);
  }
}

async function requireGestionReglasDescuentos(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.listaPrecios.acciones.gestionarReglasDescuentos)) {
    return { ok: false, error: "Sin permisos para gestionar reglas de descuentos." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  return null;
}

export async function listarReglasDescuentosListaPrecioAction(): Promise<
  ActionResult<ReglaDescuentoListaPrecio[]>
> {
  const gate = await requireGestionReglasDescuentos();
  if (gate) return gate;

  try {
    const reglas = await listarReglasDescuentosListaPrecio();
    return { ok: true, data: reglas };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al listar reglas de descuentos.";
    return { ok: false, error: message };
  }
}

export async function crearReglaDescuentosListaPrecioAction(
  raw: unknown
): Promise<ActionResult<ReglaDescuentoListaPrecio>> {
  const gate = await requireGestionReglasDescuentos();
  if (gate) return gate;

  const parsed = crearReglaDescuentoListaPrecioSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Datos inválidos para crear la regla.";
    return { ok: false, error: msg };
  }

  try {
    const result = await crearReglaDescuentosListaPrecio(parsed.data);
    if (!result.success) {
      return { ok: false, error: result.error };
    }
    revalidarListaPrecios();
    return { ok: true, data: result.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear la regla.";
    return { ok: false, error: message };
  }
}

export async function actualizarReglaDescuentosListaPrecioAction(
  raw: unknown
): Promise<ActionResult<ReglaDescuentoListaPrecio>> {
  const gate = await requireGestionReglasDescuentos();
  if (gate) return gate;

  const parsed = actualizarReglaDescuentoListaPrecioSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      [...Object.values(flat.fieldErrors).flat(), ...flat.formErrors][0] ??
      "Datos inválidos para actualizar la regla.";
    return { ok: false, error: msg };
  }

  try {
    const result = await actualizarReglaDescuentosListaPrecio(parsed.data);
    if (!result.success) {
      return { ok: false, error: result.error };
    }
    revalidarListaPrecios();
    return { ok: true, data: result.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar la regla.";
    return { ok: false, error: message };
  }
}

export async function eliminarReglaDescuentosListaPrecioAction(
  raw: unknown
): Promise<ActionResult<{ actualizados: number }>> {
  const gate = await requireGestionReglasDescuentos();
  if (gate) return gate;

  const parsed = eliminarReglaDescuentoListaPrecioSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "ID de regla inválido." };
  }

  try {
    const result = await eliminarReglaDescuentosListaPrecio(parsed.data.id);
    if (!result.success) {
      return { ok: false, error: result.error };
    }
    revalidarListaPrecios();
    return { ok: true, data: result.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar la regla.";
    return { ok: false, error: message };
  }
}

export async function listarCatalogosReglasDescuentosAction(): Promise<
  ActionResult<CatalogosReglasDescuentosListaPrecio>
> {
  const gate = await requireGestionReglasDescuentos();
  if (gate) return gate;

  try {
    const catalogos = await listarCatalogosReglasDescuentos();
    return { ok: true, data: catalogos };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar catálogos de reglas.";
    return { ok: false, error: message };
  }
}
