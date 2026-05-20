"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 1500;

export interface CompetenciaSyncPollState {
  running: boolean;
  processed: number;
  total: number;
  done: boolean;
  error: string | null;
}

const IDLE: CompetenciaSyncPollState = {
  running: false,
  processed: 0,
  total: 0,
  done: false,
  error: null,
};

/**
 * Polling de `GET /api/sync-competencia-precios/status` (import_progress id competencia-precios-sync).
 */
export function useCompetenciaSyncStatusPoll(enabled: boolean): CompetenciaSyncPollState {
  const [state, setState] = useState<CompetenciaSyncPollState>(IDLE);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setState(IDLE));
      return;
    }

    let cancelled = false;

    function poll() {
      fetch("/api/sync-competencia-precios/status")
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (data: {
            running?: boolean;
            processed?: number;
            total?: number;
            done?: boolean;
            error?: string | null;
          } | null) => {
            if (cancelled || !data) return;
            setState({
              running: !!data.running,
              processed: data.processed ?? 0,
              total: data.total ?? 0,
              done: !!data.done,
              error: data.error ?? null,
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
  }, [enabled]);

  return state;
}
