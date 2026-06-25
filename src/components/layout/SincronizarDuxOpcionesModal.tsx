"use client";

import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export type SincronizarDuxOpcion = "productos" | "compras";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onElegir: (opcion: SincronizarDuxOpcion) => void;
  disabled?: boolean;
}

export default function SincronizarDuxOpcionesModal({
  open,
  onOpenChange,
  onElegir,
  disabled = false,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (disabled && !next) return;
        onOpenChange(next);
      }}
    >
      <AppModal
        title="Sincronizar"
        size="sm"
        className="max-w-sm"
        actions={
          <Button type="button" variant="outline" disabled={disabled} onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="w-full justify-center"
            disabled={disabled}
            onClick={() => onElegir("productos")}
          >
            Productos
          </Button>
          <Button
            type="button"
            className="w-full justify-center"
            disabled={disabled}
            onClick={() => onElegir("compras")}
          >
            Compras
          </Button>
        </div>
      </AppModal>
    </Dialog>
  );
}
