import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";
import type {
  ItemPedidoParaPdf,
  SucursalPedidoEnvio,
} from "@/services/pedidosEnvio.service";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";

const COD_TIENDA_FALLBACK = "1503";

/** Límite de texto y de palabras para `q` en listado historial (evita consultas abusivas). */
const HISTORIAL_Q_MAX_LEN = 200;
const HISTORIAL_Q_MAX_TOKENS = 10;

function normalizarTokensBusquedaHistorial(q: string | undefined): string[] {
  const raw = (q ?? "").trim().slice(0, HISTORIAL_Q_MAX_LEN);
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean).slice(0, HISTORIAL_Q_MAX_TOKENS);
}

export type PedidoHistoriaEstado = "PEDIDO" | "RECIBIDO";

export interface PedidoHistoriaResumen {
  id: string;
  generadoAt: Date;
  proveedorNombre: string;
  sucursalNombre: string;
  estado: PedidoHistoriaEstado;
  registradoAt: Date | null;
}

export interface PedidoHistoriaItemDetalle {
  id: string;
  codTienda: string;
  descripcionTienda: string;
  cantPedida: number;
  /** `null` hasta que en recepción se guarde una cantidad recibida. */
  cantRecibida: number | null;
}

export interface PedidoHistoriaDetalle {
  id: string;
  generadoAt: Date;
  registradoAt: Date | null;
  estado: PedidoHistoriaEstado;
  proveedorId: string;
  proveedorNombre: string;
  sucursalId: string;
  sucursalNombre: string;
  items: PedidoHistoriaItemDetalle[];
}

function normalizeCodTienda(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : COD_TIENDA_FALLBACK;
}

export async function crearPedidoHistoriaSnapshot(params: {
  proveedorId: string;
  sucursalCodigo: SucursalPedidoEnvio;
  tipos: string[];
}): Promise<ServiceResult<{ id: string }>> {
  const { proveedorId, sucursalCodigo, tipos } = params;

  if (!proveedorId.trim()) {
    return { success: false, error: "Proveedor inválido." };
  }
  if (!sucursalCodigo.trim()) {
    return { success: false, error: "Sucursal inválida." };
  }
  if (!Array.isArray(tipos) || tipos.length === 0) {
    return { success: false, error: "Tipos inválidos." };
  }

  try {
    const sucursal = await prisma.sucursal.findUnique({
      where: { codigo: sucursalCodigo },
      select: { id: true },
    });
    if (!sucursal) return { success: false, error: "Sucursal no encontrada." };

    const snapshotItems = await prisma.itemPedidoEnvio.findMany({
      where: {
        idProveedor: proveedorId.trim(),
        sucursalId: sucursal.id,
        tipoPedido: { in: tipos },
        cantPedir: { gt: 0 },
      },
      select: { codTienda: true, cantPedir: true },
      orderBy: { codTienda: "asc" },
    });

    // Si por algún motivo hay más de un registro que termine con el mismo cod_tienda,
    // consolidamos para respetar UNIQUE(pedido_historia_id, cod_tienda).
    const cantPorCodTienda = new Map<string, number>();
    for (const row of snapshotItems) {
      const codTienda = normalizeCodTienda(row.codTienda);
      const cant = Math.max(0, Number(row.cantPedir) || 0);
      cantPorCodTienda.set(codTienda, (cantPorCodTienda.get(codTienda) ?? 0) + cant);
    }

    return await prisma.$transaction(async (tx) => {
      const pedidoHistoria = await tx.pedidoHistoria.create({
        data: {
          proveedorId: proveedorId.trim(),
          sucursalId: sucursal.id,
          estado: "PEDIDO",
        },
        select: { id: true },
      });

      const itemsToCreate = [...cantPorCodTienda.entries()].map(([codTienda, cantPedida]) => ({
        codTienda,
        cantPedida,
      }));

      if (itemsToCreate.length > 0) {
        await tx.pedidoHistoriaItem.createMany({
          data: itemsToCreate.map((it) => ({
            pedidoHistoriaId: pedidoHistoria.id,
            codTienda: it.codTienda,
            cantPedida: it.cantPedida,
            cantRecibida: null,
          })),
        });
      }

      return { success: true, data: { id: pedidoHistoria.id } };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al crear el snapshot del pedido.";
    return { success: false, error: msg };
  }
}

export async function getPedidoHistoriaDetalle(params: {
  pedidoHistoriaId: string;
}): Promise<ServiceResult<PedidoHistoriaDetalle>> {
  const { pedidoHistoriaId } = params;
  if (!pedidoHistoriaId.trim()) return { success: false, error: "ID inválido." };

  try {
    const pedido = await prisma.pedidoHistoria.findUnique({
      where: { id: pedidoHistoriaId.trim() },
      select: {
        id: true,
        generadoAt: true,
        estado: true,
        registradoAt: true,
        proveedorId: true,
        sucursalId: true,
        proveedor: { select: { nombre: true } },
        sucursal: { select: { nombre: true } },
        items: {
          select: { id: true, codTienda: true, cantPedida: true, cantRecibida: true },
          orderBy: { codTienda: "asc" },
        },
      },
    });

    if (!pedido) return { success: false, error: "Pedido no encontrado." };

    const codTiendaSet = Array.from(new Set(pedido.items.map((i) => i.codTienda)));
    const descRows = await prisma.listaPrecioTienda.findMany({
      where: { codTienda: { in: codTiendaSet } },
      select: { codTienda: true, descripcionTienda: true, codExt: true },
      orderBy: [{ codTienda: "asc" }, { codExt: "asc" }],
    });

    const descripcionPorCodTienda = new Map<string, string>();
    for (const r of descRows) {
      const key = r.codTienda;
      if (descripcionPorCodTienda.has(key)) continue;
      const desc = (r.descripcionTienda ?? "").trim();
      if (!desc) continue;
      descripcionPorCodTienda.set(key, desc);
    }

    return {
      success: true,
      data: {
        id: pedido.id,
        generadoAt: pedido.generadoAt,
        registradoAt: pedido.registradoAt,
        estado: pedido.estado as PedidoHistoriaEstado,
        proveedorId: pedido.proveedorId,
        proveedorNombre: pedido.proveedor.nombre,
        sucursalId: pedido.sucursalId,
        sucursalNombre: pedido.sucursal.nombre,
        items: pedido.items.map((i) => ({
          id: i.id,
          codTienda: i.codTienda,
          descripcionTienda: descripcionPorCodTienda.get(i.codTienda) ?? "",
          cantPedida: i.cantPedida,
          cantRecibida: i.cantRecibida,
        })),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al leer el detalle del pedido.";
    return { success: false, error: msg };
  }
}

export async function listarPedidosHistoria(params: {
  pagina?: number;
  estado?: PedidoHistoriaEstado | "ALL";
  proveedorId?: string;
  sucursalCodigo?: SucursalPedidoEnvio;
  /** Palabras (separadas por espacio) que deben aparecer en `descripcion_tienda` de `precios_tienda`; el pedido califica si algún ítem tiene `cod_tienda` coincidente. */
  q?: string;
}): Promise<
  ServiceResult<{
    items: PedidoHistoriaResumen[];
    total: number;
    totalPaginas: number;
    paginaActual: number;
  }>
> {
  const paginaActual = Math.max(1, Math.floor(Number(params.pagina) || 1));
  const pageSize = PAGE_SIZE;

  try {
    let sucursalId: string | undefined;
    if (params.sucursalCodigo) {
      const suc = await prisma.sucursal.findUnique({
        where: { codigo: params.sucursalCodigo },
        select: { id: true },
      });
      if (!suc) {
        return { success: true, data: { items: [], total: 0, totalPaginas: 1, paginaActual } };
      }
      sucursalId = suc.id;
    }

    const where: Prisma.PedidoHistoriaWhereInput = {};
    if (params.estado && params.estado !== "ALL") where.estado = params.estado;
    if (params.proveedorId?.trim()) where.proveedorId = params.proveedorId.trim();
    if (sucursalId) where.sucursalId = sucursalId;

    const tokens = normalizarTokensBusquedaHistorial(params.q);
    if (tokens.length > 0) {
      const grouped = await prisma.listaPrecioTienda.groupBy({
        by: ["codTienda"],
        where: {
          AND: tokens.map((t) => ({
            descripcionTienda: { contains: t, mode: "insensitive" },
          })),
        },
      });
      const codTiendas = grouped.map((g) => g.codTienda);
      if (codTiendas.length === 0) {
        return {
          success: true,
          data: {
            items: [],
            total: 0,
            totalPaginas: 1,
            paginaActual,
          },
        };
      }
      where.items = { some: { codTienda: { in: codTiendas } } };
    }

    const [total, rows] = await Promise.all([
      prisma.pedidoHistoria.count({ where }),
      prisma.pedidoHistoria.findMany({
        where,
        orderBy: { generadoAt: "desc" },
        skip: skipForPagina(paginaActual, pageSize),
        take: pageSize,
        select: {
          id: true,
          generadoAt: true,
          estado: true,
          registradoAt: true,
          proveedor: { select: { nombre: true } },
          sucursal: { select: { nombre: true } },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          generadoAt: r.generadoAt,
          proveedorNombre: r.proveedor.nombre,
          sucursalNombre: r.sucursal.nombre,
          estado: r.estado as PedidoHistoriaEstado,
          registradoAt: r.registradoAt,
        })),
        total,
        totalPaginas: totalPaginasFromTotal(total, pageSize),
        paginaActual,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al listar el historial de pedidos.";
    return { success: false, error: msg };
  }
}

export async function agregarPedidoHistoriaItem(params: {
  pedidoHistoriaId: string;
  codTienda: string;
  cantRecibida: number;
}): Promise<ServiceResult<{ idItem: string }>> {
  const { pedidoHistoriaId, codTienda, cantRecibida } = params;
  const cod = normalizeCodTienda(codTienda);
  const cant = Math.max(0, Math.floor(Number(cantRecibida) || 0));

  if (!pedidoHistoriaId.trim()) return { success: false, error: "ID inválido." };

  try {
    const header = await prisma.pedidoHistoria.findUnique({
      where: { id: pedidoHistoriaId.trim() },
      select: { id: true, estado: true },
    });
    if (!header) return { success: false, error: "Pedido no encontrado." };
    if (header.estado === "RECIBIDO") return { success: false, error: "Pedido ya recibido (registrado en DUX)." };

    const existing = await prisma.pedidoHistoriaItem.findUnique({
      where: { pedidoHistoriaId_codTienda: { pedidoHistoriaId: header.id, codTienda: cod } },
      select: { id: true },
    });
    if (existing) return { success: false, error: "El producto ya existe en el pedido." };

    const idItem = await prisma.pedidoHistoriaItem.create({
      data: {
        pedidoHistoriaId: header.id,
        codTienda: cod,
        cantPedida: cant,
        cantRecibida: cant,
      },
      select: { id: true },
    });

    return { success: true, data: { idItem: idItem.id } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al agregar el producto al pedido.";
    return { success: false, error: msg };
  }
}

export async function actualizarPedidoHistoriaItemCantRecibida(params: {
  pedidoHistoriaItemId: string;
  cantRecibida: number;
}): Promise<ServiceResult<void>> {
  const { pedidoHistoriaItemId, cantRecibida } = params;
  const id = pedidoHistoriaItemId.trim();
  const cant = Math.max(0, Math.floor(Number(cantRecibida) || 0));

  if (!id) return { success: false, error: "ID inválido." };

  try {
    const item = await prisma.pedidoHistoriaItem.findUnique({
      where: { id },
      select: {
        id: true,
        pedidoHistoria: { select: { estado: true } },
      },
    });
    if (!item) return { success: false, error: "Ítem no encontrado." };

    if (item.pedidoHistoria.estado === "RECIBIDO") {
      return { success: false, error: "Pedido ya recibido (registrado en DUX)." };
    }

    await prisma.pedidoHistoriaItem.update({
      where: { id },
      data: { cantRecibida: cant },
    });

    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al actualizar la cantidad recibida.";
    return { success: false, error: msg };
  }
}

export async function marcarPedidoHistoriaRegistrado(params: {
  pedidoHistoriaId: string;
}): Promise<ServiceResult<void>> {
  const { pedidoHistoriaId } = params;
  const id = pedidoHistoriaId.trim();
  if (!id) return { success: false, error: "ID inválido." };

  try {
    await prisma.pedidoHistoria.update({
      where: { id },
      data: { estado: "RECIBIDO", registradoAt: new Date() },
    });
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al marcar el pedido como registrado.";
    return { success: false, error: msg };
  }
}

/**
 * Arma los datos para regenerar la nota de pedido PDF desde el snapshot (`pedidos_historia` + ítems)
 * y el catálogo vigente (`precios_proveedores` + `precios_tienda` por `cod_tienda`).
 */
export async function getPedidoHistoriaPdfPayload(params: {
  pedidoHistoriaId: string;
}): Promise<
  ServiceResult<{
    items: ItemPedidoParaPdf[];
    proveedorNombre: string;
    proveedorPrefijo: string;
    sucursalCodigo: string;
    generadoAt: Date;
  }>
> {
  const id = params.pedidoHistoriaId.trim();
  if (!id) return { success: false, error: "ID inválido." };

  try {
    const pedido = await prisma.pedidoHistoria.findUnique({
      where: { id },
      select: {
        generadoAt: true,
        proveedorId: true,
        proveedor: { select: { nombre: true, prefijo: true } },
        sucursal: { select: { codigo: true } },
        items: { select: { codTienda: true, cantPedida: true } },
      },
    });
    if (!pedido) return { success: false, error: "Pedido no encontrado." };
    if (pedido.items.length === 0) {
      return { success: false, error: "El pedido no tiene ítems para el PDF." };
    }

    const cods = Array.from(
      new Set(pedido.items.map((it) => normalizeCodTienda(it.codTienda)))
    );

    const provRows = await prisma.listaPrecioProveedor.findMany({
      where: {
        idProveedor: pedido.proveedorId,
        listaPrecioTienda: { codTienda: { in: cods } },
      },
      select: {
        codExt: true,
        codProdProveedor: true,
        descripcionProveedor: true,
        listaPrecioTienda: { select: { codTienda: true, descripcionTienda: true } },
      },
      orderBy: { codExt: "asc" },
    });

    const byCodTienda = new Map<string, (typeof provRows)[number]>();
    for (const row of provRows) {
      const ct = row.listaPrecioTienda?.codTienda;
      if (ct == null) continue;
      const key = normalizeCodTienda(ct);
      if (!byCodTienda.has(key)) byCodTienda.set(key, row);
    }

    const items: ItemPedidoParaPdf[] = pedido.items
      .map((it) => {
        const key = normalizeCodTienda(it.codTienda);
        const match = byCodTienda.get(key);
        const descProv = (match?.descripcionProveedor ?? "").trim();
        const descTienda = (match?.listaPrecioTienda?.descripcionTienda ?? "").trim();
        return {
          codExt: (match?.codExt ?? "").trim(),
          codProveedor: (match?.codProdProveedor ?? "").trim(),
          descripcion: descProv || descTienda || `Producto ${key}`,
          cantPedir: Math.max(0, Number(it.cantPedida) || 0),
        };
      })
      .filter((row) => row.cantPedir > 0);

    if (items.length === 0) {
      return {
        success: false,
        error: "No hay líneas con cantidad pedida para el PDF.",
      };
    }

    return {
      success: true,
      data: {
        items,
        proveedorNombre: pedido.proveedor.nombre,
        proveedorPrefijo: (pedido.proveedor.prefijo ?? "").trim(),
        sucursalCodigo: pedido.sucursal.codigo,
        generadoAt: pedido.generadoAt,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al armar el PDF del pedido.";
    return { success: false, error: msg };
  }
}

export async function eliminarPedidoHistoria(params: {
  pedidoHistoriaId: string;
}): Promise<ServiceResult<void>> {
  const id = params.pedidoHistoriaId.trim();
  if (!id) return { success: false, error: "ID inválido." };

  try {
    await prisma.pedidoHistoria.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al borrar el pedido.";
    return { success: false, error: msg };
  }
}

