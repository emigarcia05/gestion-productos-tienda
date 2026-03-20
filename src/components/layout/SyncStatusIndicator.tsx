"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import MensajeProceso from "@/components/shared/MensajeProceso";

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
        mensaje="SINCRONIZANDO DUX"
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
        "group flex w-full min-h-[3.5rem] cursor-pointer flex-col items-center justify-center gap-0.5 group-hover:gap-0 rounded-lg px-2.5 py-1.5 text-center font-inherit outline-none",
        "bg-sidebar-accent text-sidebar-foreground",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        requestingStart && "cursor-wait opacity-90"
      )}
      aria-label="Iniciar sincronización DUX"
    >
      <span className="relative flex items-center justify-center min-h-[1.125rem]">
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold whitespace-nowrap transition-opacity duration-150 opacity-100 group-hover:opacity-0">
          SINCRONIZACION DUX
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold whitespace-nowrap transition-opacity duration-150 opacity-0 group-hover:opacity-100">
          SINCRONIZAR DUX
        </span>
      </span>

      <span
        className="text-xs text-sidebar-foreground/80 overflow-hidden transition-[max-height,opacity] duration-150 opacity-100 max-h-[1.25rem] group-hover:opacity-0 group-hover:max-h-0"
      >
        {requestingStart ? "…" : `Últ. Act. ${lastCompletedLabel ?? "—"}`}
      </span>
    </button>
  );
}
