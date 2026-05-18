import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { FilaCsvIvaDebParseada } from "@/lib/finBalIvaDebCsv";
import { filasTxtConDedupeKey, parsearTxtIvaDebitoAfip } from "@/lib/finBalIvaDebTxt";
import { revalidatePedidoUrgenteTrasCambioIvaSaldo } from "@/lib/revalidatePedidoUrgenteTrasCambioIvaSaldo";
import type { ServiceResult } from "@/types";

export interface ImportarIvaDebTxtResultado {
  insertados: number;
  actualizados: number;
  totalBruto: number;
  totalIva: number;
  ignoradasInvalidas: number;
}

/** Línea de detalle IVA débito · importadas desde TXT (`fin_bal_iva_deb_import`). */
export interface DetalleLineaIvaDebitoBalance {
  id: string;
  fechaEmisionIso: string;
  denominacionReceptor: string;
  impTotal: number;
  impIva: number;
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
      impIva: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    fechaEmisionIso: isoYmdUtcDesdeDbDate(r.fechaEmision),
    denominacionReceptor: r.denominacionReceptor,
    impTotal: Number(r.impTotal),
    impIva: Number(r.impIva),
  }));
}

/** Suma `imp_iva` por mes calendario del año (índice 0 = enero). */
export async function listarIvaDebitoFinBalPorAnio(anio: number): Promise<number[]> {
  const out = Array.from({ length: 12 }, () => 0);
  const rows = await prisma.finBalIvaDebImportLine.findMany({
    where: {
      fechaEmision: {
        gte: new Date(Date.UTC(anio, 0, 1)),
        lt: new Date(Date.UTC(anio + 1, 0, 1)),
      },
    },
    select: { fechaEmision: true, impIva: true },
  });
  for (const r of rows) {
    const y = r.fechaEmision.getUTCFullYear();
    const mes = r.fechaEmision.getUTCMonth() + 1;
    if (y !== anio || mes < 1 || mes > 12) continue;
    out[mes - 1] += Number(r.impIva);
  }
  return out;
}

/** @deprecated Usar `listarIvaDebitoFinBalPorAnio`. */
export const listarMontosBrutosFinBalIvaDebPorAnio = listarIvaDebitoFinBalPorAnio;

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
      impIva: f.impIva,
    },
    update: {
      fechaEmision: f.fechaEmision,
      denominacionReceptor: f.denominacionReceptor,
      impTotal: f.impTotal,
      impIva: f.impIva,
    },
  });
  return existing ? "update" : "insert";
}

/**
 * Importa TXT de alícuotas (62 caracteres). Persiste `imp_iva` del archivo (sin cálculo).
 */
export async function importarTxtIvaDebitoMes(params: {
  textoTxt: string;
  mes: number;
  anio: number;
}): Promise<ServiceResult<ImportarIvaDebTxtResultado>> {
  const { textoTxt, mes, anio } = params;
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
    return { success: false, error: "Período inválido." };
  }

  const parsed = parsearTxtIvaDebitoAfip(textoTxt, { mes, anio });
  if (!parsed.ok) return { success: false, error: parsed.error };

  const filas = filasTxtConDedupeKey(parsed.filas, (payload) =>
    createHash("sha256").update(payload, "utf8").digest("hex"),
  );

  let insertados = 0;
  let actualizados = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const f of filas) {
        const r = await upsertLinea(tx, f);
        if (r === "insert") insertados++;
        else actualizados++;
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo guardar el TXT.";
    return { success: false, error: msg };
  }

  revalidatePedidoUrgenteTrasCambioIvaSaldo();

  return {
    success: true,
    data: {
      insertados,
      actualizados,
      totalBruto: parsed.totalBruto,
      totalIva: parsed.totalIva,
      ignoradasInvalidas: parsed.erroresFila,
    },
  };
}

/** @deprecated Usar `importarTxtIvaDebitoMes`. */
export const importarCsvIvaDebitoMes = importarTxtIvaDebitoMes;

export type ImportarIvaDebCsvResultado = ImportarIvaDebTxtResultado;
