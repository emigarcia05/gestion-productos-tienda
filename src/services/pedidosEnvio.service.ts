/**
 * Servicio pedidos_mercaderia: sincroniza ítems de Pedido Urgente.
 * El servidor construye las filas a partir de ids de ListaPrecioProveedor + cantidades (opción B).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TIPO_URGENTE = "URGENTE";
const TIPO_REPOSICION = "REPOSICION";
const TIPO_TINTOMETRICO = "TINTOMETRICO";
const COD_TIENDA_FALLBACK = "1503";

export type SucursalPedidoEnvio = "guaymallen" | "maipu";

export interface ItemPedidoUrgentePayload {
  id: string;
  cant: number;
}

export interface ItemPedidoTintometricoPayload {
  sucursalCodigo: SucursalPedidoEnvio;
  proveedorId: string;
  codTienda: string;
  cantidad: number;
  descripcion: string;
}

export interface ItemPedidoTintometricoPersistido {
  sucursalCodigo: SucursalPedidoEnvio;
  proveedorId: string;
  codExt: string;
  codTienda: string;
  cantidad: number;
  descripcion: string;
}

async function getSucursalIdByCodigo(codigo: SucursalPedidoEnvio): Promise<string> {
  const sucursal = await prisma.sucursal.findUnique({
    where: { codigo },
    select: { id: true },
  });
  if (!sucursal) {
    throw new Error(`No se encontró la sucursal '${codigo}'.`);
  }
  return sucursal.id;
}

export async function upsertPedidoMercaderiaReposicionConfig(params: {
  sucursal: SucursalPedidoEnvio;
  idProveedor: string;
  codTienda: string;
  formaPedir: "CANT_MAXIMA" | "CANT_FIJA";
  puntoReposicion: number;
  cantConf: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sucursal, idProveedor, codTienda, formaPedir, puntoReposicion, cantConf } = params;

  const punto = Math.max(0, Math.floor(Number(puntoReposicion) || 0));
  const cant = Math.max(0, Math.floor(Number(cantConf) || 0));
  if (!idProveedor.trim()) return { ok: false, error: "Proveedor requerido." };
  if (!codTienda.trim()) return { ok: false, error: "Código tienda requerido." };
  if (!formaPedir) return { ok: false, error: "Seleccioná Forma Pedir." };
  if (punto <= 0) return { ok: false, error: "Punto reposición inválido." };
  if (cant <= 0) return { ok: false, error: "Cant. reposición inválida." };

  try {
    const sucursalId = await getSucursalIdByCodigo(sucursal);
    const tienda = await prisma.listaPrecioTienda.findFirst({
      where: { codTienda: codTienda.trim() },
      select: {
        codExt: true,
        codTienda: true,
        descripcionTienda: true,
        stockMaipu: true,
        stockGuaymallen: true,
      },
    });
    if (!tienda) {
      return { ok: false, error: "No se encontró el producto en precios_tienda." };
    }
    const codExtResuelto = (tienda.codExt ?? "").trim();
    if (!codExtResuelto) {
      return { ok: false, error: "El producto no tiene cod_ext en precios_tienda." };
    }

    const provRow = await prisma.listaPrecioProveedor.findFirst({
      where: { idProveedor: idProveedor.trim(), codExt: codExtResuelto },
      select: {
        codProdProveedor: true,
        descripcionProveedor: true,
      },
    });
    if (!provRow) return { ok: false, error: "No se encontró el ítem en precios_proveedores." };

    const stock =
      sucursal === "maipu"
        ? Number(tienda?.stockMaipu ?? 0)
        : Number(tienda?.stockGuaymallen ?? 0);
    const cantPedir = formaPedir === "CANT_FIJA" ? cant : Math.max(0, cant - stock);

    const existing = await prisma.itemPedidoEnvio.findFirst({
      where: {
        idProveedor: idProveedor.trim(),
        tipoPedido: TIPO_REPOSICION,
        sucursalId,
        codExt: codExtResuelto,
      },
      select: { id: true },
    });

    const dataBase = {
      codProveedor: (provRow.codProdProveedor ?? "").trim(),
      codTienda: tienda?.codTienda?.trim() || COD_TIENDA_FALLBACK,
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
          sucursalId,
          codExt: codExtResuelto,
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
    const sucursalId = await getSucursalIdByCodigo(sucursal);
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
          sucursalId,
          codExt: item.codExt,
        },
      });
      return { ok: true };
    }

    const existing = await prisma.itemPedidoEnvio.findFirst({
      where: {
        idProveedor: item.idProveedor,
        tipoPedido: TIPO_URGENTE,
        sucursalId,
        codExt: item.codExt,
      },
      select: { id: true },
    });

    const dataBase = {
      codProveedor: (item.codProdProveedor ?? "").trim(),
      codTienda: tienda?.codTienda?.trim() || COD_TIENDA_FALLBACK,
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
          sucursalId,
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

  const sucursalId = await getSucursalIdByCodigo(sucursal);
  await prisma.$transaction(async (tx) => {
    await tx.itemPedidoEnvio.deleteMany({
      where: { sucursalId, tipoPedido: TIPO_URGENTE },
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
          sucursalId,
          codExt: f.codExt,
          codProveedor: (f.codProdProveedor ?? "").trim(),
          codTienda: f.listaPrecioTienda?.codTienda?.trim() || COD_TIENDA_FALLBACK,
          descripcionProveedor: f.descripcionProveedor,
          descripcionTienda: f.listaPrecioTienda?.descripcionTienda?.trim() || null,
          urgenteCantPedir: cant,
          // Compatibilidad: el flujo de "Generar Pedido" hoy usa cant_pedir.
          cantPedir: cant,
        };
      })
      .filter(Boolean) as Array<{
      idProveedor: string;
      tipoPedido: string;
      sucursalId: string;
      codExt: string;
      codProveedor: string;
      codTienda: string;
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

export async function upsertPedidoTintometricoItems(
  sucursal: SucursalPedidoEnvio,
  items: ItemPedidoTintometricoPayload[]
): Promise<{ actualizados: number; error?: string }> {
  if (items.length === 0) return { actualizados: 0 };

  let actualizados = 0;

  try {
    const sucursalId = await getSucursalIdByCodigo(sucursal);
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const codTiendaTrim = item.codTienda.trim();
        const codExt = `TINT-${codTiendaTrim}`;

        const existing = await tx.itemPedidoEnvio.findFirst({
          where: {
            idProveedor: item.proveedorId.trim(),
            tipoPedido: TIPO_TINTOMETRICO,
            sucursalId,
            codExt,
          },
          select: { id: true },
        });

        const dataBase = {
          codExt,
          codProveedor: "",
          codTienda: codTiendaTrim,
          // Para ítems tintométricos no hay descripción de proveedor real;
          // reutilizamos la descripción visible para mantener consistencia.
          descripcionProveedor: item.descripcion,
          descripcionTienda: item.descripcion,
          tintometricoDescripcion: item.descripcion,
          tintometrioCantPedir: item.cantidad,
          cantPedir: item.cantidad,
        };

        if (existing) {
          await tx.itemPedidoEnvio.update({
            where: { id: existing.id },
            data: dataBase,
          });
        } else {
          await tx.itemPedidoEnvio.create({
            data: {
              idProveedor: item.proveedorId.trim(),
              tipoPedido: TIPO_TINTOMETRICO,
              sucursalId,
              ...dataBase,
            },
          });
        }

        actualizados += 1;
      }
    });

    return { actualizados };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar ítems tintométricos.";
    return { actualizados: 0, error: msg };
  }
}

export async function getPedidoTintometricoItems(): Promise<ItemPedidoTintometricoPersistido[]> {
  const rows = await prisma.itemPedidoEnvio.findMany({
    where: {
      tipoPedido: TIPO_TINTOMETRICO,
      cantPedir: { gt: 0 },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      sucursal: { select: { codigo: true } },
      idProveedor: true,
      codExt: true,
      codTienda: true,
      tintometricoDescripcion: true,
      descripcionTienda: true,
      descripcionProveedor: true,
      tintometrioCantPedir: true,
      cantPedir: true,
    },
  });

  return rows.map((r) => ({
    sucursalCodigo: r.sucursal.codigo as SucursalPedidoEnvio,
    proveedorId: r.idProveedor,
    codExt: r.codExt,
    codTienda: r.codTienda ?? "",
    cantidad: Number(r.tintometrioCantPedir ?? r.cantPedir ?? 0),
    descripcion:
      r.tintometricoDescripcion ??
      r.descripcionTienda ??
      r.descripcionProveedor ??
      "",
  }));
}

export async function deletePedidoTintometricoItem(params: {
  sucursalCodigo: SucursalPedidoEnvio;
  proveedorId: string;
  codTienda: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const codExt = `TINT-${params.codTienda.trim()}`;
  try {
    const sucursalId = await getSucursalIdByCodigo(params.sucursalCodigo);
    await prisma.itemPedidoEnvio.deleteMany({
      where: {
        sucursalId,
        idProveedor: params.proveedorId.trim(),
        tipoPedido: TIPO_TINTOMETRICO,
        codExt,
      },
    });
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error al borrar ítem tintométrico.";
    return { ok: false, error: message };
  }
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

/** Fila de la tabla Generar Pedido (cantidad y descripción). */
export interface ItemTablaEnviarPedido {
  cantPedir: number;
  descripcion: string;
}

/**
 * Ítems con cant_pedir > 0 para la tabla **Generar Pedido**.
 * Sin filtros: todas las sucursales, proveedores y tipos. Cada filtro opcional reduce el resultado.
 */
export async function getItemsTablaEnviarPedido(params: {
  sucursalCodigo?: string;
  proveedorId?: string;
  tipos?: string[];
  q?: string;
}): Promise<{ items: ItemTablaEnviarPedido[] }> {
  const { sucursalCodigo, proveedorId, tipos, q } = params;
  const qNorm = q?.trim() ? q.trim() : "";

  const parts: Prisma.ItemPedidoEnvioWhereInput[] = [{ cantPedir: { gt: 0 } }];

  if (sucursalCodigo?.trim()) {
    const sucursalRow = await prisma.sucursal.findUnique({
      where: { codigo: sucursalCodigo.trim() },
      select: { id: true },
    });
    if (!sucursalRow) return { items: [] };
    parts.push({ sucursalId: sucursalRow.id });
  }

  if (proveedorId?.trim()) {
    parts.push({ idProveedor: proveedorId.trim() });
  }

  if (tipos && tipos.length > 0) {
    parts.push({ tipoPedido: { in: tipos } });
  }

  if (qNorm) {
    parts.push({
      OR: [
        { descripcionTienda: { contains: qNorm, mode: "insensitive" } },
        { descripcionProveedor: { contains: qNorm, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.ItemPedidoEnvioWhereInput =
    parts.length === 1 ? parts[0]! : { AND: parts };

  const rows = await prisma.itemPedidoEnvio.findMany({
    where,
    orderBy: [{ sucursalId: "asc" }, { idProveedor: "asc" }, { codExt: "asc" }],
    select: {
      descripcionProveedor: true,
      tintometricoDescripcion: true,
      descripcionTienda: true,
      cantPedir: true,
    },
  });

  const items: ItemTablaEnviarPedido[] = rows.map((i) => ({
    cantPedir: Math.max(0, Number(i.cantPedir) || 0),
    descripcion:
      (i.descripcionProveedor ?? "").trim() ||
      (i.tintometricoDescripcion ?? "").trim() ||
      (i.descripcionTienda ?? "").trim(),
  }));

  return { items };
}

/**
 * Obtiene ítems de pedidos_envio para el proveedor, sucursal y tipos dados,
 * y los datos del proveedor (para PDF y WhatsApp).
 */
export async function getItemsYProveedorParaEnviar(
  proveedorId: string,
  sucursal: string,
  tipos: string[],
  q?: string
): Promise<{ items: ItemPedidoParaPdf[]; proveedor: ProveedorParaEnvio | null }> {
  if (!proveedorId.trim() || !sucursal.trim() || tipos.length === 0) {
    return { items: [], proveedor: null };
  }

  const sucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: sucursal.trim() },
    select: { id: true },
  });
  if (!sucursalRow) return { items: [], proveedor: null };

  const qNorm = q?.trim() ? q.trim() : "";

  const [items, proveedor] = await Promise.all([
    prisma.itemPedidoEnvio.findMany({
      where: {
        idProveedor: proveedorId,
        sucursalId: sucursalRow.id,
        tipoPedido: { in: tipos },
        cantPedir: { gt: 0 },
        ...(qNorm
          ? {
              OR: [
                { descripcionTienda: { contains: qNorm, mode: "insensitive" } },
                { descripcionProveedor: { contains: qNorm, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ codExt: "asc" }],
      select: {
        codExt: true,
        codProveedor: true,
          tintometricoDescripcion: true,
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
    codProveedor: (i.codProveedor ?? "").trim(),
    // Para "Generar Pedido", el campo visible de descripción depende del tipo:
    // - Preferimos `descripcion_proveedor` cuando exista
    // - Si no está, usamos `tintometrico_descripcion`
    // - Como fallback final, `descripcion_tienda`
    descripcion:
      (i.descripcionProveedor ?? "").trim() ||
      (i.tintometricoDescripcion ?? "").trim() ||
      (i.descripcionTienda ?? "").trim(),
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
