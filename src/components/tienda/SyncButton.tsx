"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sincronizarListaPrecioTiendaDux } from "@/actions/syncListaPrecioTienda";

const TOAST_SYNC_ID = "sync-dux";

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setSyncing(true);
    toast.loading("Sincronizando con DUX… Puede seguir usando la página. Los datos se actualizarán al finalizar.", {
      id: TOAST_SYNC_ID,
      duration: Infinity,
    });
    try {
      const result = await sincronizarListaPrecioTiendaDux();
      toast.success(
        `¡Sincronización completa! Se procesaron ${result.totalProcesados.toLocaleString()} productos.`,
        { id: TOAST_SYNC_ID }
      );
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(`Error al sincronizar: ${message}`, { id: TOAST_SYNC_ID });
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
