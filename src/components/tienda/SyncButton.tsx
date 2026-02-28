"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sincronizarListaPrecioTiendaDux } from "@/actions/syncListaPrecioTienda";

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);

  async function handleClick() {
    setSyncing(true);
    try {
      const result = await sincronizarListaPrecioTiendaDux();
      toast.success(
        `¡Sincronización completa! Se procesaron ${result.totalProcesados.toLocaleString()} productos.`
      );
      if (typeof window !== "undefined") window.location.reload();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(`Error al sincronizar: ${message}`);
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
      {syncing ? "Sincronizando..." : "Actualizar Datos con Dux"}
    </Button>
  );
}
