"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SyncModal from "@/components/shared/SyncModal";
import { useSyncDux } from "@/hooks/useSyncDux";

export default function SyncDuxHeaderButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const { syncing, progreso, ejecutar } = useSyncDux(() => {
    setShowModal(false);
    router.refresh();
  });

  function handleClick() {
    setShowModal(true);
  }

  function handleConfirm() {
    ejecutar();
  }

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
        onClick={handleClick}
        disabled={syncing}
      >
        <RefreshCw
          className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`}
        />
        {syncing ? "Sincronizando…" : "Act. Datos Dux"}
      </Button>

      {showModal && (
        <SyncModal
          syncing={syncing}
          progreso={progreso}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
