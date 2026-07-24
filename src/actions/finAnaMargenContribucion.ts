"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import {
  actualizarDescuentoFpMargenContribucion,
  listarDescuentosFpMargenContribucion,
} from "@/services/finAnaMcDescuentoFp.service";
import { actualizarDescuentoFpMargenContribucionSchema } from "@/lib/validations/finAnaMcDescuentoFp";
import type { DescuentoFpMargenContribucionMap } from "@/services/finAnaMcDescuentoFp.service";
import {
  actualizarFormulaMargenContribucion,
  listarFormulasMargenContribucion,
} from "@/services/finAnaMcFormulas.service";
import { actualizarFormulaMargenContribucionSchema } from "@/lib/validations/finAnaMcFormulas";
import type { FinAnaMcFormulaItem } from "@/lib/finAnaMcFormulas";
import {
  crearFinAnaMcCategoria,
  editarFinAnaMcCategoria,
  eliminarFinAnaMcCategoria,
  listarFinAnaMcCategorias,
  reemplazarFinAnaMcCategorias,
} from "@/services/finAnaMcCategorias.service";
import {
  crearFinAnaMcCategoriaSchema,
  editarFinAnaMcCategoriaSchema,
  eliminarFinAnaMcCategoriaSchema,
  reemplazarFinAnaMcCategoriasSchema,
} from "@/lib/validations/finAnaMcCategorias";
import type { FinAnaMcCategoriaItem } from "@/lib/finAnaMcCategorias";
import {
  getFinAnaMcConfig,
  guardarFinAnaMcConfig,
} from "@/services/finAnaMcConfig.service";
import { guardarFinAnaMcConfigSchema } from "@/lib/validations/finAnaMcConfig";
import type { FinAnaMcConfigItem } from "@/lib/finAnaMcConfig";

const RUTA_MARGEN_CONTRIBUCION = "/finanzas/analisis-mc/margen-contribucion";

async function requireFinanzasLectura(): Promise<{ ok: false; error: string } | null> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  return null;
}

async function requireEditorFinanzas(): Promise<{ ok: false; error: string } | null> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  return null;
}

export async function listarDescuentosFpMargenContribucionAction(): Promise<
  ActionResult<DescuentoFpMargenContribucionMap>
> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;

  const map = await listarDescuentosFpMargenContribucion();
  return { ok: true, data: map };
}

export async function actualizarDescuentoFpMargenContribucionAction(
  params: unknown
): Promise<ActionResult<DescuentoFpMargenContribucionMap>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = actualizarDescuentoFpMargenContribucionSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await actualizarDescuentoFpMargenContribucion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath(RUTA_MARGEN_CONTRIBUCION);
  return { ok: true, data: res.data };
}

export async function listarFormulasMargenContribucionAction(): Promise<
  ActionResult<FinAnaMcFormulaItem[]>
> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;

  const items = await listarFormulasMargenContribucion();
  return { ok: true, data: items };
}

export async function actualizarFormulaMargenContribucionAction(
  params: unknown
): Promise<ActionResult<FinAnaMcFormulaItem[]>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = actualizarFormulaMargenContribucionSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await actualizarFormulaMargenContribucion(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath(RUTA_MARGEN_CONTRIBUCION);
  return { ok: true, data: res.data };
}

export async function listarFinAnaMcCategoriasAction(): Promise<
  ActionResult<FinAnaMcCategoriaItem[]>
> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;

  const items = await listarFinAnaMcCategorias();
  return { ok: true, data: items };
}

export async function crearFinAnaMcCategoriaAction(
  params: unknown
): Promise<ActionResult<FinAnaMcCategoriaItem[]>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = crearFinAnaMcCategoriaSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await crearFinAnaMcCategoria(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath(RUTA_MARGEN_CONTRIBUCION);
  return { ok: true, data: res.data };
}

export async function editarFinAnaMcCategoriaAction(
  params: unknown
): Promise<ActionResult<FinAnaMcCategoriaItem[]>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = editarFinAnaMcCategoriaSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await editarFinAnaMcCategoria(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath(RUTA_MARGEN_CONTRIBUCION);
  return { ok: true, data: res.data };
}

export async function eliminarFinAnaMcCategoriaAction(
  params: unknown
): Promise<ActionResult<FinAnaMcCategoriaItem[]>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = eliminarFinAnaMcCategoriaSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await eliminarFinAnaMcCategoria(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath(RUTA_MARGEN_CONTRIBUCION);
  return { ok: true, data: res.data };
}

export async function reemplazarFinAnaMcCategoriasAction(
  params: unknown
): Promise<ActionResult<FinAnaMcCategoriaItem[]>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = reemplazarFinAnaMcCategoriasSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await reemplazarFinAnaMcCategorias(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath(RUTA_MARGEN_CONTRIBUCION);
  return { ok: true, data: res.data };
}

export async function getFinAnaMcConfigAction(): Promise<
  ActionResult<FinAnaMcConfigItem>
> {
  const gate = await requireFinanzasLectura();
  if (gate) return gate;

  const data = await getFinAnaMcConfig();
  return { ok: true, data };
}

export async function guardarFinAnaMcConfigAction(
  params: unknown
): Promise<ActionResult<FinAnaMcConfigItem>> {
  const gate = await requireEditorFinanzas();
  if (gate) return gate;

  const parsed = guardarFinAnaMcConfigSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const res = await guardarFinAnaMcConfig(parsed.data);
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath(RUTA_MARGEN_CONTRIBUCION);
  return { ok: true, data: res.data };
}
