import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const SYNC_DUX_STATUS_ID = "lista-precios-tienda";

export type SyncDuxPhase = "sincronizando" | "guardando";

export interface SyncDuxWorkerMeta {
  depositosVistos: number[];
  listasVistas: number[];
  countBefore: number;
}

export interface SyncDuxStatusState {
  running: boolean;
  phase: SyncDuxPhase | null;
  processed: number;
  total: number;
  error: string | null;
  lastCompletedAt: Date | null;
}

export interface SyncDuxWorkerState extends SyncDuxStatusState {
  fetchOffset: number;
  apiFetchComplete: boolean;
  startedAt: Date | null;
  meta: SyncDuxWorkerMeta;
}

function parsePhase(raw: string | null): SyncDuxPhase | null {
  return raw === "sincronizando" || raw === "guardando" ? raw : null;
}

function emptyMeta(): SyncDuxWorkerMeta {
  return { depositosVistos: [], listasVistas: [], countBefore: 0 };
}

export function parseSyncDuxWorkerMeta(raw: unknown): SyncDuxWorkerMeta {
  if (!raw || typeof raw !== "object") return emptyMeta();
  const o = raw as Record<string, unknown>;
  const depositosVistos = Array.isArray(o.depositosVistos)
    ? o.depositosVistos.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    : [];
  const listasVistas = Array.isArray(o.listasVistas)
    ? o.listasVistas.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    : [];
  const countBefore =
    typeof o.countBefore === "number" && Number.isFinite(o.countBefore)
      ? Math.max(0, Math.floor(o.countBefore))
      : 0;
  return { depositosVistos, listasVistas, countBefore };
}

export async function getSyncDuxStatusFromDb(): Promise<SyncDuxStatusState> {
  return getSyncDuxWorkerStateFromDb();
}

export async function getSyncDuxWorkerStateFromDb(): Promise<SyncDuxWorkerState> {
  const row = await prisma.syncDuxStatus.findUnique({
    where: { id: SYNC_DUX_STATUS_ID },
    select: {
      running: true,
      phase: true,
      processed: true,
      total: true,
      error: true,
      lastCompletedAt: true,
      fetchOffset: true,
      apiFetchComplete: true,
      startedAt: true,
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
      fetchOffset: 0,
      apiFetchComplete: false,
      startedAt: null,
      meta: emptyMeta(),
    };
  }

  return {
    running: row.running,
    phase: parsePhase(row.phase),
    processed: row.processed,
    total: row.total,
    error: row.error,
    lastCompletedAt: row.lastCompletedAt,
    fetchOffset: row.fetchOffset,
    apiFetchComplete: row.apiFetchComplete,
    startedAt: row.startedAt,
    meta: parseSyncDuxWorkerMeta(row.meta),
  };
}

export async function startSyncDuxInDb(countBefore: number): Promise<void> {
  const startedAt = new Date();
  const meta: SyncDuxWorkerMeta = {
    depositosVistos: [],
    listasVistas: [],
    countBefore: Math.max(0, Math.floor(countBefore)),
  };
  await prisma.syncDuxStatus.upsert({
    where: { id: SYNC_DUX_STATUS_ID },
    create: {
      id: SYNC_DUX_STATUS_ID,
      running: true,
      phase: "sincronizando",
      processed: 0,
      total: 0,
      error: null,
      fetchOffset: 0,
      apiFetchComplete: false,
      startedAt,
      meta: meta as unknown as Prisma.InputJsonValue,
      lastCompletedAt: null,
    },
    update: {
      running: true,
      phase: "sincronizando",
      processed: 0,
      total: 0,
      error: null,
      fetchOffset: 0,
      apiFetchComplete: false,
      startedAt,
      meta: meta as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function saveSyncDuxWorkerStateInDb(data: {
  phase?: SyncDuxPhase | null;
  processed?: number;
  total?: number;
  fetchOffset?: number;
  apiFetchComplete?: boolean;
  meta?: SyncDuxWorkerMeta;
}): Promise<void> {
  await prisma.syncDuxStatus.update({
    where: { id: SYNC_DUX_STATUS_ID },
    data: {
      ...(data.phase !== undefined ? { phase: data.phase } : {}),
      ...(data.processed !== undefined
        ? { processed: Math.max(0, Math.floor(data.processed)) }
        : {}),
      ...(data.total !== undefined ? { total: Math.max(0, Math.floor(data.total)) } : {}),
      ...(data.fetchOffset !== undefined
        ? { fetchOffset: Math.max(0, Math.floor(data.fetchOffset)) }
        : {}),
      ...(data.apiFetchComplete !== undefined
        ? { apiFetchComplete: data.apiFetchComplete }
        : {}),
      ...(data.meta !== undefined
        ? { meta: data.meta as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function setSyncDuxProgressInDb(
  processed: number,
  total: number,
  phase?: SyncDuxPhase | null
): Promise<void> {
  await saveSyncDuxWorkerStateInDb({ processed, total, phase });
}

export async function setSyncDuxSuccessInDb(
  processed: number,
  total: number
): Promise<void> {
  const processedNorm = Math.max(0, Math.floor(processed));
  const totalNorm = Math.max(0, Math.floor(total));

  await prisma.syncDuxStatus.update({
    where: { id: SYNC_DUX_STATUS_ID },
    data: {
      running: false,
      phase: null,
      processed: processedNorm,
      total: totalNorm,
      error: null,
      fetchOffset: 0,
      apiFetchComplete: false,
      startedAt: null,
      meta: Prisma.DbNull,
      lastCompletedAt: new Date(),
    },
  });
}

export async function setSyncDuxErrorInDb(message: string): Promise<void> {
  await prisma.syncDuxStatus.upsert({
    where: { id: SYNC_DUX_STATUS_ID },
    create: {
      id: SYNC_DUX_STATUS_ID,
      running: false,
      phase: null,
      processed: 0,
      total: 0,
      error: message,
      fetchOffset: 0,
      apiFetchComplete: false,
      startedAt: null,
      meta: Prisma.DbNull,
      lastCompletedAt: null,
    },
    update: {
      running: false,
      phase: null,
      error: message,
    },
  });
}

export async function requestCancelListaPrecioTiendaSyncInDb(): Promise<boolean> {
  const r = await prisma.syncDuxStatus.updateMany({
    where: { id: SYNC_DUX_STATUS_ID, running: true },
    data: {
      running: false,
      phase: null,
      error: null,
      fetchOffset: 0,
      apiFetchComplete: false,
      startedAt: null,
      meta: Prisma.DbNull,
    },
  });
  return r.count > 0;
}

export async function clearListaPrecioTiendaSyncRunningStateInDb(): Promise<void> {
  await prisma.syncDuxStatus.updateMany({
    where: { id: SYNC_DUX_STATUS_ID },
    data: {
      running: false,
      phase: null,
      error: null,
      fetchOffset: 0,
      apiFetchComplete: false,
      startedAt: null,
      meta: Prisma.DbNull,
    },
  });
}
