"use client";

import { useState, useEffect, useRef } from "react";
import { formatLastCompletedAtElapsed } from "@/lib/formatElapsedSince";
import DuxSyncStyleButton from "@/components/shared/DuxSyncStyleButton";
import MensajeProceso from "@/components/shared/MensajeProceso";

const POLL_INTERVAL_MS = 1500;

export default function SyncStatusIndicator() {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [requestingStart, setRequestingStart] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/sync-lista-precios-tienda/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setRunning(!!data.running);
          setProcessed(data.processed ?? 0);
          setTotal(data.total ?? 0);
          setLastCompletedAt(data.lastCompletedAt ?? null);
        })
        .catch(() => {});
    }

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleStartSync() {
    if (running || requestingStart) return;
    setRequestingStart(true);
    try {
      await fetch("/api/sync-lista-precios-tienda", { method: "POST" });
    } catch {
      // El polling reflejará el estado real.
    } finally {
      setRequestingStart(false);
    }
  }

  const lastCompletedLabel = formatLastCompletedAtElapsed(lastCompletedAt);

  if (running) {
    return (
      <MensajeProceso
        variant="sidebar"
        mensaje="SINCRONIZANDO DUX"
        detalle={total > 0 ? { procesados: processed, total } : "…"}
      />
    );
  }

  return (
    <DuxSyncStyleButton
      lineIdle="SINCRONIZACION DUX"
      lineHover="SINCRONIZAR DUX"
      secondary={requestingStart ? "…" : `Últ. Act.: ${lastCompletedLabel ?? "—"}`}
      aria-label="Iniciar sincronización DUX"
      onClick={handleStartSync}
      disabled={requestingStart}
      busy={requestingStart}
      surface="sidebar"
    />
  );
}
