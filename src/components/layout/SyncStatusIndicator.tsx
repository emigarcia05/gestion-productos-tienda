"use client";

import { useState, useEffect, useRef } from "react";
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
  const disabled = running || requestingStart;

  const line1 = running
    ? "Sincronizando DUX"
    : "Sincronización DUX";

  const line2 = running
    ? total > 0
      ? `${processed.toLocaleString("es-AR")} de ${total.toLocaleString("es-AR")}`
      : "…"
    : `Últ. Act. ${lastCompletedLabel ?? "—"}`;

  const tone = running ? "running" : "idle";

  return (
    <button
      type="button"
      onClick={handleStartSync}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-center",
        tone === "idle" && "bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80",
        // Consulta/progreso: usar amarillo de marca (accent2) para indicar proceso activo.
        tone === "running" && "bg-accent2 text-foreground hover:bg-accent2/90",
        "transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        disabled && "cursor-not-allowed opacity-90"
      )}
      aria-label={running ? "Sincronización DUX en progreso" : "Iniciar sincronización DUX"}
    >
      <div className={cn("text-sm font-semibold", tone === "running" ? "text-foreground" : "text-sidebar-foreground")}>
        {line1}
      </div>
      <div className={cn("text-xs", tone === "running" ? "text-foreground/80" : "text-sidebar-foreground/80")}>
        {line2}
      </div>
    </button>
  );
}
