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
  enviarLoteCostoCxADux,
  prepararEnvioCostosCxADux,
} from "@/services/actualizarCostoCxDux.service";
import type { FilaExportCostoCx } from "@/services/exportCostoCxDiff.service";
import {
  failActCxDuxInDb,
  finishActCxDuxInDb,
  getActCxDuxStatusFromDb,
  isActCxDuxRunningInDb,
  liberarActCxDuxMutexInDb,
  setActCxDuxProgressInDb,
  tryStartActCxDuxInDb,
} from "@/lib/actCxDuxStatusDb";

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

/** Estado global Act. Cx. DUX (polling UI / mutex entre usuarios). */
export async function getActCxDuxStatusAction(): Promise<
  ActionResult<{
    running: boolean;
    phase: "enviando" | "esperando" | null;
    processed: number;
    total: number;
    error: string | null;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acciones.sincronizar)) {
    return { ok: false, error: "Sin acceso." };
  }
  const status = await getActCxDuxStatusFromDb();
  return { ok: true, data: status };
}

/** Reserva mutex y devuelve cantidad de lotes (sin POST). */
export async function iniciarActCxDuxAction(): Promise<
  ActionResult<{
    cantidadEnviada: number;
    lotes: number;
    loteSize: number;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const prep = await prepararEnvioCostosCxADux();
  if (!prep.success) {
    return { ok: false, error: prep.error };
  }

  const lock = await tryStartActCxDuxInDb(prep.data.cantidadEnviada);
  if (!lock.ok) {
    return { ok: false, error: lock.error };
  }

  return { ok: true, data: prep.data };
}

const enviarLoteCostoCxSchema = z.object({
  loteIndex: z.coerce.number().int().min(0),
});

/** Un POST DUX (≤50 ítems). El cliente encadena lotes y hace polling por `idProceso`. */
export async function enviarLoteCostoCxDuxAction(raw: unknown): Promise<
  ActionResult<{
    idProceso: number;
    itemsEnLote: number;
    itemsCompletadosAntes: number;
    loteIndex: number;
    lotesTotal: number;
    cantidadEnviada: number;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  if (!(await isActCxDuxRunningInDb())) {
    return {
      ok: false,
      error: "No hay una actualización de costos DUX en curso.",
    };
  }

  const parsed = enviarLoteCostoCxSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Índice de lote inválido." };
  }

  const status = await getActCxDuxStatusFromDb();

  await setActCxDuxProgressInDb({
    phase: "enviando",
    processed: status.processed,
    total: status.total,
  });

  try {
    const res = await enviarLoteCostoCxADux(parsed.data.loteIndex);
    if (!res.success) {
      await failActCxDuxInDb(res.error);
      return { ok: false, error: res.error };
    }

    await setActCxDuxProgressInDb({
      phase: "esperando",
      processed: res.data.itemsCompletadosAntes,
      total: res.data.cantidadEnviada,
    });

    return { ok: true, data: res.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al enviar lote a DUX.";
    await failActCxDuxInDb(msg);
    return { ok: false, error: msg };
  }
}

/** @deprecated Usar `iniciarActCxDuxAction` + `enviarLoteCostoCxDuxAction` desde UI. */
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

  const filas = await listarFilasExportCostoCxDiff();
  if (filas.length === 0) {
    return {
      ok: false,
      error: "No hay productos con diferencia entre costo DUX y precio del proveedor BASE.",
    };
  }

  const lock = await tryStartActCxDuxInDb(filas.length);
  if (!lock.ok) {
    return { ok: false, error: lock.error };
  }

  try {
    const res = await enviarCostosCxADux();
    if (!res.success) {
      await failActCxDuxInDb(res.error);
      return { ok: false, error: res.error };
    }

    await setActCxDuxProgressInDb({
      phase: "esperando",
      processed: 0,
      total: res.data.cantidadEnviada,
    });

    return { ok: true, data: res.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al enviar costos a DUX.";
    await failActCxDuxInDb(msg);
    return { ok: false, error: msg };
  }
}

const consultarEstadoCostoCxSchema = z.object({
  idProceso: z.coerce.number().int().positive(),
  itemsCompletadosAntes: z.coerce.number().int().min(0).optional(),
  itemsEnLote: z.coerce.number().int().positive().optional(),
  /** @deprecated Usar itemsCompletadosAntes + itemsEnLote */
  loteActual: z.coerce.number().int().positive().optional(),
  /** @deprecated */
  lotesTotal: z.coerce.number().int().positive().optional(),
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

  if (!(await isActCxDuxRunningInDb())) {
    return {
      ok: false,
      error: "No hay una actualización de costos DUX en curso.",
    };
  }

  const parsed = consultarEstadoCostoCxSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "ID de proceso inválido." };
  }

  const res = await consultarEstadoEnvioCostoCxDux(parsed.data.idProceso);
  if (!res.success) {
    await failActCxDuxInDb(res.error);
    return { ok: false, error: res.error };
  }

  const status = await getActCxDuxStatusFromDb();
  const antes =
    parsed.data.itemsCompletadosAntes ??
    (parsed.data.loteActual != null && parsed.data.lotesTotal != null
      ? Math.min(
          status.total,
          Math.round(
            (status.total * (parsed.data.loteActual - 1)) / parsed.data.lotesTotal
          )
        )
      : status.processed);
  const enLote = parsed.data.itemsEnLote ?? 0;

  const processed = res.data.finalizado
    ? Math.min(status.total, antes + (enLote > 0 ? enLote : 0))
    : Math.min(status.total, Math.max(status.processed, antes));

  await setActCxDuxProgressInDb({
    phase: "esperando",
    processed,
    total: status.total,
  });

  return { ok: true, data: res.data };
}

export async function finalizarActCxDuxExitoAction(params: {
  cantidadEnviada: number;
}): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  await finishActCxDuxInDb(params.cantidadEnviada, params.cantidadEnviada);
  revalidatePath("/gestion-productos/tienda/comp-proveedores");
  return { ok: true, data: undefined };
}

export async function abortarActCxDuxAction(raw: unknown): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  const msg =
    typeof raw === "object" &&
    raw != null &&
    "error" in raw &&
    typeof (raw as { error?: unknown }).error === "string"
      ? (raw as { error: string }).error
      : "Actualización de costos DUX cancelada o fallida.";

  await failActCxDuxInDb(msg);
  return { ok: true, data: undefined };
}

/** Libera mutex Act. Cx. trabado (doble clic en banner o recuperación manual). */
export async function liberarActCxDuxTrabadoAction(): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }

  if (!(await isActCxDuxRunningInDb())) {
    return { ok: true, data: undefined };
  }

  await liberarActCxDuxMutexInDb();
  revalidatePath("/gestion-productos/tienda/comp-proveedores");
  return { ok: true, data: undefined };
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
