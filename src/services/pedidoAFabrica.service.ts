/**
 * Pedido A Fáb. — productos de lista del proveedor fábrica + métricas por sucursal.
 */

import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";
import { EST_POR_PROD_CARGA_DESDE } from "@/lib/estPorProdPeriodo";
import {
  buildMapStockPorDeposito,
  getIdDepositoPorSucursalCodigo,
} from "@/services/prodTiendaStock.service";

export type SucursalPedidoAFabrica = {
  id: string;
  codigo: string;
  nombre: string;
};

export type DatosSucursalProductoPedidoAFabrica = {
  /** `stock_real` del depósito principal de la sucursal; `null` si el ítem no tiene `cod_tienda`. */
  stockActual: number | null;
  /** Promedio mensual de `est_por_prod.vtas_en_un` (periodos con datos desde carga); `null` sin vínculo / sin ventas. */
  promVta: number | null;
};

export type ProductoPedidoAFabricaItem = {
  codExt: string;
  descripcion: string;
  codTienda: string | null;
  /** Clave = `sucursal.id`. */
  porSucursal: Record<string, DatosSucursalProductoPedidoAFabrica>;
};

export type ProductosPedidoAFabricaResult = {
  sucursales: SucursalPedidoAFabrica[];
  productos: ProductoPedidoAFabricaItem[];
  total: number;
  totalPaginas: number;
};

const VACIO: ProductosPedidoAFabricaResult = {
  sucursales: [],
  productos: [],
  total: 0,
  totalPaginas: 0,
};

/** Sucursales habilitadas para pedido (`pedido = true`), orden por nombre. */
export async function listarSucursalesParaPedidoAFabrica(): Promise<
  SucursalPedidoAFabrica[]
> {
  const rows = await prisma.sucursal.findMany({
    where: { pedido: true },
    select: { id: true, codigo: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return rows;
}

function emptyPorSucursal(
  sucursales: SucursalPedidoAFabrica[]
): Record<string, DatosSucursalProductoPedidoAFabrica> {
  const out: Record<string, DatosSucursalProductoPedidoAFabrica> = {};
  for (const s of sucursales) {
    out[s.id] = { stockActual: null, promVta: null };
  }
  return out;
}

/**
 * Promedio mensual de ventas por (`cod_tienda`, `sucursal_id`) desde `EST_POR_PROD_CARGA_DESDE`.
 */
async function buildMapPromVtaMensual(
  codTiendas: string[],
  sucursalIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (codTiendas.length === 0 || sucursalIds.length === 0) return map;

  const { mes: mesMin, anio: anioMin } = EST_POR_PROD_CARGA_DESDE;
  const rows = await prisma.estPorProd.findMany({
    where: {
      codTienda: { in: codTiendas },
      sucursalId: { in: sucursalIds },
      OR: [{ anio: { gt: anioMin } }, { anio: anioMin, mes: { gte: mesMin } }],
    },
    select: { codTienda: true, sucursalId: true, vtasEnUn: true },
  });

  const acc = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const key = `${r.codTienda}\0${r.sucursalId}`;
    const prev = acc.get(key) ?? { sum: 0, n: 0 };
    prev.sum += Number(r.vtasEnUn);
    prev.n += 1;
    acc.set(key, prev);
  }
  for (const [key, { sum, n }] of acc) {
    if (n > 0) map.set(key, sum / n);
  }
  return map;
}

/**
 * Lista productos de `prod_precios_provee` del proveedor, solo si `es_fabrica = true`.
 * Descripción = `descripcion_proveedor`. Solo filas `habilitado = true`.
 * Por cada sucursal `pedido = true`: **STOCK ACTUAL** + **PROM. VTA.**
 */
export async function listarProductosPorProveedorFabrica(
  proveedorId: string,
  pagina: number = 1
): Promise<ProductosPedidoAFabricaResult> {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: proveedorId, esFabrica: true },
    select: { id: true },
  });
  if (!proveedor) return VACIO;

  const sucursales = await listarSucursalesParaPedidoAFabrica();

  const where = {
    idProveedor: proveedorId,
    habilitado: true,
  } as const;

  const [total, filas] = await Promise.all([
    prisma.listaPrecioProveedor.count({ where }),
    prisma.listaPrecioProveedor.findMany({
      where,
      select: {
        codExt: true,
        descripcionProveedor: true,
        codTiendaVinculo: true,
      },
      orderBy: { descripcionProveedor: "asc" },
      skip: skipForPagina(pagina),
      take: PAGE_SIZE,
    }),
  ]);

  const codTiendas = [
    ...new Set(
      filas
        .map((f) => f.codTiendaVinculo?.trim())
        .filter((c): c is string => Boolean(c))
    ),
  ];

  const stockMapsByCodigo = new Map<string, Map<string, number>>();
  const codigosUnicos = [...new Set(sucursales.map((s) => s.codigo.trim().toLowerCase()))];
  await Promise.all(
    codigosUnicos.map(async (codigo) => {
      const idDeposito = getIdDepositoPorSucursalCodigo(codigo);
      const map = await buildMapStockPorDeposito(codTiendas, idDeposito);
      stockMapsByCodigo.set(codigo, map);
    })
  );

  const promMap = await buildMapPromVtaMensual(
    codTiendas,
    sucursales.map((s) => s.id)
  );

  const productos: ProductoPedidoAFabricaItem[] = filas.map((f) => {
    const codTienda = f.codTiendaVinculo?.trim() || null;
    const porSucursal = emptyPorSucursal(sucursales);
    if (codTienda) {
      for (const s of sucursales) {
        const codigo = s.codigo.trim().toLowerCase();
        const stockMap = stockMapsByCodigo.get(codigo);
        const stockActual = stockMap?.get(codTienda) ?? 0;
        const promVta = promMap.get(`${codTienda}\0${s.id}`) ?? null;
        porSucursal[s.id] = { stockActual, promVta };
      }
    }
    return {
      codExt: f.codExt,
      descripcion: f.descripcionProveedor,
      codTienda,
      porSucursal,
    };
  });

  return {
    sucursales,
    productos,
    total,
    totalPaginas: totalPaginasFromTotal(total),
  };
}
