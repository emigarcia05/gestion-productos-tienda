/**
 * Servicio prod_ped_merc: sincroniza ítems de Pedido Urgente.
 * El servidor construye las filas a partir de ids de ListaPrecioProveedor + cantidades (opción B).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServiceResult } from "@/types";
import { buildCodExtTintometrico } from "@/lib/pedidosTintometrico";
import { SUCURSAL_LABEL_PEDIDO } from "@/lib/pedidos";

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
  /** Código de fórmula (COD. …) — parte de `cod_ext` para no colisionar por misma base. */
  codTintometrico: string;
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
  if (punto < 0) return { ok: false, error: "Punto reposición inválido." };
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
        stockeable: true,
      },
    });
    if (!tienda) {
      return { ok: false, error: "No se encontró el producto en prod_precios_tienda." };
    }
    if (!tienda.stockeable) {
      return {
        ok: false,
        error:
          "Este producto no es stockeable (DUX: ctd_disponible nulo en algún depósito); no se configura reposición por stock.",
      };
    }
    const codExtResuelto = (tienda.codExt ?? "").trim();
    if (!codExtResuelto) {
      return { ok: false, error: "El producto no tiene cod_ext en prod_precios_tienda." };
    }

    const provRow = await prisma.listaPrecioProveedor.findFirst({
      where: { idProveedor: idProveedor.trim(), codExt: codExtResuelto },
      select: {
        codProdProveedor: true,
        descripcionProveedor: true,
      },
    });
    if (!provRow) return { ok: false, error: "No se encontró el ítem en prod_precios_provee." };

    const stock =
      sucursal === "maipu"
        ? Number(tienda?.stockMaipu ?? 0)
        : Number(tienda?.stockGuaymallen ?? 0);
    // Regla de negocio:
    // - Solo pedir si stock <= punto de reposición.
    // - CANT_FIJA: pedir la cantidad configurada.
    // - CANT_MAXIMA: pedir faltante hasta la cantidad configurada.
    const cantPedir =
      stock <= punto
        ? formaPedir === "CANT_FIJA"
          ? cant
          : Math.max(0, cant - stock)
        : 0;

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
        listaPrecioTienda: {
          select: { codTienda: true, descripcionTienda: true },
        },
      },
    });

    if (!item) return { ok: false, error: "Producto no encontrado." };

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
      codTienda: item.listaPrecioTienda?.codTienda?.trim() || COD_TIENDA_FALLBACK,
      descripcionProveedor: item.descripcionProveedor,
      descripcionTienda: item.listaPrecioTienda?.descripcionTienda?.trim() || null,
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
 * (id lista precio, cantidad). Carga datos desde prod_precios_provee + prod_precios_tienda
 * y escribe en prod_ped_merc.
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
        const codExt = buildCodExtTintometrico(codTiendaTrim, item.codTintometrico);

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
  /** Valor persistido en `prod_ped_merc.cod_ext` (incluye base + código fórmula). */
  codExt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const codExt = params.codExt.trim();
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

/** Fila de la tabla Generar Pedido (cantidad, proveedor y descripción). */
export interface ItemTablaEnviarPedido {
  cantPedir: number;
  descripcion: string;
  tipoPedido: string;
  sucursal: string;
  proveedor: string;
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
      tipoPedido: true,
      descripcionProveedor: true,
      tintometricoDescripcion: true,
      descripcionTienda: true,
      cantPedir: true,
      sucursal: { select: { codigo: true, nombre: true } },
      proveedor: { select: { nombre: true, prefijo: true } },
    },
  });

  const items: ItemTablaEnviarPedido[] = rows.map((i) => {
    const pref = (i.proveedor?.prefijo ?? "").trim();
    const nom = (i.proveedor?.nombre ?? "").trim();
    const proveedorEtiqueta =
      pref.length > 0
        ? `[${pref}] ${nom}`.trim().toUpperCase()
        : nom.toUpperCase();
    return {
      cantPedir: Math.max(0, Number(i.cantPedir) || 0),
      tipoPedido: i.tipoPedido,
      sucursal:
        (i.sucursal?.codigo &&
        (SUCURSAL_LABEL_PEDIDO as Partial<Record<string, string>>)[i.sucursal.codigo]
          ? (SUCURSAL_LABEL_PEDIDO as Partial<Record<string, string>>)[i.sucursal.codigo]
          : i.sucursal?.nombre?.trim()) ||
        "",
      proveedor: proveedorEtiqueta,
      descripcion:
        (i.descripcionProveedor ?? "").trim() ||
        (i.tintometricoDescripcion ?? "").trim() ||
        (i.descripcionTienda ?? "").trim(),
    };
  });

  return { items };
}

/**
 * Fila cruda de `prod_ped_merc` para generar PDF y validar sobrestock (misma query, sin desalineación).
 */
export interface ItemPedidoEnvioRowParaEnviar {
  id: string;
  tipoPedido: string;
  codExt: string;
  codProveedor: string | null;
  tintometricoDescripcion: string | null;
  descripcionProveedor: string | null;
  descripcionTienda: string | null;
  cantPedir: number;
  codTienda: string | null;
  reposicionCantConf: number | null;
}

export interface AjusteCantPedirSobreStockInput {
  idItemPedidoEnvio: string;
  cantPedir: number;
}

/**
 * Obtiene ítems de pedidos_envio para el proveedor, sucursal y tipos dados,
 * y los datos del proveedor (para PDF y WhatsApp).
 * Incluye `rows` para reutilizar en `getSobreStockOtraSucursalParaPedidoEnviar` (mismas filas que el PDF).
 */
export async function getItemsYProveedorParaEnviar(
  proveedorId: string,
  sucursal: string,
  tipos: string[],
  q?: string
): Promise<{
  rows: ItemPedidoEnvioRowParaEnviar[];
  items: ItemPedidoParaPdf[];
  proveedor: ProveedorParaEnvio | null;
}> {
  const pid = proveedorId.trim();
  if (!pid || !sucursal.trim() || tipos.length === 0) {
    return { rows: [], items: [], proveedor: null };
  }

  const sucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: sucursal.trim() },
    select: { id: true },
  });
  if (!sucursalRow) return { rows: [], items: [], proveedor: null };

  const qNorm = q?.trim() ? q.trim() : "";

  const [rawRows, proveedor] = await Promise.all([
    prisma.itemPedidoEnvio.findMany({
      where: {
        idProveedor: pid,
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
        id: true,
        tipoPedido: true,
        codExt: true,
        codProveedor: true,
        tintometricoDescripcion: true,
        descripcionProveedor: true,
        descripcionTienda: true,
        cantPedir: true,
        codTienda: true,
        reposicionCantConf: true,
      },
    }),
    prisma.proveedor.findUnique({
      where: { id: pid },
      select: { id: true, nombre: true, prefijo: true, whatsapp: true },
    }),
  ]);

  const rows: ItemPedidoEnvioRowParaEnviar[] = rawRows.map((i) => ({
    id: i.id,
    tipoPedido: i.tipoPedido,
    codExt: (i.codExt ?? "").trim(),
    codProveedor: i.codProveedor,
    tintometricoDescripcion: i.tintometricoDescripcion,
    descripcionProveedor: i.descripcionProveedor,
    descripcionTienda: i.descripcionTienda,
    cantPedir: i.cantPedir,
    codTienda: i.codTienda?.trim() ?? null,
    reposicionCantConf: i.reposicionCantConf,
  }));

  const itemsPdf: ItemPedidoParaPdf[] = rows.map((i) => ({
    codExt: i.codExt,
    codProveedor: (i.codProveedor ?? "").trim(),
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
        prefijo: proveedor.prefijo ?? "",
        whatsapp: proveedor.whatsapp ?? null,
      }
    : null;

  return { rows, items: itemsPdf, proveedor: prov };
}

/**
 * Ajusta `cant_pedir` para un subconjunto de ítems del pedido antes de generar snapshot/PDF.
 * Solo permite actualizar filas que pertenezcan al mismo proveedor + sucursal + tipos solicitados.
 */
export async function ajustarCantidadesParaGenerarPedido(params: {
  proveedorId: string;
  sucursalCodigo: SucursalPedidoEnvio;
  tipos: string[];
  ajustes: AjusteCantPedirSobreStockInput[];
}): Promise<ServiceResult<{ actualizados: number }>> {
  const proveedorId = params.proveedorId.trim();
  const tipos = Array.from(new Set(params.tipos.map((t) => t.trim()).filter(Boolean)));
  const ajustes = params.ajustes
    .map((a) => ({
      idItemPedidoEnvio: a.idItemPedidoEnvio.trim(),
      cantPedir: Math.max(0, Math.floor(Number(a.cantPedir) || 0)),
    }))
    .filter((a) => a.idItemPedidoEnvio.length > 0);

  if (!proveedorId) return { success: false, error: "Proveedor inválido." };
  if (!params.sucursalCodigo.trim()) return { success: false, error: "Sucursal inválida." };
  if (tipos.length === 0) return { success: false, error: "Tipos inválidos." };
  if (ajustes.length === 0) return { success: true, data: { actualizados: 0 } };

  try {
    const sucursalId = await getSucursalIdByCodigo(params.sucursalCodigo);
    const ids = ajustes.map((a) => a.idItemPedidoEnvio);
    const cantById = new Map(ajustes.map((a) => [a.idItemPedidoEnvio, a.cantPedir]));

    const rows = await prisma.itemPedidoEnvio.findMany({
      where: {
        id: { in: ids },
        idProveedor: proveedorId,
        sucursalId,
        tipoPedido: { in: tipos },
      },
      select: { id: true, tipoPedido: true },
    });

    if (rows.length !== ids.length) {
      return {
        success: false,
        error:
          "No se pudieron validar todos los ítems de sobrestock para aplicar ajustes.",
      };
    }

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const cant = cantById.get(row.id);
        if (cant == null) continue;

        await tx.itemPedidoEnvio.update({
          where: { id: row.id },
          data: {
            cantPedir: cant,
            ...(row.tipoPedido === TIPO_URGENTE ? { urgenteCantPedir: cant } : {}),
            ...(row.tipoPedido === TIPO_TINTOMETRICO
              ? { tintometrioCantPedir: cant }
              : {}),
            ...(row.tipoPedido === TIPO_REPOSICION
              ? { reposicionCantPedir: cant }
              : {}),
          },
        });
      }
    });

    return { success: true, data: { actualizados: rows.length } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al ajustar cantidades del pedido.";
    return { success: false, error: msg };
  }
}
