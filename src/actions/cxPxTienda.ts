"use server";

import { revalidatePath } from "next/cache";
import { esEditor, getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import type { ActionResult } from "@/lib/types";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";
import { z } from "zod";
import { CX_PROD_SELECCION_PROM } from "@/lib/cxPxTienda";
import {
  establecerCodExtCostoLista,
  limpiarCodExtCostoLista,
} from "@/services/costoListaTienda.service";
import { listarFilasExportCostoCxDiff } from "@/services/exportCostoCxDiff.service";
import {
  consultarEstadoEnvioCostoCxDux,
  enviarCostosCxADux,
} from "@/services/actualizarCostoCxDux.service";
import type { FilaExportCostoCx } from "@/services/exportCostoCxDiff.service";

const guardarCostoCxProdSchema = z.object({
  codTienda: listaPreciosCodTiendaSchema,
  seleccion: z.union([z.literal(CX_PROD_SELECCION_PROM), z.string().min(1).max(128)]),
});

/** Persiste costo CX PROD.: proveedor → `costo_compra_cod_ext`; Cx. Prom. → limpia FK. */
export async function guardarCostoCxProdTiendaAction(
  raw: unknown
): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = guardarCostoCxProdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { codTienda, seleccion } = parsed.data;

  if (seleccion === CX_PROD_SELECCION_PROM) {
    const res = await limpiarCodExtCostoLista(codTienda);
    if (!res.success) return { ok: false, error: res.error };
  } else {
    const res = await establecerCodExtCostoLista(codTienda, seleccion);
    if (!res.success) return { ok: false, error: res.error };
  }

  revalidatePath("/gestion-productos/tienda/comp-proveedores");
  revalidatePath("/tienda");
  return { ok: true, data: undefined };
}

/** Excel CODIGO + COSTO: diff `costo_compra` (DUX) vs `px_compra_final_sin_iva` vía `costo_compra_cod_ext`. */
export async function exportarCostoCxDiffAction(): Promise<
  ActionResult<{ filas: FilaExportCostoCx[] }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  try {
    const filas = await listarFilasExportCostoCxDiff();
    return { ok: true, data: { filas } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo generar la exportación.",
    };
  }
}

/** POST DUX: envía lotes (sin esperar estado). El cliente hace polling con `consultarEstadoCostoCxDuxAction`. */
export async function enviarCostoCxDuxAction(): Promise<
  ActionResult<{
    cantidadEnviada: number;
    lotes: number;
    idsProceso: number[];
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const res = await enviarCostosCxADux();
  if (!res.success) return { ok: false, error: res.error };

  return { ok: true, data: res.data };
}

const consultarEstadoCostoCxSchema = z.object({
  idProceso: z.coerce.number().int().positive(),
});

/** Una consulta de estado DUX (polling desde UI, ≥ 5 s entre llamadas). */
export async function consultarEstadoCostoCxDuxAction(
  raw: unknown
): Promise<
  ActionResult<{
    estado: string;
    errores: string[];
    finalizado: boolean;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const parsed = consultarEstadoCostoCxSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "ID de proceso inválido." };
  }

  const res = await consultarEstadoEnvioCostoCxDux(parsed.data.idProceso);
  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}

/** @deprecated Usar enviarCostoCxDuxAction + consultarEstadoCostoCxDuxAction desde UI. */
export async function actualizarCostoCxDuxAction(): Promise<
  ActionResult<{
    cantidadEnviada: number;
    lotes: number;
    idProcesoUltimo: number | null;
  }>
> {
  const envio = await enviarCostoCxDuxAction();
  if (!envio.ok) return envio;

  let idProcesoUltimo: number | null = null;
  for (const idProceso of envio.data.idsProceso) {
    idProcesoUltimo = idProceso;
    const poll = await consultarEstadoCostoCxDuxAction({ idProceso });
    if (!poll.ok) return poll;
    if (!poll.data.finalizado) {
      return {
        ok: false,
        error: `El proceso DUX ${idProceso} no está finalizado (estado: ${poll.data.estado || "desconocido"}).`,
      };
    }
  }

  return {
    ok: true,
    data: {
      cantidadEnviada: envio.data.cantidadEnviada,
      lotes: envio.data.lotes,
      idProcesoUltimo,
    },
  };
}
