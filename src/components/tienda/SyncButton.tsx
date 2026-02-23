"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sincronizarManual } from "@/actions/tienda";

export default function SyncButton() {
  const [pending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      toast.loading("Sincronizando con Dux...", { id: "sync" });
      const res = await sincronizarManual();
      if (res.ok) {
        const { creados, actualizados, deshabilitados, totalApi, duracionMs } = res.data;
        toast.success(
          `Sync completado en ${(duracionMs / 1000).toFixed(1)}s — ${totalApi.toLocaleString()} items: ${creados} nuevos, ${actualizados} actualizados, ${deshabilitados} deshabilitados`,
          { id: "sync", duration: 8000 }
        );
      } else {
        toast.error(`Error: ${res.error}`, { id: "sync" });
      }
    });
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
