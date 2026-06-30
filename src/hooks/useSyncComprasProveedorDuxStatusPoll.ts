"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 1500;

export interface SyncComprasProveedorDuxPollState {
  running: boolean;
  processed: number;
  total: number;
  remainingMinutes: number;
  lastCompletedAt: string | null;
}

/**
 * Polling del estado de sync de compras DUX (`sync_dux_status` id `compras-proveedor-dux`).
 */
export function useSyncComprasProveedorDuxStatusPoll(
  pollEnabled: boolean
): SyncComprasProveedorDuxPollState {
  const [state, setState] = useState<SyncComprasProveedorDuxPollState>({
    running: false,
    processed: 0,
    total: 0,
    remainingMinutes: 0,
    lastCompletedAt: null,
  });

  useEffect(() => {
    if (!pollEnabled) {
      queueMicrotask(() => {
        setState({
          running: false,
          processed: 0,
          total: 0,
          remainingMinutes: 0,
          lastCompletedAt: null,
        });
      });
      return;
    }

    let cancelled = false;

    function poll() {
      fetch("/api/sync-compras-proveedor-dux/status")
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (
            data: {
              running?: boolean;
              processed?: number;
              total?: number;
              remainingMinutes?: number;
              lastCompletedAt?: string | null;
            } | null
          ) => {
            if (cancelled || !data) return;
            setState({
              running: !!data.running,
              processed: data.processed ?? 0,
              total: data.total ?? 0,
              remainingMinutes: data.remainingMinutes ?? 0,
              lastCompletedAt: data.lastCompletedAt ?? null,
            });
          }
        )
        .catch(() => {});
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollEnabled]);

  return state;
}
