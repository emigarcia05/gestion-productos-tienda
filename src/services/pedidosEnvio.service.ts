/**
 * Servicio pedidos_envio: sincroniza ítems de Pedido Urgente a la tabla de envío.
 * El servidor construye las filas a partir de ids de ListaPrecioProveedor + cantidades (opción B).
 */

import { prisma } from "@/lib/prisma";

const TIPO_URGENTE = "URGENTE";

export type SucursalPedidoEnvio = "guaymallen" | "maipu";

export interface ItemPedidoUrgentePayload {
  id: string;
  cant: number;
}

/**
 * Reemplaza todos los ítems de tipo URGENTE para la sucursal dada por el conjunto
 * (id lista precio, cantidad). Carga datos desde precios_proveedores + precios_tienda
 * y escribe en pedidos_envio.
 */
export async function syncPedidoUrgenteEnvio(
  sucursal: SucursalPedidoEnvio,
  items: ItemPedidoUrgentePayload[]
): Promise<{ creados: number; error?: string }> {
  const withCant = items.filter((i) => i.cant > 0);
  const ids = [...new Set(withCant.map((i) => i.id))];
  const cantById = new Map(withCant.map((i) => [i.id, i.cant]));

  let creados = 0;

  await prisma.$transaction(async (tx) => {
    await tx.itemPedidoEnvio.deleteMany({
      where: { sucursalCodigo: sucursal, tipoPedido: TIPO_URGENTE },
    });

    if (ids.length === 0) {
      return;
    }

    const filas = await tx.listaPrecioProveedor.findMany({
      where: { id: { in: ids } },
      include: {
        proveedor: { select: { id: true } },
        listaPrecioTienda: { select: { codTienda: true, descripcionTienda: true } },
      },
    });

    const toCreate = filas
      .map((f) => {
        const cant = cantById.get(f.id) ?? 0;
        if (cant <= 0) return null;
        return {
          idProveedor: f.idProveedor,
          tipoPedido: TIPO_URGENTE,
          sucursalCodigo: sucursal,
          codExt: f.codExt,
          codProveedor: f.codProdProveedor,
          codTienda: f.listaPrecioTienda?.codTienda ?? null,
          descripcionProveedor: f.descripcionProveedor,
          descripcionTienda: f.listaPrecioTienda?.descripcionTienda?.trim() || null,
          cantPedir: cant,
        };
      })
      .filter(Boolean) as Array<{
      idProveedor: string;
      tipoPedido: string;
      sucursalCodigo: string;
      codExt: string;
      codProveedor: string;
      codTienda: string | null;
      descripcionProveedor: string;
      descripcionTienda: string | null;
      cantPedir: number;
    }>;

    creados = toCreate.length;
    if (toCreate.length > 0) {
      await tx.itemPedidoEnvio.createMany({ data: toCreate });
    }
  });

  return { creados };
}

/** Ítem para PDF de envío (descripción y cantidad). */
export interface ItemPedidoParaPdf {
  codExt: string;
  codProveedor: string;
  descripcion: string;
  cantPedir: number;
}

/** Proveedor con datos para envío por WhatsApp. */
export interface ProveedorParaEnvio {
  id: string;
  nombre: string;
  prefijo: string;
  whatsapp: string | null;
}

/**
 * Obtiene ítems de pedidos_envio para el proveedor, sucursal y tipos dados,
 * y los datos del proveedor (para PDF y WhatsApp).
 */
export async function getItemsYProveedorParaEnviar(
  proveedorId: string,
  sucursal: string,
  tipos: string[]
): Promise<{ items: ItemPedidoParaPdf[]; proveedor: ProveedorParaEnvio | null }> {
  if (!proveedorId.trim() || !sucursal.trim() || tipos.length === 0) {
    return { items: [], proveedor: null };
  }

  const [items, proveedor] = await Promise.all([
    prisma.itemPedidoEnvio.findMany({
      where: {
        idProveedor: proveedorId,
        sucursalCodigo: sucursal,
        tipoPedido: { in: tipos },
        cantPedir: { gt: 0 },
      },
      orderBy: [{ codExt: "asc" }],
      select: {
        codExt: true,
        codProveedor: true,
        descripcionProveedor: true,
        descripcionTienda: true,
        cantPedir: true,
      },
    }),
    prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { id: true, nombre: true, prefijo: true, whatsapp: true },
    }),
  ]);

  const itemsPdf: ItemPedidoParaPdf[] = items.map((i) => ({
    codExt: i.codExt,
    codProveedor: i.codProveedor,
    descripcion: (i.descripcionTienda ?? i.descripcionProveedor) || "",
    cantPedir: i.cantPedir,
  }));

  const prov: ProveedorParaEnvio | null = proveedor
    ? {
        id: proveedor.id,
        nombre: proveedor.nombre,
        prefijo: proveedor.prefijo,
        whatsapp: proveedor.whatsapp ?? null,
      }
    : null;

  return { items: itemsPdf, proveedor: prov };
}
