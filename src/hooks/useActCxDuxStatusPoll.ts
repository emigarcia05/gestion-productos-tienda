"use client";

import { useEffect, useState } from "react";
import { getActCxDuxStatusAction } from "@/actions/cxPxTienda";

const POLL_INTERVAL_MS = 1000;

export interface ActCxDuxPollState {
  running: boolean;
  phase: "enviando" | "esperando" | null;
  processed: number;
  total: number;
  error: string | null;
}

const IDLE: ActCxDuxPollState = {
  running: false,
  phase: null,
  processed: 0,
  total: 0,
  error: null,
};

/** Polling del estado global Act. Cx. DUX (`sync_dux_status` id act-cx-costos-dux). */
export function useActCxDuxStatusPoll(enabled: boolean): ActCxDuxPollState {
  const [state, setState] = useState<ActCxDuxPollState>(IDLE);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setState(IDLE));
      return;
    }

    let cancelled = false;

    function poll() {
      void getActCxDuxStatusAction().then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState(IDLE);
          return;
        }
        setState({
          running: res.data.running,
          phase: res.data.phase,
          processed: res.data.processed,
          total: res.data.total,
          error: res.data.error,
        });
      });
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
