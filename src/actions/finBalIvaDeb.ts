"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { mesAnioQuerySchema } from "@/lib/validations/finBalGastoMensualBalance";
import type { MapeoColumnasIvaDeb } from "@/lib/finBalIvaDebCsv";
import { mapeoColumnasIvaDebSchema } from "@/lib/validations/finBalIvaDebImport";
import {
  importarCsvIvaDebitoMes,
  listarDetalleIvaDebitoMes,
  type DetalleLineaIvaDebitoBalance,
  type ImportarIvaDebCsvResultado,
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

const EXTENSIONES_IVA_DEB = [".csv", ".txt"] as const;

function extensionArchivoIvaDebPermitida(name: string): boolean {
  const lower = name.toLowerCase();
  return EXTENSIONES_IVA_DEB.some((ext) => lower.endsWith(ext));
}

export async function importarFinBalIvaDebCsvAction(formData: FormData): Promise<
  ActionResult<ImportarIvaDebCsvResultado>
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
    return { ok: false, error: "Solo se permiten archivos .csv o .txt" };
  }
  if (file.size > MAX_ARCHIVO_BYTES) {
    return { ok: false, error: "El archivo supera el tamaño máximo permitido (4 MB)." };
  }

  const tieneEncabezados = formData.get("tieneEncabezados") !== "false";
  const mapeoRaw = formData.get("mapeo");

  let mapeo: MapeoColumnasIvaDeb | undefined;
  if (mapeoRaw != null && String(mapeoRaw).trim() !== "") {
    let json: unknown;
    try {
      json = JSON.parse(String(mapeoRaw));
    } catch {
      return { ok: false, error: "Mapeo de columnas inválido." };
    }
    const parsedMapeo = mapeoColumnasIvaDebSchema.safeParse(json);
    if (!parsedMapeo.success) {
      return { ok: false, error: firstZodErrorMessage(parsedMapeo.error) };
    }
    const normalizado: MapeoColumnasIvaDeb = {};
    for (const [k, v] of Object.entries(parsedMapeo.data)) {
      normalizado[Number(k)] = v;
    }
    mapeo = normalizado;
  }

  let textoCsv: string;
  try {
    textoCsv = await file.text();
  } catch {
    return { ok: false, error: "No se pudo leer el archivo." };
  }

  const res = await importarCsvIvaDebitoMes({
    textoCsv,
    mes,
    anio,
    mapeo,
    tieneEncabezados,
  });
  if (!res.success) return { ok: false, error: res.error };

  revalidatePath("/finanzas/posicion-iva");
  return { ok: true, data: res.data };
}

/** Detalle IVA débito · líneas CSV del mes (import AFIP). */
export async function listarDetalleIvaDebitoMesAction(
  raw: unknown,
): Promise<ActionResult<DetalleLineaIvaDebitoBalance[]>> {
  const parsed = await parseMesAnioFinanzas(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const data = await listarDetalleIvaDebitoMes(parsed.data);
  return { ok: true, data };
}
