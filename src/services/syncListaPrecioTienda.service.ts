/**
 * Sincronización de lista_precios_tienda desde la API DUX ERP.
 * Fase 1: bucle paginado (50 ítems por petición) acumulando todos en memoria.
 * Fase 2: bulk upsert en Neon por chunks de 500 (cod_ext como conflicto) para evitar timeout.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchItemsPage,
  DUX_API_PAGE_LIMIT,
  type ItemDux,
} from "@/lib/duxApi";
import { vincularProveedoresPorCodExt } from "@/services/vinculosPorCodExt.service";

/** Pausa entre peticiones (mínimo 5s según rate limit DUX: 1 petición cada 5 segundos). */
const DELAY_MS = Math.max(5000, Number(process.env.DUX_SYNC_DELAY_MS) || 5000);
const COD_TIENDA = process.env.DUX_COD_TIENDA ?? "DUX";

/** Tamaño de cada chunk al persistir en Neon (evitar timeout). */
const CHUNK_PERSIST_SIZE = 500;

/** Timeout (ms) de la transacción interactiva por chunk (500 upserts pueden superar 5s por defecto). */
const TRANSACTION_TIMEOUT_MS = 60_000;

/** Máximo segundos por petición de página; si no hay respuesta, se da por trabado. */
const PAGINA_TIMEOUT_MS = 15_000;

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

function itemDuxToRecord(item: ItemDux) {
  const codExt = (item.codigoExterno ?? item.codItem).trim() || item.codItem;
  const codTienda = (item.codItem ?? "").trim() || COD_TIENDA;
  return {
    codExt,
    codTienda,
    rubro: item.rubro ?? null,
    subRubro: item.subRubro ?? null,
    marca: item.marca ?? null,
    proveedor: item.proveedorDux ?? null,
    descripcionTienda: item.descripcion ?? null,
    costoCompra: Number(item.costo) || 0,
    pxListaTienda: Number(item.precioLista) || 0,
    stockMaipu: Math.round(Number(item.stockMaipu) || 0),
    stockGuaymallen: Math.round(Number(item.stockGuaymallen) || 0),
  };
}

type RecordTienda = ReturnType<typeof itemDuxToRecord>;

export type SyncPhase = "sincronizando" | "guardando";

export interface SyncProgressCallback {
  onProgress?(processed: number, total: number, phase?: SyncPhase): void;
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
  // #region agent log
  fetch('http://127.0.0.1:7462/ingest/4aaad926-1e9e-4d0d-bfdd-1211332926ae',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'891179'},body:JSON.stringify({sessionId:'891179',location:'syncListaPrecioTienda.service.ts:syncListaPrecioTiendaFromDux',message:'sync started',data:{},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  const inicioMs = Date.now();
  const errores: string[] = [];
  const onProgress = options?.onProgress;

  const todosLosProductos: RecordTienda[] = [];
  let offset = 0;
  let totalApi = 0;

  const countBefore = await prisma.listaPrecioTienda.count();

  // ─── Fase 1: recorrer API y acumular en memoria (sin guardar en DB) ───
  const timeoutPromise = (): Promise<never> =>
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("La petición a DUX no respondió a tiempo (15 s). Reintentá más tarde.")),
        PAGINA_TIMEOUT_MS
      )
    );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { results, total, hasMore } = await Promise.race([
      fetchItemsPage(offset, DUX_API_PAGE_LIMIT),
      timeoutPromise(),
    ]);

    if (total > 0 && totalApi === 0) totalApi = total;
    if (results.length === 0) break;

    const batch = results.map(itemDuxToRecord).filter((r) => r.codExt);
    todosLosProductos.push(...batch);

    const procesadosHastaAhora = todosLosProductos.length;
    if (onProgress && totalApi > 0) onProgress(procesadosHastaAhora, totalApi, "sincronizando");
    const pct = totalApi > 0 ? Math.round((procesadosHastaAhora / totalApi) * 100) : 0;
    console.log(
      `Procesando offset ${offset} de un total de ${totalApi}... (${pct}% completado)`
    );

    if (!hasMore || results.length === 0) break;

    offset += DUX_API_PAGE_LIMIT;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const totalSincronizados = todosLosProductos.length;

  // #region agent log
  fetch('http://127.0.0.1:7462/ingest/4aaad926-1e9e-4d0d-bfdd-1211332926ae',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'891179'},body:JSON.stringify({sessionId:'891179',location:'syncListaPrecioTienda.service.ts:phase2_start',message:'phase 1 done, starting persist',data:{totalSincronizados,totalApi},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // ─── Fase 2: persistencia masiva por chunks de 500 (evitar timeout Neon) ───
  // Prisma Decimal en PostgreSQL requiere Prisma.Decimal; deduplicar por codExt (último gana).
  // Marcas: se resuelve el texto de la API a la tabla marcas y se asigna idMarca.
  if (totalSincronizados > 0) {
    if (onProgress) onProgress(0, totalSincronizados, "guardando");
    for (let i = 0; i < todosLosProductos.length; i += CHUNK_PERSIST_SIZE) {
      const chunkRaw = todosLosProductos.slice(i, i + CHUNK_PERSIST_SIZE);
      const byCodExt = new Map<string, RecordTienda>();
      for (const row of chunkRaw) byCodExt.set(row.codExt, row);
      const chunk = Array.from(byCodExt.values());
      try {
        // #region agent log
        if (i === 0) fetch('http://127.0.0.1:7462/ingest/4aaad926-1e9e-4d0d-bfdd-1211332926ae',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'891179'},body:JSON.stringify({sessionId:'891179',location:'syncListaPrecioTienda.service.ts:first_chunk',message:'first persist chunk',data:{chunkSize:chunk.length},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        await prisma.$transaction(
          async (tx) => {
            const marcasUnicas = [
              ...new Set(
                chunk
                  .map((r) => r.marca?.trim())
                  .filter((n): n is string => Boolean(n && n.length > 0))
              ),
            ];
            const mapaMarca = new Map<string, string>();
            for (const nombre of marcasUnicas) {
              const m = await tx.marca.upsert({
                where: { nombre },
                create: { nombre },
                update: {},
              });
              mapaMarca.set(nombre, m.id);
            }
            for (const row of chunk) {
              const nombreMarca = row.marca?.trim();
              const idMarca = nombreMarca ? mapaMarca.get(nombreMarca) ?? null : null;
              await tx.listaPrecioTienda.upsert({
                where: { codExt: row.codExt },
                create: {
                  codExt: row.codExt,
                  codTienda: row.codTienda,
                  rubro: row.rubro,
                  subRubro: row.subRubro,
                  marca: row.marca,
                  idMarca,
                  proveedor: row.proveedor,
                  descripcionTienda: row.descripcionTienda,
                  costoCompra: new Prisma.Decimal(row.costoCompra),
                  pxListaTienda: new Prisma.Decimal(row.pxListaTienda),
                  stockMaipu: row.stockMaipu,
                  stockGuaymallen: row.stockGuaymallen,
                },
                update: {
                  codTienda: row.codTienda,
                  rubro: row.rubro,
                  subRubro: row.subRubro,
                  marca: row.marca,
                  idMarca,
                  proveedor: row.proveedor,
                  descripcionTienda: row.descripcionTienda,
                  costoCompra: new Prisma.Decimal(row.costoCompra),
                  pxListaTienda: new Prisma.Decimal(row.pxListaTienda),
                  stockMaipu: row.stockMaipu,
                  stockGuaymallen: row.stockGuaymallen,
                  lastSync: new Date(),
                },
              });
            }
          },
          { timeout: TRANSACTION_TIMEOUT_MS }
        );
        const persistedSoFar = Math.min(i + chunk.length, totalSincronizados);
        if (onProgress) onProgress(persistedSoFar, totalSincronizados, "guardando");
        console.log(
          `Persistido chunk ${Math.floor(i / CHUNK_PERSIST_SIZE) + 1}: ${chunk.length} productos (${persistedSoFar}/${totalSincronizados})`
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? e.stack : "";
        errores.push(`Chunk offset ${i}: ${msg}`);
        console.error(`Error persistiendo chunk en offset ${i}:`, msg, stack);
      }
    }
  }

  // Vinculación automática por cod_ext: precios_proveedores.id_lista_precios_tienda = precios_tienda.id donde cod_ext coincide
  try {
    await vincularProveedoresPorCodExt();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errores.push(`Vinculación por cod_ext: ${msg}`);
    console.error("Error en vinculación automática por cod_ext:", msg);
  }

  const duracionMs = Date.now() - inicioMs;
  const countAfter = await prisma.listaPrecioTienda.count();
  const creados = Math.max(0, countAfter - countBefore);
  const actualizados = Math.max(0, totalSincronizados - creados);

  // #region agent log
  fetch('http://127.0.0.1:7462/ingest/4aaad926-1e9e-4d0d-bfdd-1211332926ae',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'891179'},body:JSON.stringify({sessionId:'891179',location:'syncListaPrecioTienda.service.ts:sync_success',message:'sync completed',data:{creados,actualizados,totalProcesados:totalSincronizados,duracionMs},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  return {
    creados,
    actualizados,
    totalProcesados: totalSincronizados,
    totalApi,
    duracionMs,
    errores,
  };
}
