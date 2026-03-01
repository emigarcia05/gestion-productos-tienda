"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOAST_SYNC_ID = "sync-dux";
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setSyncing(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch("/api/sync-lista-precios-tienda", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
      {syncing ? "Sincronizando…" : "Actualizar Datos con Dux"}
    </Button>
  );
}
