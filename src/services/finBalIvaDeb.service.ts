import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  filaPerteneceMesAnio,
  parsearCsvIvaDebitoAfip,
  type FilaCsvIvaDebParseada,
} from "@/lib/finBalIvaDebCsv";
import type { ServiceResult } from "@/types";

export interface ImportarIvaDebCsvResultado {
  insertados: number;
  actualizados: number;
  ignoradasOtroMes: number;
  ignoradasInvalidas: number;
}

/** Línea de detalle IVA débito · importadas desde CSV (`fin_bal_iva_deb_import_line`). */
export interface DetalleLineaIvaDebitoBalance {
  id: string;
  fechaEmisionIso: string;
  denominacionReceptor: string;
  impTotal: number;
}

function isoYmdUtcDesdeDbDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Comprobantes importados cuya `fecha_emision` cae en el mes calendario indicado. */
export async function listarDetalleIvaDebitoMes(params: {
  mes: number;
  anio: number;
}): Promise<DetalleLineaIvaDebitoBalance[]> {
  const { mes, anio } = params;
  const rows = await prisma.finBalIvaDebImportLine.findMany({
    where: {
      fechaEmision: {
        gte: new Date(Date.UTC(anio, mes - 1, 1)),
        lt: new Date(Date.UTC(anio, mes, 1)),
      },
    },
    orderBy: [{ fechaEmision: "asc" }, { id: "asc" }],
    select: {
      id: true,
      fechaEmision: true,
      denominacionReceptor: true,
      impTotal: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    fechaEmisionIso: isoYmdUtcDesdeDbDate(r.fechaEmision),
    denominacionReceptor: r.denominacionReceptor,
    impTotal: Number(r.impTotal),
  }));
}

/** Suma bruta `imp_total` por mes calendario del año (índice 0 = enero). */
export async function listarMontosBrutosFinBalIvaDebPorAnio(anio: number): Promise<number[]> {
  const out = Array.from({ length: 12 }, () => 0);
  const rows = await prisma.finBalIvaDebImportLine.findMany({
    where: {
      fechaEmision: {
        gte: new Date(Date.UTC(anio, 0, 1)),
        lt: new Date(Date.UTC(anio + 1, 0, 1)),
      },
    },
    select: { fechaEmision: true, impTotal: true },
  });
  for (const r of rows) {
    const y = r.fechaEmision.getUTCFullYear();
    const mes = r.fechaEmision.getUTCMonth() + 1;
    if (y !== anio || mes < 1 || mes > 12) continue;
    out[mes - 1] += Number(r.impTotal);
  }
  return out;
}

async function upsertLinea(
  tx: Prisma.TransactionClient,
  f: FilaCsvIvaDebParseada,
): Promise<"insert" | "update"> {
  const existing = await tx.finBalIvaDebImportLine.findUnique({
    where: { dedupeKey: f.dedupeKey },
    select: { id: true },
  });
  await tx.finBalIvaDebImportLine.upsert({
    where: { dedupeKey: f.dedupeKey },
    create: {
      dedupeKey: f.dedupeKey,
      fechaEmision: f.fechaEmision,
      denominacionReceptor: f.denominacionReceptor,
      impTotal: f.impTotal,
    },
    update: {
      fechaEmision: f.fechaEmision,
      denominacionReceptor: f.denominacionReceptor,
      impTotal: f.impTotal,
    },
  });
  return existing ? "update" : "insert";
}

/**
 * Importa filas del CSV; solo persiste comprobantes cuya fecha cae en `mes`/`anio`
 * (coincide con la fila de la tabla desde la que se abrió el modal).
 */
export async function importarCsvIvaDebitoMes(params: {
  textoCsv: string;
  mes: number;
  anio: number;
}): Promise<ServiceResult<ImportarIvaDebCsvResultado>> {
  const { textoCsv, mes, anio } = params;
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
    return { success: false, error: "Período inválido." };
  }

  const parsed = parsearCsvIvaDebitoAfip(textoCsv);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const delMes = parsed.filas.filter((f) => filaPerteneceMesAnio(f.fechaEmision, mes, anio));
  const ignoradasOtroMes = parsed.filas.length - delMes.length;

  if (delMes.length === 0) {
    return {
      success: false,
      error:
        ignoradasOtroMes > 0
          ? `Ninguna fila pertenece a ${mes}/${anio}. Hay ${ignoradasOtroMes} línea(s) de otros meses.`
          : "No hay filas para importar.",
    };
  }

  let insertados = 0;
  let actualizados = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const f of delMes) {
        const r = await upsertLinea(tx, f);
        if (r === "insert") insertados++;
        else actualizados++;
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo guardar el CSV.";
    return { success: false, error: msg };
  }

  return {
    success: true,
    data: {
      insertados,
      actualizados,
      ignoradasOtroMes,
      ignoradasInvalidas: parsed.erroresFila,
    },
  };
}
