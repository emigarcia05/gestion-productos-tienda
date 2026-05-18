"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import {
  importarTxtIvaDebitoMes,
  listarDetalleIvaDebitoMes,
  type DetalleLineaIvaDebitoBalance,
  type ImportarIvaDebTxtResultado,
} from "@/services/finBalIvaDeb.service";

function firstZodErrorMessage(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): string {
  const flattened = error.flatten();
  return (
    [...Object.values(flattened.fieldErrors).flat(), ...flattened.formErrors][0] ??
    "Datos inválidos."
  );
}

async function parseMesAnioFinanzas(
  raw: unknown,
): Promise<{ ok: true; data: { mes: number; anio: number } } | { ok: false; error: string }> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }

  const parsed = mesAnioQuerySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstZodErrorMessage(parsed.error) };

  return { ok: true, data: parsed.data };
}

const MAX_ARCHIVO_BYTES = 4 * 1024 * 1024;

function extensionArchivoIvaDebPermitida(name: string): boolean {
  return name.toLowerCase().endsWith(".txt");
}

export async function importarFinBalIvaDebCsvAction(formData: FormData): Promise<
  ActionResult<ImportarIvaDebTxtResultado>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.finanzas.acceso)) {
    return { ok: false, error: "Sin permisos para finanzas." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Solo el modo editor puede importar comprobantes de IVA débito." };
  }

  const mes = Number(formData.get("mes"));
  const anio = Number(formData.get("anio"));
  const file = formData.get("archivo");

  if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
    return { ok: false, error: "Mes inválido." };
  }
  if (!Number.isFinite(anio) || anio < 2026 || anio > 2046) {
    return { ok: false, error: "Año inválido." };
  }
  if (!(file instanceof File)) {
    return { ok: false, error: "Seleccioná un archivo." };
  }
  if (!extensionArchivoIvaDebPermitida(file.name)) {
    return { ok: false, error: "Solo se permiten archivos .txt" };
  }
  if (file.size > MAX_ARCHIVO_BYTES) {
    return { ok: false, error: "El archivo supera el tamaño máximo permitido (4 MB)." };
  }

  let textoTxt: string;
  try {
    textoTxt = await file.text();
  } catch {
    return { ok: false, error: "No se pudo leer el archivo." };
  }

  const res = await importarTxtIvaDebitoMes({
    textoTxt,
    mes,
    anio,
  });
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath("/finanzas/posicion-iva");
  return { ok: true, data: res.data };
}

/** Detalle IVA débito · líneas TXT del mes. */
export async function listarDetalleIvaDebitoMesAction(
  raw: unknown,
): Promise<ActionResult<DetalleLineaIvaDebitoBalance[]>> {
  const parsed = await parseMesAnioFinanzas(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const data = await listarDetalleIvaDebitoMes(parsed.data);
  return { ok: true, data };
}
