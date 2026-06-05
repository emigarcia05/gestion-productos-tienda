/**
 * Sincronización de prod_tienda desde la API DUX ERP.
 * Fase 1: bucle paginado (50 ítems por petición) acumulando todos en memoria.
 * Fase 2: bulk upsert en Neon por chunks de 500 (cod_tienda) + stock/listas DUX multi-depósito y multi-precio.
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

/** Tamaño de cada chunk al persistir en Neon (muchas upserts anidadas por ítem). */
const CHUNK_PERSIST_SIZE = Math.max(
  5,
  Math.min(100, Number(process.env.DUX_SYNC_CHUNK_SIZE) || 25)
);
const CHUNK_DELETE_SIZE = 500;

/** Timeout (ms) por transacción de persistencia (chunks pequeños + catálogos deduplicados). */
const TRANSACTION_TIMEOUT_MS = 120_000;

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
    precios: item.precios,
    stocks: item.stocks,
  };
}

type RecordProdTienda = ReturnType<typeof itemDuxToProdTiendaRecord>;

async function upsertDepositosCatalogoEnTransaccion(
  tx: Prisma.TransactionClient,
  items: RecordProdTienda[],
  idDepositosVistos: Set<number>
): Promise<void> {
  const now = new Date();
  const unicos = new Map<number, string>();
  for (const row of items) {
    for (const st of row.stocks) {
      if (!Number.isFinite(st.idDeposito)) continue;
      unicos.set(st.idDeposito, st.nombre);
    }
  }
  for (const [idDeposito, nombre] of unicos) {
    idDepositosVistos.add(idDeposito);
    await tx.prodDepositoDux.upsert({
      where: { idDeposito },
      create: {
        idDeposito,
        nombre,
        activa: true,
        ultimaSync: now,
      },
      update: {
        nombre,
        activa: true,
        ultimaSync: now,
      },
    });
  }
}

async function upsertListasCatalogoEnTransaccion(
  tx: Prisma.TransactionClient,
  items: RecordProdTienda[],
  idListasVistas: Set<number>
): Promise<void> {
  const unicas = new Map<number, string>();
  for (const row of items) {
    for (const pl of row.precios) {
      if (!Number.isFinite(pl.idLista)) continue;
      unicas.set(pl.idLista, pl.nombre);
    }
  }
  for (const [idLista, nombreLista] of unicas) {
    idListasVistas.add(idLista);
    await tx.prodTiendaListaPrecio.upsert({
      where: { idLista },
      create: { idLista, nombreLista },
      update: { nombreLista },
    });
  }
}

async function syncStocksEnTransaccion(
  tx: Prisma.TransactionClient,
  items: RecordProdTienda[]
): Promise<void> {
  for (const row of items) {
    const idsEnItem = new Set<number>();
    for (const st of row.stocks) {
      if (!Number.isFinite(st.idDeposito)) continue;
      idsEnItem.add(st.idDeposito);
      await tx.prodTiendaStock.upsert({
        where: {
          codTienda_idDeposito: { codTienda: row.codTienda, idDeposito: st.idDeposito },
        },
        create: {
          codTienda: row.codTienda,
          idDeposito: st.idDeposito,
          stockReal: st.stockReal,
          ctdDisponible:
            st.ctdDisponible != null ? new Prisma.Decimal(st.ctdDisponible) : null,
        },
        update: {
          stockReal: st.stockReal,
          ctdDisponible:
            st.ctdDisponible != null ? new Prisma.Decimal(st.ctdDisponible) : null,
        },
      });
    }
    if (idsEnItem.size > 0) {
      await tx.prodTiendaStock.deleteMany({
        where: {
          codTienda: row.codTienda,
          idDeposito: { notIn: [...idsEnItem] },
        },
      });
    } else {
      await tx.prodTiendaStock.deleteMany({
        where: { codTienda: row.codTienda },
      });
    }
  }
}

async function syncListasPreciosEnTransaccion(
  tx: Prisma.TransactionClient,
  items: RecordProdTienda[]
): Promise<void> {
  for (const row of items) {
    const idsEnItem = new Set<number>();
    for (const pl of row.precios) {
      if (!Number.isFinite(pl.idLista)) continue;
      idsEnItem.add(pl.idLista);
      await tx.prodTiendaPrecio.upsert({
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
      await tx.prodTiendaPrecio.deleteMany({
        where: {
          codTienda: row.codTienda,
          idLista: { notIn: [...idsEnItem] },
        },
      });
    } else {
      await tx.prodTiendaPrecio.deleteMany({
        where: { codTienda: row.codTienda },
      });
    }
  }
}

async function persistProdTiendaChunk(chunk: RecordProdTienda[]): Promise<void> {
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
          },
          update: {
            codTienda: row.codTienda,
            rubro: row.rubro,
            subRubro: row.subRubro,
            marca: row.marca,
            idMarca,
            descripcionTienda: row.descripcionTienda,
            costoCompra: new Prisma.Decimal(row.costoCompra),
            lastSync: new Date(),
          },
        });
      }
    },
    { timeout: TRANSACTION_TIMEOUT_MS }
  );
}

async function persistStockChunk(
  chunk: RecordProdTienda[],
  idDepositosVistos: Set<number>
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await upsertDepositosCatalogoEnTransaccion(tx, chunk, idDepositosVistos);
      await syncStocksEnTransaccion(tx, chunk);
    },
    { timeout: TRANSACTION_TIMEOUT_MS }
  );
}

async function persistPreciosChunk(
  chunk: RecordProdTienda[],
  idListasVistas: Set<number>
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await upsertListasCatalogoEnTransaccion(tx, chunk, idListasVistas);
      await syncListasPreciosEnTransaccion(tx, chunk);
    },
    { timeout: TRANSACTION_TIMEOUT_MS }
  );
}

export type SyncPhase = "sincronizando" | "guardando";

export interface SyncProgressCallback {
  onProgress?(processed: number, total: number, phase?: SyncPhase): void | Promise<void>;
}

async function emitProgress(
  onProgress: SyncProgressCallback["onProgress"],
  processed: number,
  total: number,
  phase: SyncPhase
): Promise<void> {
  if (!onProgress) return;
  await onProgress(processed, total, phase);
}

/**
 * Sincroniza productos desde la API DUX hacia prod_tienda, prod_tienda_precios y catálogo prod_tienda_listas_precios.
 */
export async function syncListaPrecioTiendaFromDux(
  options?: SyncProgressCallback
): Promise<SyncListaPrecioTiendaResult> {
  const inicioMs = Date.now();
  const errores: string[] = [];
  const onProgress = options?.onProgress;

  const todosLosProductos: RecordProdTienda[] = [];
  const idListasVistasEnCorrida = new Set<number>();
  const idDepositosVistosEnCorrida = new Set<number>();
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
    if (totalApi > 0) await emitProgress(onProgress, procesadosHastaAhora, totalApi, "sincronizando");
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
  let chunksPersistidosOk = 0;

  if (totalSincronizados > 0) {
    await assertListaPrecioTiendaSyncNotCancelled();
    await emitProgress(onProgress, 0, totalSincronizados, "guardando");
    for (let i = 0; i < todosLosProductos.length; i += CHUNK_PERSIST_SIZE) {
      await assertListaPrecioTiendaSyncNotCancelled();
      const chunkRaw = todosLosProductos.slice(i, i + CHUNK_PERSIST_SIZE);
      const byCodTienda = new Map<string, RecordProdTienda>();
      for (const row of chunkRaw) byCodTienda.set(row.codTienda, row);
      const chunk = Array.from(byCodTienda.values());
      await emitProgress(onProgress, i, totalSincronizados, "guardando");
      try {
        await persistProdTiendaChunk(chunk);
        await persistStockChunk(chunk, idDepositosVistosEnCorrida);
        await persistPreciosChunk(chunk, idListasVistasEnCorrida);
        chunksPersistidosOk += 1;
        const persistedSoFar = Math.min(i + chunk.length, totalSincronizados);
        await emitProgress(onProgress, persistedSoFar, totalSincronizados, "guardando");
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

    if (chunksPersistidosOk === 0) {
      const detalle = errores[0] ?? "Revisá migraciones y logs del servidor.";
      throw new Error(`No se pudo guardar productos en la base de datos. ${detalle}`);
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
      const idsVistas = [...idListasVistasEnCorrida];
      await prisma.prodTiendaPrecio.deleteMany({
        where: { idLista: { notIn: idsVistas } },
      });
      await prisma.prodTiendaListaPrecio.deleteMany({
        where: { idLista: { notIn: idsVistas } },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errores.push(`Eliminar listas DUX en desuso: ${msg}`);
      console.error("Error eliminando listas DUX en desuso:", msg);
    }
  }

  if (idDepositosVistosEnCorrida.size > 0) {
    try {
      await prisma.prodDepositoDux.updateMany({
        where: { idDeposito: { notIn: [...idDepositosVistosEnCorrida] } },
        data: { activa: false },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errores.push(`Marcar depósitos DUX inactivos: ${msg}`);
      console.error("Error marcando depósitos DUX inactivos:", msg);
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
