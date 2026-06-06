import { Prisma, type IvaProveedor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";
import type {
  ItemPedidoParaPdf,
  SucursalPedidoEnvio,
} from "@/services/pedidosEnvio.service";
import { getItemsYProveedorParaEnviar } from "@/services/pedidosEnvio.service";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";

const COD_TIENDA_FALLBACK = "1503";

/**
 * Prefijo de log uniforme para todo el módulo de historial de pedidos.
 * Los catch del servicio loggean con `[pedidoHistoria][<fn>]` para que
 * sea grepable contra digests en Vercel Function Logs.
 */
const LOG_TAG = "[pedidoHistoria]";

function logServiceError(scope: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${LOG_TAG}[${scope}]`, msg);
}

/** Retención por estado (días): purga automática en cada escritura del historial. */
const DIAS_RETENCION_PEDIDOS_PENDIENTE = 4;
const DIAS_RETENCION_PEDIDOS_RECEPCIONADO = 30;

function fechaHaceDias(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

/**
 * Elimina cabeceras de `prod_ped_historial` por antigüedad según estado:
 * - PENDIENTE: >= 4 días
 * - RECEPCIONADO: >= 30 días
 * Los ítems en `prod_ped_historial_merc` se borran en cascada (FK).
 * Sin cron ni triggers: se invoca al inicio de cada mutación del historial en este servicio.
 */
async function purgarPedidosHistoriaExpirados(
  db: Pick<typeof prisma, "pedidoHistoria">
): Promise<void> {
  const limitePendiente = fechaHaceDias(DIAS_RETENCION_PEDIDOS_PENDIENTE);
  const limiteRecepcionado = fechaHaceDias(DIAS_RETENCION_PEDIDOS_RECEPCIONADO);
  await db.pedidoHistoria.deleteMany({
    where: {
      OR: [
        {
          estado: { in: ["PENDIENTE", "SIN RECEPCION"] },
          generadoAt: { lte: limitePendiente },
        },
        {
          estado: "RECEPCIONADO",
          generadoAt: { lte: limiteRecepcionado },
        },
      ],
    },
  });
}

/** Límite de texto y de palabras para `q` en listado historial (evita consultas abusivas). */
const HISTORIAL_Q_MAX_LEN = 200;
const HISTORIAL_Q_MAX_TOKENS = 10;

function normalizarTokensBusquedaHistorial(q: string | undefined): string[] {
  const raw = (q ?? "").trim().slice(0, HISTORIAL_Q_MAX_LEN);
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean).slice(0, HISTORIAL_Q_MAX_TOKENS);
}

export type PedidoHistoriaEstado = "PENDIENTE" | "RECEPCIONADO";

function normalizarEstadoPedidoHistoria(
  estado: string | null | undefined
): PedidoHistoriaEstado {
  return estado === "RECEPCIONADO" ? "RECEPCIONADO" : "PENDIENTE";
}

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
  /**
   * En el servicio es `Date` (Prisma). Tras `getPedidoHistoriaDetalleAction`
   * debe viajar como **ISO string** para evitar fallos de serialización del
   * runtime de Server Actions (en producción el cliente podía ver solo el
   * error genérico de "Server Components render").
   */
  generadoAt: Date | string;
  /**
   * Misma regla que `generadoAt`: en wire, ISO string o `null`.
   */
  registradoAt: Date | string | null;
  total: number | null;
  estado: PedidoHistoriaEstado;
  proveedorId: string;
  proveedorNombre: string;
  /**
   * Política de IVA del proveedor (`global_proveedores.iva`). El frontend la
   * usa para decidir si abre el modal "¿La compra genera comprobante fiscal?"
   * antes de exportar el Excel de recepción (regla `iva → tipoComprobante`).
   */
  proveedorIva: IvaProveedor;
  sucursalId: string;
  sucursalNombre: string;
  items: PedidoHistoriaItemDetalle[];
}

/**
 * Convierte el detalle a **solo valores JSON** (strings, números, null).
 * No usa `...d` para no arrastrar getters/propiedades raras del runtime de Prisma.
 * `JSON.parse(JSON.stringify(·))` en la Action culmina la garantía para el flight de Next.js.
 */
export function serializarPedidoHistoriaDetalleParaCliente(
  d: PedidoHistoriaDetalle
): PedidoHistoriaDetalle {
  const generadoAt =
    d.generadoAt instanceof Date ? d.generadoAt.toISOString() : String(d.generadoAt);
  const registradoRaw = d.registradoAt;
  const registradoAt =
    registradoRaw == null
      ? null
      : registradoRaw instanceof Date
        ? registradoRaw.toISOString()
        : String(registradoRaw);

  const total =
    d.total == null
      ? null
      : typeof d.total === "number" && Number.isFinite(d.total)
        ? d.total
        : Number(d.total);

  const iva = String(d.proveedorIva) as IvaProveedor;

  return {
    id: String(d.id),
    generadoAt,
    registradoAt,
    total: total == null || !Number.isFinite(total) ? null : total,
    estado: d.estado,
    proveedorId: String(d.proveedorId),
    proveedorNombre: String(d.proveedorNombre),
    proveedorIva: iva,
    sucursalId: String(d.sucursalId),
    sucursalNombre: String(d.sucursalNombre),
    items: d.items.map((i) => ({
      id: String(i.id),
      codTienda: String(i.codTienda),
      descripcionTienda: String(i.descripcionTienda ?? ""),
      cantPedida: Number(i.cantPedida),
      cantRecibida:
        i.cantRecibida == null ? null : Number(i.cantRecibida),
    })),
  };
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
    await purgarPedidosHistoriaExpirados(prisma);

    const sucursal = await prisma.sucursal.findUnique({
      where: { codigo: sucursalCodigo },
      select: { id: true },
    });
    if (!sucursal) return { success: false, error: "Sucursal no encontrada." };

    const { rows: snapshotRows } = await getItemsYProveedorParaEnviar(
      proveedorId.trim(),
      sucursalCodigo,
      tipos
    );

    const cantPorCodTienda = new Map<string, number>();
    for (const row of snapshotRows) {
      const codTienda = normalizeCodTienda(row.codTienda);
      const cant = Math.max(0, Number(row.cantPedir) || 0);
      cantPorCodTienda.set(codTienda, (cantPorCodTienda.get(codTienda) ?? 0) + cant);
    }

    return await prisma.$transaction(async (tx) => {
      const pedidoHistoria = await tx.pedidoHistoria.create({
        data: {
          proveedorId: proveedorId.trim(),
          sucursalId: sucursal.id,
          estado: "PENDIENTE",
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
    logServiceError("crearPedidoHistoriaSnapshot", e);
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
        total: true,
        proveedorId: true,
        sucursalId: true,
        proveedor: { select: { nombre: true, iva: true } },
        sucursal: { select: { nombre: true } },
        items: {
          select: { id: true, codTienda: true, cantPedida: true, cantRecibida: true },
          orderBy: { codTienda: "asc" },
        },
      },
    });

    if (!pedido) return { success: false, error: "Pedido no encontrado." };

    // Defensa de shape: las FK son NOT NULL en BD, pero un cliente Prisma
    // generado contra un schema desactualizado o una corrupción podría
    // devolver `proveedor`/`sucursal` undefined. Antes esto producía
    // `TypeError: Cannot read properties of undefined (reading 'nombre')`
    // que era atrapado por el try/catch externo, pero el mensaje resultante
    // era confuso y opaco.
    if (!pedido.proveedor || !pedido.sucursal) {
      logServiceError(
        "getPedidoHistoriaDetalle",
        `relaciones incompletas para pedido ${pedido.id}: proveedor=${!!pedido.proveedor} sucursal=${!!pedido.sucursal}`
      );
      return {
        success: false,
        error: "El pedido tiene datos incompletos (proveedor/sucursal).",
      };
    }

    const codTiendaSet = Array.from(new Set(pedido.items.map((i) => i.codTienda)));
    const descRows = await prisma.prodTienda.findMany({
      where: { codTienda: { in: codTiendaSet } },
      select: { codTienda: true, descripcionTienda: true },
      orderBy: [{ codTienda: "asc" }],
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
        total: pedido.total == null ? null : Number(pedido.total),
        estado: normalizarEstadoPedidoHistoria(pedido.estado),
        proveedorId: pedido.proveedorId,
        proveedorNombre: pedido.proveedor.nombre,
        proveedorIva: pedido.proveedor.iva,
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
    logServiceError("getPedidoHistoriaDetalle", e);
    const msg = e instanceof Error ? e.message : "Error al leer el detalle del pedido.";
    return { success: false, error: msg };
  }
}

export async function listarPedidosHistoria(params: {
  pagina?: number;
  estado?: PedidoHistoriaEstado | "ALL";
  proveedorId?: string;
  sucursalCodigo?: SucursalPedidoEnvio;
  /** Palabras (separadas por espacio) que deben aparecer en `descripcion_tienda` de `prod_precios_tienda`; el pedido califica si algún ítem tiene `cod_tienda` coincidente. */
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
    if (params.estado && params.estado !== "ALL") {
      if (params.estado === "PENDIENTE") {
        where.estado = { in: ["PENDIENTE", "SIN RECEPCION"] };
      } else {
        where.estado = params.estado;
      }
    }
    if (params.proveedorId?.trim()) where.proveedorId = params.proveedorId.trim();
    if (sucursalId) where.sucursalId = sucursalId;

    const tokens = normalizarTokensBusquedaHistorial(params.q);
    if (tokens.length > 0) {
      const grouped = await prisma.prodTienda.groupBy({
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
          // Defensa de shape: normalmente las FK garantizan ambos, pero
          // ante una corrupción de datos preferimos mostrar "—" antes que
          // tirar TypeError y romper el render del listado.
          proveedorNombre: r.proveedor?.nombre ?? "—",
          sucursalNombre: r.sucursal?.nombre ?? "—",
          estado: normalizarEstadoPedidoHistoria(r.estado),
          registradoAt: r.registradoAt,
        })),
        total,
        totalPaginas: totalPaginasFromTotal(total, pageSize),
        paginaActual,
      },
    };
  } catch (e) {
    logServiceError("listarPedidosHistoria", e);
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
    await purgarPedidosHistoriaExpirados(prisma);

    const header = await prisma.pedidoHistoria.findUnique({
      where: { id: pedidoHistoriaId.trim() },
      select: { id: true, estado: true },
    });
    if (!header) return { success: false, error: "Pedido no encontrado." };

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
    logServiceError("agregarPedidoHistoriaItem", e);
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
    await purgarPedidosHistoriaExpirados(prisma);

    const item = await prisma.pedidoHistoriaItem.findUnique({
      where: { id },
      select: {
        id: true,
        pedidoHistoria: { select: { estado: true } },
      },
    });
    if (!item) return { success: false, error: "Ítem no encontrado." };

    await prisma.pedidoHistoriaItem.update({
      where: { id },
      data: { cantRecibida: cant },
    });

    return { success: true, data: undefined };
  } catch (e) {
    logServiceError("actualizarPedidoHistoriaItemCantRecibida", e);
    const msg = e instanceof Error ? e.message : "Error al actualizar la cantidad recibida.";
    return { success: false, error: msg };
  }
}

export async function guardarRecepcionPedidoHistoria(params: {
  pedidoHistoriaId: string;
  items: Array<{
    id?: string;
    codTienda: string;
    cantPedida: number;
    cantRecibida: number | null;
  }>;
}): Promise<ServiceResult<void>> {
  const id = params.pedidoHistoriaId.trim();
  if (!id) return { success: false, error: "ID inválido." };

  const itemsNormalizados = params.items.map((item) => ({
    id: item.id?.trim() || undefined,
    codTienda: normalizeCodTienda(item.codTienda),
    cantPedida: Math.max(0, Math.floor(Number(item.cantPedida) || 0)),
    cantRecibida:
      item.cantRecibida == null
        ? null
        : Math.max(0, Math.floor(Number(item.cantRecibida) || 0)),
  }));

  const keys = itemsNormalizados.map((item) => `${item.codTienda}::${item.id ?? "new"}`);
  if (new Set(keys).size !== keys.length) {
    return { success: false, error: "Hay ítems duplicados en la recepción." };
  }

  try {
    await purgarPedidosHistoriaExpirados(prisma);

    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedidoHistoria.findUnique({
        where: { id },
        select: { id: true, estado: true },
      });
      if (!pedido) throw new Error("Pedido no encontrado.");

      const actuales = await tx.pedidoHistoriaItem.findMany({
        where: { pedidoHistoriaId: id },
        select: { id: true },
      });
      const idsActuales = new Set(actuales.map((row) => row.id));
      const idsPayload = new Set(
        itemsNormalizados.map((item) => item.id).filter((v): v is string => Boolean(v))
      );

      for (const item of itemsNormalizados) {
        if (item.id && !idsActuales.has(item.id)) {
          throw new Error("Hay ítems inválidos en la recepción.");
        }
      }

      const idsAEliminar = [...idsActuales].filter((itemId) => !idsPayload.has(itemId));
      if (idsAEliminar.length > 0) {
        await tx.pedidoHistoriaItem.deleteMany({
          where: { pedidoHistoriaId: id, id: { in: idsAEliminar } },
        });
      }

      for (const item of itemsNormalizados) {
        if (item.id) {
          await tx.pedidoHistoriaItem.update({
            where: { id: item.id },
            data: {
              codTienda: item.codTienda,
              cantPedida: item.cantPedida,
              cantRecibida: item.cantRecibida,
            },
          });
          continue;
        }

        await tx.pedidoHistoriaItem.create({
          data: {
            pedidoHistoriaId: id,
            codTienda: item.codTienda,
            cantPedida: item.cantPedida,
            cantRecibida: item.cantRecibida,
          },
        });
      }
    });

    return { success: true, data: undefined };
  } catch (e) {
    logServiceError("guardarRecepcionPedidoHistoria", e);
    const msg =
      e instanceof Error ? e.message : "Error al guardar la recepción del pedido.";
    return { success: false, error: msg };
  }
}

export async function marcarPedidoHistoriaRegistrado(params: {
  pedidoHistoriaId: string;
  totalPedido: number;
}): Promise<ServiceResult<void>> {
  const { pedidoHistoriaId, totalPedido } = params;
  const id = pedidoHistoriaId.trim();
  if (!id) return { success: false, error: "ID inválido." };
  if (!Number.isFinite(totalPedido) || totalPedido <= 0) {
    return { success: false, error: "Total inválido." };
  }

  try {
    await purgarPedidosHistoriaExpirados(prisma);

    await prisma.pedidoHistoria.update({
      where: { id },
      data: {
        estado: "RECEPCIONADO",
        registradoAt: new Date(),
        total: new Prisma.Decimal(totalPedido.toFixed(2)),
      },
    });
    return { success: true, data: undefined };
  } catch (e) {
    logServiceError("marcarPedidoHistoriaRegistrado", e);
    const msg = e instanceof Error ? e.message : "Error al marcar el pedido como registrado.";
    return { success: false, error: msg };
  }
}

export async function reabrirPedidoHistoriaRecepcion(params: {
  pedidoHistoriaId: string;
}): Promise<ServiceResult<void>> {
  const { pedidoHistoriaId } = params;
  const id = pedidoHistoriaId.trim();
  if (!id) return { success: false, error: "ID inválido." };

  try {
    await purgarPedidosHistoriaExpirados(prisma);

    const actual = await prisma.pedidoHistoria.findUnique({
      where: { id },
      select: { estado: true },
    });
    if (!actual) return { success: false, error: "Pedido no encontrado." };

    if (actual.estado === "PENDIENTE" || actual.estado === "SIN RECEPCION") {
      // Idempotente: ya está abierto para edición.
      return { success: true, data: undefined };
    }

    await prisma.pedidoHistoria.update({
      where: { id },
      data: { estado: "PENDIENTE", registradoAt: null },
    });
    return { success: true, data: undefined };
  } catch (e) {
    logServiceError("reabrirPedidoHistoriaRecepcion", e);
    const msg = e instanceof Error ? e.message : "Error al reabrir la recepción del pedido.";
    return { success: false, error: msg };
  }
}

/**
 * Arma los datos para regenerar la nota de pedido PDF desde el snapshot (`prod_ped_historial` + ítems)
 * y el catálogo vigente (`prod_precios_provee` + `prod_precios_tienda` por `cod_tienda`).
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
        prodTienda: { codTienda: { in: cods } },
      },
      select: {
        codExt: true,
        codProdProveedor: true,
        descripcionProveedor: true,
        prodTienda: { select: { codTienda: true, descripcionTienda: true } },
      },
      orderBy: { codExt: "asc" },
    });

    const byCodTienda = new Map<string, (typeof provRows)[number]>();
    for (const row of provRows) {
      const ct = row.prodTienda?.codTienda;
      if (ct == null) continue;
      const key = normalizeCodTienda(ct);
      if (!byCodTienda.has(key)) byCodTienda.set(key, row);
    }

    const items: ItemPedidoParaPdf[] = pedido.items
      .map((it) => {
        const key = normalizeCodTienda(it.codTienda);
        const match = byCodTienda.get(key);
        const descProv = (match?.descripcionProveedor ?? "").trim();
        const descTienda = (match?.prodTienda?.descripcionTienda ?? "").trim();
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

    if (!pedido.proveedor || !pedido.sucursal) {
      logServiceError(
        "getPedidoHistoriaPdfPayload",
        `relaciones incompletas para pedido ${id}: proveedor=${!!pedido.proveedor} sucursal=${!!pedido.sucursal}`
      );
      return {
        success: false,
        error: "El pedido tiene datos incompletos (proveedor/sucursal).",
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
    logServiceError("getPedidoHistoriaPdfPayload", e);
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
    await purgarPedidosHistoriaExpirados(prisma);

    await prisma.pedidoHistoria.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch (e) {
    logServiceError("eliminarPedidoHistoria", e);
    const msg = e instanceof Error ? e.message : "Error al borrar el pedido.";
    return { success: false, error: msg };
  }
}

