"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOAST_SYNC_ID = "sync-dux";
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
const POLL_INTERVAL_MS = 1500;

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState<"sincronizando" | "guardando" | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  async function fetchProgress() {
    try {
      const res = await fetch("/api/sync-lista-precios-tienda/status");
      if (!res.ok) return;
      const data = await res.json();
      setProcessed(data.processed ?? 0);
      setTotal(data.total ?? 0);
      setPhase(data.phase ?? null);
    } catch {
      // ignore
    }
  }

  async function handleClick() {
    setSyncing(true);
    setProcessed(0);
    setTotal(0);
    setPhase("sincronizando");

    pollRef.current = setInterval(fetchProgress, POLL_INTERVAL_MS);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/sync-lista-precios-tienda", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      if (res.status === 409) {
        toast.error("Ya hay una sincronización en curso.", { id: TOAST_SYNC_ID });
        setSyncing(false);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          `Error al sincronizar: ${data?.error ?? res.status}`,
          { id: TOAST_SYNC_ID }
        );
        setSyncing(false);
        return;
      }

      const hayErrores = Array.isArray(data.errores) && data.errores.length > 0;
      if (hayErrores) {
        const primerError = data.errores[0];
        toast.error(
          `Sincronización con errores al guardar: ${primerError}${data.errores.length > 1 ? ` (y ${data.errores.length - 1} más)` : ""}`,
          { id: TOAST_SYNC_ID }
        );
      }
      router.refresh();
    } catch (e) {
      clearTimeout(timeoutId);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      const isTimeout = e instanceof Error && e.name === "AbortError";
      toast.error(
        isTimeout
          ? "Sincronización cancelada por tiempo (máx. 5 min). Reintentá más tarde."
          : `Error al sincronizar: ${e instanceof Error ? e.message : String(e)}`,
        { id: TOAST_SYNC_ID }
      );
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 items-end">
      <Button
        type="button"
        variant="default"
        size="default"
        className="btn-primario-gestion gap-2 shrink-0"
        onClick={handleClick}
        disabled={syncing}
      >
        <RefreshCw className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Sincronizando…" : "Actualizar Datos con Dux"}
      </Button>
      {syncing && (
        <div role="status" aria-live="polite" className="mensaje-proceso">
          {phase === "guardando" ? "Guardando! " : "Sincronizando! "}
          {total > 0 ? (
            <span className="mensaje-proceso__detalle">
              {processed.toLocaleString()} de {total.toLocaleString()}
            </span>
          ) : (
            "…"
          )}
        </div>
      )}
    </div>
  );
}
