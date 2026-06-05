"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ListaPreciosTiendaModalProgreso } from "@/hooks/listaPreciosTiendaSync.types";

const STATUS_POLL_MS = 1500;

interface StatusPayload {
  running?: boolean;
  processed?: number;
  total?: number;
  remainingSeconds?: number;
  phase?: "sincronizando" | "guardando";
}

function mapProgreso(data: StatusPayload): ListaPreciosTiendaModalProgreso | null {
  const processed = Number(data.processed ?? 0);
  const total = Number(data.total ?? 0);
  if (!data.running && total <= 0) return null;
  const rsRaw = data.remainingSeconds;
  const segsRestantes =
    typeof rsRaw === "number" && Number.isFinite(rsRaw) ? Math.max(0, Math.round(rsRaw)) : null;
  const phase =
    data.phase === "guardando" || data.phase === "sincronizando" ? data.phase : undefined;
  return { procesados: processed, total, segsRestantes, phase };
}

export interface ListaPreciosTiendaSyncCompletoInfo {
  /** `total` del último poll de estado (ítems en corrida). */
  total: number;
  processed: number;
}

/**
 * POST `/api/sync-lista-precios-tienda` + polling `/status`.
 * Reutilizable: `SyncStatusIndicator` (sidebar) y `SyncModal` en modales de sync.
 */
export function useListaPreciosTiendaModalSync(
  onCompleto?: (info: ListaPreciosTiendaSyncCompletoInfo) => void,
) {
  const [syncing, setSyncing] = useState(false);
  const [progreso, setProgreso] = useState<ListaPreciosTiendaModalProgreso | null>(null);
  const hadRunningRef = useRef(false);
  const onCompletoRef = useRef(onCompleto);

  useEffect(() => {
    onCompletoRef.current = onCompleto;
  }, [onCompleto]);

  const iniciarSync = useCallback(() => {
    setSyncing(true);
    setProgreso(null);
    hadRunningRef.current = false;
    void fetch("/api/sync-lista-precios-tienda", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => {
      void fetch("/api/sync-lista-precios-tienda/status")
        .then((r) => {
          if (!r.ok) {
            setSyncing(false);
            setProgreso(null);
            return null;
          }
          return r.json() as Promise<StatusPayload>;
        })
        .then((data) => {
          if (!data) return;
          if (data.running) {
            hadRunningRef.current = true;
            const m = mapProgreso(data);
            if (m) setProgreso(m);
          } else if (hadRunningRef.current) {
            const total = Number(data.total ?? 0);
            const processed = Number(data.processed ?? 0);
            setSyncing(false);
            setProgreso(null);
            onCompletoRef.current?.({ total, processed });
          }
        })
        .catch(() => {});
    }, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [syncing]);

  return { syncing, progreso, iniciarSync };
}
