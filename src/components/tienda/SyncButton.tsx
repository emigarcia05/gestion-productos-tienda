"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSyncDux } from "@/hooks/useSyncDux";
import SyncModal from "@/components/shared/SyncModal";

export default function SyncButton() {
  const [modal, setModal] = useState(false);

  const { syncing, progreso, ejecutar } = useSyncDux((result) => {
    toast.success(
      `Sync completado en ${(result.duracionMs / 1000).toFixed(1)}s — ${result.total.toLocaleString()} items: ${result.creados} nuevos, ${result.actualizados} actualizados, ${result.deshabilitados} deshabilitados`,
      { duration: 8000 }
    );
    setModal(false);
    window.location.reload();
  });

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setModal(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-slate-300 font-semibold px-4 hover:border-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </Button>
        </TooltipTrigger>
        <TooltipContent>Sincronizar items de tienda con DUX</TooltipContent>
      </Tooltip>

      {modal && (
        <SyncModal
          syncing={syncing}
          progreso={progreso}
          onConfirm={ejecutar}
          onCancel={() => setModal(false)}
        />
      )}
    </>
  );
}
