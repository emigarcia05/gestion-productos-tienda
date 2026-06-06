import { prisma } from "@/lib/prisma";
import { getSyncDuxStatusFromDb } from "@/lib/syncDuxStatusDb";

export const ACT_CX_DUX_STATUS_ID = "act-cx-costos-dux";

export type ActCxDuxPhase = "enviando" | "esperando";

export interface ActCxDuxStatusState {
  running: boolean;
  phase: ActCxDuxPhase | null;
  processed: number;
  total: number;
  error: string | null;
  lastCompletedAt: Date | null;
}

function parsePhase(raw: string | null): ActCxDuxPhase | null {
  return raw === "enviando" || raw === "esperando" ? raw : null;
}

export async function getActCxDuxStatusFromDb(): Promise<ActCxDuxStatusState> {
  const row = await prisma.syncDuxStatus.findUnique({
    where: { id: ACT_CX_DUX_STATUS_ID },
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
    phase: parsePhase(row.phase),
    processed: row.processed,
    total: row.total,
    error: row.error,
    lastCompletedAt: row.lastCompletedAt,
  };
}

export async function isActCxDuxRunningInDb(): Promise<boolean> {
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

  await prisma.syncDuxStatus.upsert({
    where: { id: ACT_CX_DUX_STATUS_ID },
    create: {
      id: ACT_CX_DUX_STATUS_ID,
      running: true,
      phase: "enviando",
      processed: 0,
      total,
      error: null,
    },
    update: {
      running: true,
      phase: "enviando",
      processed: 0,
      total,
      error: null,
    },
  });

  return { ok: true };
}

export async function setActCxDuxProgressInDb(params: {
  processed: number;
  total?: number;
  phase?: ActCxDuxPhase;
}): Promise<void> {
  await prisma.syncDuxStatus.update({
    where: { id: ACT_CX_DUX_STATUS_ID },
    data: {
      ...(params.phase != null ? { phase: params.phase } : {}),
      ...(params.total != null ? { total: Math.max(0, Math.floor(params.total)) } : {}),
      processed: Math.max(0, Math.floor(params.processed)),
    },
  });
}

export async function finishActCxDuxInDb(processed: number, total: number): Promise<void> {
  await prisma.syncDuxStatus.update({
    where: { id: ACT_CX_DUX_STATUS_ID },
    data: {
      running: false,
      phase: null,
      processed: Math.max(0, Math.floor(processed)),
      total: Math.max(0, Math.floor(total)),
      error: null,
      lastCompletedAt: new Date(),
    },
  });
}

export async function failActCxDuxInDb(message: string): Promise<void> {
  await prisma.syncDuxStatus.upsert({
    where: { id: ACT_CX_DUX_STATUS_ID },
    create: {
      id: ACT_CX_DUX_STATUS_ID,
      running: false,
      phase: null,
      processed: 0,
      total: 0,
      error: message,
    },
    update: {
      running: false,
      phase: null,
      error: message,
    },
  });
}
