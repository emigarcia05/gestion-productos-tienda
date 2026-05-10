import { prisma } from "@/lib/prisma";
import type { UpsertFinBalIvaDebInput } from "@/lib/validations/finBalIvaDeb";
import type { ServiceResult } from "@/types";

export interface FinBalIvaDebItem {
  id: string;
  anio: number;
  mes: number;
  monto: number;
}

/** Montos brutos `fin_bal_iva_deb.monto` por mes (índice 0 = enero). Sin fila → 0. */
export async function listarMontosBrutosFinBalIvaDebPorAnio(anio: number): Promise<number[]> {
  const out = Array.from({ length: 12 }, () => 0);
  const rows = await prisma.finBalIvaDeb.findMany({
    where: { anio },
    select: { mes: true, monto: true },
  });
  for (const r of rows) {
    if (r.mes >= 1 && r.mes <= 12) out[r.mes - 1] = r.monto;
  }
  return out;
}

export async function upsertFinBalIvaDeb(
  input: UpsertFinBalIvaDebInput,
): Promise<ServiceResult<FinBalIvaDebItem>> {
  try {
    const row = await prisma.finBalIvaDeb.upsert({
      where: {
        anio_mes: { anio: input.anio, mes: input.mes },
      },
      create: {
        anio: input.anio,
        mes: input.mes,
        monto: input.monto,
      },
      update: { monto: input.monto },
    });
    return {
      success: true,
      data: {
        id: row.id,
        anio: row.anio,
        mes: row.mes,
        monto: row.monto,
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo guardar el total de ventas con IVA.";
    return { success: false, error: msg };
  }
}
