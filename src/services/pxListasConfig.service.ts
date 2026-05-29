import { prisma } from "@/lib/prisma";
import { DET_PRECIO_MANUAL, DET_PRECIO_SUGERIDO } from "@/lib/pxListas";
import { listaPreciosCodTiendaSchema, prismaCuidSchema } from "@/lib/validations/common";
import type { ServiceResult } from "@/types";

export type PxListaConfigPersistida = {
  detPrecioSeleccion: typeof DET_PRECIO_MANUAL | typeof DET_PRECIO_SUGERIDO | string;
  pxListaManual: number | null;
};

export async function obtenerMapPxListaConfig(
  codTiendas: string[]
): Promise<Map<string, PxListaConfigPersistida>> {
  const map = new Map<string, PxListaConfigPersistida>();
  if (codTiendas.length === 0) return map;

  const rows = await prisma.prodPrecioTiendaMarcacion.findMany({
    where: { codTienda: { in: codTiendas } },
    select: {
      codTienda: true,
      detPrecioManual: true,
      competenciaId: true,
      pxListaManual: true,
    },
  });

  for (const row of rows) {
    map.set(row.codTienda, {
      detPrecioSeleccion: row.detPrecioManual
        ? DET_PRECIO_MANUAL
        : (row.competenciaId ?? DET_PRECIO_SUGERIDO),
      pxListaManual: row.pxListaManual != null ? Number(row.pxListaManual) : null,
    });
  }
  return map;
}

export async function guardarPxListaConfig(
  codTienda: string,
  detPrecioSeleccion: string,
  pxListaManual: number | null
): Promise<ServiceResult> {
  const parsedCod = listaPreciosCodTiendaSchema.safeParse(codTienda);
  if (!parsedCod.success) {
    return { success: false, error: "Cód. tienda inválido." };
  }

  const esManual = detPrecioSeleccion === DET_PRECIO_MANUAL;
  const esSugerido = detPrecioSeleccion === DET_PRECIO_SUGERIDO;
  let competenciaId: string | null = null;
  if (!esManual && !esSugerido) {
    const parsedComp = prismaCuidSchema.safeParse(detPrecioSeleccion);
    if (!parsedComp.success) {
      return { success: false, error: "Competidor inválido." };
    }
    const vinculo = await prisma.prodPrecioCompetencia.findUnique({
      where: {
        codTienda_competenciaId: {
          codTienda: parsedCod.data,
          competenciaId: parsedComp.data,
        },
      },
      select: { codTienda: true },
    });
    if (!vinculo) {
      return { success: false, error: "El competidor no está asociado a este ítem." };
    }
    competenciaId = parsedComp.data;
  }

  if (esManual && pxListaManual != null) {
    if (!Number.isFinite(pxListaManual) || pxListaManual < 0) {
      return { success: false, error: "Precio manual inválido." };
    }
  }

  await prisma.prodPrecioTiendaMarcacion.upsert({
    where: { codTienda: parsedCod.data },
    create: {
      codTienda: parsedCod.data,
      detPrecioManual: esManual,
      competenciaId,
      pxListaManual: esManual && pxListaManual != null ? pxListaManual : null,
    },
    update: {
      detPrecioManual: esManual,
      competenciaId,
      ...(esManual ? { pxListaManual: pxListaManual ?? null } : {}),
    },
  });

  return { success: true, data: undefined };
}
