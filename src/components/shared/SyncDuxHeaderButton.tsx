"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SyncModal from "@/components/shared/SyncModal";
import MensajeProceso from "@/components/shared/MensajeProceso";
import { cn } from "@/lib/utils";
import { useListaPreciosTiendaModalSync } from "@/hooks/useListaPreciosTiendaModalSync";

/**
 * Botón "Importar Datos Dux": abre modal de confirmación y, al confirmar,
 * dispara la sincronización real (POST /api/sync-lista-precios-tienda).
 * Muestra el progreso junto al botón (y en la sidebar vía SyncStatusIndicator)
 * tanto en Comp. Proveedores como en Control Stock.
 */
export default function SyncDuxHeaderButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const { syncing, progreso, iniciarSync } = useListaPreciosTiendaModalSync(() => {
    router.refresh();
  });

  function handleConfirm() {
    setShowModal(false);
    iniciarSync();
  }

  function handleCancel() {
    if (!syncing) setShowModal(false);
  }

  const processed = progreso?.procesados ?? 0;
  const total = progreso?.total ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="default"
          size="default"
          className="btn-primario-gestion gap-2 shrink-0"
          onClick={() => setShowModal(true)}
          disabled={syncing}
        >
          <RefreshCw className={cn("h-4 w-4 shrink-0", syncing && "animate-spin")} />
          {syncing ? "Importando…" : "Importar Datos Dux"}
        </Button>
        {syncing && (
          <MensajeProceso
            variant="default"
            mensaje="Importando!"
            detalle={total > 0 ? { procesados: processed, total } : "…"}
            className="shrink-0"
          />
        )}
      </div>

      {showModal && (
        <SyncModal
          syncing={false}
          progreso={null}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
