"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 1500;

export interface SyncComprasProveedorDuxPollState {
  running: boolean;
  processed: number;
  total: number;
}

/**
 * Polling del estado de sync de compras DUX (`sync_dux_status` id `compras-proveedor-dux`).
 * Usar con `enabled` mientras corre `sincronizarComprobantesProveedorDesdeDuxAction`.
 */
export function useSyncComprasProveedorDuxStatusPoll(
  enabled: boolean
): SyncComprasProveedorDuxPollState {
  const [state, setState] = useState<SyncComprasProveedorDuxPollState>({
    running: false,
    processed: 0,
    total: 0,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ running: false, processed: 0, total: 0 });
      return;
    }

    let cancelled = false;

    function poll() {
      fetch("/api/sync-compras-proveedor-dux/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { running?: boolean; processed?: number; total?: number } | null) => {
          if (cancelled || !data) return;
          setState({
            running: !!data.running,
            processed: data.processed ?? 0,
            total: data.total ?? 0,
          });
        })
        .catch(() => {});
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled]);

  return state;
}
