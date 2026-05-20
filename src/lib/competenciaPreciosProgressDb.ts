import { prisma } from "@/lib/prisma";

const PROGRESS_ID = "competencia-precios-sync";

export interface CompetenciaSyncProgressState {
  running: boolean;
  processed: number;
  total: number;
  done: boolean;
  error: string | null;
  encontrados: number | null;
  vacios: number | null;
  errores: number | null;
}

export async function getCompetenciaSyncProgressFromDb(): Promise<CompetenciaSyncProgressState> {
  const row = await prisma.importProgress.findUnique({ where: { id: PROGRESS_ID } });
  if (!row) {
    return {
      running: false,
      processed: 0,
      total: 0,
      done: false,
      error: null,
      encontrados: null,
      vacios: null,
      errores: null,
    };
  }
  return {
    running: row.running,
    processed: row.processed,
    total: row.total,
    done: !row.running && (row.error != null || row.resultCreados != null),
    error: row.error,
    encontrados: row.resultCreados,
    vacios: row.resultActualizados,
    errores: row.resultEliminados,
  };
}

export async function startCompetenciaSyncInDb(total: number): Promise<void> {
  await prisma.importProgress.upsert({
    where: { id: PROGRESS_ID },
    create: {
      id: PROGRESS_ID,
      running: true,
      processed: 0,
      total,
      updatedAt: new Date(),
    },
    update: {
      running: true,
      processed: 0,
      total,
      resultCreados: null,
      resultActualizados: null,
      resultEliminados: null,
      error: null,
      updatedAt: new Date(),
    },
  });
}

export async function setCompetenciaSyncProgressInDb(processed: number, total: number): Promise<void> {
  await prisma.importProgress.update({
    where: { id: PROGRESS_ID },
    data: { processed, total, updatedAt: new Date() },
  });
}

export async function setCompetenciaSyncResultInDb(result: {
  encontrados: number;
  vacios: number;
  errores: number;
}): Promise<void> {
  await prisma.importProgress.update({
    where: { id: PROGRESS_ID },
    data: {
      running: false,
      resultCreados: result.encontrados,
      resultActualizados: result.vacios,
      resultEliminados: result.errores,
      error: null,
      updatedAt: new Date(),
    },
  });
}

/** Cancelación cooperativa: el worker comprueba `running` entre lotes. */
export async function shouldAbortCompetenciaSyncInDb(): Promise<boolean> {
  const row = await prisma.importProgress.findUnique({ where: { id: PROGRESS_ID } });
  return row != null && !row.running;
}

export async function requestCancelCompetenciaSyncInDb(): Promise<boolean> {
  const row = await prisma.importProgress.findUnique({ where: { id: PROGRESS_ID } });
  if (!row?.running) return false;
  await prisma.importProgress.update({
    where: { id: PROGRESS_ID },
    data: {
      running: false,
      error: "Cancelado por el usuario.",
      updatedAt: new Date(),
    },
  });
  return true;
}

export async function clearCompetenciaSyncRunningStateInDb(): Promise<void> {
  const row = await prisma.importProgress.findUnique({ where: { id: PROGRESS_ID } });
  if (!row) return;
  await prisma.importProgress.update({
    where: { id: PROGRESS_ID },
    data: { running: false, updatedAt: new Date() },
  });
}

export async function setCompetenciaSyncErrorInDb(message: string): Promise<void> {
  await prisma.importProgress.upsert({
    where: { id: PROGRESS_ID },
    update: { running: false, error: message, updatedAt: new Date() },
    create: {
      id: PROGRESS_ID,
      running: false,
      error: message,
      updatedAt: new Date(),
    },
  });
}
