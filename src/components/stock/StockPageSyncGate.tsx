"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSyncDux } from "@/hooks/useSyncDux";

interface Props {
  children: React.ReactNode;
}

/**
 * Al abrir /stock muestra un modal recomendando sincronizar con Dux.
 * - Sí: inicia la sincronización en segundo plano, cierra el modal y el usuario puede usar la página.
 * - No: solo cierra el modal.
 * - Al terminar la sync: router.refresh() para trabajar con datos actualizados (sin toast; progreso en slidenav).
 */
export default function StockPageSyncGate({ children }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const { syncing, ejecutar } = useSyncDux(() => {
    router.refresh();
  });

  useEffect(() => {
    setShowModal(true);
  }, []);

  function handleYes() {
    setShowModal(false);
    ejecutar();
  }

  function handleNo() {
    setShowModal(false);
  }

  return (
    <>
      {children}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="modal-app mx-4">
            <div className="modal-app__header">
              <h2 className="modal-app__title">
                Control Stock — Actualizar datos
              </h2>
            </div>

            <div className="modal-app__content">
              <div className="modal-app__body flex flex-col gap-4 p-4 text-sm">
                <p className="text-foreground">
                  Para ejecutar este módulo, se recomienda actualizar los datos con Dux.
                </p>
                <p className="font-medium text-foreground">
                  ¿Desea ejecutar una sincronización ahora?
                </p>
              </div>

              <div className="modal-app__footer">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNo}
                  disabled={syncing}
                >
                  No
                </Button>
                <Button
                  type="button"
                  onClick={handleYes}
                  disabled={syncing}
                >
                  Sí
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
