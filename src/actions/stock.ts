"use server";

import { prisma } from "@/lib/prisma";

/**
 * Registra la fecha/hora actual como ultimaImpresion
 * para todos los ids recibidos.
 */
export async function registrarImpresion(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await prisma.itemTienda.updateMany({
    where: { id: { in: ids } },
    data:  { ultimaImpresion: new Date() },
  });
}
