/**
 * Estado de progreso de la importación de lista de precios (en memoria, para polling desde el cliente).
 * El sidebar muestra "Importando! X de Y" mientras running es true.
 */

export interface ImportProgressResult {
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: string[];
}

export interface ImportProgressState {
  running: boolean;
  processed: number;
  total: number;
  done: boolean;
  error: string | null;
  result: ImportProgressResult | null;
}

let state: ImportProgressState = {
  running: false,
  processed: 0,
  total: 0,
  done: false,
  error: null,
  result: null,
};

export function getImportProgress(): ImportProgressState {
  return { ...state };
}

export function setImportRunning(running: boolean): void {
  state.running = running;
  if (!running) {
    state.done = true;
  }
}

export function setImportProgress(processed: number, total: number): void {
  state.processed = processed;
  state.total = total;
}

export function setImportResult(result: ImportProgressResult): void {
  state.result = result;
  state.done = true;
  state.running = false;
}

export function setImportError(message: string): void {
  state.error = message;
  state.done = true;
  state.running = false;
}

/** Inicia un nuevo ciclo de importación (reset + running). */
export function startImport(total: number): void {
  state = {
    running: true,
    processed: 0,
    total,
    done: false,
    error: null,
    result: null,
  };
}
