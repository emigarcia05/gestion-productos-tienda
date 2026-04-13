import { prisma } from "@/lib/prisma";
import type {
  ItemPedidoEnvioRowParaEnviar,
  SucursalPedidoEnvio,
} from "@/services/pedidosEnvio.service";

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
  /** Sucursal donde se midió el excedente (en este flujo siempre la otra tienda). */
  sucursalCodigoSobrestock: SucursalPedidoEnvio;
  /** En el flujo actual de generar pedido: siempre `OTRA_SUCURSAL`. */
  origenDeteccion: OrigenDeteccionSobrestock;
}

export interface SobreStockReposicionResult {
  items: SobreStockReposicionItem[];
  tieneSobreStock: boolean;
}

function normCodExt(c: string): string {
  return (c ?? "").trim();
}

function getStockFieldBySucursal(
  sucursal: SucursalPedidoEnvio
): "stockMaipu" | "stockGuaymallen" {
  return sucursal === "maipu" ? "stockMaipu" : "stockGuaymallen";
}

function otraSucursalPedido(s: SucursalPedidoEnvio): SucursalPedidoEnvio {
  return s === "maipu" ? "guaymallen" : "maipu";
}

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
 * Para cada línea del pedido a generar que tenga **`cod_tienda`**, resuelve el producto en
 * `precios_tienda` por ese código y evalúa si en la **otra sucursal** hay sobrestock
 * (mismas reglas de tope REPOSICIÓN que en reposición).
 *
 * No evalúa la sucursal que genera el pedido; no incluye líneas sin `cod_tienda`.
 */
export async function getSobreStockOtraSucursalParaPedidoEnviar(params: {
  proveedorId: string;
  sucursal: SucursalPedidoEnvio;
  filas: ItemPedidoEnvioRowParaEnviar[];
}): Promise<SobreStockReposicionResult> {
  const proveedorPedido = params.proveedorId.trim();
  const filasConTienda = params.filas.filter(
    (f) => (f.codTienda ?? "").trim() !== ""
  );
  if (filasConTienda.length === 0) {
    return { items: [], tieneSobreStock: false };
  }

  const otraCodigo = otraSucursalPedido(params.sucursal);
  const otraSucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: otraCodigo },
    select: { id: true },
  });

  if (!otraSucursalRow) {
    return { items: [], tieneSobreStock: false };
  }

  const codTiendas = [
    ...new Set(filasConTienda.map((f) => f.codTienda!.trim())),
  ];

  const tiendas = await prisma.listaPrecioTienda.findMany({
    where: { codTienda: { in: codTiendas } },
    select: {
      codExt: true,
      codTienda: true,
      descripcionTienda: true,
      stockMaipu: true,
      stockGuaymallen: true,
      stockeable: true,
    },
  });

  const tiendaPorCodTienda = new Map<
    string,
    (typeof tiendas)[number]
  >();
  for (const t of tiendas) {
    const ct = (t.codTienda ?? "").trim();
    if (ct && !tiendaPorCodTienda.has(ct)) tiendaPorCodTienda.set(ct, t);
  }

  const codExts = [
    ...new Set(
      filasConTienda
        .map((f) => {
          const row = tiendaPorCodTienda.get(f.codTienda!.trim());
          return row ? normCodExt(row.codExt) : "";
        })
        .filter(Boolean)
    ),
  ];

  if (codExts.length === 0) {
    return { items: [], tieneSobreStock: false };
  }

  const stockFieldOtra = getStockFieldBySucursal(otraCodigo);

  const primaryByCodExt = new Map<string, string>();
  const lpp = await prisma.listaPrecioProveedor.findMany({
    where: { codExt: { in: codExts } },
    select: { codExt: true, idProveedor: true },
    orderBy: [{ codExt: "asc" }, { idProveedor: "asc" }],
  });
  for (const r of lpp) {
    const k = normCodExt(r.codExt);
    if (k && !primaryByCodExt.has(k)) {
      primaryByCodExt.set(k, r.idProveedor.trim());
    }
  }

  const otherRowsAll = await prisma.itemPedidoEnvio.findMany({
    where: {
      sucursalId: otraSucursalRow.id,
      tipoPedido: "REPOSICION",
      codExt: { in: codExts },
    },
    select: {
      codExt: true,
      idProveedor: true,
      reposicionCantConf: true,
    },
  });

  const otherListByCodExt = new Map<
    string,
    { idProveedor: string; reposicionCantConf: number | null }[]
  >();

  function appendOtra(cx: string, prov: string, conf: number | null) {
    const k = normCodExt(cx);
    if (!k) return;
    const list = otherListByCodExt.get(k) ?? [];
    const p = prov.trim();
    if (!list.some((x) => x.idProveedor === p)) {
      list.push({ idProveedor: p, reposicionCantConf: conf });
      otherListByCodExt.set(k, list);
    }
  }

  for (const r of otherRowsAll) {
    appendOtra(r.codExt, r.idProveedor, r.reposicionCantConf);
  }

  const needPrimary = codExts.filter((cx) => {
    const list = otherListByCodExt.get(cx);
    return !list || list.length === 0;
  });
  const orCond = needPrimary
    .map((cx) => {
      const prov = primaryByCodExt.get(cx);
      return prov ? { codExt: cx, idProveedor: prov } : null;
    })
    .filter((x): x is { codExt: string; idProveedor: string } => x != null);

  if (orCond.length > 0) {
    const extra = await prisma.itemPedidoEnvio.findMany({
      where: {
        sucursalId: otraSucursalRow.id,
        tipoPedido: "REPOSICION",
        OR: orCond,
      },
      select: {
        codExt: true,
        idProveedor: true,
        reposicionCantConf: true,
      },
    });
    for (const r of extra) {
      appendOtra(r.codExt, r.idProveedor, r.reposicionCantConf);
    }
  }

  function resolverTopeOtraSucursal(
    codExt: string,
    reposicionCantPedido: number | null | undefined
  ): number | null | undefined {
    const k = normCodExt(codExt);
    const list = otherListByCodExt.get(k);
    if (list && list.length > 0) {
      const mismoProv = list.find((x) => x.idProveedor === proveedorPedido);
      if (mismoProv) return mismoProv.reposicionCantConf;
      const conTope = list.find((x) => Number(x.reposicionCantConf ?? 0) > 0);
      if (conTope) return conTope.reposicionCantConf;
      return list[0]!.reposicionCantConf;
    }
    return reposicionCantPedido;
  }

  const items: SobreStockReposicionItem[] = [];

  for (const fila of filasConTienda) {
    const tienda = tiendaPorCodTienda.get(fila.codTienda!.trim());
    if (!tienda) continue;
    if (!tienda.stockeable) continue;

    const cx = normCodExt(tienda.codExt);
    if (!cx) continue;

    const topePedidoRow =
      fila.tipoPedido === "REPOSICION" ? fila.reposicionCantConf : null;

    const listOtra = otherListByCodExt.get(cx);
    const debeEvaluarOtra =
      (listOtra?.length ?? 0) > 0 || Number(topePedidoRow ?? 0) > 0;

    if (!debeEvaluarOtra) continue;

    const stockOtra = Number(tienda[stockFieldOtra] ?? 0);
    const topeParaOtra = resolverTopeOtraSucursal(cx, topePedidoRow);
    const ext = evaluarSobrestockEnValores(stockOtra, topeParaOtra);
    if (!ext) continue;

    items.push({
      idItemPedidoEnvio: fila.id,
      codExt: cx,
      codTienda: fila.codTienda?.trim() ?? null,
      descripcionProveedor: (fila.descripcionProveedor ?? "").trim(),
      descripcionTienda: fila.descripcionTienda ?? null,
      cantPedir: Number(fila.cantPedir ?? 0),
      stockSucursal: stockOtra,
      topeReposicion: ext.topeReposicion,
      sobreStock: ext.sobreStock,
      sucursalCodigoSobrestock: otraCodigo,
      origenDeteccion: "OTRA_SUCURSAL",
    });
  }

  return { items, tieneSobreStock: items.length > 0 };
}
