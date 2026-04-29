import { prisma } from "@/lib/prisma";

/** Fila dedicada en `sync_dux_status` (no colisiona con `lista-precios-tienda`). */
export const SYNC_COMPRAS_PROVEEDOR_DUX_STATUS_ID = "compras-proveedor-dux";

export interface SyncComprasProveedorDuxStatusState {
  running: boolean;
  processed: number;
  total: number;
  error: string | null;
  lastCompletedAt: Date | null;
}

export async function getSyncComprasProveedorDuxStatusFromDb(): Promise<SyncComprasProveedorDuxStatusState> {
  const row = await prisma.syncDuxStatus.findUnique({
    where: { id: SYNC_COMPRAS_PROVEEDOR_DUX_STATUS_ID },
    select: {
      running: true,
      processed: true,
      total: true,
      error: true,
      lastCompletedAt: true,
    },
  });

  if (!row) {
    return {
      running: false,
      processed: 0,
      total: 0,
      error: null,
      lastCompletedAt: null,
    };
  }

  return {
    running: row.running,
    processed: row.processed,
    total: row.total,
    error: row.error,
    lastCompletedAt: row.lastCompletedAt,
  };
}

export async function startSyncComprasProveedorDuxInDb(total: number): Promise<void> {
  const totalNorm = Math.max(0, Math.floor(total));
  await prisma.syncDuxStatus.upsert({
    where: { id: SYNC_COMPRAS_PROVEEDOR_DUX_STATUS_ID },
    create: {
      id: SYNC_COMPRAS_PROVEEDOR_DUX_STATUS_ID,
      running: true,
      phase: "sincronizando",
      processed: 0,
      total: totalNorm,
      error: null,
      lastCompletedAt: null,
    },
    update: {
      running: true,
      phase: "sincronizando",
      processed: 0,
      total: totalNorm,
      error: null,
    },
  });
}

export async function setSyncComprasProveedorDuxProgressInDb(
  processed: number,
  total: number
): Promise<void> {
  const processedNorm = Math.max(0, Math.floor(processed));
  const totalNorm = Math.max(0, Math.floor(total));
  await prisma.syncDuxStatus.update({
    where: { id: SYNC_COMPRAS_PROVEEDOR_DUX_STATUS_ID },
    data: { processed: processedNorm, total: totalNorm },
  });
}

export async function setSyncComprasProveedorDuxSuccessInDb(
  processed: number,
  total: number
): Promise<void> {
  const processedNorm = Math.max(0, Math.floor(processed));
  const totalNorm = Math.max(0, Math.floor(total));
  await prisma.syncDuxStatus.update({
    where: { id: SYNC_COMPRAS_PROVEEDOR_DUX_STATUS_ID },
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

export async function setSyncComprasProveedorDuxErrorInDb(message: string): Promise<void> {
  await prisma.syncDuxStatus.upsert({
    where: { id: SYNC_COMPRAS_PROVEEDOR_DUX_STATUS_ID },
    create: {
      id: SYNC_COMPRAS_PROVEEDOR_DUX_STATUS_ID,
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
