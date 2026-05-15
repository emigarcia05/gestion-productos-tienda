import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaTx = Prisma.TransactionClient;

/** Marca actividad en la caja (p. ej. caja CHEQUE sin cambio de `monto` persistido). */
export async function touchUltActualizacionCajaTesoreria(
  cajaId: string,
  tx?: PrismaTx
): Promise<void> {
  const client = tx ?? prisma;
  await client.cajaTesoreria.update({
    where: { id: cajaId },
    data: { ultActualizacion: new Date() },
  });
}
