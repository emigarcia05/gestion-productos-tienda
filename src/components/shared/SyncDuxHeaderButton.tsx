"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SyncModal from "@/components/shared/SyncModal";
import MensajeProceso from "@/components/shared/MensajeProceso";

const STATUS_POLL_MS = 1500;

/**
 * Botón "Importar Datos Dux": abre modal de confirmación y, al confirmar,
 * dispara la sincronización real (POST /api/sync-lista-precios-tienda).
 * Muestra el progreso junto al botón (y en la sidebar vía SyncStatusIndicator)
 * tanto en Comp. Px. Prov., Control Aumentos como en Control Stock.
 */
export default function SyncDuxHeaderButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const hadRunningRef = useRef(false);

  // Al confirmar: cerrar modal, disparar POST y marcar que estamos sincronizando
  function handleConfirm() {
    setShowModal(false);
    setSyncing(true);
    setProcessed(0);
    setTotal(0);
    hadRunningRef.current = false;
    fetch("/api/sync-lista-precios-tienda", { method: "POST" }).catch(() => {});
  }

  // Poll al status: actualizar progreso y detectar cuándo terminó para refrescar
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => {
      fetch("/api/sync-lista-precios-tienda/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          if (data.running) {
            hadRunningRef.current = true;
            setProcessed(data.processed ?? 0);
            setTotal(data.total ?? 0);
          }
          if (hadRunningRef.current && !data.running) {
            setSyncing(false);
            router.refresh();
          }
        })
        .catch(() => {});
    }, STATUS_POLL_MS);
    return () => clearInterval(t);
  }, [syncing, router]);

  function handleCancel() {
    if (!syncing) setShowModal(false);
  }

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
          <RefreshCw
            className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`}
          />
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
