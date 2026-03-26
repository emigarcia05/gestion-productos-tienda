import { prisma } from "@/lib/prisma";
import type { SucursalPedidoEnvio } from "@/services/pedidosEnvio.service";

export interface SobreStockReposicionItem {
  idItemPedidoEnvio: string;
  codExt: string;
  codTienda: string | null;
  descripcionProveedor: string;
  descripcionTienda: string | null;
  stockSucursal: number;
  /** Tope de reposición (`reposicion_cant_conf`); `null` si no hay configuración de REPOSICION para el ítem. */
  topeReposicion: number | null;
  sobreStock: number;
  cantPedir: number;
}

export interface SobreStockReposicionResult {
  items: SobreStockReposicionItem[];
  tieneSobreStock: boolean;
}

function getStockFieldBySucursal(sucursal: SucursalPedidoEnvio): "stockMaipu" | "stockGuaymallen" {
  return sucursal === "maipu" ? "stockMaipu" : "stockGuaymallen";
}

/**
 * Calcula el "sobrestock" para ítems de REPOSICION antes de generar el pedido.
 *
 * Reglas (por ítem, `stockSucursal` desde `precios_tienda` según sucursal):
 * 1. Con configuración de reposición: `reposicion_cant_conf > 0` → sobrestock si
 *    `stockSucursal > reposicion_cant_conf`, con `sobreStock = stockSucursal - reposicion_cant_conf`.
 * 2. Sin configuración: `reposicion_cant_conf` nulo o ≤ 0 → sobrestock si `stockSucursal > 0`,
 *    con `sobreStock = stockSucursal` y `topeReposicion = null` en la salida.
 *
 * Solo se incluyen ítems con `cant_pedir > 0` (mismo criterio que el pedido a generar).
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
  const stockField = getStockFieldBySucursal(sucursal);

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

  const items: SobreStockReposicionItem[] = [];
  for (const row of rows) {
    const tienda = tiendaMap.get(row.codExt);
    if (!tienda) continue;

    const stockSucursal = Number(tienda[stockField] ?? 0);
    const topeRaw = row.reposicionCantConf;
    const topeReposicion =
      topeRaw != null && Number.isFinite(Number(topeRaw)) ? Number(topeRaw) : 0;
    if (!Number.isFinite(stockSucursal)) continue;

    const tieneConfigReposicion = topeReposicion > 0;

    let sobreStock = 0;
    let topeEnSalida: number | null = null;

    if (tieneConfigReposicion) {
      topeEnSalida = topeReposicion;
      if (stockSucursal <= topeReposicion) continue;
      sobreStock = stockSucursal - topeReposicion;
    } else {
      if (stockSucursal <= 0) continue;
      sobreStock = stockSucursal;
    }

    items.push({
      idItemPedidoEnvio: row.id,
      codExt: row.codExt,
      codTienda: row.codTienda ?? null,
      descripcionProveedor: (row.descripcionProveedor ?? "").trim(),
      descripcionTienda: row.descripcionTienda ?? null,
      stockSucursal,
      topeReposicion: topeEnSalida,
      sobreStock,
      cantPedir: Number(row.cantPedir ?? 0),
    });
  }

  return { items, tieneSobreStock: items.length > 0 };
}

