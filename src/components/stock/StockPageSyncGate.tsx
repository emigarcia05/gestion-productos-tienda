"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSyncDux } from "@/hooks/useSyncDux";
import SyncModal from "@/components/shared/SyncModal";

const STOCK_SYNC_JUST_DONE = "stockSyncJustDone";

interface Props {
  children: React.ReactNode;
}

/**
 * En la página /stock: si el usuario llegó por URL directa (navegador), muestra
 * el mismo modal de consulta API que al entrar desde el index. Si llegó desde
 * el index tras hacer la sync, no muestra el modal.
 */
export default function StockPageSyncGate({ children }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [listo, setListo] = useState(false);

  const { syncing, progreso, ejecutar } = useSyncDux((result) => {
    toast.success(
      `Base de datos actualizada — ${result.total.toLocaleString()} ítems procesados.`,
      { duration: 3000 }
    );
    setShowModal(false);
    router.refresh();
  });

  useEffect(() => {
    const desdeIndex = typeof window !== "undefined" && sessionStorage.getItem(STOCK_SYNC_JUST_DONE);
    if (desdeIndex) {
      sessionStorage.removeItem(STOCK_SYNC_JUST_DONE);
      setShowModal(false);
    } else {
      setShowModal(true);
    }
    setListo(true);
  }, []);

  if (!listo) return <>{children}</>;

  return (
    <>
      {children}
      {showModal && (
        <SyncModal
          syncing={syncing}
          progreso={progreso}
          onConfirm={ejecutar}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}
