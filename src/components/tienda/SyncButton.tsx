"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOAST_SYNC_ID = "sync-dux";
const POLL_INTERVAL_MS = 2000;

/** Tercera línea del toast: solo el tiempo estimado. */
function textoTiempoEstimado(data: {
  remainingSeconds: number;
  remainingMinutes: number;
}): string {
  const { remainingSeconds, remainingMinutes } = data;
  if (remainingSeconds > 0 && remainingSeconds < 60) {
    return `Tiempo estimado: ${remainingSeconds} seg`;
  }
  if (remainingMinutes === 1) {
    return "Tiempo estimado: 1 min";
  }
  if (remainingMinutes > 1) {
    return `Tiempo estimado: ${remainingMinutes} min`;
  }
  return "Tiempo estimado: …";
}

/** Mensaje del toast: "Sincronizando Datos." y "X de Y productos." */
function mensajeProgresoToast(data: {
  total: number;
  processed: number;
  remainingSeconds: number;
  remainingMinutes: number;
}) {
  const fila2 = data.total > 0
    ? `${data.processed.toLocaleString()} de ${data.total.toLocaleString()} productos.`
    : "…";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold">Sincronizando Datos.</span>
      <span className="text-sm">{fila2}</span>
      <span className="text-sm text-muted-foreground">{textoTiempoEstimado(data)}</span>
    </div>
  );
}

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Último progreso válido (evita que otra instancia serverless con state en 0 sobreescriba el toast). */
  const lastProgressRef = useRef({ total: 0, processed: 0, remainingSeconds: 0, remainingMinutes: 0 });

  async function handleClick() {
    setSyncing(true);
    lastProgressRef.current = { total: 0, processed: 0, remainingSeconds: 0, remainingMinutes: 0 };
    toast.loading(mensajeProgresoToast({ total: 0, processed: 0, remainingSeconds: 0, remainingMinutes: 0 }), {
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
          const total = data.total ?? 0;
          const processed = data.processed ?? 0;
          const remainingSeconds = data.remainingSeconds ?? 0;
          const remainingMinutes = data.remainingMinutes ?? 0;
          const tieneProgreso = total > 0 || processed > 0;
          if (tieneProgreso) {
            lastProgressRef.current = { total, processed, remainingSeconds, remainingMinutes };
          }
          if (data.done) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setSyncing(false);
            if (data.error) {
              // #region agent log
              fetch('http://127.0.0.1:7462/ingest/4aaad926-1e9e-4d0d-bfdd-1211332926ae',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'891179'},body:JSON.stringify({sessionId:'891179',location:'SyncButton.tsx:done_with_error',message:'error from server (data.error)',data:{error:data.error},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
              // #endregion
              toast.error(`Error al sincronizar: ${data.error}`, { id: TOAST_SYNC_ID });
            } else if (data.result) {
              const r = data.result;
              const hayErrores = Array.isArray(r.errores) && r.errores.length > 0;
              if (hayErrores) {
                const primerError = r.errores[0];
                toast.error(
                  `Sincronización con errores al guardar: ${primerError}${r.errores.length > 1 ? ` (y ${r.errores.length - 1} más)` : ""}`,
                  { id: TOAST_SYNC_ID }
                );
              } else {
                const guardados = (Number(r.creados) || 0) + (Number(r.actualizados) || 0);
                toast.success(
                  `¡Sincronización completa! ${guardados > 0 ? `${guardados.toLocaleString()} productos guardados en la base de datos.` : "Sin nuevos datos que guardar."}`,
                  { id: TOAST_SYNC_ID }
                );
              }
              router.refresh();
            }
          } else {
            const p = tieneProgreso ? { total, processed, remainingSeconds, remainingMinutes } : lastProgressRef.current;
            toast.loading(mensajeProgresoToast(p), { id: TOAST_SYNC_ID, duration: Infinity });
          }
        } catch {
          // Si falla el polling, mantener el toast y seguir intentando
        }
      };

      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
      poll();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // #region agent log
      fetch('http://127.0.0.1:7462/ingest/4aaad926-1e9e-4d0d-bfdd-1211332926ae',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'891179'},body:JSON.stringify({sessionId:'891179',location:'SyncButton.tsx:catch',message:'client fetch failed',data:{error:message},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
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
