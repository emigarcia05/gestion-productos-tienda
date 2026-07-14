"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seccionNombre: string;
  tituloIdea: string;
  detalle: string;
  redesNombres: string[];
  tiposPublicacionNombres: string[];
  tipoContenidoNombre: string;
  usada: boolean;
}

function CampoLectura({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <ModalMicroLabel>{label}</ModalMicroLabel>
      <p className="whitespace-pre-wrap text-sm text-foreground">{value.trim() ? value : "—"}</p>
    </div>
  );
}

export default function VerMktIdeaDetalleModal({
  open,
  onOpenChange,
  seccionNombre,
  tituloIdea,
  detalle,
  redesNombres,
  tiposPublicacionNombres,
  tipoContenidoNombre,
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
        <div className="flex flex-col gap-4">
          <CampoLectura label="Sección" value={seccionNombre} />
          <CampoLectura
            label="Red"
            value={redesNombres.length > 0 ? redesNombres.join(" · ") : "—"}
          />
          <CampoLectura
            label="Tipo De Publicación"
            value={
              tiposPublicacionNombres.length > 0 ? tiposPublicacionNombres.join(" · ") : "—"
            }
          />
          <CampoLectura label="Tipo De Contenido" value={tipoContenidoNombre} />
          <CampoLectura label="Título" value={tituloIdea} />
          <CampoLectura label="Detalle" value={detalle} />
          <CampoLectura label="Usada" value={usada ? "SI" : "NO"} />
        </div>
      </AppModal>
    </Dialog>
  );
}
