"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOAST_SYNC_ID = "sync-dux";
const POLL_INTERVAL_MS = 2000;

/** Arma el mensaje del toast: progreso (X de Y) + tiempo estimado (aprox. Z min o seg). */
function formatMensajeProgreso(data: {
  total: number;
  processed: number;
  remainingSeconds: number;
  remainingMinutes: number;
}): string {
  const { total, processed, remainingSeconds, remainingMinutes } = data;
  const base = "Sincronizando datos";
  if (total > 0 && processed >= 0) {
    const progreso = `${processed.toLocaleString()} de ${total.toLocaleString()} productos`;
    if (remainingMinutes <= 0 && remainingSeconds <= 0) {
      return `${base}: ${progreso}.`;
    }
    if (remainingSeconds > 0 && remainingSeconds < 60) {
      return `${base}: ${progreso}. Faltan aprox. ${remainingSeconds} seg.`;
    }
    if (remainingMinutes === 1) {
      return `${base}: ${progreso}. Faltan aprox. 1 minuto.`;
    }
    if (remainingMinutes > 1) {
      return `${base}: ${progreso}. Faltan aprox. ${remainingMinutes} minutos.`;
    }
  }
  return `${base}… (calculando tiempo estimado…)`;
}

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleClick() {
    setSyncing(true);
    toast.loading(formatMensajeProgreso({ total: 0, processed: 0, remainingSeconds: 0, remainingMinutes: 0 }), {
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
          toast.loading(
            formatMensajeProgreso({
              total: data.total ?? 0,
              processed: data.processed ?? 0,
              remainingSeconds: data.remainingSeconds ?? 0,
              remainingMinutes: data.remainingMinutes ?? 0,
            }),
            {
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
