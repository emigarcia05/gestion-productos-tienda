"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tituloIdea: string;
  detalle: string;
  usada: boolean;
}

function CampoLectura({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 py-3", className)}>
      <ModalMicroLabel>{label}</ModalMicroLabel>
      <p className="whitespace-pre-wrap text-sm text-foreground">{value.trim() ? value : "—"}</p>
    </div>
  );
}

export default function VerMktIdeaDetalleModal({
  open,
  onOpenChange,
  tituloIdea,
  detalle,
  usada,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Ver Detalle"
        size="md"
        className="max-w-lg"
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
        <div className="flex flex-col divide-y divide-primary/25">
          <CampoLectura label="Título" value={tituloIdea} className="pt-0" />
          <CampoLectura label="Detalle" value={detalle} />
          <CampoLectura label="Usada" value={usada ? "SI" : "NO"} className="pb-0" />
        </div>
      </AppModal>
    </Dialog>
  );
}
