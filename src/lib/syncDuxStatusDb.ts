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

interface SyncDuxStatusRow {
  running: boolean;
  phase: string | null;
  processed: number;
  total: number;
  error: string | null;
  last_completed_at: Date | null;
}

export async function getSyncDuxStatusFromDb(): Promise<SyncDuxStatusState> {
  const rows = await prisma.$queryRaw<SyncDuxStatusRow[]>`
    SELECT running, phase, processed, total, error, last_completed_at
    FROM sync_dux_status
    WHERE id = ${SYNC_DUX_STATUS_ID}
    LIMIT 1
  `;

  const row = rows[0];
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
    phase:
      row.phase === "sincronizando" || row.phase === "guardando"
        ? row.phase
        : null,
    processed: row.processed,
    total: row.total,
    error: row.error,
    lastCompletedAt: row.last_completed_at,
  };
}

export async function startSyncDuxInDb(): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO sync_dux_status (id, running, phase, processed, total, error, updated_at)
    VALUES (${SYNC_DUX_STATUS_ID}, true, 'sincronizando', 0, 0, NULL, NOW())
    ON CONFLICT (id) DO UPDATE
    SET running = true,
        phase = 'sincronizando',
        processed = 0,
        total = 0,
        error = NULL,
        updated_at = NOW()
  `;
}

export async function setSyncDuxProgressInDb(
  processed: number,
  total: number,
  phase?: SyncDuxPhase | null
): Promise<void> {
  if (phase === undefined) {
    await prisma.$executeRaw`
      UPDATE sync_dux_status
      SET processed = ${processed},
          total = ${total},
          updated_at = NOW()
      WHERE id = ${SYNC_DUX_STATUS_ID}
    `;
    return;
  }

  await prisma.$executeRaw`
    UPDATE sync_dux_status
    SET processed = ${processed},
        total = ${total},
        phase = ${phase},
        updated_at = NOW()
    WHERE id = ${SYNC_DUX_STATUS_ID}
  `;
}

export async function setSyncDuxSuccessInDb(
  processed: number,
  total: number
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE sync_dux_status
    SET running = false,
        phase = NULL,
        processed = ${processed},
        total = ${total},
        error = NULL,
        last_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${SYNC_DUX_STATUS_ID}
  `;
}

export async function setSyncDuxErrorInDb(message: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO sync_dux_status (id, running, phase, processed, total, error, updated_at)
    VALUES (${SYNC_DUX_STATUS_ID}, false, NULL, 0, 0, ${message}, NOW())
    ON CONFLICT (id) DO UPDATE
    SET running = false,
        phase = NULL,
        error = ${message},
        updated_at = NOW()
  `;
}
