/**
 * Política de lotes para consultas a la API DUX ERP (`erp.duxsoftware.com.ar`).
 * Aplica a GET paginados y POST con arrays de ítems (sync productos, Act. Cx., etc.).
 *
 * @see BACKEND_GUIDELINES §1.4
 * @see FRONTEND_GUIDELINES § SSOT — Progreso de consultas API DUX
 */

/** Ítems por lote (misma cifra que `DUX_API_PAGE_LIMIT` en `duxApi.ts`). */
export const DUX_API_BATCH_SIZE = 50;

/** Pausa mínima entre lotes o peticiones consecutivas (rate limit DUX: 1 req / 5 s). */
export const DUX_API_BATCH_INTERVAL_MS = Math.max(
  5000,
  Number(process.env.DUX_SYNC_DELAY_MS) || 5000
);
