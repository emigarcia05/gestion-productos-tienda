import {
  computeStockeableDesdeStocks,
  getIdDepositoGuaymallen,
  getIdDepositoMaipu,
} from "@/lib/duxApi";
import { prisma } from "@/lib/prisma";

export {
  computeStockeableDesdeStocks,
  getIdDepositoMaipu,
  getIdDepositoGuaymallen,
};

export function getIdDepositoPorSucursalCodigo(codigo: string): number {
  return codigo.trim().toLowerCase() === "maipu"
    ? getIdDepositoMaipu()
    : getIdDepositoGuaymallen();
}

/** Stock real de un depósito DUX para un producto, o null si no existe fila. */
export async function getStockReal(
  codTienda: string,
  idDeposito: number
): Promise<number | null> {
  const row = await prisma.prodTiendaStock.findUnique({
    where: { codTienda_idDeposito: { codTienda, idDeposito } },
    select: { stockReal: true },
  });
  return row != null ? row.stockReal : null;
}

export async function getStockMaipu(codTienda: string): Promise<number> {
  return (await getStockReal(codTienda, getIdDepositoMaipu())) ?? 0;
}

export async function getStockGuaymallen(codTienda: string): Promise<number> {
  return (await getStockReal(codTienda, getIdDepositoGuaymallen())) ?? 0;
}

/** Mapa cod_tienda → stock_real para un depósito (0 si no hay fila). */
export async function buildMapStockPorDeposito(
  codTiendas: string[],
  idDeposito: number
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (codTiendas.length === 0) return map;
  const rows = await prisma.prodTiendaStock.findMany({
    where: { codTienda: { in: codTiendas }, idDeposito },
    select: { codTienda: true, stockReal: true },
  });
  for (const r of rows) {
    map.set(r.codTienda, r.stockReal);
  }
  return map;
}

export interface MapsStockSucursalesPrincipales {
  maipu: Map<string, number>;
  guaymallen: Map<string, number>;
}

/** Mapas Maipú y Guaymallén en una sola ronda (lecturas UI / pedidos). */
export async function buildMapsStockSucursalesPrincipales(
  codTiendas: string[]
): Promise<MapsStockSucursalesPrincipales> {
  const [maipu, guaymallen] = await Promise.all([
    buildMapStockPorDeposito(codTiendas, getIdDepositoMaipu()),
    buildMapStockPorDeposito(codTiendas, getIdDepositoGuaymallen()),
  ]);
  return { maipu, guaymallen };
}

export function getStockSucursalPrincipal(
  codTienda: string,
  sucursalCodigo: string,
  maps: MapsStockSucursalesPrincipales
): number {
  const m =
    sucursalCodigo.trim().toLowerCase() === "maipu" ? maps.maipu : maps.guaymallen;
  return m.get(codTienda.trim()) ?? 0;
}
