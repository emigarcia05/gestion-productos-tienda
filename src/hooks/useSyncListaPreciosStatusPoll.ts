"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 1500;

export interface SyncListaPreciosPollState {
  running: boolean;
}

const IDLE: SyncListaPreciosPollState = { running: false };

/** Polling ligero del estado global sync lista precios tienda (sidebar / Act. Cx.). */
export function useSyncListaPreciosStatusPoll(enabled: boolean): SyncListaPreciosPollState {
  const [state, setState] = useState<SyncListaPreciosPollState>(IDLE);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setState(IDLE));
      return;
    }

    let cancelled = false;

    function poll() {
      void fetch("/api/sync-lista-precios-tienda/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setState({ running: !!data.running });
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
