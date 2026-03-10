/**
 * Progreso de exportación "Exportar Px. Dux" en BD (tabla import_progress, id distinto).
 * Permite que el polling desde la sidebar funcione en serverless.
 */

import { prisma } from "@/lib/prisma";

const EXPORT_PROGRESS_ID = "exportar-precios-dux";

export interface ExportProgressState {
  running: boolean;
  processed: number;
  total: number;
  done: boolean;
  error: string | null;
  enviados: number | null;
}

export async function getExportProgressFromDb(): Promise<ExportProgressState> {
  const row = await prisma.importProgress.findUnique({
    where: { id: EXPORT_PROGRESS_ID },
  });
  if (!row) {
    return {
      running: false,
      processed: 0,
      total: 0,
      done: false,
      error: null,
      enviados: null,
    };
  }
  const enviados = row.resultCreados ?? null;
  const done = !row.running && (row.error != null || enviados != null);
  return {
    running: row.running,
    processed: row.processed,
    total: row.total,
    done,
    error: row.error,
    enviados,
  };
}

export async function startExportInDb(total: number): Promise<void> {
  await prisma.importProgress.upsert({
    where: { id: EXPORT_PROGRESS_ID },
    create: {
      id: EXPORT_PROGRESS_ID,
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
      resultErrores: null,
      error: null,
      updatedAt: new Date(),
    },
  });
}

export async function setExportProgressInDb(processed: number, total: number): Promise<void> {
  await prisma.importProgress.update({
    where: { id: EXPORT_PROGRESS_ID },
    data: { processed, total, updatedAt: new Date() },
  });
}

export async function setExportResultInDb(enviados: number): Promise<void> {
  await prisma.importProgress.update({
    where: { id: EXPORT_PROGRESS_ID },
    data: {
      running: false,
      resultCreados: enviados,
      resultActualizados: null,
      resultEliminados: null,
      resultErrores: null,
      error: null,
      updatedAt: new Date(),
    },
  });
}

export async function setExportErrorInDb(message: string): Promise<void> {
  await prisma.importProgress.upsert({
    where: { id: EXPORT_PROGRESS_ID },
    update: { running: false, error: message, updatedAt: new Date() },
    create: {
      id: EXPORT_PROGRESS_ID,
      running: false,
      error: message,
      updatedAt: new Date(),
    },
  });
}
