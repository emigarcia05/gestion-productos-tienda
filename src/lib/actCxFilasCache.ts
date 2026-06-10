import type { FilaExportCostoCx } from "@/services/exportCostoCxDiff.service";
import { listarFilasExportCostoCxDiff } from "@/services/exportCostoCxDiff.service";

/** Caché en memoria de filas Act. Cx. (misma corrida; evita re-listar ~1800 filas por lote). */
let filasCache: FilaExportCostoCx[] | null = null;

export async function obtenerFilasActCxParaEnvio(): Promise<FilaExportCostoCx[]> {
  if (filasCache) return filasCache;
  filasCache = await listarFilasExportCostoCxDiff();
  return filasCache;
}

export function limpiarFilasActCxCache(): void {
  filasCache = null;
}
