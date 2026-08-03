"use server";

import { revalidatePath } from "next/cache";
import { GP_INTERNAL, GP_ROUTES } from "@/lib/gestionProductosRoutes";
import type {
  ProdIaDisenoCatalogoKind,
  ProdIaDisenoCatalogoNombreItem,
} from "@/lib/prodIaDisenoCatalogos";
import { PERMISOS, puede } from "@/lib/permisos";
import { esEditor, getRol } from "@/lib/sesion";
import type { ActionResult } from "@/lib/types";
import {
  crearProdIaDisenoCatalogoNombreSchema,
  editarProdIaDisenoCatalogoNombreSchema,
  eliminarProdIaDisenoCatalogoNombreSchema,
} from "@/lib/validations/prodIaDisenoCatalogos";
import {
  crearProdIaDisenoCatalogoNombre,
  editarProdIaDisenoCatalogoNombre,
  eliminarProdIaDisenoCatalogoNombre,
  listarProdIaDisenoCatalogoNombre,
} from "@/services/prodIaDisenoCatalogos.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

function revalidateAsistenteIa(): void {
  revalidatePath(GP_ROUTES.asistenteIa.buscarColorImagen);
  revalidatePath(GP_INTERNAL.asistenteIa.buscarColorImagen);
}

async function requireAsistenteIaLectura(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.asistenteIa.acceso)) {
    return { ok: false, error: "Sin permisos para Asistente IA." };
  }
  return null;
}

async function requireEditorAsistenteIa(): Promise<{ ok: false; error: string } | null> {
  const gate = await requireAsistenteIaLectura();
  if (gate) return gate;
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de administrador." };
  }
  return null;
}

function isKind(v: unknown): v is ProdIaDisenoCatalogoKind {
  return (
    v === "modo_diseno" ||
    v === "sup_pintar" ||
    v === "estilos" ||
    v === "combinar" ||
    v === "objetivo" ||
    v === "luz_natural" ||
    v === "luz_artificial"
  );
}

export async function listarProdIaDisenoCatalogoNombreAction(
  kind: unknown
): Promise<ActionResult<ProdIaDisenoCatalogoNombreItem[]>> {
  const gate = await requireAsistenteIaLectura();
  if (gate) return gate;
  if (!isKind(kind)) {
    return { ok: false, error: "Catálogo inválido." };
  }
  try {
    return { ok: true, data: await listarProdIaDisenoCatalogoNombre(kind) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo listar el catálogo.",
    };
  }
}

export async function crearProdIaDisenoCatalogoNombreAction(
  kind: unknown,
  raw: unknown
): Promise<ActionResult<ProdIaDisenoCatalogoNombreItem>> {
  const gate = await requireEditorAsistenteIa();
  if (gate) return gate;
  if (!isKind(kind)) {
    return { ok: false, error: "Catálogo inválido." };
  }
  const parsed = crearProdIaDisenoCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await crearProdIaDisenoCatalogoNombre(kind, parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateAsistenteIa();
  return { ok: true, data: res.data };
}

export async function editarProdIaDisenoCatalogoNombreAction(
  kind: unknown,
  raw: unknown
): Promise<ActionResult<ProdIaDisenoCatalogoNombreItem>> {
  const gate = await requireEditorAsistenteIa();
  if (gate) return gate;
  if (!isKind(kind)) {
    return { ok: false, error: "Catálogo inválido." };
  }
  const parsed = editarProdIaDisenoCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await editarProdIaDisenoCatalogoNombre(kind, parsed.data);
  if (!res.success) return { ok: false, error: res.error };
  revalidateAsistenteIa();
  return { ok: true, data: res.data };
}

export async function eliminarProdIaDisenoCatalogoNombreAction(
  kind: unknown,
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireEditorAsistenteIa();
  if (gate) return gate;
  if (!isKind(kind)) {
    return { ok: false, error: "Catálogo inválido." };
  }
  const parsed = eliminarProdIaDisenoCatalogoNombreSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }
  const res = await eliminarProdIaDisenoCatalogoNombre(kind, parsed.data.id);
  if (!res.success) return { ok: false, error: res.error };
  revalidateAsistenteIa();
  return { ok: true, data: res.data };
}
