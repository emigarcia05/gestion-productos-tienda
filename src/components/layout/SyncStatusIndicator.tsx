"use client";

import { useState, useEffect, useRef } from "react";
import MensajeProceso from "@/components/shared/MensajeProceso";
import { cn } from "@/lib/utils";

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
  const [phase, setPhase] = useState<"sincronizando" | "guardando" | null>(null);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [requestingStart, setRequestingStart] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const disabled = running || requestingStart;

  if (running) {
    return (
      <button
        type="button"
        onClick={handleStartSync}
        disabled={disabled}
        className={cn(
          "w-full text-left rounded-md transition-opacity",
          disabled && "cursor-not-allowed opacity-90"
        )}
        aria-label="Sincronización DUX en progreso"
      >
        <MensajeProceso variant="sidebar" mensaje={mensaje} detalle={detalle} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartSync}
      disabled={disabled}
      className={cn(
        "w-full rounded-md border border-border bg-card px-3 py-2 text-center",
        "hover:bg-muted transition-colors",
        disabled && "cursor-not-allowed opacity-90"
      )}
      aria-label="Iniciar sincronización DUX"
    >
      <div className="text-sm font-semibold text-foreground">Sincronización DUX</div>
      <div className="text-xs text-muted-foreground">Última Consulta Disponible</div>
      {lastCompletedLabel ? (
        <div className="text-xs font-medium text-foreground mt-0.5">{lastCompletedLabel}</div>
      ) : null}
    </button>
  );
}
