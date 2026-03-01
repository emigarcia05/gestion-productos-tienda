/**
 * Estado de progreso de la sincronización DUX (en memoria, para polling desde el cliente).
 */

import {
  syncListaPrecioTiendaFromDux,
  type SyncListaPrecioTiendaResult,
} from "@/services/syncListaPrecioTienda.service";

export type SyncPhase = "sincronizando" | "guardando";

export interface SyncProgressState {
  running: boolean;
  total: number;
  processed: number;
  phase: SyncPhase | null;
  done: boolean;
  error: string | null;
  result: SyncListaPrecioTiendaResult | null;
}

let state: SyncProgressState = {
  running: false,
  total: 0,
  processed: 0,
  phase: null,
  done: false,
  error: null,
  result: null,
};

export function getSyncProgress(): SyncProgressState {
  return { ...state };
}

export function setSyncRunning(running: boolean): void {
  state.running = running;
}

export function setSyncProgress(processed: number, total: number, phase?: SyncPhase | null): void {
  state.processed = processed;
  state.total = total;
  if (phase !== undefined) state.phase = phase;
}

export function runSyncWithProgress(): void {
  if (state.running) return;
  state = {
    running: true,
    total: 0,
    processed: 0,
    phase: "sincronizando",
    done: false,
    error: null,
    result: null,
  };
  syncListaPrecioTiendaFromDux({
    onProgress(processed, total, phase) {
      state.processed = processed;
      state.total = total;
      if (phase !== undefined) state.phase = phase;
    },
  })
    .then((result) => {
      state.done = true;
      state.result = result;
      state.running = false;
    })
    .catch((e) => {
      const errMsg = e instanceof Error ? e.message : String(e);
      state.done = true;
      state.error = errMsg;
      state.running = false;
      // #region agent log
      fetch('http://127.0.0.1:7462/ingest/4aaad926-1e9e-4d0d-bfdd-1211332926ae',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'891179'},body:JSON.stringify({sessionId:'891179',location:'syncProgressStore.ts:catch',message:'sync promise rejected',data:{error:errMsg,stack:e instanceof Error ? e.stack : undefined},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
    });
}
