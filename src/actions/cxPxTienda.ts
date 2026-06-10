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
import { limpiarFilasActCxCache, obtenerFilasActCxParaEnvio } from "@/lib/actCxFilasCache";
import { listarFilasExportCostoCxDiff } from "@/services/exportCostoCxDiff.service";
import {
  consultarEstadoEnvioCostoCxDux,
  enviarCostosCxADux,
  enviarLoteCostoCxADux,
  prepararEnvioCostosCxADux,
} from "@/services/actualizarCostoCxDux.service";
import type { FilaExportCostoCx } from "@/services/exportCostoCxDiff.service";
import {
  ACT_CX_DUX_POLL_INTERVAL_MS,
  ACT_CX_DUX_POLL_MAX_ATTEMPTS,
} from "@/lib/actCxDuxPollPolicy";
import {
  failActCxDuxInDb,
  finishActCxDuxInDb,
  getActCxDuxStatusFromDb,
  isActCxDuxRunningInDb,
  liberarActCxDuxMutexInDb,
  setActCxDuxProgressInDb,
  tryStartActCxDuxInDb,
  type ActCxDuxMeta,
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
    lastCompletedAt: string | null;
    loteActual: number | null;
    lotesTotal: number | null;
    pollIntento: number | null;
    estadoDux: string | null;
  }>
> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.tienda.acciones.sincronizar)) {
    return { ok: false, error: "Sin acceso." };
  }
  const status = await getActCxDuxStatusFromDb();
  return {
    ok: true,
    data: {
      running: status.running,
      phase: status.phase,
      processed: status.processed,
      total: status.total,
      error: status.error,
      lastCompletedAt: status.lastCompletedAt?.toISOString() ?? null,
      loteActual: status.meta.loteActual ?? null,
      lotesTotal: status.meta.lotesTotal ?? null,
      pollIntento: status.meta.pollIntento ?? null,
      estadoDux: status.meta.estadoDux ?? null,
    },
  };
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

  limpiarFilasActCxCache();
  await obtenerFilasActCxParaEnvio();

  const lock = await tryStartActCxDuxInDb(prep.data.cantidadEnviada);
  if (!lock.ok) {
    return { ok: false, error: lock.error };
  }

  await setActCxDuxProgressInDb({
    phase: "enviando",
    processed: 0,
    total: prep.data.cantidadEnviada,
    meta: {
      loteActual: 1,
      lotesTotal: prep.data.lotes,
      cantidadEnviada: prep.data.cantidadEnviada,
      lotesConfirmados: 0,
      idProcesoPendiente: null,
      pollIntento: 0,
    },
  });

  return { ok: true, data: prep.data };
}

/** Un paso: POST de un lote o un GET de confirmación (intercalados, estado en BD). */
export async function avanzarActCxDuxAction(): Promise<
  ActionResult<{
    continuing: boolean;
    waitMs: number;
    cantidadEnviada?: number;
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
    return { ok: true, data: { continuing: false, waitMs: 0 } };
  }

  const status = await getActCxDuxStatusFromDb();
  const meta = status.meta;

  const corridaLegacyInconsistente =
    meta.idProcesoPendiente == null &&
    (meta.lotesConfirmados ?? 0) === 0 &&
    status.phase === "esperando" &&
    status.processed > 0;
  if (corridaLegacyInconsistente) {
    const msg =
      "Corrida Act. Cx. en estado inconsistente (flujo anterior). Liberá el bloqueo con doble clic en el sidebar y reintentá.";
    await failActCxDuxInDb(msg);
    return { ok: false, error: msg };
  }

  const lotesTotal = meta.lotesTotal ?? 1;
  const lotesConfirmados = meta.lotesConfirmados ?? 0;
  const cantidadEnviada = meta.cantidadEnviada ?? status.total;
  const idProcesoPendiente = meta.idProcesoPendiente ?? null;

  if (idProcesoPendiente != null && idProcesoPendiente > 0) {
    const poll = await consultarEstadoEnvioCostoCxDux(idProcesoPendiente);
    if (!poll.success) {
      await failActCxDuxInDb(poll.error);
      return { ok: false, error: poll.error };
    }

    const pollIntento = (meta.pollIntento ?? 0) + 1;

    if (!poll.data.finalizado) {
      if (pollIntento >= ACT_CX_DUX_POLL_MAX_ATTEMPTS) {
        const msg = `El proceso DUX ${idProcesoPendiente} no finalizó a tiempo (estado: ${poll.data.estado || "desconocido"}). Revisá en DUX o reintentá más tarde.`;
        await failActCxDuxInDb(msg);
        return { ok: false, error: msg };
      }

      await setActCxDuxProgressInDb({
        phase: "esperando",
        processed: status.processed,
        total: status.total,
        meta: {
          ...meta,
          pollIntento,
          estadoDux: poll.data.estado || undefined,
          loteActual: lotesConfirmados + 1,
        },
      });

      return {
        ok: true,
        data: { continuing: true, waitMs: ACT_CX_DUX_POLL_INTERVAL_MS },
      };
    }

    const itemsEnLote = meta.itemsEnLotePendiente ?? 0;
    const itemsAntes = meta.itemsCompletadosAntesPendiente ?? status.processed;
    const newProcessed = Math.min(status.total, itemsAntes + itemsEnLote);
    const newLotesConfirmados = lotesConfirmados + 1;

    const metaTrasConfirmar: ActCxDuxMeta = {
      ...meta,
      lotesConfirmados: newLotesConfirmados,
      idProcesoPendiente: null,
      itemsEnLotePendiente: undefined,
      itemsCompletadosAntesPendiente: undefined,
      pollIntento: 0,
      estadoDux: poll.data.estado || undefined,
      loteActual:
        newLotesConfirmados >= lotesTotal ? lotesTotal : newLotesConfirmados + 1,
    };

    if (newLotesConfirmados >= lotesTotal) {
      await finishActCxDuxInDb(newProcessed, cantidadEnviada);
      revalidatePath("/gestion-productos/tienda/comp-proveedores");
      return {
        ok: true,
        data: { continuing: false, waitMs: 0, cantidadEnviada },
      };
    }

    await setActCxDuxProgressInDb({
      phase: "enviando",
      processed: newProcessed,
      total: status.total,
      meta: metaTrasConfirmar,
    });

    return { ok: true, data: { continuing: true, waitMs: 0 } };
  }

  if (lotesConfirmados >= lotesTotal) {
    await finishActCxDuxInDb(status.processed, cantidadEnviada);
    revalidatePath("/gestion-productos/tienda/comp-proveedores");
    return {
      ok: true,
      data: { continuing: false, waitMs: 0, cantidadEnviada },
    };
  }

  try {
    const res = await enviarLoteCostoCxADux(lotesConfirmados);
    if (!res.success) {
      await failActCxDuxInDb(res.error);
      return { ok: false, error: res.error };
    }

    await setActCxDuxProgressInDb({
      phase: "esperando",
      processed: status.processed,
      total: status.total,
      meta: {
        ...meta,
        lotesTotal: res.data.lotesTotal,
        cantidadEnviada: res.data.cantidadEnviada,
        loteActual: lotesConfirmados + 1,
        idProcesoPendiente: res.data.idProceso,
        itemsEnLotePendiente: res.data.itemsEnLote,
        itemsCompletadosAntesPendiente: res.data.itemsCompletadosAntes,
        pollIntento: 0,
        estadoDux: undefined,
      },
    });

    return {
      ok: true,
      data: { continuing: true, waitMs: ACT_CX_DUX_POLL_INTERVAL_MS },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al enviar lote a DUX.";
    await failActCxDuxInDb(msg);
    return { ok: false, error: msg };
  }
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

    const itemsEnviados = res.data.itemsCompletadosAntes + res.data.itemsEnLote;

    await setActCxDuxProgressInDb({
      phase: "enviando",
      processed: itemsEnviados,
      total: res.data.cantidadEnviada,
      meta: null,
    });

    return { ok: true, data: res.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al enviar lote a DUX.";
    await failActCxDuxInDb(msg);
    return { ok: false, error: msg };
  }
}

/** @deprecated Flujo en dos fases; usar `avanzarActCxDuxAction` (POST + poll intercalados). */
export async function comenzarConfirmacionActCxDuxAction(): Promise<ActionResult> {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.cxPxTienda.acceso)) {
    return { ok: false, error: "Sin acceso." };
  }
  if (!(await esEditor())) {
    return { ok: false, error: "Sin permisos de editor." };
  }
  if (!(await isActCxDuxRunningInDb())) {
    return { ok: false, error: "No hay una actualización de costos DUX en curso." };
  }

  const status = await getActCxDuxStatusFromDb();
  await setActCxDuxProgressInDb({
    phase: "esperando",
    processed: status.processed,
    total: status.total,
    meta: null,
  });
  return { ok: true, data: undefined };
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
  loteActual: z.coerce.number().int().positive().optional(),
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
  const enviadosEnLote = antes + (enLote > 0 ? enLote : 0);

  const processed = res.data.finalizado
    ? Math.min(status.total, enviadosEnLote)
    : status.processed;

  const meta =
    parsed.data.loteActual != null && parsed.data.lotesTotal != null
      ? { loteActual: parsed.data.loteActual, lotesTotal: parsed.data.lotesTotal }
      : null;

  await setActCxDuxProgressInDb({
    phase: "esperando",
    processed,
    total: status.total,
    meta,
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
