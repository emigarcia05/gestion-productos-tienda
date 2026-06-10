"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AppModal from "@/components/shared/AppModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmExport: () => Promise<void>;
}

export default function ModalExportarInformeAumento({
  open,
  onOpenChange,
  onConfirmExport,
}: Props) {
  const [exportando, setExportando] = useState(false);

  async function handleConfirm() {
    setExportando(true);
    try {
      await onConfirmExport();
      onOpenChange(false);
    } finally {
      setExportando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (exportando && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Exportación"
        size="sm"
        className="max-w-md"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={exportando}
              onClick={() => onOpenChange(false)}
            >
              No
            </Button>
            <Button
              type="button"
              disabled={exportando}
              onClick={() => void handleConfirm()}
            >
              {exportando ? "Exportando..." : "Sí, Exportar"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-foreground">
          ¿Desea exportar el informe de aumento?
        </p>
      </AppModal>
    </Dialog>
  );
}
