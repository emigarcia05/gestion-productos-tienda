"use client";

import { useState, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 1500;

export default function SyncStatusIndicator() {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<"sincronizando" | "guardando" | null>(null);
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
          setPhase(data.phase ?? null);
        })
        .catch(() => {});
    }

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (!running) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mensaje-proceso mensaje-proceso--sidebar"
    >
      {phase === "guardando" ? "Guardando! " : "Sincronizando! "}
      {total > 0 ? (
        <span className="mensaje-proceso__detalle">
          {processed.toLocaleString()} de {total.toLocaleString()}
        </span>
      ) : (
        "…"
      )}
    </div>
  );
}
