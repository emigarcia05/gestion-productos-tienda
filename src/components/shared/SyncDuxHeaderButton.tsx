"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SyncModal from "@/components/shared/SyncModal";

const STATUS_POLL_MS = 1500;

/**
 * Botón "Importar Datos Dux": abre modal de confirmación y, al confirmar,
 * dispara la sincronización real (POST /api/sync-lista-precios-tienda).
 * El progreso se muestra en la sidebar vía SyncStatusIndicator.
 * Al terminar (detectado por polling al status) se hace router.refresh().
 */
export default function SyncDuxHeaderButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const hadRunningRef = useRef(false);

  // Al confirmar: cerrar modal, disparar POST (sin esperar respuesta) y marcar que estamos sincronizando
  function handleConfirm() {
    setShowModal(false);
    setSyncing(true);
    hadRunningRef.current = false;
    fetch("/api/sync-lista-precios-tienda", { method: "POST" }).catch(() => {});
  }

  // Poll al status para saber cuándo terminó la sincronización y refrescar la página
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => {
      fetch("/api/sync-lista-precios-tienda/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          if (data.running) hadRunningRef.current = true;
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
