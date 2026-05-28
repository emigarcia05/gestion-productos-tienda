/**
 * Marca de "Producto TiendaColor" (producto propio) en `prod_precios_tienda.es_producto_propio`.
 * Si está en `true`, el ítem no se vincula con `prod_precios_provee` y se excluye del filtro VINCULADO=NO
 * en Cx Compra (/gestion-productos/tienda/comp-proveedores). Marcar como propio exige cero vínculos vigentes
 * (rechazo explícito; la desvinculación se hace manualmente desde el modal Vínculos Con Proveedores).
 */
import type { ServiceResult } from "@/types";
import { prisma } from "@/lib/prisma";
import { listaPreciosCodTiendaSchema } from "@/lib/validations/common";

export async function setProductoPropioTienda(
  codTienda: string,
  esPropio: boolean
): Promise<ServiceResult<{ codTienda: string; esProductoPropio: boolean }>> {
  const parsedCod = listaPreciosCodTiendaSchema.safeParse(codTienda);
  if (!parsedCod.success) {
    return { success: false, error: "Cód. tienda inválido." };
  }
  try {
    const tienda = await prisma.listaPrecioTienda.findUnique({
      where: { codTienda: parsedCod.data },
      select: { codTienda: true, esProductoPropio: true },
    });
    if (!tienda) {
      return { success: false, error: "Ítem tienda no encontrado." };
    }

    if (esPropio) {
      const vinculos = await prisma.listaPrecioProveedor.count({
        where: { codTiendaVinculo: parsedCod.data },
      });
      if (vinculos > 0) {
        return {
          success: false,
          error: `El ítem tiene ${vinculos} vínculo(s) con proveedor. Desvinculalos antes de marcarlo como Producto TiendaColor.`,
        };
      }
    }

    await prisma.listaPrecioTienda.update({
      where: { codTienda: parsedCod.data },
      data: { esProductoPropio: esPropio },
    });
    return {
      success: true,
      data: { codTienda: parsedCod.data, esProductoPropio: esPropio },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
