/**
 * Servicio pedidos_mercaderia: sincroniza ítems de Pedido Urgente.
 * El servidor construye las filas a partir de ids de ListaPrecioProveedor + cantidades (opción B).
 */

import { prisma } from "@/lib/prisma";

const TIPO_URGENTE = "URGENTE";

export type SucursalPedidoEnvio = "guaymallen" | "maipu";

export interface ItemPedidoUrgentePayload {
  id: string;
  cant: number;
}

export async function upsertPedidoMercaderiaUrgenteItem(params: {
  sucursal: SucursalPedidoEnvio;
  listaPrecioProveedorId: string;
  cant: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sucursal, listaPrecioProveedorId, cant } = params;
  const cantNorm = Math.max(0, Math.floor(Number(cant) || 0));

  try {
    const item = await prisma.listaPrecioProveedor.findUnique({
      where: { id: listaPrecioProveedorId },
      select: {
        idProveedor: true,
        codExt: true,
        codProdProveedor: true,
        descripcionProveedor: true,
      },
    });

    if (!item) return { ok: false, error: "Producto no encontrado." };

    const tienda = await prisma.listaPrecioTienda.findUnique({
      where: { codExt: item.codExt },
      select: { codTienda: true, descripcionTienda: true },
    });

    if (cantNorm <= 0) {
      await prisma.itemPedidoEnvio.deleteMany({
        where: {
          idProveedor: item.idProveedor,
          tipoPedido: TIPO_URGENTE,
          sucursalCodigo: sucursal,
          codExt: item.codExt,
        },
      });
      return { ok: true };
    }

    await prisma.itemPedidoEnvio.upsert({
      where: {
        idProveedor_tipoPedido_sucursalCodigo_codExt: {
          idProveedor: item.idProveedor,
          tipoPedido: TIPO_URGENTE,
          sucursalCodigo: sucursal,
          codExt: item.codExt,
        },
      },
      create: {
        idProveedor: item.idProveedor,
        tipoPedido: TIPO_URGENTE,
        sucursalCodigo: sucursal,
        codExt: item.codExt,
        codProveedor: item.codProdProveedor,
        codTienda: tienda?.codTienda ?? null,
        descripcionProveedor: item.descripcionProveedor,
        descripcionTienda: tienda?.descripcionTienda?.trim() || null,
        cantPedir: cantNorm,
        cantPedirUrgente: cantNorm,
      },
      update: {
        codProveedor: item.codProdProveedor,
        codTienda: tienda?.codTienda ?? null,
        descripcionProveedor: item.descripcionProveedor,
        descripcionTienda: tienda?.descripcionTienda?.trim() || null,
        cantPedir: cantNorm,
        cantPedirUrgente: cantNorm,
      },
    });

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al guardar el ítem.";
    return { ok: false, error: message };
  }
}

/**
 * Reemplaza todos los ítems de tipo URGENTE para la sucursal dada por el conjunto
 * (id lista precio, cantidad). Carga datos desde precios_proveedores + precios_tienda
 * y escribe en pedidos_mercaderia.
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
          cantPedirUrgente: cant,
          // Compatibilidad: el flujo de "Enviar Pedido" hoy usa cant_pedir.
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
      cantPedirUrgente: number;
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
