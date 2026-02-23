"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SyncButton() {
  const [pending, setPending] = useState(false);

  async function handleSync() {
    setPending(true);
    toast.loading("Sincronizando con Dux...", { id: "sync" });
    try {
      // Llamamos al API Route directamente — tiene maxDuration=300 (sin límite de 10s)
      const res = await fetch("/api/sync-tienda", { method: "GET" });
      const data = await res.json();
      if (data.ok) {
        const { creados, actualizados, deshabilitados, totalApi, duracionMs } = data;
        toast.success(
          `Sync completado en ${(duracionMs / 1000).toFixed(1)}s — ${totalApi.toLocaleString()} items: ${creados} nuevos, ${actualizados} actualizados, ${deshabilitados} deshabilitados`,
          { id: "sync", duration: 8000 }
        );
        // Recargar la página para mostrar los datos nuevos
        window.location.reload();
      } else {
        toast.error(`Error: ${data.error}`, { id: "sync" });
      }
    } catch {
      toast.error("Error de conexión al sincronizar.", { id: "sync" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={handleSync} disabled={pending} variant="outline" size="sm" className="gap-2">
      {pending
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <RefreshCw className="h-4 w-4" />
      }
      {pending ? "Sincronizando..." : "Sincronizar ahora"}
    </Button>
  );
}
