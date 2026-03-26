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

/** Filas REPOSICIÓN del pedido (mismas que usa el PDF si se pasan desde `getItemsYProveedorParaEnviar`). */
export interface PedidoReposicionRowInput {
  id: string;
  codExt: string;
  codTienda: string | null;
  descripcionProveedor: string | null;
  descripcionTienda: string | null;
  reposicionCantConf: number | null;
  cantPedir: number;
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

/**
 * Devuelve { sobreStock, topeReposicion } si hay sobrestock, o `null` si no aplica.
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

function normalizarFilaPedidoReposicion(
  r: PedidoReposicionRowInput
): PedidoReposicionRowInput {
  const cx = normCodExt(r.codExt);
  return {
    ...r,
    codExt: cx,
    codTienda: r.codTienda?.trim() || null,
    descripcionProveedor: r.descripcionProveedor ?? "",
    descripcionTienda: r.descripcionTienda ?? null,
  };
}

/**
 * Calcula el "sobrestock" para ítems de REPOSICION antes de generar el pedido.
 *
 * Si `pedidoReposicionRows` viene de `getItemsYProveedorParaEnviar().rows` filtradas a REPOSICIÓN,
 * se usa **la misma selección** que el PDF (evita desalinear una segunda query a `pedidos_mercaderia`).
 */
export async function getSobreStockReposicionItems(params: {
  proveedorId: string;
  sucursal: SucursalPedidoEnvio;
  pedidoReposicionRows?: PedidoReposicionRowInput[];
}): Promise<SobreStockReposicionResult> {
  const { proveedorId, sucursal, pedidoReposicionRows } = params;
  const proveedorPedido = proveedorId.trim();

  const sucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: sucursal },
    select: { id: true },
  });

  if (!sucursalRow) {
    return { items: [], tieneSobreStock: false };
  }

  let rows: PedidoReposicionRowInput[];
  if (pedidoReposicionRows != null) {
    rows = pedidoReposicionRows.map(normalizarFilaPedidoReposicion);
  } else {
    const dbRows = await prisma.itemPedidoEnvio.findMany({
      where: {
        idProveedor: proveedorPedido,
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
    rows = dbRows.map((r) =>
      normalizarFilaPedidoReposicion({
        id: r.id,
        codExt: r.codExt,
        codTienda: r.codTienda,
        descripcionProveedor: r.descripcionProveedor,
        descripcionTienda: r.descripcionTienda,
        reposicionCantConf: r.reposicionCantConf,
        cantPedir: r.cantPedir,
      })
    );
  }

  if (rows.length === 0) {
    return { items: [], tieneSobreStock: false };
  }

  const otraCodigo = otraSucursalPedido(sucursal);
  const otraSucursalRow = await prisma.sucursal.findUnique({
    where: { codigo: otraCodigo },
    select: { id: true },
  });

  const codExts = [...new Set(rows.map((r) => r.codExt).filter(Boolean))];
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

  const tiendaMap = new Map(
    tiendaRows.map((r) => [normCodExt(r.codExt), r])
  );

  type TiendaStock = (typeof tiendaRows)[number];
  const tiendaPorCodTienda = new Map<string, TiendaStock>();
  for (const t of tiendaRows) {
    const ct = (t.codTienda ?? "").trim();
    if (ct && !tiendaPorCodTienda.has(ct)) tiendaPorCodTienda.set(ct, t);
  }

  const codTiendasFallback = [
    ...new Set(
      rows
        .filter((r) => r.codExt && !tiendaMap.has(r.codExt) && r.codTienda)
        .map((r) => r.codTienda!.trim())
    ),
  ];

  if (codTiendasFallback.length > 0) {
    const porTienda = await prisma.listaPrecioTienda.findMany({
      where: { codTienda: { in: codTiendasFallback } },
      select: {
        codExt: true,
        codTienda: true,
        descripcionTienda: true,
        stockMaipu: true,
        stockGuaymallen: true,
      },
    });
    for (const t of porTienda) {
      const k = normCodExt(t.codExt);
      if (k && !tiendaMap.has(k)) tiendaMap.set(k, t);
      const ct = (t.codTienda ?? "").trim();
      if (ct && !tiendaPorCodTienda.has(ct)) tiendaPorCodTienda.set(ct, t);
    }
  }

  const primaryByCodExt = new Map<string, string>();
  if (codExts.length > 0) {
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
  }

  const otherRowsAll =
    otraSucursalRow != null && codExts.length > 0
      ? await prisma.itemPedidoEnvio.findMany({
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
        })
      : [];

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

  if (otraSucursalRow != null && codExts.length > 0) {
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
  }

  const items: SobreStockReposicionItem[] = [];

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

  for (const row of rows) {
    const cx = row.codExt;
    if (!cx) continue;

    let tienda = tiendaMap.get(cx);
    if (!tienda && row.codTienda) {
      tienda = tiendaPorCodTienda.get(row.codTienda.trim());
    }
    if (!tienda) continue;

    const base = {
      idItemPedidoEnvio: row.id,
      codExt: cx,
      codTienda: row.codTienda,
      descripcionProveedor: (row.descripcionProveedor ?? "").trim(),
      descripcionTienda: row.descripcionTienda ?? null,
      cantPedir: Number(row.cantPedir ?? 0),
    };

    const stockPedido = Number(tienda[stockFieldPedido] ?? 0);
    const local = evaluarSobrestockEnValores(
      stockPedido,
      row.reposicionCantConf
    );
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

    const listOtra = otherListByCodExt.get(cx);
    const debeEvaluarOtra =
      (listOtra?.length ?? 0) > 0 ||
      Number(row.reposicionCantConf ?? 0) > 0;

    if (!debeEvaluarOtra) continue;

    const stockOtra = Number(tienda[stockFieldOtra] ?? 0);
    const topeParaOtra = resolverTopeOtraSucursal(cx, row.reposicionCantConf);
    const ext = evaluarSobrestockEnValores(stockOtra, topeParaOtra);
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
