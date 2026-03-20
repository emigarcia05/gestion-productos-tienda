import { prisma } from "@/lib/prisma";

const SYNC_DUX_STATUS_ID = "lista-precios-tienda";

export type SyncDuxPhase = "sincronizando" | "guardando";

export interface SyncDuxStatusState {
  running: boolean;
  phase: SyncDuxPhase | null;
  processed: number;
  total: number;
  error: string | null;
  lastCompletedAt: Date | null;
}

export async function getSyncDuxStatusFromDb(): Promise<SyncDuxStatusState> {
  const row = await prisma.syncDuxStatus.findUnique({
    where: { id: SYNC_DUX_STATUS_ID },
    select: {
      running: true,
      phase: true,
      processed: true,
      total: true,
      error: true,
      lastCompletedAt: true,
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
    };
  }

  return {
    running: row.running,
    phase: row.phase === "sincronizando" || row.phase === "guardando" ? row.phase : null,
    processed: row.processed,
    total: row.total,
    error: row.error,
    lastCompletedAt: row.lastCompletedAt,
  };
}

export async function startSyncDuxInDb(): Promise<void> {
  await prisma.syncDuxStatus.upsert({
    where: { id: SYNC_DUX_STATUS_ID },
    create: {
      id: SYNC_DUX_STATUS_ID,
      running: true,
      phase: "sincronizando",
      processed: 0,
      total: 0,
      error: null,
      lastCompletedAt: null,
    },
    update: {
      running: true,
      phase: "sincronizando",
      processed: 0,
      total: 0,
      error: null,
    },
  });
}

export async function setSyncDuxProgressInDb(
  processed: number,
  total: number,
  phase?: SyncDuxPhase | null
): Promise<void> {
  const processedNorm = Math.max(0, Math.floor(processed));
  const totalNorm = Math.max(0, Math.floor(total));

  if (phase === undefined) {
    await prisma.syncDuxStatus.update({
      where: { id: SYNC_DUX_STATUS_ID },
      data: { processed: processedNorm, total: totalNorm },
    });
    return;
  }

  await prisma.syncDuxStatus.update({
    where: { id: SYNC_DUX_STATUS_ID },
    data: { processed: processedNorm, total: totalNorm, phase },
  });
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
      lastCompletedAt: new Date(),
    },
  });
}

export async function setSyncDuxErrorInDb(message: string): Promise<void> {
  // Mantiene semantics: en caso de conflicto, no resetea `processed/total`,
  // solo marca error y desactiva running.
  await prisma.syncDuxStatus.upsert({
    where: { id: SYNC_DUX_STATUS_ID },
    create: {
      id: SYNC_DUX_STATUS_ID,
      running: false,
      phase: null,
      processed: 0,
      total: 0,
      error: message,
      lastCompletedAt: null,
    },
    update: {
      running: false,
      phase: null,
      error: message,
    },
  });
}
