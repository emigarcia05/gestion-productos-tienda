import { Prisma } from "@prisma/client";
import type { ServiceResult } from "@/types";
import { prisma } from "@/lib/prisma";
import {
  incrementarNumeroNotaCredito,
  PROD_PED_ULT_COMP_ID_NOTA_CREDITO,
} from "@/lib/prodPedUltComprobanteIncrement";

const LOG_TAG = "[notaCreditoNumero]";

function logServiceError(scope: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${LOG_TAG}[${scope}]`, msg);
}

const FALTA_FILA =
  "Falta fila id=3 (NOTA_CREDITO) en prod_ped_ult_comp; ejecutá migraciones.";

/**
 * Siguiente número **sin persistir** (para mostrarlo en el modal de NC).
 * El incremento se confirma con {@link reservarSiguienteNumeroNotaCredito}.
 */
export async function obtenerSiguienteNumeroNotaCredito(): Promise<
  ServiceResult<{ numero: string }>
> {
  try {
    const row = await prisma.prodPedUltComp.findUnique({
      where: { id: PROD_PED_ULT_COMP_ID_NOTA_CREDITO },
      select: { ultComprobante: true },
    });
    const cur = row?.ultComprobante?.trim();
    if (!cur) {
      return { success: false, error: FALTA_FILA };
    }
    return { success: true, data: { numero: incrementarNumeroNotaCredito(cur) } };
  } catch (e) {
    logServiceError("obtenerSiguienteNumeroNotaCredito", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/formato no soportado|correlativo máximo/i.test(msg)) {
      return { success: false, error: msg };
    }
    return { success: false, error: "No se pudo leer el correlativo de nota de crédito." };
  }
}

/**
 * Reserva el siguiente `X-00000-########` (SELECT FOR UPDATE + incremento).
 */
export async function reservarSiguienteNumeroNotaCredito(): Promise<
  ServiceResult<{ numero: string }>
> {
  try {
    const next = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ ult_comprobante: string }>>(
        Prisma.sql`
          SELECT "ult_comprobante" FROM "prod_ped_ult_comp"
          WHERE "id" = ${PROD_PED_ULT_COMP_ID_NOTA_CREDITO}
          FOR UPDATE
        `
      );
      const cur = locked[0]?.ult_comprobante?.trim();
      if (!cur) {
        throw new Error(FALTA_FILA);
      }
      const nuevo = incrementarNumeroNotaCredito(cur);
      await tx.prodPedUltComp.update({
        where: { id: PROD_PED_ULT_COMP_ID_NOTA_CREDITO },
        data: { ultComprobante: nuevo },
      });
      return nuevo;
    });
    return { success: true, data: { numero: next } };
  } catch (e) {
    logServiceError("reservarSiguienteNumeroNotaCredito", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/formato no soportado|correlativo máximo|Falta fila/i.test(msg)) {
      return { success: false, error: msg };
    }
    return { success: false, error: "No se pudo asignar el correlativo de nota de crédito." };
  }
}
