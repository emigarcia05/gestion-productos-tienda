import { prisma } from "@/lib/prisma";
import type { SucursalPedidoEnvio } from "@/services/pedidosEnvio.service";

export interface SobreStockReposicionItem {
  idItemPedidoEnvio: string;
  codExt: string;
  codTienda: string | null;
  descripcionProveedor: string;
  descripcionTienda: string | null;
  stockSucursal: number;
  topeReposicion: number;
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
 * Regla:
 * - topeReposicion = item.reposicion_cant_conf
 * - stockSucursal = precios_tienda.stock_{maipu|guaymallen} por cod_ext
 * - sobreStock = max(0, stockSucursal - topeReposicion)
 *
 * Para alinear el flujo con el pedido real, solo se incluyen ítems con cant_pedir > 0.
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
    const topeReposicion = Number(row.reposicionCantConf ?? 0);
    if (!Number.isFinite(stockSucursal) || !Number.isFinite(topeReposicion)) continue;
    if (topeReposicion <= 0) continue;

    const sobreStock = Math.max(0, stockSucursal - topeReposicion);
    if (sobreStock <= 0) continue;

    items.push({
      idItemPedidoEnvio: row.id,
      codExt: row.codExt,
      codTienda: row.codTienda ?? null,
      descripcionProveedor: (row.descripcionProveedor ?? "").trim(),
      descripcionTienda: row.descripcionTienda ?? null,
      stockSucursal,
      topeReposicion,
      sobreStock,
      cantPedir: Number(row.cantPedir ?? 0),
    });
  }

  return { items, tieneSobreStock: items.length > 0 };
}

