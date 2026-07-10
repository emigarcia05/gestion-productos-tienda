import { prisma } from "@/lib/prisma";
import {
  crearDescuentoPctPorFormaPagoVacios,
  FIN_ANA_MC_DESCUENTO_MAX,
  FIN_ANA_MC_DESCUENTO_MIN,
  idsFormasPagoMargenContribucion,
  type FormaPagoMargenContribucion,
} from "@/lib/finAnaMargenContribucion";
import type { ActualizarDescuentoFpMargenContribucionInput } from "@/lib/validations/finAnaMcDescuentoFp";
import {
  ensureFinAnaCosFinaPagosSeed,
  listarFinAnaCosFinaPagos,
} from "@/services/finAnaCosFinaPago.service";
import { filtrarPagosMargenContribucion } from "@/lib/finAnaCosFinaPagos";
import type { ServiceResult } from "@/types";

export type DescuentoFpMargenContribucionMap = Record<
  FormaPagoMargenContribucion,
  number
>;

function clampDescuentoPct(n: number): number {
  return Math.min(
    FIN_ANA_MC_DESCUENTO_MAX,
    Math.max(FIN_ANA_MC_DESCUENTO_MIN, Math.round(n))
  );
}

/** Semilla idempotente: una fila por forma de pago del simulador. */
export async function ensureFinAnaMcDescuentoFpSeed(): Promise<void> {
  await ensureFinAnaCosFinaPagosSeed();
  const pagosMargen = filtrarPagosMargenContribucion(await listarFinAnaCosFinaPagos());

  const existentes = await prisma.finAnaMcDescuentoFp.findMany({
    select: { pagoId: true },
  });
  const set = new Set(existentes.map((row) => row.pagoId));
  const faltantes = pagosMargen.filter((pago) => !set.has(pago.id));
  if (faltantes.length === 0) return;

  await prisma.finAnaMcDescuentoFp.createMany({
    data: faltantes.map((pago) => ({
      pagoId: pago.id,
      descuentoPct: 0,
    })),
    skipDuplicates: true,
  });
}

export async function listarDescuentosFpMargenContribucion(): Promise<DescuentoFpMargenContribucionMap> {
  await ensureFinAnaMcDescuentoFpSeed();
  const pagos = await listarFinAnaCosFinaPagos();
  const idsMargen = new Set(idsFormasPagoMargenContribucion(pagos));

  const rows = await prisma.finAnaMcDescuentoFp.findMany({
    select: { pagoId: true, descuentoPct: true },
  });

  const map = crearDescuentoPctPorFormaPagoVacios([...idsMargen]);
  for (const row of rows) {
    if (idsMargen.has(row.pagoId)) {
      map[row.pagoId] = clampDescuentoPct(row.descuentoPct);
    }
  }
  return map;
}

export async function actualizarDescuentoFpMargenContribucion(
  input: ActualizarDescuentoFpMargenContribucionInput
): Promise<ServiceResult<DescuentoFpMargenContribucionMap>> {
  try {
    await ensureFinAnaMcDescuentoFpSeed();
    const descuentoPct = clampDescuentoPct(input.descuentoPct);

    await prisma.finAnaMcDescuentoFp.upsert({
      where: { pagoId: input.pagoId },
      create: {
        pagoId: input.pagoId,
        descuentoPct,
      },
      update: { descuentoPct },
    });

    const map = await listarDescuentosFpMargenContribucion();
    return { success: true, data: map };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Error al guardar descuento por forma de pago.";
    return { success: false, error: msg };
  }
}
