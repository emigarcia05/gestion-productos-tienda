/**
 * Sincronización de prod_tienda desde la API DUX ERP.
 * Fase 1: bucle paginado (50 ítems por petición) acumulando todos en memoria.
 * Fase 2: bulk upsert en Neon por chunks de 500 (cod_tienda) + listas DUX multi-precio.
 * Fase 3: limpieza de filas locales cuyo cod_tienda ya no llega desde DUX.
 * Fase 4: marcar inactivas listas DUX que no aparecieron en la corrida.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchItemsPage,
  DUX_API_PAGE_LIMIT,
  type ItemDux,
} from "@/lib/duxApi";
import { getSyncDuxStatusFromDb } from "@/lib/syncDuxStatusDb";

/** Se lanza cuando el usuario cancela la sync vía API (flag `running` en BD). */
export class SyncListaPrecioTiendaCancelledError extends Error {
  constructor() {
    super("Sincronización cancelada por el usuario.");
    this.name = "SyncListaPrecioTiendaCancelledError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

async function assertListaPrecioTiendaSyncNotCancelled(): Promise<void> {
  const st = await getSyncDuxStatusFromDb();
  if (!st.running) {
    throw new SyncListaPrecioTiendaCancelledError();
  }
}

/** Pausa entre peticiones (mínimo 5s según rate limit DUX: 1 petición cada 5 segundos). */
const DELAY_MS = Math.max(5000, Number(process.env.DUX_SYNC_DELAY_MS) || 5000);
const COD_TIENDA = process.env.DUX_COD_TIENDA ?? "DUX";

/** Tamaño de cada chunk al persistir en Neon (evitar timeout). */
const CHUNK_PERSIST_SIZE = 500;
const CHUNK_DELETE_SIZE = 500;

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

/** Mapea ítem DUX a la fila de upsert prod_tienda. `cod_ext` y `proveedor` quedan fuera del sync (§1.4.2). */
function itemDuxToProdTiendaRecord(item: ItemDux) {
  const codTienda = (item.codItem ?? "").trim() || COD_TIENDA;
  return {
    codTienda,
    rubro: item.rubro ?? null,
    subRubro: item.subRubro ?? null,
    marca: item.marca ?? null,
    descripcionTienda: item.descripcion ?? null,
    costoCompra: Number(item.costo) || 0,
    stockMaipu: Math.round(Number(item.stockMaipu) || 0),
    stockGuaymallen: Math.round(Number(item.stockGuaymallen) || 0),
    stockeable: item.stockeable,
    precios: item.precios,
  };
}

type RecordProdTienda = ReturnType<typeof itemDuxToProdTiendaRecord>;

async function syncListasPreciosEnTransaccion(
  tx: Prisma.TransactionClient,
  items: RecordProdTienda[],
  idListasVistas: Set<number>
): Promise<void> {
  const now = new Date();
  for (const row of items) {
    const idsEnItem = new Set<number>();
    for (const pl of row.precios) {
      if (!Number.isFinite(pl.idLista)) continue;
      idsEnItem.add(pl.idLista);
      idListasVistas.add(pl.idLista);
      await tx.prodListaDux.upsert({
        where: { idLista: pl.idLista },
        create: {
          idLista: pl.idLista,
          nombre: pl.nombre,
          activa: true,
          ultimaSync: now,
        },
        update: {
          nombre: pl.nombre,
          activa: true,
          ultimaSync: now,
        },
      });
      await tx.prodListaPrecioTienda.upsert({
        where: {
          codTienda_idLista: { codTienda: row.codTienda, idLista: pl.idLista },
        },
        create: {
          codTienda: row.codTienda,
          idLista: pl.idLista,
          precio: new Prisma.Decimal(pl.precio),
        },
        update: {
          precio: new Prisma.Decimal(pl.precio),
        },
      });
    }
    if (idsEnItem.size > 0) {
      await tx.prodListaPrecioTienda.deleteMany({
        where: {
          codTienda: row.codTienda,
          idLista: { notIn: [...idsEnItem] },
        },
      });
    } else {
      await tx.prodListaPrecioTienda.deleteMany({
        where: { codTienda: row.codTienda },
      });
    }
  }
}

export type SyncPhase = "sincronizando" | "guardando";

export interface SyncProgressCallback {
  onProgress?(processed: number, total: number, phase?: SyncPhase): void;
}

/**
 * Sincroniza productos desde la API DUX hacia prod_tienda y prod_listas_precios_tienda.
 */
export async function syncListaPrecioTiendaFromDux(
  options?: SyncProgressCallback
): Promise<SyncListaPrecioTiendaResult> {
  const inicioMs = Date.now();
  const errores: string[] = [];
  const onProgress = options?.onProgress;

  const todosLosProductos: RecordProdTienda[] = [];
  const idListasVistasEnCorrida = new Set<number>();
  let offset = 0;
  let totalApi = 0;

  const countBefore = await prisma.prodTienda.count();

  const timeoutPromise = (): Promise<never> =>
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("La petición a DUX no respondió a tiempo (15 s). Reintentá más tarde.")),
        PAGINA_TIMEOUT_MS
      )
    );

  while (true) {
    await assertListaPrecioTiendaSyncNotCancelled();
    const { results, total, hasMore } = await Promise.race([
      fetchItemsPage(offset, DUX_API_PAGE_LIMIT),
      timeoutPromise(),
    ]);

    if (total > 0 && totalApi === 0) totalApi = total;
    if (results.length === 0) break;

    const batch = results.map(itemDuxToProdTiendaRecord).filter((r) => r.codTienda);
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
    await assertListaPrecioTiendaSyncNotCancelled();
  }

  const totalSincronizados = todosLosProductos.length;

  if (totalSincronizados > 0) {
    await assertListaPrecioTiendaSyncNotCancelled();
    if (onProgress) onProgress(0, totalSincronizados, "guardando");
    for (let i = 0; i < todosLosProductos.length; i += CHUNK_PERSIST_SIZE) {
      await assertListaPrecioTiendaSyncNotCancelled();
      const chunkRaw = todosLosProductos.slice(i, i + CHUNK_PERSIST_SIZE);
      const byCodTienda = new Map<string, RecordProdTienda>();
      for (const row of chunkRaw) byCodTienda.set(row.codTienda, row);
      const chunk = Array.from(byCodTienda.values());
      try {
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
              await tx.prodTienda.upsert({
                where: { codTienda: row.codTienda },
                create: {
                  codTienda: row.codTienda,
                  rubro: row.rubro,
                  subRubro: row.subRubro,
                  marca: row.marca,
                  idMarca,
                  descripcionTienda: row.descripcionTienda,
                  costoCompra: new Prisma.Decimal(row.costoCompra),
                  stockMaipu: row.stockMaipu,
                  stockGuaymallen: row.stockGuaymallen,
                  stockeable: row.stockeable,
                },
                update: {
                  codTienda: row.codTienda,
                  rubro: row.rubro,
                  subRubro: row.subRubro,
                  marca: row.marca,
                  idMarca,
                  descripcionTienda: row.descripcionTienda,
                  costoCompra: new Prisma.Decimal(row.costoCompra),
                  stockMaipu: row.stockMaipu,
                  stockGuaymallen: row.stockGuaymallen,
                  stockeable: row.stockeable,
                  lastSync: new Date(),
                },
              });
            }
            await syncListasPreciosEnTransaccion(tx, chunk, idListasVistasEnCorrida);
          },
          { timeout: TRANSACTION_TIMEOUT_MS }
        );
        const persistedSoFar = Math.min(i + chunk.length, totalSincronizados);
        if (onProgress) onProgress(persistedSoFar, totalSincronizados, "guardando");
        console.log(
          `Persistido chunk ${Math.floor(i / CHUNK_PERSIST_SIZE) + 1}: ${chunk.length} productos (${persistedSoFar}/${totalSincronizados})`
        );
      } catch (e) {
        if (e instanceof SyncListaPrecioTiendaCancelledError) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? e.stack : "";
        errores.push(`Chunk offset ${i}: ${msg}`);
        console.error(`Error persistiendo chunk en offset ${i}:`, msg, stack);
      }
    }
  }

  await assertListaPrecioTiendaSyncNotCancelled();
  try {
    const codTiendasRecibidos = new Set(
      todosLosProductos
        .map((r) => r.codTienda.trim())
        .filter((v) => v.length > 0)
    );
    const existentes = await prisma.prodTienda.findMany({
      select: { codTienda: true },
    });
    const codTiendasParaEliminar = existentes
      .filter((r) => !codTiendasRecibidos.has((r.codTienda ?? "").trim()))
      .map((r) => r.codTienda.trim())
      .filter((v) => v.length > 0);
    for (let i = 0; i < codTiendasParaEliminar.length; i += CHUNK_DELETE_SIZE) {
      const chunk = codTiendasParaEliminar.slice(i, i + CHUNK_DELETE_SIZE);
      await prisma.prodTienda.deleteMany({
        where: { codTienda: { in: chunk } },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errores.push(`Limpieza cod_tienda ausentes: ${msg}`);
    console.error("Error en limpieza de cod_tienda ausentes:", msg);
  }

  if (idListasVistasEnCorrida.size > 0) {
    try {
      await prisma.prodListaDux.updateMany({
        where: { idLista: { notIn: [...idListasVistasEnCorrida] } },
        data: { activa: false },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errores.push(`Marcar listas DUX inactivas: ${msg}`);
      console.error("Error marcando listas DUX inactivas:", msg);
    }
  }

  const duracionMs = Date.now() - inicioMs;
  const countAfter = await prisma.prodTienda.count();
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
