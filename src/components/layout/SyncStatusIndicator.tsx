"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import MensajeProceso, {
  clasesContenedorMensajeProcesoSidebar,
} from "@/components/shared/MensajeProceso";

const POLL_INTERVAL_MS = 1500;

function formatLastCompletedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
}

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

  const lastCompletedLabel = formatLastCompletedAt(lastCompletedAt);

  if (running) {
    return (
      <MensajeProceso
        variant="sidebar"
        mensaje="Sincronizando DUX"
        detalle={total > 0 ? { procesados: processed, total } : "…"}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartSync}
      disabled={requestingStart}
      className={cn(
        clasesContenedorMensajeProcesoSidebar,
        "w-full cursor-pointer text-center font-inherit outline-none transition-opacity",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        requestingStart && "cursor-wait opacity-90"
      )}
      aria-label="Iniciar sincronización DUX"
    >
      <span className="mensaje-proceso__linea1">Sincronización DUX</span>
      <span className="mensaje-proceso__detalle">
        {requestingStart ? "…" : `Últ. Act. ${lastCompletedLabel ?? "—"}`}
      </span>
    </button>
  );
}
