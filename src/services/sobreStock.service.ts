import { prisma } from "@/lib/prisma";
import type { SucursalPedidoEnvio } from "@/services/pedidosEnvio.service";

export type OrigenDeteccionSobrestock = "LOCAL" | "OTRA_SUCURSAL";

export interface SobreStockReposicionItem {
  idItemPedidoEnvio: string;
  codExt: string;
  codTienda: string | null;
  descripcionProveedor: string;
  descripcionTienda: string | null;
  /** Stock en la sucursal `sucursalCodigoSobrestock` (desde `precios_tienda`). */
  stockSucursal: number;
  /** Tope de reposición en esa sucursal; `null` si no hay configuración (> 0) en la fila analizada. */
  topeReposicion: number | null;
  sobreStock: number;
  /** Cantidad a pedir en la sucursal que genera el pedido (línea `ItemPedidoEnvio` del pedido). */
  cantPedir: number;
  /** Sucursal donde el stock supera el tope (puede ser la del pedido u otra tienda). */
  sucursalCodigoSobrestock: SucursalPedidoEnvio;
  /** LOCAL: excedente en la sucursal que pide; OTRA_SUCURSAL: excedente en la otra tienda (transferencia interna). */
  origenDeteccion: OrigenDeteccionSobrestock;
}

export interface SobreStockReposicionResult {
  items: SobreStockReposicionItem[];
  tieneSobreStock: boolean;
}

function getStockFieldBySucursal(
  sucursal: SucursalPedidoEnvio
): "stockMaipu" | "stockGuaymallen" {
  return sucursal === "maipu" ? "stockMaipu" : "stockGuaymallen";
}

function otraSucursalPedido(s: SucursalPedidoEnvio): SucursalPedidoEnvio {
  return s === "maipu" ? "guaymallen" : "maipu";
}

/**
 * Devuelve { sobreStock, topeReposicion } si hay sobrestock, o `null` si no aplica.
 * Misma regla negocio que antes: tope > 0 → compara stock vs tope; si no hay tope → stock > 0 cuenta como sobrestock con tope null.
 */
function evaluarSobrestockEnValores(
  stockSucursal: number,
  reposicionCantConf: number | null | undefined
): { sobreStock: number; topeReposicion: number | null } | null {
  const topeRaw = reposicionCantConf;
  const topeReposicionNum =
    topeRaw != null && Number.isFinite(Number(topeRaw)) ? Number(topeRaw) : 0;
  if (!Number.isFinite(stockSucursal)) return null;

  const tieneConfigReposicion = topeReposicionNum > 0;

  if (tieneConfigReposicion) {
    if (stockSucursal <= topeReposicionNum) return null;
    return {
      sobreStock: stockSucursal - topeReposicionNum,
      topeReposicion: topeReposicionNum,
    };
  }
  if (stockSucursal <= 0) return null;
  return { sobreStock: stockSucursal, topeReposicion: null };
}

/**
 * Calcula el "sobrestock" para ítems de REPOSICION antes de generar el pedido.
 *
 * Incluye:
 * 1. **LOCAL**: en la sucursal que genera el pedido, stock vs su `reposicion_cant_conf`.
 * 2. **OTRA_SUCURSAL**: misma regla en la **otra** tienda (mismo proveedor y `cod_ext`), si existe fila
 *    `ItemPedidoEnvio` de reposición en esa sucursal — para advertir transferencia interna en lugar de pedir al proveedor.
 *
 * Solo entran líneas del pedido con `cant_pedir > 0` en la sucursal que ordena.
 */
export async function getSobreStockReposicionItems(params: {
  proveedorId: string;
  sucursal: SucursalPedidoEnvio;
}): Promise<SobreStockReposicionResult> {
  const { proveedorId, sucursal } = params;
  const sucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: sucursal },
    select: { id: true },
  });

  if (!sucursalRow) {
    return { items: [], tieneSobreStock: false };
  }

  const otraCodigo = otraSucursalPedido(sucursal);
  const otraSucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: otraCodigo },
    select: { id: true },
  });

  const rows = await prisma.itemPedidoEnvio.findMany({
    where: {
      idProveedor: proveedorId.trim(),
      sucursalId: sucursalRow.id,
      tipoPedido: "REPOSICION",
      cantPedir: { gt: 0 },
    },
    select: {
      id: true,
      codExt: true,
      codTienda: true,
      descripcionProveedor: true,
      descripcionTienda: true,
      reposicionCantConf: true,
      cantPedir: true,
    },
  });

  if (rows.length === 0) {
    return { items: [], tieneSobreStock: false };
  }

  const codExts = rows.map((r) => r.codExt);
  const stockFieldPedido = getStockFieldBySucursal(sucursal);
  const stockFieldOtra = getStockFieldBySucursal(otraCodigo);

  const tiendaRows = await prisma.listaPrecioTienda.findMany({
    where: { codExt: { in: codExts } },
    select: {
      codExt: true,
      codTienda: true,
      descripcionTienda: true,
      stockMaipu: true,
      stockGuaymallen: true,
    },
  });

  const tiendaMap = new Map(tiendaRows.map((r) => [r.codExt, r]));

  const otherRows =
    otraSucursalRow != null
      ? await prisma.itemPedidoEnvio.findMany({
          where: {
            idProveedor: proveedorId.trim(),
            sucursalId: otraSucursalRow.id,
            tipoPedido: "REPOSICION",
            codExt: { in: codExts },
          },
          select: {
            codExt: true,
            reposicionCantConf: true,
          },
        })
      : [];

  const otherByCodExt = new Map(otherRows.map((r) => [r.codExt, r]));

  const items: SobreStockReposicionItem[] = [];
  const cantPedirOrden = (row: (typeof rows)[0]) => Number(row.cantPedir ?? 0);

  for (const row of rows) {
    const tienda = tiendaMap.get(row.codExt);
    if (!tienda) continue;

    const base = {
      idItemPedidoEnvio: row.id,
      codExt: row.codExt,
      codTienda: row.codTienda ?? null,
      descripcionProveedor: (row.descripcionProveedor ?? "").trim(),
      descripcionTienda: row.descripcionTienda ?? null,
      cantPedir: cantPedirOrden(row),
    };

    const stockPedido = Number(tienda[stockFieldPedido] ?? 0);
    const local = evaluarSobrestockEnValores(stockPedido, row.reposicionCantConf);
    if (local) {
      items.push({
        ...base,
        stockSucursal: stockPedido,
        topeReposicion: local.topeReposicion,
        sobreStock: local.sobreStock,
        sucursalCodigoSobrestock: sucursal,
        origenDeteccion: "LOCAL",
      });
    }

    const otherMeta = otherByCodExt.get(row.codExt);
    if (!otherMeta) continue;

    const stockOtra = Number(tienda[stockFieldOtra] ?? 0);
    const ext = evaluarSobrestockEnValores(stockOtra, otherMeta.reposicionCantConf);
    if (!ext) continue;

    items.push({
      ...base,
      stockSucursal: stockOtra,
      topeReposicion: ext.topeReposicion,
      sobreStock: ext.sobreStock,
      sucursalCodigoSobrestock: otraCodigo,
      origenDeteccion: "OTRA_SUCURSAL",
    });
  }

  return { items, tieneSobreStock: items.length > 0 };
}
