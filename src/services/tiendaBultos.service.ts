import type { ServiceResult } from "@/types";
import { prisma } from "@/lib/prisma";

/**
 * Mapa `cod_tienda` → bulto (solo filas con valor). Ausente = vacío en UI.
 */
export async function buildMapBultosProdTienda(
  codTiendas: string[]
): Promise<Map<string, number>> {
  if (codTiendas.length === 0) return new Map();
  const rows = await prisma.prodTiendaBulto.findMany({
    where: { codTienda: { in: codTiendas } },
    select: { codTienda: true, bulto: true },
  });
  return new Map(rows.map((r) => [r.codTienda, r.bulto]));
}

/**
 * Upsert si `bulto` es entero ≥ 1; sin valor se elimina la fila (BULTO vacío).
 */
export async function guardarBultoProdTienda(
  codTienda: string,
  bulto: number | null
): Promise<ServiceResult<{ bulto: number | null }>> {
  const existe = await prisma.prodTienda.findUnique({
    where: { codTienda },
    select: { codTienda: true },
  });
  if (!existe) {
    return { success: false, error: "Ítem de tienda no encontrado." };
  }

  try {
    if (bulto == null) {
      await prisma.prodTiendaBulto.deleteMany({ where: { codTienda } });
      return { success: true, data: { bulto: null } };
    }

    await prisma.prodTiendaBulto.upsert({
      where: { codTienda },
      create: { codTienda, bulto },
      update: { bulto },
    });
    return { success: true, data: { bulto } };
  } catch (e) {
    console.error("[tiendaBultos][guardarBultoProdTienda]", e);
    return { success: false, error: "No se pudo guardar el bulto." };
  }
}
