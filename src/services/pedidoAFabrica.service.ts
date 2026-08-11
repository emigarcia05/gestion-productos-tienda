/**
 * Pedido A Fáb. — productos de lista del proveedor fábrica + métricas por sucursal.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, skipForPagina, totalPaginasFromTotal } from "@/lib/pagination";
import {
  calcularPromVtaDiariaDesdeTotal,
  periodosUltimosDosMesesCompletos,
} from "@/lib/pedidoAFabricaPromVta";
import {
  buildMapStockPorDeposito,
  getIdDepositoPorSucursalCodigo,
} from "@/services/prodTiendaStock.service";
import { buildMapCantAPedirAFabricaPorProveedor } from "@/services/pedidosEnvio.service";

export type SucursalPedidoAFabrica = {
  id: string;
  codigo: string;
  nombre: string;
};

export type DatosSucursalProductoPedidoAFabrica = {
  /** `stock_real` del depósito principal de la sucursal; `null` si el ítem no tiene `cod_tienda`. */
  stockActual: number | null;
  /**
   * Promedio diario de venta (entero): suma `est_por_prod` de los 2 meses previos / 48
   * (24 días × 2), redondeado. `null` sin vínculo tienda.
   */
  promVta: number | null;
};

export type ProductoPedidoAFabricaItem = {
  codExt: string;
  /**
   * Prioridad: `prod_tienda.descripcion_tienda` (vía `cod_tienda`) →
   * fallback `prod_precios_provee.descripcion_proveedor`.
   */
  descripcion: string;
  codTienda: string | null;
  /** Clave = `sucursal.id`. */
  porSucursal: Record<string, DatosSucursalProductoPedidoAFabrica>;
};

export type FiltrosProductosPedidoAFabrica = {
  marca?: string;
  rubro?: string;
  subRubro?: string;
  q?: string;
  pagina?: number;
};

export type ProductosPedidoAFabricaResult = {
  sucursales: SucursalPedidoAFabrica[];
  productos: ProductoPedidoAFabricaItem[];
  total: number;
  totalPaginas: number;
  /** Opciones dinámicas (prod_tienda vía vínculo del proveedor). */
  marcas: string[];
  rubros: string[];
  subRubros: string[];
  /** Cantidades `A FÁBRICA` persistidas en `prod_ped_merc` (`cod_ext` → cant). */
  cantAPedirByCodExt: Record<string, number>;
};

const VACIO: ProductosPedidoAFabricaResult = {
  sucursales: [],
  productos: [],
  total: 0,
  totalPaginas: 0,
  marcas: [],
  rubros: [],
  subRubros: [],
  cantAPedirByCodExt: {},
};

type CampoFiltroTienda = "marca" | "rubro" | "subRubro";

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
 * PROM. VTA. diario por (`cod_tienda`, `sucursal_id`):
 * suma de ventas de los 2 meses calendario previos / 48, redondeado.
 */
async function buildMapPromVtaDiaria(
  codTiendas: string[],
  sucursalIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (codTiendas.length === 0 || sucursalIds.length === 0) return map;

  const { anterior, reciente } = periodosUltimosDosMesesCompletos();
  const rows = await prisma.estPorProd.findMany({
    where: {
      codTienda: { in: codTiendas },
      sucursalId: { in: sucursalIds },
      OR: [
        { anio: anterior.anio, mes: anterior.mes },
        { anio: reciente.anio, mes: reciente.mes },
      ],
    },
    select: { codTienda: true, sucursalId: true, vtasEnUn: true },
  });

  const sumas = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.codTienda}\0${r.sucursalId}`;
    sumas.set(key, (sumas.get(key) ?? 0) + Number(r.vtasEnUn));
  }
  for (const [key, total] of sumas) {
    map.set(key, calcularPromVtaDiariaDesdeTotal(total));
  }
  return map;
}

/** Búsqueda por descripción tienda (vínculo) o descripción proveedor. */
function filtroTextoDescripcion(
  q: string
): Prisma.ListaPrecioProveedorWhereInput | undefined {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  return {
    AND: tokens.map((token) => ({
      OR: [
        {
          descripcionProveedor: {
            contains: token,
            mode: "insensitive" as const,
          },
        },
        {
          prodTienda: {
            is: {
              descripcionTienda: {
                contains: token,
                mode: "insensitive" as const,
              },
            },
          },
        },
      ],
    })),
  };
}

function buildWhereLista(
  proveedorId: string,
  filtros: FiltrosProductosPedidoAFabrica,
  exclude?: CampoFiltroTienda
): Prisma.ListaPrecioProveedorWhereInput {
  const parts: Prisma.ListaPrecioProveedorWhereInput[] = [
    { idProveedor: proveedorId, habilitado: true },
  ];

  const tiendaAnd: Prisma.ProdTiendaWhereInput[] = [];
  const marca = filtros.marca?.trim() ?? "";
  const rubro = filtros.rubro?.trim() ?? "";
  const subRubro = filtros.subRubro?.trim() ?? "";
  if (exclude !== "marca" && marca) tiendaAnd.push({ marca });
  if (exclude !== "rubro" && rubro) tiendaAnd.push({ rubro });
  if (exclude !== "subRubro" && subRubro) tiendaAnd.push({ subRubro });
  if (tiendaAnd.length > 0) {
    parts.push({ prodTienda: { is: { AND: tiendaAnd } } });
  }

  const texto = filtroTextoDescripcion(filtros.q ?? "");
  if (texto) parts.push(texto);

  return parts.length === 1 ? parts[0]! : { AND: parts };
}

async function opcionesCampoTienda(
  whereLista: Prisma.ListaPrecioProveedorWhereInput,
  campo: CampoFiltroTienda
): Promise<string[]> {
  const rows = await prisma.listaPrecioProveedor.findMany({
    where: {
      AND: [
        whereLista,
        { codTiendaVinculo: { not: null } },
        { prodTienda: { is: { [campo]: { not: null } } } },
      ],
    },
    select: {
      prodTienda: { select: { marca: true, rubro: true, subRubro: true } },
    },
  });
  const set = new Set<string>();
  for (const r of rows) {
    const v = r.prodTienda?.[campo]?.trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Lista productos de `prod_precios_provee` del proveedor, solo si `es_fabrica = true`.
 * Descripción: `descripcion_tienda` (vínculo) → fallback `descripcion_proveedor`.
 * Solo filas `habilitado = true`. Filtros opcionales: marca / rubro / sub_rubro (tienda) + q.
 * Por cada sucursal `pedido = true`: **STOCK ACTUAL** + **PROM. VTA.**
 */
export async function listarProductosPorProveedorFabrica(
  proveedorId: string,
  filtros: FiltrosProductosPedidoAFabrica = {}
): Promise<ProductosPedidoAFabricaResult> {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: proveedorId, esFabrica: true },
    select: { id: true },
  });
  if (!proveedor) return VACIO;

  const pagina = filtros.pagina ?? 1;
  const sucursales = await listarSucursalesParaPedidoAFabrica();

  const whereItems = buildWhereLista(proveedorId, filtros);
  const whereMarcas = buildWhereLista(proveedorId, filtros, "marca");
  const whereRubros = buildWhereLista(proveedorId, filtros, "rubro");
  const whereSubRubros = buildWhereLista(proveedorId, filtros, "subRubro");

  const [total, filas, marcas, rubros, subRubros, cantAPedirByCodExt] =
    await Promise.all([
    prisma.listaPrecioProveedor.count({ where: whereItems }),
    prisma.listaPrecioProveedor.findMany({
      where: whereItems,
      select: {
        codExt: true,
        descripcionProveedor: true,
        codTiendaVinculo: true,
        prodTienda: {
          select: { descripcionTienda: true },
        },
      },
      orderBy: { descripcionProveedor: "asc" },
      skip: skipForPagina(pagina),
      take: PAGE_SIZE,
    }),
    opcionesCampoTienda(whereMarcas, "marca"),
    opcionesCampoTienda(whereRubros, "rubro"),
    opcionesCampoTienda(whereSubRubros, "subRubro"),
    buildMapCantAPedirAFabricaPorProveedor(proveedorId),
  ]);

  const codTiendas = [
    ...new Set(
      filas
        .map((f) => f.codTiendaVinculo?.trim())
        .filter((c): c is string => Boolean(c))
    ),
  ];

  const stockMapsByCodigo = new Map<string, Map<string, number>>();
  const codigosUnicos = [
    ...new Set(sucursales.map((s) => s.codigo.trim().toLowerCase())),
  ];
  await Promise.all(
    codigosUnicos.map(async (codigo) => {
      const idDeposito = getIdDepositoPorSucursalCodigo(codigo);
      const map = await buildMapStockPorDeposito(codTiendas, idDeposito);
      stockMapsByCodigo.set(codigo, map);
    })
  );

  const promMap = await buildMapPromVtaDiaria(
    codTiendas,
    sucursales.map((s) => s.id)
  );

  const productos: ProductoPedidoAFabricaItem[] = filas.map((f) => {
    const codTienda = f.codTiendaVinculo?.trim() || null;
    const descTienda = f.prodTienda?.descripcionTienda?.trim() || "";
    const descripcion = descTienda || f.descripcionProveedor;
    const porSucursal = emptyPorSucursal(sucursales);
    if (codTienda) {
      for (const s of sucursales) {
        const codigo = s.codigo.trim().toLowerCase();
        const stockMap = stockMapsByCodigo.get(codigo);
        const stockActual = stockMap?.get(codTienda) ?? 0;
        const key = `${codTienda}\0${s.id}`;
        const promVta = promMap.has(key) ? (promMap.get(key) as number) : 0;
        porSucursal[s.id] = { stockActual, promVta };
      }
    }
    return {
      codExt: f.codExt,
      descripcion,
      codTienda,
      porSucursal,
    };
  });

  return {
    sucursales,
    productos,
    total,
    totalPaginas: totalPaginasFromTotal(total),
    marcas,
    rubros,
    subRubros,
    cantAPedirByCodExt,
  };
}
