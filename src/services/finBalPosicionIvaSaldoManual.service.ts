import { prisma } from "@/lib/prisma";

/** Índice 0 = enero; `null` = sin saldo manual (usa cálculo automático). */
export async function listarSaldoManualPosicionIvaPorAnio(anio: number): Promise<(number | null)[]> {
  const out: (number | null)[] = Array.from({ length: 12 }, () => null);
  const rows = await prisma.finBalPosicionIvaSaldoManual.findMany({
    where: { anio },
    select: { mes: true, saldoPesos: true },
  });
  for (const r of rows) {
    if (r.mes < 1 || r.mes > 12) continue;
    out[r.mes - 1] = Math.round(Number(r.saldoPesos));
  }
  return out;
}

export async function upsertSaldoManualPosicionIva(params: {
  anio: number;
  mes: number;
  saldoPesos: number;
}): Promise<void> {
  const { anio, mes, saldoPesos } = params;
  await prisma.finBalPosicionIvaSaldoManual.upsert({
    where: {
      anio_mes: { anio, mes },
    },
    create: {
      anio,
      mes,
      saldoPesos,
    },
    update: {
      saldoPesos,
    },
  });
}

export async function eliminarSaldoManualPosicionIva(params: { anio: number; mes: number }): Promise<void> {
  await prisma.finBalPosicionIvaSaldoManual.deleteMany({
    where: { anio: params.anio, mes: params.mes },
  });
}
