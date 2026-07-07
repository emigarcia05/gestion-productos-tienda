import { Prisma } from "@prisma/client";
import type { FinAnaCosFinaPago, FinAnaCosFinaTerminal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FIN_ANA_COS_FINA_PAGOS,
  FIN_ANA_COS_FINA_TERMINALES,
  ordenPagoFinAnaCosFina,
  ordenTerminalFinAnaCosFina,
} from "@/lib/finAnaCosFina";
import type { ActualizarFinAnaCosFinaInput } from "@/lib/validations/finAnaCosFina";

export type FinAnaCosFinaItem = {
  id: string;
  habilitado: boolean;
  terminal: FinAnaCosFinaTerminal;
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
  terminal: FinAnaCosFinaTerminal;
  pago: FinAnaCosFinaPago;
  diasAcreditacion: number | null;
  arancel: Prisma.Decimal;
  costoFinanciero: Prisma.Decimal;
}): FinAnaCosFinaItem {
  return {
    id: row.id,
    habilitado: row.habilitado,
    terminal: row.terminal,
    pago: row.pago,
    diasAcreditacion: row.diasAcreditacion,
    arancel: decimalToNumber(row.arancel),
    costoFinanciero: decimalToNumber(row.costoFinanciero),
  };
}

function sortItems(items: FinAnaCosFinaItem[]): FinAnaCosFinaItem[] {
  return [...items].sort((a, b) => {
    const byTerminal = ordenTerminalFinAnaCosFina(a.terminal) - ordenTerminalFinAnaCosFina(b.terminal);
    if (byTerminal !== 0) return byTerminal;
    return ordenPagoFinAnaCosFina(a.pago) - ordenPagoFinAnaCosFina(b.pago);
  });
}

/** Asegura la matriz terminal × pago (idempotente; útil si la migración no corrió en un entorno). */
export async function ensureFinAnaCosFinaSeed(): Promise<void> {
  const existentes = await prisma.finAnaCosFina.findMany({
    select: { terminal: true, pago: true },
  });
  const claves = new Set(existentes.map((row) => `${row.terminal}:${row.pago}`));
  const faltantes: { terminal: FinAnaCosFinaTerminal; pago: FinAnaCosFinaPago }[] = [];

  for (const terminal of FIN_ANA_COS_FINA_TERMINALES) {
    for (const pago of FIN_ANA_COS_FINA_PAGOS) {
      if (!claves.has(`${terminal}:${pago}`)) {
        faltantes.push({ terminal, pago });
      }
    }
  }

  if (faltantes.length === 0) return;

  await prisma.finAnaCosFina.createMany({
    data: faltantes.map((row) => ({
      terminal: row.terminal,
      pago: row.pago,
      habilitado: true,
      arancel: new Prisma.Decimal(0),
      costoFinanciero: new Prisma.Decimal(0),
    })),
    skipDuplicates: true,
  });
}

export async function listarFinAnaCosFina(): Promise<FinAnaCosFinaItem[]> {
  await ensureFinAnaCosFinaSeed();
  const rows = await prisma.finAnaCosFina.findMany();
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
  if (campos.diasAcreditacion !== undefined) {
    data.diasAcreditacion = campos.diasAcreditacion;
  }
  if (campos.costoFinanciero !== undefined) {
    data.costoFinanciero = new Prisma.Decimal(campos.costoFinanciero);
  }

  const updated = await prisma.finAnaCosFina.update({
    where: { id },
    data,
  });

  return mapRow(updated);
}
