/**
 * Sincronización de lista_precios_tienda desde la API DUX ERP.
 * Fase 1: bucle paginado (50 ítems por petición) acumulando todos en memoria.
 * Fase 2: bulk upsert en Neon por chunks de 500 (cod_ext como conflicto) para evitar timeout.
 */

import { prisma } from "@/lib/prisma";
import {
  fetchItemsPage,
  DUX_API_PAGE_LIMIT,
  type ItemDux,
} from "@/lib/duxApi";

/** Pausa entre peticiones a la API para evitar 429 Too Many Requests (configurable por env). */
const DELAY_MS = Number(process.env.DUX_SYNC_DELAY_MS) || 4000;
const COD_TIENDA = process.env.DUX_COD_TIENDA ?? "DUX";

/** Tamaño de cada chunk al persistir en Neon (evitar timeout). */
const CHUNK_PERSIST_SIZE = 500;

/** Segundos aproximados por lote de 50 ítems (delay + petición), para estimar tiempo restante. */
export const SYNC_SECONDS_PER_BATCH = DELAY_MS / 1000 + 1.5;

export interface SyncListaPrecioTiendaResult {
  creados: number;
  actualizados: number;
  totalProcesados: number;
  totalApi: number;
  duracionMs: number;
  errores: string[];
}

type RecordTienda = ReturnType<typeof itemDuxToRecord>;

function itemDuxToRecord(item: ItemDux): RecordTienda {
  const codExt = (item.codigoExterno ?? item.codItem).trim() || item.codItem;
  return {
    codExt,
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
 * 1) Acumula todos los productos en memoria (array) recorriendo la API de 50 en 50.
 * 2) Al finalizar el bucle, persiste en Neon por chunks de 500 (ON CONFLICT cod_ext DO UPDATE).
 * totalProcesados = largo del array acumulado.
 */
export async function syncListaPrecioTiendaFromDux(
  options?: SyncProgressCallback
): Promise<SyncListaPrecioTiendaResult> {
  const inicioMs = Date.now();
  const errores: string[] = [];
  const onProgress = options?.onProgress;

  const todosLosProductos: RecordTienda[] = [];
  let offset = 0;
  let totalApi = 0;

  const countBefore = await prisma.listaPrecioTienda.count();

  // ─── Fase 1: recorrer API y acumular en memoria (sin guardar en DB) ───
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { results, total, hasMore } = await fetchItemsPage(offset, DUX_API_PAGE_LIMIT);

    if (total > 0 && totalApi === 0) totalApi = total;
    if (results.length === 0) break;

    const batch = results.map(itemDuxToRecord).filter((r) => r.codExt);
    todosLosProductos.push(...batch);

    const procesadosHastaAhora = todosLosProductos.length;
    if (onProgress && totalApi > 0) onProgress(procesadosHastaAhora, totalApi);
    const pct = totalApi > 0 ? Math.round((procesadosHastaAhora / totalApi) * 100) : 0;
    console.log(
      `Procesando offset ${offset} de un total de ${totalApi}... (${pct}% completado)`
    );

    if (!hasMore || results.length === 0) break;

    offset += DUX_API_PAGE_LIMIT;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const totalSincronizados = todosLosProductos.length;

  // ─── Fase 2: persistencia masiva por chunks de 500 (evitar timeout Neon) ───
  if (totalSincronizados > 0) {
    for (let i = 0; i < todosLosProductos.length; i += CHUNK_PERSIST_SIZE) {
      const chunk = todosLosProductos.slice(i, i + CHUNK_PERSIST_SIZE);
      try {
        await prisma.$transaction(
          chunk.map((row) =>
            prisma.listaPrecioTienda.upsert({
              where: { codExt: row.codExt },
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
        console.log(
          `Persistido chunk ${Math.floor(i / CHUNK_PERSIST_SIZE) + 1}: ${chunk.length} productos (${i + chunk.length}/${totalSincronizados})`
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errores.push(`Chunk offset ${i}: ${msg}`);
        console.error(`Error persistiendo chunk en offset ${i}:`, msg);
      }
    }
  }

  const duracionMs = Date.now() - inicioMs;
  const countAfter = await prisma.listaPrecioTienda.count();
  const creados = Math.max(0, countAfter - countBefore);
  const actualizados = Math.max(0, totalSincronizados - creados);

  return {
    creados,
    actualizados,
    totalProcesados: totalSincronizados,
    totalApi,
    duracionMs,
    errores,
  };
}
