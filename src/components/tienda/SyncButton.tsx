"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOAST_SYNC_ID = "sync-dux";
const POLL_INTERVAL_MS = 2000;

function formatMensajeProgreso(remainingMinutes: number): string {
  if (remainingMinutes <= 0) return "Sincronizando datos…";
  if (remainingMinutes === 1) return "Sincronizando datos. Faltan aprox. 1 minuto.";
  return `Sincronizando datos. Faltan aprox. ${remainingMinutes} minutos.`;
}

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleClick() {
    setSyncing(true);
    toast.loading(formatMensajeProgreso(0), {
      id: TOAST_SYNC_ID,
      duration: Infinity,
    });
    try {
      const startRes = await fetch("/api/sync-lista-precios-tienda", { method: "POST" });
      if (startRes.status === 409) {
        toast.error("Ya hay una sincronización en curso.", { id: TOAST_SYNC_ID });
        setSyncing(false);
        return;
      }
      if (!startRes.ok) {
        const data = await startRes.json().catch(() => ({}));
        throw new Error(data?.error ?? `Error ${startRes.status}`);
      }

      const poll = async () => {
        try {
          const res = await fetch("/api/sync-lista-precios-tienda/status");
          const data = await res.json();
          toast.loading(formatMensajeProgreso(data.remainingMinutes ?? 0), {
            id: TOAST_SYNC_ID,
            duration: Infinity,
          });
          if (data.done) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setSyncing(false);
            if (data.error) {
              toast.error(`Error al sincronizar: ${data.error}`, { id: TOAST_SYNC_ID });
            } else if (data.result) {
              toast.success(
                `¡Sincronización completa! Se procesaron ${Number(data.result.totalProcesados).toLocaleString()} productos.`,
                { id: TOAST_SYNC_ID }
              );
              router.refresh();
            }
          }
        } catch {
          // Si falla el polling, mantener el toast y seguir intentando
        }
      };

      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
      poll();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(`Error al sincronizar: ${message}`, { id: TOAST_SYNC_ID });
      setSyncing(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }

  return (
    <Button
      type="button"
      variant="default"
      size="default"
      className="btn-primario-gestion gap-2 shrink-0"
      onClick={handleClick}
      disabled={syncing}
    >
      <RefreshCw className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Sincronizando..." : "Actualizar Datos con Dux"}
    </Button>
  );
}
