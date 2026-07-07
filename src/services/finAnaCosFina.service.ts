import { Prisma } from "@prisma/client";
import type { FinAnaCosFinaPago } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FIN_ANA_COS_FINA_PAGOS, ordenPagoFinAnaCosFina } from "@/lib/finAnaCosFina";
import type { ActualizarFinAnaCosFinaInput } from "@/lib/validations/finAnaCosFina";
import {
  ensureFinAnaCosFinaTerminalesSeed,
  listarFinAnaCosFinaTerminales,
} from "@/services/finAnaCosFinaTerminal.service";

export type FinAnaCosFinaItem = {
  id: string;
  habilitado: boolean;
  impCheque: boolean;
  terminalId: string;
  terminalNombre: string;
  terminalOrden: number;
  pago: FinAnaCosFinaPago;
  diasAcreditacion: number | null;
  arancel: number;
  costoFinanciero: number;
};

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function mapRow(row: {
  id: string;
  habilitado: boolean;
  impCheque: boolean;
  terminalId: string;
  pago: FinAnaCosFinaPago;
  diasAcreditacion: number | null;
  arancel: Prisma.Decimal;
  costoFinanciero: Prisma.Decimal;
  terminal: { nombre: string; orden: number };
}): FinAnaCosFinaItem {
  return {
    id: row.id,
    habilitado: row.habilitado,
    impCheque: row.impCheque,
    terminalId: row.terminalId,
    terminalNombre: row.terminal.nombre.toUpperCase(),
    terminalOrden: row.terminal.orden,
    pago: row.pago,
    diasAcreditacion: row.diasAcreditacion,
    arancel: decimalToNumber(row.arancel),
    costoFinanciero: decimalToNumber(row.costoFinanciero),
  };
}

function sortItems(items: FinAnaCosFinaItem[]): FinAnaCosFinaItem[] {
  return [...items].sort((a, b) => {
    const byTerminal = a.terminalOrden - b.terminalOrden;
    if (byTerminal !== 0) return byTerminal;
    return ordenPagoFinAnaCosFina(a.pago) - ordenPagoFinAnaCosFina(b.pago);
  });
}

/** Asegura la matriz terminal × pago (idempotente; útil si la migración no corrió en un entorno). */
export async function ensureFinAnaCosFinaSeed(): Promise<void> {
  await ensureFinAnaCosFinaTerminalesSeed();
  const terminales = await listarFinAnaCosFinaTerminales();

  const existentes = await prisma.finAnaCosFina.findMany({
    select: { terminalId: true, pago: true },
  });
  const claves = new Set(existentes.map((row) => `${row.terminalId}:${row.pago}`));
  const faltantes: { terminalId: string; pago: FinAnaCosFinaPago }[] = [];

  for (const terminal of terminales) {
    for (const pago of FIN_ANA_COS_FINA_PAGOS) {
      if (!claves.has(`${terminal.id}:${pago}`)) {
        faltantes.push({ terminalId: terminal.id, pago });
      }
    }
  }

  if (faltantes.length === 0) return;

  await prisma.finAnaCosFina.createMany({
    data: faltantes.map((row) => ({
      terminalId: row.terminalId,
      pago: row.pago,
      habilitado: true,
      impCheque: false,
      arancel: new Prisma.Decimal(0),
      costoFinanciero: new Prisma.Decimal(0),
    })),
    skipDuplicates: true,
  });
}

export async function listarFinAnaCosFina(): Promise<FinAnaCosFinaItem[]> {
  await ensureFinAnaCosFinaSeed();
  const rows = await prisma.finAnaCosFina.findMany({
    include: {
      terminal: { select: { nombre: true, orden: true } },
    },
  });
  return sortItems(rows.map(mapRow));
}

export async function actualizarFinAnaCosFina(
  input: ActualizarFinAnaCosFinaInput
): Promise<FinAnaCosFinaItem> {
  const { id, campos } = input;
  const data: Prisma.FinAnaCosFinaUpdateInput = {};

  if (campos.habilitado !== undefined) {
    data.habilitado = campos.habilitado;
  }
  if (campos.impCheque !== undefined) {
    data.impCheque = campos.impCheque;
  }
  if (campos.diasAcreditacion !== undefined) {
    data.diasAcreditacion = campos.diasAcreditacion;
  }
  if (campos.arancel !== undefined) {
    data.arancel = new Prisma.Decimal(campos.arancel);
  }
  if (campos.costoFinanciero !== undefined) {
    data.costoFinanciero = new Prisma.Decimal(campos.costoFinanciero);
  }

  const updated = await prisma.finAnaCosFina.update({
    where: { id },
    data,
    include: {
      terminal: { select: { nombre: true, orden: true } },
    },
  });

  return mapRow(updated);
}
