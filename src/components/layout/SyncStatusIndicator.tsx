"use client";

import { useState, useEffect, useRef } from "react";
import MensajeProceso from "@/components/shared/MensajeProceso";

const POLL_INTERVAL_MS = 1500;
const HIDE_DELAY_MS = 2000;

export default function SyncStatusIndicator() {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<"sincronizando" | "guardando" | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/sync-lista-precios-tienda/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const isRunning = !!data.running;
          setRunning(isRunning);
          setProcessed(data.processed ?? 0);
          setTotal(data.total ?? 0);
          setPhase(data.phase ?? null);

          // Mantener visible mientras haya sync en curso; ocultar con un pequeño delay al terminar
          if (isRunning) {
            setVisible(true);
            if (hideTimeoutRef.current) {
              clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
            }
          } else if (visible && !hideTimeoutRef.current) {
            hideTimeoutRef.current = setTimeout(() => {
              setVisible(false);
              hideTimeoutRef.current = null;
            }, HIDE_DELAY_MS);
          }
        })
        .catch(() => {});
    }

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  const mensaje =
    phase === "guardando"
      ? "Guardando!"
      : running
        ? "Sincronizando!"
        : "Sincronización finalizada";

  const detalle =
    total > 0
      ? { procesados: processed, total }
      : running
        ? "…"
        : null;

  return (
    <MensajeProceso
      variant="sidebar"
      mensaje={mensaje}
      detalle={detalle}
    />
  );
}
