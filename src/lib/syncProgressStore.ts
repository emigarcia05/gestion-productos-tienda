/**
 * Estado de progreso de la sincronización DUX (en memoria, para polling desde el cliente).
 */

import {
  syncListaPrecioTiendaFromDux,
  type SyncListaPrecioTiendaResult,
} from "@/services/syncListaPrecioTienda.service";

export interface SyncProgressState {
  running: boolean;
  total: number;
  processed: number;
  done: boolean;
  error: string | null;
  result: SyncListaPrecioTiendaResult | null;
}

let state: SyncProgressState = {
  running: false,
  total: 0,
  processed: 0,
  done: false,
  error: null,
  result: null,
};

export function getSyncProgress(): SyncProgressState {
  return { ...state };
}

export function runSyncWithProgress(): void {
  if (state.running) return;
  state = {
    running: true,
    total: 0,
    processed: 0,
    done: false,
    error: null,
    result: null,
  };
  syncListaPrecioTiendaFromDux({
    onProgress(processed, total) {
      state.processed = processed;
      state.total = total;
    },
  })
    .then((result) => {
      state.done = true;
      state.result = result;
      state.running = false;
    })
    .catch((e) => {
      state.done = true;
      state.error = e instanceof Error ? e.message : String(e);
      state.running = false;
    });
}
