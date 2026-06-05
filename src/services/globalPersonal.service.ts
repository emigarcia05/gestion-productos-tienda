import { prisma } from "@/lib/prisma";

export interface GlobalPersonalItem {
  idPersonal: number;
  nombrePersonal: string;
}

/** Lista el catálogo `global_personal` ordenado por nombre (para selector en recepción DUX). */
export async function listGlobalPersonal(): Promise<GlobalPersonalItem[]> {
  const rows = await prisma.globalPersonal.findMany({
    orderBy: { nombrePersonal: "asc" },
    select: {
      idPersonal: true,
      nombrePersonal: true,
    },
  });
  return rows;
}
