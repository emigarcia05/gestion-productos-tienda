/**
 * Sincronización de lista_precios_tienda desde la API DUX ERP.
 * Loop paginado (50 ítems por petición), mapeo, upsert por lotes y logs de progreso.
 */

import { prisma } from "@/lib/prisma";
import {
  fetchItemsPage,
  DUX_API_PAGE_LIMIT,
  type ItemDux,
} from "@/lib/duxApi";

/** Pausa entre peticiones para evitar 429 Too Many Requests (configurable por env). */
const DELAY_MS = Number(process.env.DUX_SYNC_DELAY_MS) || 4000;
const COD_TIENDA = process.env.DUX_COD_TIENDA ?? "DUX";

/** Segundos aproximados por lote de 50 ítems (delay + petición + DB), para estimar tiempo restante. */
export const SYNC_SECONDS_PER_BATCH = DELAY_MS / 1000 + 1.5;

export interface SyncListaPrecioTiendaResult {
  creados: number;
  actualizados: number;
  totalProcesados: number;
  totalApi: number;
  duracionMs: number;
  errores: string[];
}

function itemDuxToRecord(item: ItemDux) {
  const codExterno = (item.codigoExterno ?? item.codItem).trim() || item.codItem;
  return {
    codExterno,
    codTienda: COD_TIENDA,
    rubro: item.rubro ?? null,
    subRubro: item.subRubro ?? null,
    marca: item.marca ?? null,
    proveedor: item.proveedorDux ?? null,
    descripcionTienda: item.descripcion ?? null,
    costoCompra: item.costo,
    pxListaTienda: item.precioLista,
    stockMaipu: item.stockMaipu,
    stockGuaymallen: item.stockGuaymallen,
  };
}

export interface SyncProgressCallback {
  onProgress?(processed: number, total: number): void;
}

/**
 * Sincroniza productos desde la API DUX hacia lista_precios_tienda.
 * Bucle: consultar (50) -> mapear -> upsert en lote -> delay -> repetir hasta no haber más.
 * Si se pasa onProgress, se invoca en cada iteración con (procesados, total).
 */
export async function syncListaPrecioTiendaFromDux(
  options?: SyncProgressCallback
): Promise<SyncListaPrecioTiendaResult> {
  const inicioMs = Date.now();
  let offset = 0;
  let totalApi = 0;
  let totalProcesados = 0;
  const errores: string[] = [];
  const onProgress = options?.onProgress;

  const countBefore = await prisma.listaPrecioTienda.count();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { results, total, hasMore } = await fetchItemsPage(offset, DUX_API_PAGE_LIMIT);

    if (total > 0 && totalApi === 0) totalApi = total;
    if (results.length === 0) break;

    const procesadosHastaAhora = offset + results.length;
    if (onProgress && totalApi > 0) onProgress(procesadosHastaAhora, totalApi);
    const pct =
      totalApi > 0 ? Math.round((procesadosHastaAhora / totalApi) * 100) : 0;
    console.log(
      `Procesando offset ${offset} de un total de ${totalApi}... (${pct}% completado)`
    );

    const batch = results.map(itemDuxToRecord).filter((r) => r.codExterno);

    if (batch.length > 0) {
      try {
        await prisma.$transaction(
          batch.map((row) =>
            prisma.listaPrecioTienda.upsert({
              where: { codExterno: row.codExterno },
              create: {
                ...row,
                costoCompra: row.costoCompra,
                pxListaTienda: row.pxListaTienda,
                stockMaipu: row.stockMaipu,
                stockGuaymallen: row.stockGuaymallen,
              },
              update: {
                codTienda: row.codTienda,
                rubro: row.rubro,
                subRubro: row.subRubro,
                marca: row.marca,
                proveedor: row.proveedor,
                descripcionTienda: row.descripcionTienda,
                costoCompra: row.costoCompra,
                pxListaTienda: row.pxListaTienda,
                stockMaipu: row.stockMaipu,
                stockGuaymallen: row.stockGuaymallen,
                lastSync: new Date(),
              },
            })
          )
        );
        totalProcesados += batch.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errores.push(`Offset ${offset}: ${msg}`);
        console.error(`Error en lote offset ${offset}:`, msg);
      }
    }

    if (!hasMore || results.length === 0) break;

    offset += DUX_API_PAGE_LIMIT;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const duracionMs = Date.now() - inicioMs;
  const countAfter = await prisma.listaPrecioTienda.count();
  const creados = Math.max(0, countAfter - countBefore);
  const actualizados = Math.max(0, totalProcesados - creados);

  return {
    creados,
    actualizados,
    totalProcesados,
    totalApi,
    duracionMs,
    errores,
  };
}
