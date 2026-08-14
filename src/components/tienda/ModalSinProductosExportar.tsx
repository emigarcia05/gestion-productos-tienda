"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ModalSinProductosExportar({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="sm"
        title="Exportación"
        actions={
          <Button type="button" onClick={() => onOpenChange(false)}>
            Aceptar
          </Button>
        }
      >
        <p className="text-sm text-foreground py-1">No hay actualizaciones para mostrar</p>
      </AppModal>
    </Dialog>
  );
}
