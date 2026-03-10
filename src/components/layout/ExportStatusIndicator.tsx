"use client";

import { useState, useEffect, useRef } from "react";
import MensajeProceso from "@/components/shared/MensajeProceso";

const POLL_INTERVAL_MS = 1500;

/**
 * Indicador en la sidebar del progreso de "Exportar Px. Dux".
 * Hace polling a /api/exportar-precios-dux/status (mismo patrón que SyncStatusIndicator e ImportStatusIndicator).
 */
export default function ExportStatusIndicator() {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/exportar-precios-dux/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setRunning(!!data.running);
          setProcessed(data.processed ?? 0);
          setTotal(data.total ?? 0);
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
    <MensajeProceso
      variant="sidebar"
      mensaje="Exportando!"
      detalle={total > 0 ? { procesados: processed, total } : "…"}
    />
  );
}
