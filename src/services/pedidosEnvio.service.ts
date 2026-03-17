/**
 * Servicio pedidos_mercaderia: sincroniza ítems de Pedido Urgente.
 * El servidor construye las filas a partir de ids de ListaPrecioProveedor + cantidades (opción B).
 */

import { prisma } from "@/lib/prisma";

const TIPO_URGENTE = "URGENTE";
const TIPO_REPOSICION = "REPOSICION";

export type SucursalPedidoEnvio = "guaymallen" | "maipu";

export interface ItemPedidoUrgentePayload {
  id: string;
  cant: number;
}

export async function upsertPedidoMercaderiaReposicionConfig(params: {
  sucursal: SucursalPedidoEnvio;
  idProveedor: string;
  codExt: string;
  formaPedir: "CANT_MAXIMA" | "CANT_FIJA";
  puntoReposicion: number;
  cantConf: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sucursal, idProveedor, codExt, formaPedir, puntoReposicion, cantConf } = params;

  const punto = Math.max(0, Math.floor(Number(puntoReposicion) || 0));
  const cant = Math.max(0, Math.floor(Number(cantConf) || 0));
  if (!idProveedor.trim()) return { ok: false, error: "Proveedor requerido." };
  if (!codExt.trim()) return { ok: false, error: "Código requerido." };
  if (!formaPedir) return { ok: false, error: "Seleccioná Forma Pedir." };
  if (punto <= 0) return { ok: false, error: "Punto reposición inválido." };
  if (cant <= 0) return { ok: false, error: "Cant. reposición inválida." };

  try {
    const provRow = await prisma.listaPrecioProveedor.findFirst({
      where: { idProveedor: idProveedor.trim(), codExt: codExt.trim() },
      select: {
        codProdProveedor: true,
        descripcionProveedor: true,
      },
    });
    if (!provRow) return { ok: false, error: "No se encontró el ítem en precios_proveedores." };

    const tienda = await prisma.listaPrecioTienda.findUnique({
      where: { codExt: codExt.trim() },
      select: {
        codTienda: true,
        descripcionTienda: true,
        stockMaipu: true,
        stockGuaymallen: true,
      },
    });

    const stock =
      sucursal === "maipu"
        ? Number(tienda?.stockMaipu ?? 0)
        : Number(tienda?.stockGuaymallen ?? 0);
    const cantPedir = formaPedir === "CANT_FIJA" ? cant : Math.max(0, cant - stock);

    const existing = await prisma.itemPedidoEnvio.findFirst({
      where: {
        idProveedor: idProveedor.trim(),
        tipoPedido: TIPO_REPOSICION,
        sucursalCodigo: sucursal,
        codExt: codExt.trim(),
      },
      select: { id: true },
    });

    const dataBase = {
      codProveedor: provRow.codProdProveedor,
      codTienda: tienda?.codTienda ?? null,
      descripcionProveedor: provRow.descripcionProveedor,
      descripcionTienda: tienda?.descripcionTienda?.trim() || null,
      cantPedir,
      reposicionFormaPedido: formaPedir,
      reposicionPuntoPedido: punto,
      reposicionCantConf: cant,
      reposicionCantPedir: cantPedir,
    };

    if (existing) {
      await prisma.itemPedidoEnvio.update({
        where: { id: existing.id },
        data: dataBase,
      });
    } else {
      await prisma.itemPedidoEnvio.create({
        data: {
          idProveedor: idProveedor.trim(),
          tipoPedido: TIPO_REPOSICION,
          sucursalCodigo: sucursal,
          codExt: codExt.trim(),
          ...dataBase,
        },
      });
    }

    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al guardar la configuración.";
    return { ok: false, error: message };
  }
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

    const existing = await prisma.itemPedidoEnvio.findFirst({
      where: {
        idProveedor: item.idProveedor,
        tipoPedido: TIPO_URGENTE,
        sucursalCodigo: sucursal,
        codExt: item.codExt,
      },
      select: { id: true },
    });

    const dataBase = {
      codProveedor: item.codProdProveedor,
      codTienda: tienda?.codTienda ?? null,
      descripcionProveedor: item.descripcionProveedor,
      descripcionTienda: tienda?.descripcionTienda?.trim() || null,
      cantPedir: cantNorm,
      urgenteCantPedir: cantNorm,
    };

    if (existing) {
      await prisma.itemPedidoEnvio.update({
        where: { id: existing.id },
        data: dataBase,
      });
    } else {
      await prisma.itemPedidoEnvio.create({
        data: {
          idProveedor: item.idProveedor,
          tipoPedido: TIPO_URGENTE,
          sucursalCodigo: sucursal,
          codExt: item.codExt,
          ...dataBase,
        },
      });
    }

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
          urgenteCantPedir: cant,
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
      urgenteCantPedir: number;
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
