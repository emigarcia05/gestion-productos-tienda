"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombre: string;
  resumen: string;
}

export default function VerMktIdeaSeccionModal({
  open,
  onOpenChange,
  nombre,
  resumen,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Ver Sección"
        size="sm"
        scrollBody
        hideBodyScrollbars
        actions={
          <div className="flex w-full justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Nombre</ModalMicroLabel>
            <p className="text-sm font-medium text-foreground">{nombre || "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <ModalMicroLabel>Resumen</ModalMicroLabel>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {resumen.trim() ? resumen : "—"}
            </p>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
