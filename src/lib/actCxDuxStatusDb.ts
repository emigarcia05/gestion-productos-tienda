import { Prisma } from "@prisma/client";
import { limpiarFilasActCxCache } from "@/lib/actCxFilasCache";
import { prisma } from "@/lib/prisma";
import { getSyncDuxStatusFromDb } from "@/lib/syncDuxStatusDb";

export const ACT_CX_DUX_STATUS_ID = "act-cx-costos-dux";

/** Tiempo máximo de una corrida Act. Cx. antes de liberar el mutex automáticamente. */
export const ACT_CX_DUX_MAX_RUNTIME_MS = 2 * 60 * 60 * 1000;

export type ActCxDuxPhase = "enviando" | "esperando";

export interface ActCxDuxMeta {
  /** Lote en curso (1-based, UI). */
  loteActual?: number;
  lotesTotal?: number;
  cantidadEnviada?: number;
  /** Lotes ya confirmados FINALIZADO en DUX. */
  lotesConfirmados?: number;
  /** Proceso DUX pendiente de confirmar tras POST del lote actual. */
  idProcesoPendiente?: number | null;
  itemsEnLotePendiente?: number;
  itemsCompletadosAntesPendiente?: number;
  /** Intento de poll del lote pendiente (1-based). */
  pollIntento?: number;
  /** Último `estado` devuelto por DUX en el poll. */
  estadoDux?: string;
}

export interface ActCxDuxStatusState {
  running: boolean;
  phase: ActCxDuxPhase | null;
  processed: number;
  total: number;
  error: string | null;
  lastCompletedAt: Date | null;
  meta: ActCxDuxMeta;
}

function parseOptionalInt(
  value: unknown,
  min: number,
  max?: number
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const n = Math.floor(value);
  if (n < min) return undefined;
  if (max != null && n > max) return undefined;
  return n;
}

function parseActCxMeta(raw: unknown): ActCxDuxMeta {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const loteActual = parseOptionalInt(o.loteActual, 1);
  const lotesTotal = parseOptionalInt(o.lotesTotal, 1);
  const cantidadEnviada = parseOptionalInt(o.cantidadEnviada, 0);
  const lotesConfirmados = parseOptionalInt(o.lotesConfirmados, 0);
  const idProcesoPendiente =
    o.idProcesoPendiente === null
      ? null
      : parseOptionalInt(o.idProcesoPendiente, 1);
  const itemsEnLotePendiente = parseOptionalInt(o.itemsEnLotePendiente, 1);
  const itemsCompletadosAntesPendiente = parseOptionalInt(
    o.itemsCompletadosAntesPendiente,
    0
  );
  const pollIntento = parseOptionalInt(o.pollIntento, 0);
  const estadoDux =
    typeof o.estadoDux === "string" && o.estadoDux.trim() !== ""
      ? o.estadoDux.trim()
      : undefined;
  return {
    loteActual,
    lotesTotal,
    cantidadEnviada,
    lotesConfirmados,
    idProcesoPendiente,
    itemsEnLotePendiente,
    itemsCompletadosAntesPendiente,
    pollIntento,
    estadoDux,
  };
}

function parsePhase(raw: string | null): ActCxDuxPhase | null {
  return raw === "enviando" || raw === "esperando" ? raw : null;
}

async function forceClearActCxDuxRunningInDb(reason: string): Promise<void> {
  limpiarFilasActCxCache();
  await prisma.syncDuxStatus.upsert({
    where: { id: ACT_CX_DUX_STATUS_ID },
    create: {
      id: ACT_CX_DUX_STATUS_ID,
      running: false,
      phase: null,
      processed: 0,
      total: 0,
      error: reason,
      startedAt: null,
    },
    update: {
      running: false,
      phase: null,
      startedAt: null,
      error: reason,
    },
  });
}

/**
 * Libera mutex si la corrida superó el TTL o quedó huérfana (sin `startedAt` tras cierre de pestaña/error).
 * @returns true si se liberó el bloqueo.
 */
export async function reconcileStaleActCxDuxLockInDb(): Promise<boolean> {
  const row = await prisma.syncDuxStatus.findUnique({
    where: { id: ACT_CX_DUX_STATUS_ID },
    select: { running: true, startedAt: true },
  });
  if (!row?.running) return false;

  if (!row.startedAt) {
    await forceClearActCxDuxRunningInDb(
      "Bloqueo Act. Cx. huérfano liberado automáticamente."
    );
    return true;
  }

  const ageMs = Date.now() - row.startedAt.getTime();
  if (ageMs > ACT_CX_DUX_MAX_RUNTIME_MS) {
    await forceClearActCxDuxRunningInDb(
      "La actualización de costos DUX expiró por tiempo. Revisá en DUX o reintentá."
    );
    return true;
  }

  return false;
}

/** Liberación manual del mutex (doble clic en banner o acción explícita). */
export async function liberarActCxDuxMutexInDb(): Promise<void> {
  await forceClearActCxDuxRunningInDb("Bloqueo Act. Cx. liberado manualmente.");
}

export async function getActCxDuxStatusFromDb(): Promise<ActCxDuxStatusState> {
  await reconcileStaleActCxDuxLockInDb();

  const row = await prisma.syncDuxStatus.findUnique({
    where: { id: ACT_CX_DUX_STATUS_ID },
    select: {
      running: true,
      phase: true,
      processed: true,
      total: true,
      error: true,
      lastCompletedAt: true,
      meta: true,
    },
  });

  if (!row) {
    return {
      running: false,
      phase: null,
      processed: 0,
      total: 0,
      error: null,
      lastCompletedAt: null,
      meta: {},
    };
  }

  return {
    running: row.running,
    phase: parsePhase(row.phase),
    processed: row.processed,
    total: row.total,
    error: row.error,
    lastCompletedAt: row.lastCompletedAt,
    meta: parseActCxMeta(row.meta),
  };
}

export async function isActCxDuxRunningInDb(): Promise<boolean> {
  await reconcileStaleActCxDuxLockInDb();
  const row = await prisma.syncDuxStatus.findUnique({
    where: { id: ACT_CX_DUX_STATUS_ID },
    select: { running: true },
  });
  return row?.running === true;
}

/** Reserva la corrida Act. Cx. (mutex DUX vs sync lista + otra Act. Cx.). */
export async function tryStartActCxDuxInDb(
  totalItems: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await reconcileStaleActCxDuxLockInDb();

  const listaSync = await getSyncDuxStatusFromDb();
  if (listaSync.running) {
    return {
      ok: false,
      error: "Hay una sincronización de productos DUX en curso. Esperá a que finalice.",
    };
  }

  const act = await getActCxDuxStatusFromDb();
  if (act.running) {
    return {
      ok: false,
      error: "Ya hay una actualización de costos DUX en curso.",
    };
  }

  const total = Math.max(0, Math.floor(totalItems));

  const startedAt = new Date();

  await prisma.syncDuxStatus.upsert({
    where: { id: ACT_CX_DUX_STATUS_ID },
    create: {
      id: ACT_CX_DUX_STATUS_ID,
      running: true,
      phase: "enviando",
      processed: 0,
      total,
      error: null,
      startedAt,
    },
    update: {
      running: true,
      phase: "enviando",
      processed: 0,
      total,
      error: null,
      startedAt,
    },
  });

  return { ok: true };
}

export async function setActCxDuxProgressInDb(params: {
  processed: number;
  total?: number;
  phase?: ActCxDuxPhase;
  meta?: ActCxDuxMeta | null;
}): Promise<void> {
  await prisma.syncDuxStatus.update({
    where: { id: ACT_CX_DUX_STATUS_ID },
    data: {
      ...(params.phase != null ? { phase: params.phase } : {}),
      ...(params.total != null ? { total: Math.max(0, Math.floor(params.total)) } : {}),
      ...(params.meta !== undefined
        ? {
            meta:
              params.meta == null || Object.keys(params.meta).length === 0
                ? Prisma.DbNull
                : (params.meta as Prisma.InputJsonValue),
          }
        : {}),
      processed: Math.max(0, Math.floor(params.processed)),
    },
  });
}

export async function finishActCxDuxInDb(processed: number, total: number): Promise<void> {
  limpiarFilasActCxCache();
  await prisma.syncDuxStatus.update({
    where: { id: ACT_CX_DUX_STATUS_ID },
    data: {
      running: false,
      phase: null,
      processed: Math.max(0, Math.floor(processed)),
      total: Math.max(0, Math.floor(total)),
      error: null,
      startedAt: null,
      lastCompletedAt: new Date(),
    },
  });
}

export async function failActCxDuxInDb(message: string): Promise<void> {
  limpiarFilasActCxCache();
  await prisma.syncDuxStatus.upsert({
    where: { id: ACT_CX_DUX_STATUS_ID },
    create: {
      id: ACT_CX_DUX_STATUS_ID,
      running: false,
      phase: null,
      processed: 0,
      total: 0,
      error: message,
      startedAt: null,
    },
    update: {
      running: false,
      phase: null,
      error: message,
      startedAt: null,
    },
  });
}
